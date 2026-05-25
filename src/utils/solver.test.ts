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
