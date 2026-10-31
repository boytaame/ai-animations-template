import {useMemo} from 'react';
import {characters, materials, tint, useTheme, type ThemeName} from '../lib/palette';
import {BlobShadow, RBox, type Vec3} from '../lib/parts';
import {
  blend,
  blink,
  poseFor,
  type FigureState,
  type Pose,
  type PoseOptions,
} from './animations';

/**
 * The kit character (spec 4.3): rounded primitives, dot eyes with a deterministic
 * blink, real pivot groups (hips, torso, shoulders, elbows, head, knees), stubby
 * limbs, and an accessory slot. Pose comes from `animations.ts` — this file only
 * maps joints to transforms, so a character is never animated by frame state.
 *
 * `state` is the target; pass `transition` to cross-fade from a previous state so
 * arms never snap (spec 4.9 F).
 */

export type Accessory =
  | 'none'
  | 'hat'
  | 'hardhat'
  | 'vest'
  | 'backpack'
  | 'sunglasses'
  | 'camera'
  | 'scarf';

export type FigureProps = {
  theme: ThemeName;
  state: FigureState;
  /** Seconds inside the current state. */
  t: number;
  /** Extra pose options (phase for locomotion, jump duration/height). */
  options?: PoseOptions;
  transition?: {from: FigureState; progress: number; fromOptions?: PoseOptions};
  /** Palette tokens. */
  skin?: string;
  shirt?: string;
  pants?: string;
  hair?: string;
  shoes?: string;
  accessory?: Accessory;
  seed?: string;
  position?: Vec3;
  rotationY?: number;
  scale?: number;
  shadow?: boolean;
  /** Eye openness override, for blinks driven from a scene. */
  blinkOverride?: number;
};

const HIP_Y = 0.64;
const UPPER_LEG = 0.33;
const LOWER_LEG = 0.3;
const TORSO_H = 0.54;
const TORSO_W = 0.46;
const SHOULDER_Y = 0.44;

export const Figure = ({
  theme,
  state,
  t,
  options,
  transition,
  skin = '#F2C29B',
  shirt = '#2F5BD0',
  pants = '#1B2340',
  hair = '#1A1412',
  shoes,
  accessory = 'none',
  seed = 'figure',
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
  shadow = true,
  blinkOverride,
}: FigureProps) => {
  const themeData = useTheme(theme);

  const pose: Pose = useMemo(() => {
    const target = poseFor(state, t, options);
    if (!transition || transition.progress >= 1) {
      return target;
    }
    const from = poseFor(transition.from, t, transition.fromOptions ?? options);
    return blend(from, target, transition.progress);
  }, [state, t, options, transition]);

  const seedNum = useMemo(
    () => Array.from(seed).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 17,
    [seed],
  );
  const eyeOpen = blinkOverride ?? blink(t, seedNum);

  const shirtColor = tint(shirt, seed, 0.03);
  const pantsColor = tint(pants, seed, 0.03, 1);
  const hairColor = tint(hair, `${seed}:hair`, 0.04);
  const shoeColor = shoes ?? tint(materials.dark, seed, 0.02);
  const skinColor = tint(skin, `${seed}:skin`, 0.015);

  const armMirror = (side: 'L' | 'R') => {
    const a = side === 'L' ? pose.armL : pose.armR;
    const sign = side === 'L' ? 1 : -1;
    return {x: a.x, y: a.y * sign, z: a.z * sign, elbow: a.elbow};
  };

  return (
    <group position={position} rotation={[0, rotationY + pose.rootRotY, 0]} scale={scale}>
      <group
        position={[pose.rootX, HIP_Y + pose.rootY, 0]}
        rotation={[0, 0, pose.rootRotZ]}
        scale={[pose.squashX, pose.squashY, pose.squashX]}
      >
        <group rotation={[pose.hips.x, pose.hips.y, pose.hips.z]}>
          {/* Legs: hip pivot, knee pivot, planted foot. */}
          {(['L', 'R'] as const).map((side) => {
            const l = side === 'L' ? pose.legL : pose.legR;
            const sign = side === 'L' ? 1 : -1;
            return (
              <group key={side} position={[0.125 * sign, 0, 0]} rotation={[l.x, l.y * sign, l.z * sign]}>
                <RBox size={[0.175, UPPER_LEG + 0.04, 0.2]} radius={0.055} color={pantsColor} position={[0, -UPPER_LEG / 2, 0]} />
                <group position={[0, -UPPER_LEG, 0]} rotation={[l.knee, 0, 0]}>
                  <RBox size={[0.165, LOWER_LEG, 0.19]} radius={0.05} color={pantsColor} position={[0, -LOWER_LEG / 2, 0]} />
                  <RBox
                    size={[0.175, 0.1, 0.27]}
                    radius={0.035}
                    color={shoeColor}
                    position={[0, -LOWER_LEG - 0.035, 0.045]}
                  />
                </group>
              </group>
            );
          })}

          {/* Torso */}
          <group rotation={[pose.torso.x, pose.torso.y, pose.torso.z]}>
            <RBox size={[TORSO_W, TORSO_H, 0.3]} radius={0.1} color={shirtColor} position={[0, TORSO_H / 2, 0]} />
            {/* Collar + belt: secondary detail that reads at phone size. */}
            <RBox size={[TORSO_W * 0.62, 0.07, 0.3]} radius={0.025} color={tint(shirtColor, seed, 0.1, 2)} position={[0, TORSO_H - 0.03, 0.005]} />
            <RBox size={[TORSO_W * 0.96, 0.07, 0.32]} radius={0.03} color={shoeColor} position={[0, 0.03, 0]} />
            {accessory === 'vest' ? (
              <>
                <RBox size={[TORSO_W + 0.05, TORSO_H * 0.78, 0.34]} radius={0.06} color={materials.accentOrange} position={[0, TORSO_H * 0.46, 0]} />
                <RBox size={[TORSO_W + 0.06, 0.05, 0.35]} radius={0.02} color={materials.snow} position={[0, TORSO_H * 0.5, 0]} />
              </>
            ) : null}
            {accessory === 'backpack' ? (
              <>
                <RBox size={[0.34, 0.36, 0.18]} radius={0.06} color={materials.accentTeal} position={[0, TORSO_H * 0.5, -0.24]} />
                <RBox size={[0.06, 0.42, 0.05]} radius={0.02} color={materials.dark} position={[-0.14, TORSO_H * 0.55, -0.15]} rotation={[0.1, 0, 0.1]} />
                <RBox size={[0.06, 0.42, 0.05]} radius={0.02} color={materials.dark} position={[0.14, TORSO_H * 0.55, -0.15]} rotation={[0.1, 0, -0.1]} />
              </>
            ) : null}
            {accessory === 'camera' ? (
              <>
                <RBox size={[0.2, 0.14, 0.12]} radius={0.03} color={materials.dark} position={[0, TORSO_H * 0.62, 0.2]} />
                <RBox size={[0.08, 0.07, 0.06]} radius={0.02} color={materials.metal} position={[0, TORSO_H * 0.62, 0.27]} />
                <RBox size={[0.42, 0.03, 0.03]} radius={0.01} color={materials.woodDark} position={[0, TORSO_H * 0.72, 0.15]} rotation={[0, 0, 0.1]} />
              </>
            ) : null}

            {/* Arms: shoulder pivot, elbow pivot, mitten hand. */}
            {(['L', 'R'] as const).map((side) => {
              const a = armMirror(side);
              const sign = side === 'L' ? -1 : 1;
              return (
                <group key={`arm-${side}`} position={[sign * (TORSO_W / 2 + 0.045), SHOULDER_Y, 0]} rotation={[a.x, a.y, a.z]}>
                  {/* Shoulder cap hides the joint seam at every angle. */}
                  <RBox size={[0.15, 0.14, 0.16]} radius={0.06} color={shirtColor} position={[0, 0.01, 0]} />
                  <RBox size={[0.135, 0.26, 0.145]} radius={0.055} color={shirtColor} position={[0, -0.13, 0]} />
                  <RBox size={[0.14, 0.05, 0.15]} radius={0.02} color={tint(shirtColor, seed, 0.09, 4)} position={[0, -0.25, 0]} />
                  <group position={[0, -0.26, 0]} rotation={[a.elbow, 0, 0]}>
                    <RBox size={[0.12, 0.22, 0.13]} radius={0.05} color={skinColor} position={[0, -0.11, 0]} />
                    <RBox size={[0.115, 0.09, 0.12]} radius={0.04} color={skinColor} position={[0, -0.255, 0.005]} />
                  </group>
                </group>
              );
            })}

            {/* Head */}
            <group position={[0, TORSO_H + 0.14, 0]} rotation={[pose.head.x, pose.head.y, pose.head.z]}>
              <RBox size={[0.34, 0.09, 0.3]} radius={0.04} color={skinColor} position={[0, -0.12, 0]} />
              <RBox size={[0.42, 0.4, 0.38]} radius={0.12} color={skinColor} position={[0, 0.08, 0]} />
              {/* Eyes: two dots, scaled on Y for the blink. */}
              <group position={[0, 0.07, 0.185]} scale={[1, Math.max(0.12, eyeOpen), 1]}>
                <mesh position={[-0.085, 0, 0]} castShadow={false}>
                  <sphereGeometry args={[0.032, 10, 8]} />
                  <meshStandardMaterial color={materials.dark} roughness={0.5} metalness={0} />
                </mesh>
                <mesh position={[0.085, 0, 0]} castShadow={false}>
                  <sphereGeometry args={[0.032, 10, 8]} />
                  <meshStandardMaterial color={materials.dark} roughness={0.5} metalness={0} />
                </mesh>
              </group>
              {/* Hair: cap + fringe + a side tuft, never one slab. */}
              <RBox size={[0.445, 0.16, 0.4]} radius={0.07} color={hairColor} position={[0, 0.24, -0.01]} />
              <RBox size={[0.43, 0.09, 0.12]} radius={0.04} color={hairColor} position={[0, 0.19, 0.16]} rotation={[0.16, 0, 0]} />
              <RBox size={[0.1, 0.2, 0.34]} radius={0.05} color={tint(hairColor, seed, 0.06, 3)} position={[-0.21, 0.08, -0.03]} />
              {accessory === 'hat' ? (
                <>
                  <RBox size={[0.55, 0.045, 0.52]} radius={0.02} color={materials.sand} position={[0, 0.28, 0]} />
                  <RBox size={[0.31, 0.17, 0.3]} radius={0.05} color={materials.sand} position={[0, 0.37, 0]} />
                  <RBox size={[0.32, 0.05, 0.31]} radius={0.02} color={materials.accentCoral} position={[0, 0.31, 0]} />
                </>
              ) : null}
              {accessory === 'hardhat' ? (
                <>
                  <mesh position={[0, 0.33, 0]} scale={[0.26, 0.16, 0.24]} castShadow>
                    <sphereGeometry args={[1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshStandardMaterial color={characters.gear.hardhat} roughness={0.6} metalness={0} />
                  </mesh>
                  <RBox size={[0.5, 0.04, 0.48]} radius={0.02} color={characters.gear.hardhat} position={[0, 0.31, 0.02]} />
                  <RBox size={[0.08, 0.06, 0.4]} radius={0.02} color={tint(characters.gear.hardhat, seed, 0.1)} position={[0, 0.4, 0]} />
                </>
              ) : null}
              {accessory === 'sunglasses' ? (
                <RBox size={[0.36, 0.09, 0.06]} radius={0.025} color={materials.dark} position={[0, 0.07, 0.2]} />
              ) : null}
              {accessory === 'scarf' ? (
                <RBox size={[0.4, 0.09, 0.34]} radius={0.04} color={materials.accentCoral} position={[0, -0.07, 0]} />
              ) : null}
            </group>
          </group>
        </group>
      </group>

      {shadow ? (
        <BlobShadow
          radius={0.44 * scale}
          opacity={0.3}
          color={themeData.shadowTint}
          position={[0, 0.012, 0]}
        />
      ) : null}
    </group>
  );
};
