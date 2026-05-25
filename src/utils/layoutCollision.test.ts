import { describe, expect, it } from 'vitest';
import type { ClassroomElement, ClassroomLayout } from '../types';
import { findOverlappingIds, wouldOverlap } from './layoutCollision';

function el(
  id: string,
  x: number,
  y: number,
  w = 1,
  h = 1,
  type: ClassroomElement['type'] = 'desk'
): ClassroomElement {
  return { id, type, x, y, w, h, rotation: 0, label: type };
}

function layout(elements: ClassroomElement[]): ClassroomLayout {
  return { width: 10, height: 10, elements };
}

describe('layoutCollision.wouldOverlap', () => {
  it('returns true for identical position', () => {
    const l = layout([el('a', 2, 2)]);
    expect(wouldOverlap(l, { x: 2, y: 2, w: 1, h: 1 })).toBe(true);
  });

  it('returns true for partial overlap of wider element', () => {
    const l = layout([el('a', 2, 2, 2, 1)]); // covers (2,2) and (3,2)
    expect(wouldOverlap(l, { x: 3, y: 2, w: 1, h: 1 })).toBe(true);
  });

  it('returns false for adjacent cells', () => {
    const l = layout([el('a', 2, 2)]);
    expect(wouldOverlap(l, { x: 3, y: 2, w: 1, h: 1 })).toBe(false);
    expect(wouldOverlap(l, { x: 2, y: 3, w: 1, h: 1 })).toBe(false);
  });

  it('ignoreId lets the element move within its own footprint', () => {
    const l = layout([el('a', 2, 2)]);
    expect(wouldOverlap(l, { x: 2, y: 2, w: 1, h: 1 }, 'a')).toBe(false);
  });
});

describe('layoutCollision.findOverlappingIds', () => {
  it('returns empty for a clean layout', () => {
    const l = layout([el('a', 0, 0), el('b', 2, 0), el('c', 0, 2)]);
    expect(findOverlappingIds(l).size).toBe(0);
  });

  it('flags both partners of a 2-way collision', () => {
    const l = layout([el('a', 0, 0), el('b', 0, 0)]);
    const ids = findOverlappingIds(l);
    expect(ids.has('a')).toBe(true);
    expect(ids.has('b')).toBe(true);
    expect(ids.size).toBe(2);
  });

  it('flags all members of a 3-way pile-up', () => {
    const l = layout([el('a', 1, 1, 2, 2), el('b', 2, 2), el('c', 1, 2)]);
    const ids = findOverlappingIds(l);
    expect(ids.size).toBe(3);
  });

  it('does not flag boxes that only share an edge', () => {
    const l = layout([el('a', 0, 0, 2, 1), el('b', 2, 0)]);
    expect(findOverlappingIds(l).size).toBe(0);
  });
});
