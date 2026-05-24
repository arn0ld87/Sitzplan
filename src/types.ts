export type SpecialNeed =
  | 'Sehschwäche'
  | 'Hörschwäche'
  | 'Konzentrationsbedarf'
  | 'Verhalten'
  | 'Barrierefreiheit';

export interface Student {
  id: string;
  name: string;
  specialNeeds: SpecialNeed[];
}

export type RuleType =
  | 'beside'       // darf neben X sitzen
  | 'not_beside'   // darf nicht neben X sitzen
  | 'near'         // soll nahe bei X sitzen
  | 'far'          // soll weit weg von X sitzen
  | 'front'        // soll vorne sitzen
  | 'back'         // soll hinten sitzen
  | 'edge'         // soll am Rand sitzen
  | 'near_door'    // soll nahe der Tür sitzen
  | 'near_board'   // soll nahe der Tafel sitzen
  | 'not_window';  // soll nicht am Fenster sitzen

export interface Rule {
  id: string;
  studentId: string;
  type: RuleType;
  targetId?: string; // ID of the other student, if applicable
  strictness: 'hard' | 'soft';
}

export type ElementType =
  | 'desk'      // Schülerpult (seat)
  | 'board'     // Tafel (Tafel)
  | 'window'    // Fenster
  | 'door'      // Tür
  | 'cupboard'  // Schrank / Regal
  | 'furniture' // Anderes Möbelstück (Lehrerpult etc.)

export interface ClassroomElement {
  id: string;
  type: ElementType;
  x: number; // grid X position
  y: number; // grid Y position
  w: number; // width in grid cells
  h: number; // height in grid cells
  rotation: 0 | 90 | 180 | 270;
  label?: string; // Optional label (e.g. "Lehrerpult", "Pult 1")
}

export interface ClassroomLayout {
  width: number; // e.g. 12 cells
  height: number; // e.g. 10 cells
  elements: ClassroomElement[];
}

export interface SeatingAssignment {
  [deskId: string]: string; // deskElementId -> studentId (empty desk if not assigned)
}

export interface SeatingViolation {
  id: string;
  studentId: string;
  ruleId?: string;
  type: 'hard' | 'soft';
  description: string;
  targetStudentId?: string;
  targetElementId?: string;
}

export interface SeatingProposal {
  id: string;
  name: string; // e.g. "Vorschlag A: Ausgewogen"
  assignments: SeatingAssignment;
  score: number;
  violations: SeatingViolation[];
  explanation: string;
}

export interface SchoolClass {
  id: string;
  name: string; // e.g. "Klasse 8b"
  students: Student[];
  rules: Rule[];
}
