import {Composition} from 'remotion';
import {FPS, HEIGHT, WIDTH} from './kit/lib/timing';
import {
  CharacterShowcase,
  CHARACTER_SHOWCASE_DURATION,
} from './videos/characters/CharacterShowcase';
import {Demo, DEMO_DURATION} from './videos/demo/Video';
import {Gallery, GALLERY_DURATION} from './videos/gallery/Gallery';
import {RigTest} from './videos/rigtest/RigTest';
import {Template, TEMPLATE_DURATION} from './videos/_template/Video';

/**
 * Every composition is 1080x1920 @ 30 fps (spec 2).
 * Demo       — the kit demo (draft + final render target)
 * Gallery    — every kit piece on a tile, one shot per theme
 * CharacterShowcase — every animation state, 2 s each
 * Template   — the copy-me skeleton for a new video
 * RigTest    — minimal scene for the determinism check
 */
export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="Demo"
        component={Demo}
        durationInFrames={DEMO_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{debugCaptions: false}}
      />
      <Composition
        id="Gallery"
        component={Gallery}
        durationInFrames={GALLERY_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="CharacterShowcase"
        component={CharacterShowcase}
        durationInFrames={CHARACTER_SHOWCASE_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Template"
        component={Template}
        durationInFrames={TEMPLATE_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{debugCaptions: true}}
      />
      <Composition
        id="RigTest"
        component={RigTest}
        durationInFrames={120}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
