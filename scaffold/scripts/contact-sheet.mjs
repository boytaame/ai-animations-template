/**
 * Contact sheet (spec 4.10): one frame per ~1.5 s, tiled into a single PNG.
 *
 *   node scripts/contact-sheet.mjs out/draft.mp4 out/contact-sheet.png [--interval 1.5]
 */
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {probe, requireFfmpeg, run} from './lib/ffmpeg.mjs';

requireFfmpeg();

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--') && Number.isNaN(Number(a)));
const input = positional[0] ?? 'out/draft.mp4';
const output = positional[1] ?? 'out/contact-sheet.png';
const interval = Number(
  args.includes('--interval') ? args[args.indexOf('--interval') + 1] : 1.5,
);

const info = probe(input);
const duration = Number(info.format.duration);
const total = Math.max(1, Math.ceil(duration / interval));
const cols = 4;
const rows = Math.ceil(total / cols);

mkdirSync(path.dirname(output), {recursive: true});

// fps=1/interval samples evenly; tile pads missing cells with black.
const filter = `fps=1/${interval},scale=270:480:flags=lanczos,tile=${cols}x${rows}`;
const res = run('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-vf', filter, '-frames:v', '1', output]);

if (res.status !== 0) {
  console.error(res.stderr);
  process.exit(1);
}

console.log(`Wrote ${output}`);
console.log(`  ${total} frames (one every ${interval}s) · ${duration.toFixed(1)}s source · ${cols}x${rows} grid`);
console.log('  Look for: empty/flat frames, crushed blacks, continuity across cuts, caption spacing.');
