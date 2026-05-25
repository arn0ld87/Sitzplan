import { describe, expect, it } from 'vitest';
import type { ClassroomElement, ClassroomLayout } from '../types';
import { countDesks, isOverCapacity } from './layoutCapacity';

function makeElement(type: ClassroomElement['type'], i: number): ClassroomElement {
  return {
    id: `el-${i}`,
    type,
    x: i,
    y: 0,
    w: 1,
    h: 1,
    rotation: 0,
    label: type
  };
}

function makeLayout(elements: ClassroomElement[]): ClassroomLayout {
  return {
    width: 10,
    height: 6,
    elements
  };
}

describe('layoutCapacity', () => {
  it('countDesks counts only desk elements', () => {
    const layout = makeLayout([
      makeElement('desk', 0),
      makeElement('desk', 1),
      makeElement('board', 2),
      makeElement('door', 3),
      makeElement('desk', 4)
    ]);
    expect(countDesks(layout)).toBe(3);
  });

  it('countDesks returns 0 for empty layout', () => {
    expect(countDesks(makeLayout([]))).toBe(0);
  });

  it('isOverCapacity true when more students than desks', () => {
    const layout = makeLayout([makeElement('desk', 0), makeElement('desk', 1)]);
    expect(isOverCapacity(layout, 3)).toBe(true);
  });

  it('isOverCapacity false when seats match exactly', () => {
    const layout = makeLayout([makeElement('desk', 0), makeElement('desk', 1)]);
    expect(isOverCapacity(layout, 2)).toBe(false);
  });

  it('isOverCapacity false with spare seats', () => {
    const layout = makeLayout([makeElement('desk', 0), makeElement('desk', 1), makeElement('desk', 2)]);
    expect(isOverCapacity(layout, 1)).toBe(false);
  });
});
