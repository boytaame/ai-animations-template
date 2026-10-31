import {useMemo} from 'react';
import {materials, seededUnit, useTheme, type ThemeName} from '../lib/palette';
import {BlobShadow, RBox, type Vec3} from '../lib/parts';

/** Picnic blanket: a checkered grid of thin bevel tiles with small tassels. */
export const Blanket = ({
  theme,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 2.4,
  depth = 1.7,
  seed = 'blanket',
}: {
  theme: ThemeName;
  position?: Vec3;
  rotation?: Vec3;
  width?: number;
  depth?: number;
  seed?: string;
}) => {
  const t = useTheme(theme);
  const cols = 6;
  const rows = 4;

  const tiles = useMemo(() => {
    const out: {pos: Vec3; color: string; rot: number}[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const alternate = (r + c) % 2 === 0;
        out.push({
          pos: [
            (c - (cols - 1) / 2) * (width / cols),
            0.006 + seededUnit(`${seed}:h`, r * cols + c) * 0.004,
            (r - (rows - 1) / 2) * (depth / rows),
          ],
          color: alternate ? materials.blanketRed : materials.blanketWhite,
          rot: (seededUnit(`${seed}:r`, r * cols + c) - 0.5) * 0.02,
        });
      }
    }
    return out;
  }, [cols, rows, width, depth, seed]);

  return (
    <group position={position} rotation={rotation}>
      <RBox
        size={[width * 1.02, 0.015, depth * 1.02]}
        radius={0.01}
        color={materials.blanketWhite}
        position={[0, 0.002, 0]}
      />
      {tiles.map((tile, i) => (
        <RBox
          key={i}
          size={[width / cols * 0.96, 0.018, depth / rows * 0.96]}
          radius={0.006}
          color={tile.color}
          position={tile.pos}
          rotation={[0, tile.rot, 0]}
          castShadow={false}
        />
      ))}
      {/* Tassels: four little knots so the edge is not a hard rectangle. */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([x, z], i) => (
        <RBox
          key={`tassel-${i}`}
          size={[0.06, 0.04, 0.06]}
          radius={0.014}
          color={materials.blanketWhite}
          position={[(x * width) / 2.1, 0.012, (z * depth) / 2.1]}
          castShadow={false}
        />
      ))}
      <BlobShadow radius={width * 0.62} opacity={0.2} color={t.shadowTint} position={[0, 0.001, 0]} squash={depth / width} feather={0.6} />
    </group>
  );
};
