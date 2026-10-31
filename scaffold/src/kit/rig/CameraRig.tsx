import {useThree} from '@react-three/fiber';
import {useVideoConfig} from 'remotion';
import {sample, sample3} from '../lib/keyframes';
import type {CameraPlan} from './shots';

/**
 * Drives the camera from keyframe tracks (spec 4.7 / 4.9 L).
 *
 * The frame is a prop, not `useCurrentFrame()`: shots own their own local time,
 * so transitions can show two shots at once. Nothing here reads wall-clock time
 * or stores state between frames.
 */

export type CameraRigProps = {
  plan: CameraPlan;
  /** Shot-local frame. */
  frame: number;
  /** Slow breathing drift so a hold is never a frozen frame (spec 4.7). */
  breathe?: boolean;
  /** 0..1 multiplier on the breathing amplitude, e.g. to calm a locked wide. */
  breatheAmount?: number;
  /** Deterministic phase offset so two shots do not breathe in lockstep. */
  seed?: number;
};

const BREATHE_X_SEC = 6.4;
const BREATHE_Y_SEC = 9.1;
const BREATHE_Z_SEC = 12.7;

export const CameraRig = ({
  plan,
  frame,
  breathe = true,
  breatheAmount = 1,
  seed = 0,
}: CameraRigProps) => {
  const camera = useThree((s) => s.camera);
  const {fps} = useVideoConfig();

  const pos = sample3(plan.position, frame);
  const tgt = sample3(plan.target, frame);
  const fov = sample(plan.fov as never, frame) as number;

  const dx = pos[0] - tgt[0];
  const dy = pos[1] - tgt[1];
  const dz = pos[2] - tgt[2];
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

  // ~0.5-1% of the scene scale per second, with three incommensurate periods so
  // the drift never reads as a loop or as handheld shake.
  const amp = dist * 0.006 * breatheAmount * (breathe ? 1 : 0);
  const sec = frame / fps;
  const bx = Math.sin((sec / BREATHE_X_SEC) * Math.PI * 2 + seed) * amp;
  const by = Math.sin((sec / BREATHE_Y_SEC) * Math.PI * 2 + seed * 1.7) * amp * 0.55;
  const bz = Math.sin((sec / BREATHE_Z_SEC) * Math.PI * 2 + seed * 2.3) * amp * 0.8;

  camera.position.set(pos[0] + bx, pos[1] + by, pos[2] + bz);
  camera.lookAt(tgt[0] + bx * 0.35, tgt[1] + by * 0.35, tgt[2]);

  if ('fov' in camera && Math.abs((camera as {fov: number}).fov - fov) > 1e-4) {
    (camera as {fov: number}).fov = fov;
    camera.updateProjectionMatrix();
  }

  return null;
};
