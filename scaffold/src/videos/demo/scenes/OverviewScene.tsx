import {useMemo} from 'react';
import {Building} from '../../../kit/architecture/Building';
import {Figure} from '../../../kit/characters/Figure';
import {characters, materials} from '../../../kit/lib/palette';
import {RBox} from '../../../kit/lib/parts';
import {Tree} from '../../../kit/nature/Trees';
import {Rocks} from '../../../kit/nature/Rocks';
import {Bench} from '../../../kit/props/Bench';
import {Campfire} from '../../../kit/props/Campfire';
import {CrateStack} from '../../../kit/props/Crate';
import {Lamp} from '../../../kit/props/Lamp';
import {Tent} from '../../../kit/props/Tent';
import {CameraRig} from '../../../kit/rig/CameraRig';
import {Lights} from '../../../kit/rig/Lights';
import {Stage} from '../../../kit/rig/RendererSetup';
import {buildShot} from '../../../kit/rig/shots';
import {Backdrop} from '../../../kit/world/Backdrop';
import {DioramaTile} from '../../../kit/world/DioramaTile';
import {Terrain} from '../../../kit/world/Terrain';
import {Water} from '../../../kit/world/Water';

/**
 * Shot 2 — isometric tile overview, slow orbit, navy backdrop.
 * Same set as shot 1 seen from above: the building, the walker (now standing by
 * the door) and the same cast, so continuity survives the cut.
 */

export const OverviewScene = ({frame, durationInFrames}: {frame: number; durationInFrames: number}) => {
  const sec = frame / 30;
  const plan = useMemo(
    () =>
      buildShot('tileIso', {
        duration: durationInFrames,
        target: [0, 5.0, 0],
        distance: 70,
        azimuthDeg: 45,
        elevationDeg: 35,
        fov: 23,
        amount: 0.06,
      }),
    [durationInFrames],
  );

  return (
    <Stage theme="day" fog={{near: 70, far: 150}}>
      <Backdrop />
      <Lights
        theme="day"
        area={14}
        keyPosition={[14, 20, 11]}
        rimPosition={[-10, 9, -12]}
        points={[{position: [2.6, 2.2, 1.2], intensity: 7, distance: 7}]}
      />
      <CameraRig plan={plan} frame={frame} seed={4} />

      <DioramaTile theme="day" size={13} tufts={26} seed="overview-tile">
        <Terrain theme="day" size={12.8} segments={13} height={0.2} seed="overview-ground" flattenRadius={2.6} />

        <Building
          theme="day"
          position={[-1.6, 0, -2.2]}
          rotation={[0, 0.26, 0]}
          floors={3}
          width={4.4}
          depth={3.8}
          seed="town-building"
          litRatio={0.5}
        />
        {Array.from({length: 6}, (_, i) => (
          <RBox
            key={`slab-${i}`}
            size={[1.0, 0.09, 0.56]}
            radius={0.05}
            color={materials.trimStone}
            position={[-1.4 + Math.sin(i * 0.8) * 0.14 + i * 0.16, 0.05, 0.2 + i * 0.6]}
            rotation={[0, Math.sin(i * 1.4) * 0.1, 0]}
          />
        ))}
        <Figure
          theme="day"
          state="idle"
          t={sec + 0.4}
          skin={characters.skin.c}
          shirt={characters.shirt.yellow}
          pants={characters.pants.navy}
          hair={characters.hair.dark}
          accessory="backpack"
          seed="walker"
          scale={1.05}
          position={[-0.2, 0.02, 0.6]}
          rotationY={0.4}
        />

        <Bench theme="day" position={[2.6, 0, 2.4]} rotation={[0, -0.8, 0]} seed="town-bench" />
        <Lamp theme="day" position={[3.4, 0, 0.4]} size={0.85} />
        <CrateStack theme="day" position={[-4.4, 0, 1.2]} rotation={[0, 0.42, 0]} seed="town-crates" />
        <Tent theme="day" position={[-4.6, 0, -3.4]} rotation={[0, 0.9, 0]} size={0.85} seed="overview-tent" />
        <Campfire theme="day" position={[3.2, 0, 4.4]} size={0.8} sec={sec} seed="overview-fire" />

        <Water theme="day" size={3.2} position={[4.4, 0.09, -3.9]} sec={sec} seed="overview-pond" />
        <Rocks theme="day" seed="overview-shore" size={0.9} position={[2.9, 0, -2.9]} count={3} />

        <Tree species="round" theme="day" seed="mid-tree" size={2.7} position={[-5.2, 0, -0.6]} sec={sec} />
        <Tree species="pine" theme="day" seed="bg1" size={2.6} position={[-5.6, 0, -5.2]} sec={sec} />
        <Tree species="palm" theme="day" seed="ov-palm" size={2.6} position={[5.4, 0, 3.4]} sec={sec} />
        <Tree species="round" theme="day" seed="bg2" size={2.2} position={[5.2, 0, -0.6]} sec={sec} />
        <Rocks theme="day" seed="ov-rocks" size={1.3} position={[0.8, 0, 5.2]} />
      </DioramaTile>
    </Stage>
  );
};
