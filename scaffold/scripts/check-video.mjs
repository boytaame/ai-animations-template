/**
 * Output verification with ffprobe (spec 3.6):
 * 1080x1920, 30 fps, yuv420p, frame count == round(duration * 30), and the real
 * video bitrate reported (expected roughly 10-15 Mbps on detailed scenes).
 *
 *   node scripts/check-video.mjs out/final.mp4
 *   node scripts/check-video.mjs out/draft.mp4 --draft     (540x960, any bitrate)
 */
import {probe, frameCount, parseFps, realBitrateMbps, requireFfmpeg, videoStream, audioStream} from './lib/ffmpeg.mjs';

requireFfmpeg();

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('--')) ?? 'out/final.mp4';
const draft = args.includes('--draft');

const info = probe(input);
const v = videoStream(info);
const audio = audioStream(info);
const fps = parseFps(info);
const frames = frameCount(info);
const duration = Number(info.format.duration);
const expectedW = draft ? 540 : 1080;
const expectedH = draft ? 960 : 1920;
const expectedFrames = Math.round(duration * fps);

const checks = [
  {name: 'width', ok: Number(v.width) === expectedW, got: v.width, want: expectedW},
  {name: 'height', ok: Number(v.height) === expectedH, got: v.height, want: expectedH},
  {name: 'fps', ok: Math.abs(fps - 30) < 0.01, got: fps.toFixed(3), want: 30},
  {name: 'pixel format', ok: v.pix_fmt === 'yuv420p', got: v.pix_fmt, want: 'yuv420p'},
  {
    name: 'frame count',
    ok: Math.abs(frames - expectedFrames) <= 1,
    got: frames,
    want: expectedFrames,
  },
  {name: 'video codec', ok: v.codec_name === 'h264', got: v.codec_name, want: 'h264'},
  {
    name: 'audio codec',
    ok: audio ? audio.codec_name === 'aac' : draft,
    got: audio ? audio.codec_name : 'none',
    want: 'aac',
  },
];

const bitrate = realBitrateMbps(info);
console.log(`=== ffprobe report: ${input} ===`);
for (const c of checks) {
  console.log(`${c.ok ? 'ok  ' : 'FAIL'}  ${c.name.padEnd(13)} ${c.got}  (want ${c.want})`);
}
console.log(`      duration      ${duration.toFixed(3)} s · ${frames} frames`);
console.log(`      real bitrate  ${bitrate} Mbps`);
if (audio) {
  console.log(`      audio         ${audio.codec_name} ${audio.sample_rate} Hz ${audio.channels} ch ${Math.round(Number(audio.bit_rate) / 1000)} kbps`);
}

if (!draft) {
  if (Number(bitrate) < 8) {
    console.log('WARN   bitrate below 8 Mbps: drop to --crf=14 or use --video-bitrate=12M if fine detail shimmers.');
  }
  if (v.pix_fmt !== 'yuv420p') {
    console.log('Hint: pass --pixel-format=yuv420p (a yuvj420p render shows shifted contrast in some players).');
  }
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${failed.length ? 'FAIL' : 'PASS'}`);
process.exit(failed.length ? 1 : 0);
