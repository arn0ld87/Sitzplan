import type { ClassroomLayout } from '../types';

export function countDesks(layout: ClassroomLayout): number {
  return layout.elements.reduce((n, el) => (el.type === 'desk' ? n + 1 : n), 0);
}

export function isOverCapacity(layout: ClassroomLayout, studentCount: number): boolean {
  return studentCount > countDesks(layout);
}
