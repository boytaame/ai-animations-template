import {Fragment, type ReactNode} from 'react';
import {AbsoluteFill} from 'remotion';
import type {ThemeName} from '../lib/palette';
import {
  overlapFrames,
  transitionStyle,
  type TransitionSpec,
} from './transitions';

/**
 * Shot timeline: renders a list of shots with their transitions.
 *
 * Each shot owns its own canvas and receives an explicit shot-local frame, so a
 * transition can hold two shots at once without relying on `<Sequence>` timing.
 * Cut windows are derived from the transition spec (spec 4.9 C):
 *
 *  - hardCut / matchCut : visible swap exactly at the boundary; the carry is
 *                         authored in the framing, not in this component.
 *  - whipThrough        : the outgoing shot accelerates over its last frames and
 *                         the incoming decelerates over its first frames; the cut
 *                         lands at peak velocity, so nothing flashes.
 *  - dissolve/tileSlide : both layers share the window [end - frames, end], so
 *                         the incoming shot pre-rolls (negative local frames are
 *                         clamped by the animation tracks).
 */

export type ShotRenderProps = {
  /** Shot-local frame; may be negative during an overlapping entrance. */
  frame: number;
  durationInFrames: number;
  theme: ThemeName;
};

export type ShotDef = {
  id: string;
  /** Global start frame. */
  from: number;
  durationInFrames: number;
  theme: ThemeName;
  /** Transition used entering this shot (matches the previous shot's `out`). */
  in?: TransitionSpec;
  /** Transition used leaving this shot. */
  out?: TransitionSpec;
  render: (props: ShotRenderProps) => ReactNode;
};

const isOverlapKind = (kind: TransitionSpec['kind']) =>
  kind === 'dissolve' || kind === 'tileSlide';

/** Frames this shot shows before its own start frame (overlapping entrances). */
const entryOverlap = (spec?: TransitionSpec): number =>
  spec && isOverlapKind(spec.kind) ? overlapFrames(spec) : 0;

export const ShotTimeline = ({shots, frame}: {shots: ShotDef[]; frame: number}) => {
  return (
    <>
      {shots.map((shot) => {
        const start = shot.from - entryOverlap(shot.in);
        const end = shot.from + shot.durationInFrames;
        if (frame < start || frame >= end) {
          return null;
        }

        const local = frame - shot.from;
        const styles: React.CSSProperties[] = [];

        // Entrance window.
        if (shot.in) {
          const inFrames = overlapFrames(shot.in);
          if (inFrames > 0) {
            const winStart = isOverlapKind(shot.in.kind) ? shot.from - inFrames : shot.from;
            if (frame >= winStart && frame < winStart + inFrames) {
              styles.push(transitionStyle(shot.in, 'in', (frame - winStart) / inFrames));
            }
          }
        }

        // Exit window (the last `frames` of this shot).
        if (shot.out) {
          const outFrames = overlapFrames(shot.out);
          if (outFrames > 0 && frame >= end - outFrames) {
            styles.push(transitionStyle(shot.out, 'out', (frame - (end - outFrames)) / outFrames));
          }
        }

        const style = Object.assign({}, ...styles) as React.CSSProperties;

        return (
          <AbsoluteFill key={shot.id} style={{...style, willChange: 'transform, opacity, filter'}}>
            <Fragment>
              {shot.render({
                frame: local,
                durationInFrames: shot.durationInFrames,
                theme: shot.theme,
              })}
            </Fragment>
          </AbsoluteFill>
        );
      })}
    </>
  );
};

/** Total frames covered by a shot list (last shot's end). */
export const timelineFrames = (shots: ShotDef[]): number =>
  shots.reduce((max, s) => Math.max(max, s.from + s.durationInFrames), 0);

/** ASCII shot list for the console / notes. */
export const printShotList = (shots: ShotDef[]): string =>
  shots
    .map(
      (s) =>
        `${String(s.from).padStart(4)}-${String(s.from + s.durationInFrames - 1).padStart(4)}f  ${s.id.padEnd(
          14,
        )} ${s.theme.padEnd(12)} ${s.out ? `→ ${s.out.kind}` : 'end'}`,
    )
    .join('\n');
