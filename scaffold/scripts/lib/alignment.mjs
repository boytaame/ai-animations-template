/**
 * Alignment: provider JSON adapters, sequence alignment, timing interpolation,
 * gap closing. Used by scripts/make-captions.mjs and unit-tested via fixtures.
 */
import {normalizeToken} from '../../src/kit/captions/normalize.ts';

const MAX_GAP_MS = 200;
const MIN_WORD_MS = 60;

/* ------------------------------------------------------------------ */
/* Adapters: normalise provider timing JSON to { text, startMs, endMs } */
/* ------------------------------------------------------------------ */

const looksLikeMs = (maxTime) => maxTime > 1000;
const looksLikeTicks = (maxOffset) => maxOffset > 1_000_000; // 100 ns units

const groupCharacters = (chars, starts, ends, scale) => {
  const words = [];
  let current = '';
  let start = null;
  let end = null;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (/\s/.test(ch)) {
      if (current) {
        words.push({text: current, startMs: start * scale, endMs: end * scale});
        current = '';
        start = null;
        end = null;
      }
      continue;
    }
    if (start === null) {
      start = starts[i];
    }
    current += ch;
    end = ends[i];
  }
  if (current && start !== null) {
    words.push({text: current, startMs: start * scale, endMs: end * scale});
  }
  return words;
};

/**
 * Detect and normalise a provider alignment file.
 * Supported shapes:
 *  - ElevenLabs: { characters | alignment: { characters, character_start_times_seconds,
 *    character_end_times_seconds } }  (seconds; ms detected if the max value is huge)
 *  - edge-tts / Azure word boundaries: [{ text, offset, duration }] in 100 ns ticks,
 *    or [{ text, startMs, endMs }] already in milliseconds
 *  - our own passthrough: { words: [{ text, startMs, endMs }] }
 */
export const normaliseAlignment = (raw) => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Alignment file is empty or not JSON');
  }

  // Passthrough
  if (Array.isArray(raw.words)) {
    const words = raw.words.map((w) => ({
      text: String(w.text),
      startMs: Number(w.startMs ?? w.start_ms ?? 0),
      endMs: Number(w.endMs ?? w.end_ms ?? 0),
    }));
    return {words, unit: 'ms', source: 'passthrough'};
  }

  // ElevenLabs
  const align = raw.alignment ?? raw.normalized_alignment ?? raw;
  if (Array.isArray(align.characters)) {
    const starts = align.character_start_times_seconds ?? align.character_start_times_ms;
    const ends = align.character_end_times_seconds ?? align.character_end_times_ms;
    if (!Array.isArray(starts) || !Array.isArray(ends)) {
      throw new Error('ElevenLabs alignment needs character_start/end_times');
    }
    if (starts.length !== align.characters.length || ends.length !== align.characters.length) {
      throw new Error('ElevenLabs alignment arrays have different lengths');
    }
    const maxTime = Math.max(...ends.filter((n) => Number.isFinite(n)));
    const unit = looksLikeMs(maxTime) ? 'ms' : 's';
    const scale = unit === 'ms' ? 1 : 1000;
    return {
      words: groupCharacters(align.characters, starts, ends, scale),
      unit,
      source: 'elevenlabs',
    };
  }

  // edge-tts / Azure word boundaries (array, or { words: [...] } already handled)
  const list = Array.isArray(raw) ? raw : Array.isArray(raw.boundaries) ? raw.boundaries : null;
  if (list) {
    const maxOffset = Math.max(
      ...list.map((w) => Number(w.offset ?? w.start ?? w.startMs ?? 0)),
      0,
    );
    const ticks = looksLikeTicks(maxOffset);
    const words = list.map((w) => {
      if (w.startMs !== undefined) {
        return {text: String(w.text), startMs: Number(w.startMs), endMs: Number(w.endMs)};
      }
      const offset = Number(w.offset ?? w.start ?? 0);
      const duration = Number(w.duration ?? 0);
      if (ticks) {
        return {text: String(w.text), startMs: offset / 10_000, endMs: (offset + duration) / 10_000};
      }
      return {text: String(w.text), startMs: offset, endMs: offset + duration};
    });
    return {words, unit: ticks ? '100ns' : 'ms', source: 'edge-tts'};
  }

  throw new Error(
    'Unrecognised alignment JSON. Expected ElevenLabs character alignment, edge-tts word boundaries, or { words: [{ text, startMs, endMs }] }.',
  );
};

/* ------------------------------------------------------------------ */
/* Sequence alignment                                                  */
/* ------------------------------------------------------------------ */

/**
 * Longest-common-subsequence alignment of script tokens to transcript tokens.
 * Returns, for each script token, the matched transcript index or -1.
 */
export const alignTokens = (script, transcript) => {
  const n = script.length;
  const m = transcript.length;
  const map = new Array(n).fill(-1);
  if (n === 0 || m === 0) {
    return map;
  }
  // Rolling two-row DP keeps memory small; the traceback needs the full table,
  // so store direction bits only (1 = diagonal, 2 = up, 3 = left).
  const dirs = new Uint8Array((n + 1) * (m + 1));
  let prev = new Uint32Array(m + 1);
  let cur = new Uint32Array(m + 1);
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (script[i - 1] === transcript[j - 1]) {
        cur[j] = prev[j - 1] + 1;
        dirs[i * (m + 1) + j] = 1;
      } else if (prev[j] >= cur[j - 1]) {
        cur[j] = prev[j];
        dirs[i * (m + 1) + j] = 2;
      } else {
        cur[j] = cur[j - 1];
        dirs[i * (m + 1) + j] = 3;
      }
    }
    const swap = prev;
    prev = cur;
    cur = swap;
    cur.fill(0);
  }

  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const d = dirs[i * (m + 1) + j];
    if (d === 1) {
      map[i - 1] = j - 1;
      i--;
      j--;
    } else if (d === 2) {
      i--;
    } else {
      j--;
    }
  }
  return map;
};

/**
 * Copy transcript timings onto the script words, interpolate runs of unmatched
 * words between anchors, then close gaps under 200 ms (spec 8.4 step 3 and 6).
 */
export const applyTimings = (scriptWords, transcriptWords) => {
  const scriptTokens = scriptWords.map(normalizeToken);
  const transcriptTokens = transcriptWords.map((w) => normalizeToken(w.text));
  const map = alignTokens(scriptTokens, transcriptTokens);

  const times = scriptWords.map((word, i) => {
    const hit = map[i];
    if (hit >= 0) {
      return {text: word, startMs: transcriptWords[hit].startMs, endMs: transcriptWords[hit].endMs};
    }
    return {text: word, startMs: null, endMs: null};
  });

  const matchedCount = times.filter((t) => t.startMs !== null).length;

  // Interpolate unmatched runs between known anchors.
  let i = 0;
  while (i < times.length) {
    if (times[i].startMs !== null) {
      i++;
      continue;
    }
    let end = i;
    while (end < times.length && times[end].startMs === null) {
      end++;
    }
    const prev = i > 0 ? times[i - 1].endMs : 0;
    const next = end < times.length ? times[end].startMs : prev + 300 * (end - i);
    const span = Math.max(next - prev, 80 * (end - i));
    const weights = times.slice(i, end).map((t) => Math.max(1, t.text.length));
    const total = weights.reduce((a, b) => a + b, 0);
    let cursor = prev;
    for (let k = i; k < end; k++) {
      const share = (weights[k - i] / total) * span;
      times[k].startMs = cursor;
      times[k].endMs = cursor + share;
      cursor += share;
    }
    i = end;
  }

  // Close short gaps so the highlight never goes dark mid-phrase.
  for (let k = 0; k < times.length - 1; k++) {
    if (times[k + 1].startMs - times[k].endMs < MAX_GAP_MS) {
      times[k].endMs = times[k + 1].startMs;
    }
  }
  // Guarantee a minimum visible duration.
  for (let k = 0; k < times.length; k++) {
    if (times[k].endMs - times[k].startMs < MIN_WORD_MS) {
      times[k].endMs = times[k].startMs + MIN_WORD_MS;
    }
  }

  return {
    words: times.map((t) => ({
      text: t.text,
      startMs: Math.round(t.startMs),
      endMs: Math.round(t.endMs),
    })),
    matchedCount,
    unmatched: times
      .map((t, idx) => ({idx, text: t.text, matched: map[idx] >= 0}))
      .filter((t) => !t.matched)
      .map((t) => t.text),
  };
};

/** Even timing when no audio exists yet. Clearly flagged as estimated. */
export const estimatedTimings = (scriptWords, durationMs, wordsPerMinute = 165) => {
  const total = durationMs > 0 ? durationMs : Math.round((scriptWords.length / wordsPerMinute) * 60_000);
  const weights = scriptWords.map((w) => Math.max(2, w.length));
  const sum = weights.reduce((a, b) => a + b, 0);
  let cursor = 60;
  return scriptWords.map((word, i) => {
    const span = ((weights[i] / sum) * (total - 120));
    const startMs = Math.round(cursor);
    cursor += span;
    return {text: word, startMs, endMs: Math.round(cursor - 20)};
  });
};

/** Sync report fields from spec 8.7. */
export const buildSyncReport = ({
  words,
  timingSource,
  audioDurationMs,
  transcriptWords,
  unmatched,
  offsetMs,
}) => {
  const lastEnd = words.reduce((max, w) => Math.max(max, w.endMs), 0);
  const short = words.filter((w) => w.endMs - w.startMs < 60);
  const long = words.filter((w) => w.endMs - w.startMs > 1500);
  const speakable = transcriptWords
    ? transcriptWords.filter((w) => normalizeToken(w.text).length > 0)
    : [];
  return {
    wordCount: words.length,
    timingSource,
    audioDurationMs: Math.round(audioDurationMs),
    lastWordEndMs: lastEnd,
    audioVsLastWordMs: Math.round(audioDurationMs - lastEnd),
    shortWords: short.map((w) => `${w.text} (${w.endMs - w.startMs}ms)`),
    longWords: long.map((w) => `${w.text} (${w.endMs - w.startMs}ms)`),
    unmatchedScriptWords: unmatched,
    transcriptWordCount: speakable.length,
    offsetMs,
    orderOk: words.every((w, i) => i === 0 || w.startMs >= words[i - 1].startMs),
  };
};
