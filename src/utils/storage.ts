import type { SchoolClass, ClassroomLayout } from '../types';

export const STORAGE_KEYS = {
  classes: 'sitzplaner_classes',
  layout: 'sitzplaner_layout',
  theme: 'sitzplaner_theme'
} as const;

export const CURRENT_SCHEMA_VERSION = 1;

export type StorageEnvelope<T> = {
  schemaVersion: number;
  data: T;
};

export type ParseResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      reason: 'empty' | 'parse-error' | 'unsupported-version' | 'invalid-data';
    };

/**
 * Type guard for an envelope shape. Does NOT validate the inner `data` payload
 * — that is the responsibility of the caller via the `validate` predicate.
 */
function isEnvelopeShape(value: unknown): value is StorageEnvelope<unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { schemaVersion?: unknown; data?: unknown };
  return (
    typeof candidate.schemaVersion === 'number' &&
    Object.prototype.hasOwnProperty.call(candidate, 'data')
  );
}

/**
 * Parses a raw localStorage string and migrates legacy (v0) payloads into a
 * v1 envelope. Returns the inner `data` on success or a typed failure reason.
 *
 * Legacy v0 = raw JSON without `{ schemaVersion, data }` wrapper, e.g. a
 * bare array of classes from the pre-versioned storage format.
 */
export function parseEnvelope<T>(
  raw: string | null,
  validate: (data: unknown) => data is T
): ParseResult<T> {
  if (raw === null || raw === '') {
    return { ok: false, reason: 'empty' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'parse-error' };
  }

  let candidateData: unknown;
  if (isEnvelopeShape(parsed)) {
    if (parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
      console.error(
        `[storage] Unbekannte Schema-Version ${parsed.schemaVersion} (unterstützt: ${CURRENT_SCHEMA_VERSION}). Lade-Versuch wird abgebrochen, vorhandene Daten bleiben unangetastet.`
      );
      return { ok: false, reason: 'unsupported-version' };
    }
    // Future migrations between known versions would happen here.
    candidateData = parsed.data;
  } else {
    // Legacy v0: bare payload, no envelope. Treat the whole value as `data`.
    candidateData = parsed;
  }

  if (!validate(candidateData)) {
    return { ok: false, reason: 'invalid-data' };
  }

  return { ok: true, data: candidateData };
}

function writeEnvelope<T>(key: string, data: T): void {
  const envelope: StorageEnvelope<T> = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    data
  };
  localStorage.setItem(key, JSON.stringify(envelope));
}

// ─── Class validation ──────────────────────────────────────────────────────

function isSchoolClassArray(value: unknown): value is SchoolClass[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as SchoolClass).id === 'string' &&
      typeof (item as SchoolClass).name === 'string' &&
      Array.isArray((item as SchoolClass).students) &&
      Array.isArray((item as SchoolClass).rules)
  );
}

export function loadClasses(): SchoolClass[] {
  const raw = localStorage.getItem(STORAGE_KEYS.classes);
  const result = parseEnvelope<SchoolClass[]>(raw, isSchoolClassArray);
  if (result.ok) return result.data;

  if (result.reason === 'parse-error' || result.reason === 'invalid-data') {
    console.error(
      `[storage] Klassen konnten nicht geladen werden (${result.reason}). Starte mit leerer Liste, vorhandene Daten bleiben unangetastet.`
    );
  }
  return [];
}

export function saveClasses(classes: SchoolClass[]): void {
  writeEnvelope(STORAGE_KEYS.classes, classes);
}

// ─── Layout validation ─────────────────────────────────────────────────────

function isClassroomLayout(value: unknown): value is ClassroomLayout {
  if (typeof value !== 'object' || value === null) return false;
  const layout = value as ClassroomLayout;
  return (
    typeof layout.width === 'number' &&
    typeof layout.height === 'number' &&
    Array.isArray(layout.elements)
  );
}

export function loadLayout(): ClassroomLayout | null {
  const raw = localStorage.getItem(STORAGE_KEYS.layout);
  const result = parseEnvelope<ClassroomLayout>(raw, isClassroomLayout);
  if (result.ok) return result.data;

  if (result.reason === 'parse-error' || result.reason === 'invalid-data') {
    console.error(
      `[storage] Grundriss konnte nicht geladen werden (${result.reason}). Starte mit Default, vorhandene Daten bleiben unangetastet.`
    );
  }
  return null;
}

export function saveLayout(layout: ClassroomLayout): void {
  writeEnvelope(STORAGE_KEYS.layout, layout);
}
