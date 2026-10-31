import {materials, tint, useTheme, type ThemeName} from '../lib/palette';
import {BlobShadow, Cyl, RBox, type Vec3} from '../lib/parts';

/** A-frame tent: two slanted panels, ridge pole, dark opening, ground mat. */
export const Tent = ({
  theme,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = 1,
  seed = 'tent',
  color,
}: {
  theme: ThemeName;
  position?: Vec3;
  rotation?: Vec3;
  size?: number;
  seed?: string;
  color?: string;
}) => {
  const t = useTheme(theme);
  const canvas = color ?? tint(materials.awning, seed, 0.04);
  const h = size * 1.45;
  const w = size * 1.9;
  const d = size * 1.7;

  return (
    <group position={position} rotation={rotation}>
      {/* Two leaning panels meeting at the ridge. */}
      <group position={[0, h * 0.5, 0]}>
        <RBox
          size={[w * 0.62, h * 1.02, d]}
          radius={size * 0.04}
          color={canvas}
          position={[-w * 0.24, 0, 0]}
          rotation={[0, 0, 0.52]}
        />
        <RBox
          size={[w * 0.62, h * 1.02, d]}
          radius={size * 0.04}
          color={canvas}
          position={[w * 0.24, 0, 0]}
          rotation={[0, 0, -0.52]}
        />
      </group>
      <Cyl radiusTop={size * 0.045} radiusBottom={size * 0.045} height={d * 1.04} segments={7} color={materials.woodDark} position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {/* Opening: a dark wedge on the front face reads at phone size. */}
      <group position={[0, h * 0.46, d * 0.5 - 0.01]} rotation={[0, 0, Math.PI / 4]}>
        <RBox size={[size * 0.86, size * 0.86, size * 0.06]} radius={size * 0.02} color={materials.dark} />
      </group>
      {/* Ground mat and two pegs. */}
      <RBox size={[w * 1.02, size * 0.04, d * 1.02]} radius={size * 0.02} color={tint(materials.sand, seed, 0.05, 2)} position={[0, size * 0.02, 0]} />
      <Cyl radiusTop={size * 0.02} radiusBottom={size * 0.03} height={size * 0.24} segments={5} color={materials.woodDark} position={[w * 0.52, size * 0.12, d * 0.42]} rotation={[0.2, 0, -0.15]} />
      <Cyl radiusTop={size * 0.02} radiusBottom={size * 0.03} height={size * 0.24} segments={5} color={materials.woodDark} position={[-w * 0.52, size * 0.12, d * 0.42]} rotation={[0.2, 0, 0.15]} />
      <BlobShadow radius={size * 1.15} opacity={0.28} color={t.shadowTint} position={[0, 0.012, 0]} />
    </group>
  );
};
