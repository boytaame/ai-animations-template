/**
 * Determinism check (spec 3.2): render frame N, then frame M, then frame N again.
 * The two frame-N PNGs must be byte-identical.
 *
 *   node scripts/check-determinism.mjs [--composition Demo] [--frames 40,120]
 */
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, rmSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

const composition = arg('composition', 'Demo');
const frames = String(arg('frames', '40,120'))
  .split(',')
  .map((n) => Number(n.trim()))
  .filter((n) => Number.isFinite(n));
const entry = arg('entry', 'src/index.ts');
const outDir = path.resolve('out', 'determinism');

if (frames.length < 2) {
  console.error('Need two frames: --frames 40,120');
  process.exit(1);
}

mkdirSync(outDir, {recursive: true});
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const renderStill = (frame, file) => {
  const res = spawnSync(
    npx,
    ['remotion', 'still', entry, composition, file, `--frame=${frame}`, '--gl=angle', '--log=error'],
    {encoding: 'utf8', stdio: 'pipe'},
  );
  if (res.status !== 0) {
    console.error(`Render failed for frame ${frame}:\n${res.stdout}\n${res.stderr}`);
    process.exit(1);
  }
};

const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

const [a, b] = frames;
const first = path.join(outDir, `frame-${a}-first.png`);
const other = path.join(outDir, `frame-${b}.png`);
const second = path.join(outDir, `frame-${a}-second.png`);

console.log(`Determinism: ${composition} frame ${a} → frame ${b} → frame ${a}`);
renderStill(a, first);
const hash1 = sha(first);
renderStill(b, other);
renderStill(a, second);
const hash2 = sha(second);

console.log(`  frame ${a} first : ${hash1}`);
console.log(`  frame ${a} again : ${hash2}`);
if (hash1 === hash2) {
  console.log('\nPASS — byte-identical. The scene is a pure function of the frame.');
  rmSync(other, {force: true});
  rmSync(second, {force: true});
  process.exit(0);
}
console.log('\nFAIL — the two renders of the same frame differ.');
console.log('Look for: useFrame, Math.random, Date.now, a timer, a fetched asset, a helper');
console.log('that reads the previous frame, or a texture/geometry rebuilt per render.');
console.log(`Keep both files for comparison: ${first} vs ${second}`);
process.exit(1);
