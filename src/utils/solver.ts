import type {
  Student,
  Rule,
  ClassroomElement,
  ClassroomLayout,
  SeatingAssignment,
  SeatingViolation,
  SeatingProposal
} from '../types';

// Helper: Calculate distance between two room elements
function getDistance(el1: { x: number; y: number }, el2: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(el1.x - el2.x, 2) + Math.pow(el1.y - el2.y, 2));
}

// Helper: Determine if two desks are adjacent (sharing a border or corner)
function isAdjacent(d1: ClassroomElement, d2: ClassroomElement): boolean {
  return Math.abs(d1.x - d2.x) <= 1.5 && Math.abs(d1.y - d2.y) <= 1.5 && d1.id !== d2.id;
}

// Core evaluation function
export function evaluateSeating(
  assignments: SeatingAssignment,
  students: Student[],
  rules: Rule[],
  layout: ClassroomLayout,
  preset: 'balanced' | 'focus' | 'friendship' = 'balanced'
): { score: number; violations: SeatingViolation[] } {
  let score = 1000;
  const violations: SeatingViolation[] = [];

  const desks = layout.elements.filter((el) => el.type === 'desk');
  const board = layout.elements.find((el) => el.type === 'board') || {
    id: 'fallback-board',
    type: 'board' as const,
    x: layout.width / 2,
    y: 0,
    w: 4,
    h: 1,
    rotation: 0 as const
  };
  const doors = layout.elements.filter((el) => el.type === 'door');
  const windows = layout.elements.filter((el) => el.type === 'window');

  // Find min and max y coordinates of desks to define "front" and "back" rows
  let minY = layout.height;
  let maxY = 0;
  let minX = layout.width;
  let maxX = 0;

  desks.forEach((d) => {
    if (d.y < minY) minY = d.y;
    if (d.y > maxY) maxY = d.y;
    if (d.x < minX) minX = d.x;
    if (d.x > maxX) maxX = d.x;
  });

  const rowDepth = maxY - minY || 1;

  // Cache desk assignments for fast lookup: studentId -> deskElement
  const studentDeskMap = new Map<string, ClassroomElement>();
  const deskMap = new Map<string, ClassroomElement>();

  desks.forEach((d) => {
    deskMap.set(d.id, d);
    const sId = assignments[d.id];
    if (sId) {
      studentDeskMap.set(sId, d);
    }
  });

  // Define dynamic penalty weights based on the selected generation preset
  const weights = {
    hardViolation: preset === 'focus' ? 800 : 500,
    softViolation: 50,
    behaviorMismatch: preset === 'focus' ? 1000 : 600,
    friendshipBonus: preset === 'friendship' ? 150 : 50,
    friendshipSoftViolation: preset === 'friendship' ? 10 : 40,
    noiseControlBonus: preset === 'focus' ? 80 : 20,
  };

  // 1. Evaluate Special Needs (Implicit Hard / Soft Rules)
  students.forEach((student) => {
    const desk = studentDeskMap.get(student.id);
    if (!desk) return; // Student not assigned (should not happen in a complete run)

    // A. SEHSCHWÄCHE (Must sit in front 35% of the classroom)
    if (student.specialNeeds.includes('Sehschwäche')) {
      const isFront = desk.y <= minY + rowDepth * 0.35;
      if (!isFront) {
        score -= weights.hardViolation;
        violations.push({
          id: `need-seh-${student.id}`,
          studentId: student.id,
          type: 'hard',
          description: 'Sehschwäche: Sollte in der vorderen Reihe sitzen (nahe der Tafel).',
          targetElementId: board.id
        });
      }
    }

    // B. HÖRSCHWÄCHE (Must sit in front rows or close to the board/teacher)
    if (student.specialNeeds.includes('Hörschwäche')) {
      const distToBoard = getDistance(desk, board);
      const isFront = desk.y <= minY + rowDepth * 0.35 || distToBoard <= 3.5;
      if (!isFront) {
        score -= weights.hardViolation;
        violations.push({
          id: `need-hoer-${student.id}`,
          studentId: student.id,
          type: 'hard',
          description: 'Hörschwäche: Sollte nahe bei der Tafel / vorne sitzen.',
          targetElementId: board.id
        });
      }
    }

    // C. BARRIEREFREIHEIT (Wheelchair - must sit at a desk closest to a door, or on an accessible edge)
    if (student.specialNeeds.includes('Barrierefreiheit')) {
      // Find distance to doors
      const minDoorDist = doors.length > 0
        ? Math.min(...doors.map((door) => getDistance(desk, door)))
        : 999;
      
      const isAccessible = minDoorDist <= 2.5 || desk.x === minX || desk.x === maxX;
      if (!isAccessible) {
        score -= weights.hardViolation;
        violations.push({
          id: `need-barr-${student.id}`,
          studentId: student.id,
          type: 'hard',
          description: 'Barrierefreiheit: Benötigt barrierefreien Platz nahe der Tür oder am Rand.',
          targetElementId: doors[0]?.id
        });
      }
    }

    // D. KONZENTRATIONSBEDARF (Should sit away from windows and doors, closer to center/front)
    if (student.specialNeeds.includes('Konzentrationsbedarf')) {
      const nearWindow = windows.some((win) => getDistance(desk, win) <= 1.8);
      const nearDoor = doors.some((door) => getDistance(desk, door) <= 2.0);
      if (nearWindow || nearDoor) {
        score -= weights.softViolation;
        violations.push({
          id: `need-konz-${student.id}`,
          studentId: student.id,
          type: 'soft',
          description: 'Konzentrationsbedarf: Sollte nicht direkt am Fenster oder an der Tür sitzen.',
        });
      }
    }

    // E. VERHALTEN (Two behavior-heavy students must not sit next to each other)
    if (student.specialNeeds.includes('Verhalten')) {
      // Check adjacent desks
      desks.forEach((otherDesk) => {
        if (otherDesk.id === desk.id) return;
        if (isAdjacent(desk, otherDesk)) {
          const otherStudentId = assignments[otherDesk.id];
          if (otherStudentId) {
            const otherStudent = students.find((s) => s.id === otherStudentId);
            if (otherStudent && otherStudent.specialNeeds.includes('Verhalten')) {
              // Both have behavioral tags, heavy penalty!
              score -= weights.behaviorMismatch;
              violations.push({
                id: `need-verh-${student.id}-${otherStudent.id}`,
                studentId: student.id,
                type: 'hard',
                description: 'Verhaltensauffälligkeit: Darf nicht neben einem anderen Schüler mit erhöhtem Verhaltenbedarf sitzen.',
                targetStudentId: otherStudent.id
              });
            }
          }
        }
      });
    }
  });

  // 2. Evaluate Custom Relationship and Position Rules
  rules.forEach((rule) => {
    const studentDesk = studentDeskMap.get(rule.studentId);
    if (!studentDesk) return;

    const penalty = rule.strictness === 'hard' ? weights.hardViolation : weights.softViolation;

    // Relational rules (beside, not_beside, near, far)
    if (rule.targetId) {
      const targetDesk = studentDeskMap.get(rule.targetId);
      if (!targetDesk) return;

      const adjacent = isAdjacent(studentDesk, targetDesk);
      const dist = getDistance(studentDesk, targetDesk);

      switch (rule.type) {
        case 'beside':
          if (!adjacent) {
            score -= penalty;
            violations.push({
              id: rule.id,
              studentId: rule.studentId,
              ruleId: rule.id,
              type: rule.strictness,
              description: `Sollte neben ${students.find((s) => s.id === rule.targetId)?.name || 'Schüler'} sitzen.`,
              targetStudentId: rule.targetId
            });
          } else if (rule.strictness === 'soft') {
            score += weights.friendshipBonus; // Reward for placing friends together
          }
          break;

        case 'not_beside':
          if (adjacent) {
            score -= penalty * 1.5; // Stricter penalty for direct neighbor conflict
            violations.push({
              id: rule.id,
              studentId: rule.studentId,
              ruleId: rule.id,
              type: rule.strictness,
              description: `Darf NICHT neben ${students.find((s) => s.id === rule.targetId)?.name || 'Schüler'} sitzen.`,
              targetStudentId: rule.targetId
            });
          }
          break;

        case 'near':
          if (dist > 2.5) {
            score -= penalty;
            violations.push({
              id: rule.id,
              studentId: rule.studentId,
              ruleId: rule.id,
              type: rule.strictness,
              description: `Sollte nahe bei ${students.find((s) => s.id === rule.targetId)?.name || 'Schüler'} sitzen.`,
              targetStudentId: rule.targetId
            });
          }
          break;

        case 'far':
          if (dist < 4.0) {
            score -= penalty;
            violations.push({
              id: rule.id,
              studentId: rule.studentId,
              ruleId: rule.id,
              type: rule.strictness,
              description: `Sollte weit weg von ${students.find((s) => s.id === rule.targetId)?.name || 'Schüler'} sitzen.`,
              targetStudentId: rule.targetId
            });
          }
          break;
      }
    } else {
      // Positional rules (front, back, edge, near_door, near_board, not_window)
      switch (rule.type) {
        case 'front': {
          const isFront = studentDesk.y <= minY + rowDepth * 0.35;
          if (!isFront) {
            score -= penalty;
            violations.push({
              id: rule.id,
              studentId: rule.studentId,
              ruleId: rule.id,
              type: rule.strictness,
              description: 'Sollte im vorderen Drittel sitzen.',
            });
          }
          break;
        }

        case 'back': {
          const isBack = studentDesk.y >= minY + rowDepth * 0.65;
          if (!isBack) {
            score -= penalty;
            violations.push({
              id: rule.id,
              studentId: rule.studentId,
              ruleId: rule.id,
              type: rule.strictness,
              description: 'Sollte im hinteren Drittel sitzen.',
            });
          }
          break;
        }

        case 'edge': {
          const isEdge =
            studentDesk.x === minX ||
            studentDesk.x === maxX ||
            studentDesk.y === minY ||
            studentDesk.y === maxY;
          if (!isEdge) {
            score -= penalty;
            violations.push({
              id: rule.id,
              studentId: rule.studentId,
              ruleId: rule.id,
              type: rule.strictness,
              description: 'Sollte am Rand sitzen.',
            });
          }
          break;
        }

        case 'near_door': {
          const minDoorDist = doors.length > 0
            ? Math.min(...doors.map((door) => getDistance(studentDesk, door)))
            : 999;
          if (minDoorDist > 3.0) {
            score -= penalty;
            violations.push({
              id: rule.id,
              studentId: rule.studentId,
              ruleId: rule.id,
              type: rule.strictness,
              description: 'Sollte nahe der Tür sitzen.',
            });
          }
          break;
        }

        case 'near_board': {
          const distToBoard = getDistance(studentDesk, board);
          if (distToBoard > 3.5) {
            score -= penalty;
            violations.push({
              id: rule.id,
              studentId: rule.studentId,
              ruleId: rule.id,
              type: rule.strictness,
              description: 'Sollte nahe der Tafel sitzen.',
              targetElementId: board.id
            });
          }
          break;
        }

        case 'not_window': {
          const nearWindow = windows.some((win) => getDistance(studentDesk, win) <= 1.5);
          if (nearWindow) {
            score -= penalty;
            violations.push({
              id: rule.id,
              studentId: rule.studentId,
              ruleId: rule.id,
              type: rule.strictness,
              description: 'Sollte nicht am Fenster sitzen.',
            });
          }
          break;
        }
      }
    }
  });

  return { score, violations };
}

// Simulated Annealing Solver algorithm
export function generateSeatingPlan(
  students: Student[],
  rules: Rule[],
  layout: ClassroomLayout,
  preset: 'balanced' | 'focus' | 'friendship' = 'balanced'
): SeatingProposal {
  const desks = layout.elements.filter((el) => el.type === 'desk');

  if (desks.length < students.length) {
    throw new Error('Nicht genügend Sitzplätze für alle Schüler vorhanden!');
  }

  // 1. Generate an initial random/greedy state
  let currentAssignments: SeatingAssignment = {};
  
  // Clean empty desks representation
  desks.forEach((d) => {
    currentAssignments[d.id] = '';
  });

  // Assign students randomly to desks
  const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
  const shuffledDesks = [...desks].sort(() => Math.random() - 0.5);

  shuffledStudents.forEach((student, index) => {
    currentAssignments[shuffledDesks[index].id] = student.id;
  });

  let currentEval = evaluateSeating(currentAssignments, students, rules, layout, preset);
  let bestAssignments = { ...currentAssignments };
  let bestEval = currentEval;

  // 2. Simulated Annealing Parameters
  let T = 100.0;
  const T_min = 0.1;
  const alpha = 0.985;
  const maxIterationsPerTemp = 200;

  // Annealing Loop
  while (T > T_min) {
    for (let i = 0; i < maxIterationsPerTemp; i++) {
      // Pick neighbor state:
      const nextAssignments = { ...currentAssignments };

      // Swap two random desks (could be occupied or empty)
      const d1Index = Math.floor(Math.random() * desks.length);
      let d2Index = Math.floor(Math.random() * desks.length);
      while (d1Index === d2Index && desks.length > 1) {
        d2Index = Math.floor(Math.random() * desks.length);
      }

      const d1Id = desks[d1Index].id;
      const d2Id = desks[d2Index].id;

      // Swap values
      const temp = nextAssignments[d1Id];
      nextAssignments[d1Id] = nextAssignments[d2Id];
      nextAssignments[d2Id] = temp;

      const nextEval = evaluateSeating(nextAssignments, students, rules, layout, preset);
      const deltaE = nextEval.score - currentEval.score;

      // Acceptance probability
      if (deltaE > 0 || Math.random() < Math.exp(deltaE / T)) {
        currentAssignments = nextAssignments;
        currentEval = nextEval;

        if (currentEval.score > bestEval.score) {
          bestAssignments = { ...currentAssignments };
          bestEval = currentEval;
        }
      }
    }
    T *= alpha; // Cool down
  }

  // Generate automated explanation based on properties and violations
  let presetName = 'Ausgewogener Sitzplan';
  let focusDetail = 'Dieser Plan versucht, alle Regeln optimal auszubalancieren.';
  
  if (preset === 'focus') {
    presetName = 'Fokus- & Ruhe-optimierter Sitzplan';
    focusDetail = 'Dieser Plan trennt Schüler mit Verhaltensbedarfen strikt und platziert ablenkungsgefährdete Kinder abseits von Fenster und Tür.';
  } else if (preset === 'friendship') {
    presetName = 'Freundschafts- & Motivations-Sitzplan';
    focusDetail = 'Dieser Plan priorisiert das Nebeneinandersitzen von Wunschnachbarn, auch wenn dadurch leichte Positionspräferenzen hintenanstehen.';
  }

  const hardViolations = bestEval.violations.filter((v) => v.type === 'hard');
  const softViolations = bestEval.violations.filter((v) => v.type === 'soft');

  let explanation = '';
  if (hardViolations.length === 0 && softViolations.length === 0) {
    explanation = `${presetName}: Perfekter Sitzplan! Alle ${rules.length} definierten Regeln und alle besonderen Anforderungen der Schüler wurden vollständig eingehalten. ${focusDetail}`;
  } else {
    explanation = `${presetName}: Optimierter Sitzplan. `;
    if (hardViolations.length === 0) {
      explanation += `Alle harten Regeln (wie Barrierefreiheit und Sehschwächen) wurden erfolgreich eingehalten. Es gibt lediglich ${softViolations.length} verletzte weiche Wünsche. ${focusDetail}`;
    } else {
      explanation += `Es gab strukturelle Konflikte im Raum (z. B. zu wenig vordere Sitzplätze für alle Sehschwächen oder widersprüchliche Nachbarschaftswünsche). ${hardViolations.length} harte Regeln und ${softViolations.length} weiche Regeln konnten nicht erfüllt werden. ${focusDetail}`;
    }
  }

  return {
    id: `proposal-${preset}-${Date.now()}`,
    name: presetName,
    assignments: bestAssignments,
    score: bestEval.score,
    violations: bestEval.violations,
    explanation
  };
}
