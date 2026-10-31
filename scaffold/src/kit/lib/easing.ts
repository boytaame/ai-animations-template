/**
 * Shared easing and spring presets (spec 4.8).
 * Pure functions only: no Remotion import, so they are unit-testable and
 * usable from scripts.
 */

export type EaseFn = (t: number) => number;

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

export const ease = {
  linear: (t: number): number => clamp01(t),
  inQuad: (t: number): number => clamp01(t) ** 2,
  outQuad: (t: number): number => 1 - (1 - clamp01(t)) ** 2,
  inOutQuad: (t: number): number => {
    const x = clamp01(t);
    return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
  },
  inCubic: (t: number): number => clamp01(t) ** 3,
  outCubic: (t: number): number => 1 - (1 - clamp01(t)) ** 3,
  inOutCubic: (t: number): number => {
    const x = clamp01(t);
    return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
  },
  outExpo: (t: number): number => {
    const x = clamp01(t);
    return x === 1 ? 1 : 1 - 2 ** (-10 * x);
  },
  inOutSine: (t: number): number => -(Math.cos(Math.PI * clamp01(t)) - 1) / 2,
  /** Slight overshoot for pops; max ~1.09 at t≈0.72. */
  outBack: (t: number): number => {
    const c1 = 1.2;
    const x = clamp01(t);
    return 1 + (c1 + 1) * (x - 1) ** 3 + c1 * (x - 1) ** 2;
  },
  smoothstep: (t: number): number => {
    const x = clamp01(t);
    return x * x * (3 - 2 * x);
  },
} satisfies Record<string, EaseFn>;

export type EaseName = keyof typeof ease;

/** Spring configs for Remotion's `spring()` (damping 10-20, stiffness 100-200, mass 0.6-1). */
export const springs = {
  /** UI/caption pop (spec 8.3) — settles in ~6 frames. */
  pop: {damping: 14, stiffness: 200, mass: 0.7},
  /** Softer entrance for props and figures. */
  soft: {damping: 18, stiffness: 110, mass: 1},
  /** Snappy accents, small overshoot. */
  snappy: {damping: 12, stiffness: 180, mass: 0.6},
  /** Heavy objects landing. */
  land: {damping: 20, stiffness: 160, mass: 1},
  /** Feather-light hover. */
  float: {damping: 16, stiffness: 100, mass: 0.9},
} as const;

export type SpringName = keyof typeof springs;

/** Progress 0..1 across a frame window, clamped, already eased. */
export const windowProgress = (
  frame: number,
  start: number,
  duration: number,
  fn: EaseFn = ease.inOutQuad,
): number => {
  if (duration <= 0) {
    return frame >= start ? 1 : 0;
  }
  return fn(clamp01((frame - start) / duration));
};

/**
 * A "moving hold": huge poses are never frozen (spec 4.8). Returns a small
 * periodic offset that keeps a held pose alive without reading like jitter.
 */
export const movingHold = (
  frame: number,
  opts: {amp?: number; period?: number; phase?: number} = {},
): number => {
  const {amp = 0.012, period = 46, phase = 0} = opts;
  return Math.sin((frame / period) * Math.PI * 2 + phase) * amp;
};

/** Decaying wobble after an impact; deterministic and closed-form. */
export const settle = (frame: number, startFrame: number, amp = 0.06): number => {
  const t = Math.max(0, frame - startFrame);
  return Math.sin(t * 0.55) * amp * Math.max(0, 1 - t / 22);
};

export const toRad = (deg: number): number => (deg * Math.PI) / 180;
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));
