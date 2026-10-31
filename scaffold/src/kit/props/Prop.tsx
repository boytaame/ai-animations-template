import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {continueRender, delayRender, getStaticFiles, staticFile} from 'remotion';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {materials, useTheme, type ThemeName} from '../lib/palette';
import type {Vec3} from '../lib/parts';
import {Barrel} from './Barrel';
import {Bench} from './Bench';
import {Blanket} from './Blanket';
import {Campfire} from './Campfire';
import {Cone} from './Cone';
import {Crate} from './Crate';
import {Lamp} from './Lamp';
import {Tent} from './Tent';

/**
 * Kit-name prop entry point (spec 3.5).
 *
 * `<Prop name="crate" theme="day" />` renders a glTF from /public/models when one
 * is installed, otherwise the bevelled primitive fallback. Scenes never mention
 * file paths, so dropping a model in never requires a code change.
 *
 * Model loading is imperative with delayRender/continueRender so no frame is
 * ever captured half-loaded (spec 3.2). Materials are remapped to palette tokens
 * on load: roughness >= 0.6, metalness 0, so external art matches the house style.
 */

export type PropName =
  | 'crate'
  | 'barrel'
  | 'cone'
  | 'bench'
  | 'lamp'
  | 'tent'
  | 'campfire'
  | 'blanket';

export type PropProps = {
  name: PropName;
  theme: ThemeName;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  seed?: string;
  /** Seconds into the shot, for props with secondary motion. */
  sec?: number;
};

/** Static model list, resolved once at bundle time (no network at render). */
const modelFiles = (): string[] => {
  try {
    return getStaticFiles()
      .map((f) => f.name)
      .filter((n) => n.startsWith('models/') && /\.(glb|gltf)$/.test(n));
  } catch {
    return [];
  }
};

let cachedModels: string[] | null = null;
const findModel = (name: string): string | null => {
  if (cachedModels === null) {
    cachedModels = modelFiles();
  }
  const hit = cachedModels.find((f) => {
    const base = f.split('/').pop() ?? '';
    return base === `${name}.glb` || base === `${name}.gltf`;
  });
  return hit ?? null;
};

const TOKEN_MAP: Record<string, string> = {
  wood: materials.woodLight,
  brick: materials.brick,
  stone: materials.trimStone,
  metal: materials.metal,
  red: materials.accentCoral,
  orange: materials.accentOrange,
  teal: materials.accentTeal,
  white: materials.blanketWhite,
  cream: materials.paper,
  dark: materials.dark,
};

/** Re-light and re-palette an external model so it belongs in the kit. */
const remapMaterials = (root: THREE.Object3D, theme: ThemeName) => {
  const t = useTheme(theme);
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const source = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const name = `${source?.name ?? ''}`.toLowerCase();
    const token = Object.keys(TOKEN_MAP).find((k) => name.includes(k));
    const color = token ? TOKEN_MAP[token] : t.grass;
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.72,
      metalness: 0,
    });
    mesh.material = material;
  });
};

const GltfProp = ({
  file,
  theme,
  position,
  rotation,
  scale,
}: {
  file: string;
  theme: ThemeName;
  position: Vec3;
  rotation: Vec3;
  scale: number;
}) => {
  const [handle] = useState(() => delayRender(`gltf:${file}`));
  const [object, setObject] = useState<THREE.Group | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    loader.load(
      staticFile(file),
      (gltf) => {
        remapMaterials(gltf.scene, theme);
        if (!cancelled) {
          setObject(gltf.scene);
        }
        continueRender(handle);
      },
      undefined,
      () => {
        // A broken file must not freeze the render: fall back to nothing visible.
        continueRender(handle);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [file, theme, handle]);

  if (!object) {
    return null;
  }
  return <primitive object={object} position={position} rotation={rotation} scale={scale} />;
};

/** Primitive fallbacks — the kit works with no external assets at all. */
const fallbackFor = ({name, theme, position, rotation, scale, seed, sec}: PropProps): ReactNode => {
  const p = position ?? [0, 0, 0];
  const r = rotation ?? [0, 0, 0];
  const s = scale ?? 1;
  switch (name) {
    case 'crate':
      return <Crate theme={theme} position={p} rotation={r} size={s} seed={seed} />;
    case 'barrel':
      return <Barrel theme={theme} position={p} rotation={r} size={s} seed={seed} />;
    case 'cone':
      return <Cone theme={theme} position={p} rotation={r} size={s} />;
    case 'bench':
      return <Bench theme={theme} position={p} rotation={r} size={s} seed={seed} />;
    case 'lamp':
      return <Lamp theme={theme} position={p} rotation={r} size={s} />;
    case 'tent':
      return <Tent theme={theme} position={p} rotation={r} size={s} seed={seed} />;
    case 'campfire':
      return <Campfire theme={theme} position={p} rotation={r} size={s} sec={sec ?? 0} seed={seed} />;
    case 'blanket':
      return <Blanket theme={theme} position={p} rotation={r} seed={seed} />;
    default:
      return null;
  }
};

export const Prop = (props: PropProps) => {
  const file = useMemo(() => findModel(props.name), [props.name]);
  const scale = props.scale ?? 1;
  if (!file) {
    return <>{fallbackFor(props)}</>;
  }
  return (
    <GltfProp
      file={file}
      theme={props.theme}
      position={props.position ?? [0, 0, 0]}
      rotation={props.rotation ?? [0, 0, 0]}
      scale={scale}
    />
  );
};

/** True when a kit name has a real model installed (useful for docs/QA). */
export const hasModel = (name: PropName): boolean => findModel(name) !== null;
