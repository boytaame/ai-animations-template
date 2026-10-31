import {useMemo} from 'react';
import {Figure} from '../../../kit/characters/Figure';
import {characters} from '../../../kit/lib/palette';
import {Tree} from '../../../kit/nature/Trees';
import {CameraRig} from '../../../kit/rig/CameraRig';
import {Lights} from '../../../kit/rig/Lights';
import {Stage} from '../../../kit/rig/RendererSetup';
import {buildShot} from '../../../kit/rig/shots';
import {SkyDome} from '../../../kit/world/SkyDome';
import {Terrain} from '../../../kit/world/Terrain';

/**
 * Scene stub. Each shot is one component that receives its own local frame and
 * returns a full <Stage>. Keep the three-layer rule: a foreground framing
 * element, the midground subject, and a background layer.
 */
export const ExampleScene = ({
  frame,
  durationInFrames,
}: {
  frame: number;
  durationInFrames: number;
}) => {
  const sec = frame / 30;
  const plan = useMemo(
    () =>
      buildShot('pushIn', {
        duration: durationInFrames,
        target: [0, 1.4, 0],
        distance: 9,
        azimuthDeg: 24,
        elevationDeg: 8,
        fov: 42,
      }),
    [durationInFrames],
  );

  return (
    <Stage theme="day" fog={{near: 18, far: 60}}>
      <SkyDome theme="day" seed="template-sky" clouds={6} />
      <Lights theme="day" area={9} />
      <CameraRig plan={plan} frame={frame} seed={1} />

      <Terrain theme="day" size={34} segments={18} height={0.28} seed="template-ground" />

      {/* Background */}
      <Tree species="pine" theme="day" seed="tpl-bg1" size={3} position={[-4.5, 0, -9]} sec={sec} />
      <Tree species="round" theme="day" seed="tpl-bg2" size={3.4} position={[4.2, 0, -10]} sec={sec} />

      {/* Midground subject */}
      <Figure
        theme="day"
        state="idle"
        t={sec}
        skin={characters.skin.a}
        shirt={characters.shirt.teal}
        pants={characters.pants.brown}
        hair={characters.hair.brown}
        seed="tpl-figure"
        position={[0, 0.02, 0]}
        rotationY={0.3}
      />

      {/* Foreground framing element (cropped by the frame edge) */}
      <Tree species="round" theme="day" seed="tpl-fg" size={3.4} position={[3.4, 0, 4.4]} sec={sec} />
    </Stage>
  );
};
