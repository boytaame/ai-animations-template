import {RoundedBox} from '@react-three/drei';
import {useMemo, type ReactNode} from 'react';
import * as THREE from 'three';
import {facet, gradient} from './geo';

/**
 * Kit primitives. Everything visible is bevelled (spec 4.2): rounded boxes,
 * faceted blobs, capsules and low-segment cylinders. Colours always come from
 * the palette, passed in by the caller.
 */

export type Vec3 = [number, number, number];

export type RBoxProps = {
  size: Vec3;
  /** Bevel radius as a fraction of the smallest side (spec: 3-8%). */
  radius?: number;
  color: string;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  castShadow?: boolean;
  receiveShadow?: boolean;
  flatShading?: boolean;
  children?: ReactNode;
};

export const RBox = ({
  size,
  radius,
  color,
  roughness = 0.72,
  emissive,
  emissiveIntensity,
  opacity,
  position,
  rotation,
  scale,
  castShadow = true,
  receiveShadow = true,
  flatShading = false,
  children,
}: RBoxProps) => {
  const r = radius ?? Math.min(size[0], size[1], size[2]) * 0.08;
  return (
    <RoundedBox
      args={size}
      radius={Math.max(0.004, Math.min(r, Math.min(...size) / 2 - 0.001))}
      smoothness={3}
      bevelSegments={3}
      creaseAngle={0.5}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={0}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissiveIntensity ?? (emissive ? 1 : 0)}
        transparent={opacity !== undefined && opacity < 1}
        opacity={opacity ?? 1}
        flatShading={flatShading}
      />
      {children}
    </RoundedBox>
  );
};

export type CylProps = {
  radiusTop: number;
  radiusBottom: number;
  height: number;
  segments?: number;
  color: string;
  roughness?: number;
  flatShading?: boolean;
  position?: Vec3;
  rotation?: Vec3;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  castShadow?: boolean;
};

/** 8-12 segment cylinder: bevelled by its own low-poly silhouette. */
export const Cyl = ({
  radiusTop,
  radiusBottom,
  height,
  segments = 10,
  color,
  roughness = 0.75,
  flatShading = true,
  position,
  rotation,
  emissive,
  emissiveIntensity,
  opacity,
  castShadow = true,
}: CylProps) => (
  <mesh position={position} rotation={rotation} castShadow={castShadow} receiveShadow>
    <cylinderGeometry args={[radiusTop, radiusBottom, height, segments, 1]} />
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={0}
      flatShading={flatShading}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={emissiveIntensity ?? (emissive ? 1 : 0)}
      transparent={opacity !== undefined && opacity < 1}
      opacity={opacity ?? 1}
    />
  </mesh>
);

export type BlobProps = {
  radius: number;
  seed: string;
  color: string;
  top?: string;
  detail?: 0 | 1;
  amount?: number;
  squash?: Vec3;
  roughness?: number;
  position?: Vec3;
  rotation?: Vec3;
  flatShading?: boolean;
  opacity?: number;
};

/** Faceted organic form (rocks, foliage clumps, ice, terrain bumps). */
export const Blob = ({
  radius,
  seed,
  color,
  top,
  detail = 0,
  amount = 0.16,
  squash = [1, 1, 1],
  roughness = 0.82,
  position,
  rotation,
  flatShading = true,
  opacity,
}: BlobProps) => {
  const geo = useMemo(() => {
    const g = facet(new THREE.IcosahedronGeometry(radius, detail), seed, radius * amount);
    return gradient(g, {base: color, top: top ?? color, seed, variation: 0.02});
  }, [radius, seed, detail, amount, color, top]);
  return (
    <mesh
      geometry={geo}
      position={position}
      rotation={rotation}
      scale={squash}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        vertexColors
        roughness={roughness}
        metalness={0}
        flatShading={flatShading}
        transparent={opacity !== undefined && opacity < 1}
        opacity={opacity ?? 1}
      />
    </mesh>
  );
};

/** Vertex-coloured mesh from a prepared geometry (tiles, terrain, water). */
export const VertexMesh = ({
  geometry,
  roughness = 0.8,
  flatShading = true,
  opacity,
  metalness = 0,
  castShadow = true,
  receiveShadow = true,
  position,
}: {
  geometry: THREE.BufferGeometry;
  roughness?: number;
  flatShading?: boolean;
  opacity?: number;
  metalness?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  position?: Vec3;
}) => (
  <mesh geometry={geometry} position={position} castShadow={castShadow} receiveShadow={receiveShadow}>
    <meshStandardMaterial
      vertexColors
      roughness={roughness}
      metalness={metalness}
      flatShading={flatShading}
      transparent={opacity !== undefined && opacity < 1}
      opacity={opacity ?? 1}
    />
  </mesh>
);

const SHADOW_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SHADOW_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uFeather;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = smoothstep(1.0, 1.0 - uFeather, d);
    a *= a;
    gl_FragColor = vec4(uColor, a * uOpacity);
  }
`;

/**
 * Soft blob contact shadow (spec 4.5: fake AO is required, opacity 0.25-0.4).
 * A shader on a flat quad — no textures, no per-frame state, fully deterministic.
 */
export const BlobShadow = ({
  radius = 1,
  opacity = 0.32,
  color = '#2A2F5A',
  position = [0, 0.01, 0],
  squash = 1,
  feather = 0.85,
}: {
  radius?: number;
  opacity?: number;
  color?: string;
  position?: Vec3;
  squash?: number;
  feather?: number;
}) => (
  <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} scale={[radius, radius * squash, 1]}>
    <planeGeometry args={[1, 1]} />
    <shaderMaterial
      transparent
      depthWrite={false}
      uniforms={{
        uColor: {value: new THREE.Color(color)},
        uOpacity: {value: opacity},
        uFeather: {value: feather},
      }}
      vertexShader={SHADOW_VERT}
      fragmentShader={SHADOW_FRAG}
    />
  </mesh>
);

const HALO_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    a = pow(a, 2.2);
    gl_FragColor = vec4(uColor, a * uOpacity);
  }
`;

/** Billboard halo for lamps, campfires, magma and lit windows (spec 4.5 glow). */
export const Halo = ({
  size = 1,
  color,
  opacity = 0.5,
  position,
}: {
  size?: number;
  color: string;
  opacity?: number;
  position: Vec3;
}) => (
  <sprite position={position} scale={[size, size, size]}>
    <shaderMaterial
      transparent
      depthWrite={false}
      blending={THREE.AdditiveBlending}
      uniforms={{
        uColor: {value: new THREE.Color(color)},
        uOpacity: {value: opacity},
      }}
      vertexShader={SHADOW_VERT}
      fragmentShader={HALO_FRAG}
    />
  </sprite>
);
