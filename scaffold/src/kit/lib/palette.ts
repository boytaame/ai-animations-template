/**
 * The single source of colour for the whole kit (spec 6).
 * No component may contain a raw hex value: use these tokens, the tone ramps,
 * or `tint()` for deterministic per-object variation.
 */

export type Hex = `#${string}`;

export const base = {
  backdropNavy: '#24213D',
  backdropDeep: '#191830',
  rock: '#9A9AA6',
  stone: '#8E8A82',
  soil: '#5A4330',
  bedrock: '#3A3340',
  shadowTint: '#2A2F5A',
  rimCool: '#9FC2FF',
  // New tokens (not in spec 6): the underground theme needs a cave sky and haze.
  caveDark: '#2B1B26',
  caveHaze: '#6B3A2A',
  caveGround: '#4A3128',
} as const;

type ThemeToken =
  | 'skyTop'
  | 'skyMid'
  | 'skyHorizon'
  | 'fog'
  | 'grass'
  | 'grassDark'
  | 'foliage'
  | 'foliageDark'
  | 'trunk'
  | 'keyLight'
  | 'fillLight'
  | 'shadowTint'
  | 'rim'
  | 'bounce';

export type Theme = Record<ThemeToken, string> & {exposure: number; name: string};

const theme = (name: string, t: Omit<Theme, 'name'>): Theme => ({name, ...t});

export const themes = {
  day: theme('day', {
    exposure: 1.1,
    skyTop: '#5E9BE8',
    skyMid: '#8FBCEF',
    skyHorizon: '#BFDDF7',
    fog: '#CFE3F5',
    grass: '#4FA23C',
    grassDark: '#2F7A33',
    foliage: '#3E8E3A',
    foliageDark: '#143310',
    trunk: '#4A3322',
    keyLight: '#FFF1D6',
    fillLight: '#9CC4FF',
    shadowTint: base.shadowTint,
    rim: base.rimCool,
    bounce: '#6B5A3A',
  }),
  dusk: theme('dusk', {
    exposure: 1.15,
    skyTop: '#2B3550',
    skyMid: '#6E5A78',
    skyHorizon: '#E8B89A',
    fog: '#6F7F95',
    grass: '#3E7A2C',
    grassDark: '#2A5A22',
    foliage: '#2F6A28',
    foliageDark: '#143310',
    trunk: '#40301F',
    keyLight: '#FFC48A',
    fillLight: '#6F7FB0',
    shadowTint: '#2A2F5A',
    rim: '#9FC2FF',
    bounce: '#5A4030',
  }),
  night: theme('night', {
    exposure: 1.25,
    skyTop: '#121432',
    skyMid: '#232A56',
    skyHorizon: '#3A3F7A',
    fog: '#2A2E5C',
    grass: '#24493A',
    grassDark: '#183226',
    foliage: '#1E4A36',
    foliageDark: '#0E2418',
    trunk: '#2C2018',
    keyLight: '#9DB4FF',
    fillLight: '#3A4A8A',
    shadowTint: '#1B2148',
    rim: '#B9D3FF',
    bounce: '#2A2E48',
  }),
  underground: theme('underground', {
    exposure: 1.18,
    skyTop: base.caveDark,
    skyMid: '#43202A',
    skyHorizon: base.caveHaze,
    fog: '#3A2233',
    grass: '#4A3128',
    grassDark: '#2E1D1A',
    foliage: '#3A4A32',
    foliageDark: '#1E1612',
    trunk: '#241812',
    // Warm magma key against a cool violet fill, so the cave is not brown soup.
    keyLight: '#FFB067',
    fillLight: '#8A7AD0',
    shadowTint: '#241638',
    rim: '#FF9A5A',
    bounce: '#5A3524',
  }),
} as const;

export type ThemeName = keyof typeof themes;

/** Themes are plain data: this is a lookup, kept hook-shaped for call-site clarity. */
export const useTheme = (name: ThemeName = 'day'): Theme => themes[name];

export const materials = {
  cloud: '#FFF6E3',
  cloudShade: '#CFE0F0',
  brick: '#C4503A',
  brickShade: '#9E3A2C',
  trimStone: '#CDBF9B',
  awning: '#E6D27A',
  glass: '#6FB9CC',
  windowGlow: '#FFD98A',
  lampGlow: '#FFC766',
  woodLight: '#B98A5A',
  woodDark: '#6E4B2F',
  sand: '#E8B86A',
  snow: '#F1F7FA',
  ice: '#BFE6F5',
  iceDeep: '#7FC2E6',
  water: '#3FA6C8',
  waterDeep: '#1F5FA8',
  metal: '#8C93A0',
  accentCoral: '#E8553A',
  accentTeal: '#36B3AB',
  accentOrange: '#F28A2E',
  accentMagenta: '#C2386B',
  strata1: '#7A4B2E',
  strata2: '#A0623A',
  strata3: '#C4572B',
  magma: '#F08A2E',
  core: '#FFD84A',
  blanketRed: '#C8202B',
  blanketWhite: '#F2EEE8',
  foodBrown: '#B07A3A',
  dark: '#2A1F22',
  paper: '#F4EBD8',
} as const;

export const characters = {
  skin: {
    a: '#F2C29B',
    b: '#D9A074',
    c: '#B97B54',
    d: '#8A5535',
  },
  shirt: {
    blue: '#2F5BD0',
    navy: '#1F2F6B',
    white: '#E6E8EB',
    yellow: '#E6C21F',
    orange: '#E67E22',
    red: '#D2403A',
    teal: '#2FA39A',
    green: '#4C9A4A',
    purple: '#7B55C9',
  },
  pants: {
    navy: '#1B2340',
    gray: '#3A3F55',
    brown: '#5B4A3A',
  },
  hair: {
    dark: '#1A1412',
    brown: '#6A3B22',
    blond: '#D8B25A',
    gray: '#C9CCD2',
    red: '#9C3A22',
  },
  gear: {
    hardhat: '#F2C230',
    hiVis: '#F26B21',
  },
} as const;

export const captions = {
  text: '#FFFFFF',
  highlight: '#FFD83A',
  stroke: '#000000',
  shadow: '#0A0A18',
} as const;

export const palette = {base, themes, materials, characters, captions};

/* ------------------------------------------------------------------ */
/* Colour maths: deterministic, no randomness.                        */
/* ------------------------------------------------------------------ */

const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

export const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
};

export const rgbToHex = (r: number, g: number, b: number): Hex =>
  `#${[r, g, b].map((v) => clamp255(v).toString(16).padStart(2, '0')).join('')}` as Hex;

/** Linear mix in sRGB space; t=0 returns a, t=1 returns b. */
export const mix = (a: string, b: string, t: number): Hex => {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const k = Math.max(0, Math.min(1, t));
  return rgbToHex(ar + (br - ar) * k, ag + (bg - ag) * k, ab + (bb - ab) * k);
};

export const lighten = (color: string, t: number) => mix(color, '#FFFFFF', t);
export const darken = (color: string, t: number) => mix(color, '#000000', t);

/** Tone ramp for large surfaces (spec 6): keeps trim/shading inside the palette. */
export const ramp = (color: string, light = 0.14, shade = 0.18) => ({
  light: lighten(color, light),
  base: color,
  shade: darken(color, shade),
});

/** Stable 32-bit hash so every "random" choice is a pure function of a string seed. */
export const hashString = (seed: string): number => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** 0..1 from a string seed plus an index. Deterministic, never Math.random. */
export const seededUnit = (seed: string, index = 0): number => {
  const h = hashString(`${seed}:${index}`);
  // xorshift finalizer for better distribution
  let x = h || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return ((x >>> 0) % 100000) / 100000;
};

/**
 * Small deterministic tint variation (+/- `amount` lightness, slight hue drift)
 * so repeated props never look cloned (spec 4.2).
 */
export const tint = (color: string, seed: string, amount = 0.05, index = 0): Hex => {
  const u = seededUnit(seed, index);
  const signed = u * 2 - 1;
  const shifted = signed > 0 ? lighten(color, signed * amount) : darken(color, -signed * amount);
  // A touch of warm/cool drift from a second hash keeps big runs from banding.
  const warm = seededUnit(`${seed}:hue`, index) > 0.5;
  return mix(shifted, warm ? materials.awning : base.rimCool, u * amount * 0.25);
};

/** rgba() string for transparent materials (water, glass, halos). */
export const withAlpha = (color: string, alpha: number): string => {
  const [r, g, b] = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
};
