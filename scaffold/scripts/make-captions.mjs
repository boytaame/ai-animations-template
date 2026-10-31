/**
 * Caption timing pipeline (spec 8.4). One command, Windows-safe.
 *
 *   node --import tsx scripts/make-captions.mjs --script src/videos/demo/script.json \
 *     --out src/videos/demo/captions.json [--alignment alignment.json] [--whisper] [--estimated]
 *
 * Timing priority:
 *   1. Provider word/character alignment (ElevenLabs, edge-tts/Azure, or our own
 *      passthrough shape) — adapters normalise units and are asserted.
 *   2. Whisper via @remotion/install-whisper-cpp on a temporary 16 kHz mono copy.
 *   3. `estimated` — flagged, only for a video whose audio does not exist yet.
 *
 * The displayed text is always the SCRIPT. Speech-to-text is used for timing only.
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import path from 'node:path';
import {normalizeText, displayWords} from '../src/kit/captions/normalize.ts';
import {
  applyTimings,
  buildSyncReport,
  estimatedTimings,
  normaliseAlignment,
} from './lib/alignment.mjs';
import {probe, requireFfmpeg, run} from './lib/ffmpeg.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback = undefined) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) {
    return fallback;
  }
  const next = args[i + 1];
  return next && !next.startsWith('--') ? next : true;
};
const has = (name) => args.includes(`--${name}`);

const scriptPath = path.resolve(arg('script', 'src/videos/demo/script.json'));
const outPath = path.resolve(arg('out', 'src/videos/demo/captions.json'));
const offsetMs = Number(arg('offset', 0));
const model = String(arg('model', 'small.en'));
const WHISPER_VERSION = String(arg('whisper-version', '1.5.5'));

if (!existsSync(scriptPath)) {
  console.error(`Script not found: ${scriptPath}`);
  process.exit(1);
}
requireFfmpeg();

const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
const narration =
  script.narration ??
  (Array.isArray(script.beats) ? script.beats.map((b) => b.text).join(' ') : '');
if (!narration.trim()) {
  console.error('script.json needs a `narration` string or `beats: [{ text }]`.');
  process.exit(1);
}

const audioRel =
  arg('audio') ??
  (script.voiceover && script.voiceover.file
    ? path.join('public', script.voiceover.file)
    : path.join('public', 'audio', 'voiceover.wav'));
const audioPath = path.resolve(String(audioRel).startsWith('public') ? String(audioRel) : path.join('public', String(audioRel)));
const audioExists = existsSync(audioPath);

let audioDurationMs = 0;
if (audioExists) {
  try {
    const info = probe(audioPath);
    audioDurationMs = Math.round(Number(info.format.duration) * 1000);
  } catch (error) {
    console.warn(`Could not probe audio: ${error.message}`);
  }
}

const scriptWords = displayWords(narration);
const scriptTokens = normalizeText(narration);

const alignmentArg = arg('alignment', script.alignment);
const alignmentPath = alignmentArg ? path.resolve(String(alignmentArg)) : null;

let words;
let timingSource;
let transcriptWords = [];
let unmatched = [];
let unitNote = '';

if (alignmentPath && existsSync(alignmentPath)) {
  const raw = JSON.parse(readFileSync(alignmentPath, 'utf8'));
  const normalised = normaliseAlignment(raw);
  transcriptWords = normalised.words;
  unitNote = `units: ${normalised.unit} (${normalised.source})`;
  const applied = applyTimings(scriptWords, transcriptWords);
  words = applied.words;
  unmatched = applied.unmatched;
  timingSource = 'tts-alignment';
  console.log(`Alignment: ${transcriptWords.length} transcript words from ${alignmentPath} — ${unitNote}`);
} else if (has('whisper')) {
  console.log('Whisper: installing whisper.cpp (first run downloads the binary and model)...');
  const {
    installWhisperCpp,
    downloadWhisperModel,
    transcribe,
    toCaptions,
  } = await import('@remotion/install-whisper-cpp');
  const whisperPath = path.join(process.cwd(), 'whisper.cpp');
  if (!audioExists) {
    console.error('Whisper needs the audio file. Record it first.');
    process.exit(1);
  }
  await installWhisperCpp({to: whisperPath, version: WHISPER_VERSION, printOutput: true});
  await downloadWhisperModel({
    model,
    folder: path.join(whisperPath, 'models'),
    printOutput: true,
  });
  const tempWav = path.join(whisperPath, 'audio-16k.wav');
  const convert = run('ffmpeg', ['-y', '-i', audioPath, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', tempWav]);
  if (convert.status !== 0) {
    console.error(convert.stderr);
    process.exit(1);
  }
  const json = await transcribe({
    inputPath: tempWav,
    whisperPath,
    whisperCppVersion: WHISPER_VERSION,
    model,
    modelFolder: path.join(whisperPath, 'models'),
    tokenLevelTimestamps: true,
    language: 'en',
    printOutput: false,
  });
  rmSync(tempWav, {force: true});
  const {captions: whisperCaptions} = toCaptions({whisperCppOutput: json});
  transcriptWords = whisperCaptions
    .map((c) => ({text: c.text.trim(), startMs: c.startMs, endMs: c.endMs}))
    .filter((c) => c.text.length > 0);
  const applied = applyTimings(scriptWords, transcriptWords);
  words = applied.words;
  unmatched = applied.unmatched;
  timingSource = 'whisper';
  unitNote = `model: ${model}`;
  console.log(`Whisper: ${transcriptWords.length} transcript words (${model})`);
} else {
  if (!has('estimated')) {
    console.warn(
      '\nNo alignment given and --whisper not requested.\n' +
        'Falling back to ESTIMATED timings. These are not synced captions (spec 8.4 step 5).\n',
    );
  }
  // With no audio, fit the estimate to the script's shot list so the text lands
  // on the cuts; with audio, spread it over the real runtime.
  const fps = script.fps ?? 30;
  const videoDurationMs = Array.isArray(script.shots)
    ? Math.max(...script.shots.map((s) => ((s.from + s.durationInFrames) / fps) * 1000))
    : 0;
  const targetMs = audioDurationMs > 0 ? audioDurationMs : videoDurationMs;
  words = estimatedTimings(scriptWords, targetMs);
  timingSource = 'estimated';
  unitNote = `estimated${targetMs > 0 ? ` over ${Math.round(targetMs)} ms of runtime` : ' from character counts'}`;
}

if (words.length !== scriptWords.length) {
  console.error(`Fatal: ${words.length} timed words vs ${scriptWords.length} script words.`);
  process.exit(1);
}

const payload = {
  audioFile: path.relative(path.join(process.cwd(), 'public'), audioPath).split(path.sep).join('/'),
  audioDurationMs,
  timingSource,
  offsetMs,
  words,
};

mkdirSync(path.dirname(outPath), {recursive: true});
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const report = buildSyncReport({
  words,
  timingSource,
  audioDurationMs,
  transcriptWords,
  unmatched,
  offsetMs,
});

console.log('\n=== Caption sync report (spec 8.7) ===');
console.log(`file                 ${path.relative(process.cwd(), outPath)}`);
console.log(`audio                ${payload.audioFile} ${audioExists ? '' : '(missing — timings are estimated)'}`);
console.log(`timing source        ${report.timingSource}  ${unitNote}`);
console.log(`word count           ${report.wordCount} displayed / ${scriptTokens.length} script tokens`);
console.log(`transcript words     ${report.transcriptWordCount}`);
console.log(`audio duration       ${report.audioDurationMs} ms`);
console.log(`last word end        ${report.lastWordEndMs} ms  (delta ${report.audioVsLastWordMs} ms)`);
console.log(`CAPTION_OFFSET_MS    ${report.offsetMs}`);
console.log(`order monotonic      ${report.orderOk ? 'yes' : 'NO — fix before rendering'}`);
console.log(`words < 60 ms        ${report.shortWords.length ? report.shortWords.join(', ') : 'none'}`);
console.log(`words > 1.5 s        ${report.longWords.length ? report.longWords.join(', ') : 'none'}`);
console.log(
  `unmatched script     ${report.unmatchedScriptWords.length ? report.unmatchedScriptWords.join(', ') : 'none'}`,
);
if (audioDurationMs > 0 && (report.audioVsLastWordMs > 300 || report.audioVsLastWordMs < -150)) {
  console.warn(
    'WARNING: the audio and the timings disagree by more than ~300 ms. Re-check that the timings were made from this exact file (spec 8.4 step 1).',
  );
}
if (!report.orderOk) {
  process.exit(1);
}
