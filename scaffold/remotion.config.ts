import {Config} from '@remotion/cli/config';

// Three.js does not render correctly with Chromium's default GL backend.
Config.setChromiumOpenGlRenderer('angle');

// PNG would be slow for 300 frames at 1080x1920; JPEG 95 avoids the banding
// the default JPEG quality (80) causes on sky gradients (spec 3.6).
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);

Config.setPixelFormat('yuv420p');
Config.setOverwriteOutput(true);

// WebGL scenes render fastest with 2-4 concurrent tabs (spec 3.6).
// Override per run: $env:REMOTION_CONCURRENCY=2 ; npm run render:final
const concurrency = process.env.REMOTION_CONCURRENCY;
if (concurrency) {
  Config.setConcurrency(Number(concurrency));
}
