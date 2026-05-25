import { describe, it, expect } from 'vitest';
import { mulberry32, defaultRng } from './rng';

describe('mulberry32', () => {
  it('produces the same first 5 outputs for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).not.toEqual(seqB);
  });

  it('returns values in [0, 1)', () => {
    const rng = mulberry32(12345);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('defaultRng', () => {
  it('returns Math.random', () => {
    expect(defaultRng()).toBe(Math.random);
  });
});
