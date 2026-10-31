/**
 * Character animation states as pure functions (spec 4.3 / 4.8).
 *
 * Every joint value is derived from `t` (seconds) or `phase` (0..1 of a
 * locomotion cycle) — no state, no randomness, no frame accumulation.
 *
 * Conventions
 *  - angles are radians, applied XYZ to pivot groups
 *  - `arm*.z` / `leg*.z` are positive = away from the body (Figure mirrors them)
 *  - `rootY` lifts the whole figure; landing compression is expressed as squash
 *  - locomotion takes `phase`, so the caller advances it by distance travelled
 *    (`phase = distance / STRIDE`) and feet never slide (spec 4.8)
 */

import {clamp, ease, lerp, settle} from '../lib/easing';

export type Joint = {x: number; y: number; z: number};
export type ArmPose = Joint & {elbow: number};
export type LegPose = Joint & {knee: number};

export type Pose = {
  rootY: number;
  rootX: number;
  rootRotY: number;
  rootRotZ: number;
  hips: Joint;
  torso: Joint;
  head: Joint;
  armL: ArmPose;
  armR: ArmPose;
  legL: LegPose;
  legR: LegPose;
  squashX: number;
  squashY: number;
};

export type FigureState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'fall'
  | 'float'
  | 'sit'
  | 'wave'
  | 'thumbsUp'
  | 'lookUp'
  | 'shrug'
  | 'dig'
  | 'celebrate';

/** World units travelled per full walk cycle (two steps). */
export const WALK_STRIDE = 1.12;
export const RUN_STRIDE = 2.1;

const j = (x = 0, y = 0, z = 0): Joint => ({x, y, z});
const arm = (x = 0, y = 0, z = 0, elbow = 0): ArmPose => ({x, y, z, elbow});
const leg = (x = 0, y = 0, z = 0, knee = 0): LegPose => ({x, y, z, knee});

export const restPose = (): Pose => ({
  rootY: 0,
  rootX: 0,
  rootRotY: 0,
  rootRotZ: 0,
  hips: j(),
  torso: j(),
  head: j(),
  armL: arm(0, 0, 0.09, 0.12),
  armR: arm(0, 0, 0.09, 0.12),
  legL: leg(),
  legR: leg(),
  squashX: 1,
  squashY: 1,
});

const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

/** Standing: breathing bob, weight shift, small head travel. Never frozen. */
export const idle = (t: number): Pose => {
  const breath = Math.sin(t * 1.45);
  const shift = Math.sin(t * 0.62);
  return {
    ...restPose(),
    rootY: 0.012 * breath + 0.004 * Math.sin(t * 2.7),
    rootRotY: 0.05 * shift,
    hips: j(0.01 * breath, 0.06 * shift, 0.02 * shift),
    torso: j(0.02 * Math.sin(t * 1.45 + 0.5), -0.04 * shift, -0.015 * shift),
    // Head leads a touch, so the character reads as looking around.
    head: j(0.03 * Math.sin(t * 0.9), 0.1 * Math.sin(t * 0.44 + 0.8), 0.02 * shift),
    armL: arm(0.03 * Math.sin(t * 1.2), 0, 0.1 + 0.015 * breath, 0.16),
    armR: arm(0.03 * Math.sin(t * 1.2 + 0.9), 0, 0.11 + 0.02 * breath, 0.2),
    legL: leg(0.01 * shift, 0, 0.03, 0),
    legR: leg(-0.01 * shift, 0, 0.03, 0.02),
    squashY: 1 + 0.006 * breath,
  };
};

/** Walk cycle: planted feet, torso bob at twice the step rate, arm counter-swing. */
export const walk = (phase: number, intensity = 1): Pose => {
  const a = phase * TAU;
  const swing = 0.5 * intensity;
  const bob = Math.abs(Math.sin(a)) * 0.05 * intensity;
  const legL = Math.sin(a);
  const legR = Math.sin(a + Math.PI);
  return {
    ...restPose(),
    rootY: bob + 0.004 * Math.sin(a * 2),
    rootRotY: 0,
    hips: j(0.02, 0.1 * Math.sin(a), 0.03 * Math.sin(a * 2)),
    torso: j(0.06 * intensity, -0.08 * Math.sin(a), -0.04 * Math.sin(a)),
    head: j(-0.03, -0.05 * Math.sin(a), 0.03 * Math.sin(a + 0.4)),
    // Arms counter the legs, with a few frames of follow-through on the elbow.
    armL: arm(-0.52 * swing * Math.sin(a), 0, 0.1, 0.28 + 0.12 * Math.sin(a + 0.5)),
    armR: arm(-0.5 * swing * Math.sin(a + Math.PI + 0.08), 0, 0.1, 0.28 + 0.12 * Math.sin(a + Math.PI)),
    legL: leg(swing * legL, 0, 0.025, Math.max(0, -0.85 * legL) * intensity),
    legR: leg(swing * legR, 0, 0.025, Math.max(0, -0.85 * legR) * intensity),
    squashY: 1 + 0.02 * Math.sin(a * 2),
  };
};

/** Run: forward lean, higher knees, bent arms, airborne bob. */
export const run = (phase: number): Pose => {
  const a = phase * TAU;
  const legL = Math.sin(a);
  const legR = Math.sin(a + Math.PI);
  return {
    ...restPose(),
    rootY: 0.1 * Math.abs(Math.sin(a)) + 0.02,
    hips: j(0.08, 0.16 * Math.sin(a), 0.03 * Math.sin(a * 2)),
    torso: j(0.3, -0.14 * Math.sin(a), -0.05 * Math.sin(a)),
    head: j(-0.24 + 0.04 * Math.sin(a * 2), -0.08 * Math.sin(a), 0.03),
    armL: arm(-1.0 * Math.sin(a), 0, 0.16, 1.1 + 0.2 * Math.sin(a + 0.6)),
    armR: arm(-1.0 * Math.sin(a + Math.PI + 0.06), 0, 0.16, 1.1 + 0.2 * Math.sin(a + Math.PI)),
    legL: leg(0.85 * legL, 0, 0.02, Math.max(0, -1.35 * legL)),
    legR: leg(0.85 * legR, 0, 0.02, Math.max(0, -1.35 * legR)),
    squashY: 1 + 0.035 * Math.sin(a * 2),
  };
};

/**
 * Jump: anticipation crouch, push-off stretch, airborne tuck, landing squash.
 * `t` runs 0..duration; the arc height is part of the pose so the scene only
 * supplies the horizontal travel.
 */
export const jump = (t: number, opts: {duration?: number; height?: number} = {}): Pose => {
  const duration = opts.duration ?? 0.95;
  const height = opts.height ?? 1.5;
  const p = clamp(t / duration, 0, 1);
  const crouch = 1 - ease.outQuad(clamp(p / 0.2, 0, 1));
  const airP = clamp((p - 0.2) / 0.55, 0, 1);
  const arc = p > 0.2 && p < 0.75 ? 4 * airP * (1 - airP) : 0;
  const landing = p > 0.75 ? ease.outQuad(clamp((p - 0.75) / 0.25, 0, 1)) : 0;
  const compression = crouch * 0.22 + (1 - landing) * (p > 0.75 ? 0.3 : 0);
  const stretch = arc * 0.14;

  return {
    ...restPose(),
    rootY: arc * height - compression * 0.28,
    hips: j(0.16 - arc * 0.3, 0, 0),
    torso: j(0.3 - arc * 0.42, 0, 0),
    head: j(-0.1 + arc * 0.2, 0, 0),
    armL: arm(-1.9 * arc - 0.5 * crouch, 0, 0.24, 0.5),
    armR: arm(-1.85 * arc - 0.45 * crouch, 0, 0.26, 0.5),
    legL: leg(0.7 * crouch - 0.5 * arc, 0, 0.05, 1.0 * crouch + 1.3 * arc),
    legR: leg(0.7 * crouch - 0.45 * arc, 0, 0.05, 0.95 * crouch + 1.25 * arc),
    squashX: 1 + compression * 0.18 - stretch * 0.1,
    squashY: 1 - compression * 0.2 + stretch * 0.18,
  };
};

/** Free fall: flailing arms with phase offsets, slow tumble, feet trailing. */
export const fall = (t: number): Pose => {
  const flap = (freq: number, off: number) => Math.sin(t * freq + off);
  return {
    ...restPose(),
    rootY: 0,
    rootRotZ: 0.12 * Math.sin(t * 1.1),
    rootRotY: 0.18 * Math.sin(t * 0.5),
    hips: j(-0.14, 0.1 * flap(1.3, 0), 0),
    torso: j(-0.22, 0.12 * flap(1.1, 0.7), 0.05 * flap(0.9, 1.2)),
    head: j(-0.34, 0.1 * flap(0.8, 2.1), 0),
    armL: arm(-2.3 + 0.5 * flap(3.1, 0), 0, 0.5 + 0.2 * flap(2.7, 1.1), 0.3),
    armR: arm(-2.25 + 0.55 * flap(3.4, 2.2), 0, 0.52 + 0.22 * flap(2.9, 0.4), 0.35),
    legL: leg(0.55 * flap(1.7, 0.6), 0, 0.14, 0.35 + 0.2 * flap(1.9, 0)),
    legR: leg(0.5 * flap(1.9, 1.9), 0, 0.12, 0.4 + 0.22 * flap(1.6, 1.4)),
    squashY: 1 + 0.04 * flap(2.2, 0),
  };
};

/** Hovering/floating: legs dangling, arms out, lazy drift. */
export const float = (t: number): Pose => ({
  ...restPose(),
  rootY: 0.06 * Math.sin(t * 1.1),
  rootRotZ: 0.03 * Math.sin(t * 0.7),
  hips: j(-0.05, 0.05 * Math.sin(t * 0.8), 0),
  torso: j(-0.06, 0.06 * Math.sin(t * 0.6), 0.02 * Math.sin(t * 1.2)),
  head: j(-0.12, 0.12 * Math.sin(t * 0.45), 0),
  armL: arm(-0.25 + 0.12 * Math.sin(t * 1.4), 0, 0.75 + 0.08 * Math.sin(t * 1.1), 0.2),
  armR: arm(-0.2 + 0.12 * Math.sin(t * 1.3 + 1.0), 0, 0.78 + 0.08 * Math.sin(t * 1.0), 0.24),
  legL: leg(0.35 + 0.1 * Math.sin(t * 1.2), 0, 0.1, 0.35),
  legR: leg(0.28 + 0.1 * Math.sin(t * 1.05 + 0.8), 0, 0.12, 0.3),
});

/** Sitting: hips folded, knees down, arms resting, breathing. */
export const sit = (t: number): Pose => {
  const breath = Math.sin(t * 1.3);
  return {
    ...restPose(),
    rootY: -0.34 + 0.01 * breath,
    hips: j(0.05, 0.04 * Math.sin(t * 0.5), 0),
    torso: j(0.14 + 0.02 * breath, 0.05 * Math.sin(t * 0.5), 0),
    head: j(-0.05, 0.09 * Math.sin(t * 0.42), 0.02),
    armL: arm(0.3, 0, 0.3, 0.9 + 0.05 * breath),
    armR: arm(0.32, 0, 0.32, 0.85 + 0.05 * breath),
    legL: leg(1.5, 0, 0.08, 1.55),
    legR: leg(1.44, 0, 0.06, 1.5),
  };
};

/** Wave: right arm up and waving, head tilt, weight on one leg. */
export const wave = (t: number): Pose => {
  const waveZ = Math.sin(t * 5.2) * 0.42;
  return {
    ...idle(t * 0.6),
    rootRotY: 0.1,
    torso: j(0.02, 0.1, -0.04),
    head: j(-0.05, -0.14, 0.06),
    armR: arm(-2.05, 0, 0.5 + waveZ * 0.4, 0.55 + waveZ * 0.3),
    armL: arm(0.05, 0, 0.12, 0.3),
  };
};

/** Thumbs up: forearm up, small spring pop, confident lean. */
export const thumbsUp = (t: number): Pose => {
  const pop = settle(t, 0.05, 0.16);
  return {
    ...idle(t * 0.5),
    torso: j(-0.04, -0.12, 0.05),
    head: j(-0.08, 0.16, -0.05 + pop * 0.2),
    armR: arm(-1.15 - pop, 0, 0.36, 1.75),
    armL: arm(0.04, 0, 0.1, 0.25),
  };
};

/** Look up: head and chest lead upward, one hand shading the eyes. */
export const lookUp = (t: number): Pose => ({
  ...idle(t * 0.7),
  rootY: 0.01,
  torso: j(-0.1 + 0.02 * Math.sin(t * 1.1), 0, 0),
  head: j(-0.5 + 0.03 * Math.sin(t * 0.9), 0.08 * Math.sin(t * 0.5), 0),
  armL: arm(-0.35, 0, 0.24, 1.0),
  armR: arm(-1.35 + 0.05 * Math.sin(t * 1.2), 0, 0.42, 1.5),
});

/** Shrug: both forearms out and palms up, head tilt, quick then held. */
export const shrug = (t: number): Pose => {
  const rise = ease.outBack(clamp(t / 0.35, 0, 1));
  return {
    ...idle(t * 0.5),
    torso: j(0.03, 0, 0),
    head: j(0.06, 0.1 * Math.sin(t * 0.6), -0.06 * rise),
    armL: arm(-0.5 * rise, 0, (0.5 + 0.05 * Math.sin(t * 1.3)) * rise, 1.35 * rise),
    armR: arm(-0.48 * rise, 0, (0.52 + 0.05 * Math.sin(t * 1.3 + 0.8)) * rise, 1.3 * rise),
  };
};

/** Dig: bent over, alternating downward strokes, weight shifting. */
export const dig = (t: number): Pose => {
  const stroke = Math.sin(t * 2.2);
  const alt = Math.sin(t * 2.2 + Math.PI * 0.5);
  return {
    ...restPose(),
    rootY: -0.08 + 0.02 * Math.abs(stroke),
    hips: j(0.35, 0.06 * alt, 0),
    torso: j(0.55 + 0.1 * stroke, 0.08 * alt, 0),
    head: j(-0.15, 0.05 * alt, 0),
    armL: arm(-0.9 + 0.8 * stroke, 0, 0.24, 1.1 + 0.3 * stroke),
    armR: arm(-0.85 + 0.75 * alt, 0, 0.22, 1.05 + 0.3 * alt),
    legL: leg(0.28, 0, 0.1, 0.5),
    legR: leg(-0.16, 0, 0.12, 0.32),
    squashY: 1 - 0.02 * Math.abs(stroke),
  };
};

/** Celebrate: arms up, small hops, squash on each landing. */
export const celebrate = (t: number): Pose => {
  const hop = Math.max(0, Math.sin(t * 4.4));
  return {
    ...restPose(),
    rootY: hop * 0.12,
    rootRotY: 0.08 * Math.sin(t * 2.2),
    torso: j(-0.12 + 0.06 * Math.sin(t * 3.1), 0.1 * Math.sin(t * 2.2), 0),
    head: j(-0.22, 0.12 * Math.sin(t * 1.6), 0.05 * Math.sin(t * 2.6)),
    armL: arm(-2.5 + 0.25 * Math.sin(t * 5.1), 0, 0.34, 0.35),
    armR: arm(-2.45 + 0.25 * Math.sin(t * 5.1 + 0.8), 0, 0.36, 0.3),
    legL: leg(-0.2 - hop * 0.3, 0, 0.12, 0.3 + hop * 0.5),
    legR: leg(-0.16 - hop * 0.28, 0, 0.12, 0.26 + hop * 0.5),
    squashX: 1 + (1 - hop) * 0.02,
    squashY: 1 - (1 - hop) * 0.03,
  };
};

/* ------------------------------------------------------------------ */
/* Dispatcher and blending                                             */
/* ------------------------------------------------------------------ */

export type PoseOptions = {phase?: number; intensity?: number; duration?: number; height?: number};

/**
 * Resolve a state to a pose. `t` is seconds inside the state; `phase` (0..1) is
 * used by the locomotion states so the caller can drive it from real distance.
 */
export const poseFor = (state: FigureState, t: number, opts: PoseOptions = {}): Pose => {
  const phase = opts.phase ?? (t * 1.15) % 1;
  switch (state) {
    case 'walk':
      return walk(phase, opts.intensity ?? 1);
    case 'run':
      return run(phase);
    case 'jump':
      return jump(t, {duration: opts.duration, height: opts.height});
    case 'fall':
      return fall(t);
    case 'float':
      return float(t);
    case 'sit':
      return sit(t);
    case 'wave':
      return wave(t);
    case 'thumbsUp':
      return thumbsUp(t);
    case 'lookUp':
      return lookUp(t);
    case 'shrug':
      return shrug(t);
    case 'dig':
      return dig(t);
    case 'celebrate':
      return celebrate(t);
    case 'idle':
    default:
      return idle(t);
  }
};

const lerpJoint = (a: Joint, b: Joint, t: number): Joint => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  z: lerp(a.z, b.z, t),
});

/** Cross-fade two poses so a state change never snaps an arm (spec 4.9 F). */
export const blend = (a: Pose, b: Pose, t: number): Pose => {
  const k = clamp(t, 0, 1);
  return {
    rootY: lerp(a.rootY, b.rootY, k),
    rootX: lerp(a.rootX, b.rootX, k),
    rootRotY: lerp(a.rootRotY, b.rootRotY, k),
    rootRotZ: lerp(a.rootRotZ, b.rootRotZ, k),
    hips: lerpJoint(a.hips, b.hips, k),
    torso: lerpJoint(a.torso, b.torso, k),
    head: lerpJoint(a.head, b.head, k),
    armL: {...lerpJoint(a.armL, b.armL, k), elbow: lerp(a.armL.elbow, b.armL.elbow, k)},
    armR: {...lerpJoint(a.armR, b.armR, k), elbow: lerp(a.armR.elbow, b.armR.elbow, k)},
    legL: {...lerpJoint(a.legL, b.legL, k), knee: lerp(a.legL.knee, b.legL.knee, k)},
    legR: {...lerpJoint(a.legR, b.legR, k), knee: lerp(a.legR.knee, b.legR.knee, k)},
    squashX: lerp(a.squashX, b.squashX, k),
    squashY: lerp(a.squashY, b.squashY, k),
  };
};

/**
 * Blink factor: 1 = eyes open, 0 = closed. Blinks last 4 frames and repeat every
 * 3-4.6 s, offset per character by `seed` (spec 4.3).
 */
export const blink = (t: number, seed: number): number => {
  const period = 3 + (seed % 1.6);
  const offset = seed * 0.37;
  const local = (t + offset) % period;
  const closeAt = period - 0.13;
  if (local < closeAt) {
    return 1;
  }
  const p = (local - closeAt) / 0.13;
  return 1 - Math.min(1, Math.sin(p * Math.PI) * 1.6);
};

/** Breathing amplitude for the torso scale, feeding the moving-hold rule. */
export const breathe = (t: number, phase = 0): number => Math.sin(t * 1.35 + phase) * 0.012;
