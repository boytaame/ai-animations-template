/**
 * Motion QA (spec 4.10) — implements the required ffmpeg filter chain.
 *
 *   node scripts/check-motion.mjs out/draft.mp4 [--allow 90,180,250] [--keep]
 *
 * Flags:
 *  - frozen runs: >= 6 consecutive frames with diff < 0.35
 *  - near-duplicate frames over 2% of the video
 *  - change runs of >= 3 consecutive frames with diff > 15 (planned cuts only)
 *  - single spikes over 3x the rolling median
 *  - periodic spikes (evenly spaced change): strobing
 *  - mean-luma jumps > 30 (flash errors)
 *  - near-static stretches longer than ~2 s
 *
 * The filter writes to a RELATIVE filename inside a temp working directory: a
 * Windows drive-letter path breaks the metadata filter's file argument.
 */
import {mkdirSync, readFileSync, rmSync, existsSync} from 'node:fs';
import path from 'node:path';
import {probe, requireFfmpeg, run} from './lib/ffmpeg.mjs';

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('--')) ?? 'out/draft.mp4';
const allowArg = args.includes('--allow') ? args[args.indexOf('--allow') + 1] : '';
const keep = args.includes('--keep');
const allowFrames = new Set(
  allowArg
    .split(',')
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isFinite(n)),
);

requireFfmpeg();
if (!existsSync(input)) {
  console.error(`File not found: ${input}`);
  process.exit(1);
}

const FROZEN_THRESHOLD = 0.35;
const FROZEN_RUN = 6;
const NEAR_DUP_LIMIT = 2;
const SPIKE_THRESHOLD = 15;
const SPIKE_RUN = 3;
const LUMA_JUMP = 30;
const STATIC_THRESHOLD = 0.6;
const STATIC_RUN = 60;

const tmp = path.resolve('out', '.motion-tmp');
mkdirSync(tmp, {recursive: true});

const FILTER_DIFF = [
  'scale=216:384',
  'format=gray',
  'tblend=all_mode=difference',
  'signalstats',
  'metadata=print:key=lavfi.signalstats.YAVG:file=motion.txt',
].join(',');
const FILTER_LUMA = [
  'scale=216:384',
  'format=gray',
  'signalstats',
  'metadata=print:key=lavfi.signalstats.YAVG:file=luma.txt',
].join(',');

const runFilter = (filter, outFile) => {
  rmSync(path.join(tmp, outFile), {force: true});
  const res = run('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.resolve(input), '-vf', filter, '-f', 'null', '-'], {
    cwd: tmp,
  });
  if (res.status !== 0) {
    console.error(`ffmpeg failed:\n${res.stderr}`);
    process.exit(1);
  }
  const file = path.join(tmp, outFile);
  if (!existsSync(file)) {
    return [];
  }
  return readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/YAVG=([\d.]+)/))
    .filter(Boolean)
    .map((m) => Number(m[1]));
};

console.log(`Analysing ${input} ...`);
const diffs = runFilter(FILTER_DIFF, 'motion.txt');
const luma = runFilter(FILTER_LUMA, 'luma.txt');

if (diffs.length === 0) {
  console.error('No motion data: is the file a readable video?');
  process.exit(1);
}

const frameOfDiff = (i) => i + 1; // tblend's first output frame is frame 1
const sorted = [...diffs].sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)];
const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;

const runs = (predicate, minLength) => {
  const out = [];
  let start = -1;
  for (let i = 0; i < diffs.length; i++) {
    if (predicate(diffs[i])) {
      if (start === -1) {
        start = i;
      }
    } else if (start !== -1) {
      if (i - start >= minLength) {
        out.push({from: frameOfDiff(start), to: frameOfDiff(i - 1), length: i - start});
      }
      start = -1;
    }
  }
  if (start !== -1 && diffs.length - start >= minLength) {
    out.push({from: frameOfDiff(start), to: frameOfDiff(diffs.length - 1), length: diffs.length - start});
  }
  return out;
};

const frozenRuns = runs((d) => d < FROZEN_THRESHOLD, FROZEN_RUN);
const nearDupCount = diffs.filter((d) => d < FROZEN_THRESHOLD).length;
const nearDupPct = (nearDupCount / diffs.length) * 100;
const staticRuns = runs((d) => d < STATIC_THRESHOLD, STATIC_RUN);
const spikeRuns = runs((d) => d > SPIKE_THRESHOLD, SPIKE_RUN);

const rollingMedian = (i, window = 31) => {
  const lo = Math.max(0, i - window);
  const hi = Math.min(diffs.length, i + window + 1);
  const slice = diffs.slice(lo, hi).sort((a, b) => a - b);
  return slice[Math.floor(slice.length / 2)];
};

const singleSpikes = [];
for (let i = 0; i < diffs.length; i++) {
  const local = rollingMedian(i);
  if (diffs[i] > Math.max(3 * local, 3) && !spikeRuns.some((r) => frameOfDiff(i) >= r.from && frameOfDiff(i) <= r.to)) {
    singleSpikes.push({frame: frameOfDiff(i), value: diffs[i], local});
  }
}

// Periodic spikes = strobing (spec 4.9 B).
const hot = [];
for (let i = 0; i < diffs.length; i++) {
  if (diffs[i] > Math.max(2.5 * median, 2.5)) {
    hot.push(frameOfDiff(i));
  }
}
const gapCounts = new Map();
for (let i = 1; i < hot.length; i++) {
  const gap = hot[i] - hot[i - 1];
  // A 1-2 frame alternation is ordinary high-frequency motion, not a cycle.
  if (gap >= 3 && gap <= 90) {
    gapCounts.set(gap, (gapCounts.get(gap) ?? 0) + 1);
  }
}
const periodic = [...gapCounts.entries()]
  .filter(([, n]) => n >= 5 && hot.length >= 6 && hot[hot.length - 1] - hot[0] >= 24)
  .sort((a, b) => b[1] - a[1]);

const lumaJumps = [];
for (let i = 1; i < luma.length; i++) {
  const delta = luma[i] - luma[i - 1];
  if (Math.abs(delta) > LUMA_JUMP) {
    lumaJumps.push({frame: i, delta});
  }
}

// A cut's transition (whip, slide, dissolve) spans ~10 frames either side, so a
// planned cut whitelists a +/-8 frame window.
const isAllowed = (frame, window = 8) =>
  [...allowFrames].some((allowed) => Math.abs(frame - allowed) <= window);

const unplannedFrozen = frozenRuns.filter((r) => !isAllowed(r.from));
const unplannedSpikes = spikeRuns.filter((r) => !isAllowed(r.from));
const unplannedLuma = lumaJumps.filter((j) => !isAllowed(j.frame));

const fmtRuns = (list) =>
  list.length
    ? list.map((r) => `${r.from}-${r.to} (${r.length}f)`).join(', ')
    : 'none';

console.log('\n=== Motion report ===');
console.log(`frames analysed      ${diffs.length + 1}`);
console.log(`mean diff            ${mean.toFixed(2)}   median ${median.toFixed(2)}`);
console.log(`frozen runs (>=${FROZEN_RUN}f <${FROZEN_THRESHOLD})   ${fmtRuns(frozenRuns)}`);
console.log(`near-duplicate frames ${nearDupCount} (${nearDupPct.toFixed(2)}%, limit ${NEAR_DUP_LIMIT}%)`);
console.log(`change runs (>${SPIKE_THRESHOLD} for >=${SPIKE_RUN}f)  ${fmtRuns(spikeRuns)}`);
console.log(`single spikes        ${singleSpikes.length ? singleSpikes.map((s) => `f${s.frame}:${s.value.toFixed(1)}`).join(', ') : 'none'}`);
console.log(`luma jumps (>${LUMA_JUMP})     ${lumaJumps.length ? lumaJumps.map((j) => `f${j.frame}:${j.delta.toFixed(0)}`).join(', ') : 'none'}`);
console.log(`near-static (>=${STATIC_RUN}f)  ${fmtRuns(staticRuns)}`);
console.log(
  `periodic spikes      ${periodic.length ? periodic.map(([gap, n]) => `every ~${gap}f x${n}`).join(', ') : 'none'}`,
);
if (allowFrames.size) {
  console.log(`allowed cut frames   ${[...allowFrames].join(', ')}`);
}

const problems = [];
if (unplannedFrozen.length) {
  problems.push(`frozen frames: ${fmtRuns(unplannedFrozen)} — every shot must move (spec 4.9 A)`);
}
if (nearDupPct > NEAR_DUP_LIMIT) {
  problems.push(`near-duplicate frames ${nearDupPct.toFixed(2)}% > ${NEAR_DUP_LIMIT}%`);
}
if (unplannedSpikes.length) {
  problems.push(`unplanned high-change runs: ${fmtRuns(unplannedSpikes)} — list them in the shot plan as transitions`);
}
if (unplannedLuma.length) {
  problems.push(`unplanned luma jumps: ${unplannedLuma.map((j) => `f${j.frame}`).join(', ')} — banned flash (spec 4.9 D)`);
}
if (periodic.length) {
  problems.push(`periodic change every ~${periodic[0][0]} frames — strobing (spec 4.9 B)`);
}

console.log(`\n${problems.length ? 'FAIL' : 'PASS'}`);
for (const p of problems) {
  console.log(`  - ${p}`);
}
if (!keep) {
  rmSync(tmp, {recursive: true, force: true});
}
process.exit(problems.length ? 1 : 0);
