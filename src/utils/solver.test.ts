import { describe, it, expect, beforeAll } from 'vitest';
import { generateSeatingPlan, evaluateSeating } from './solver';
import type { Rule, ClassroomLayout, SeatingAssignment } from '../types';
import {
  SMALL_STUDENTS,
  SMALL_LAYOUT
} from '../test/fixtures/class-small';
import {
  CONFLICT_STUDENTS,
  CONFLICT_LAYOUT,
  CONFLICT_RULES
} from '../test/fixtures/class-conflict';

beforeAll(() => {
  // The solver uses simulated annealing -- pin Math.random for stable runs.
  // Use a tiny deterministic PRNG seeded with a constant.
  let seed = 42;
  Math.random = () => {
    // Mulberry32
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
});

describe('generateSeatingPlan -- baseline (4 students, 4 desks, no rules)', () => {
  it('produces a valid proposal with every student seated', () => {
    const proposal = generateSeatingPlan(
      SMALL_STUDENTS,
      [],
      SMALL_LAYOUT,
      'balanced'
    );

    expect(proposal.valid).toBe(true);

    const seated = Object.values(proposal.assignments).filter((v) => v !== '');
    expect(seated).toHaveLength(SMALL_STUDENTS.length);
  });

  it('assigns each student exactly once (no duplicates)', () => {
    const proposal = generateSeatingPlan(
      SMALL_STUDENTS,
      [],
      SMALL_LAYOUT,
      'balanced'
    );

    const seated = Object.values(proposal.assignments).filter((v) => v !== '');
    expect(new Set(seated).size).toBe(seated.length);
  });

  it('assigns at most one student per desk', () => {
    const proposal = generateSeatingPlan(
      SMALL_STUDENTS,
      [],
      SMALL_LAYOUT,
      'balanced'
    );

    // assignments is keyed by deskId, so duplicate keys would already be
    // overwritten by JS. We assert that every key maps to a known desk id.
    const validDeskIds = new Set(
      SMALL_LAYOUT.elements.filter((e) => e.type === 'desk').map((e) => e.id)
    );
    Object.keys(proposal.assignments).forEach((deskId) => {
      expect(validDeskIds.has(deskId)).toBe(true);
    });
  });
});

describe('generateSeatingPlan -- not enough seats', () => {
  it('throws when there are more students than desks', () => {
    const tooManyStudents = [
      ...SMALL_STUDENTS,
      { id: 'stu-extra', name: 'Extra', specialNeeds: [] }
    ];
    expect(() =>
      generateSeatingPlan(tooManyStudents, [], SMALL_LAYOUT, 'balanced')
    ).toThrow(/Nicht genügend Sitzplätze/);
  });
});

describe('generateSeatingPlan -- hard `not_beside` constraint', () => {
  it('finds a valid arrangement when the layout allows it', () => {
    // Same 4-desk layout, two students with not_beside. Layout has only
    // horizontal adjacencies (a-b, c-d), so placing them on the two
    // non-adjacent columns is feasible.
    const rules: Rule[] = [
      {
        id: 'rule-not-beside-anna-ben',
        studentId: 'stu-anna',
        type: 'not_beside',
        targetId: 'stu-ben',
        strictness: 'hard'
      }
    ];

    // Try the solver several times to dampen any residual randomness from
    // simulated annealing.
    let foundValid = false;
    for (let i = 0; i < 5; i++) {
      const proposal = generateSeatingPlan(
        SMALL_STUDENTS,
        rules,
        SMALL_LAYOUT,
        'balanced'
      );
      if (proposal.valid) {
        foundValid = true;
        // Verify no hard not_beside violation slipped through.
        const hardViolations = proposal.violations.filter(
          (v) => v.type === 'hard'
        );
        expect(hardViolations).toHaveLength(0);
        break;
      }
    }
    expect(foundValid).toBe(true);
  });

  it('marks every proposal invalid when the constraint is structurally impossible', () => {
    // CONFLICT_LAYOUT has exactly 2 adjacent desks for 2 students with a
    // hard not_beside rule -- no valid arrangement exists.
    const proposal = generateSeatingPlan(
      CONFLICT_STUDENTS,
      CONFLICT_RULES,
      CONFLICT_LAYOUT,
      'balanced'
    );

    expect(proposal.valid).toBe(false);
    const hardViolations = proposal.violations.filter((v) => v.type === 'hard');
    expect(hardViolations.length).toBeGreaterThan(0);
  });

  it('alle 3 Profile invalid bei unlösbarem Setup', () => {
    const presets = ['balanced', 'focus', 'friendship'] as const;
    const proposals = presets.map((preset) =>
      generateSeatingPlan(CONFLICT_STUDENTS, CONFLICT_RULES, CONFLICT_LAYOUT, preset)
    );

    expect(proposals).toHaveLength(3);
    expect(proposals.every((p) => p.valid === false)).toBe(true);
    proposals.forEach((p) => {
      const hard = p.violations.filter((v) => v.type === 'hard');
      expect(hard.length).toBeGreaterThan(0);
    });
  });

  it('reports contradictory hard relationship rules in diagnostics', () => {
    const rules: Rule[] = [
      {
        id: 'rule-beside-a-b',
        studentId: 'stu-a',
        type: 'beside',
        targetId: 'stu-b',
        strictness: 'hard'
      },
      {
        id: 'rule-not-beside-a-b',
        studentId: 'stu-a',
        type: 'not_beside',
        targetId: 'stu-b',
        strictness: 'hard'
      }
    ];

    const proposal = generateSeatingPlan(
      CONFLICT_STUDENTS,
      rules,
      CONFLICT_LAYOUT,
      'balanced'
    );

    expect(proposal.diagnostics?.contradictoryRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleIds: expect.arrayContaining(['rule-beside-a-b', 'rule-not-beside-a-b'])
        })
      ])
    );
  });

  it('reports front-row bottlenecks in diagnostics', () => {
    const students = [
      { id: 'stu-1', name: 'Ari', specialNeeds: ['Sehschwäche' as const] },
      { id: 'stu-2', name: 'Bea', specialNeeds: ['Sehschwäche' as const] },
      { id: 'stu-3', name: 'Can', specialNeeds: ['Sehschwäche' as const] }
    ];
    const layout: ClassroomLayout = {
      width: 6,
      height: 6,
      elements: [
        { id: 'board-front', type: 'board', x: 1, y: 0, w: 4, h: 1, rotation: 0 },
        { id: 'desk-front-a', type: 'desk', x: 1, y: 1, w: 1, h: 1, rotation: 0 },
        { id: 'desk-front-b', type: 'desk', x: 3, y: 1, w: 1, h: 1, rotation: 0 },
        { id: 'desk-back', type: 'desk', x: 2, y: 5, w: 1, h: 1, rotation: 0 }
      ]
    };

    const proposal = generateSeatingPlan(students, [], layout, 'balanced');

    expect(proposal.diagnostics?.bottlenecks).toEqual(
      expect.arrayContaining([
        { kind: 'frontRow', required: 3, available: 2 }
      ])
    );
  });
});

describe('evaluateSeating -- soft `beside` constraint affects score', () => {
  it('rewards an arrangement where soft `beside` partners sit adjacent', () => {
    const rules: Rule[] = [
      {
        id: 'rule-beside-anna-ben',
        studentId: 'stu-anna',
        type: 'beside',
        targetId: 'stu-ben',
        strictness: 'soft'
      }
    ];

    // Adjacent placement: anna on desk-a, ben on desk-b (both at y=3, Δx=1).
    const adjacent: SeatingAssignment = {
      'desk-a': 'stu-anna',
      'desk-b': 'stu-ben',
      'desk-c': 'stu-clara',
      'desk-d': 'stu-david'
    };
    // Non-adjacent placement: anna on desk-a, ben on desk-d (Δx=1, Δy=2).
    const apart: SeatingAssignment = {
      'desk-a': 'stu-anna',
      'desk-d': 'stu-ben',
      'desk-b': 'stu-clara',
      'desk-c': 'stu-david'
    };

    const adjacentScore = evaluateSeating(
      adjacent,
      SMALL_STUDENTS,
      rules,
      SMALL_LAYOUT,
      'balanced'
    ).score;
    const apartScore = evaluateSeating(
      apart,
      SMALL_STUDENTS,
      rules,
      SMALL_LAYOUT,
      'balanced'
    ).score;

    expect(adjacentScore).toBeGreaterThan(apartScore);
  });

  it('records a soft violation when partners are not adjacent', () => {
    const rules: Rule[] = [
      {
        id: 'rule-beside-anna-ben',
        studentId: 'stu-anna',
        type: 'beside',
        targetId: 'stu-ben',
        strictness: 'soft'
      }
    ];
    const apart: SeatingAssignment = {
      'desk-a': 'stu-anna',
      'desk-d': 'stu-ben',
      'desk-b': 'stu-clara',
      'desk-c': 'stu-david'
    };
    const { violations } = evaluateSeating(
      apart,
      SMALL_STUDENTS,
      rules,
      SMALL_LAYOUT,
      'balanced'
    );
    const sideRule = violations.find((v) => v.ruleId === 'rule-beside-anna-ben');
    expect(sideRule).toBeDefined();
    expect(sideRule?.type).toBe('soft');
  });
});

describe('evaluateSeating -- special-needs implicit rules', () => {
  it('penalises a Sehschwäche student seated in the back row', () => {
    const students = [
      { id: 'stu-x', name: 'X', specialNeeds: ['Sehschwäche' as const] }
    ];
    // Single student on the back row -> hard violation expected.
    const backRow: SeatingAssignment = {
      'desk-c': 'stu-x'
    };
    const layout: ClassroomLayout = SMALL_LAYOUT;
    const { violations } = evaluateSeating(backRow, students, [], layout, 'balanced');
    expect(violations.some((v) => v.id.startsWith('need-seh-'))).toBe(true);
  });

  it('accepts a Sehschwäche student in the front row without violation', () => {
    const students = [
      { id: 'stu-x', name: 'X', specialNeeds: ['Sehschwäche' as const] }
    ];
    const frontRow: SeatingAssignment = {
      'desk-a': 'stu-x'
    };
    const { violations } = evaluateSeating(
      frontRow,
      students,
      [],
      SMALL_LAYOUT,
      'balanced'
    );
    expect(violations.some((v) => v.id.startsWith('need-seh-'))).toBe(false);
  });
});

describe('Slice 5 -- German violation descriptions per kind', () => {
  it('Sehschwäche description names the student and front-row keyword', () => {
    const students = [
      { id: 'stu-anna', name: 'Anna', specialNeeds: ['Sehschwäche' as const] }
    ];
    const assignment: SeatingAssignment = { 'desk-c': 'stu-anna' };
    const { violations } = evaluateSeating(assignment, students, [], SMALL_LAYOUT, 'balanced');
    const v = violations.find((vv) => vv.id.startsWith('need-seh-'));
    expect(v?.description).toContain('Anna');
    expect(v?.description.toLowerCase()).toContain('sehschwäche');
  });

  it('Hörschwäche description names the student and mentions Tafel/vorne', () => {
    const students = [
      { id: 'stu-ben', name: 'Ben', specialNeeds: ['Hörschwäche' as const] }
    ];
    const assignment: SeatingAssignment = { 'desk-c': 'stu-ben' };
    const { violations } = evaluateSeating(assignment, students, [], SMALL_LAYOUT, 'balanced');
    const v = violations.find((vv) => vv.id.startsWith('need-hoer-'));
    expect(v?.description).toContain('Ben');
    expect(v?.description.toLowerCase()).toMatch(/tafel|vorne/);
  });

  it('Barrierefreiheit description names the student and mentions Tür/Rand', () => {
    const students = [
      { id: 'stu-c', name: 'Carla', specialNeeds: ['Barrierefreiheit' as const] }
    ];
    // Layout with a clear non-edge, far-from-door desk for Carla.
    const layout: ClassroomLayout = {
      width: 8,
      height: 8,
      elements: [
        { id: 'board-b', type: 'board', x: 3, y: 0, w: 2, h: 1, rotation: 0 },
        { id: 'door-b', type: 'door', x: 7, y: 7, w: 1, h: 1, rotation: 0 },
        { id: 'desk-left', type: 'desk', x: 1, y: 3, w: 1, h: 1, rotation: 0 },
        { id: 'desk-mid', type: 'desk', x: 3, y: 3, w: 1, h: 1, rotation: 0 },
        { id: 'desk-right', type: 'desk', x: 5, y: 3, w: 1, h: 1, rotation: 0 }
      ]
    };
    const assignment: SeatingAssignment = { 'desk-mid': 'stu-c' };
    const { violations } = evaluateSeating(assignment, students, [], layout, 'balanced');
    const v = violations.find((vv) => vv.id.startsWith('need-barr-'));
    expect(v?.description).toContain('Carla');
    expect(v?.description.toLowerCase()).toMatch(/tür|rand/);
  });

  it('Konzentrationsbedarf description names the student and mentions Fenster/Tür', () => {
    const students = [
      { id: 'stu-d', name: 'Dana', specialNeeds: ['Konzentrationsbedarf' as const] }
    ];
    // desk-a is at x=3, y=3; window-1 sits at x=0, y=3 — distance >1.8 so no
    // implicit violation. Use door-adjacent position instead: desk-d (x=4,y=5)
    // vs door-1 (x=7,y=6) — distance ~3.16 — still not <=2.0. Force window
    // proximity by moving the student onto a window-adjacent layout.
    const layout: ClassroomLayout = {
      width: 5,
      height: 5,
      elements: [
        { id: 'board-k', type: 'board', x: 1, y: 0, w: 2, h: 1, rotation: 0 },
        { id: 'window-k', type: 'window', x: 0, y: 2, w: 1, h: 1, rotation: 90 },
        { id: 'desk-near-window', type: 'desk', x: 1, y: 2, w: 1, h: 1, rotation: 0 }
      ]
    };
    const assignment: SeatingAssignment = { 'desk-near-window': 'stu-d' };
    const { violations } = evaluateSeating(assignment, students, [], layout, 'balanced');
    const v = violations.find((vv) => vv.id.startsWith('need-konz-'));
    expect(v?.description).toContain('Dana');
    expect(v?.description.toLowerCase()).toMatch(/fenster|tür/);
  });

  it('Verhalten description names both students and mentions nebeneinander', () => {
    const students = [
      { id: 'stu-anna', name: 'Anna', specialNeeds: ['Verhalten' as const] },
      { id: 'stu-ben', name: 'Ben', specialNeeds: ['Verhalten' as const] }
    ];
    // desk-a and desk-b are adjacent in SMALL_LAYOUT.
    const assignment: SeatingAssignment = {
      'desk-a': 'stu-anna',
      'desk-b': 'stu-ben'
    };
    const { violations } = evaluateSeating(assignment, students, [], SMALL_LAYOUT, 'balanced');
    const v = violations.find((vv) => vv.id.startsWith('need-verh-'));
    expect(v?.description).toContain('Anna');
    expect(v?.description).toContain('Ben');
    expect(v?.description.toLowerCase()).toContain('nebeneinander');
  });

  it('not_beside rule description names both students and mentions nebeneinander', () => {
    const rules: Rule[] = [
      {
        id: 'rule-nb',
        studentId: 'stu-anna',
        type: 'not_beside',
        targetId: 'stu-ben',
        strictness: 'hard'
      }
    ];
    const assignment: SeatingAssignment = {
      'desk-a': 'stu-anna',
      'desk-b': 'stu-ben',
      'desk-c': 'stu-clara',
      'desk-d': 'stu-david'
    };
    const { violations } = evaluateSeating(assignment, SMALL_STUDENTS, rules, SMALL_LAYOUT, 'balanced');
    const v = violations.find((vv) => vv.ruleId === 'rule-nb');
    expect(v?.description).toContain('Anna');
    expect(v?.description).toContain('Ben');
    expect(v?.description.toLowerCase()).toContain('nebeneinander');
  });

  it('beside rule description names both students and mentions neben', () => {
    const rules: Rule[] = [
      {
        id: 'rule-bs',
        studentId: 'stu-anna',
        type: 'beside',
        targetId: 'stu-ben',
        strictness: 'hard'
      }
    ];
    const assignment: SeatingAssignment = {
      'desk-a': 'stu-anna',
      'desk-d': 'stu-ben',
      'desk-b': 'stu-clara',
      'desk-c': 'stu-david'
    };
    const { violations } = evaluateSeating(assignment, SMALL_STUDENTS, rules, SMALL_LAYOUT, 'balanced');
    const v = violations.find((vv) => vv.ruleId === 'rule-bs');
    expect(v?.description).toContain('Anna');
    expect(v?.description).toContain('Ben');
    expect(v?.description.toLowerCase()).toContain('neben');
  });

  it('near rule description names both students and mentions Felder distance', () => {
    const rules: Rule[] = [
      {
        id: 'rule-near',
        studentId: 'stu-anna',
        type: 'near',
        targetId: 'stu-ben',
        strictness: 'hard'
      }
    ];
    // Bigger layout so Anna and Ben can sit clearly > 2.5 cells apart.
    const layout: ClassroomLayout = {
      width: 10,
      height: 10,
      elements: [
        { id: 'board-n', type: 'board', x: 4, y: 0, w: 2, h: 1, rotation: 0 },
        { id: 'desk-far-1', type: 'desk', x: 1, y: 2, w: 1, h: 1, rotation: 0 },
        { id: 'desk-far-2', type: 'desk', x: 8, y: 7, w: 1, h: 1, rotation: 0 }
      ]
    };
    const assignment: SeatingAssignment = {
      'desk-far-1': 'stu-anna',
      'desk-far-2': 'stu-ben'
    };
    const { violations } = evaluateSeating(
      assignment,
      [
        { id: 'stu-anna', name: 'Anna', specialNeeds: [] },
        { id: 'stu-ben', name: 'Ben', specialNeeds: [] }
      ],
      rules,
      layout,
      'balanced'
    );
    const v = violations.find((vv) => vv.ruleId === 'rule-near');
    expect(v?.description).toContain('Anna');
    expect(v?.description).toContain('Ben');
    expect(v?.description.toLowerCase()).toMatch(/nahe|entfernt/);
  });

  it('far rule description names both students and mentions weit weg', () => {
    const rules: Rule[] = [
      {
        id: 'rule-far',
        studentId: 'stu-anna',
        type: 'far',
        targetId: 'stu-ben',
        strictness: 'hard'
      }
    ];
    const assignment: SeatingAssignment = {
      'desk-a': 'stu-anna',
      'desk-b': 'stu-ben',
      'desk-c': 'stu-clara',
      'desk-d': 'stu-david'
    };
    const { violations } = evaluateSeating(assignment, SMALL_STUDENTS, rules, SMALL_LAYOUT, 'balanced');
    const v = violations.find((vv) => vv.ruleId === 'rule-far');
    expect(v?.description).toContain('Anna');
    expect(v?.description).toContain('Ben');
    expect(v?.description.toLowerCase()).toContain('weit weg');
  });

  it('front rule description names the student and mentions Reihe', () => {
    const rules: Rule[] = [
      {
        id: 'rule-front',
        studentId: 'stu-anna',
        type: 'front',
        strictness: 'hard'
      }
    ];
    const assignment: SeatingAssignment = {
      'desk-c': 'stu-anna',
      'desk-d': 'stu-ben',
      'desk-a': 'stu-clara',
      'desk-b': 'stu-david'
    };
    const { violations } = evaluateSeating(assignment, SMALL_STUDENTS, rules, SMALL_LAYOUT, 'balanced');
    const v = violations.find((vv) => vv.ruleId === 'rule-front');
    expect(v?.description).toContain('Anna');
    expect(v?.description.toLowerCase()).toContain('reihe');
  });

  it('back rule description names the student and mentions Reihe', () => {
    const rules: Rule[] = [
      {
        id: 'rule-back',
        studentId: 'stu-anna',
        type: 'back',
        strictness: 'hard'
      }
    ];
    const assignment: SeatingAssignment = {
      'desk-a': 'stu-anna',
      'desk-b': 'stu-ben',
      'desk-c': 'stu-clara',
      'desk-d': 'stu-david'
    };
    const { violations } = evaluateSeating(assignment, SMALL_STUDENTS, rules, SMALL_LAYOUT, 'balanced');
    const v = violations.find((vv) => vv.ruleId === 'rule-back');
    expect(v?.description).toContain('Anna');
    expect(v?.description.toLowerCase()).toContain('reihe');
  });

  it('edge rule description names the student and mentions Rand', () => {
    // Build a 3x3 desk grid so desk-mid is strictly interior (not on any edge).
    const layout: ClassroomLayout = {
      width: 6,
      height: 6,
      elements: [
        { id: 'board-e', type: 'board', x: 2, y: 0, w: 2, h: 1, rotation: 0 },
        { id: 'desk-tl', type: 'desk', x: 0, y: 1, w: 1, h: 1, rotation: 0 },
        { id: 'desk-tm', type: 'desk', x: 2, y: 1, w: 1, h: 1, rotation: 0 },
        { id: 'desk-tr', type: 'desk', x: 5, y: 1, w: 1, h: 1, rotation: 0 },
        { id: 'desk-ml', type: 'desk', x: 0, y: 3, w: 1, h: 1, rotation: 0 },
        { id: 'desk-mid', type: 'desk', x: 2, y: 3, w: 1, h: 1, rotation: 0 },
        { id: 'desk-mr', type: 'desk', x: 5, y: 3, w: 1, h: 1, rotation: 0 },
        { id: 'desk-bl', type: 'desk', x: 0, y: 5, w: 1, h: 1, rotation: 0 },
        { id: 'desk-bm', type: 'desk', x: 2, y: 5, w: 1, h: 1, rotation: 0 },
        { id: 'desk-br', type: 'desk', x: 5, y: 5, w: 1, h: 1, rotation: 0 }
      ]
    };
    const rules: Rule[] = [
      { id: 'rule-edge', studentId: 'stu-anna', type: 'edge', strictness: 'hard' }
    ];
    const assignment: SeatingAssignment = { 'desk-mid': 'stu-anna' };
    const { violations } = evaluateSeating(
      assignment,
      [{ id: 'stu-anna', name: 'Anna', specialNeeds: [] }],
      rules,
      layout,
      'balanced'
    );
    const v = violations.find((vv) => vv.ruleId === 'rule-edge');
    expect(v?.description).toContain('Anna');
    expect(v?.description.toLowerCase()).toContain('rand');
  });

  it('near_door rule description names the student and mentions Tür', () => {
    const rules: Rule[] = [
      { id: 'rule-door', studentId: 'stu-anna', type: 'near_door', strictness: 'hard' }
    ];
    // desk-a (3,3) vs door-1 (7,6) ~ 5 — too far.
    const assignment: SeatingAssignment = { 'desk-a': 'stu-anna' };
    const { violations } = evaluateSeating(
      assignment,
      [{ id: 'stu-anna', name: 'Anna', specialNeeds: [] }],
      rules,
      SMALL_LAYOUT,
      'balanced'
    );
    const v = violations.find((vv) => vv.ruleId === 'rule-door');
    expect(v?.description).toContain('Anna');
    expect(v?.description.toLowerCase()).toContain('tür');
  });

  it('near_board rule description names the student and mentions Tafel', () => {
    const rules: Rule[] = [
      { id: 'rule-board', studentId: 'stu-anna', type: 'near_board', strictness: 'hard' }
    ];
    // desk-c (3,5) vs board-1 (3,0) ~ 5 — too far.
    const assignment: SeatingAssignment = { 'desk-c': 'stu-anna' };
    const { violations } = evaluateSeating(
      assignment,
      [{ id: 'stu-anna', name: 'Anna', specialNeeds: [] }],
      rules,
      SMALL_LAYOUT,
      'balanced'
    );
    const v = violations.find((vv) => vv.ruleId === 'rule-board');
    expect(v?.description).toContain('Anna');
    expect(v?.description.toLowerCase()).toContain('tafel');
  });

  it('not_window rule description names the student and mentions Fenster', () => {
    // Build a layout where desk is directly window-adjacent.
    const layout: ClassroomLayout = {
      width: 5,
      height: 5,
      elements: [
        { id: 'board-w', type: 'board', x: 1, y: 0, w: 2, h: 1, rotation: 0 },
        { id: 'window-w', type: 'window', x: 0, y: 2, w: 1, h: 1, rotation: 90 },
        { id: 'desk-near-window', type: 'desk', x: 1, y: 2, w: 1, h: 1, rotation: 0 }
      ]
    };
    const rules: Rule[] = [
      { id: 'rule-window', studentId: 'stu-anna', type: 'not_window', strictness: 'hard' }
    ];
    const assignment: SeatingAssignment = { 'desk-near-window': 'stu-anna' };
    const { violations } = evaluateSeating(
      assignment,
      [{ id: 'stu-anna', name: 'Anna', specialNeeds: [] }],
      rules,
      layout,
      'balanced'
    );
    const v = violations.find((vv) => vv.ruleId === 'rule-window');
    expect(v?.description).toContain('Anna');
    expect(v?.description.toLowerCase()).toContain('fenster');
  });

  it('falls back to the studentId when the student is not in the array', () => {
    const rules: Rule[] = [
      {
        id: 'rule-orphan',
        studentId: 'stu-anna',
        type: 'beside',
        targetId: 'stu-ghost', // not in SMALL_STUDENTS
        strictness: 'hard'
      }
    ];
    // Manually craft an assignment that has both students placed, even though
    // stu-ghost is not in the students array — solver should still describe
    // the violation without crashing.
    const studentsPlus = [
      ...SMALL_STUDENTS,
      { id: 'stu-ghost', name: '', specialNeeds: [] }
    ];
    const assignment: SeatingAssignment = {
      'desk-a': 'stu-anna',
      'desk-d': 'stu-ghost',
      'desk-b': 'stu-clara',
      'desk-c': 'stu-david'
    };
    const { violations } = evaluateSeating(assignment, studentsPlus, rules, SMALL_LAYOUT, 'balanced');
    const v = violations.find((vv) => vv.ruleId === 'rule-orphan');
    // Falls back to the ID string when name is empty.
    expect(v?.description).toContain('stu-ghost');
  });
});

describe('Slice 5 -- explanation 3-line summary structure', () => {
  it('contains Ziel:, Erreicht: and Offen: in that order', () => {
    const proposal = generateSeatingPlan(SMALL_STUDENTS, [], SMALL_LAYOUT, 'balanced');
    const text = proposal.explanation;

    const zielIdx = text.indexOf('Ziel:');
    const erreichtIdx = text.indexOf('Erreicht:');
    const offenIdx = text.indexOf('Offen:');

    expect(zielIdx).toBeGreaterThanOrEqual(0);
    expect(erreichtIdx).toBeGreaterThan(zielIdx);
    expect(offenIdx).toBeGreaterThan(erreichtIdx);

    // Three lines joined by newlines.
    expect(text.split('\n')).toHaveLength(3);
  });

  it('reports "keine relevanten Wünsche unerfüllt" when no violations exist', () => {
    const proposal = generateSeatingPlan(SMALL_STUDENTS, [], SMALL_LAYOUT, 'balanced');
    if (proposal.violations.length === 0) {
      expect(proposal.explanation).toContain('keine relevanten Wünsche unerfüllt');
    }
  });

  it('uses preset-specific Ziel line for focus and friendship', () => {
    const focus = generateSeatingPlan(SMALL_STUDENTS, [], SMALL_LAYOUT, 'focus');
    expect(focus.explanation.toLowerCase()).toContain('fokus');

    const friend = generateSeatingPlan(SMALL_STUDENTS, [], SMALL_LAYOUT, 'friendship');
    expect(friend.explanation.toLowerCase()).toContain('freundschaft');
  });
});
