import {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Color} from 'three';
import {chamferBox, facet, gradient} from '../../kit/lib/geo';
import {materials, palette} from '../../kit/lib/palette';
import {CameraRig} from '../../kit/rig/CameraRig';
import {Lights} from '../../kit/rig/Lights';
import {PostFX} from '../../kit/rig/PostFX';
import {RendererSetup, Stage} from '../../kit/rig/RendererSetup';
import {buildShot} from '../../kit/rig/shots';

/**
 * Rig smoke test: lighting + camera tracks + bevels on a bare stage.
 * Used by `npm run check:determinism` (frame N, M, N again → identical bytes).
 */
const Geometry = () => {
  const slab = useMemo(() => {
    const g = chamferBox(5, 1.1, 5, 0.16, 2);
    gradient(g, {base: materials.trimStone, top: materials.snow, seed: 'slab'});
    return g;
  }, []);
  const blobGeo = useMemo(() => {
    const g = facet(chamferBox(1.6, 1.6, 1.6, 0.14, 2), 'crate', 0.02);
    gradient(g, {base: materials.accentCoral, top: materials.awning, seed: 'crate'});
    return g;
  }, []);

  return (
    <group position={[0, 0, 0]}>
      <mesh geometry={slab} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.75} metalness={0} flatShading />
      </mesh>
      <mesh geometry={blobGeo} position={[0, 1.6, 0]} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.7} metalness={0} />
      </mesh>
      <mesh position={[1.8, 0.85, 1.1]} castShadow receiveShadow>
        <sphereGeometry args={[0.8, 12, 9]} />
        <meshStandardMaterial color={new Color(materials.glass)} roughness={0.6} metalness={0} />
      </mesh>
    </group>
  );
};

export const RigTest = () => {
  const frame = useCurrentFrame();
  const plan = useMemo(
    () =>
      buildShot('orbit', {
        duration: 120,
        target: [0, 1.6, 0],
        distance: 11,
        amount: 0.22,
        elevationDeg: 18,
      }),
    [],
  );

  return (
    <AbsoluteFill style={{backgroundColor: palette.base.backdropNavy}}>
      <Stage theme="day" fog={{near: 16, far: 60}}>
        <RendererSetup theme="day" />
        <Lights theme="day" area={10} />
        <CameraRig plan={plan} frame={frame} seed={2} />
        <Geometry />
        <PostFX />
      </Stage>
    </AbsoluteFill>
  );
};
