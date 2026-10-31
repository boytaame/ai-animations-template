import {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Figure} from '../../kit/characters/Figure';
import {poseFor, type FigureState} from '../../kit/characters/animations';
import {CAPTION_FONT_STACK, useCaptionFont} from '../../kit/captions/fonts';
import {characters, captions, materials, palette} from '../../kit/lib/palette';
import {CameraRig} from '../../kit/rig/CameraRig';
import {Lights} from '../../kit/rig/Lights';
import {Stage} from '../../kit/rig/RendererSetup';
import {buildShot} from '../../kit/rig/shots';
import {Crate} from '../../kit/props/Crate';
import {Tree} from '../../kit/nature/Trees';
import {Rocks} from '../../kit/nature/Rocks';
import {SkyDome} from '../../kit/world/SkyDome';
import {Terrain} from '../../kit/world/Terrain';

/**
 * M4 acceptance: every animation state, two seconds each, on one figure.
 * The state name is drawn with the caption font so font loading is exercised too.
 */

const STATES: FigureState[] = [
  'idle',
  'walk',
  'run',
  'jump',
  'fall',
  'float',
  'sit',
  'wave',
  'thumbsUp',
  'lookUp',
  'shrug',
  'dig',
  'celebrate',
];
const STATE_FRAMES = 60;
const BLEND_FRAMES = 9;

const CharacterScene = ({frame, stateIndex}: {frame: number; stateIndex: number}) => {
  const state = STATES[stateIndex];
  const prev = stateIndex > 0 ? STATES[stateIndex - 1] : state;
  const blendProgress = Math.min(1, frame / BLEND_FRAMES);
  const t = frame / 30;

  const plan = useMemo(
    () =>
      buildShot('orbit', {
        duration: STATE_FRAMES,
        target: [0, 0.95, 0],
        distance: 5.2,
        amount: 0.1,
        elevationDeg: 10,
        azimuthDeg: 18,
        fov: 38,
      }),
    [],
  );

  // Walk/run read from phase, not from arbitrary time: phase advances with the
  // distance a planted foot would cover.
  const options = useMemo(() => ({phase: (t * 0.95) % 1}), [t]);

  return (
    <Stage theme="day" fog={{near: 14, far: 46}}>
      <SkyDome theme="day" seed="showcase" clouds={5} />
      <Lights theme="day" area={6} keyPosition={[5, 8, 6]} rimPosition={[-5, 4, -6]} />
      <CameraRig plan={plan} frame={frame} seed={3} />
      <Terrain theme="day" size={30} segments={16} height={0.25} seed="showcase-ground" flattenRadius={2.6} />
      <Tree species="round" theme="day" seed="sc-tree" size={2.2} position={[-3.4, 0, -3.2]} sec={t} />
      <Tree species="pine" theme="day" seed="sc-pine" size={1.7} position={[3.6, 0, -4.2]} sec={t} />
      <Rocks theme="day" seed="sc-rock" size={1.1} position={[2.6, 0, 1.8]} />
      <Crate theme="day" position={[-2.4, 0, 1.6]} rotation={[0, 0.5, 0]} size={0.8} />

      <Figure
        theme="day"
        state={state}
        t={t}
        options={options}
        transition={{from: prev, progress: blendProgress, fromOptions: options}}
        skin={characters.skin.b}
        shirt={characters.shirt.yellow}
        pants={characters.pants.navy}
        hair={characters.hair.dark}
        accessory="hat"
        seed="showcase-figure"
        scale={1.25}
        position={[0, 0.02, 0]}
        rotationY={0.35}
      />
    </Stage>
  );
};

export const CharacterShowcase = () => {
  const frame = useCurrentFrame();
  useCaptionFont();
  const stateIndex = Math.min(STATES.length - 1, Math.floor(frame / STATE_FRAMES));
  const localFrame = frame - stateIndex * STATE_FRAMES;
  const state = STATES[stateIndex];
  const pose = poseFor(state, localFrame / 30);

  return (
    <AbsoluteFill style={{backgroundColor: palette.base.backdropDeep}}>
      <CharacterScene frame={localFrame} stateIndex={stateIndex} />
      <AbsoluteFill style={{padding: 48, alignItems: 'flex-start', justifyContent: 'flex-start'}}>
        <div
          style={{
            fontFamily: CAPTION_FONT_STACK,
            fontSize: 46,
            color: captions.text,
            textShadow: `0 4px 0 ${captions.stroke}`,
            letterSpacing: 1,
          }}
        >
          {state.toUpperCase()}
        </div>
        <div style={{fontFamily: CAPTION_FONT_STACK, fontSize: 22, color: materials.paper, opacity: 0.75, marginTop: 8}}>
          {`frame ${localFrame} · squashY ${pose.squashY.toFixed(3)} · pose driven by t only`}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const CHARACTER_SHOWCASE_DURATION = STATES.length * STATE_FRAMES;
