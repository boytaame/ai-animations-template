/**
 * Script/transcript normalisation for caption alignment (spec 8.4 step 3).
 *
 * The on-screen text is always the SCRIPT. Speech-to-text is used for timing
 * only, so both sides are reduced to the same comparable tokens: lowercase,
 * punctuation stripped, numbers expanded to the words people actually say.
 *
 * Pure functions; used by scripts/make-captions.mjs and by the unit tests.
 */

const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

const below100 = (n: number): string => {
  if (n < 20) {
    return ONES[n];
  }
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? `-${ONES[o]}` : '');
};

const below1000 = (n: number): string => {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const head = h ? `${ONES[h]} hundred` : '';
  if (!rest) {
    return head;
  }
  return head ? `${head} ${below100(rest)}` : below100(rest);
};

/** Cardinal number to words, up to 999,999,999,999. */
export const numberToWords = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '';
  }
  const negative = value < 0;
  const n = Math.abs(value);
  const whole = Math.floor(n);
  const fraction = Math.round((n - whole) * 1000) / 1000;

  const parts: string[] = [];
  if (negative) {
    parts.push('minus');
  }
  if (whole === 0) {
    parts.push('zero');
  } else {
    const scales: [number, string][] = [
      [1e9, 'billion'],
      [1e6, 'million'],
      [1e3, 'thousand'],
      [1, ''],
    ];
    let rest = whole;
    for (const [scale, name] of scales) {
      const count = Math.floor(rest / scale);
      if (count > 0) {
        parts.push(name ? `${below1000(count)} ${name}` : below1000(count));
        rest -= count * scale;
      }
    }
  }
  if (fraction > 0) {
    parts.push('point');
    const digits = String(fraction).split('.')[1] ?? '';
    for (const d of digits) {
      parts.push(ONES[Number(d)]);
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
};

/**
 * Years are spoken as pairs: 1990 -> "nineteen ninety", 2005 -> "two thousand five".
 * Whisper transcribes them this way, so the script must match.
 */
export const yearToWords = (year: number): string => {
  if (year >= 2000 && year <= 2009) {
    return `two thousand${year % 10 ? ` ${ONES[year % 10]}` : ''}`;
  }
  if (year >= 1100 && year <= 2099) {
    const hi = Math.floor(year / 100);
    const lo = year % 100;
    if (lo === 0) {
      return `${below100(hi)} hundred`;
    }
    return `${below100(hi)} ${lo < 10 ? `oh ${ONES[lo]}` : below100(lo)}`;
  }
  return numberToWords(year);
};

const UNIT_WORDS: Record<string, string> = {
  '%': 'percent',
  km: 'kilometers',
  kmh: 'kilometers per hour',
  kg: 'kilograms',
  cm: 'centimeters',
  mm: 'millimeters',
  m: 'meters',
  s: 'seconds',
  min: 'minutes',
  hr: 'hours',
  mph: 'miles per hour',
  ft: 'feet',
  x: 'times',
  '°': 'degrees',
};

/** Expand numbers (and their trailing units) inside free text. */
export const expandNumbers = (text: string): string => {
  // A unit only counts when it is attached (12km) or is % / ° (30%).
  return text.replace(/(\d[\d,]*(?:\.\d+)?)(\s?%|\s?°|[a-zA-Z]+)?/g, (match, numRaw: string, unitRaw: string | undefined) => {
    const cleaned = numRaw.replace(/,/g, '');
    const value = Number(cleaned);
    if (!Number.isFinite(value)) {
      return match;
    }
    const unit = (unitRaw ?? '').trim().toLowerCase();
    // Only the 1900-2099 range is read as a year ("nineteen ninety"); other
    // four-digit numbers are more likely counts ("1,200 steps").
    const isYear = /^\d{4}$/.test(cleaned) && !unit && value >= 1900 && value <= 2099;
    const words = isYear ? yearToWords(value) : numberToWords(value);
    if (!unit) {
      return words;
    }
    const unitWord = UNIT_WORDS[unit] ?? unit;
    return `${words} ${unitWord}`;
  });
};

/** One script/transcript word reduced to its comparable form. */
export const normalizeToken = (word: string): string =>
  expandNumbers(word)
    .toLowerCase()
    .replace(/[^\w'-]+/g, '')
    .replace(/^-+|-+$/g, '');

/** Split text into normalised tokens; drops empties. */
export const normalizeText = (text: string): string[] =>
  text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(normalizeToken)
    .filter((w) => w.length > 0);

/** Display words of a script: original spelling, punctuation kept. */
export const displayWords = (text: string): string[] =>
  text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w.length > 0);
