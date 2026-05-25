import type {
  Student,
  Rule,
  ClassroomElement,
  ClassroomLayout,
  SeatingAssignment,
  SeatingViolation,
  SeatingProposal,
  SolverDiagnostics
} from '../types';
import { newId } from './ids';
import { mulberry32, defaultRng, type RNG } from './rng';

/**
 * Number of independent hybrid (greedy + SA) attempts per preset.
 * Best score wins. See ADR 0003.
 *
 * Slice 3 measurement (`generateSeatingProposals` with seed=1):
 *   - CONFLICT fixture (2 students/2 desks):   ~490 ms with 8 restarts
 *   - SMALL fixture (4 students/4 desks):      ~780 ms with 8 restarts
 *   - mockData (24 students/6 rules):        ~8100 ms with 8 restarts
 *
 * ADR 0003 specifies 8, but the mockData run blew the casual-machine budget
 * (>3 s), so we drop to 4. The 2 s/35-student-30-rule budget will be
 * formally enforced in Slice 7; the SA inner-loop cooling schedule is the
 * dominant cost and is left for Slice 4/7 to tune.
 */
const RANDOM_RESTARTS = 4;

type Preset = 'balanced' | 'focus' | 'friendship';
const PRESETS: readonly Preset[] = ['balanced', 'focus', 'friendship'] as const;

// Helper: Calculate distance between two room elements
function getDistance(el1: { x: number; y: number }, el2: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(el1.x - el2.x, 2) + Math.pow(el1.y - el2.y, 2));
}

// Helper: Resolve a student name from an ID with graceful fallback.
function resolveStudentName(students: Student[], studentId: string | undefined): string {
  if (!studentId) return 'Unbekannt';
  const student = students.find((s) => s.id === studentId);
  return student?.name || studentId;
}

// Discriminated union for the violation kinds emitted by evaluateSeating.
// Used as input to formatViolationDescription so the message stays consistent
// per rule (student name + concrete rule wording in German).
type ViolationKind =
  | { kind: 'need-seh' }
  | { kind: 'need-hoer' }
  | { kind: 'need-barr' }
  | { kind: 'need-konz' }
  | { kind: 'need-verh'; otherStudentId: string }
  | { kind: 'beside'; targetStudentId: string }
  | { kind: 'not_beside'; targetStudentId: string }
  | { kind: 'near'; targetStudentId: string; distanceCells: number }
  | { kind: 'far'; targetStudentId: string; distanceCells: number }
  | { kind: 'front'; row: number }
  | { kind: 'back'; row: number }
  | { kind: 'edge' }
  | { kind: 'near_door' }
  | { kind: 'near_board' }
  | { kind: 'not_window' };

function formatViolationDescription(
  students: Student[],
  studentId: string,
  detail: ViolationKind
): string {
  const name = resolveStudentName(students, studentId);

  switch (detail.kind) {
    case 'need-seh':
      return `${name} hat Sehschwäche und benötigt einen Platz in vorderster Reihe nahe der Tafel.`;
    case 'need-hoer':
      return `${name} hat Hörschwäche und sollte vorne oder direkt bei der Tafel sitzen.`;
    case 'need-barr':
      return `${name} braucht einen barrierefreien Platz nahe der Tür oder am Rand.`;
    case 'need-konz':
      return `${name} braucht Konzentration und sollte nicht direkt am Fenster oder an der Tür sitzen.`;
    case 'need-verh': {
      const other = resolveStudentName(students, detail.otherStudentId);
      return `${name} und ${other} sitzen nebeneinander, obwohl beide erhöhten Verhaltenbedarf haben.`;
    }
    case 'beside': {
      const target = resolveStudentName(students, detail.targetStudentId);
      return `${name} soll neben ${target} sitzen, ist aber nicht direkt daneben platziert.`;
    }
    case 'not_beside': {
      const target = resolveStudentName(students, detail.targetStudentId);
      return `${name} und ${target} sitzen nebeneinander, obwohl die Regel das verbietet.`;
    }
    case 'near': {
      const target = resolveStudentName(students, detail.targetStudentId);
      const rounded = Math.round(detail.distanceCells * 10) / 10;
      return `${name} soll nahe bei ${target} sitzen, ist aber ${rounded} Felder entfernt.`;
    }
    case 'far': {
      const target = resolveStudentName(students, detail.targetStudentId);
      const rounded = Math.round(detail.distanceCells * 10) / 10;
      return `${name} soll weit weg von ${target} sitzen, ist aber nur ${rounded} Felder entfernt.`;
    }
    case 'front':
      return `${name} soll im vorderen Drittel sitzen, sitzt aber in Reihe ${detail.row}.`;
    case 'back':
      return `${name} soll im hinteren Drittel sitzen, sitzt aber in Reihe ${detail.row}.`;
    case 'edge':
      return `${name} soll am Rand sitzen, ist aber in der Mitte platziert.`;
    case 'near_door':
      return `${name} soll nahe der Tür sitzen, ist aber zu weit entfernt.`;
    case 'near_board':
      return `${name} soll nahe der Tafel sitzen, ist aber zu weit entfernt.`;
    case 'not_window':
      return `${name} soll nicht am Fenster sitzen, ist aber direkt daneben platziert.`;
  }
}

function presetGoalLine(preset: 'balanced' | 'focus' | 'friendship'): string {
  switch (preset) {
    case 'focus':
      return 'Ziel: Fokus- und Ruhe-optimiertes Layout mit strenger Trennung verhaltensauffälliger Schüler:innen.';
    case 'friendship':
      return 'Ziel: Freundschafts- und Motivations-Layout — Wunschnachbarn sitzen wenn möglich nebeneinander.';
    case 'balanced':
    default:
      return 'Ziel: Ausgewogenes Layout, das alle harten Regeln und möglichst viele weiche Wünsche erfüllt.';
  }
}

function buildExplanation(
  preset: 'balanced' | 'focus' | 'friendship',
  evaluation: { score: number; violations: SeatingViolation[] },
  assignments: SeatingAssignment,
  students: Student[],
  totalSoftRules: number
): string {
  const goal = presetGoalLine(preset);

  const placedCount = Object.values(assignments).filter((id) => id !== '').length;
  const hardCount = evaluation.violations.filter((v) => v.type === 'hard').length;
  const softViolatedCount = evaluation.violations.filter((v) => v.type === 'soft').length;
  const softFulfilledCount = Math.max(totalSoftRules - softViolatedCount, 0);

  const studentLabel = students.length === 1 ? 'Schüler:in' : 'Schüler:innen';
  const achieved =
    `Erreicht: ${placedCount} von ${students.length} ${studentLabel} platziert, ` +
    `${hardCount} harte Konflikt${hardCount === 1 ? '' : 'e'}, ` +
    `${softFulfilledCount} von ${totalSoftRules} weichen Wünsche${totalSoftRules === 1 ? '' : 'n'} erfüllt.`;

  let open: string;
  if (hardCount === 0 && softViolatedCount === 0) {
    open = 'Offen: keine relevanten Wünsche unerfüllt.';
  } else {
    const parts: string[] = [];
    if (hardCount > 0) {
      parts.push(`${hardCount} harte Regel${hardCount === 1 ? '' : 'n'} verletzt`);
    }
    if (softViolatedCount > 0) {
      parts.push(`${softViolatedCount} weiche Wünsche unerfüllt`);
    }
    open = `Offen: ${parts.join(', ')}.`;
  }

  return `${goal}\n${achieved}\n${open}`;
}

// Helper: Determine if two desks are adjacent (sharing a border or corner)
function isAdjacent(d1: ClassroomElement, d2: ClassroomElement): boolean {
  return Math.abs(d1.x - d2.x) <= 1.5 && Math.abs(d1.y - d2.y) <= 1.5 && d1.id !== d2.id;
}

function countAvailableFrontSeats(desks: ClassroomElement[]): number {
  if (desks.length === 0) return 0;
  const minY = Math.min(...desks.map((desk) => desk.y));
  const maxY = Math.max(...desks.map((desk) => desk.y));
  const rowDepth = maxY - minY || 1;
  return desks.filter((desk) => desk.y <= minY + rowDepth * 0.35).length;
}

function countAvailableDoorAccessSeats(desks: ClassroomElement[], doors: ClassroomElement[]): number {
  if (desks.length === 0) return 0;
  const minX = Math.min(...desks.map((desk) => desk.x));
  const maxX = Math.max(...desks.map((desk) => desk.x));

  return desks.filter((desk) => {
    const minDoorDist = doors.length > 0
      ? Math.min(...doors.map((door) => getDistance(desk, door)))
      : 999;
    return minDoorDist <= 2.5 || desk.x === minX || desk.x === maxX;
  }).length;
}

function countAvailableWindowSafeSeats(desks: ClassroomElement[], windows: ClassroomElement[]): number {
  if (desks.length === 0) return 0;
  if (windows.length === 0) return desks.length;
  return desks.filter((desk) => !windows.some((win) => getDistance(desk, win) <= 1.8)).length;
}

function findContradictoryRules(rules: Rule[]): SolverDiagnostics['contradictoryRules'] {
  const contradictoryRules: SolverDiagnostics['contradictoryRules'] = [];
  const hardRules = rules.filter((rule) => rule.strictness === 'hard');
  const relationRulesByPair = new Map<string, Rule[]>();
  const positionRulesByStudent = new Map<string, Rule[]>();

  hardRules.forEach((rule) => {
    if (rule.targetId) {
      const pairKey = [rule.studentId, rule.targetId].sort().join('|');
      relationRulesByPair.set(pairKey, [...(relationRulesByPair.get(pairKey) ?? []), rule]);
    } else {
      positionRulesByStudent.set(rule.studentId, [
        ...(positionRulesByStudent.get(rule.studentId) ?? []),
        rule
      ]);
    }
  });

  relationRulesByPair.forEach((pairRules) => {
    const hasBeside = pairRules.some((rule) => rule.type === 'beside');
    const hasNotBeside = pairRules.some((rule) => rule.type === 'not_beside');
    const hasNear = pairRules.some((rule) => rule.type === 'near');
    const hasFar = pairRules.some((rule) => rule.type === 'far');

    if (hasBeside && hasNotBeside) {
      contradictoryRules.push({
        ruleIds: pairRules
          .filter((rule) => rule.type === 'beside' || rule.type === 'not_beside')
          .map((rule) => rule.id),
        reason: 'Dieselbe Schülerkombination soll gleichzeitig nebeneinander und nicht nebeneinander sitzen.'
      });
    }

    if (hasNear && hasFar) {
      contradictoryRules.push({
        ruleIds: pairRules
          .filter((rule) => rule.type === 'near' || rule.type === 'far')
          .map((rule) => rule.id),
        reason: 'Dieselbe Schülerkombination soll gleichzeitig nah beieinander und weit voneinander entfernt sitzen.'
      });
    }
  });

  positionRulesByStudent.forEach((studentRules) => {
    const frontBackRules = studentRules.filter((rule) => rule.type === 'front' || rule.type === 'back');
    if (
      frontBackRules.some((rule) => rule.type === 'front') &&
      frontBackRules.some((rule) => rule.type === 'back')
    ) {
      contradictoryRules.push({
        ruleIds: frontBackRules.map((rule) => rule.id),
        reason: 'Ein Schüler soll gleichzeitig vorne und hinten sitzen.'
      });
    }
  });

  return contradictoryRules;
}

export function analyzeSeatingDiagnostics(
  assignments: SeatingAssignment,
  students: Student[],
  rules: Rule[],
  layout: ClassroomLayout,
  violations: SeatingViolation[] = []
): SolverDiagnostics {
  const desks = layout.elements.filter((el) => el.type === 'desk');
  const doors = layout.elements.filter((el) => el.type === 'door');
  const windows = layout.elements.filter((el) => el.type === 'window');
  const assignedStudentIds = new Set(Object.values(assignments).filter(Boolean));

  const unplacedStudents = students
    .filter((student) => !assignedStudentIds.has(student.id))
    .map((student) => student.id);

  const frontRequired = new Set<string>();
  const doorRequired = new Set<string>();
  const windowSafeRequired = new Set<string>();

  students.forEach((student) => {
    if (student.specialNeeds.includes('Sehschwäche') || student.specialNeeds.includes('Hörschwäche')) {
      frontRequired.add(student.id);
    }
    if (student.specialNeeds.includes('Barrierefreiheit')) {
      doorRequired.add(student.id);
    }
    if (student.specialNeeds.includes('Konzentrationsbedarf')) {
      windowSafeRequired.add(student.id);
    }
  });

  rules
    .filter((rule) => rule.strictness === 'hard')
    .forEach((rule) => {
      if (rule.type === 'front' || rule.type === 'near_board') {
        frontRequired.add(rule.studentId);
      }
      if (rule.type === 'near_door') {
        doorRequired.add(rule.studentId);
      }
      if (rule.type === 'not_window') {
        windowSafeRequired.add(rule.studentId);
      }
    });

  const bottlenecks: SolverDiagnostics['bottlenecks'] = [];
  const frontAvailable = countAvailableFrontSeats(desks);
  const doorAvailable = countAvailableDoorAccessSeats(desks, doors);
  const windowSafeAvailable = countAvailableWindowSafeSeats(desks, windows);

  if (frontRequired.size > frontAvailable) {
    bottlenecks.push({ kind: 'frontRow', required: frontRequired.size, available: frontAvailable });
  }
  if (doorRequired.size > doorAvailable) {
    bottlenecks.push({ kind: 'doorAccess', required: doorRequired.size, available: doorAvailable });
  }
  if (windowSafeRequired.size > windowSafeAvailable) {
    bottlenecks.push({ kind: 'window', required: windowSafeRequired.size, available: windowSafeAvailable });
  }

  const hardViolations = violations.filter((violation) => violation.type === 'hard');

  const noteParts: string[] = [];
  if (bottlenecks.length > 0) {
    const bottleneckLabels: Record<SolverDiagnostics['bottlenecks'][number]['kind'], string> = {
      frontRow: 'vordere Plätze',
      doorAccess: 'türnahe Plätze',
      window: 'fensterarme Plätze'
    };
    const summary = bottlenecks
      .map((b) => `${bottleneckLabels[b.kind]} (${b.required} benötigt / ${b.available} verfügbar)`)
      .join(', ');
    noteParts.push(`Strukturelle Engpässe: ${summary}.`);
  }
  if (hardViolations.length > 0) {
    noteParts.push(
      `Es bleiben ${hardViolations.length} harte Konflikt(e): ${hardViolations
        .slice(0, 3)
        .map((violation) => violation.description)
        .join(' ')}`
    );
  }

  return {
    unplacedStudents,
    bottlenecks,
    contradictoryRules: findContradictoryRules(rules),
    ...(noteParts.length > 0 ? { note: noteParts.join(' ') } : {})
  };
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
          description: formatViolationDescription(students, student.id, { kind: 'need-seh' }),
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
          description: formatViolationDescription(students, student.id, { kind: 'need-hoer' }),
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
          description: formatViolationDescription(students, student.id, { kind: 'need-barr' }),
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
          description: formatViolationDescription(students, student.id, { kind: 'need-konz' }),
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
                description: formatViolationDescription(students, student.id, {
                  kind: 'need-verh',
                  otherStudentId: otherStudent.id
                }),
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
              description: formatViolationDescription(students, rule.studentId, {
                kind: 'beside',
                targetStudentId: rule.targetId
              }),
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
              description: formatViolationDescription(students, rule.studentId, {
                kind: 'not_beside',
                targetStudentId: rule.targetId
              }),
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
              description: formatViolationDescription(students, rule.studentId, {
                kind: 'near',
                targetStudentId: rule.targetId,
                distanceCells: dist
              }),
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
              description: formatViolationDescription(students, rule.studentId, {
                kind: 'far',
                targetStudentId: rule.targetId,
                distanceCells: dist
              }),
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
              description: formatViolationDescription(students, rule.studentId, {
                kind: 'front',
                row: Math.round(studentDesk.y - minY) + 1
              }),
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
              description: formatViolationDescription(students, rule.studentId, {
                kind: 'back',
                row: Math.round(studentDesk.y - minY) + 1
              }),
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
              description: formatViolationDescription(students, rule.studentId, { kind: 'edge' }),
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
              description: formatViolationDescription(students, rule.studentId, { kind: 'near_door' }),
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
              description: formatViolationDescription(students, rule.studentId, { kind: 'near_board' }),
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
              description: formatViolationDescription(students, rule.studentId, { kind: 'not_window' }),
            });
          }
          break;
        }
      }
    }
  });

  return { score, violations };
}

/**
 * Greedy initial assignment: places students one-by-one in difficulty order
 * onto the locally best-scoring still-free desk. Ties broken by `rng()`.
 *
 * Hard position rules (front/near_board/near_door/not_window) are not a
 * separate phase — they are baked into the per-desk score and so bias the
 * placement automatically. The difficulty heuristic is currently a stub
 * (`hardRuleCount*10 + softRuleCount*3`); the real one lands in Slice 4.
 */
export function greedyInitialAssignment(
  students: Student[],
  desks: ClassroomElement[],
  rules: Rule[],
  layout: ClassroomLayout,
  rng: RNG
): SeatingAssignment {
  // SLICE 4: replace with computeStudentDifficulty()
  const difficulty = new Map<string, number>();
  students.forEach((student) => {
    let hardRuleCount = 0;
    let softRuleCount = 0;
    rules.forEach((rule) => {
      if (rule.studentId === student.id || rule.targetId === student.id) {
        if (rule.strictness === 'hard') hardRuleCount++;
        else softRuleCount++;
      }
    });
    difficulty.set(student.id, hardRuleCount * 10 + softRuleCount * 3);
  });

  const sortedStudents = [...students].sort((a, b) => {
    const diff = (difficulty.get(b.id) ?? 0) - (difficulty.get(a.id) ?? 0);
    if (diff !== 0) return diff;
    // Stable-ish tiebreak with rng so restarts diverge.
    return rng() - 0.5;
  });

  const assignments: SeatingAssignment = {};
  desks.forEach((d) => {
    assignments[d.id] = '';
  });

  const freeDeskIds = new Set(desks.map((d) => d.id));

  for (const student of sortedStudents) {
    if (freeDeskIds.size === 0) break;

    // Score every still-free desk by placing the student there tentatively.
    let bestScore = -Infinity;
    let bestDeskIds: string[] = [];

    for (const deskId of freeDeskIds) {
      assignments[deskId] = student.id;
      const { score } = evaluateSeating(assignments, students, rules, layout, 'balanced');
      assignments[deskId] = '';

      if (score > bestScore) {
        bestScore = score;
        bestDeskIds = [deskId];
      } else if (score === bestScore) {
        bestDeskIds.push(deskId);
      }
    }

    // Break ties with rng so restarts visit different greedy paths.
    const chosen = bestDeskIds[Math.floor(rng() * bestDeskIds.length)];
    assignments[chosen] = student.id;
    freeDeskIds.delete(chosen);
  }

  return assignments;
}

/**
 * Simulated Annealing on a given initial assignment. All randomness routes
 * through the injected `rng` so behaviour is deterministic when a seeded
 * RNG is supplied.
 */
export function simulatedAnnealing(
  initialAssignment: SeatingAssignment,
  students: Student[],
  rules: Rule[],
  layout: ClassroomLayout,
  rng: RNG,
  preset: Preset
): { assignments: SeatingAssignment; score: number; violations: SeatingViolation[] } {
  const desks = layout.elements.filter((el) => el.type === 'desk');

  let currentAssignments: SeatingAssignment = { ...initialAssignment };
  let currentEval = evaluateSeating(currentAssignments, students, rules, layout, preset);
  let bestAssignments = { ...currentAssignments };
  let bestEval = currentEval;

  let T = 100.0;
  const T_min = 0.1;
  const alpha = 0.985;
  const maxIterationsPerTemp = 200;

  while (T > T_min) {
    for (let i = 0; i < maxIterationsPerTemp; i++) {
      const nextAssignments = { ...currentAssignments };

      const d1Index = Math.floor(rng() * desks.length);
      let d2Index = Math.floor(rng() * desks.length);
      while (d1Index === d2Index && desks.length > 1) {
        d2Index = Math.floor(rng() * desks.length);
      }

      const d1Id = desks[d1Index].id;
      const d2Id = desks[d2Index].id;

      const temp = nextAssignments[d1Id];
      nextAssignments[d1Id] = nextAssignments[d2Id];
      nextAssignments[d2Id] = temp;

      const nextEval = evaluateSeating(nextAssignments, students, rules, layout, preset);
      const deltaE = nextEval.score - currentEval.score;

      if (deltaE > 0 || rng() < Math.exp(deltaE / T)) {
        currentAssignments = nextAssignments;
        currentEval = nextEval;

        if (currentEval.score > bestEval.score) {
          bestAssignments = { ...currentAssignments };
          bestEval = currentEval;
        }
      }
    }
    T *= alpha;
  }

  return {
    assignments: bestAssignments,
    score: bestEval.score,
    violations: bestEval.violations
  };
}

function buildProposal(
  preset: Preset,
  assignments: SeatingAssignment,
  score: number,
  violations: SeatingViolation[],
  students: Student[],
  rules: Rule[],
  layout: ClassroomLayout
): SeatingProposal {
  let presetName = 'Ausgewogener Sitzplan';
  if (preset === 'focus') {
    presetName = 'Fokus- & Ruhe-optimierter Sitzplan';
  } else if (preset === 'friendship') {
    presetName = 'Freundschafts- & Motivations-Sitzplan';
  }

  const hardViolations = violations.filter((v) => v.type === 'hard');
  const totalSoftRules = rules.filter((r) => r.strictness === 'soft').length;
  const explanation = buildExplanation(
    preset,
    { score, violations },
    assignments,
    students,
    totalSoftRules
  );

  return {
    id: newId(`proposal-${preset}`),
    name: presetName,
    assignments,
    score,
    violations,
    explanation,
    valid: hardViolations.length === 0,
    diagnostics: analyzeSeatingDiagnostics(assignments, students, rules, layout, violations)
  };
}

function runHybridPass(
  students: Student[],
  rules: Rule[],
  layout: ClassroomLayout,
  preset: Preset,
  rng: RNG
): { assignments: SeatingAssignment; score: number; violations: SeatingViolation[] } {
  const desks = layout.elements.filter((el) => el.type === 'desk');
  const initial = greedyInitialAssignment(students, desks, rules, layout, rng);
  return simulatedAnnealing(initial, students, rules, layout, rng, preset);
}

/**
 * Backward-compatible single-pass solver: one greedy init + one SA run for
 * the given preset. Used by the Generator UI today. The new restart-driven
 * API is `generateSeatingProposals` below.
 */
export function generateSeatingPlan(
  students: Student[],
  rules: Rule[],
  layout: ClassroomLayout,
  preset: Preset = 'balanced'
): SeatingProposal {
  const desks = layout.elements.filter((el) => el.type === 'desk');

  if (desks.length < students.length) {
    throw new Error('Nicht genügend Sitzplätze für alle Schüler vorhanden!');
  }

  const rng = defaultRng();
  const result = runHybridPass(students, rules, layout, preset, rng);
  return buildProposal(preset, result.assignments, result.score, result.violations, students, rules, layout);
}

/**
 * New solver entry point: runs `RANDOM_RESTARTS` independent greedy+SA
 * passes per preset and keeps the best score per preset. Slice 6 will use
 * the full restart pool for Top-3 dedup.
 *
 * When `opts.seed` is provided every random choice routes through a
 * deterministic mulberry32 derived from it (see ADR 0005); two calls with
 * the same seed return identical assignments. Without a seed the solver
 * falls back to `Math.random` (production default).
 */
export function generateSeatingProposals(
  students: Student[],
  rules: Rule[],
  layout: ClassroomLayout,
  opts?: { seed?: number }
): SeatingProposal[] {
  const desks = layout.elements.filter((el) => el.type === 'desk');

  if (desks.length < students.length) {
    throw new Error('Nicht genügend Sitzplätze für alle Schüler vorhanden!');
  }

  const masterRng: RNG = opts?.seed !== undefined ? mulberry32(opts.seed) : defaultRng();

  return PRESETS.map((preset) => {
    let best: { assignments: SeatingAssignment; score: number; violations: SeatingViolation[] } | null = null;

    for (let r = 0; r < RANDOM_RESTARTS; r++) {
      // Derive a fresh per-restart seed from the master rng so restarts
      // diverge but the whole run stays deterministic for a given seed.
      const restartSeed = Math.floor(masterRng() * 0xffffffff);
      const restartRng = mulberry32(restartSeed);
      const result = runHybridPass(students, rules, layout, preset, restartRng);
      if (!best || result.score > best.score) {
        best = result;
      }
    }

    // best is guaranteed non-null because RANDOM_RESTARTS >= 1.
    const winner = best as { assignments: SeatingAssignment; score: number; violations: SeatingViolation[] };
    return buildProposal(preset, winner.assignments, winner.score, winner.violations, students, rules, layout);
  });
}
