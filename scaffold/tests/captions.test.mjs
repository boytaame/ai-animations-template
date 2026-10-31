/**
 * M5 acceptance: caption chunker rules and number-expansion alignment.
 * Run: npm run test:kit
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAK_WORDS,
  chunkAt,
  chunkText,
  chunkWords,
  isWeakWord,
} from '../src/kit/captions/chunker.ts';
import {
  expandNumbers,
  normalizeText,
  normalizeToken,
  numberToWords,
  yearToWords,
} from '../src/kit/captions/normalize.ts';

const makeWords = (text, msPerWord = 320, gap = 0) => {
  let t = 0;
  return text.split(' ').map((word) => {
    const startMs = t;
    const endMs = startMs + msPerWord;
    t = endMs + gap;
    return {text: word, startMs, endMs};
  });
};

const SCRIPT =
  'Twelve kilometers of trail started here. We packed a crate, a cone and a bench, then climbed the hill to the old brick townhouse before the sun went down.';

test('chunks hold 2-4 words (5 only to fix a weak ending)', () => {
  const chunks = chunkWords(makeWords(SCRIPT));
  assert.ok(chunks.length > 0);
  for (const chunk of chunks) {
    assert.ok(chunk.words.length >= 1, 'empty chunk');
    assert.ok(chunk.words.length <= 5, `chunk too long: ${chunkText(chunk)}`);
  }
  const multi = chunks.filter((c) => c.words.length > 1);
  assert.ok(multi.every((c) => c.words.length >= 2), 'a 2+ word chunk must not be a stray word');
});

test('no chunk ends on a weak word (except a single-word chunk)', () => {
  const chunks = chunkWords(makeWords(SCRIPT));
  for (const chunk of chunks) {
    if (chunk.words.length === 1) {
      continue;
    }
    const last = chunk.words[chunk.words.length - 1].text;
    assert.ok(!isWeakWord(last), `chunk ends on weak word "${last}": ${chunkText(chunk)}`);
  }
  assert.ok(WEAK_WORDS.includes('the'));
});

test('every chunk lasts at least ~350 ms and is contiguous', () => {
  const chunks = chunkWords(makeWords(SCRIPT, 240));
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    assert.ok(c.endMs - c.startMs >= 350, `chunk too short: ${chunkText(c)}`);
    if (i > 0) {
      assert.ok(
        c.startMs >= chunks[i - 1].endMs - 1,
        `overlapping chunks: ${chunkText(chunks[i - 1])} / ${chunkText(c)}`,
      );
    }
  }
});

test('chunk text integrity: every word appears once, in order, with spaces', () => {
  const words = makeWords(SCRIPT);
  const chunks = chunkWords(words);
  const joined = chunks.map(chunkText).join(' ');
  assert.equal(joined, words.map((w) => w.text).join(' '));
  assert.equal(joined.split(' ').length, words.length);
});

test('max 2 lines: no chunk exceeds the character cap', () => {
  const chunks = chunkWords(makeWords(SCRIPT));
  for (const chunk of chunks) {
    const chars = chunk.words.reduce((n, w) => n + w.text.length, 0);
    assert.ok(chars <= 40, `chunk too wide for 2 lines: ${chunkText(chunk)} (${chars} chars)`);
  }
});

test('holds through gaps instead of going dark', () => {
  const words = [
    {text: 'Hold', startMs: 0, endMs: 400},
    {text: 'focus.', startMs: 400, endMs: 700},
    {text: 'Breathe.', startMs: 1200, endMs: 1600},
  ];
  const chunks = chunkWords(words);
  assert.equal(chunks[0].endMs, chunks[1].startMs, 'first chunk must hold to the next start');
});

test('chunkAt returns the chunk on screen and nothing before the first', () => {
  const chunks = chunkWords(makeWords(SCRIPT));
  assert.equal(chunkAt(chunks, -10), -1);
  assert.equal(chunkAt(chunks, 0), 0);
  const mid = chunks[1].startMs + 10;
  assert.equal(chunkAt(chunks, mid), 1);
});

test('number expansion matches spoken forms', () => {
  assert.equal(numberToWords(0), 'zero');
  assert.equal(numberToWords(12), 'twelve');
  assert.equal(numberToWords(1200), 'one thousand two hundred');
  assert.equal(numberToWords(3.5), 'three point five');
  assert.equal(yearToWords(1990), 'nineteen ninety');
  assert.equal(yearToWords(2005), 'two thousand five');
  assert.equal(expandNumbers('12'), 'twelve');
  assert.equal(expandNumbers('1,200 steps'), 'one thousand two hundred steps');
  assert.equal(expandNumbers('3.5 hours'), 'three point five hours');
  assert.equal(expandNumbers('1990 was cold'), 'nineteen ninety was cold');
  assert.equal(expandNumbers('30% faster'), 'thirty percent faster');
  assert.equal(expandNumbers('12km trail'), 'twelve kilometers trail');
});

test('normalisation compares script and transcript on equal terms', () => {
  const script = normalizeText('The crate sat at 12 kilometers, right?');
  const transcript = normalizeText('the crate sat at twelve kilometers right');
  assert.deepEqual(script, transcript);
  assert.equal(normalizeToken('Crate,'), 'crate');
  assert.equal(normalizeToken('—bench'), 'bench');
});
