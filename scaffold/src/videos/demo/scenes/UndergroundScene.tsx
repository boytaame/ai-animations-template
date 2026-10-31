import {useMemo} from 'react';
import {Figure} from '../../../kit/characters/Figure';
import {characters, materials, mix, seededUnit} from '../../../kit/lib/palette';
import {Halo} from '../../../kit/lib/parts';
import {Rocks} from '../../../kit/nature/Rocks';
import {CameraRig} from '../../../kit/rig/CameraRig';
import {Lights} from '../../../kit/rig/Lights';
import {Stage} from '../../../kit/rig/RendererSetup';
import {buildShot} from '../../../kit/rig/shots';
import {Backdrop} from '../../../kit/world/Backdrop';
import {DioramaTile} from '../../../kit/world/DioramaTile';
import {Water} from '../../../kit/world/Water';

/**
 * Shot 3 — the world flips: the crust passes overhead and a figure falls toward
 * magma. Everything is framed to read on a phone: warm rim on the faller, cool
 * rock walls at the edges, the crust's strata visible above, and a bright magma
 * sea below that keeps the darkest area readable (spec 4.5 / 4.9 J).
 */

export const UndergroundScene = ({
  frame,
  durationInFrames,
}: {
  frame: number;
  durationInFrames: number;
}) => {
  const sec = frame / 30;
  const plan = useMemo(
    () =>
      buildShot('driftLeft', {
        duration: durationInFrames,
        target: [0, 1.4, 0],
        distance: 16,
        amount: 0.42,
        azimuthDeg: 14,
        elevationDeg: -4,
        fov: 44,
      }),
    [durationInFrames],
  );

  // Gravity easing: position is a quadratic of time, nowhere near linear.
  // Initial velocity plus acceleration: the first frames already move.
  const p = Math.min(1, frame / durationInFrames);
  const y = 4.6 - (0.9 * p + 5.7 * p * p);
  const spin = -0.35 * p;

  return (
    <Stage theme="underground" fog={{near: 9, far: 34}} exposure={1.3}>
      <Backdrop
        inner={mix(materials.strata2, materials.accentCoral, 0.25)}
        outer="#3A2030"
        vignette="#1B1020"
        glow={1.1}
      />
      <Lights
        theme="underground"
        area={14}
        keyPosition={[9, 13, 7]}
        rimPosition={[-8, 6, -9]}
        points={[
          {position: [0, -2.6, 0], intensity: 30, distance: 16, color: materials.magma},
          {position: [0, 6.2, 2], intensity: 14, distance: 10, color: materials.strata3},
          // Front fill so the faller is never a black silhouette (spec 4.9 J).
          {position: [1.6, 2.4, 6], intensity: 12, distance: 12, color: materials.accentCoral},
        ]}
      />
      <CameraRig plan={plan} frame={frame} seed={6} />

      {/* Magma sea, with a core glow that lifts the whole lower frame. */}
      <Water
        theme="underground"
        size={44}
        position={[0, -3.4, 0]}
        sec={sec}
        seed="magma"
        color={materials.magma}
        deep={materials.strata3}
      />
      <Halo size={13} color={materials.core} opacity={0.3} position={[0, -2.7, 0]} />
      {/* Distant spires break the magma horizon into layers. */}
      <Rocks theme="underground" seed="far-spire1" size={6} position={[-8, -2.4, -18]} count={3} />
      <Rocks theme="underground" seed="far-spire2" size={7.5} position={[6, -2.6, -22]} count={3} />
      <Rocks theme="underground" seed="far-spire3" size={4.5} position={[1, -2.2, -14]} count={2} crystals />

      {/* Cave walls: dense rock at both edges keeps the frame from feeling empty. */}
      <Rocks theme="underground" seed="wall-l1" size={5.2} position={[-6.4, -1.2, 1.4]} count={5} crystals />
      <Rocks theme="underground" seed="wall-r1" size={5.0} position={[6.2, -1.6, 0.6]} count={5} />
      <Rocks theme="underground" seed="wall-l2" size={3.4} position={[-5.2, 3.0, -1.2]} count={4} crystals />
      <Rocks theme="underground" seed="wall-r2" size={3.0} position={[5.0, 3.6, -1.6]} count={4} />

      {/* The crust passing overhead: its stratified underside is the ceiling. */}
      <group position={[0, 7.4, -1.6]} rotation={[0.18, 0.42, -0.05]}>
        <DioramaTile theme="underground" size={15} strata={3} floating={false} tufts={0} seed="crust-tile" />
      </group>

      {/* Embers: continuous rise with a fade envelope, so nothing pops (4.9 K). */}
      {Array.from({length: 12}, (_, i) => {
        const seedUnit = seededUnit('ember', i);
        const rise = (sec * 0.55 + seedUnit) % 1;
        const size = 0.05 + seededUnit('ember:s', i) * 0.07;
        return (
          <mesh
            key={`ember-${i}`}
            position={[
              (seededUnit('ember:x', i) - 0.5) * 12 + Math.sin(sec * 0.8 + i) * 0.35,
              -2.8 + rise * 8,
              2.2 + seededUnit('ember:z', i) * 4.5,
            ]}
          >
            <sphereGeometry args={[size, 6, 5]} />
            <meshBasicMaterial
              color={materials.core}
              transparent
              opacity={Math.sin(rise * Math.PI) * 0.85}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      <Figure
        theme="underground"
        state="fall"
        t={sec}
        skin={characters.skin.b}
        shirt={characters.shirt.yellow}
        pants={characters.pants.gray}
        hair={characters.hair.brown}
        accessory="scarf"
        seed="faller"
        scale={1.15}
        position={[0.2, y, 0.6]}
        rotationY={spin * 0.6}
      />
    </Stage>
  );
};
