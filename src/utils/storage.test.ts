import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  loadClasses,
  saveClasses,
  loadLayout,
  saveLayout,
  STORAGE_KEYS,
  CURRENT_SCHEMA_VERSION,
  parseEnvelope
} from './storage';
import type { SchoolClass, ClassroomLayout } from '../types';

const VALID_CLASS: SchoolClass = {
  id: 'class-1',
  name: 'Test',
  students: [{ id: 's1', name: 'Anna', specialNeeds: [] }],
  rules: []
};

const VALID_LAYOUT: ClassroomLayout = {
  width: 8,
  height: 8,
  elements: []
};

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('loadClasses', () => {
    it('returns empty array with status=empty for empty storage', () => {
      const r = loadClasses();
      expect(r.data).toEqual([]);
      expect(r.status).toBe('empty');
    });

    it('returns data with status=ok from a valid v1 envelope', () => {
      localStorage.setItem(
        STORAGE_KEYS.classes,
        JSON.stringify({ schemaVersion: 1, data: [VALID_CLASS] })
      );
      const r = loadClasses();
      expect(r.status).toBe('ok');
      expect(r.data).toHaveLength(1);
      expect(r.data[0].id).toBe('class-1');
    });

    it('accepts legacy v0 bare-array payload (migration v0 -> v1)', () => {
      localStorage.setItem(STORAGE_KEYS.classes, JSON.stringify([VALID_CLASS]));
      const r = loadClasses();
      expect(r.status).toBe('ok');
      expect(r.data).toHaveLength(1);
      expect(r.data[0].name).toBe('Test');
    });

    it('rejects unsupported future schemaVersion and does not overwrite storage', () => {
      const raw = JSON.stringify({
        schemaVersion: 999,
        data: [VALID_CLASS]
      });
      localStorage.setItem(STORAGE_KEYS.classes, raw);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const r = loadClasses();

      expect(r.data).toEqual([]);
      expect(r.status).toBe('unsupported-version');
      // Storage MUST stay untouched -- the raw bytes still match.
      expect(localStorage.getItem(STORAGE_KEYS.classes)).toBe(raw);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('returns empty array with status=parse-error on corrupt JSON', () => {
      localStorage.setItem(STORAGE_KEYS.classes, '{this-is-not[json');
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const r = loadClasses();
      expect(r.data).toEqual([]);
      expect(r.status).toBe('parse-error');
    });

    it('returns empty array with status=invalid-data on structurally bad envelope', () => {
      localStorage.setItem(
        STORAGE_KEYS.classes,
        JSON.stringify({ schemaVersion: 1, data: { not: 'an array' } })
      );
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const r = loadClasses();
      expect(r.data).toEqual([]);
      expect(r.status).toBe('invalid-data');
    });
  });

  describe('saveClasses', () => {
    it('writes an envelope with the current schema version', () => {
      saveClasses([VALID_CLASS]);
      const raw = localStorage.getItem(STORAGE_KEYS.classes);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!) as { schemaVersion: number; data: unknown };
      expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(Array.isArray(parsed.data)).toBe(true);
    });
  });

  describe('loadLayout / saveLayout', () => {
    it('round-trips a layout through envelope', () => {
      saveLayout(VALID_LAYOUT);
      const loaded = loadLayout();
      expect(loaded.status).toBe('ok');
      expect(loaded.data).toEqual(VALID_LAYOUT);
    });

    it('returns null/empty for empty storage', () => {
      const r = loadLayout();
      expect(r.data).toBeNull();
      expect(r.status).toBe('empty');
    });

    it('rejects unsupported schemaVersion and keeps storage intact', () => {
      const raw = JSON.stringify({ schemaVersion: 999, data: VALID_LAYOUT });
      localStorage.setItem(STORAGE_KEYS.layout, raw);
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const r = loadLayout();
      expect(r.data).toBeNull();
      expect(r.status).toBe('unsupported-version');
      expect(localStorage.getItem(STORAGE_KEYS.layout)).toBe(raw);
    });
  });

  describe('parseEnvelope', () => {
    const isStringArray = (v: unknown): v is string[] =>
      Array.isArray(v) && v.every((x) => typeof x === 'string');

    it('reports empty reason for null input', () => {
      const r = parseEnvelope<string[]>(null, isStringArray);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe('empty');
    });

    it('reports parse-error for malformed JSON', () => {
      const r = parseEnvelope<string[]>('not json', isStringArray);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe('parse-error');
    });

    it('reports unsupported-version for future schemaVersion', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const r = parseEnvelope<string[]>(
        JSON.stringify({ schemaVersion: 2, data: ['x'] }),
        isStringArray
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe('unsupported-version');
    });

    it('accepts legacy bare payload when validate passes', () => {
      const r = parseEnvelope<string[]>(JSON.stringify(['a', 'b']), isStringArray);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.data).toEqual(['a', 'b']);
    });
  });
});
