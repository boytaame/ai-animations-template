import {useMemo} from 'react';
import {base, materials, seededUnit, useTheme, type ThemeName} from '../lib/palette';
import {Blob, BlobShadow, Cyl, Halo, type Vec3} from '../lib/parts';

/**
 * Campfire: stone ring, crossed logs, layered emissive flame, halo and a warm
 * point light. The flicker is a fixed sum of sines of the shot time — never a
 * random value — so it looks alive but renders identically every time.
 */
export const Campfire = ({
  theme,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = 1,
  sec = 0,
  seed = 'fire',
  lightIntensity = 10,
}: {
  theme: ThemeName;
  position?: Vec3;
  rotation?: Vec3;
  size?: number;
  /** Seconds into the shot; drives the flicker. */
  sec?: number;
  seed?: string;
  lightIntensity?: number;
}) => {
  const t = useTheme(theme);
  const flicker =
    0.82 + 0.1 * Math.sin(sec * 7.7) + 0.06 * Math.sin(sec * 13.3 + 1.1) + 0.04 * Math.sin(sec * 21.7);
  const lean = Math.sin(sec * 3.1) * 0.06;

  const stones = useMemo(
    () =>
      Array.from({length: 7}, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return {
          pos: [Math.cos(a) * size * 0.52, size * 0.06, Math.sin(a) * size * 0.52] as Vec3,
          r: size * (0.1 + seededUnit(`${seed}:s`, i) * 0.05),
        };
      }),
    [seed, size],
  );

  return (
    <group position={position} rotation={rotation}>
      {stones.map((s, i) => (
        <Blob
          key={i}
          radius={s.r}
          seed={`${seed}:stone${i}`}
          color={i % 2 ? base.stone : base.rock}
          position={s.pos}
          squash={[1, 0.7, 1]}
          detail={0}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <Cyl
          key={i}
          radiusTop={size * 0.055}
          radiusBottom={size * 0.065}
          height={size * 0.86}
          segments={6}
          color={materials.woodDark}
          position={[0, size * 0.14, 0]}
          rotation={[Math.PI / 2 - 0.24, (i / 3) * Math.PI * 2, 0]}
        />
      ))}
      {/* Flame: three emissive cones at different heights, scaled by the flicker. */}
      <group position={[0, size * 0.18, 0]} rotation={[0, 0, lean]}>
        <Cyl radiusTop={0} radiusBottom={size * 0.2} height={size * 0.62 * flicker + size * 0.2} segments={6} color={materials.accentOrange} emissive={materials.magma} emissiveIntensity={1.6} position={[0, size * 0.3, 0]} castShadow={false} />
        <Cyl radiusTop={0} radiusBottom={size * 0.12} height={size * 0.44 * flicker + size * 0.14} segments={6} color={materials.core} emissive={materials.core} emissiveIntensity={2.1} position={[0, size * 0.28, size * 0.02]} castShadow={false} />
      </group>
      <Halo size={size * 3.1} color={materials.lampGlow} opacity={0.34 * flicker} position={[0, size * 0.45, 0]} />
      <pointLight
        color={materials.lampGlow}
        intensity={lightIntensity * flicker}
        distance={size * 7}
        decay={2}
        position={[0, size * 0.55, 0]}
      />
      <BlobShadow radius={size * 0.95} opacity={0.3} color={t.shadowTint} position={[0, 0.012, 0]} />
    </group>
  );
};
