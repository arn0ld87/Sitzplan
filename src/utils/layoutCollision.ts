import type { ClassroomElement, ClassroomLayout } from '../types';

type Box = Pick<ClassroomElement, 'x' | 'y' | 'w' | 'h'>;

function boxesOverlap(a: Box, b: Box): boolean {
  return !(a.x >= b.x + b.w || a.x + a.w <= b.x || a.y >= b.y + b.h || a.y + a.h <= b.y);
}

export function wouldOverlap(
  layout: ClassroomLayout,
  candidate: Box,
  ignoreId?: string
): boolean {
  return layout.elements.some((other) => {
    if (other.id === ignoreId) return false;
    return boxesOverlap(candidate, other);
  });
}

export function findOverlappingIds(layout: ClassroomLayout): Set<string> {
  const colliding = new Set<string>();
  const elements = layout.elements;
  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      if (boxesOverlap(elements[i], elements[j])) {
        colliding.add(elements[i].id);
        colliding.add(elements[j].id);
      }
    }
  }
  return colliding;
}
