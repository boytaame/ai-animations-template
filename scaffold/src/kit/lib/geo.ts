/**
 * Geometry helpers shared by the world kit: seeded vertex jitter, flat-shaded
 * faceted forms, and vertex-colour gradients with baked contact AO (spec 4.2).
 * Every helper is deterministic — jitter comes from a hashed seed, not Math.random.
 */

import * as THREE from 'three';
import {darken, hexToRgb, seededUnit} from './palette';

/** Copy a geometry, jitter its vertices by a hashed amount, and flat-shade it. */
export const facet = (
  geometry: THREE.BufferGeometry,
  seed: string,
  amount: number,
  options: {keepBottom?: boolean} = {},
): THREE.BufferGeometry => {
  const g = geometry.clone();
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  // Hash per unique rounded position so shared vertices stay welded.
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const key = `${x.toFixed(3)}|${y.toFixed(3)}|${z.toFixed(3)}`;
    const k = [
      seededUnit(`${seed}:x:${key}`, 0),
      seededUnit(`${seed}:y:${key}`, 1),
      seededUnit(`${seed}:z:${key}`, 2),
    ];
    const ky = options.keepBottom && y < 0.001 ? 0 : k[1] * 2 - 1;
    pos.setXYZ(
      i,
      x + (k[0] * 2 - 1) * amount,
      y + ky * amount,
      z + (k[2] * 2 - 1) * amount,
    );
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
};

/**
 * Add a per-vertex colour gradient (dark base -> light top) plus optional
 * contact darkening near `aoY`, then return the geometry.
 */
export const gradient = (
  geometry: THREE.BufferGeometry,
  options: {
    base: string;
    top?: string;
    bottomY?: number;
    topY?: number;
    seed?: string;
    /** Extra darkening applied below this local Y (fake contact AO). */
    aoY?: number;
    aoAmount?: number;
    /** Per-facet tint variation amount (0 disables). */
    variation?: number;
  },
): THREE.BufferGeometry => {
  const g = geometry;
  g.computeBoundingBox();
  const bb = g.boundingBox ?? new THREE.Box3();
  const lo = options.bottomY ?? bb.min.y;
  const hi = options.topY ?? bb.max.y;
  const span = Math.max(0.0001, hi - lo);
  const baseColor = new THREE.Color(options.base);
  const topColor = new THREE.Color(options.top ?? options.base);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const seed = options.seed ?? 'grad';
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = Math.min(1, Math.max(0, (y - lo) / span));
    const c = baseColor.clone().lerp(topColor, t);
    if (options.variation) {
      const v = (seededUnit(`${seed}:v`, Math.floor(i / 3)) * 2 - 1) * options.variation;
      c.offsetHSL(0, 0, v * 0.5);
    }
    if (options.aoY !== undefined && y < options.aoY) {
      const k = Math.min(1, (options.aoY - y) / Math.max(0.0001, options.aoY - lo));
      c.lerp(new THREE.Color(darken(options.base, 0.55)), k * (options.aoAmount ?? 0.5));
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
};

/** A faceted low-poly blob: icosahedron at detail 0/1, jittered, flat shaded. */
export const blob = (radius: number, seed: string, amount = 0.18, detail = 0) =>
  facet(new THREE.IcosahedronGeometry(radius, detail), seed, radius * amount);

/** Converts a palette hex to a THREE.Color (sRGB-correct). */
export const toColor = (hex: string): THREE.Color => {
  const [r, g, b] = hexToRgb(hex);
  return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
};

/** Chamfered slab geometry: a bevelled box, the base shape of the diorama tile. */
export const chamferBox = (
  w: number,
  h: number,
  d: number,
  bevel = 0.06,
  segments = 1,
): THREE.BufferGeometry => {
  const shape = new THREE.Shape();
  const hw = w / 2 - bevel;
  const hd = d / 2 - bevel;
  shape.moveTo(-hw, -hd);
  shape.lineTo(hw, -hd);
  shape.lineTo(hw, hd);
  shape.lineTo(-hw, hd);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, h - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: segments,
    curveSegments: 1,
  });
  // Extrude runs along +Z; rotate so the slab stands on Y and is centred.
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -(h - bevel * 2) / 2, 0);
  geo.computeVertexNormals();
  return geo;
};
