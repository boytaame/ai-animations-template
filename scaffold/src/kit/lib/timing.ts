/**
 * Timing helpers (spec 8.5). One place converts milliseconds to frames.
 * Everything is a pure function of numbers: safe outside Remotion (unit tests).
 */

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/**
 * Global calibration shift for every caption (positive = later).
 * Never fix per-word sync by editing words (spec 8.5).
 */
export const CAPTION_OFFSET_MS = 0;

export type WordSpan = {text: string; startMs: number; endMs: number};

export const msToFrame = (ms: number, fps: number = FPS): number =>
  Math.round((ms / 1000) * fps);

export const frameToMs = (frame: number, fps: number = FPS): number => (frame / fps) * 1000;

export const secToFrame = (sec: number, fps: number = FPS): number => Math.round(sec * fps);

export const frameToSec = (frame: number, fps: number = FPS): number => frame / fps;

/** Absolute audio time for a (possibly local) frame inside a Sequence. */
export const absoluteMs = (
  frame: number,
  fps: number = FPS,
  options: {sequenceFrom?: number; offsetMs?: number} = {},
): number => {
  const {sequenceFrom = 0, offsetMs = CAPTION_OFFSET_MS} = options;
  return frameToMs(frame + sequenceFrom, fps) + offsetMs;
};

/** Seconds elapsed inside a shot/Sequence — feed this to animation functions. */
export const localSec = (frame: number, fps: number = FPS): number => frame / fps;

/** Hold the last word's highlight through the following pause instead of going dark. */
export const activeWordIndex = (words: readonly WordSpan[], ms: number): number => {
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (ms >= w.startMs && ms < w.endMs) {
      return i;
    }
  }
  // Between words (a real pause): keep the previous word lit, never the next.
  let last = -1;
  for (let i = 0; i < words.length; i++) {
    if (words[i].startMs <= ms) {
      last = i;
    }
  }
  return last;
};

export const lastWordEndMs = (words: readonly WordSpan[]): number =>
  words.reduce((max, w) => Math.max(max, w.endMs), 0);

export const totalDurationFrames = (
  words: readonly WordSpan[],
  fps: number = FPS,
  tailMs = 700,
): number => Math.max(msToFrame(lastWordEndMs(words) + tailMs, fps), fps);
