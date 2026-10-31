import {Audio, staticFile, getStaticFiles, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * Audio slots (spec 7). The kit renders with no audio files at all: if the file
 * is absent the slot is skipped, so the project never breaks on a missing asset.
 *
 * Drop files in and they play, with fades, no code change:
 *   public/audio/voiceover.wav
 *   public/audio/music-placeholder.mp3
 */

const fileExists = (relative: string): boolean => {
  try {
    const name = relative.replace(/^\//, '');
    return getStaticFiles().some((f) => f.name === name);
  } catch {
    return false;
  }
};

export type AudioSlotProps = {
  /** Path inside /public, e.g. "audio/voiceover.wav". */
  file: string;
  volume?: number;
  fadeInSec?: number;
  fadeOutSec?: number;
  startFromSec?: number;
};

export const AudioSlot = ({
  file,
  volume = 1,
  fadeInSec = 0.4,
  fadeOutSec = 1,
  startFromSec = 0,
}: AudioSlotProps) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  if (!fileExists(file)) {
    return null;
  }
  const inFrames = Math.max(1, Math.round(fadeInSec * fps));
  const outFrames = Math.max(1, Math.round(fadeOutSec * fps));
  const gain = interpolate(
    frame,
    [0, inFrames, durationInFrames - outFrames, durationInFrames],
    [0, volume, volume, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  return <Audio src={staticFile(file)} volume={gain} startFrom={Math.round(startFromSec * fps)} />;
};

/**
 * Voiceover + music bed. Music sits about 22-26 dB under the voice (spec 7.2),
 * and is skipped entirely when the file is missing.
 */
export const Soundtrack = ({
  voice = 'audio/voiceover.wav',
  music = 'audio/music-placeholder.mp3',
  musicGain = 0.06,
}: {
  voice?: string;
  music?: string;
  musicGain?: number;
}) => (
  <>
    <AudioSlot file={voice} volume={1} fadeInSec={0} fadeOutSec={0.15} />
    <AudioSlot file={music} volume={musicGain} fadeInSec={0.5} fadeOutSec={1.2} />
  </>
);

/** True when an audio slot would actually play (handy for notes/QA). */
export const audioAvailable = (file: string): boolean => fileExists(file);
