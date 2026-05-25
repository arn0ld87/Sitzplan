import type { Student, Rule, ClassroomLayout, SchoolClass } from '../../types';

/**
 * Klein-Fixture: 4 Schüler ohne Sonderbedarf, 4 Plätze, keine Regeln.
 * Soll vom Solver konfliktfrei lösbar sein.
 */
export const SMALL_STUDENTS: Student[] = [
  { id: 'stu-anna', name: 'Anna', specialNeeds: [] },
  { id: 'stu-ben', name: 'Ben', specialNeeds: [] },
  { id: 'stu-clara', name: 'Clara', specialNeeds: [] },
  { id: 'stu-david', name: 'David', specialNeeds: [] }
];

export const SMALL_RULES: Rule[] = [];

/**
 * Layout: 2x2 Pultraster, eine Tafel oben, eine Tür rechts unten, ein
 * Fenster links. Pulte sind paarweise direkt benachbart (isAdjacent = true).
 */
export const SMALL_LAYOUT: ClassroomLayout = {
  width: 8,
  height: 8,
  elements: [
    { id: 'board-1', type: 'board', x: 3, y: 0, w: 2, h: 1, rotation: 0 },
    { id: 'window-1', type: 'window', x: 0, y: 3, w: 1, h: 2, rotation: 90 },
    { id: 'door-1', type: 'door', x: 7, y: 6, w: 1, h: 1, rotation: 0 },
    // 2x2 Pultraster, paarweise benachbart (Δx=1, Δy=1)
    { id: 'desk-a', type: 'desk', x: 3, y: 3, w: 1, h: 1, rotation: 0 },
    { id: 'desk-b', type: 'desk', x: 4, y: 3, w: 1, h: 1, rotation: 0 },
    { id: 'desk-c', type: 'desk', x: 3, y: 5, w: 1, h: 1, rotation: 0 },
    { id: 'desk-d', type: 'desk', x: 4, y: 5, w: 1, h: 1, rotation: 0 }
  ]
};

export const SMALL_CLASS: SchoolClass = {
  id: 'class-small',
  name: 'Test-Klasse Klein',
  students: SMALL_STUDENTS,
  rules: SMALL_RULES
};
