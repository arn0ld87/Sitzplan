import type { Student, Rule, ClassroomLayout, SchoolClass } from '../../types';

/**
 * Konflikt-Fixture: ZWEI horizontal benachbarte Pulte, zwei Schüler mit
 * harter not_beside-Regel. Solver kann die Regel zwangsläufig nicht
 * erfüllen — jeder Vorschlag muss `valid: false` sein.
 */
export const CONFLICT_STUDENTS: Student[] = [
  { id: 'stu-a', name: 'Alex', specialNeeds: [] },
  { id: 'stu-b', name: 'Bob', specialNeeds: [] }
];

export const CONFLICT_RULES: Rule[] = [
  {
    id: 'rule-not-beside-a-b',
    studentId: 'stu-a',
    type: 'not_beside',
    targetId: 'stu-b',
    strictness: 'hard'
  }
];

export const CONFLICT_LAYOUT: ClassroomLayout = {
  width: 6,
  height: 4,
  elements: [
    { id: 'board-c', type: 'board', x: 2, y: 0, w: 2, h: 1, rotation: 0 },
    // Genau 2 Pulte direkt nebeneinander -- Alex und Bob MÜSSEN benachbart sein.
    { id: 'desk-1', type: 'desk', x: 2, y: 2, w: 1, h: 1, rotation: 0 },
    { id: 'desk-2', type: 'desk', x: 3, y: 2, w: 1, h: 1, rotation: 0 }
  ]
};

export const CONFLICT_CLASS: SchoolClass = {
  id: 'class-conflict',
  name: 'Test-Klasse Konflikt',
  students: CONFLICT_STUDENTS,
  rules: CONFLICT_RULES
};
