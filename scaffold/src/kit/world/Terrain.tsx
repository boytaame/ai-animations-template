import {useMemo} from 'react';
import * as THREE from 'three';
import {gradient} from '../lib/geo';
import {lighten, seededUnit, tint, useTheme, type ThemeName} from '../lib/palette';
import {VertexMesh} from '../lib/parts';

/**
 * Seeded low-poly relief (spec 4.4): a subdivided plane displaced by a smooth
 * hash noise, flat shaded, vertex-coloured with a light/dark tone ramp.
 * Used both for in-world ground (large) and diorama tile tops (small).
 */

export type TerrainProps = {
  theme: ThemeName;
  size?: number;
  segments?: number;
  /** Peak-to-trough height in world units. */
  height?: number;
  seed?: string;
  /** Flatten a disc in the middle so figures and props have a stage. */
  flattenRadius?: number;
  position?: [number, number, number];
  y?: number;
};

/** Deterministic smooth noise from hashed lattice values. */
const noise2 = (x: number, z: number, seed: string): number => {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const val = (a: number, b: number) => seededUnit(`${seed}:${a},${b}`) * 2 - 1;
  const n00 = val(xi, zi);
  const n10 = val(xi + 1, zi);
  const n01 = val(xi, zi + 1);
  const n11 = val(xi + 1, zi + 1);
  return (n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v;
};

export const Terrain = ({
  theme,
  size = 10,
  segments = 14,
  height = 0.35,
  seed = 'terrain',
  flattenRadius = 0,
  position,
  y = 0,
}: TerrainProps) => {
  const t = useTheme(theme);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, segments, segments);
    g.rotateX(-Math.PI / 2);
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const falloff = Math.max(
        0,
        Math.min(1, (Math.max(Math.abs(x), Math.abs(z)) - size * 0.36) / (size * 0.14)),
      );
      const ridge =
        noise2(x * 0.35, z * 0.35, seed) * 0.65 + noise2(x * 0.9, z * 0.9, `${seed}:b`) * 0.35;
      const stage = flattenRadius > 0 ? Math.min(1, Math.hypot(x, z) / flattenRadius) : 1;
      const h = ridge * height * falloff * (0.35 + 0.65 * stage);
      pos.setY(i, h);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    gradient(g, {
      base: tint(t.grassDark, seed, 0.03),
      top: lighten(t.grass, 0.1),
      seed,
      variation: 0.03,
      bottomY: -height,
      topY: height,
    });
    return g;
  }, [size, segments, height, seed, flattenRadius, t.grass, t.grassDark]);

  return <VertexMesh geometry={geometry} position={position ?? [0, y, 0]} />;
};
