import {useMemo} from 'react';
import {chamferBox, gradient} from '../lib/geo';
import {materials, seededUnit, tint, useTheme, type ThemeName} from '../lib/palette';
import {BlobShadow, Cyl, RBox, VertexMesh, type Vec3} from '../lib/parts';

/**
 * Modular stylised brick townhouse (spec 4.4): stone base, brick mass with a
 * vertical gradient, cornices with dentils, framed windows with sills and lit
 * glass, striped awnings, a recessed door with steps, parapet and chimney.
 *
 * Layout is derived from `floors`, `width` and `depth`, so the same component
 * makes a two-storey shop or a five-storey block.
 */

export type BuildingProps = {
  theme: ThemeName;
  position?: Vec3;
  rotation?: Vec3;
  floors?: number;
  width?: number;
  depth?: number;
  floorHeight?: number;
  /** Fraction of windows that glow (day scenes usually keep a couple lit). */
  litRatio?: number;
  seed?: string;
  awnings?: boolean;
  castShadow?: boolean;
};

const W = 0.86;
const H = 1.42;

/** Framed window: glass, four frame bars, mullion, sill, lintel, optional glow. */
const WindowUnit = ({
  position,
  rotation = [0, 0, 0],
  lit,
  glass,
  scale = 1,
}: {
  position: Vec3;
  rotation?: Vec3;
  lit: boolean;
  glass: string;
  scale?: number;
}) => (
  <group position={position} rotation={rotation} scale={scale}>
    <RBox
      size={[W * 0.86, H * 0.86, 0.05]}
      radius={0.02}
      color={lit ? materials.windowGlow : glass}
      emissive={lit ? materials.windowGlow : undefined}
      emissiveIntensity={lit ? 0.85 : 0}
      roughness={0.35}
      position={[0, 0, 0.02]}
      castShadow={false}
    />
    <RBox size={[W, H * 0.075, 0.1]} radius={0.015} color={materials.trimStone} position={[0, H / 2, 0.03]} />
    <RBox size={[W, H * 0.09, 0.13]} radius={0.02} color={materials.trimStone} position={[0, -H / 2, 0.05]} />
    <RBox size={[W * 0.075, H, 0.1]} radius={0.015} color={materials.trimStone} position={[-W / 2, 0, 0.03]} />
    <RBox size={[W * 0.075, H, 0.1]} radius={0.015} color={materials.trimStone} position={[W / 2, 0, 0.03]} />
    <RBox size={[W * 0.05, H * 0.86, 0.07]} radius={0.01} color={materials.trimStone} position={[0, 0, 0.03]} />
    <RBox size={[W * 0.045, H * 0.42, 0.06]} radius={0.01} color={materials.trimStone} position={[0, H * 0.22, 0.03]} />
    {/* Sill looks chunky from below; the lintel hood gives a soft shadow line. */}
    <RBox size={[W * 1.16, H * 0.055, 0.18]} radius={0.012} color={materials.trimStone} position={[0, -H / 2 - 0.06, 0.06]} />
    <RBox size={[W * 1.1, H * 0.05, 0.14]} radius={0.012} color={materials.trimStone} position={[0, H / 2 + 0.06, 0.04]} />
  </group>
);

/** Striped awning with a scalloped front edge. */
const Awning = ({width, color, position}: {width: number; color: string; position: Vec3}) => (
  <group position={position} rotation={[0.28, 0, 0]}>
    {[0, 1, 2, 3].map((i) => (
      <RBox
        key={i}
        size={[width / 4, 0.035, 0.62]}
        radius={0.012}
        color={i % 2 === 0 ? color : materials.paper}
        position={[-width / 2 + (i + 0.5) * (width / 4), 0, 0]}
      />
    ))}
    <RBox size={[width, 0.14, 0.04]} radius={0.05} color={color} position={[0, -0.08, 0.3]} />
  </group>
);

export const Building = ({
  theme,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  floors = 3,
  width = 4.6,
  depth = 4.2,
  floorHeight = 2.15,
  litRatio = 0.45,
  seed = 'building',
  awnings = true,
  castShadow = true,
}: BuildingProps) => {
  const t = useTheme(theme);
  const brick = tint(materials.brick, seed, 0.04);
  const brickShade = tint(materials.brickShade, seed, 0.05, 1);
  const baseH = 0.92;
  const bodyH = floors * floorHeight;
  const topY = baseH + bodyH;

  const wall = useMemo(() => {
    const g = chamferBox(width, bodyH, depth, 0.07, 1);
    gradient(g, {
      base: brickShade,
      top: tint(brick, seed, 0.06, 2),
      seed,
      variation: 0.012,
      bottomY: 0,
      topY: bodyH,
      aoY: 0.55,
      aoAmount: 0.25,
    });
    return g;
  }, [width, bodyH, depth, brick, brickShade, seed]);

  const windowX = [-width * 0.31, 0, width * 0.31];
  const sideZ = [-depth * 0.22, depth * 0.22];

  const litFor = (i: number) => seededUnit(`${seed}:lit`, i) < litRatio;

  return (
    <group position={position} rotation={rotation}>
      {/* Stone base */}
      <RBox
        size={[width + 0.14, baseH, depth + 0.14]}
        radius={0.05}
        color={materials.trimStone}
        position={[0, baseH / 2, 0]}
        roughness={0.85}
        castShadow={castShadow}
      />
      {/* Brick mass */}
      <VertexMesh geometry={wall} position={[0, baseH + bodyH / 2, 0]} castShadow={castShadow} />

      {/* Floor cornices with dentils */}
      {Array.from({length: floors}, (_, f) => {
        const y = baseH + f * floorHeight;
        return (
          <group key={`cornice-${f}`} position={[0, y, 0]}>
            <RBox size={[width + 0.34, 0.16, depth + 0.34]} radius={0.03} color={materials.trimStone} />
            <RBox size={[width + 0.2, 0.06, depth + 0.2]} radius={0.02} color={brickShade} position={[0, -0.1, 0]} />
            {Array.from({length: 7}, (_, i) => (
              <RBox
                key={i}
                size={[0.14, 0.1, 0.09]}
                radius={0.015}
                color={materials.trimStone}
                position={[
                  -width * 0.42 + (i * width * 0.84) / 6,
                  -0.06,
                  depth / 2 + 0.14,
                ]}
                castShadow={false}
              />
            ))}
          </group>
        );
      })}

      {/* Windows: front and right faces */}
      {Array.from({length: floors}, (_, f) =>
        windowX.map((x, i) => {
          const isGround = f === 0;
          const doorSlot = isGround && i === 1;
          if (doorSlot) {
            return null;
          }
          const idx = f * 10 + i;
          return (
            <WindowUnit
              key={`f-${f}-${i}`}
              position={[x, baseH + f * floorHeight + floorHeight * 0.56, depth / 2 + 0.045]}
              lit={litFor(idx)}
              glass={materials.glass}
            />
          );
        }),
      )}
      {Array.from({length: floors}, (_, f) =>
        sideZ.map((z, i) => (
          <WindowUnit
            key={`s-${f}-${i}`}
            position={[width / 2 + 0.045, baseH + f * floorHeight + floorHeight * 0.56, z]}
            rotation={[0, Math.PI / 2, 0]}
            lit={litFor(f * 10 + 5 + i)}
            glass={materials.glass}
            scale={0.92}
          />
        )),
      )}
      {Array.from({length: floors}, (_, f) =>
        sideZ.map((z, i) => (
          <WindowUnit
            key={`w-${f}-${i}`}
            position={[-width / 2 - 0.045, baseH + f * floorHeight + floorHeight * 0.56, z]}
            rotation={[0, -Math.PI / 2, 0]}
            lit={litFor(f * 10 + 8 + i)}
            glass={materials.glass}
            scale={0.92}
          />
        )),
      )}

      {/* Door: recessed panel, frame, handle, raised on a stoop of three steps. */}
      <group position={[0, 1.12, depth / 2 + 0.02]}>
        <RBox size={[1.12, 1.76, 0.12]} radius={0.03} color={materials.trimStone} />
        <RBox size={[0.9, 1.58, 0.14]} radius={0.03} color={materials.woodDark} position={[0, 0, 0.03]} />
        <RBox size={[0.28, 0.86, 0.03]} radius={0.01} color={materials.woodLight} position={[0, 0.2, 0.1]} />
        <RBox size={[0.62, 0.5, 0.03]} radius={0.01} color={materials.woodLight} position={[0, -0.42, 0.1]} />
        <Cyl radiusTop={0.045} radiusBottom={0.045} height={0.07} segments={8} color={materials.awning} rotation={[Math.PI / 2, 0, 0]} position={[0.32, -0.1, 0.12]} flatShading={false} />
        <RBox size={[1.24, 0.13, 0.26]} radius={0.04} color={materials.trimStone} position={[0, 0.96, 0.06]} />
      </group>
      {[0, 1, 2].map((i) => (
        <RBox
          key={`step-${i}`}
          size={[1.42 - i * 0.04, 0.17, 0.34 + i * 0.22]}
          radius={0.025}
          color={materials.trimStone}
          position={[0, 0.085 + i * 0.17, depth / 2 + 0.2 + (2 - i) * 0.11 + 0.14]}
        />
      ))}

      {/* Awnings over the ground-floor front openings */}
      {awnings
        ? windowX.map((x, i) => (
            <Awning
              key={`awn-${i}`}
              width={i === 1 ? 1.5 : 1.35}
              color={materials.awning}
              position={[x, baseH + floorHeight * 0.66, depth / 2 + 0.34]}
            />
          ))
        : null}

      {/* Parapet, roof cap and chimney */}
      <RBox size={[width + 0.26, 0.24, depth + 0.26]} radius={0.03} color={brickShade} position={[0, topY + 0.1, 0]} />
      <RBox size={[width + 0.36, 0.1, depth + 0.36]} radius={0.03} color={materials.trimStone} position={[0, topY + 0.26, 0]} />
      <group position={[-width * 0.26, topY + 0.3, -depth * 0.22]}>
        <RBox size={[0.52, 0.9, 0.52]} radius={0.04} color={materials.trimStone} position={[0, 0.45, 0]} />
        <RBox size={[0.66, 0.12, 0.66]} radius={0.03} color={materials.trimStone} position={[0, 0.94, 0]} />
        <RBox size={[0.3, 0.1, 0.3]} radius={0.02} color={materials.dark} position={[0, 1.0, 0]} castShadow={false} />
      </group>
      {/* Roof furniture: a vent block and a hatch keep the top face from reading empty. */}
      <RBox size={[0.5, 0.3, 0.42]} radius={0.04} color={materials.metal} position={[width * 0.22, topY + 0.32, depth * 0.12]} />
      <RBox size={[0.56, 0.06, 0.48]} radius={0.03} color={materials.trimStone} position={[width * 0.22, topY + 0.5, depth * 0.12]} />
      <RBox size={[0.62, 0.1, 0.62]} radius={0.03} color={materials.woodDark} position={[-width * 0.24, topY + 0.36, depth * 0.26]} />

      <BlobShadow radius={width * 1.1} opacity={0.24} color={t.shadowTint} position={[0, 0.012, 0]} squash={depth / width} feather={0.7} />
    </group>
  );
};
