import type { Student, Rule, ClassroomLayout, SchoolClass } from '../../types';

/**
 * Slice 7 — Engpass-Fixture: 8 Schüler:innen, alle mit Sehschwäche, aber nur
 * 2 vordere Pulte verfügbar → garantierter `frontRow`-bottleneck. Zusätzlich
 * eine widersprüchliche `beside` + `not_beside`-Regelpaarung für stu-1/stu-2
 * → garantiert `contradictoryRules.length >= 1`.
 */
export const M2_CONFLICT_STUDENTS: Student[] = [
  { id: 'm2c-stu-1', name: 'Anna', specialNeeds: ['Sehschwäche'] },
  { id: 'm2c-stu-2', name: 'Ben', specialNeeds: ['Sehschwäche'] },
  { id: 'm2c-stu-3', name: 'Clara', specialNeeds: ['Sehschwäche'] },
  { id: 'm2c-stu-4', name: 'David', specialNeeds: ['Sehschwäche'] },
  { id: 'm2c-stu-5', name: 'Emma', specialNeeds: ['Sehschwäche'] },
  { id: 'm2c-stu-6', name: 'Finn', specialNeeds: ['Sehschwäche'] },
  { id: 'm2c-stu-7', name: 'Greta', specialNeeds: ['Sehschwäche'] },
  { id: 'm2c-stu-8', name: 'Hanno', specialNeeds: ['Sehschwäche'] }
];

export const M2_CONFLICT_RULES: Rule[] = [
  {
    id: 'm2c-rule-beside',
    studentId: 'm2c-stu-1',
    type: 'beside',
    targetId: 'm2c-stu-2',
    strictness: 'hard'
  },
  {
    id: 'm2c-rule-not-beside',
    studentId: 'm2c-stu-1',
    type: 'not_beside',
    targetId: 'm2c-stu-2',
    strictness: 'hard'
  }
];

/**
 * Layout: 8 Pulte in 4×2-Raster, aber nur 2 davon liegen im vorderen 35%
 * der Pulttiefe (`minY + rowDepth * 0.35`). Da alle 8 Schüler:innen
 * Sehschwäche haben, ergibt das `frontRow: { required: 8, available: 2 }`.
 *
 * minY = 2, maxY = 10 -> rowDepth = 8, Schwelle = 2 + 8*0.35 = 4.8.
 * Vordere Pulte: y ≤ 4.8 → nur y=2 (2 Pulte). Hinten: y=5, 7, 10.
 */
export const M2_CONFLICT_LAYOUT: ClassroomLayout = {
  width: 8,
  height: 12,
  elements: [
    { id: 'm2c-board', type: 'board', x: 2, y: 0, w: 4, h: 1, rotation: 0 },
    { id: 'm2c-door', type: 'door', x: 7, y: 11, w: 1, h: 1, rotation: 0 },
    // Vordere Reihe (y=2) — nur 2 Pulte
    { id: 'm2c-desk-f1', type: 'desk', x: 3, y: 2, w: 1, h: 1, rotation: 0 },
    { id: 'm2c-desk-f2', type: 'desk', x: 4, y: 2, w: 1, h: 1, rotation: 0 },
    // Mittelreihen (y=5) — 2 Pulte (außerhalb 35%-Schwelle 4.8)
    { id: 'm2c-desk-m1', type: 'desk', x: 3, y: 5, w: 1, h: 1, rotation: 0 },
    { id: 'm2c-desk-m2', type: 'desk', x: 4, y: 5, w: 1, h: 1, rotation: 0 },
    // Mittelreihe 2 (y=7) — 2 Pulte
    { id: 'm2c-desk-n1', type: 'desk', x: 3, y: 7, w: 1, h: 1, rotation: 0 },
    { id: 'm2c-desk-n2', type: 'desk', x: 4, y: 7, w: 1, h: 1, rotation: 0 },
    // Hintere Reihe (y=10) — 2 Pulte
    { id: 'm2c-desk-b1', type: 'desk', x: 3, y: 10, w: 1, h: 1, rotation: 0 },
    { id: 'm2c-desk-b2', type: 'desk', x: 4, y: 10, w: 1, h: 1, rotation: 0 }
  ]
};

export const M2_CONFLICT_CLASS: SchoolClass = {
  id: 'm2-class-conflict',
  name: 'M2 Engpass-Klasse',
  students: M2_CONFLICT_STUDENTS,
  rules: M2_CONFLICT_RULES
};
