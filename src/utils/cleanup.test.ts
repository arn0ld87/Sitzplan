import { describe, it, expect } from 'vitest';
import { cleanRulesForDeletedStudent } from './cleanup';
import type { Rule } from '../types';

describe('cleanRulesForDeletedStudent', () => {
  const RULES: Rule[] = [
    {
      id: 'r-unrelated',
      studentId: 'stu-anna',
      type: 'front',
      strictness: 'hard'
    },
    {
      id: 'r-subject',
      studentId: 'stu-deleted',
      type: 'back',
      strictness: 'soft'
    },
    {
      id: 'r-target',
      studentId: 'stu-anna',
      type: 'beside',
      targetId: 'stu-deleted',
      strictness: 'soft'
    },
    {
      id: 'r-both-unrelated',
      studentId: 'stu-ben',
      type: 'not_beside',
      targetId: 'stu-clara',
      strictness: 'hard'
    }
  ];

  it('keeps rules that do not reference the deleted student', () => {
    const remaining = cleanRulesForDeletedStudent(RULES, 'stu-deleted');
    expect(remaining.map((r) => r.id)).toEqual([
      'r-unrelated',
      'r-both-unrelated'
    ]);
  });

  it('removes a rule whose studentId matches the deleted student', () => {
    const remaining = cleanRulesForDeletedStudent(RULES, 'stu-deleted');
    expect(remaining.some((r) => r.id === 'r-subject')).toBe(false);
  });

  it('removes a rule whose targetId matches the deleted student', () => {
    const remaining = cleanRulesForDeletedStudent(RULES, 'stu-deleted');
    expect(remaining.some((r) => r.id === 'r-target')).toBe(false);
  });

  it('returns the same set when no rule references the deleted id', () => {
    const remaining = cleanRulesForDeletedStudent(RULES, 'stu-ghost');
    expect(remaining).toHaveLength(RULES.length);
  });

  it('does not mutate the input array', () => {
    const before = [...RULES];
    cleanRulesForDeletedStudent(RULES, 'stu-deleted');
    expect(RULES).toEqual(before);
  });
});
