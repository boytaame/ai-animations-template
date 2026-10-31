/**
 * Camera shot presets (spec 4.7). Pure data: each preset returns keyframe tracks
 * (monotone cubic interpolation through them, so velocity is continuous).
 * The camera is never fully still — CameraRig adds a breathing drift on top.
 */

import {track, type Track, type Vec} from '../lib/keyframes';

export type CameraPlan = {
  position: Track<Vec>;
  target: Track<Vec>;
  fov: Track<number>;
  /** Shot family, kept for documentation / contact sheets. */
  kind: ShotKind;
};

export type ShotKind =
  | 'pushIn'
  | 'driftLeft'
  | 'orbit'
  | 'tileIso'
  | 'topDown'
  | 'whipThrough'
  | 'lockedWide';

export type ShotParams = {
  /** Frames the move spans. */
  duration: number;
  target?: [number, number, number];
  /** Camera distance from target at the start of the move. */
  distance?: number;
  /** Movement amount: push-in factor, drift units, orbit degrees, whip degrees. */
  amount?: number;
  /** Compass angle in degrees around +Y (0 = looking from +Z). */
  azimuthDeg?: number;
  elevationDeg?: number;
  fov?: number;
  /** Vertical offset of the look-at point, useful for framing tall subjects. */
  targetLift?: number;
  /** Fraction of the distance a locked wide dollies in over its length. */
  dolly?: number;
};

const DEFAULTS = {
  target: [0, 2.2, 0] as [number, number, number],
  distance: 16,
  amount: 0.18,
  azimuthDeg: 38,
  elevationDeg: 16,
  fov: 40,
};

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Orbit camera position around a target at a distance / azimuth / elevation. */
export const polar = (
  target: [number, number, number],
  distance: number,
  azimuthDeg: number,
  elevationDeg: number,
): [number, number, number] => {
  const a = rad(azimuthDeg);
  const e = rad(elevationDeg);
  return [
    target[0] + Math.sin(a) * Math.cos(e) * distance,
    target[1] + Math.sin(e) * distance,
    target[2] + Math.cos(a) * Math.cos(e) * distance,
  ];
};

/** Build N evenly spaced keys from a generator; keeps arcs smooth through the move. */
const keysFor = (
  duration: number,
  steps: number,
  fn: (t: number) => {pos: [number, number, number]; tgt: [number, number, number]; fov: number},
) => {
  const n = Math.max(2, steps);
  const positions = [];
  const targets = [];
  const fovs = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const k = fn(t);
    const frame = Math.round(t * (duration - 1));
    positions.push({frame, value: k.pos});
    targets.push({frame, value: k.tgt});
    fovs.push({frame, value: k.fov});
  }
  // Duplicate rounded frames can collide; keep the first of each frame.
  const dedupe = <T extends {frame: number}>(keys: T[]): T[] =>
    keys.filter((k, i) => i === 0 || k.frame !== keys[i - 1].frame);
  return {
    position: track(dedupe(positions)),
    target: track(dedupe(targets)),
    fov: track(dedupe(fovs)),
  };
};

/**
 * Turn a preset name into camera tracks.
 * Every preset has some camera movement; holds still get a breathing drift from
 * CameraRig, so no shot is ever frozen (spec 4.9 A).
 */
export const buildShot = (kind: ShotKind, params: ShotParams): CameraPlan => {
  const p = {...DEFAULTS, ...params};
  const target: [number, number, number] = [
    p.target[0],
    p.target[1] + (params.targetLift ?? 0),
    p.target[2],
  ];
  const d = p.distance;

  switch (kind) {
    case 'pushIn':
      return {
        kind,
        ...keysFor(p.duration, 6, (t) => ({
          pos: polar(target, d * (1.24 - 0.34 * t), p.azimuthDeg - 4 * t, p.elevationDeg - 3 * t),
          tgt: [target[0], target[1] + 0.25 * t, target[2]],
          fov: p.fov,
        })),
      };

    case 'driftLeft': {
      const travel = p.amount * 4;
      return {
        kind,
        ...keysFor(p.duration, 5, (t) => {
          const shift = -travel * t;
          return {
            pos: [
              polar(target, d, p.azimuthDeg, p.elevationDeg)[0] + shift,
              polar(target, d, p.azimuthDeg, p.elevationDeg)[1],
              polar(target, d, p.azimuthDeg, p.elevationDeg)[2],
            ],
            tgt: [target[0] + shift, target[1], target[2]],
            fov: p.fov,
          };
        }),
      };
    }

    case 'orbit': {
      const swing = p.amount * 90;
      return {
        kind,
        ...keysFor(p.duration, 7, (t) => ({
          pos: polar(target, d * (1 - 0.04 * t), p.azimuthDeg - swing + 2 * swing * t, p.elevationDeg + 2 * t),
          tgt: [target[0], target[1] + 0.1 * Math.sin(t * Math.PI), target[2]],
          fov: p.fov,
        })),
      };
    }

    case 'tileIso':
      // Narrow FOV, ~35 deg elevation, ~45 deg azimuth: the isometric feel (4.7).
      return {
        kind,
        ...keysFor(p.duration, 5, (t) => ({
          pos: polar(target, d * (1 - 0.03 * t), p.azimuthDeg - 7 + 14 * t, 35),
          tgt: [target[0], target[1], target[2]],
          fov: 22,
        })),
      };

    case 'topDown':
      return {
        kind,
        ...keysFor(p.duration, 5, (t) => ({
          pos: polar(target, d * (1 - 0.02 * t), p.azimuthDeg - 5 + 10 * t, 78),
          tgt: [target[0], target[1], target[2]],
          fov: 32,
        })),
      };

    case 'whipThrough': {
      // Short, eased 8-12 frame lateral sweep: the cut happens at peak velocity.
      const swing = p.amount * 120;
      return {
        kind,
        ...keysFor(p.duration, 5, (t) => ({
          pos: polar(target, d * (1 - 0.1 * t), p.azimuthDeg - swing * t, p.elevationDeg),
          tgt: [target[0] - swing * 0.06 * t, target[1], target[2]],
          fov: p.fov + 6 * t,
        })),
      };
    }

    case 'lockedWide':
    default: {
      // "Locked" still moves: a slow dolly plus the rig's breathing drift, so a
      // wide hold is never a frozen frame (spec 4.9 A).
      const dolly = params.dolly ?? 0.05;
      return {
        kind: 'lockedWide',
        ...keysFor(p.duration, 4, (t) => ({
          pos: polar(target, d * (1 - dolly * t), p.azimuthDeg, p.elevationDeg),
          tgt: [target[0], target[1] + 0.05 * t, target[2]],
          fov: p.fov,
        })),
      };
    }
  }
};

/** Composable override: replace a plan's target track (e.g. to follow a figure). */
export const withTarget = (plan: CameraPlan, keys: {frame: number; value: Vec}[]): CameraPlan => ({
  ...plan,
  target: track(keys),
});
