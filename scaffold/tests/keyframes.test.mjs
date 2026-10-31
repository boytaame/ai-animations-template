/**
 * M1 acceptance: keyframe tracks are velocity-continuous across every join and
 * never overshoot monotone data.
 *
 * Run: npm run test:kit
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {track, sample, velocity, monotoneTangents} from '../src/kit/lib/keyframes.ts';

const close = (a, b, eps, msg) => {
  assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b} (eps ${eps})`);
};

const MONO = [
  {frame: 0, value: 0},
  {frame: 10, value: 2},
  {frame: 24, value: 2.4},
  {frame: 40, value: 9},
  {frame: 58, value: 9.1},
  {frame: 70, value: 30},
];

test('position is exact at every keyframe', () => {
  const t = track(MONO);
  for (const k of MONO) {
    close(sample(t, k.frame), k.value, 1e-9, `key ${k.frame}`);
  }
});

test('velocity is continuous across every keyframe join', () => {
  const t = track(MONO);
  for (let i = 1; i < MONO.length - 1; i++) {
    const f = MONO[i].frame;
    const left = velocity(t, f - 1e-4);
    const right = velocity(t, f + 1e-4);
    close(left, right, 1e-3, `velocity join at frame ${f}`);
  }
});

test('no overshoot on monotone (but non-linear) data', () => {
  const t = track(MONO);
  for (let i = 0; i < MONO.length - 1; i++) {
    const a = MONO[i];
    const b = MONO[i + 1];
    const lo = Math.min(a.value, b.value);
    const hi = Math.max(a.value, b.value);
    for (let f = a.frame; f <= b.frame; f += 0.25) {
      const v = sample(t, f);
      assert.ok(
        v >= lo - 1e-9 && v <= hi + 1e-9,
        `overshoot at frame ${f}: ${v} outside [${lo}, ${hi}]`,
      );
    }
  }
});

test('monotone data stays non-decreasing frame by frame', () => {
  const t = track(MONO);
  let prev = sample(t, 0);
  for (let f = 0; f <= 70; f += 0.5) {
    const v = sample(t, f);
    // Flat sections are allowed; reversals are not.
    assert.ok(v >= prev - 1e-9, `value decreased at frame ${f}: ${prev} -> ${v}`);
    prev = v;
  }
});

test('velocity is continuous through an interior local maximum', () => {
  // A camera pull-in that eases out, holds, then reverses: interior keys must not kink.
  const t = track([
    {frame: 0, value: 0},
    {frame: 12, value: 5},
    {frame: 30, value: 5},
    {frame: 48, value: -1},
  ]);
  for (const f of [12, 30]) {
    close(velocity(t, f - 1e-4), velocity(t, f + 1e-4), 1e-3, `join ${f}`);
  }
  // No bulge above the local max.
  for (let f = 0; f <= 48; f += 0.25) {
    assert.ok(sample(t, f) <= 5 + 1e-9, `bulged past the max at ${f}`);
  }
});

test('vectors interpolate per dimension and stay within bounds', () => {
  const t = track([
    {frame: 0, value: [0, 10, -4]},
    {frame: 30, value: [6, 10, 2]},
    {frame: 60, value: [6, 14, 2]},
  ]);
  const mid = sample(t, 15);
  assert.equal(mid.length, 3);
  assert.ok(mid[0] > 0 && mid[0] < 6);
  close(mid[1], 10, 1e-9, 'constant dimension');
  for (let f = 0; f <= 60; f += 0.5) {
    const v = sample(t, f);
    assert.ok(v[0] >= -1e-9 && v[0] <= 6 + 1e-9, 'x bounds');
    assert.ok(v[1] >= 10 - 1e-9 && v[1] <= 14 + 1e-9, 'y bounds');
  }
});

test('clamps outside the keyframe range', () => {
  const t = track(MONO);
  close(sample(t, -50), 0, 1e-12, 'before');
  close(sample(t, 500), 30, 1e-12, 'after');
});

test('rejects unordered or empty keyframes', () => {
  assert.throws(() => track([]), /at least one/);
  assert.throws(
    () =>
      track([
        {frame: 5, value: 1},
        {frame: 5, value: 2},
      ]),
    /ascend/,
  );
});

test('monotone tangents flatten at sign changes', () => {
  const m = monotoneTangents([0, 1, 2], [0, 1, 0]);
  assert.equal(m[1], 0);
});
