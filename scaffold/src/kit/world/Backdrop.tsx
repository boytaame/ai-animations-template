import * as THREE from 'three';
import {base, mix} from '../lib/palette';

/**
 * The signature navy backdrop for tile/overview shots (spec 4.4).
 *
 * A clip-space quad drawn behind everything: a soft radial glow centred slightly
 * above middle, falling to a deep edge vignette. Because it is screen-space it
 * stays correct while the camera orbits, and it costs one full-screen pass with
 * no textures and no per-frame state.
 */

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.999, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uInner;
  uniform vec3 uOuter;
  uniform vec3 uVignette;
  uniform float uGlow;
  uniform float uDither;
  varying vec2 vUv;

  // Deterministic hash dither (spec 3.6: 1-2% noise stops gradient banding).
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 c = (vUv - vec2(0.5, 0.44)) * vec2(1.0, 1.12);
    float d = length(c);
    float glow = smoothstep(0.72, 0.02, d) * uGlow;
    vec3 col = mix(uOuter, uInner, glow);

    // Soft edge vignette, never a hard circle.
    float vig = smoothstep(0.42, 0.98, d);
    col = mix(col, uVignette, vig * 0.85);

    col += (hash(gl_FragCoord.xy) - 0.5) * uDither;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export type BackdropProps = {
  inner?: string;
  outer?: string;
  vignette?: string;
  glow?: number;
  dither?: number;
};

export const Backdrop = ({
  inner = mix(base.backdropNavy, base.rock, 0.08),
  outer = base.backdropNavy,
  vignette = base.backdropDeep,
  glow = 1,
  dither = 0.014,
}: BackdropProps) => (
  <mesh renderOrder={-100} frustumCulled={false}>
    <planeGeometry args={[2, 2]} />
    <shaderMaterial
      depthTest={false}
      depthWrite={false}
      uniforms={{
        uInner: {value: new THREE.Color(inner)},
        uOuter: {value: new THREE.Color(outer)},
        uVignette: {value: new THREE.Color(vignette)},
        uGlow: {value: glow},
        uDither: {value: dither},
      }}
      vertexShader={VERT}
      fragmentShader={FRAG}
    />
  </mesh>
);
