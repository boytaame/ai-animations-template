import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Captions} from '../../kit/captions/Captions';
import {Soundtrack} from '../../kit/lib/audio';
import {palette, type ThemeName} from '../../kit/lib/palette';
import type {WordSpan} from '../../kit/lib/timing';
import type {TransitionSpec} from '../../kit/rig/transitions';
import {ShotTimeline, type ShotDef} from '../../kit/rig/ShotTimeline';
import captionData from './captions.json';
import script from './script.json';
import {ExampleScene} from './scenes/ExampleScene';

/**
 * TEMPLATE — copy this whole folder to `src/videos/<slug>` for a new video:
 *
 *   1. Copy src/videos/_template → src/videos/my-slug (rename the folder, keep Video.tsx).
 *   2. Edit script.json: narration, beats, shots (from, durationInFrames, theme, in/out).
 *   3. Add one scene component per shot in scenes/, and register it in `scenes` below.
 *   4. Record the voiceover, run scripts/prepare-audio.mjs, then make-captions.mjs.
 *   5. Register the composition in src/Root.tsx with a unique id.
 *
 * Nothing here hard-codes timing: the shot list, transitions, captions and theme
 * all come from JSON.
 */

const CAPTION_WORDS = captionData.words as WordSpan[];

type ScriptShot = {
  id: string;
  from: number;
  durationInFrames: number;
  theme: ThemeName;
  in?: TransitionSpec;
  out?: TransitionSpec;
};

const SHOTS = script.shots as ScriptShot[];

/** One entry per shot id in script.json. */
const scenes: Record<string, (props: {frame: number; durationInFrames: number}) => React.ReactNode> = {
  example: ExampleScene,
};

export const Template = ({debugCaptions = false}: {debugCaptions?: boolean}) => {
  const frame = useCurrentFrame();

  const shots: ShotDef[] = SHOTS.map((shot) => {
    const Scene = scenes[shot.id];
    if (!Scene) {
      throw new Error(`No scene component registered for shot "${shot.id}"`);
    }
    return {
      id: shot.id,
      from: shot.from,
      durationInFrames: shot.durationInFrames,
      theme: shot.theme,
      in: shot.in,
      out: shot.out,
      render: ({frame: local}) => <Scene frame={local} durationInFrames={shot.durationInFrames} />,
    };
  });

  return (
    <AbsoluteFill style={{backgroundColor: palette.base.backdropDeep}}>
      <ShotTimeline shots={shots} frame={frame} />
      <Captions words={CAPTION_WORDS} debugCaptions={debugCaptions} />
      <Soundtrack voice="audio/voiceover.wav" music="audio/music-placeholder.mp3" musicGain={0.06} />
    </AbsoluteFill>
  );
};

export const TEMPLATE_DURATION = SHOTS.reduce(
  (max, s) => Math.max(max, s.from + s.durationInFrames),
  0,
);
