/**
 * Voiceover mastering (spec 7.1): trim leading/trailing silence, normalise to
 * about -16 LUFS with peaks under -1 dBTP, export 48 kHz mono WAV.
 *
 *   node scripts/prepare-audio.mjs --in voiceover-raw.mp3 --out public/audio/voiceover.wav
 *
 * Run this BEFORE make-captions.mjs: alignments must come from the exact file
 * that gets rendered. If you change the audio afterwards, regenerate timings.
 */
import {existsSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {audioStream, probe, requireFfmpeg, run, WINDOWS_HELP} from './lib/ffmpeg.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

requireFfmpeg();

const input = arg('in', 'voiceover-raw.wav');
const output = arg('out', 'public/audio/voiceover.wav');
const targetLufs = Number(arg('lufs', -16));

if (!existsSync(input)) {
  console.error(`Input not found: ${input}\n${WINDOWS_HELP}`);
  process.exit(1);
}
mkdirSync(path.dirname(output), {recursive: true});

// Trim silence at both ends, then loudness-normalise. areverse is applied so the
// same silenceremove handles the tail, then reversed back.
const filter = [
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05',
  'areverse',
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05',
  'areverse',
  `loudnorm=I=${targetLufs}:TP=-1.5:LRA=11`,
].join(',');

const result = run('ffmpeg', [
  '-y',
  '-i',
  input,
  '-af',
  filter,
  '-ar',
  '48000',
  '-ac',
  '1',
  '-c:a',
  'pcm_s16le',
  output,
]);

if (result.status !== 0) {
  console.error(result.stderr.split('\n').slice(-12).join('\n'));
  process.exit(1);
}

const info = probe(output);
const audio = audioStream(info);
console.log(`Wrote ${output}`);
console.log(`  duration ${Number(info.format.duration).toFixed(2)} s · ${audio?.sample_rate} Hz · ${audio?.channels} ch`);
console.log('\nNow regenerate caption timings from THIS file:');
console.log('  node --import tsx scripts/make-captions.mjs --script src/videos/<slug>/script.json --out src/videos/<slug>/captions.json --alignment <file>');
