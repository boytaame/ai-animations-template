import {useMemo} from 'react';
import * as THREE from 'three';
import {facet, gradient} from '../lib/geo';
import {lighten, materials, mix, seededUnit, useTheme, type ThemeName} from '../lib/palette';
import {VertexMesh, type Vec3} from '../lib/parts';
import {continuousPhase} from '../lib/motion';

/**
 * Faceted low-poly water (spec 4.1): static displaced facets, two translucent
 * depth layers, and one long, slow shimmer band that streams on a single
 * continuous phase (never respawned, so it cannot strobe — spec 4.9 B).
 */

export type WaterProps = {
  theme: ThemeName;
  size?: number;
  position?: Vec3;
  seed?: string;
  /** Seconds into the shot. */
  sec: number;
  /** Water colour override (e.g. lava for the underground strip). */
  color?: string;
  deep?: string;
};

export const Water = ({
  theme,
  size = 6,
  position = [0, 0, 0],
  seed = 'water',
  sec,
  color,
  deep,
}: WaterProps) => {
  const t = useTheme(theme);
  const surfaceColor = color ?? materials.water;
  const deepColor = deep ?? materials.waterDeep;

  const geometry = useMemo(() => {
    const g = facet(new THREE.PlaneGeometry(size, size, 9, 9), seed, 0.06);
    g.rotateX(-Math.PI / 2);
    gradient(g, {
      base: deepColor,
      top: lighten(surfaceColor, 0.1),
      seed,
      variation: 0.05,
      bottomY: -0.1,
      topY: 0.1,
    });
    return g;
  }, [size, seed, deepColor, surfaceColor]);

  // One continuous phase: 0.9 units/sec over a 3.4-unit spacing, far below the
  // 25%-of-spacing-per-frame limit at 30 fps.
  const spacing = 3.4;
  const phase = continuousPhase(sec, spacing, 0.9);
  const bandX = -size / 2 + phase + spacing * 1.5;

  return (
    <group position={position}>
      <VertexMesh geometry={geometry} position={[0, 0, 0]} roughness={0.34} flatShading opacity={0.9} />
      {/* Shallows: a lighter rim reads as depth without a texture. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
        <planeGeometry args={[size * 0.96, size * 0.96]} />
        <meshStandardMaterial color={lighten(surfaceColor, 0.22)} roughness={0.4} metalness={0} transparent opacity={0.35} />
      </mesh>
      {/* Shimmer band: long, soft, same direction every frame. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bandX, 0.035, 0]}>
        <planeGeometry args={[1.15, size * 0.9]} />
        <meshBasicMaterial
          color={lighten(materials.snow, 0.1)}
          transparent
          opacity={0.13}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {Array.from({length: 5}, (_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[
            (seededUnit(`${seed}:fx`, i) - 0.5) * size * 0.8,
            0.04,
            (seededUnit(`${seed}:fz`, i) - 0.5) * size * 0.8,
          ]}
        >
          <planeGeometry args={[0.5 + seededUnit(`${seed}:fw`, i) * 0.5, 0.06]} />
          <meshBasicMaterial color={lighten(materials.snow, 0.2)} transparent opacity={0.28} depthWrite={false} />
        </mesh>
      ))}
      {/* Deep tint under the surface keeps the tile edge reading as water. */}
      <mesh position={[0, -0.16, 0]}>
        <boxGeometry args={[size * 0.995, 0.1, size * 0.995]} />
        <meshStandardMaterial color={mix(deepColor, t.fog, 0.12)} roughness={0.7} metalness={0} />
      </mesh>
    </group>
  );
};
