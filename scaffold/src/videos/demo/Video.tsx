import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Captions} from '../../kit/captions/Captions';
import {Soundtrack} from '../../kit/lib/audio';
import {palette, type ThemeName} from '../../kit/lib/palette';
import type {WordSpan} from '../../kit/lib/timing';
import type {TransitionSpec} from '../../kit/rig/transitions';
import {ShotTimeline, type ShotDef} from '../../kit/rig/ShotTimeline';
import captionData from './captions.json';
import script from './script.json';
import {TownScene} from './scenes/TownScene';
import {OverviewScene} from './scenes/OverviewScene';
import {UndergroundScene} from './scenes/UndergroundScene';
import {WideScene} from './scenes/WideScene';

/**
 * Demo — exercises the whole kit in ~10 s: in-world day walk, a beat cut to an
 * isometric overview, a tile slide into an underground fall, and a locked wide
 * that echoes the opening.
 *
 * Shot timing, transitions and themes come from script.json; the scenes only know
 * their own local frame.
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

const shotById = (id: string) => {
  const shot = SHOTS.find((s) => s.id === id);
  if (!shot) {
    throw new Error(`script.json has no shot "${id}"`);
  }
  return shot;
};

const scenes: Record<string, (props: {frame: number; durationInFrames: number}) => React.ReactNode> = {
  town: TownScene,
  overview: OverviewScene,
  underground: UndergroundScene,
  wide: WideScene,
};

export const Demo = ({debugCaptions = false}: {debugCaptions?: boolean}) => {
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

/** Length of the edit, derived from the shot list in script.json. */
export const DEMO_DURATION = SHOTS.reduce((max, s) => Math.max(max, s.from + s.durationInFrames), 0);

/** Shot list for notes/QA: frames, id, theme, transition out. */
export const demoShotList = SHOTS.map(
  (s) => `${String(s.from).padStart(4)}-${String(s.from + s.durationInFrames - 1).padStart(4)}f  ${s.id.padEnd(12)} ${s.theme.padEnd(12)} → ${s.out?.kind ?? 'end'}`,
).join('\n');

export const demoShotAnchors = {
  town: shotById('town'),
  overview: shotById('overview'),
  underground: shotById('underground'),
  wide: shotById('wide'),
};
