import type {CSSProperties} from 'react';
import {ease} from '../lib/easing';

/**
 * Cut and transition helpers (spec 4.9 C).
 *
 * Banned: white-flash, wash, crossfade-through-light, hold-then-flash.
 * Allowed here: hard cut on a beat (with a carry), match cut, whip-through with
 * an 8-12 frame eased ramp, tile slide, and one clean 8-12 frame dissolve.
 *
 * `transitionStyle()` is CSS-only: it transforms the whole rendered layer, so it
 * works with a ThreeCanvas and stays deterministic.
 */

export type CutKind = 'hardCut' | 'matchCut' | 'whipThrough' | 'tileSlide' | 'dissolve';

export type Direction = 'left' | 'right' | 'up' | 'down';

export type TransitionSpec = {
  kind: CutKind;
  /** Frames the transition spans. Whups 8-12, dissolves 8-12, slides 8-14. */
  frames?: number;
  direction?: Direction;
  /** What carries across the cut. Documentation that keeps the plan honest. */
  carry?: string;
};

export const TRANSITION_DEFAULTS: Record<CutKind, number> = {
  hardCut: 0,
  matchCut: 0,
  whipThrough: 10,
  tileSlide: 10,
  dissolve: 10,
};

/** How many frames of the outgoing shot are overlapped by the incoming one. */
export const overlapFrames = (spec: TransitionSpec): number => {
  if (spec.kind === 'hardCut' || spec.kind === 'matchCut') {
    return 0;
  }
  return spec.frames ?? TRANSITION_DEFAULTS[spec.kind];
};

const dirSign = (d: Direction): {x: number; y: number} => {
  switch (d) {
    case 'left':
      return {x: -1, y: 0};
    case 'right':
      return {x: 1, y: 0};
    case 'up':
      return {x: 0, y: -1};
    case 'down':
      return {x: 0, y: 1};
    default:
      return {x: 1, y: 0};
  }
};

export type Phase = 'out' | 'in' | 'idle';

/**
 * Style for a layer taking part in a transition.
 * @param progress 0..1 through the transition (for 'out' shots the same clock runs).
 */
export const transitionStyle = (
  spec: TransitionSpec,
  phase: Phase,
  progress: number,
): CSSProperties => {
  const p = Math.max(0, Math.min(1, progress));
  if (phase === 'idle' || spec.kind === 'hardCut' || spec.kind === 'matchCut') {
    return {};
  }
  const {x, y} = dirSign(spec.direction ?? 'left');

  switch (spec.kind) {
    case 'whipThrough': {
      // Outgoing accelerates away, incoming decelerates into place: the cut lands
      // at peak velocity so the eye reads one continuous whip.
      const t = phase === 'out' ? ease.inCubic(p) : 1 - ease.outCubic(p);
      const travel = 26 * t;
      return {
        transform: `translate3d(${x * travel}%, ${y * travel * 0.35}%, 0) scale(${1 + 0.05 * t})`,
        filter: `blur(${Math.min(18, 16 * t).toFixed(2)}px)`,
        opacity: 1,
      };
    }
    case 'tileSlide': {
      // A diorama tile shoves the previous world out of frame.
      const t = phase === 'out' ? ease.inOutCubic(p) : 1 - ease.inOutCubic(p);
      return {
        transform: `translate3d(${x * t * 100}%, ${y * t * 100}%, 0)`,
        opacity: 1,
      };
    }
    case 'dissolve': {
      // One clean dissolve — no light flash, no exposure wash.
      const t = ease.inOutSine(p);
      return {opacity: phase === 'out' ? 1 - t : t};
    }
    default:
      return {};
  }
};

/** Human-readable plan line for the delivery notes / shot list. */
export const describeCut = (spec: TransitionSpec): string => {
  const frames = overlapFrames(spec);
  const base =
    spec.kind === 'hardCut'
      ? 'hard cut on beat'
      : spec.kind === 'matchCut'
        ? 'match cut'
        : `${spec.kind} (${frames}f)`;
  return spec.carry ? `${base} — carry: ${spec.carry}` : base;
};

/** Guard for the QA checklist: which pairs of shots need overlapping layers. */
export const needsOverlap = (spec: TransitionSpec): boolean => overlapFrames(spec) > 0;
