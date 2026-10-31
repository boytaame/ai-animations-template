import {Building} from '../../kit/architecture/Building';
import {lighten, materials, seededUnit, tint, useTheme, type ThemeName} from '../../kit/lib/palette';
import {RBox} from '../../kit/lib/parts';
import {Rocks} from '../../kit/nature/Rocks';
import {Bush, Tree} from '../../kit/nature/Trees';
import {Barrel} from '../../kit/props/Barrel';
import {Bench} from '../../kit/props/Bench';
import {Blanket} from '../../kit/props/Blanket';
import {Campfire} from '../../kit/props/Campfire';
import {Cone} from '../../kit/props/Cone';
import {CrateStack} from '../../kit/props/Crate';
import {Lamp} from '../../kit/props/Lamp';
import {Tent} from '../../kit/props/Tent';
import {DioramaTile} from '../../kit/world/DioramaTile';
import {Terrain} from '../../kit/world/Terrain';
import {Water} from '../../kit/world/Water';

/**
 * Dense showcase layout used by the Gallery composition: one tile, every kit
 * piece, three depth layers, so a still proves nothing is flat, harsh-black or
 * unbevelled.
 */
export const KitStage = ({theme, sec, size = 14}: {theme: ThemeName; sec: number; size?: number}) => {
  const t = useTheme(theme);
  const seed = `stage-${theme}`;
  const isCave = theme === 'underground';

  return (
    <DioramaTile theme={theme} size={size} tufts={28} seed={seed}>
      <Terrain
        theme={theme}
        size={size * 0.985}
        segments={14}
        height={0.18}
        seed={`${seed}:terrain`}
        flattenRadius={2.4}
      />

      {/* Stone path from the stoop to the front edge: direction the eye follows. */}
      {Array.from({length: 7}, (_, i) => (
        <RBox
          key={`slab-${i}`}
          size={[1.15 - i * 0.04, 0.09, 0.62]}
          radius={0.05}
          color={tint(materials.trimStone, `${seed}:slab`, 0.05, i)}
          position={[
            -1.5 + Math.sin(i * 0.9) * 0.18 + i * 0.12,
            0.06,
            0.9 + i * 0.72,
          ]}
          rotation={[0, Math.sin(i * 1.7) * 0.12, 0]}
        />
      ))}

      <Water
        theme={theme}
        size={3.4}
        position={[4.7, 0.09, -4.3]}
        sec={sec}
        seed={`${seed}:pond`}
        color={isCave ? materials.magma : undefined}
        deep={isCave ? materials.strata3 : undefined}
      />
      <Rocks theme={theme} seed={`${seed}:shore`} size={0.9} position={[3.1, 0, -3.1]} count={3} />

      <Building
        theme={theme}
        position={[-2.0, 0, -2.4]}
        rotation={[0, 0.32, 0]}
        width={4.8}
        depth={4.0}
        floors={3}
        seed={`${seed}:b`}
        litRatio={isCave ? 0.8 : 0.4}
      />

      <Bench theme={theme} position={[3.4, 0, 2.6]} rotation={[0, -0.7, 0]} seed={`${seed}:bench`} />
      <Lamp theme={theme} position={[4.7, 0, -0.4]} size={0.8} lightIntensity={isCave ? 12 : 7} />
      <CrateStack theme={theme} position={[-5.5, 0, 3.2]} rotation={[0, 0.3, 0]} seed={`${seed}:crates`} />
      <Barrel theme={theme} position={[-4.4, 0, 2.2]} size={0.85} seed={`${seed}:barrel`} />
      <Cone theme={theme} position={[0.2, 0, 4.4]} rotation={[0, 0.4, 0]} size={0.9} />
      <Blanket theme={theme} position={[2.6, 0, 4.8]} rotation={[0, 0.14, 0]} seed={`${seed}:blanket`} width={2.2} depth={1.6} />
      <Campfire theme={theme} position={[4.6, 0, 4.7]} size={0.85} sec={sec} seed={`${seed}:fire`} />
      <Tent theme={theme} position={[-5.6, 0, -3.9]} rotation={[0, 0.9, 0]} size={0.85} seed={`${seed}:tent`} />

      <Tree species="pine" theme={theme} seed={`${seed}:p1`} size={2.8} position={[-6.1, 0, -0.4]} sec={sec} />
      <Tree species="pine" theme={theme} seed={`${seed}:p2`} size={2.1} position={[-4.6, 0, -5.7]} sec={sec} />
      <Tree species="round" theme={theme} seed={`${seed}:r1`} size={2.5} position={[5.9, 0, 1.3]} sec={sec} />
      <Tree species="palm" theme={theme} seed={`${seed}:palm`} size={2.7} position={[5.9, 0, 5.7]} sec={sec} />
      <Bush theme={theme} seed={`${seed}:b1`} size={0.75} position={[1.8, 0, -5.8]} sec={sec} />
      <Bush theme={theme} seed={`${seed}:b2`} size={0.6} position={[-3.4, 0, 5.4]} sec={sec} />

      <Rocks theme={theme} seed={`${seed}:rocks`} size={1.6} position={[-0.8, 0, 6.1]} crystals={isCave} />
      <Rocks theme={theme} seed={`${seed}:rocks2`} size={1.1} position={[1.4, 0, -6.2]} />

      {/* Tertiary micro-props: dots of colour that keep the ground from reading flat. */}
      {Array.from({length: 10}, (_, i) => (
        <mesh
          key={`tuft-${i}`}
          position={[
            (seededUnit(`${seed}:bx`, i) - 0.5) * 11,
            0.16,
            (seededUnit(`${seed}:bz`, i) - 0.5) * 11,
          ]}
        >
          <sphereGeometry args={[0.1, 6, 4]} />
          <meshStandardMaterial color={lighten(tint(t.foliage, seed, 0.1, i), 0.1)} roughness={0.9} metalness={0} />
        </mesh>
      ))}
    </DioramaTile>
  );
};
