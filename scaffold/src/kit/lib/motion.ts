/**
 * Anti-strobe / long-move helpers (spec 3.3, 4.9 B, 4.9 D, 4.9 E).
 * All closed-form functions of the frame number.
 */

import {clamp, ease, type EaseFn} from './easing';

/**
 * Continuous scroll phase for a repeating pattern.
 * `offset = (velocity * t) mod spacing`, computed from time — elements are
 * never respawned at jumping positions, so patterns never strobe (4.9 B).
 */
export const continuousPhase = (sec: number, spacing: number, speedPerSec: number): number => {
  const travelled = speedPerSec * sec;
  // Positive modulo keeps the phase continuous for negative speeds too.
  return ((travelled % spacing) + spacing) % spacing;
};

/** Widest speed a repeating pattern may travel without strobing (25% of spacing/frame). */
export const maxSafeSpeed = (spacing: number, fps = 30, fraction = 0.25): number =>
  spacing * fraction * fps;

/** True when a pattern is safe; used by unit checks and by authors tuning speeds. */
export const isStrobeSafe = (spacing: number, speedPerSec: number, fps = 30): boolean =>
  speedPerSec <= maxSafeSpeed(spacing, fps);

/**
 * One continuous log-scale zoom (4.9 E). Apparent speed stays constant because
 * the factor interpolates exponentially, not linearly.
 */
export const logZoom = (
  progress: number,
  from: number,
  to: number,
  fn: EaseFn = ease.inOutSine,
): number => {
  const t = fn(clamp(progress, 0, 1));
  return Math.exp(Math.log(from) * (1 - t) + Math.log(to) * t);
};

/**
 * Eased flash envelope (4.9 D): never a single-frame full-screen flash.
 * rise 2-3 frames, decay 4-8; total is always >= 4 frames.
 */
export const flashEnvelope = (
  frame: number,
  startFrame: number,
  opts: {rise?: number; decay?: number; peak?: number} = {},
): number => {
  const {rise = 2, decay = 6, peak = 0.5} = opts;
  const t = frame - startFrame;
  if (t < 0 || t > rise + decay) {
    return 0;
  }
  if (t <= rise) {
    return peak * ease.outQuad(t / rise);
  }
  return peak * (1 - ease.inQuad((t - rise) / decay));
};

/**
 * Layer ramp for a whip/occluder transition: returns a 0..1 "how far through the
 * disguise" value across a window, plus optional directional slide offset.
 */
export const whipRamp = (
  frame: number,
  startFrame: number,
  duration: number,
  fn: EaseFn = ease.inOutCubic,
): number => fn(clamp((frame - startFrame) / Math.max(1, duration), 0, 1));

/** Deterministic non-periodic spacing (breaks up regular patterns at speed). */
export const irregularSpacing = (index: number, base: number, wobble: number, seed: number) => {
  const s = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
  const u = s - Math.floor(s);
  return base * (1 + (u * 2 - 1) * wobble);
};

/** Stagger helper for entrances: start frame of item `i` (4.8). */
export const stagger = (i: number, step = 4, base = 0): number => base + i * step;

/** Cycle phase (0..1) for walk/jump cycles; `cyclesPerSec` is the step frequency. */
export const cyclePhase = (sec: number, cyclesPerSec: number, offset = 0): number => {
  const p = (sec * cyclesPerSec + offset) % 1;
  return p < 0 ? p + 1 : p;
};
