import {useMemo} from 'react';
import * as THREE from 'three';
import {useTheme, type Theme, type ThemeName} from '../lib/palette';

/**
 * Lighting rig (spec 4.5): warm key from the upper side, cool hemisphere fill,
 * a dim rim from behind, optional warm point lights. The key light sits at a
 * fixed world position and never follows the camera, so shadows cannot swim.
 */

export type LightPreset = {
  keyIntensity: number;
  fillIntensity: number;
  rimIntensity: number;
  ambientIntensity: number;
};

export const LIGHT_PRESETS: Record<ThemeName, LightPreset> = {
  day: {keyIntensity: 2.6, fillIntensity: 0.9, rimIntensity: 0.75, ambientIntensity: 0.22},
  dusk: {keyIntensity: 2.1, fillIntensity: 0.75, rimIntensity: 0.9, ambientIntensity: 0.28},
  night: {keyIntensity: 1.4, fillIntensity: 0.6, rimIntensity: 1.0, ambientIntensity: 0.32},
  underground: {keyIntensity: 1.9, fillIntensity: 0.7, rimIntensity: 1.1, ambientIntensity: 0.34},
};

export type WarmPoint = {
  position: [number, number, number];
  intensity?: number;
  color?: string;
  distance?: number;
};

export type LightsProps = {
  theme: ThemeName;
  /** Preset can be decoupled from the theme (e.g. a lamp-lit night set in day palette). */
  preset?: ThemeName;
  /** Half-extent of the shadow frustum, fitted tightly to the scene (spec 4.5). */
  area?: number;
  keyPosition?: [number, number, number];
  rimPosition?: [number, number, number];
  points?: WarmPoint[];
  castShadow?: boolean;
};

export const Lights = ({
  theme,
  preset,
  area = 14,
  keyPosition = [9, 14, 7],
  rimPosition = [-8, 6, -9],
  points = [],
  castShadow = true,
}: LightsProps) => {
  const t: Theme = useTheme(theme);
  const p = LIGHT_PRESETS[preset ?? theme];

  const shadowCamera = useMemo(
    () => ({
      left: -area,
      right: area,
      top: area,
      bottom: -area,
      near: 1,
      far: area * 4.5,
    }),
    [area],
  );

  return (
    <>
      {/* Cool ambient floor: guarantees no pitch-black areas (spec 4.5). */}
      <ambientLight color={t.fillLight} intensity={p.ambientIntensity} />

      {/* Warm key. Fixed in world space. */}
      <directionalLight
        color={t.keyLight}
        intensity={p.keyIntensity}
        position={keyPosition}
        castShadow={castShadow}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={shadowCamera.left}
        shadow-camera-right={shadowCamera.right}
        shadow-camera-top={shadowCamera.top}
        shadow-camera-bottom={shadowCamera.bottom}
        shadow-camera-near={shadowCamera.near}
        shadow-camera-far={shadowCamera.far}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-radius={3}
        target-position={[0, 0, 0]}
      />

      {/* Cool hemisphere fill; warm ground bounce keeps shade from going neutral. */}
      <hemisphereLight
        color={t.fillLight}
        groundColor={t.bounce}
        intensity={p.fillIntensity}
      />

      {/* Rim/back light so characters and hero props separate from the background. */}
      <directionalLight color={t.rim} intensity={p.rimIntensity} position={rimPosition} />

      {points.map((pt, i) => (
        <pointLight
          key={`warm-${i}`}
          color={pt.color ?? t.keyLight}
          intensity={pt.intensity ?? 8}
          distance={pt.distance ?? 7}
          decay={2}
          position={pt.position}
        />
      ))}
    </>
  );
};

/** Fake contact blob shadow colour, used by every prop/character. */
export const blobShadowColor = (t: Theme) => new THREE.Color(t.shadowTint);
