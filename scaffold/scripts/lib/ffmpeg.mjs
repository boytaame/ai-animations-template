/**
 * ffmpeg/ffprobe helpers shared by every QA script.
 * Windows-safe: spawns without a shell, and always runs filters from a working
 * directory with relative filenames (a drive-letter path breaks filter syntax).
 */
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';

const WINDOWS_HELP = `
ffmpeg was not found on PATH.

Install it on Windows (any one of these):
  1. winget install Gyan.FFmpeg
  2. choco install ffmpeg
  3. Download a build from https://www.gyan.dev/ffmpeg/builds/ , unzip it, and add
     the \\bin folder to your PATH (then reopen the terminal).

Verify with:  ffmpeg -version
`;

export const run = (bin, args, opts = {}) => {
  const result = spawnSync(bin, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });
  if (result.error) {
    throw new Error(`${bin} failed to start: ${result.error.message}`);
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
};

export const hasBinary = (bin) => {
  const probe = spawnSync(bin, ['-version'], {encoding: 'utf8'});
  return !probe.error && probe.status === 0;
};

export const requireFfmpeg = () => {
  if (!hasBinary('ffmpeg') || !hasBinary('ffprobe')) {
    console.error(WINDOWS_HELP);
    process.exit(1);
  }
};

export const probe = (file) => {
  if (!existsSync(file)) {
    throw new Error(`File not found: ${file}`);
  }
  const out = run('ffprobe', [
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_streams',
    '-show_format',
    file,
  ]);
  if (out.status !== 0) {
    throw new Error(`ffprobe failed:\n${out.stderr}`);
  }
  return JSON.parse(out.stdout);
};

export const videoStream = (info) => info.streams.find((s) => s.codec_type === 'video');
export const audioStream = (info) => info.streams.find((s) => s.codec_type === 'audio');

/** Frame-accurate count when the container reports it, otherwise derived. */
export const frameCount = (info) => {
  const v = videoStream(info);
  const nb = Number(v?.nb_frames);
  if (Number.isFinite(nb) && nb > 0) {
    return nb;
  }
  const [num, den] = String(v?.avg_frame_rate ?? '30/1')
    .split('/')
    .map(Number);
  const fps = den ? num / den : 30;
  return Math.round(Number(info.format?.duration ?? 0) * fps);
};

export const parseFps = (info) => {
  const rate = String(videoStream(info)?.avg_frame_rate ?? '30/1');
  const [num, den] = rate.split('/').map(Number);
  return den ? num / den : 30;
};

export const realBitrateMbps = (info) => {
  const bits = Number(info.format?.bit_rate ?? 0);
  return (bits / 1_000_000).toFixed(2);
};

export {WINDOWS_HELP};
