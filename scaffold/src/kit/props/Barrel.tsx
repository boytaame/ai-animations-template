import {materials, tint, useTheme, type ThemeName} from '../lib/palette';
import {BlobShadow, Cyl, type Vec3} from '../lib/parts';

/** Barrel: faceted staves, two metal hoops, a darker lid. */
export const Barrel = ({
  theme,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = 1,
  seed = 'barrel',
  tipped = false,
}: {
  theme: ThemeName;
  position?: Vec3;
  rotation?: Vec3;
  size?: number;
  seed?: string;
  tipped?: boolean;
}) => {
  const t = useTheme(theme);
  const wood = tint(materials.woodDark, seed, 0.05);
  const lid = tint(materials.woodLight, seed, 0.05, 1);
  const h = size * 1.15;

  return (
    <group position={position} rotation={[rotation[0] + (tipped ? Math.PI / 2 : 0), rotation[1], rotation[2]]}>
      <Cyl
        radiusTop={size * 0.36}
        radiusBottom={size * 0.36}
        height={h}
        segments={12}
        color={wood}
        position={[0, h / 2, 0]}
        flatShading
      />
      {/* Belly: a slightly wider band reads as a barrel, not a can. */}
      <Cyl
        radiusTop={size * 0.4}
        radiusBottom={size * 0.4}
        height={h * 0.42}
        segments={12}
        color={wood}
        position={[0, h * 0.5, 0]}
        flatShading
      />
      {[0.2, 0.8].map((y, i) => (
        <Cyl
          key={i}
          radiusTop={size * 0.385}
          radiusBottom={size * 0.385}
          height={h * 0.075}
          segments={12}
          color={materials.metal}
          roughness={0.6}
          position={[0, h * y, 0]}
          flatShading={false}
        />
      ))}
      <Cyl radiusTop={size * 0.35} radiusBottom={size * 0.35} height={size * 0.06} segments={12} color={lid} position={[0, h + size * 0.02, 0]} />
      {!tipped ? (
        <BlobShadow radius={size * 0.55} opacity={0.3} color={t.shadowTint} position={[0, 0.012, 0]} />
      ) : null}
    </group>
  );
};
