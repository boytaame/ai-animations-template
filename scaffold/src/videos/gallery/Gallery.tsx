import {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {palette, type ThemeName} from '../../kit/lib/palette';
import {Lights} from '../../kit/rig/Lights';
import {CameraRig} from '../../kit/rig/CameraRig';
import {Stage} from '../../kit/rig/RendererSetup';
import {buildShot} from '../../kit/rig/shots';
import {ShotTimeline, type ShotDef} from '../../kit/rig/ShotTimeline';
import {Backdrop} from '../../kit/world/Backdrop';
import {KitStage} from './KitStage';

/**
 * M3 acceptance composition: every kit piece on a tile in each theme.
 * One shot per theme, isometric tile camera, stills at each midpoint.
 */

const THEMES: ThemeName[] = ['day', 'dusk', 'night', 'underground'];
const SHOT_LENGTH = 75;

const ThemeShot = ({theme, frame}: {theme: ThemeName; frame: number}) => {
  const plan = useMemo(
    () =>
      buildShot('tileIso', {
        duration: SHOT_LENGTH,
        target: [0, 1.4, 0],
        distance: 50,
        azimuthDeg: 45,
        elevationDeg: 35,
        fov: 22,
      }),
    [],
  );

  return (
    <Stage theme={theme} fog={{near: 26, far: 80}} shadows>
      <Backdrop />
      <Lights
        theme={theme}
        area={13}
        keyPosition={[13, 19, 10]}
        rimPosition={[-9, 8, -11]}
        points={
          theme === 'underground'
            ? [{position: [0, 1.4, 0], intensity: 14, distance: 12, color: '#F08A2E'}]
            : []
        }
      />
      <CameraRig plan={plan} frame={frame} seed={theme.length} />
      <KitStage theme={theme} sec={frame / 30} />
    </Stage>
  );
};

export const Gallery = () => {
  const frame = useCurrentFrame();
  const shots: ShotDef[] = THEMES.map((theme, i) => ({
    id: `theme-${theme}`,
    from: i * SHOT_LENGTH,
    durationInFrames: SHOT_LENGTH,
    theme,
    out: {kind: 'hardCut', carry: 'camera motion continues'},
    render: ({frame: local}) => <ThemeShot theme={theme} frame={local} />,
  }));

  return (
    <AbsoluteFill style={{backgroundColor: palette.base.backdropDeep}}>
      <ShotTimeline shots={shots} frame={frame} />
    </AbsoluteFill>
  );
};

export const GALLERY_DURATION = THEMES.length * SHOT_LENGTH;
