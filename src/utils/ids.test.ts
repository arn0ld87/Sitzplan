import { describe, it, expect } from 'vitest';
import { newId } from './ids';

describe('newId', () => {
  it('returns a string', () => {
    expect(typeof newId()).toBe('string');
  });

  it('returns unique values on consecutive calls', () => {
    const a = newId();
    const b = newId();
    expect(a).not.toBe(b);
  });

  it('prefixes the id when a prefix is given', () => {
    const id = newId('class');
    expect(id.startsWith('class-')).toBe(true);
    expect(id.length).toBeGreaterThan('class-'.length);
  });

  it('returns a bare UUID when no prefix is given', () => {
    const id = newId();
    // crypto.randomUUID format: 8-4-4-4-12 hex
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });
});
