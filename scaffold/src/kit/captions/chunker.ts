/**
 * Caption chunking (spec 8.6). Pure functions of the word list — unit tested.
 *
 * Rules:
 *  - 2-4 words per chunk (up to 5 only when a weak-word fix requires it)
 *  - never end a chunk on a weak word ("twelve kilometers of the" is banned)
 *  - break at punctuation and phrase boundaries when possible
 *  - a chunk stays visible until the next chunk starts (hold through gaps)
 *  - minimum ~350 ms: shorter chunks merge forward
 *  - max 2 lines: hard cap on characters per chunk
 */

export type WordSpan = {text: string; startMs: number; endMs: number};

export type CaptionChunk = {
  words: WordSpan[];
  startMs: number;
  /** End of the hold; equals the next chunk's start when chunks are adjacent. */
  endMs: number;
};

export type ChunkerOptions = {
  maxWords?: number;
  minWords?: number;
  /** Characters per chunk (about two 64-84 px lines in a 920 px safe width). */
  maxChars?: number;
  minDurationMs?: number;
  /** Last chunk holds this long after its final word. */
  tailMs?: number;
  weakWords?: readonly string[];
};

export const WEAK_WORDS = [
  'a',
  'an',
  'the',
  'of',
  'to',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'for',
  'with',
  'from',
  'by',
  'as',
  'is',
  'are',
  'was',
  'were',
  'be',
  'it',
  'its',
  "it's",
  'that',
  'this',
  'these',
  'those',
  'my',
  'your',
  'our',
  'their',
  'his',
  'her',
  'than',
  'then',
  'so',
  'if',
] as const;

const DEFAULTS: Required<ChunkerOptions> = {
  maxWords: 4,
  minWords: 2,
  maxChars: 34,
  minDurationMs: 350,
  tailMs: 400,
  weakWords: WEAK_WORDS,
};

const END_PUNCT = /[.!?,;:—–)]$/;

export const isWeakWord = (word: string, weakWords: readonly string[] = WEAK_WORDS): boolean =>
  weakWords.includes(word.toLowerCase().replace(/[^\w']/g, ''));

const chunkChars = (words: WordSpan[]): number =>
  words.reduce((sum, w) => sum + w.text.length, 0) + Math.max(0, words.length - 1);

/** Greedy grouping into chunks with a preference for punctuation breaks. */
const group = (words: readonly WordSpan[], opts: Required<ChunkerOptions>): WordSpan[][] => {
  const out: WordSpan[][] = [];
  let current: WordSpan[] = [];

  const flush = () => {
    if (current.length) {
      out.push(current);
      current = [];
    }
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    current.push(word);
    const next = words[i + 1];
    const nextChars = chunkChars(current) + 1 + (next ? next.text.length : 0);
    const endedPhrase = END_PUNCT.test(word.text);
    const gapAfter = next ? next.startMs - word.endMs : Infinity;
    const duration = word.endMs - current[0].startMs;

    const shouldBreak =
      !next ||
      current.length >= opts.maxWords ||
      endedPhrase ||
      nextChars > opts.maxChars ||
      gapAfter > 320 ||
      duration > 2100;

    if (shouldBreak) {
      flush();
    }
  }
  flush();

  // A chunk must not end on a weak word: keep moving the tail forward until the
  // ending is strong, then drop any now-stray single word back into the previous.
  for (let c = 0; c < out.length - 1; c++) {
    let guard = 0;
    while (
      out[c].length > 1 &&
      isWeakWord(out[c][out[c].length - 1].text, opts.weakWords) &&
      guard++ < 5
    ) {
      const moved = out[c].pop();
      if (!moved) {
        break;
      }
      out[c + 1].unshift(moved);
    }
    if (out[c].length === 1 && c > 0 && out[c - 1].length <= opts.maxWords + 1) {
      out[c - 1].push(...out[c]);
      out[c] = [];
    }
  }

  // Merge chunks that are too short (minimum ~350 ms per chunk).
  const merged: WordSpan[][] = [];
  for (const chunk of out) {
    if (chunk.length === 0) {
      continue;
    }
    const prev = merged[merged.length - 1];
    const duration = chunk[chunk.length - 1].endMs - chunk[0].startMs;
    const tooShort = duration < opts.minDurationMs;
    if (prev && tooShort && prev.length + chunk.length <= opts.maxWords + 1) {
      prev.push(...chunk);
    } else {
      merged.push([...chunk]);
    }
  }
  return merged.filter((c) => c.length > 0);
};

/**
 * Build display chunks: group the words, then apply hold timing.
 * `endMs` runs to the next chunk's start so the highlight never goes dark
 * through a short pause (spec 8.4 step 6).
 */
export const chunkWords = (
  words: readonly WordSpan[],
  options: ChunkerOptions = {},
): CaptionChunk[] => {
  const opts = {...DEFAULTS, ...options};
  if (words.length === 0) {
    return [];
  }
  const groups = group(words, opts);
  return groups.map((chunk, i) => {
    const next = groups[i + 1];
    const startMs = chunk[0].startMs;
    const lastEnd = chunk[chunk.length - 1].endMs;
    const endMs = next ? Math.max(next[0].startMs, lastEnd + 1) : lastEnd + opts.tailMs;
    return {words: chunk, startMs, endMs};
  });
};

/** Chunk that should be on screen at `ms` (holds the last one at the end). */
export const chunkAt = (chunks: readonly CaptionChunk[], ms: number): number => {
  if (chunks.length === 0) {
    return -1;
  }
  if (ms < chunks[0].startMs) {
    return -1;
  }
  for (let i = chunks.length - 1; i >= 0; i--) {
    if (ms >= chunks[i].startMs) {
      return i;
    }
  }
  return -1;
};

/** Integrity check used by tests and by the captions script. */
export const chunkText = (chunk: CaptionChunk): string => chunk.words.map((w) => w.text).join(' ');
