import {useMemo} from 'react';
import {base, lighten, materials, seededUnit, tint, useTheme, type ThemeName} from '../lib/palette';
import {Blob, BlobShadow, type Vec3} from '../lib/parts';

/**
 * Faceted rock clusters and glinting crystal shards (spec 4.2).
 * Cluster shapes are seeded once; nothing is randomised per frame.
 */

export type RocksProps = {
  theme: ThemeName;
  seed: string;
  size?: number;
  position?: Vec3;
  count?: number;
  /** Adds a few emissive crystal shards (underground / magic sets). */
  crystals?: boolean;
  shadow?: boolean;
};

export const Rocks = ({
  theme,
  seed,
  size = 1.4,
  position = [0, 0, 0],
  count = 4,
  crystals = false,
  shadow = true,
}: RocksProps) => {
  const t = useTheme(theme);
  const stones = useMemo(
    () =>
      Array.from({length: count}, (_, i) => {
        const r = size * (0.32 + seededUnit(`${seed}:r`, i) * 0.34);
        return {
          r,
          pos: [
            (seededUnit(`${seed}:x`, i) - 0.5) * size * 0.9,
            r * 0.5 + seededUnit(`${seed}:y`, i) * size * 0.06,
            (seededUnit(`${seed}:z`, i) - 0.5) * size * 0.7,
          ] as Vec3,
          rot: [seededUnit(`${seed}:rx`, i) * 0.6, seededUnit(`${seed}:ry`, i) * Math.PI, 0] as Vec3,
          squash: [1, 0.72 + seededUnit(`${seed}:q`, i) * 0.3, 1] as Vec3,
          color: i === 0 ? base.rock : tint(theme === 'underground' ? base.bedrock : base.stone, seed, 0.07, i),
        };
      }),
    [count, seed, size, theme],
  );

  return (
    <group position={position}>
      {stones.map((s, i) => (
        <Blob
          key={i}
          radius={s.r}
          seed={`${seed}:stone${i}`}
          color={s.color}
          top={lighten(s.color, 0.12)}
          position={s.pos}
          rotation={s.rot}
          squash={s.squash}
          detail={i === 0 ? 1 : 0}
          amount={0.2}
        />
      ))}

      {crystals
        ? Array.from({length: 3}, (_, i) => (
            <group
              key={`c${i}`}
              position={[
                (seededUnit(`${seed}:cx`, i) - 0.5) * size * 0.5,
                size * 0.35,
                (seededUnit(`${seed}:cz`, i) - 0.5) * size * 0.5,
              ]}
              rotation={[seededUnit(`${seed}:crx`, i) * 0.5, seededUnit(`${seed}:cry`, i) * 3, seededUnit(`${seed}:crz`, i) * 0.4]}
            >
              <Blob
                radius={size * (0.09 + seededUnit(`${seed}:cs`, i) * 0.06)}
                seed={`${seed}:crystal${i}`}
                color={materials.accentTeal}
                top={materials.ice}
                squash={[0.6, 2.6, 0.6]}
                detail={0}
                amount={0.12}
              />
            </group>
          ))
        : null}

      {shadow ? (
        <BlobShadow radius={size * 0.72} opacity={0.3} color={t.shadowTint} position={[0, 0.02, 0]} />
      ) : null}
    </group>
  );
};

/** A single boulder, handy as a foreground framing element. */
export const Boulder = ({
  theme,
  seed,
  size = 1.6,
  position = [0, 0, 0],
}: {
  theme: ThemeName;
  seed: string;
  size?: number;
  position?: Vec3;
}) => (
  <Rocks theme={theme} seed={seed} size={size} position={position} count={1} />
);
