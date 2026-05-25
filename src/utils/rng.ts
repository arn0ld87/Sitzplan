/**
 * Seedable pseudo-random number generator.
 *
 * Mulberry32: small, deterministic, sufficient quality for solver tie-breaks
 * and SA acceptance. NOT cryptographically secure. Reference:
 * https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32
 *
 * Used by the solver (`generateSeatingProposals`) when an `opts.seed` is
 * given — see ADR 0005. Without a seed the solver falls back to
 * `defaultRng()` (i.e. `Math.random`).
 */

export type RNG = () => number;

export function mulberry32(seed: number): RNG {
  let state = seed | 0;
  return function rng(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function defaultRng(): RNG {
  return Math.random;
}
