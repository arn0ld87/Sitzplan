import type { Student, Rule, ClassroomLayout, SchoolClass } from '../types';

export const MOCK_STUDENTS: Student[] = [
  { id: 's1', name: 'Jonas Müller', specialNeeds: ['Verhalten'] }, // chatterbox
  { id: 's2', name: 'Robin Schmidt', specialNeeds: ['Verhalten'] }, // chatterbox 2 (must separate from Jonas)
  { id: 's3', name: 'Marie Fischer', specialNeeds: ['Sehschwäche'] }, // must sit in front
  { id: 's4', name: 'Lars Weber', specialNeeds: ['Hörschwäche'] }, // must sit in front / center
  { id: 's5', name: 'Mia Wagner', specialNeeds: ['Konzentrationsbedarf'] }, // away from window & door
  { id: 's6', name: 'Felix Becker', specialNeeds: ['Barrierefreiheit'] }, // wheelchair - near door/edge
  { id: 's7', name: 'Anna Schneider', specialNeeds: [] },
  { id: 's8', name: 'Ben Hoffmann', specialNeeds: [] },
  { id: 's9', name: 'David Bauer', specialNeeds: [] },
  { id: 's10', name: 'Elias Richter', specialNeeds: [] },
  { id: 's11', name: 'Emily Wolf', specialNeeds: [] },
  { id: 's12', name: 'Hannah Schulz', specialNeeds: [] },
  { id: 's13', name: 'Jacob Krause', specialNeeds: [] },
  { id: 's14', name: 'Julia Meier', specialNeeds: [] },
  { id: 's15', name: 'Laura Köhler', specialNeeds: [] },
  { id: 's16', name: 'Lea Frank', specialNeeds: [] },
  { id: 's17', name: 'Leon Kaiser', specialNeeds: [] },
  { id: 's18', name: 'Lina Berger', specialNeeds: [] },
  { id: 's19', name: 'Lukas Arnold', specialNeeds: [] },
  { id: 's20', name: 'Noah Graf', specialNeeds: [] },
  { id: 's21', name: 'Paul Haas', specialNeeds: [] },
  { id: 's22', name: 'Sarah Peters', specialNeeds: [] },
  { id: 's23', name: 'Sophia Lenz', specialNeeds: [] },
  { id: 's24', name: 'Tim Keller', specialNeeds: [] }
];

export const MOCK_RULES: Rule[] = [
  // Hard rule: Separate chatterboxes Jonas and Robin
  {
    id: 'r1',
    studentId: 's1',
    type: 'not_beside',
    targetId: 's2',
    strictness: 'hard'
  },
  // Soft rule: Jacob and David are best friends and want to sit together
  {
    id: 'r2',
    studentId: 's13',
    type: 'beside',
    targetId: 's9',
    strictness: 'soft'
  },
  // Soft rule: Sarah and Emily are best friends and want to sit together
  {
    id: 'r3',
    studentId: 's22',
    type: 'beside',
    targetId: 's11',
    strictness: 'soft'
  },
  // Soft rule: Tim wants to sit in the back rows
  {
    id: 'r4',
    studentId: 's24',
    type: 'back',
    strictness: 'soft'
  },
  // Soft rule: Paul should sit near the board
  {
    id: 'r5',
    studentId: 's21',
    type: 'near_board',
    strictness: 'soft'
  },
  // Soft rule: Lukas and Julia don't get along and should sit far from each other
  {
    id: 'r6',
    studentId: 's19',
    type: 'far',
    targetId: 's14',
    strictness: 'soft'
  }
];

export const MOCK_CLASSROOM_LAYOUT: ClassroomLayout = {
  width: 12,
  height: 10,
  elements: [
    // Teacher's board (Tafel) at the front wall
    { id: 'board-1', type: 'board', x: 4, y: 0, w: 4, h: 1, rotation: 0, label: 'Tafel' },
    
    // Windows on the left wall
    { id: 'window-1', type: 'window', x: 0, y: 2, w: 1, h: 2, rotation: 90, label: 'Fenster' },
    { id: 'window-2', type: 'window', x: 0, y: 6, w: 1, h: 2, rotation: 90, label: 'Fenster' },
    
    // Door on the bottom right wall
    { id: 'door-1', type: 'door', x: 11, y: 8, w: 1, h: 1, rotation: 0, label: 'Tür' },
    
    // Cupboards at the back wall
    { id: 'cupboard-1', type: 'cupboard', x: 1, y: 9, w: 2, h: 1, rotation: 0, label: 'Regal' },
    { id: 'cupboard-2', type: 'cupboard', x: 9, y: 9, w: 2, h: 1, rotation: 0, label: 'Schrank' },
    
    // Teacher's desk (Lehrerpult) at the front
    { id: 'pult-lehrer', type: 'furniture', x: 5, y: 2, w: 2, h: 1, rotation: 180, label: 'Lehrerpult' },
    
    // Desks (Pulte) - column Left (X=2, 3)
    { id: 'desk-l1a', type: 'desk', x: 2, y: 4, w: 1, h: 1, rotation: 0, label: 'Pult L1' },
    { id: 'desk-l1b', type: 'desk', x: 3, y: 4, w: 1, h: 1, rotation: 0, label: 'Pult L2' },
    { id: 'desk-l2a', type: 'desk', x: 2, y: 5, w: 1, h: 1, rotation: 0, label: 'Pult L3' },
    { id: 'desk-l2b', type: 'desk', x: 3, y: 5, w: 1, h: 1, rotation: 0, label: 'Pult L4' },
    { id: 'desk-l3a', type: 'desk', x: 2, y: 6, w: 1, h: 1, rotation: 0, label: 'Pult L5' },
    { id: 'desk-l3b', type: 'desk', x: 3, y: 6, w: 1, h: 1, rotation: 0, label: 'Pult L6' },
    { id: 'desk-l4a', type: 'desk', x: 2, y: 7, w: 1, h: 1, rotation: 0, label: 'Pult L7' },
    { id: 'desk-l4b', type: 'desk', x: 3, y: 7, w: 1, h: 1, rotation: 0, label: 'Pult L8' },
    { id: 'desk-l5a', type: 'desk', x: 2, y: 8, w: 1, h: 1, rotation: 0, label: 'Pult L9' },
    { id: 'desk-l5b', type: 'desk', x: 3, y: 8, w: 1, h: 1, rotation: 0, label: 'Pult L10' },

    // Desks - column Center (X=5, 6)
    { id: 'desk-c1a', type: 'desk', x: 5, y: 4, w: 1, h: 1, rotation: 0, label: 'Pult C1' },
    { id: 'desk-c1b', type: 'desk', x: 6, y: 4, w: 1, h: 1, rotation: 0, label: 'Pult C2' },
    { id: 'desk-c2a', type: 'desk', x: 5, y: 5, w: 1, h: 1, rotation: 0, label: 'Pult C3' },
    { id: 'desk-c2b', type: 'desk', x: 6, y: 5, w: 1, h: 1, rotation: 0, label: 'Pult C4' },
    { id: 'desk-c3a', type: 'desk', x: 5, y: 6, w: 1, h: 1, rotation: 0, label: 'Pult C5' },
    { id: 'desk-c3b', type: 'desk', x: 6, y: 6, w: 1, h: 1, rotation: 0, label: 'Pult C6' },
    { id: 'desk-c4a', type: 'desk', x: 5, y: 7, w: 1, h: 1, rotation: 0, label: 'Pult C7' },
    { id: 'desk-c4b', type: 'desk', x: 6, y: 7, w: 1, h: 1, rotation: 0, label: 'Pult C8' },
    { id: 'desk-c5a', type: 'desk', x: 5, y: 8, w: 1, h: 1, rotation: 0, label: 'Pult C9' },
    { id: 'desk-c5b', type: 'desk', x: 6, y: 8, w: 1, h: 1, rotation: 0, label: 'Pult C10' },

    // Desks - column Right (X=8, 9)
    { id: 'desk-r1a', type: 'desk', x: 8, y: 4, w: 1, h: 1, rotation: 0, label: 'Pult R1' },
    { id: 'desk-r1b', type: 'desk', x: 9, y: 4, w: 1, h: 1, rotation: 0, label: 'Pult R2' },
    { id: 'desk-r2a', type: 'desk', x: 8, y: 5, w: 1, h: 1, rotation: 0, label: 'Pult R3' },
    { id: 'desk-r2b', type: 'desk', x: 9, y: 5, w: 1, h: 1, rotation: 0, label: 'Pult R4' },
    { id: 'desk-r3a', type: 'desk', x: 8, y: 6, w: 1, h: 1, rotation: 0, label: 'Pult R5' },
    { id: 'desk-r3b', type: 'desk', x: 9, y: 6, w: 1, h: 1, rotation: 0, label: 'Pult R6' },
    { id: 'desk-r4a', type: 'desk', x: 8, y: 7, w: 1, h: 1, rotation: 0, label: 'Pult R7' },
    { id: 'desk-r4b', type: 'desk', x: 9, y: 7, w: 1, h: 1, rotation: 0, label: 'Pult R8' },
    { id: 'desk-r5a', type: 'desk', x: 8, y: 8, w: 1, h: 1, rotation: 0, label: 'Pult R9' },
    { id: 'desk-r5b', type: 'desk', x: 9, y: 8, w: 1, h: 1, rotation: 0, label: 'Pult R10' }
  ]
};

export const MOCK_CLASS: SchoolClass = {
  id: 'class-8b',
  name: 'Klasse 8b',
  students: MOCK_STUDENTS,
  rules: MOCK_RULES
};
