import {useMemo} from 'react';
import {tint, useTheme, type ThemeName} from '../lib/palette';
import {Blob, Cyl, RBox, type Vec3} from '../lib/parts';

/**
 * Three tree species, all bevelled/faceted with per-tree colour variation and a
 * gentle idle sway (spec 4.4 / 4.8). Sway is a pure function of seconds, with the
 * canopy lagging the trunk for follow-through.
 */

export type TreeSpecies = 'pine' | 'round' | 'palm';

export type TreeProps = {
  species: TreeSpecies;
  theme: ThemeName;
  seed: string;
  /** Overall height in world units (default 2.2). */
  size?: number;
  position?: Vec3;
  /** Seconds since the shot started; drives the sway. */
  sec: number;
  swayAmount?: number;
};

export const Tree = ({
  species,
  theme,
  seed,
  size = 2.2,
  position = [0, 0, 0],
  sec,
  swayAmount = 0.016,
}: TreeProps) => {
  const t = useTheme(theme);
  const phase = useMemo(() => (seed.length % 7) * 0.7, [seed]);

  // Trunk sway leads; canopy follows with a lag and a smaller amplitude.
  const sway = Math.sin(sec * 1.05 + phase) * swayAmount;
  const canopySway = Math.sin(sec * 1.05 + phase - 0.55) * swayAmount * 0.8;

  const foliage = tint(t.foliage, seed, 0.09);
  const foliageDeep = tint(t.foliageDark, seed, 0.06, 1);
  const trunkColor = tint(t.trunk, `${seed}:trunk`, 0.06);

  if (species === 'pine') {
    const h = size;
    return (
      <group position={position} rotation={[0, phase, sway]}>
        <Cyl
          radiusTop={h * 0.032}
          radiusBottom={h * 0.055}
          height={h * 0.42}
          segments={7}
          color={trunkColor}
          position={[0, h * 0.21, 0]}
        />
        {[0, 1, 2].map((i) => {
          const k = 1 - i * 0.24;
          return (
            <group key={i} position={[0, h * (0.34 + i * 0.19), 0]} rotation={[0, canopySway * (1 + i), 0]}>
              <Cyl
                radiusTop={0}
                radiusBottom={h * 0.24 * k}
                height={h * 0.34 * k}
                segments={7}
                color={i === 0 ? foliageDeep : foliage}
                roughness={0.85}
              />
            </group>
          );
        })}
      </group>
    );
  }

  if (species === 'palm') {
    const h = size;
    return (
      <group position={position} rotation={[0, phase, sway * 0.8]}>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} position={[i * h * 0.022, h * (0.1 + i * 0.155), 0]} rotation={[0, 0, -i * 0.045]}>
            <Cyl
              radiusTop={h * 0.036}
              radiusBottom={h * 0.046}
              height={h * 0.19}
              segments={7}
              color={trunkColor}
            />
          </group>
        ))}
        <group position={[h * 0.075, h * 0.68, 0]} rotation={[0, canopySway * 3, 0]}>
          {/* Crown knot so the fronds grow out of a mass, not a point. */}
          <Blob radius={h * 0.085} seed={`${seed}:crown`} color={foliageDeep} top={t.foliage} squash={[1, 0.85, 1]} />
          {Array.from({length: 10}, (_, i) => {
            const a = (i / 10) * Math.PI * 2 + (i % 3) * 0.1;
            // Alternating droop and length reads as an arching crown, not a spoke.
            const droop = -0.5 - (i % 3) * 0.22;
            const grow = 0.82 + (i % 4) * 0.07;
            return (
              <group key={i} rotation={[0, a, 0]} scale={[grow, 1, 1]}>
                <group rotation={[0, 0, 0.22]}>
                  <RBox
                    size={[h * 0.24, h * 0.032, h * 0.1]}
                    radius={h * 0.013}
                    color={tint(t.foliage, `${seed}:frond`, 0.08, i)}
                    position={[h * 0.12, 0, 0]}
                    rotation={[0, 0, droop * 0.35]}
                  />
                  <group position={[h * 0.23, -h * 0.02, 0]} rotation={[0, 0, droop]}> 
                    <RBox
                      size={[h * 0.2, h * 0.028, h * 0.075]}
                      radius={h * 0.011}
                      color={tint(t.foliage, `${seed}:frond`, 0.1, i + 3)}
                      position={[h * 0.09, 0, 0]}
                      rotation={[0, 0, droop * 0.6]}
                    />
                  </group>
                </group>
              </group>
            );
          })}
          <Blob radius={h * 0.055} seed={`${seed}:nut1`} color={foliageDeep} position={[h * 0.03, -h * 0.05, h * 0.04]} />
          <Blob radius={h * 0.05} seed={`${seed}:nut2`} color={foliageDeep} position={[-h * 0.02, -h * 0.07, -h * 0.05]} />
        </group>
      </group>
    );
  }

  // 'round': a clustered faceted canopy over a short trunk.
  const h = size;
  return (
    <group position={position} rotation={[0, phase, sway]}>
      <Cyl
        radiusTop={h * 0.045}
        radiusBottom={h * 0.07}
        height={h * 0.5}
        segments={7}
        color={trunkColor}
        position={[0, h * 0.25, 0]}
      />
      <group position={[0, h * 0.58, 0]} rotation={[0, canopySway * 2.2, canopySway]}>
        <Blob
          radius={h * 0.29}
          seed={`${seed}:c0`}
          color={foliageDeep}
          top={foliage}
          position={[0, h * 0.1, 0]}
          detail={1}
          amount={0.14}
        />
        <Blob
          radius={h * 0.2}
          seed={`${seed}:c1`}
          color={foliage}
          top={tint(t.foliage, seed, 0.1, 3)}
          position={[h * 0.19, h * 0.02, h * 0.1]}
          detail={0}
        />
        <Blob
          radius={h * 0.17}
          seed={`${seed}:c2`}
          color={foliage}
          position={[-h * 0.18, -h * 0.02, -h * 0.08]}
          detail={0}
        />
        <Blob
          radius={h * 0.13}
          seed={`${seed}:c3`}
          color={tint(t.foliage, seed, 0.1, 5)}
          position={[h * 0.02, h * 0.22, -h * 0.12]}
          detail={0}
        />
      </group>
    </group>
  );
};

/** Low shrub for density near focal points. */
export const Bush = ({
  theme,
  seed,
  size = 0.6,
  position = [0, 0, 0],
  sec,
}: {
  theme: ThemeName;
  seed: string;
  size?: number;
  position?: Vec3;
  sec: number;
}) => {
  const t = useTheme(theme);
  const wobble = Math.sin(sec * 1.4 + seed.length) * 0.012;
  return (
    <group position={position} rotation={[0, wobble * 4, 0]}>
      <Blob radius={size * 0.52} seed={`${seed}:b0`} color={tint(t.foliage, seed, 0.1)} position={[0, size * 0.4, 0]} squash={[1.1, 0.8, 1]} />
      <Blob radius={size * 0.36} seed={`${seed}:b1`} color={tint(t.foliage, seed, 0.1, 2)} position={[size * 0.32, size * 0.28, size * 0.1]} squash={[1, 0.78, 1]} />
      <Blob radius={size * 0.3} seed={`${seed}:b2`} color={t.foliageDark} position={[-size * 0.28, size * 0.24, -size * 0.12]} squash={[1, 0.8, 1]} />
    </group>
  );
};
