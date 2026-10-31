import {materials, tint, useTheme, type ThemeName} from '../lib/palette';
import {BlobShadow, Cyl, RBox, type Vec3} from '../lib/parts';

/** Park bench: three seat slats, two back slats, cast-metal legs. */
export const Bench = ({
  theme,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = 1,
  seed = 'bench',
}: {
  theme: ThemeName;
  position?: Vec3;
  rotation?: Vec3;
  size?: number;
  seed?: string;
}) => {
  const t = useTheme(theme);
  const wood = tint(materials.woodLight, seed, 0.05);
  const seatY = size * 0.46;
  return (
    <group position={position} rotation={rotation}>
      {[-0.16, 0, 0.16].map((z, i) => (
        <RBox
          key={`seat-${i}`}
          size={[size * 1.7, size * 0.07, size * 0.13]}
          radius={size * 0.02}
          color={wood}
          position={[0, seatY, z * size]}
        />
      ))}
      {[0.1, 0.32].map((h, i) => (
        <RBox
          key={`back-${i}`}
          size={[size * 1.7, size * 0.12, size * 0.06]}
          radius={size * 0.02}
          color={wood}
          position={[0, seatY + size * h + size * 0.08, -size * 0.26]}
          rotation={[-0.1, 0, 0]}
        />
      ))}
      {/* Frame: a rail under the slats plus two cast legs with feet. */}
      <RBox size={[size * 1.62, size * 0.07, size * 0.5]} radius={size * 0.02} color={materials.metal} position={[0, seatY - size * 0.07, 0]} />
      <RBox size={[size * 1.62, size * 0.09, size * 0.06]} radius={size * 0.02} color={materials.metal} position={[0, seatY + size * 0.02, -size * 0.28]} />
      {[-0.7, 0.7].map((x, i) => (
        <group key={`leg-${i}`} position={[x * size, 0, 0]}>
          <Cyl radiusTop={size * 0.05} radiusBottom={size * 0.055} height={seatY} segments={8} color={materials.metal} flatShading={false} position={[0, seatY / 2, 0]} />
          <Cyl radiusTop={size * 0.045} radiusBottom={size * 0.05} height={size * 0.62} segments={8} color={materials.metal} flatShading={false} position={[0, seatY + size * 0.26, -size * 0.26]} rotation={[-0.12, 0, 0]} />
          <RBox size={[size * 0.2, size * 0.05, size * 0.66]} radius={size * 0.02} color={materials.metal} position={[0, size * 0.025, 0]} />
          <RBox size={[size * 0.2, size * 0.05, size * 0.16]} radius={size * 0.015} color={materials.metal} position={[0, size * 0.42, -size * 0.3]} />
        </group>
      ))}
      <BlobShadow radius={size * 1.05} opacity={0.26} color={t.shadowTint} position={[0, 0.012, 0]} squash={0.6} />
    </group>
  );
};
