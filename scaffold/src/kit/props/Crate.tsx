import {materials, tint, useTheme, type ThemeName} from '../lib/palette';
import {BlobShadow, Cyl, RBox, type Vec3} from '../lib/parts';

/** Wooden crate: bevelled body, corner posts, diagonal brace, nail heads. */
export const Crate = ({
  theme,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = 1,
  seed = 'crate',
}: {
  theme: ThemeName;
  position?: Vec3;
  rotation?: Vec3;
  size?: number;
  seed?: string;
}) => {
  const t = useTheme(theme);
  const wood = tint(materials.woodLight, seed, 0.06);
  const dark = tint(materials.woodDark, seed, 0.05, 1);
  const s = size;

  return (
    <group position={position} rotation={rotation}>
      <RBox size={[s, s * 0.92, s]} radius={s * 0.05} color={wood} roughness={0.8} position={[0, s * 0.46, 0]} />
      {/* Corner posts */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([x, z], i) => (
        <RBox
          key={i}
          size={[s * 0.11, s * 0.95, s * 0.11]}
          radius={s * 0.02}
          color={dark}
          position={[(x * s) / 2.05, s * 0.47, (z * s) / 2.05]}
        />
      ))}
      {/* Horizontal bands */}
      {[0.22, 0.72].map((y, i) => (
        <RBox
          key={`band-${i}`}
          size={[s * 1.01, s * 0.08, s * 1.01]}
          radius={s * 0.02}
          color={dark}
          position={[0, s * y, 0]}
        />
      ))}
      {/* Diagonal brace on the front face */}
      <group position={[0, s * 0.47, s * 0.505]} rotation={[0, 0, 0.72]}>
        <RBox size={[s * 0.1, s * 0.92, s * 0.04]} radius={s * 0.015} color={dark} />
        <Cyl radiusTop={s * 0.018} radiusBottom={s * 0.018} height={s * 0.02} segments={6} color={materials.metal} rotation={[Math.PI / 2, 0, 0]} position={[0, s * 0.38, 0.03]} />
        <Cyl radiusTop={s * 0.018} radiusBottom={s * 0.018} height={s * 0.02} segments={6} color={materials.metal} rotation={[Math.PI / 2, 0, 0]} position={[0, -s * 0.38, 0.03]} />
      </group>
      <BlobShadow radius={s * 0.72} opacity={0.3} color={t.shadowTint} position={[0, 0.012, 0]} />
    </group>
  );
};

/** Two crates stacked with a slight rotation: instant set-dressing depth. */
export const CrateStack = ({
  theme,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 'stack',
}: {
  theme: ThemeName;
  position?: Vec3;
  rotation?: Vec3;
  seed?: string;
}) => (
  <group position={position} rotation={rotation}>
    <Crate theme={theme} seed={`${seed}:a`} size={1} />
    <Crate
      theme={theme}
      seed={`${seed}:b`}
      size={0.78}
      position={[0.12, 0.94, -0.08]}
      rotation={[0, 0.42, 0]}
    />
  </group>
);
