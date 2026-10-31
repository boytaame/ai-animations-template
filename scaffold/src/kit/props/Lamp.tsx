import {materials, useTheme, type ThemeName} from '../lib/palette';
import {BlobShadow, Cyl, Halo, RBox, type Vec3} from '../lib/parts';

/**
 * Street lamp: pole, bracket, glowing head, halo sprite and a warm point light so
 * it visibly warms the ground beneath it (spec 4.5).
 */
export const Lamp = ({
  theme,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = 1,
  lit = true,
  lightIntensity = 9,
}: {
  theme: ThemeName;
  position?: Vec3;
  rotation?: Vec3;
  size?: number;
  lit?: boolean;
  lightIntensity?: number;
}) => {
  const t = useTheme(theme);
  const h = size * 3.1;
  const headY = h * 0.92;

  return (
    <group position={position} rotation={rotation}>
      <Cyl radiusTop={size * 0.07} radiusBottom={size * 0.12} height={size * 0.16} segments={8} color={materials.dark} position={[0, size * 0.08, 0]} />
      <Cyl radiusTop={size * 0.035} radiusBottom={size * 0.05} height={h} segments={8} color={materials.dark} position={[0, h / 2 + size * 0.1, 0]} flatShading={false} />
      {/* Bracket arm */}
      <RBox size={[size * 0.42, size * 0.05, size * 0.05]} radius={size * 0.02} color={materials.dark} position={[size * 0.2, headY, 0]} />
      {/* Head: hood + emissive panel underside */}
      <RBox size={[size * 0.34, size * 0.1, size * 0.34]} radius={size * 0.03} color={materials.dark} position={[size * 0.4, headY + size * 0.06, 0]} />
      <RBox
        size={[size * 0.26, size * 0.07, size * 0.26]}
        radius={size * 0.02}
        color={materials.windowGlow}
        emissive={lit ? materials.lampGlow : undefined}
        emissiveIntensity={lit ? 1.5 : 0}
        position={[size * 0.4, headY - size * 0.02, 0]}
        castShadow={false}
      />
      {lit ? (
        <>
          <Halo size={size * 1.5} color={materials.lampGlow} opacity={0.42} position={[size * 0.4, headY - size * 0.04, 0]} />
          <pointLight
            color={materials.lampGlow}
            intensity={lightIntensity}
            distance={size * 7}
            decay={2}
            position={[size * 0.4, headY - size * 0.2, 0]}
          />
        </>
      ) : null}
      <BlobShadow radius={size * 0.5} opacity={0.28} color={t.shadowTint} position={[0, 0.012, 0]} />
    </group>
  );
};
