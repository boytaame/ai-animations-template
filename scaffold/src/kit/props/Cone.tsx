import {materials, useTheme, type ThemeName} from '../lib/palette';
import {BlobShadow, Cyl, RBox, type Vec3} from '../lib/parts';

/** Traffic cone: orange cone, white reflective band, weighted base. */
export const Cone = ({
  theme,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = 1,
}: {
  theme: ThemeName;
  position?: Vec3;
  rotation?: Vec3;
  size?: number;
}) => {
  const t = useTheme(theme);
  const h = size * 0.86;
  return (
    <group position={position} rotation={rotation}>
      <RBox size={[size * 0.62, size * 0.07, size * 0.62]} radius={size * 0.025} color={materials.accentOrange} position={[0, size * 0.035, 0]} />
      <Cyl radiusTop={size * 0.055} radiusBottom={size * 0.26} height={h} segments={10} color={materials.accentOrange} position={[0, h / 2 + size * 0.06, 0]} />
      <Cyl radiusTop={size * 0.13} radiusBottom={size * 0.175} height={size * 0.14} segments={10} color={materials.blanketWhite} position={[0, h * 0.52, 0]} />
      <BlobShadow radius={size * 0.42} opacity={0.26} color={t.shadowTint} position={[0, 0.01, 0]} />
    </group>
  );
};
