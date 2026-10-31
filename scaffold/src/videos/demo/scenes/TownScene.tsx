import {useMemo} from 'react';
import {Building} from '../../../kit/architecture/Building';
import {WALK_STRIDE} from '../../../kit/characters/animations';
import {Figure} from '../../../kit/characters/Figure';
import {characters, materials} from '../../../kit/lib/palette';
import {RBox} from '../../../kit/lib/parts';
import {Tree} from '../../../kit/nature/Trees';
import {Rocks} from '../../../kit/nature/Rocks';
import {Barrel} from '../../../kit/props/Barrel';
import {Bench} from '../../../kit/props/Bench';
import {Cone} from '../../../kit/props/Cone';
import {CrateStack} from '../../../kit/props/Crate';
import {Lamp} from '../../../kit/props/Lamp';
import {CameraRig} from '../../../kit/rig/CameraRig';
import {Lights} from '../../../kit/rig/Lights';
import {Stage} from '../../../kit/rig/RendererSetup';
import {buildShot} from '../../../kit/rig/shots';
import {SkyDome} from '../../../kit/world/SkyDome';
import {Terrain} from '../../../kit/world/Terrain';

/**
 * Shot 1 — in-world day. A figure walks to the townhouse.
 * Foreground: a tree and a boulder framing the edge. Midground: the walker and
 * the building. Background: the treeline and the sky dome.
 */

const START: [number, number] = [1.9, 4.4];
const END: [number, number] = [0.2, 0.1];
const SPEED = 1.35; // world units per second

export const TownScene = ({frame, durationInFrames}: {frame: number; durationInFrames: number}) => {
  const sec = frame / 30;

  const plan = useMemo(
    () =>
      buildShot('pushIn', {
        duration: durationInFrames,
        target: [0.1, 0.7, 0.2],
        distance: 17.5,
        azimuthDeg: 22,
        elevationDeg: 9,
        fov: 40,
      }),
    [durationInFrames],
  );

  // Walk is driven by distance, not by time: feet stay planted (spec 4.8).
  const dirX = END[0] - START[0];
  const dirZ = END[1] - START[1];
  const length = Math.hypot(dirX, dirZ);
  const travelled = Math.min(length, SPEED * sec);
  const x = START[0] + (dirX / length) * travelled;
  const z = START[1] + (dirZ / length) * travelled;
  const phase = travelled / WALK_STRIDE;
  const facing = Math.atan2(dirX, dirZ);

  return (
    <Stage theme="day" fog={{near: 22, far: 78}}>
      <SkyDome theme="day" seed="town-sky" clouds={7} />
      <Lights
        theme="day"
        area={13}
        keyPosition={[12, 18, 9]}
        rimPosition={[-9, 7, -11]}
        points={[{position: [2.4, 2.9, 0.6], intensity: 6, distance: 6}]}
      />
      <CameraRig plan={plan} frame={frame} seed={1} />

      <Terrain theme="day" size={46} segments={22} height={0.32} seed="town-ground" flattenRadius={4.5} />

      {/* Background layer */}
      <Tree species="pine" theme="day" seed="bg1" size={3.4} position={[-5.6, 0, -11]} sec={sec} />
      <Tree species="round" theme="day" seed="bg2" size={3.8} position={[4.6, 0, -12.5]} sec={sec} />
      <Tree species="pine" theme="day" seed="bg3" size={2.8} position={[1.2, 0, -14]} sec={sec} />
      <Rocks theme="day" seed="bg-rocks" size={2.4} position={[-8.5, 0, -9]} count={3} />

      {/* Midground: the hero building and the street furniture */}
      <Building
        theme="day"
        position={[-1.3, 0, -3.4]}
        rotation={[0, 0.24, 0]}
        floors={3}
        width={4.6}
        depth={3.9}
        seed="town-building"
        litRatio={0.5}
      />
      {Array.from({length: 6}, (_, i) => (
        <RBox
          key={`slab-${i}`}
          size={[1.05, 0.09, 0.6]}
          radius={0.05}
          color={materials.trimStone}
          position={[-1.2 + Math.sin(i * 0.8) * 0.14, 0.05, 0.1 + i * 0.62]}
          rotation={[0, Math.sin(i * 1.4) * 0.1, 0]}
        />
      ))}
      <Lamp theme="day" position={[2.5, 0, 0.7]} size={0.9} />
      <Bench theme="day" position={[3.5, 0, 2.2]} rotation={[0, -0.75, 0]} seed="town-bench" />
      <CrateStack theme="day" position={[-3.4, 0, -0.6]} rotation={[0, 0.42, 0]} seed="town-crates" />
      <Barrel theme="day" position={[-2.5, 0, 0.5]} size={0.9} seed="town-barrel" />
      <Cone theme="day" position={[1.6, 0, 2.4]} size={0.9} rotation={[0, 0.3, 0]} />
      <Tree species="round" theme="day" seed="mid-tree" size={2.9} position={[-4.9, 0, -0.9]} sec={sec} />

      {/* The walker */}
      <Figure
        theme="day"
        state="walk"
        t={sec}
        options={{phase}}
        skin={characters.skin.c}
        shirt={characters.shirt.yellow}
        pants={characters.pants.navy}
        hair={characters.hair.dark}
        accessory="backpack"
        seed="walker"
        scale={1.15}
        position={[x, 0.02, z]}
        rotationY={facing}
      />

      {/* Foreground framing: cropped tree and boulder at the frame edge */}
      <Tree species="round" theme="day" seed="fg-tree" size={4.4} position={[5.2, 0, 6.4]} sec={sec} />
      <Rocks theme="day" seed="fg-rock" size={2.6} position={[-4.6, 0, 5.8]} count={3} />
      <Tree species="pine" theme="day" seed="fg-pine" size={2.6} position={[-5.4, 0, 3.4]} sec={sec} />
    </Stage>
  );
};
