import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateSeatingPlan,
  generateSeatingProposals,
  evaluateSeating,
  computeStudentDifficulty,
  hammingDistanceAssignments,
  selectTop3Distinct
} from './solver';
import type { Rule, ClassroomLayout, SeatingAssignment, SeatingProposal, Student } from '../types';
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

describe('generateSeatingProposals -- seeded determinism', () => {
  // Two back-to-back solver runs on SMALL_LAYOUT after Slice 6's full-candidate
  // dedup (12 buildProposal calls × 2) flirt with the 15s default. Slice 7 will
  // tune SA cooling so this can drop back to ~5s.
  it('returns identical proposals[].assignments on consecutive calls with the same seed', () => {
    const first = generateSeatingProposals(SMALL_STUDENTS, [], SMALL_LAYOUT, { seed: 42 });
    const second = generateSeatingProposals(SMALL_STUDENTS, [], SMALL_LAYOUT, { seed: 42 });

    expect(first).toHaveLength(3);
    expect(second).toHaveLength(3);
    first.forEach((proposal, i) => {
      expect(proposal.assignments).toEqual(second[i].assignments);
    });
  }, 45000);

  it('returns 3 proposals without opts (Math.random fallback)', () => {
    const proposals = generateSeatingProposals(SMALL_STUDENTS, [], SMALL_LAYOUT);
    expect(proposals).toHaveLength(3);
    proposals.forEach((p) => {
      expect(p).toBeDefined();
      expect(p.assignments).toBeDefined();
      expect(typeof p.score).toBe('number');
    });
  }, 30000);
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

describe('Slice 4 -- computeStudentDifficulty', () => {
  it('returns 0 for an unconstrained student without special needs', () => {
    const student: Student = { id: 'stu-0', name: 'Zero', specialNeeds: [] };
    expect(computeStudentDifficulty(student, [])).toBe(0);
  });

  it('returns the weighted sum 2*10 + 3*3 + 1*6 + 2*4 = 43 for a mixed student', () => {
    const student: Student = {
      id: 'stu-mix',
      name: 'Mix',
      specialNeeds: ['Sehschwäche']
    };
    const rules: Rule[] = [
      // 2 hard position rules (no targetId)
      { id: 'r-h1', studentId: 'stu-mix', type: 'front', strictness: 'hard' },
      { id: 'r-h2', studentId: 'stu-mix', type: 'near_door', strictness: 'hard' },
      // 3 soft position rules
      { id: 'r-s1', studentId: 'stu-mix', type: 'edge', strictness: 'soft' },
      { id: 'r-s2', studentId: 'stu-mix', type: 'back', strictness: 'soft' },
      { id: 'r-s3', studentId: 'stu-mix', type: 'not_window', strictness: 'soft' },
      // 2 relation rules (targetId set)
      {
        id: 'r-rel1',
        studentId: 'stu-mix',
        type: 'beside',
        targetId: 'stu-other',
        strictness: 'soft'
      },
      {
        id: 'r-rel2',
        studentId: 'stu-other2',
        type: 'far',
        targetId: 'stu-mix',
        strictness: 'hard'
      },
      // Noise: rule for a third party that should not count
      {
        id: 'r-other',
        studentId: 'stu-other3',
        type: 'front',
        strictness: 'hard'
      }
    ];

    expect(computeStudentDifficulty(student, rules)).toBe(43);
  });

  it('ignores rules with empty-string targetId (treats them as position rules)', () => {
    const student: Student = { id: 'stu-e', name: 'E', specialNeeds: [] };
    const rules: Rule[] = [
      { id: 'r-pos', studentId: 'stu-e', type: 'front', strictness: 'hard', targetId: '' }
    ];
    // Empty-string targetId is treated as no target -> hard position rule -> 10.
    expect(computeStudentDifficulty(student, rules)).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Slice 6 — dedup top-3 by Hamming distance
// ---------------------------------------------------------------------------

function makeStudents(n: number): Student[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `stu-${i}`,
    name: `S${i}`,
    specialNeeds: []
  }));
}

function makeProposal(
  id: string,
  score: number,
  assignments: SeatingAssignment
): SeatingProposal {
  return {
    id,
    name: id,
    assignments,
    score,
    violations: [],
    explanation: '',
    valid: true,
    diagnostics: {
      unplacedStudents: [],
      bottlenecks: [],
      contradictoryRules: []
    }
  };
}

describe('Slice 6 -- hammingDistanceAssignments', () => {
  it('returns 0 for two identical assignments', () => {
    const students = makeStudents(10);
    const a: SeatingAssignment = {};
    students.forEach((s, i) => {
      a[`desk-${i}`] = s.id;
    });
    const b: SeatingAssignment = { ...a };
    expect(hammingDistanceAssignments(a, b, students)).toBe(0);
  });

  it('returns 3 when 3-of-10 students sit at a different desk', () => {
    const students = makeStudents(10);
    const a: SeatingAssignment = {};
    students.forEach((s, i) => {
      a[`desk-${i}`] = s.id;
    });
    // Swap students 0<->1 and move student 2 to desk-9 (3 of 10 differ).
    // Student 9 in `a` is at desk-9; in `b` he moves to desk-2.
    const b: SeatingAssignment = { ...a };
    b['desk-0'] = 'stu-1';
    b['desk-1'] = 'stu-0';
    b['desk-9'] = 'stu-2';
    b['desk-2'] = 'stu-9';
    // Differences: stu-0 (desk-0 vs desk-1), stu-1 (desk-1 vs desk-0),
    // stu-2 (desk-2 vs desk-9), stu-9 (desk-9 vs desk-2) = 4 differences.
    expect(hammingDistanceAssignments(a, b, students)).toBe(4);

    // Tighter: just rotate stu-0, stu-1, stu-2 cyclically (3 differ).
    const c: SeatingAssignment = { ...a };
    c['desk-0'] = 'stu-1';
    c['desk-1'] = 'stu-2';
    c['desk-2'] = 'stu-0';
    expect(hammingDistanceAssignments(a, c, students)).toBe(3);
  });

  it('counts unassigned-in-one-only as a difference', () => {
    const students = makeStudents(2);
    const a: SeatingAssignment = { 'desk-0': 'stu-0', 'desk-1': 'stu-1' };
    const b: SeatingAssignment = { 'desk-0': 'stu-0' }; // stu-1 missing
    expect(hammingDistanceAssignments(a, b, students)).toBe(1);
  });
});

describe('Slice 6 -- selectTop3Distinct', () => {
  it('picks 3 candidates that all differ by >= 30% at base threshold', () => {
    // 10 students, threshold 0.30 -> required diff >= 3.
    const students = makeStudents(10);

    // Base assignment: stu-i on desk-i.
    const base: SeatingAssignment = {};
    students.forEach((s, i) => {
      base[`desk-${i}`] = s.id;
    });

    // Two "near-duplicates" of base (diff = 2 -> below threshold).
    const dup1: SeatingAssignment = { ...base };
    dup1['desk-0'] = 'stu-1';
    dup1['desk-1'] = 'stu-0';

    const dup2: SeatingAssignment = { ...base };
    dup2['desk-2'] = 'stu-3';
    dup2['desk-3'] = 'stu-2';

    // Three "far" variants (diff = 4 from base and from each other).
    const far1: SeatingAssignment = {};
    students.forEach((_s, i) => {
      far1[`desk-${i}`] = students[(i + 5) % 10].id;
    });
    const far2: SeatingAssignment = {};
    students.forEach((_s, i) => {
      far2[`desk-${i}`] = students[(i + 3) % 10].id;
    });

    // Candidates: anchor + 2 near-dups + 2 far variants. Anchor + far1 + far2
    // should be returned (3 candidates, all >= 30% distance from each other).
    const candidates = [
      makeProposal('anchor', 1000, base),
      makeProposal('dup1', 990, dup1),
      makeProposal('dup2', 985, dup2),
      makeProposal('far1', 980, far1),
      makeProposal('far2', 970, far2)
    ];

    const picked = selectTop3Distinct(candidates, students);
    expect(picked).toHaveLength(3);
    const ids = picked.map((p) => p.id);
    expect(ids).toContain('anchor');
    expect(ids).toContain('far1');
    expect(ids).toContain('far2');
    // No diagnostic note when full 30% threshold succeeded.
    picked.forEach((p) => {
      expect(p.diagnostics?.note ?? '').not.toContain('ausreichend unterschiedlichen Alternativen');
    });
  });

  it('soft-reduces to lower threshold and appends a diagnostic note', () => {
    // 10 students. Build a pool where:
    //   anchor + alt1 differ by 4 (>= 0.30 -> 3 needed)
    //   anchor + alt2 differ by only 1 (< 0.30, but >= 0.10 -> 1 needed)
    //   alt1 + alt2 differ by 3 (>= 0.30 -- this is fine for any threshold)
    const students = makeStudents(10);

    const base: SeatingAssignment = {};
    students.forEach((s, i) => {
      base[`desk-${i}`] = s.id;
    });

    // alt1: rotate 4 students.
    const alt1: SeatingAssignment = { ...base };
    alt1['desk-0'] = 'stu-1';
    alt1['desk-1'] = 'stu-2';
    alt1['desk-2'] = 'stu-3';
    alt1['desk-3'] = 'stu-0';
    // diff(base, alt1) = 4 students moved.

    // alt2: swap students 8 and 9 only. diff(base, alt2) = 2.
    // But we need < 0.30 (i.e. < 3) AND >= 0.10 (i.e. >= 1). Make it 2.
    const alt2: SeatingAssignment = { ...base };
    alt2['desk-8'] = 'stu-9';
    alt2['desk-9'] = 'stu-8';
    // diff(base, alt2) = 2 -> fails 0.30 (needs 3), passes 0.20 (needs 2).
    // diff(alt1, alt2) = 4 + 2 = 6 -> passes all thresholds.

    const candidates = [
      makeProposal('anchor', 1000, base),
      makeProposal('alt1', 990, alt1),
      makeProposal('alt2', 980, alt2)
    ];

    const picked = selectTop3Distinct(candidates, students);
    expect(picked).toHaveLength(3);
    const ids = picked.map((p) => p.id);
    expect(ids).toEqual(['anchor', 'alt1', 'alt2']);

    // Soft reduction kicked in -> note appended on all three.
    picked.forEach((p) => {
      expect(p.diagnostics?.note ?? '').toContain('ausreichend unterschiedlichen Alternativen');
    });
  });

  it('returns the pool unchanged with a note when fewer than 3 candidates exist', () => {
    const students = makeStudents(5);
    const a: SeatingAssignment = {};
    students.forEach((s, i) => {
      a[`desk-${i}`] = s.id;
    });
    const b: SeatingAssignment = { ...a };
    b['desk-0'] = 'stu-1';
    b['desk-1'] = 'stu-0';

    const candidates = [
      makeProposal('anchor', 100, a),
      makeProposal('alt', 90, b)
    ];
    const picked = selectTop3Distinct(candidates, students);
    expect(picked).toHaveLength(2);
    picked.forEach((p) => {
      expect(p.diagnostics?.note ?? '').toContain('ausreichend unterschiedlichen Alternativen');
    });
  });

  it('preserves an existing diagnostic note and appends after a space', () => {
    const students = makeStudents(5);
    const a: SeatingAssignment = {};
    students.forEach((s, i) => {
      a[`desk-${i}`] = s.id;
    });
    const existing: SeatingProposal = {
      ...makeProposal('anchor', 100, a),
      diagnostics: {
        unplacedStudents: [],
        bottlenecks: [],
        contradictoryRules: [],
        note: 'Bestehender Hinweis.'
      }
    };
    const picked = selectTop3Distinct([existing], students);
    // Single candidate -> short-circuit returns it unchanged (no note append).
    expect(picked).toHaveLength(1);
    expect(picked[0].diagnostics?.note).toBe('Bestehender Hinweis.');
  });
});

// ---------------------------------------------------------------------------
// Slice 7 — Test-Erweiterung + Performance-Budget
// ---------------------------------------------------------------------------

import {
  M2_LARGE_STUDENTS,
  M2_LARGE_RULES,
  M2_LARGE_LAYOUT
} from '../test/fixtures/m2-large-class';
import {
  M2_CONFLICT_STUDENTS,
  M2_CONFLICT_RULES,
  M2_CONFLICT_LAYOUT
} from '../test/fixtures/m2-conflict';
import type { ClassroomElement } from '../types';

describe('Slice 7 -- performance budget @ 35 students / 30 rules', () => {
  it('generateSeatingProposals finishes in < 2000 ms', () => {
    // Warm-up run so JIT/import costs are not measured.
    generateSeatingProposals(M2_LARGE_STUDENTS, M2_LARGE_RULES, M2_LARGE_LAYOUT, {
      seed: 7
    });

    const start = performance.now();
    const proposals = generateSeatingProposals(
      M2_LARGE_STUDENTS,
      M2_LARGE_RULES,
      M2_LARGE_LAYOUT,
      { seed: 7 }
    );
    const duration = performance.now() - start;

    expect(proposals).toHaveLength(3);
    expect(duration).toBeLessThan(2000);
  }, 10000);
});

describe('Slice 7 -- determinism on large class', () => {
  it('returns identical assignments on two consecutive calls with the same seed', () => {
    const first = generateSeatingProposals(M2_LARGE_STUDENTS, M2_LARGE_RULES, M2_LARGE_LAYOUT, {
      seed: 7
    });
    const second = generateSeatingProposals(M2_LARGE_STUDENTS, M2_LARGE_RULES, M2_LARGE_LAYOUT, {
      seed: 7
    });
    expect(first).toHaveLength(3);
    expect(second).toHaveLength(3);
    first.forEach((p, i) => {
      expect(p.assignments).toEqual(second[i].assignments);
    });
  }, 10000);
});

describe('Slice 7 -- dedup on large class >= 30% Hamming', () => {
  it('three proposals differ in >= 30% of placements (or carry the diagnostic note)', () => {
    const proposals = generateSeatingProposals(M2_LARGE_STUDENTS, M2_LARGE_RULES, M2_LARGE_LAYOUT, {
      seed: 7
    });
    expect(proposals).toHaveLength(3);

    const threshold = 0.30 * M2_LARGE_STUDENTS.length;
    const pairs: Array<[number, number]> = [
      [0, 1],
      [0, 2],
      [1, 2]
    ];

    const allDistinct = pairs.every(([i, j]) =>
      hammingDistanceAssignments(
        proposals[i].assignments,
        proposals[j].assignments,
        M2_LARGE_STUDENTS
      ) >= threshold
    );

    const softReducedNote = proposals.every((p) =>
      (p.diagnostics?.note ?? '').includes('ausreichend unterschiedlichen Alternativen')
    );

    expect(allDistinct || softReducedNote).toBe(true);
  }, 10000);
});

describe('Slice 7 -- special needs placement (Hörschwäche → vorderste Reihe)', () => {
  it('places the Hörschwäche student on a desk with minimal y', () => {
    // Tiny layout: 4 desks in 2 rows (front y=1, back y=4). The Hörschwäche
    // student must land on a y=1 desk. Filler students keep the solver
    // honest by occupying the back row.
    const layout: ClassroomLayout = {
      width: 8,
      height: 8,
      elements: [
        { id: 's7-board', type: 'board', x: 2, y: 0, w: 4, h: 1, rotation: 0 },
        { id: 's7-desk-f1', type: 'desk', x: 2, y: 1, w: 1, h: 1, rotation: 0 },
        { id: 's7-desk-f2', type: 'desk', x: 4, y: 1, w: 1, h: 1, rotation: 0 },
        { id: 's7-desk-b1', type: 'desk', x: 2, y: 4, w: 1, h: 1, rotation: 0 },
        { id: 's7-desk-b2', type: 'desk', x: 4, y: 4, w: 1, h: 1, rotation: 0 }
      ]
    };
    const students: Student[] = [
      { id: 's7-hoer', name: 'Hannah', specialNeeds: ['Hörschwäche'] },
      { id: 's7-f1', name: 'F1', specialNeeds: [] },
      { id: 's7-f2', name: 'F2', specialNeeds: [] },
      { id: 's7-f3', name: 'F3', specialNeeds: [] }
    ];

    const proposals = generateSeatingProposals(students, [], layout, { seed: 7 });
    expect(proposals.length).toBeGreaterThan(0);

    const desks = layout.elements.filter((el) => el.type === 'desk') as ClassroomElement[];
    const minDeskY = Math.min(...desks.map((d) => d.y));

    proposals.forEach((p) => {
      const deskOfHoer = Object.entries(p.assignments).find(
        ([, sid]) => sid === 's7-hoer'
      );
      expect(deskOfHoer).toBeDefined();
      const desk = desks.find((d) => d.id === deskOfHoer![0])!;
      expect(desk.y).toBe(minDeskY);
    });
  }, 10000);
});

describe('Slice 7 -- special needs placement (Barrierefreiheit nahe Tür)', () => {
  it('places the affected student within distance <= 2 of a door element', () => {
    // 2×3 desk grid with door tucked into a corner. The minX/maxX edge
    // desks are also the desks closest to the door, so the solver's
    // "edge or door-adjacent" definition collapses to "door-adjacent"
    // for the affected student.
    const layout: ClassroomLayout = {
      width: 8,
      height: 8,
      elements: [
        { id: 's7b-board', type: 'board', x: 2, y: 0, w: 4, h: 1, rotation: 0 },
        // Door directly adjacent to the desk cluster.
        { id: 's7b-door', type: 'door', x: 3, y: 3, w: 1, h: 1, rotation: 0 },
        // 2x2 cluster of desks all within distance ~1.5 of the door.
        { id: 's7b-desk-1', type: 'desk', x: 2, y: 2, w: 1, h: 1, rotation: 0 },
        { id: 's7b-desk-2', type: 'desk', x: 4, y: 2, w: 1, h: 1, rotation: 0 },
        { id: 's7b-desk-3', type: 'desk', x: 2, y: 4, w: 1, h: 1, rotation: 0 },
        { id: 's7b-desk-4', type: 'desk', x: 4, y: 4, w: 1, h: 1, rotation: 0 }
      ]
    };
    const students: Student[] = [
      { id: 's7b-barr', name: 'Bea', specialNeeds: ['Barrierefreiheit'] },
      { id: 's7b-f1', name: 'F1', specialNeeds: [] },
      { id: 's7b-f2', name: 'F2', specialNeeds: [] },
      { id: 's7b-f3', name: 'F3', specialNeeds: [] }
    ];

    const proposals = generateSeatingProposals(students, [], layout, { seed: 7 });
    expect(proposals.length).toBeGreaterThan(0);

    const desks = layout.elements.filter((el) => el.type === 'desk') as ClassroomElement[];
    const doors = layout.elements.filter((el) => el.type === 'door') as ClassroomElement[];

    proposals.forEach((p) => {
      const entry = Object.entries(p.assignments).find(([, sid]) => sid === 's7b-barr');
      expect(entry).toBeDefined();
      const desk = desks.find((d) => d.id === entry![0])!;
      const minDoorDist = Math.min(
        ...doors.map((door) =>
          Math.sqrt((desk.x - door.x) ** 2 + (desk.y - door.y) ** 2)
        )
      );
      expect(minDoorDist).toBeLessThanOrEqual(2);
    });
  }, 10000);
});

describe('Slice 7 -- special needs placement (Konzentrationsbedarf weg vom Fenster)', () => {
  it('places the affected student at distance >= 2 from any window element', () => {
    // 4 desks in a row, window at x=0. Desk x=1 is too close (distance 1),
    // desk x=3 is just within window-safe distance.
    const layout: ClassroomLayout = {
      width: 8,
      height: 6,
      elements: [
        { id: 's7k-board', type: 'board', x: 2, y: 0, w: 4, h: 1, rotation: 0 },
        { id: 's7k-window', type: 'window', x: 0, y: 3, w: 1, h: 1, rotation: 90 },
        { id: 's7k-desk-1', type: 'desk', x: 1, y: 3, w: 1, h: 1, rotation: 0 },
        { id: 's7k-desk-2', type: 'desk', x: 3, y: 3, w: 1, h: 1, rotation: 0 },
        { id: 's7k-desk-3', type: 'desk', x: 5, y: 3, w: 1, h: 1, rotation: 0 },
        { id: 's7k-desk-4', type: 'desk', x: 6, y: 3, w: 1, h: 1, rotation: 0 }
      ]
    };
    const students: Student[] = [
      { id: 's7k-konz', name: 'Kai', specialNeeds: ['Konzentrationsbedarf'] },
      { id: 's7k-f1', name: 'F1', specialNeeds: [] },
      { id: 's7k-f2', name: 'F2', specialNeeds: [] },
      { id: 's7k-f3', name: 'F3', specialNeeds: [] }
    ];

    const proposals = generateSeatingProposals(students, [], layout, { seed: 7 });
    expect(proposals.length).toBeGreaterThan(0);

    const desks = layout.elements.filter((el) => el.type === 'desk') as ClassroomElement[];
    const windows = layout.elements.filter((el) => el.type === 'window') as ClassroomElement[];

    proposals.forEach((p) => {
      const entry = Object.entries(p.assignments).find(([, sid]) => sid === 's7k-konz');
      expect(entry).toBeDefined();
      const desk = desks.find((d) => d.id === entry![0])!;
      const minWinDist = Math.min(
        ...windows.map((win) =>
          Math.sqrt((desk.x - win.x) ** 2 + (desk.y - win.y) ** 2)
        )
      );
      expect(minWinDist).toBeGreaterThanOrEqual(2);
    });
  }, 10000);
});

describe('Slice 7 -- Konfliktanalyse: bottlenecks + contradictoryRules', () => {
  it('reports frontRow bottleneck (required >= 8, available == 2) and contradictoryRules >= 1', () => {
    const proposals = generateSeatingProposals(
      M2_CONFLICT_STUDENTS,
      M2_CONFLICT_RULES,
      M2_CONFLICT_LAYOUT,
      { seed: 7 }
    );
    expect(proposals.length).toBeGreaterThan(0);

    const diag = proposals[0].diagnostics;
    expect(diag).toBeDefined();

    const frontRowBottleneck = diag!.bottlenecks.find((b) => b.kind === 'frontRow');
    expect(frontRowBottleneck).toBeDefined();
    expect(frontRowBottleneck!.required).toBeGreaterThanOrEqual(8);
    expect(frontRowBottleneck!.available).toBe(2);

    expect(diag!.contradictoryRules.length).toBeGreaterThanOrEqual(1);
  }, 10000);
});

describe('Slice 6 -- generateSeatingProposals dedup integration', () => {
  it('returns 3 proposals that differ from each other or carry the note', () => {
    const proposals = generateSeatingProposals(
      CONFLICT_STUDENTS,
      CONFLICT_RULES,
      CONFLICT_LAYOUT,
      { seed: 1 }
    );

    expect(proposals.length).toBeGreaterThan(0);
    expect(proposals.length).toBeLessThanOrEqual(3);

    if (proposals.length === 3) {
      // Either at least one pair of proposals differs in >= 1 assignment,
      // or the diagnostic note is set (signalling no diverse alternatives).
      const anyDifferent = proposals.some((p, i) =>
        proposals.slice(i + 1).some(
          (q) => hammingDistanceAssignments(p.assignments, q.assignments, CONFLICT_STUDENTS) >= 1
        )
      );
      const allNoted = proposals.every((p) =>
        (p.diagnostics?.note ?? '').includes('ausreichend unterschiedlichen Alternativen')
      );
      expect(anyDifferent || allNoted).toBe(true);
    }
  });
});
