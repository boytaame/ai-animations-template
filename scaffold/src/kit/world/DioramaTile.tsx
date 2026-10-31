import {useMemo, type ReactNode} from 'react';
import {chamferBox, gradient} from '../lib/geo';
import {
  base,
  lighten,
  materials,
  seededUnit,
  tint,
  useTheme,
  type ThemeName,
} from '../lib/palette';
import {Blob, BlobShadow, Cyl, VertexMesh, type Vec3} from '../lib/parts';

/**
 * The signature floating diorama tile (spec 4.4).
 *
 * A chamfered slab with 2-3 visible strata on the side, a turf lip that slightly
 * overhangs the soil, fake AO in the seams, a few tufts spilling over the rim,
 * and a soft contact shadow underneath. Children sit on the top surface at y=0.
 */

export type DioramaTileProps = {
  theme: ThemeName;
  /** Top surface side length. */
  size?: number;
  position?: Vec3;
  children?: ReactNode;
  /** Visible strata below the turf: 2 or 3. */
  strata?: 2 | 3;
  /** Show the drop shadow (false when the tile sits on a surface). */
  floating?: boolean;
  /** Tufts of grass along the rim. */
  tufts?: number;
  seed?: string;
};

export const DioramaTile = ({
  theme,
  size = 10,
  position = [0, 0, 0],
  children,
  strata = 3,
  floating = true,
  tufts = 16,
  seed = 'tile',
}: DioramaTileProps) => {
  const t = useTheme(theme);
  const underground = theme === 'underground';

  const parts = useMemo(() => {
    const turfH = 0.46;
    const soilH = 0.8;
    const bandH = 0.52;
    const bedH = 0.48;

    const turf = chamferBox(size, turfH, size, 0.13, 2);
    gradient(turf, {
      base: t.grassDark,
      top: lighten(t.grass, 0.08),
      bottomY: -turfH,
      topY: 0,
      seed: `${seed}:turf`,
      variation: 0.02,
      aoY: -turfH * 0.2,
      aoAmount: 0.35,
    });

    const soil = chamferBox(size * 0.985, soilH, size * 0.985, 0.1, 1);
    gradient(soil, {
      base: underground ? materials.strata1 : base.soil,
      top: underground ? materials.strata2 : lighten(base.soil, 0.08),
      seed: `${seed}:soil`,
      variation: 0.03,
    });

    const band = chamferBox(size * 0.94, bandH, size * 0.94, 0.09, 1);
    gradient(band, {
      base: underground ? materials.strata2 : tint(materials.strata1, 'band', 0.03),
      top: underground ? materials.strata3 : materials.strata1,
      seed: `${seed}:band`,
      variation: 0.04,
    });

    const bed = chamferBox(size * 0.87, bedH, size * 0.87, 0.16, 1);
    gradient(bed, {
      base: base.bedrock,
      top: underground ? materials.strata1 : tint(base.bedrock, 'bed', 0.04),
      seed: `${seed}:bed`,
      variation: 0.03,
    });

    // Stack top-down; small overlaps hide seams without z-fighting.
    const yTurf = -turfH / 2;
    const ySoil = -turfH - soilH / 2 + 0.01;
    const yBand = -turfH - soilH - bandH / 2 + 0.02;
    const yBed = -turfH - soilH - (strata === 3 ? bandH : 0) - bedH / 2 + 0.03;

    const depth = turfH + soilH + (strata === 3 ? bandH : 0) + bedH;
    return {turf, soil, band, bed, yTurf, ySoil, yBand, yBed, depth};
  }, [size, t.grass, t.grassDark, theme, seed, underground, strata]);

  const rimTufts = useMemo(() => {
    const out: {pos: Vec3; s: number; color: string; rot: number}[] = [];
    const half = size / 2 - 0.05;
    for (let i = 0; i < tufts; i++) {
      const edge = i % 4;
      const along = (seededUnit(`${seed}:ta`, i) - 0.5) * 0.9 * size;
      const pos: Vec3 =
        edge === 0
          ? [along, 0, half]
          : edge === 1
            ? [half, 0, along]
            : edge === 2
              ? [along, 0, -half]
              : [-half, 0, along];
      out.push({
        pos,
        s: 0.15 + seededUnit(`${seed}:ts`, i) * 0.14,
        color: tint(t.foliage, `${seed}:tuft`, 0.09, i),
        rot: seededUnit(`${seed}:tr`, i) * Math.PI * 2,
      });
    }
    return out;
  }, [tufts, size, seed, t.foliage]);

  return (
    <group position={position}>
      <VertexMesh geometry={parts.bed} position={[0, parts.yBed, 0]} />
      {strata === 3 ? <VertexMesh geometry={parts.band} position={[0, parts.yBand, 0]} /> : null}
      <VertexMesh geometry={parts.soil} position={[0, parts.ySoil, 0]} />
      <VertexMesh geometry={parts.turf} position={[0, parts.yTurf, 0]} />

      {/* Tufts spilling over the lip: density at the edge, not a flat rim. */}
      {rimTufts.map((tuft, i) => (
        <group key={i} position={tuft.pos} rotation={[0, tuft.rot, 0]}>
          <Cyl
            radiusTop={0}
            radiusBottom={tuft.s * 0.42}
            height={tuft.s * 2.2}
            segments={5}
            color={tuft.color}
            position={[0, tuft.s * 0.5, 0]}
            castShadow={false}
          />
          <Blob
            radius={tuft.s * 0.8}
            seed={`${seed}:tb${i}`}
            color={tuft.color}
            squash={[1, 0.5, 1]}
            position={[tuft.s * 0.25, 0.01, 0]}
            detail={0}
          />
        </group>
      ))}

      {floating ? (
        <BlobShadow
          radius={size * 0.8}
          opacity={0.32}
          color={t.shadowTint}
          position={[0, -parts.depth - 0.7, 0]}
          feather={0.92}
        />
      ) : null}

      {children}
    </group>
  );
};
