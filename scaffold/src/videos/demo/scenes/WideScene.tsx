import {useMemo} from 'react';
import {Building} from '../../../kit/architecture/Building';
import {Figure} from '../../../kit/characters/Figure';
import {characters, materials} from '../../../kit/lib/palette';
import {Tree} from '../../../kit/nature/Trees';
import {Rocks} from '../../../kit/nature/Rocks';
import {Bench} from '../../../kit/props/Bench';
import {CrateStack} from '../../../kit/props/Crate';
import {Lamp} from '../../../kit/props/Lamp';
import {CameraRig} from '../../../kit/rig/CameraRig';
import {Lights} from '../../../kit/rig/Lights';
import {Stage} from '../../../kit/rig/RendererSetup';
import {buildShot} from '../../../kit/rig/shots';
import {SkyDome} from '../../../kit/world/SkyDome';
import {Terrain} from '../../../kit/world/Terrain';

/**
 * Shot 4 — locked wide closing the loop: same set as shot 1, camera far back,
 * the walker now standing by the door. The drift is small but never zero, and the
 * framing echoes the opening so a replay does not jump.
 */

export const WideScene = ({frame, durationInFrames}: {frame: number; durationInFrames: number}) => {
  const sec = frame / 30;
  const plan = useMemo(
    () =>
      buildShot('lockedWide', {
        duration: durationInFrames,
        target: [0.2, 2.2, -2.6],
        distance: 27,
        azimuthDeg: 26,
        elevationDeg: 9,
        fov: 36,
        dolly: 0.2,
      }),
    [durationInFrames],
  );

  return (
    <Stage theme="dusk" fog={{near: 32, far: 100}}>
      <SkyDome theme="dusk" seed="town-sky" clouds={7} />
      <Lights theme="dusk" area={16} keyPosition={[14, 20, 10]} rimPosition={[-10, 8, -12]} />
      <CameraRig plan={plan} frame={frame} seed={8} breatheAmount={1.1} />

      <Terrain theme="dusk" size={60} segments={24} height={0.34} seed="town-ground" flattenRadius={5.2} />

      <Building
        theme="dusk"
        position={[-1.3, 0, -3.4]}
        rotation={[0, 0.24, 0]}
        floors={3}
        width={4.6}
        depth={3.9}
        seed="town-building"
        litRatio={0.5}
      />
      <Figure
        theme="dusk"
        state="idle"
        t={sec + 1.2}
        skin={characters.skin.c}
        shirt={characters.shirt.yellow}
        pants={characters.pants.navy}
        hair={characters.hair.dark}
        accessory="backpack"
        seed="walker"
        scale={1.15}
        position={[-0.1, 0.02, 0.6]}
        rotationY={0.5}
      />

      <Lamp theme="dusk" position={[2.5, 0, 0.7]} size={0.9} lightIntensity={9} />
      <Bench theme="dusk" position={[3.5, 0, 2.2]} rotation={[0, -0.75, 0]} seed="town-bench" />
      <CrateStack theme="dusk" position={[-3.4, 0, -0.6]} rotation={[0, 0.42, 0]} seed="town-crates" />

      <Tree species="round" theme="dusk" seed="mid-tree" size={2.9} position={[-4.9, 0, -0.9]} sec={sec} />
      <Tree species="pine" theme="dusk" seed="bg1" size={3.4} position={[-5.6, 0, -11]} sec={sec} />
      <Tree species="round" theme="dusk" seed="bg2" size={3.8} position={[4.6, 0, -12.5]} sec={sec} />
      <Tree species="pine" theme="dusk" seed="bg3" size={2.8} position={[1.2, 0, -14]} sec={sec} />
      <Tree species="round" theme="dusk" seed="fg-tree" size={3.2} position={[5.6, 0, 5.6]} sec={sec} />
      <Rocks theme="dusk" seed="fg-rock" size={2.2} position={[-4.8, 0, 5.2]} count={3} />
      <Rocks theme="dusk" seed="bg-rocks" size={2.4} position={[-8.5, 0, -9]} count={3} />
      {/* Front garden: a few stone slabs instead of one flat pad. */}
      {Array.from({length: 4}, (_, i) => (
        <mesh
          key={`garden-${i}`}
          position={[0.1 + (i % 2) * 0.5, 0.07, 0.6 + Math.floor(i / 2) * 0.7]}
          rotation={[-Math.PI / 2, 0, 0.1 * i]}
        >
          <planeGeometry args={[0.95, 0.62]} />
          <meshStandardMaterial color={materials.trimStone} roughness={0.9} metalness={0} />
        </mesh>
      ))}
    </Stage>
  );
};
