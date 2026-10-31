/**
 * Velocity-continuous keyframe tracks (spec 3.2 / 4.9 L).
 *
 * Interpolation is monotone cubic Hermite (Fritsch-Carlson): the tangent at each
 * keyframe is shared by both neighbouring segments, so velocity is continuous
 * across every join, and the limiter guarantees the curve never overshoots the
 * bounding values of a segment (no rubber-banding, no jitter).
 *
 * Pure maths — no Remotion, no three — so tests can import it directly.
 */

export type Vec = number[];
export type Scalar = number;

export type Keyframe<T extends Scalar | Vec> = {frame: number; value: T};

type Kind = 'scalar' | 'vec';

type Compiled = {
  xs: number[];
  ys: number[][];
  ms: number[][];
  dims: number;
  kind: Kind;
};

export type Track<T extends Scalar | Vec> = {
  readonly keys: readonly Keyframe<T>[];
  readonly kind: Kind;
  readonly compiled: Compiled;
};

/** Fritsch-Carlson monotone tangents: continuous velocity, guaranteed no overshoot. */
export const monotoneTangents = (xs: readonly number[], ys: readonly number[]): number[] => {
  const n = xs.length;
  if (n === 1) {
    return [0];
  }
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    delta.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  }
  const m = new Array<number>(n).fill(0);
  m[0] = delta[0];
  m[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) {
    const d0 = delta[i - 1];
    const d1 = delta[i];
    if (d0 * d1 <= 0) {
      // Local extremum: flatten so the curve turns without bulging past the key.
      m[i] = 0;
      continue;
    }
    const h0 = xs[i] - xs[i - 1];
    const h1 = xs[i + 1] - xs[i];
    const w1 = 2 * h1 + h0;
    const w2 = h1 + 2 * h0;
    m[i] = (w1 + w2) / (w1 / d0 + w2 / d1);
  }
  return m;
};

/** Build a track from `[{frame, value}, ...]` (frames must ascend). */
export const track = <T extends Scalar | Vec>(keys: readonly Keyframe<T>[]): Track<T> => {
  if (keys.length === 0) {
    throw new Error('track() needs at least one keyframe');
  }
  const xs = keys.map((k) => k.frame);
  for (let i = 1; i < xs.length; i++) {
    if (!(xs[i] > xs[i - 1])) {
      throw new Error(`track() frames must strictly ascend (got ${xs[i - 1]} then ${xs[i]})`);
    }
  }
  const kind: Kind = Array.isArray(keys[0].value) ? 'vec' : 'scalar';
  const ys: number[][] = keys.map((k) =>
    Array.isArray(k.value) ? [...(k.value as number[])] : [k.value as number],
  );
  const dims = ys[0].length;
  for (const row of ys) {
    if (row.length !== dims) {
      throw new Error('track() values must all have the same dimension');
    }
  }
  const ms: number[][] = [];
  for (let d = 0; d < dims; d++) {
    ms.push(monotoneTangents(xs, ys.map((row) => row[d])));
  }
  return {keys, kind, compiled: {xs, ys, ms, dims, kind}};
};

const sampleDim = (c: Compiled, d: number, x: number): number => {
  const {xs, ys, ms} = c;
  const n = xs.length;
  if (x <= xs[0]) {
    return ys[0][d];
  }
  if (x >= xs[n - 1]) {
    return ys[n - 1][d];
  }
  // Binary search for the segment containing x.
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const h = xs[hi] - xs[lo];
  const t = (x - xs[lo]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  // `ms` is stored dim-major: ms[dimension][node].
  return (
    h00 * ys[lo][d] +
    h10 * h * ms[d][lo] +
    h01 * ys[hi][d] +
    h11 * h * ms[d][hi]
  );
};

/** Sample a track at a frame; clamped outside the keyframe range. */
export const sample = <T extends Scalar | Vec>(t: Track<T>, frame: number): T => {
  const c = t.compiled;
  if (c.kind === 'scalar') {
    return sampleDim(c, 0, frame) as T;
  }
  const out: number[] = [];
  for (let d = 0; d < c.dims; d++) {
    out.push(sampleDim(c, d, frame));
  }
  return out as T;
};

/** Velocity of a track at a frame (per frame), for validation and speed ramps. */
export const velocity = <T extends Scalar | Vec>(t: Track<T>, frame: number): T => {
  const eps = 0.05;
  const a = sample(t, frame - eps);
  const b = sample(t, frame + eps);
  if (Array.isArray(a)) {
    return (a.map((av, i) => ((b as number[])[i] - av) / (2 * eps)) as T);
  }
  return (((b as number) - (a as number)) / (2 * eps)) as T;
};

/** Convenience for 3D: returns a tuple regardless of input length. */
export const sample3 = (t: Track<Vec>, frame: number): [number, number, number] => {
  const v = sample(t, frame);
  return [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];
};
