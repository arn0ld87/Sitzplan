import type { Rule } from '../types';

/**
 * Removes every rule that still references the deleted student — either as
 * the rule's primary subject (`studentId`) or as a relational target
 * (`targetId`). Pure function so it stays testable in isolation.
 */
export function cleanRulesForDeletedStudent(
  rules: Rule[],
  deletedStudentId: string
): Rule[] {
  return rules.filter(
    (r) => r.studentId !== deletedStudentId && r.targetId !== deletedStudentId
  );
}
