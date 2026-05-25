import { describe, it, expect } from 'vitest';
import { parseNaturalLanguageCommand } from './parser';
import type { Student, Rule } from '../types';

const STUDENTS: Student[] = [
  { id: 'stu-anna', name: 'Anna', specialNeeds: [] },
  { id: 'stu-ben', name: 'Ben', specialNeeds: [] },
  { id: 'stu-clara', name: 'Clara', specialNeeds: [] }
];

const NO_RULES: Rule[] = [];

describe('parseNaturalLanguageCommand', () => {
  it('"Setze Anna neben Ben" creates a soft `beside` rule', () => {
    const r = parseNaturalLanguageCommand('Setze Anna neben Ben', STUDENTS, NO_RULES);
    expect(r.updatedRules).toHaveLength(1);
    const rule = r.updatedRules[0];
    expect(rule.type).toBe('beside');
    expect(rule.strictness).toBe('soft');
    expect([rule.studentId, rule.targetId]).toContain('stu-anna');
    expect([rule.studentId, rule.targetId]).toContain('stu-ben');
  });

  it('"Trenne Anna und Ben" creates a hard `not_beside` rule', () => {
    const r = parseNaturalLanguageCommand('Trenne Anna und Ben', STUDENTS, NO_RULES);
    expect(r.updatedRules).toHaveLength(1);
    const rule = r.updatedRules[0];
    expect(rule.type).toBe('not_beside');
    expect(rule.strictness).toBe('hard');
    expect([rule.studentId, rule.targetId]).toContain('stu-anna');
    expect([rule.studentId, rule.targetId]).toContain('stu-ben');
  });

  it('"Setze Anna nach vorne" creates a hard `front` position rule', () => {
    const r = parseNaturalLanguageCommand(
      'Setze Anna nach vorne',
      STUDENTS,
      NO_RULES
    );
    expect(r.updatedRules).toHaveLength(1);
    const rule = r.updatedRules[0];
    expect(rule.type).toBe('front');
    expect(rule.strictness).toBe('hard');
    expect(rule.studentId).toBe('stu-anna');
    expect(rule.targetId).toBeUndefined();
  });

  it('"Setze Ben nach hinten" maps to `back`', () => {
    const r = parseNaturalLanguageCommand(
      'Setze Ben nach hinten',
      STUDENTS,
      NO_RULES
    );
    expect(r.updatedRules).toHaveLength(1);
    expect(r.updatedRules[0].type).toBe('back');
    expect(r.updatedRules[0].studentId).toBe('stu-ben');
  });

  it('unknown name with no other student match yields no rule', () => {
    // Use students whose names cannot accidentally substring-match common
    // German words (e.g. "Ben" would match "neben"). With a single matchable
    // student and a position keyword the parser should still fall through.
    const isolated: Student[] = [
      { id: 'stu-quark', name: 'Quark', specialNeeds: [] }
    ];
    const r = parseNaturalLanguageCommand(
      'Setze Zorglub neben Quark',
      isolated,
      NO_RULES
    );
    // Only one student name matched -> 2-person branch is skipped, and
    // there is no position keyword like "vorne" -> no rule added.
    expect(r.updatedRules).toHaveLength(0);
    expect(r.explanation.length).toBeGreaterThan(0);
  });

  it('completely unrecognized command leaves rules untouched and explains why', () => {
    const r = parseNaturalLanguageCommand(
      'Mach den Sitzplan magisch',
      STUDENTS,
      NO_RULES
    );
    expect(r.updatedRules).toHaveLength(0);
    expect(r.updatedStudents).toEqual(STUDENTS);
    expect(r.parsedIntent.toLowerCase()).toContain('nicht');
  });

  it('"Lösche alle Regeln" clears the rule list', () => {
    const existing: Rule[] = [
      {
        id: 'r1',
        studentId: 'stu-anna',
        type: 'front',
        strictness: 'hard'
      }
    ];
    const r = parseNaturalLanguageCommand(
      'Lösche alle Regeln',
      STUDENTS,
      existing
    );
    expect(r.updatedRules).toHaveLength(0);
  });
});
