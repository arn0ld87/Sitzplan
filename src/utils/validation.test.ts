import { describe, it, expect } from 'vitest';
import { validateImportPayload } from './validation';
import {
  SMALL_CLASS,
  SMALL_LAYOUT
} from '../test/fixtures/class-small';

describe('validateImportPayload', () => {
  it('accepts a valid direct payload', () => {
    const result = validateImportPayload({
      classes: [SMALL_CLASS],
      layout: SMALL_LAYOUT
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.classes).toHaveLength(1);
      expect(result.data.layout.width).toBe(SMALL_LAYOUT.width);
    }
  });

  it('accepts a valid envelope payload { schemaVersion, data }', () => {
    const result = validateImportPayload({
      schemaVersion: 1,
      data: { classes: [SMALL_CLASS], layout: SMALL_LAYOUT }
    });
    expect(result.ok).toBe(true);
  });

  it('rejects empty object and reports missing top-level fields', () => {
    const result = validateImportPayload({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain('classes');
      // layout is validated via validateLayout which reports at 'layout' itself
      expect(paths.some((p) => p === 'layout' || p.startsWith('layout'))).toBe(true);
    }
  });

  it('rejects unrelated foreign JSON', () => {
    const result = validateImportPayload({ foo: 'bar' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('rejects non-object payloads with a "$" root error', () => {
    const result = validateImportPayload('hello' as unknown);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].path).toBe('$');
    }
  });

  it('reports the exact path for a malformed student name', () => {
    const broken = {
      classes: [
        {
          id: 'c1',
          name: 'Test',
          students: [
            { id: 's1', name: 'Anna', specialNeeds: [] },
            { id: 's2', name: 'Ben', specialNeeds: [] },
            { id: 's3', name: 123, specialNeeds: [] }
          ],
          rules: []
        }
      ],
      layout: SMALL_LAYOUT
    };
    const result = validateImportPayload(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain('classes[0].students[2].name');
    }
  });

  it('reports path prefix "data." for envelope-form errors', () => {
    const result = validateImportPayload({
      schemaVersion: 1,
      data: { classes: 'not-an-array', layout: SMALL_LAYOUT }
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.path === 'data.classes')).toBe(true);
    }
  });

  it('rejects envelope with non-object data', () => {
    const result = validateImportPayload({ schemaVersion: 1, data: 'oops' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].path).toBe('data');
    }
  });

  it('rejects unknown rule type', () => {
    const result = validateImportPayload({
      classes: [
        {
          id: 'c1',
          name: 'T',
          students: [],
          rules: [
            {
              id: 'r1',
              studentId: 's1',
              type: 'sit_on_ceiling',
              strictness: 'hard'
            }
          ]
        }
      ],
      layout: SMALL_LAYOUT
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => e.path === 'classes[0].rules[0].type')
      ).toBe(true);
    }
  });
});
