import type {
  SchoolClass,
  RuleType,
  ClassroomLayout,
  ElementType,
  SpecialNeed
} from '../types';

export type ValidationError = {
  path: string;
  expected: string;
  actual: string;
};

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: ValidationError[] };

const KNOWN_RULE_TYPES: readonly RuleType[] = [
  'beside',
  'not_beside',
  'near',
  'far',
  'front',
  'back',
  'edge',
  'near_door',
  'near_board',
  'not_window'
];

const KNOWN_SPECIAL_NEEDS: readonly SpecialNeed[] = [
  'Sehschwäche',
  'Hörschwäche',
  'Konzentrationsbedarf',
  'Verhalten',
  'Barrierefreiheit'
];

const KNOWN_ELEMENT_TYPES: readonly ElementType[] = [
  'desk',
  'board',
  'window',
  'door',
  'cupboard',
  'furniture'
];

const KNOWN_ROTATIONS: readonly (0 | 90 | 180 | 270)[] = [0, 90, 180, 270];

const KNOWN_STRICTNESS: readonly ('hard' | 'soft')[] = ['hard', 'soft'];

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ─── Field-level validators ────────────────────────────────────────────────

function validateSpecialNeeds(
  value: unknown,
  path: string
): ValidationError[] {
  if (!Array.isArray(value)) {
    return [{ path, expected: 'array', actual: describe(value) }];
  }
  const errors: ValidationError[] = [];
  value.forEach((item, idx) => {
    if (typeof item !== 'string') {
      errors.push({
        path: `${path}[${idx}]`,
        expected: 'string',
        actual: describe(item)
      });
      return;
    }
    if (!KNOWN_SPECIAL_NEEDS.includes(item as SpecialNeed)) {
      errors.push({
        path: `${path}[${idx}]`,
        expected: `one of ${KNOWN_SPECIAL_NEEDS.join(' | ')}`,
        actual: JSON.stringify(item)
      });
    }
  });
  return errors;
}

export function validateStudent(
  value: unknown,
  path: string
): ValidationError[] {
  if (!isObject(value)) {
    return [{ path, expected: 'object', actual: describe(value) }];
  }
  const errors: ValidationError[] = [];
  if (typeof value.id !== 'string') {
    errors.push({
      path: `${path}.id`,
      expected: 'string',
      actual: describe(value.id)
    });
  }
  if (typeof value.name !== 'string') {
    errors.push({
      path: `${path}.name`,
      expected: 'string',
      actual: describe(value.name)
    });
  }
  errors.push(...validateSpecialNeeds(value.specialNeeds, `${path}.specialNeeds`));
  return errors;
}

export function validateRule(
  value: unknown,
  path: string
): ValidationError[] {
  if (!isObject(value)) {
    return [{ path, expected: 'object', actual: describe(value) }];
  }
  const errors: ValidationError[] = [];
  if (typeof value.id !== 'string') {
    errors.push({
      path: `${path}.id`,
      expected: 'string',
      actual: describe(value.id)
    });
  }
  if (typeof value.studentId !== 'string') {
    errors.push({
      path: `${path}.studentId`,
      expected: 'string',
      actual: describe(value.studentId)
    });
  }
  if (typeof value.type !== 'string' || !KNOWN_RULE_TYPES.includes(value.type as RuleType)) {
    errors.push({
      path: `${path}.type`,
      expected: `one of ${KNOWN_RULE_TYPES.join(' | ')}`,
      actual: describe(value.type)
    });
  }
  if (value.targetId !== undefined && typeof value.targetId !== 'string') {
    errors.push({
      path: `${path}.targetId`,
      expected: 'string | undefined',
      actual: describe(value.targetId)
    });
  }
  if (
    typeof value.strictness !== 'string' ||
    !KNOWN_STRICTNESS.includes(value.strictness as 'hard' | 'soft')
  ) {
    errors.push({
      path: `${path}.strictness`,
      expected: "'hard' | 'soft'",
      actual: describe(value.strictness)
    });
  }
  return errors;
}

export function validateSchoolClass(
  value: unknown,
  path: string
): ValidationError[] {
  if (!isObject(value)) {
    return [{ path, expected: 'object', actual: describe(value) }];
  }
  const errors: ValidationError[] = [];
  if (typeof value.id !== 'string') {
    errors.push({
      path: `${path}.id`,
      expected: 'string',
      actual: describe(value.id)
    });
  }
  if (typeof value.name !== 'string') {
    errors.push({
      path: `${path}.name`,
      expected: 'string',
      actual: describe(value.name)
    });
  }
  if (!Array.isArray(value.students)) {
    errors.push({
      path: `${path}.students`,
      expected: 'array',
      actual: describe(value.students)
    });
  } else {
    value.students.forEach((student, idx) => {
      errors.push(...validateStudent(student, `${path}.students[${idx}]`));
    });
  }
  if (!Array.isArray(value.rules)) {
    errors.push({
      path: `${path}.rules`,
      expected: 'array',
      actual: describe(value.rules)
    });
  } else {
    value.rules.forEach((rule, idx) => {
      errors.push(...validateRule(rule, `${path}.rules[${idx}]`));
    });
  }
  return errors;
}

function validateClassroomElement(
  value: unknown,
  path: string
): ValidationError[] {
  if (!isObject(value)) {
    return [{ path, expected: 'object', actual: describe(value) }];
  }
  const errors: ValidationError[] = [];
  if (typeof value.id !== 'string') {
    errors.push({
      path: `${path}.id`,
      expected: 'string',
      actual: describe(value.id)
    });
  }
  if (typeof value.type !== 'string' || !KNOWN_ELEMENT_TYPES.includes(value.type as ElementType)) {
    errors.push({
      path: `${path}.type`,
      expected: `one of ${KNOWN_ELEMENT_TYPES.join(' | ')}`,
      actual: describe(value.type)
    });
  }
  (['x', 'y', 'w', 'h'] as const).forEach((field) => {
    if (typeof value[field] !== 'number') {
      errors.push({
        path: `${path}.${field}`,
        expected: 'number',
        actual: describe(value[field])
      });
    }
  });
  if (
    typeof value.rotation !== 'number' ||
    !KNOWN_ROTATIONS.includes(value.rotation as 0 | 90 | 180 | 270)
  ) {
    errors.push({
      path: `${path}.rotation`,
      expected: '0 | 90 | 180 | 270',
      actual: describe(value.rotation)
    });
  }
  if (value.label !== undefined && typeof value.label !== 'string') {
    errors.push({
      path: `${path}.label`,
      expected: 'string | undefined',
      actual: describe(value.label)
    });
  }
  return errors;
}

export function validateLayout(
  value: unknown,
  path: string
): ValidationError[] {
  if (!isObject(value)) {
    return [{ path, expected: 'object', actual: describe(value) }];
  }
  const errors: ValidationError[] = [];
  if (typeof value.width !== 'number') {
    errors.push({
      path: `${path}.width`,
      expected: 'number',
      actual: describe(value.width)
    });
  }
  if (typeof value.height !== 'number') {
    errors.push({
      path: `${path}.height`,
      expected: 'number',
      actual: describe(value.height)
    });
  }
  if (!Array.isArray(value.elements)) {
    errors.push({
      path: `${path}.elements`,
      expected: 'array',
      actual: describe(value.elements)
    });
  } else {
    value.elements.forEach((el, idx) => {
      errors.push(...validateClassroomElement(el, `${path}.elements[${idx}]`));
    });
  }
  return errors;
}

// ─── Top-level entry point ─────────────────────────────────────────────────

type ImportPayload = { classes: SchoolClass[]; layout: ClassroomLayout };

/**
 * Validates the raw payload from an imported JSON file. Accepts both the
 * direct `{ classes, layout }` shape and the envelope shape
 * `{ schemaVersion, data: { classes, layout } }`. Collects all errors instead
 * of failing fast, so the user can fix multiple issues at once.
 */
export function validateImportPayload(
  raw: unknown
): ValidationResult<ImportPayload> {
  if (!isObject(raw)) {
    return {
      ok: false,
      errors: [{ path: '$', expected: 'object', actual: describe(raw) }]
    };
  }

  // Envelope form: unwrap to inner data.
  let candidate: Record<string, unknown> = raw;
  let basePath = '';
  if (
    typeof raw.schemaVersion === 'number' &&
    Object.prototype.hasOwnProperty.call(raw, 'data')
  ) {
    if (!isObject(raw.data)) {
      return {
        ok: false,
        errors: [
          { path: 'data', expected: 'object', actual: describe(raw.data) }
        ]
      };
    }
    candidate = raw.data;
    basePath = 'data.';
  }

  const errors: ValidationError[] = [];
  if (!Array.isArray(candidate.classes)) {
    errors.push({
      path: `${basePath}classes`,
      expected: 'array',
      actual: describe(candidate.classes)
    });
  } else {
    candidate.classes.forEach((cls, idx) => {
      errors.push(...validateSchoolClass(cls, `${basePath}classes[${idx}]`));
    });
  }

  errors.push(...validateLayout(candidate.layout, `${basePath}layout`));

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      classes: candidate.classes as SchoolClass[],
      layout: candidate.layout as ClassroomLayout
    }
  };
}
