import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {useEffect, type CSSProperties, type ReactNode} from 'react';
import * as THREE from 'three';
import {useTheme, type ThemeName} from '../lib/palette';

/**
 * Renderer look, set explicitly (spec 4.6).
 * Everything that must be configured at context creation lives in STAGE_GL /
 * the canvas props; everything else is applied to the renderer on mount.
 */
export const STAGE_GL = {
  antialias: true,
  alpha: false,
  stencil: false,
  depth: true,
  powerPreference: 'high-performance',
} as const;

export type RendererSetupProps = {
  theme: ThemeName;
  /** ACES exposure; defaults to the theme's exposure (spec 4.6: ~1.1). */
  exposure?: number;
  /** Fog distances in world units; `null` disables fog (backdrop tile shots). */
  fog?: {near: number; far: number} | null;
};

/**
 * Applies renderer + scene settings inside the canvas.
 * Colour space, tone mapping and shadow filtering are never left to defaults.
 */
export const RendererSetup = ({theme, exposure, fog = {near: 18, far: 70}}: RendererSetupProps) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const t = useTheme(theme);

  useEffect(() => {
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure ?? t.exposure;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl, exposure, t.exposure]);

  useEffect(() => {
    if (!fog) {
      scene.fog = null;
    } else {
      scene.fog = new THREE.Fog(new THREE.Color(t.fog), fog.near, fog.far);
    }
    return () => {
      scene.fog = null;
    };
  }, [scene, fog, t.fog]);

  return null;
};

export type StageProps = {
  children: ReactNode;
  theme?: ThemeName;
  exposure?: number;
  fog?: {near: number; far: number} | null;
  shadows?: boolean;
  /** Camera near/far. Keep `near` proportional to distance for depth precision. */
  near?: number;
  far?: number;
  fov?: number;
  style?: CSSProperties;
};

/**
 * The canvas shell: explicit width/height, dpr locked to 1, fixed initial camera.
 * Scenes put a <CameraRig> inside to drive the camera from frame tracks.
 */
export const Stage = ({
  children,
  theme = 'day',
  exposure,
  fog,
  shadows = true,
  near = 0.2,
  far = 120,
  fov = 40,
  style,
}: StageProps) => {
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={style}>
      <ThreeCanvas
        width={width}
        height={height}
        dpr={1}
        gl={STAGE_GL}
        shadows={shadows}
        camera={{fov, near, far, position: [0, 6, 14]}}
        style={{width: '100%', height: '100%'}}
      >
        <RendererSetup theme={theme} exposure={exposure} fog={fog} />
        {children}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
