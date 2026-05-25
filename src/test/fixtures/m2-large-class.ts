import type { Student, Rule, ClassroomLayout, SchoolClass, ClassroomElement } from '../../types';

/**
 * Slice 7 — Performance-Fixture: 35 Schüler:innen, 30 Regeln (mix hard/soft,
 * Position + Beziehung), 6x6 Pultraster (36 Plätze).
 *
 * Special needs verteilt:
 *   - 5 × Sehschwäche
 *   - 3 × Hörschwäche
 *   - 2 × Barrierefreiheit
 *   - 4 × Konzentrationsbedarf
 *   - Rest: keine
 *
 * Wird verwendet, um das 2-Sekunden-Budget des Solvers ([PFLICHTENHEFT §5.1])
 * als Vitest-Assertion zu verankern.
 */

const NAMES = [
  'Anna', 'Ben', 'Clara', 'David', 'Emma', 'Finn', 'Greta', 'Hanno',
  'Ida', 'Jonas', 'Klara', 'Lena', 'Mika', 'Noah', 'Olga', 'Paul',
  'Quentin', 'Ronja', 'Sina', 'Tom', 'Uwe', 'Vera', 'Wim', 'Xenia',
  'Yara', 'Zoe', 'Alex', 'Bea', 'Cem', 'Dora', 'Erik', 'Fynn',
  'Gina', 'Holm', 'Ines'
];

function buildStudents(): Student[] {
  const list: Student[] = [];
  for (let i = 0; i < 35; i++) {
    const id = `m2-stu-${i + 1}`;
    const name = NAMES[i] ?? `Schueler${i + 1}`;
    let specialNeeds: Student['specialNeeds'] = [];
    if (i < 5) specialNeeds = ['Sehschwäche'];
    else if (i < 8) specialNeeds = ['Hörschwäche'];
    else if (i < 10) specialNeeds = ['Barrierefreiheit'];
    else if (i < 14) specialNeeds = ['Konzentrationsbedarf'];
    list.push({ id, name, specialNeeds });
  }
  return list;
}

export const M2_LARGE_STUDENTS: Student[] = buildStudents();

function buildRules(): Rule[] {
  const rules: Rule[] = [];
  // 6 hard position rules (front for Hörschwäche-Schüler:innen)
  // (Sehschwäche/Hörschwäche werden auch implizit gewertet, aber explizite
  // Regeln stressen den Solver zusätzlich.)
  const id = (i: number) => M2_LARGE_STUDENTS[i].id;

  // 4 hard front-row rules
  rules.push(
    { id: 'm2r-front-1', studentId: id(5), type: 'front', strictness: 'hard' },
    { id: 'm2r-front-2', studentId: id(6), type: 'front', strictness: 'hard' },
    { id: 'm2r-board-1', studentId: id(7), type: 'near_board', strictness: 'hard' },
    { id: 'm2r-door-1', studentId: id(8), type: 'near_door', strictness: 'hard' }
  );
  // 3 hard not-window rules
  rules.push(
    { id: 'm2r-nw-1', studentId: id(10), type: 'not_window', strictness: 'hard' },
    { id: 'm2r-nw-2', studentId: id(11), type: 'not_window', strictness: 'hard' },
    { id: 'm2r-nw-3', studentId: id(12), type: 'not_window', strictness: 'hard' }
  );
  // 4 hard relationship rules (not_beside conflict pairs)
  rules.push(
    { id: 'm2r-nb-1', studentId: id(15), type: 'not_beside', targetId: id(16), strictness: 'hard' },
    { id: 'm2r-nb-2', studentId: id(17), type: 'not_beside', targetId: id(18), strictness: 'hard' },
    { id: 'm2r-nb-3', studentId: id(19), type: 'not_beside', targetId: id(20), strictness: 'hard' },
    { id: 'm2r-nb-4', studentId: id(21), type: 'not_beside', targetId: id(22), strictness: 'hard' }
  );

  // 6 soft "beside" friendship rules
  rules.push(
    { id: 'm2r-bs-1', studentId: id(23), type: 'beside', targetId: id(24), strictness: 'soft' },
    { id: 'm2r-bs-2', studentId: id(25), type: 'beside', targetId: id(26), strictness: 'soft' },
    { id: 'm2r-bs-3', studentId: id(27), type: 'beside', targetId: id(28), strictness: 'soft' },
    { id: 'm2r-bs-4', studentId: id(29), type: 'beside', targetId: id(30), strictness: 'soft' },
    { id: 'm2r-bs-5', studentId: id(31), type: 'beside', targetId: id(32), strictness: 'soft' },
    { id: 'm2r-bs-6', studentId: id(33), type: 'beside', targetId: id(34), strictness: 'soft' }
  );

  // 4 soft "near" rules
  rules.push(
    { id: 'm2r-near-1', studentId: id(0), type: 'near', targetId: id(1), strictness: 'soft' },
    { id: 'm2r-near-2', studentId: id(2), type: 'near', targetId: id(3), strictness: 'soft' },
    { id: 'm2r-near-3', studentId: id(14), type: 'near', targetId: id(13), strictness: 'soft' },
    { id: 'm2r-near-4', studentId: id(9), type: 'near', targetId: id(4), strictness: 'soft' }
  );

  // 3 soft "far" rules
  rules.push(
    { id: 'm2r-far-1', studentId: id(15), type: 'far', targetId: id(20), strictness: 'soft' },
    { id: 'm2r-far-2', studentId: id(16), type: 'far', targetId: id(22), strictness: 'soft' },
    { id: 'm2r-far-3', studentId: id(17), type: 'far', targetId: id(19), strictness: 'soft' }
  );

  // 4 soft positional rules (back/edge)
  rules.push(
    { id: 'm2r-back-1', studentId: id(24), type: 'back', strictness: 'soft' },
    { id: 'm2r-back-2', studentId: id(26), type: 'back', strictness: 'soft' },
    { id: 'm2r-edge-1', studentId: id(28), type: 'edge', strictness: 'soft' },
    { id: 'm2r-edge-2', studentId: id(30), type: 'edge', strictness: 'soft' }
  );

  return rules;
}

export const M2_LARGE_RULES: Rule[] = buildRules();

/**
 * Layout: 6×6 Pultraster, Tafel oben (front), zwei Fenster auf einer Seite,
 * eine Tür in der gegenüberliegenden Ecke. Pultabstand Δx=Δy=1, dadurch
 * sind horizontal benachbarte Pulte mit `isAdjacent` erkennbar.
 */
function buildLayout(): ClassroomLayout {
  const elements: ClassroomElement[] = [];
  elements.push({ id: 'm2-board', type: 'board', x: 3, y: 0, w: 4, h: 1, rotation: 0 });
  // Zwei Fenster linke Seite (y=3 und y=5)
  elements.push({ id: 'm2-window-1', type: 'window', x: 0, y: 3, w: 1, h: 1, rotation: 90 });
  elements.push({ id: 'm2-window-2', type: 'window', x: 0, y: 5, w: 1, h: 1, rotation: 90 });
  // Tür rechte untere Ecke
  elements.push({ id: 'm2-door', type: 'door', x: 9, y: 8, w: 1, h: 1, rotation: 0 });
  // 6×6 Pultraster (36 Plätze, einer mehr als Schüler:innen)
  let n = 0;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      elements.push({
        id: `m2-desk-${row}-${col}`,
        type: 'desk',
        x: 2 + col,
        y: 2 + row,
        w: 1,
        h: 1,
        rotation: 0
      });
      n++;
    }
  }
  void n;
  return { width: 12, height: 10, elements };
}

export const M2_LARGE_LAYOUT: ClassroomLayout = buildLayout();

export const M2_LARGE_CLASS: SchoolClass = {
  id: 'm2-class-large',
  name: 'M2 große Klasse (35)',
  students: M2_LARGE_STUDENTS,
  rules: M2_LARGE_RULES
};
