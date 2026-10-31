import {useMemo} from 'react';
import * as THREE from 'three';
import {gradient} from '../lib/geo';
import {materials, seededUnit, tint, useTheme, type ThemeName} from '../lib/palette';

/**
 * Gradient sky dome (2-3 stops) with puffy clouds for day/dusk and a starfield
 * for night (spec 4.4). The dome is a back-side sphere; the gradient is computed
 * in the shader from height, with a seeded dither so H.264 cannot band it.
 */

const VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform float uDither;
  varying vec3 vWorld;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    float h = normalize(vWorld).y;
    float a = smoothstep(0.02, 0.55, h);
    float b = smoothstep(0.42, 1.0, h);
    vec3 col = mix(uHorizon, uMid, a);
    col = mix(col, uTop, b);
    col = mix(uGround, col, smoothstep(-0.22, 0.02, h));
    col += (hash(gl_FragCoord.xy) - 0.5) * uDither;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export type SkyDomeProps = {
  theme: ThemeName;
  /** Cloud count; 0 disables. Night themes default to stars instead. */
  clouds?: number;
  stars?: boolean;
  seed?: string;
};

export const SkyDome = ({theme, clouds, stars, seed = 'sky'}: SkyDomeProps) => {
  const t = useTheme(theme);
  const isNight = theme === 'night' || theme === 'underground';
  const cloudCount = clouds ?? (isNight ? 0 : 7);
  const starCount = stars ?? isNight;

  return (
    <group>
      <mesh renderOrder={-50} frustumCulled={false}>
        <sphereGeometry args={[70, 24, 16]} />
        <shaderMaterial
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
          uniforms={{
            uTop: {value: new THREE.Color(t.skyTop)},
            uMid: {value: new THREE.Color(t.skyMid)},
            uHorizon: {value: new THREE.Color(t.skyHorizon)},
            uGround: {value: new THREE.Color(t.fog)},
            uDither: {value: 0.012},
          }}
          vertexShader={VERT}
          fragmentShader={FRAG}
        />
      </mesh>

      {starCount ? <Starfield seed={seed} radius={52} count={90} /> : null}

      {Array.from({length: cloudCount}, (_, i) => {
        const u = seededUnit(seed, i);
        const v = seededUnit(`${seed}:y`, i);
        const angle = -70 + u * 140;
        const dist = 34 + v * 14;
        const y = 13 + seededUnit(`${seed}:h`, i) * 12;
        const pos: [number, number, number] = [
          Math.sin(angle * 0.045) * dist,
          y,
          Math.cos(angle * 0.045) * dist - 6,
        ];
        return (
          <Cloud
            key={`cloud-${i}`}
            position={pos}
            scale={1.6 + seededUnit(`${seed}:s`, i) * 1.9}
            seed={`${seed}:c${i}`}
          />
        );
      })}
    </group>
  );
};

/** One puffy cloud: overlapping squashed puffs, cream top with cool underside. */
export const Cloud = ({
  position,
  scale = 1,
  seed,
}: {
  position: [number, number, number];
  scale?: number;
  seed: string;
}) => {
  // Puff shapes and gradient geometries are built once per seed, never per frame.
  const puffs = useMemo(() => {
    const spread = [1, 0.22, 0.42, -0.55, 0.68, -0.28, 0.85];
    return spread.map((dx, i) => {
      const r = (0.52 - Math.abs(dx) * 0.12) * (0.9 + seededUnit(`${seed}:r`, i) * 0.22);
      const g = new THREE.SphereGeometry(1, 10, 8);
      gradient(g, {
        base: materials.cloudShade,
        top: tint(materials.cloud, seed, 0.02, i),
        seed: `${seed}:p${i}`,
      });
      return {
        r,
        geometry: g,
        pos: [dx * 0.95, seededUnit(`${seed}:y`, i) * 0.12 - 0.02, seededUnit(`${seed}:z`, i) * 0.22] as [
          number,
          number,
          number,
        ],
        squash: 0.72 + seededUnit(`${seed}:q`, i) * 0.18,
      };
    });
  }, [seed]);

  return (
    <group position={position} scale={scale}>
      {puffs.map((p, i) => (
        <mesh
          key={i}
          geometry={p.geometry}
          position={p.pos}
          scale={[p.r * 1.25, p.r * p.squash, p.r]}
        >
          <meshStandardMaterial vertexColors roughness={0.95} metalness={0} flatShading />
        </mesh>
      ))}
    </group>
  );
};

/** Seeded starfield: points on the upper hemisphere, no per-frame state. */
const Starfield = ({
  seed,
  radius,
  count,
}: {
  seed: string;
  radius: number;
  count: number;
}) => {
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const warm = new THREE.Color(materials.windowGlow);
    const cool = new THREE.Color(materials.snow);
    for (let i = 0; i < count; i++) {
      const u = seededUnit(`${seed}:sx`, i);
      const v = seededUnit(`${seed}:sy`, i);
      const theta = u * Math.PI * 2;
      const phi = Math.acos(0.05 + v * 0.95);
      const r = radius * (0.9 + seededUnit(`${seed}:sr`, i) * 0.1);
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      positions[i * 3 + 1] = Math.cos(phi) * r;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
      const c = warm.clone().lerp(cool, seededUnit(`${seed}:sc`, i));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [seed, radius, count]);

  return (
    <points geometry={geometry} renderOrder={-40}>
      <pointsMaterial size={0.34} sizeAttenuation vertexColors transparent opacity={0.9} />
    </points>
  );
};
