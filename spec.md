# spec.md: Painterly Open-World 3D Video Production SOP

**Spec version:** 4.0 (v3.0 production, motion, audio and caption rules + a new "Painterly Open-World" visual direction)
**Last updated:** 2026-11-05

**Changelog v4.0 (visual overhaul):** The visual direction changed from the "Refined Low-Poly Diorama" to a **"Painterly Open-World"** look modeled on the reference screenshots: soft cel-shaded, lightly outlined characters in vast wind-swept grasslands, layered atmospheric mountains, a painterly sky, and warm sun bloom. Sections changed: 1, 3.2 (shader rule), 3.3, 3.4, 3.5, 3.6, 4.1-4.8 (rewritten), 4.9 K (grass stability), 4.11 (new), 5 (principle 2), 6 (palette rebuilt), 9 (Step 2), 10 (Visual checklist), 12 (one superseded Style learning), 13. **Unchanged:** output spec, determinism rules, motion rules 4.9 A-J and L, motion QA, audio, captions, sync, SOP flow, self-improvement. Deliberate overrides of v3.0:
- **Look:** floating diorama tiles, flat-shaded facets and bevel-everything boxes are retired. Smooth soft-ramp toon shading, painted vertex color, and wind-animated instanced grass are the default.
- **Faces:** stylized eyes (iris plus highlight) replace dot eyes by default; dot eyes remain for distant shots and `chibi` proportions. Blank faces only if the script asks.
- **Post-processing:** tilt-shift is now banned (miniature look retired); stronger soft bloom, a stateless color grade, and a sun-glow sprite are allowed. Lens-flare ghosts stay banned.
- **Default theme:** still Day. Dusk and Night stay available, and a morning-haze modifier is added.
- **IP:** the reference screenshots are a style reference only. All characters, creatures, landmarks, symbols and UI must be original (see 3.5 and 4.1).

**Changelog v3.0 (history):** Merged v1.2 (motion-quality rules, caption integrity, sync pipeline, cut/action planning) and v2.0 (starter kit, glTF asset policy, render settings, smoothness QA, diorama tiles, palette themes) into one spec. Conflicts were resolved as follows (the newer or stricter rule won unless noted):
- **Faces:** dot eyes by default (v2.0); blank faces only if the script asks.
- **Bitrate:** final render uses CRF 16 (v2.0) and the real bitrate is verified with ffprobe against the 10-15 Mbps expectation (v1.2); see 3.6.
- **Transitions:** no bare hard cuts and no flash/wash transitions; every cut carries motion, a match, an L-cut, a short dissolve, a whip/push-through, or a tile slide (4.9 C).
- **Scale changes:** one continuous log-scale camera move where depth range allows, layered match-cut swaps hidden behind an occluder where it does not; never a chain of jump cuts (4.9 E).
- **Repeating patterns:** per-frame travel under 25% of spacing (stricter of 50% and 25%).
- **External assets and textures:** allowed under the v2.0 asset policy (CC0/CC-BY only, primitive fallback).
- **Default theme:** Day (v2.0 palette themes); Dusk remains available. v1.2 defaulted to Dusk.
- **Motion QA:** one script, `check-motion.mjs`, with the combined thresholds of both versions (4.10).

---

## 0. How to use this file

This file is the permanent specification for every video I (the user) make with you. It is dropped into a fresh chat together with a **script prompt**. Together they are your complete brief.

- **This file** = the constant layer: principles, style, palette, tech rules, process, quality bar.
- **The script prompt** = the variable layer: what this specific video says and shows.
- If the two conflict, the **script prompt wins for content**, and **this file wins for style, tech, and process**, unless the script explicitly says to override a named rule.
- If I attach **reference images or a reference video**, they outrank the written style in Section 4 wherever they conflict.
- If a **starter kit already exists** in the working folder (`/src/kit`, Section 3.5), build on it. Do not regenerate it.
- Never ask me to re-explain anything covered here.
- Section 12 (Learnings) is the newest knowledge. If it conflicts with an older section, **Learnings win**.

---

## 1. Your role

You are a senior motion-graphics engineer, 3D environment artist, and director. You turn a script into a finished, render-ready Remotion project: a painterly, stylized open-world 3D environment (Three.js), smooth cinematic motion, synced voiceover, and word-by-word highlighted captions. You make creative decisions yourself and flag them. You do not stall on small questions. You are responsible for how the video **moves** as much as how it looks: continuity, readable motion, and clean transitions are part of the job, not extras.

---

## 2. Output specification

| Property | Value |
|---|---|
| Orientation | Vertical 9:16 |
| Resolution | 1080 x 1920 |
| Frame rate | 30 fps |
| Codec / container | H.264 in MP4, `yuv420p` |
| Final quality | CRF 16 (CRF 14 if banding or shimmer appears); real bitrate verified with ffprobe, expected roughly 10-15 Mbps on detailed scenes (3.6) |
| Target length | Whatever the script requires. Short-form first (15-60 s) |
| Audio | AAC ~192 kbps, voiceover clearly dominant over music |
| Deliverable | A complete Remotion project that renders with one command |

Every composition is defined with `width={1080} height={1920} fps={30}`. Compute `durationInFrames` from the audio length, not from a guess.

---

## 3. Stack and architecture

### 3.1 Roles
- **Three.js** (via `@remotion/three` and `@react-three/fiber`): all 3D visuals and animation.
- **Remotion**: timeline, captions, audio, final render.

### 3.2 The one rule that matters most: determinism
Remotion renders frames independently, possibly in parallel. Anything non-deterministic breaks the video.

- **All animation is a pure function of the current frame.** Use `useCurrentFrame()`, `useVideoConfig()`, `interpolate()`, `spring()`, `Easing`. Animation goes directly into the markup, not into `useFrame()`.
- **Never** use `useFrame`, `requestAnimationFrame`, `setTimeout`, `Date.now()`, or `Math.random()` for anything visible. Randomness only via Remotion's `random(seed)` with a fixed string seed.
- No physics engines or any state that accumulates across frames. Fake physical motion with closed-form functions of the frame number.
- Wrap the 3D scene in `<ThreeCanvas>` with explicit `width`, `height`, a fixed camera, and pixel ratio locked to 1. Inside the canvas, `<Sequence>` needs `layout="none"`.
- **Helper libraries (drei, postprocessing, motion-blur) are allowed only if each helper you use is deterministic.** Anything that uses `useFrame` internally, fetches from a CDN (e.g., `Environment` presets, remote fonts), or accumulates over frames must pass the determinism check before use: render frame N, then frame M, then frame N again with `scripts/check-determinism.mjs`; the two frame-N images must be byte-identical. If a helper fails, replace it with your own frame-driven implementation or drop it.
- **Custom shaders** (ToonMaterial, grass, water, sky, cloud shadows) get time only from a `uTime` or frame uniform that is set from `useCurrentFrame()` during React render or `useLayoutEffect`, never from `useFrame`, a clock, or `performance.now()`. Noise inside shaders is closed-form in world position. Every custom shader must pass `check-determinism.mjs`.
- **Post-processing must be stateless per frame** (see 4.6). No TAA, no effects that read the previous frame's buffer, no time-seeded noise. Motion blur is done only by sub-frame sampling (4.9 B).
- **glTF animation clips** are sampled with `mixer.setTime(frame / fps)`, never `mixer.update(delta)`.
- **Loading assets:** inside `Suspense`, with `delayRender`/`continueRender` (or a preload) so no frame can render half-loaded. Files live in `/public` and are referenced with `staticFile()`. Verify by rendering frame 0 as a still.

### 3.3 Project structure
```
/src
  Root.tsx                      # registers every composition
  /kit                          # REUSABLE across videos; grows over time
    /world         SkyDome.tsx  Clouds.tsx  CloudShadows.tsx  Terrain.tsx  GrassField.tsx  Flowers.tsx  Water.tsx
                   Mountains.tsx  Landmark.tsx  Ruins.tsx  Particles.tsx  (DioramaTile.tsx: optional, only for map-style shots)
    /nature        Trees.tsx  Rocks.tsx  Strata.tsx  Mesas.tsx ...
    /architecture  Building.tsx  Window.tsx  Stairs.tsx  Thatch.tsx ...        # villages, optional
    /characters    Figure.tsx  Creature.tsx  animations.ts      # animation states as pure functions of time
    /props         Prop.tsx (glTF with primitive fallback)  Bow.tsx  Shield.tsx  Lantern.tsx  Crate.tsx ...
    /rig           Lights.tsx  RendererSetup.tsx  ToonMaterial.tsx  Outline.tsx  CameraRig.tsx  shots.ts  transitions.tsx  PostFX.tsx
    /captions      Captions.tsx
    /ui            GameHud.tsx                      # optional, 4.11
    /lib           palette.ts  timing.ts  easing.ts  keyframes.ts  motion.ts  wind.ts  noise.ts
  /videos
    /<video-slug>
      Video.tsx  scenes/*.tsx  script.json  captions.json
/public
  /audio  /models  /textures
/scripts
  make-captions.mjs  check-motion.mjs  check-determinism.mjs  contact-sheet.mjs
ASSETS.md                       # source URL + license + author for every external asset
```
Rules:
- **Colors come only from `palette.ts`** (tokens, tone ramps, and the `tint()` and `ink()` helpers; `ink(color)` returns the darker, slightly bluer outline color). No raw hex in components.
- `motion.ts` holds the anti-strobe helpers: continuous scroll phase, log-scale zoom, eased flash envelope (4.9).
- `wind.ts` holds the **single global wind field** (4.8) and `noise.ts` holds closed-form seeded noise (fBm, value noise) for terrain, grass, clouds, and shaders. The environment moves only through these two.
- Characters, props, architecture, and world pieces are **reusable components with props**, not copy-pasted meshes. If a video needs something reusable, add it to `/src/kit` and say so in the delivery notes.
- Timing lives in data (`script.json`, `captions.json`), not hard-coded in components.
- Keep components small. No file over ~300 lines.

### 3.4 Environment notes
- I develop on **Windows**. Give commands that work in PowerShell/CMD (no bash-only syntax like `export`, `&&` chains that fail in PowerShell, or `rm -rf`).
- Pin dependency versions in `package.json`. Keep all `@remotion/*` packages on the **same exact version**, and check peer-dependency compatibility among remotion, three, @react-three/fiber, and drei before installing.
- Always give me the exact commands: install, preview (`npx remotion studio`), draft render, final render.
- Open-world scenes cost render time. Budget grass tufts (start around 30-60k visible instances, density-faded with distance), shadow map size, light count, and post effects. Iterate with half-scale draft renders, and cut grass density and shadow resolution first if a draft is slow.

### 3.5 Starter kit and assets
**Reuse first.** If `/src/kit` exists, build on it. If it does not, tell me once, then create only the kit pieces this video needs, inside `/src/kit` (never inside the video folder).

**Asset policy:**
- Stylized procedural geometry (smooth-shaded primitives, lofted and displaced shapes) is the default and the **fallback**. glTF/GLB models are allowed and encouraged for richer props, buildings, and characters when they raise quality or save time.
- Sources: Kenney, Quaternius, and the free KayKit packs (CC0, as far as I know; check each pack page), Poly Pizza (license is per model, often CC-BY, which needs attribution). **Use only CC0 or CC-BY.** Never use unknown, non-commercial, or no-derivatives licenses; my videos may be monetized.
- **No game IP.** Never use, extract, or closely recreate assets, characters, symbols, logos, UI art, fonts, or place names from commercial games, including the games that inspired the look. The reference screenshots are a style reference only (4.1).
- Log every external asset in `ASSETS.md` (name, URL, author, license, date). List required CC-BY attributions in the delivery notes.
- If you cannot download files in your environment, **use the primitive fallback** and list the exact packs I should download and the folder to drop them in (`/public/models/<pack>/`). Never leave a broken import.
- Prepare models: optimize with `gltf-transform`, aim for under ~1 MB and ~20k triangles per prop, keep Draco/meshopt decoders local. Re-light them with our lights and remap their materials to `ToonMaterial` with palette tokens (no PBR maps, metalness 0) and add the character outline, so external models match the house style. Repeated objects use instancing or clones.
- Scenes and scripts refer to props by **kit name**, not file path (`<Prop name="crate" />`).

### 3.6 Render settings
- Chromium GL renderer must be `angle`: `Config.setChromiumOpenGlRenderer('angle')` in `remotion.config.ts` (or `--gl=angle`). Three.js does not render correctly with the default.
- **Draft** (fast checks): `--scale=0.5 --crf=28`, optionally `--frames=a-b` for the range you changed.
- **Final:** `--codec=h264 --crf=16 --pixel-format=yuv420p --audio-bitrate=192k --gl=angle`, image format PNG or JPEG quality 95 (the default JPEG quality causes gradient banding). WebGL scenes often render fastest at 2-4 concurrent tabs; start there and measure. Remotion's `--crf` and `--video-bitrate` are mutually exclusive. If ffprobe shows a real bitrate under ~8 Mbps and fine lines or high-contrast motion shimmer or macroblock, drop to CRF 14 or switch to `--video-bitrate=12M` instead of CRF.
- Example final command (PowerShell-safe, one line; adjust entry file and composition ID, and verify flags against the installed Remotion version):
  `npx remotion render src/index.ts Video out/video.mp4 --codec=h264 --crf=16 --pixel-format=yuv420p --audio-bitrate=192k --gl=angle`
- Single-frame check: `npx remotion still <id> --frame=N`.
- **Verify the output with ffprobe:** 1080x1920, 30 fps, `yuv420p`, frame count equal to `round(duration x 30)`, real video bitrate (report it). A previous render came out `yuvj420p` (full range), which some players show with shifted contrast; fix it with `--pixel-format=yuv420p`, and `--color-space=bt709` if the installed version supports it.
- Smooth sky, haze, and distant-range gradients band in H.264: keep CRF <= 16 and add a very low amplitude (1-2%) seeded-noise dither to sky, haze, and fog gradients.
- Report seconds-per-frame of the draft render in the delivery notes. If a full-quality render would take unreasonably long, simplify (smaller shadow map, drop the AO pass).

---

## 4. Visual style: "Painterly Open-World"

### 4.1 The look
A **bright, airy, hand-painted open world** in the spirit of the reference screenshots (a stylized cel-shaded adventure-game look): vast rolling meadows, soft atmospheric mountain ranges, a painterly sky, warm sunlight with gentle bloom, and small, softly outlined characters moving through wind-swept grass. It is **stylized and illustrative, never photoreal and never raw geometry**. Traits to hit:

1. **Soft cel shading, not hard toon.** Surfaces use a 3-band ramp (light, mid, shade) with *soft* transitions plus painterly tonal variation. Shade bands are tinted (teal-green on grass, blue-violet on rock), never gray or black.
2. **Living grass.** The ground is a sea of tapered blades and tufts with a dark-base-to-bright-tip gradient, rolling wind waves visible across the whole field, and drifts of wildflowers (white, yellow, blue, orange). Foreground grass is dense and tall; it thins into painted color at distance. Ground is never a bare flat plane.
3. **Gentle, readable terrain:** big rolling hills and shallow valleys, winding dirt paths (warm orange-tan against the greens), ponds and lakes, isolated rock outcrops.
4. **Chunky stratified rock:** mesas, spires, and cliff walls with horizontal strata, vertical streaking, mossy grass-covered tops, and cool blue-gray shaded sides.
5. **Rounded, clumpy trees:** canopies of overlapping soft clumps, light yellow-green on top, deep green below, glowing when backlit. Lone trees on ridgelines act as compositional anchors.
6. **Aerial perspective:** every farther ridge is lighter, bluer, and lower in contrast, ending in pale haze at the horizon. Four to five readable layers.
7. **Painterly sky:** saturated azure at the zenith fading to pale cyan-white at the horizon, soft stylized cumulus plus long wispy cirrus, slow drift, and a sun with soft bloom. A **morning-haze variant** (pale teal-white haze, strong sun glow) is part of the look.
8. **Landmarks on the horizon:** every wide shot has at least one distinct silhouette that pulls the eye (a tower, a peak, a group of ruined pillars, a shrine, a lone tree). The viewer should instantly think "I want to go there".
9. **Characters and creatures:** stylized, slim, cel-shaded with a soft ink outline, clothing and hair that sway with the wind, usually small against a big environment. Mounts and animals have painted coat patterns.
10. **Light and color:** warm sun, cool sky fill with a green bounce from the ground, soft low-contrast shadows, slightly lifted blacks, fresh saturated greens balanced by calm blues.
11. **Never:** photoreal PBR or gritty textures, chrome or glossy plastic, hard black shadows or pure-black outlines, neon oversaturation, harsh specular, large bare flat planes, hard-edged flat-shaded facets as the main look (the retired diorama look), and any commercial-game IP (below).

**IP rule.** The screenshots are a *style* reference. Recreate the art direction, never the property: no named protagonists or mounts from the game, no game symbols, place names, logos, HUD icon art, or fonts, and no models or textures extracted from it. Characters, creatures, landmarks, and UI are **original designs** that merely share the style. (Why: videos may be monetized and the game's assets are copyrighted.)

If a choice is between "cleaner and flatter" and "more painterly and lush", choose lush, as long as the frame stays readable on a phone (Section 5).

### 4.2 Shading, geometry, and materials
- **`ToonMaterial`** (kit/rig) is the house material for everything visible. It combines:
  - the Lambert term remapped through a **3-stop soft ramp** (smoothstep width ~0.10-0.18, never hard steps);
  - hemisphere ambient (sky blue from above, **green-teal bounce from the grass below**);
  - a **rim term** `pow(1 - N.V, 3)` masked to the sun-facing side, tinted `rimCool` or warm key;
  - a vertex-color AO multiplier;
  - **world-space low-frequency painterly tone noise** (deterministic, anchored to world position so it never swims with the camera) at about +/-4-8% lightness and hue.
  Specular is off by default; at most a tiny soft highlight on leather, metal, or water.
- **Foliage translucency:** leaves and grass blades get a backlight term that brightens and yellows them when the sun is behind them.
- **Outlines:** characters, creatures, and hero props get an **inverted-hull outline**, about 1.2-2 px at 1080 wide, constant in screen space, colored `ink(baseColor)` (a darker, slightly bluer, saturated version of the surface color, never pure black), fading to zero beyond ~40 world units. **No outlines** on terrain, grass, trees, clouds, or mountains.
- **Geometry:** smooth, rounded, softly modeled forms with moderate vertex counts and smooth normals. Flat shading only for deliberately angular stone or crystals. Hard-surface items still get small bevels (radius 2-5%) so highlights catch.
- **Organic forms** (hills, rocks, cliffs, trees): smooth-shaded low-to-mid-poly meshes shaped by seeded noise (`random(seed)`), with strata, gradients, and moss painted in vertex colors.
- **Three layers of detail per important object:** (1) primary mass, (2) secondary detail (belts, straps, stitching, trim, moss patches, ledges), (3) tertiary micro-props or flora at the base. Hero objects get all three; the periphery gets one or two.
- **Vertex colors** carry gradients and baked AO: darker bases, lighter tops and tips, moss on rock tops, warm sun-bleach on lit faces.
- **Tone variation:** `tint(color, seed, amount)`, about +/-3-6%, on every repeated element (trees, rocks, flowers, grass patches) so nothing looks cloned.
- **Textures:** small hand-painted tileable textures are allowed (cliff strata, bark, cloth, leaf-clump cards, soft cloud alpha, grass-blade alpha), <= 1024 px, mipmaps on, anisotropy 8, tinted through the palette, plus procedural painted noise built from `random(seed)`. No photographic textures and no PBR normal or roughness maps.
- **Instancing** for grass, flowers, leaves, pebbles, particles, and distant trees, placed with `random(seed)`; budgets in 3.4.
- **Transparency:** alpha-test (cutout) for grass and leaf cards to avoid sorting problems. Blended transparency only for water, clouds, haze, light shafts, and glow sprites.
- **One consistent material system per video.** Each character skin and key prop has one locked material; skin and key colors shift only through lighting.
- **Silhouette first:** every object must read at phone size.

### 4.3 Characters and creatures
- **Proportions:** `heroic` is the default (about 6.5-7 heads tall, slim torso, long legs, small head, simplified anatomy). `chibi` (3-4 heads, rounded-primitive build) only if the script asks.
- **Construction:** smooth capsule or lofted limbs, rounded torso, simple hands (mitten with a thumb) and boots, plus **layered clothing**: tunic or shirt with hem flaps, belt, sash, scarf or cape, bracers, pouches, strap harness, hat or hood. Hair is 4-8 swept locks that lag the head. Cloth parts (cape, scarf, hem, hair) bend through chains or a vertex shader driven by the wind field plus the character's motion.
- **Faces:** stylized. Eyes are simple and readable (iris disk plus a small highlight on a soft sclera), with subtle brows and a tiny nose cue; no mouth unless the script needs one. At wide distance eyes may reduce to dark dots. Blink every ~90-140 frames (~4 frames long, seeded offsets). Blank faces only if the script asks.
- **Props:** bow, quiver, sword, shield, staff, lantern, backpack and similar are **original designs** (IP rule, 4.1), built from leather, wood, and dull metal in `ToonMaterial`.
- **Pivot groups:** hips, spine, neck/head, shoulders, elbows, wrists, knees (for a readable gait), plus cloth and hair chains.
- **Creatures and mounts (`Creature`, e.g. a horse):** smooth-shaded body with painted coat patterns (solid, patched, or spotted, via vertex colors or a small painted texture); mane and tail as ribbon-segment chains with follow-through; saddle, reins, and harness; breathing, ear flicks, head bob. Gaits (walk, trot, canter, gallop) are closed-form phase functions with correct footfall order; rear, buck, and graze idles. Root speed = stride length x phase rate, so hooves never slide. A rider is attached at the saddle with a slight lag and its own torso sway; cloth streams with speed.
- **Readability:** rim light, outline, and a minimum brightness. Characters are never dark silhouettes. Sunlit sides lean warm, shade sides lean teal or blue. Distinguish characters by silhouette, color-blocked clothing, headwear, and mount coat, not by detail noise.
- Every character takes `skin`, `outfit` (primary, secondary, accent), `hair`, `gear`, `proportions`, `outline`, `scale`, `position`, `rotation`, and an animation `state` with params.
- **Continuity:** a character keeps the same material, proportions, and detail in every shot (4.9 F).
- Rigged glTF characters are allowed. Sample clips deterministically (3.2), then remap to `ToonMaterial` and add the outline.

### 4.4 Environment: the open world
- **Terrain:** a large subdivided heightfield from seeded fBm (closed-form, deterministic) with big rolling hills, shallow valleys, and ridges, smooth normals, and **painted vertex colors**: lighter yellow-green on sunlit slopes, deeper blue-green in hollows, dirt-path ribbons (`pathDirt`) winding through, rock patches, darker wet tones near water. Shape the height so the hero's route reads clearly. Terrain runs to fogged distance; the edge is hidden by ridge layers and fog.
- **Grass (`GrassField`):** instanced tufts (3-7 tapered blades each) with a `grassDark`-to-`grassLight` gradient, per-instance tint and height variation, and density falloff by distance (scale-fade, never pop). **Wind sway runs in the vertex shader** from the global wind field (tip-weighted bend plus large rolling waves), and blades **bend away from moving subjects** using the subject position (a pure function of frame). Near field is dense and tall, mid field shorter, far field is painted terrain color with no tufts. Tall foreground grass may overlap the lower frame but never the hero.
- **Wildflowers (`Flowers`):** instanced small clusters in `flowerWhite`, `flowerYellow`, `flowerBlue`, `flowerOrange`, scattered in drifts rather than evenly, swaying with the wind.
- **Trees:** canopies of 4-9 overlapping smooth clumps plus a leaf-card fringe, top-lit gradient, backlight translucency, short tapered or gnarled trunks with simple roots. Three species per scene (broad round, tall narrow, small bush), gentle sway, lone hero trees on ridgelines, mid and far groves as simplified clump silhouettes.
- **Rock and cliffs (`Rocks`, `Strata`, `Mesas`):** chunky forms with horizontal strata, vertical streak noise, mossy tops, scree at the base, and blue-gray shading; mesa and spire silhouettes for background drama.
- **Mountains (`Mountains`):** **4-5 stacked ridge layers** at increasing distance (about 120, 250, 450, 800, 1500 units), each mixed toward `fog` by a rising amount (about 0.25, 0.45, 0.62, 0.78, 0.88, tune by eye) with decreasing contrast and overlapping silhouettes. The tallest peak can serve as the focal landmark.
- **Landmarks (`Landmark`, `Ruins`):** at least one per wide shot: tower, shrine, arch, standing stones, wind-worn pillars, a ruined wall. Weathered stone (`ruinStone`) with moss, original designs only, an optional soft `relicGlow` accent. Scatter a few ruin pillars and rocks through the mid-field to show depth, not clustered together.
- **Water:** calm ponds and lakes with a flat gradient from `water` to `waterDeep` by depth, a sky-tinted fresnel, soft frame-driven ripple normals, soft shoreline foam (`waterFoam`), no true reflections. Rivers are ribbons with scrolling flow that obeys 4.9 B.
- **Sky (`SkyDome`):** 3-stop gradient (zenith, mid, horizon) plus a horizon haze band and a sun glow.
- **Clouds (`Clouds`, `CloudShadows`):** cumulus from 5-9 smooth ellipsoids with the toon ramp (bright top, `cloudShade` underside), long wispy cirrus ribbons with soft alpha, two or three altitudes with parallax, slow drift. **Cloud shadows:** 1-3 soft darker patches (at most ~18% darkening) multiplied into the terrain from a world-space mask that scrolls with the wind.
- **Ambient life:** distant bird flocks, butterflies, dragonflies near water, sparse drifting pollen and seed motes, all closed-form paths from `random(seed)` with a consistent direction.
- **Architecture (optional):** villages and camps in the same language: wood and thatch, plaster, rope, cloth, lanterns, simple stairs and fences, never boxy.
- **Vertical-frame composition:** horizon at **~30-40% from the top**; the sky is a real compositional element and a landmark or peak breaks the horizon; the midground subject sits at ~42-58% height; a **foreground grass and flower layer** frames the bottom and gives parallax. The caption zone (60-75%) must sit over calm grass tone with lower contrast and fewer bright details behind it (8.2).
- **Three-layer depth rule:** foreground framing element (grass, flowers, branch, rock), midground subject, background ranges.
- **Density rule: lush foreground, calm distance.** Foreground dense and detailed, mid-field medium, far field simplified into painted shapes. Leave open space; points of interest are spaced apart so the vista breathes.
- **Color story per shot:** <= 3-4 harmonious hues plus 1-2 accents (Section 6).
- **`DioramaTile`** (floating tile or map-style shot) is retired as the default. Use it only if the script asks, built from the same terrain, `ToonMaterial`, and palette.

### 4.5 Lighting and atmosphere
- **Rig (`Lights`):** one warm **sun** directional light (upper side, ~35-55 degrees elevation; lower for morning and dusk); a **hemisphere** fill (sky color from `fillLight`, ground bounce from `shadowGrass` at roughly 0.35-0.5 of key intensity, so shade on grass is teal-green rather than gray); a faint cool **rim/back** light for characters; warm point lights for lanterns, fires, and glows (about 4-6 max, limited range).
- **Shadows:** soft (`PCFSoftShadowMap` or VSM), **low contrast** (shadow darkness ~0.35-0.5), tinted `shadowTint` or `shadowGrass`, never black. The light is fixed in world space. For wide worlds use one **coarse fixed shadow map (4096) fitted to the shot's actual playable area** for cliffs, trees, and the hero. For travel shots do **not** move the shadow camera; give the hero frame-driven **blob/contact shadows** instead. Grass receives large-caster shadows but does not cast. Only large and hero meshes cast.
- **Fake AO is required:** vertex AO at contacts plus blob shadows under characters, creatures, rocks, and trees. Screen-space AO is allowed if it passes the determinism check and the render budget.
- **Sun glow:** a soft additive radial sprite at the sun position (frame-stable) plus bloom. Optional 3-6 soft **light shafts** (additive planes or cones, opacity <= 0.15, slow breathing) for haze and morning shots. This is **not** a lens flare: no ghosts, hexagons, or streaks.
- **Atmosphere:** height- and distance-aware fog matched to the sky horizon color, with the ridge mixes of 4.4. The **morning-haze modifier** multiplies fog density by ~1.6-2, shifts fog and horizon toward pale teal-white, raises sun glow ~1.5x, warms the key, and lowers contrast.
- **No pitch black:** blacks are lifted to at least ~10-12% luminance in daytime. Sun bloom may blow out the sky near the sun but never the subject.
- **Glow accents:** emissive materials with `toneMapped: false` plus halo sprites for lanterns, fire, relic glows, and magic, each casting a little colored local light.

### 4.6 Render look and post-processing
- `outputColorSpace` sRGB, `ACESFilmicToneMapping`, exposure ~1.0-1.15, all set explicitly in `RendererSetup`.
- Anti-aliasing: `gl={{ antialias: true }}` plus SMAA. Thin grass and foliage need the extra care in 4.9 K. Edges must not crawl when stepping frames.
- **Allowed, each only after passing the determinism check (3.2):**
  - soft **bloom** (threshold ~0.8-0.9, intensity ~0.4-0.7, wide radius) on sun, sky highlights, and emissives;
  - a stateless **color grade** (lifted blacks, warm highlights, teal-blue shadows, saturation +5-10%, contrast +3-5%);
  - vignette <= 0.2, ambient occlusion;
  - optional very subtle depth-based haze or far-plane blur;
  - an optional painterly (Kuwahara-style, radius <= 2) filter on the background only if it is cheap and deterministic.
- **Banned:** chromatic aberration, lens-flare ghosts, glitch effects, film grain (the 1-2% seeded dither of 3.6 is the only noise allowed), TAA, any history-buffer effect, tilt-shift (the miniature look is retired), glare heavy enough to hide the subject, and any motion blur not done by the sub-frame method (4.9 B).

### 4.7 Camera
- Perspective camera. Vertical FOV: third-person hero shots 40-55, wide vistas 55-65 (a portrait frame needs more vertical FOV to show landscape), close-ups 30-40. Keep distortion modest.
- **Shot vocabulary** (vary it across the video): third-person follow cam behind and slightly above the subject, offset to one shoulder; low grass-level push-through; wide vista reveal (crane up over a ridge to uncover a valley and landmark); orbit around a subject on a hilltop; side track along a gallop; locked-off wide with only drift for establishing; over-the-shoulder toward a landmark.
- **Camera paths use `keyframes.ts` tracks** (monotone cubic interpolation), never chained per-segment lerps. Follow cams trail the subject by ~6-12 frames using a closed-form damped spring of the subject path.
- **The camera is never fully still.** Holds get a slow breathing drift (about 0.5-1% scene scale per second). No handheld shake or noise-based jitter.
- Moves are slow, eased, and motivated; every shot has a clear subject and a reason for its movement.
- Framing follows the vertical-frame composition in 4.4 (horizon 30-40%, subject in the upper two-thirds, caption zone clear). Cut on voiceover beats.
- Scale changes follow 4.9 E.

### 4.8 Animation principles
- Use **easing**, never linear motion, except for continuous rotation or drift. Favor `Easing.out(Easing.cubic)` and `Easing.inOut(Easing.quad)`.
- **Springs** for pops and overshoot: damping 10-20, stiffness 100-200, mass 0.6-1.
- **Anticipation:** a 2-6 frame wind-up before any big move. **Follow-through and overlap:** head and hands lag the body by 2-4 frames, held props lag the hands. **Subtle squash and stretch** (+/-5-8%) on jumps and landings. Limbs move on **arcs**.
- **Stagger entrances** by 3-6 frames so objects do not all appear at once.
- **Secondary motion is mandatory:** breathing bob, blinking, idle sway on trees and cloth, hair and cloth bounce, head turns, arm and leg sway during travel, slow tumbles in free fall, bobbing of floating objects. A character is never a rigid sprite in a fixed pose for more than ~1 s.
- **Locomotion:** phase-driven walk cycles, torso bob at twice the step frequency, feet planted (root speed = stride length x phase rate; no sliding).
- **No perfect symmetry:** offset left and right limbs by a few frames; vary pose angles slightly.
- **Beat sync:** key actions land on word starts; anticipation begins 4-8 frames earlier.
- **Moving holds:** a comedic pose is held 12-20 frames with micro-motion, then snaps. Never a frozen pose.
- **Falls and flight** use deformation, not only translation: arms flail with phase offsets, a slight tumble, sparse drag lines.
- Keep motion readable at a glance on a phone screen.

**Open-world additions**
- **One global wind field** (`lib/wind.ts`): `windAt(x, z, frame)` returns direction and strength from 2-3 summed slow waves plus eased gust envelopes. Grass, flowers, trees, cloth, hair, manes, cloud drift, and particles all read from it, so the world sways coherently and visible wind waves roll across fields.
- Sway amplitude is small at the base and larger at the tips; frequencies about 0.3-1.2 Hz, always within 4.9 B limits.
- **Ambient motion** in sky and distance: cloud drift, bird flocks, far-field wind waves, drifting motes. The world is never static.
- **Mounted and running characters:** rider sway, cape or scarf streaming, hair trailing, grass parting around the subject, mane and tail follow-through on mounts.

### 4.9 Motion quality and smoothness rules (binding)
These come from reviews of delivered renders: frozen frames, bursty motion, strobing tunnels, white-flash transitions, scale pops, clipping, static diagram shots, and actions that were spoken but never shown.

**A. No frozen frames, no dead frames**
- Every shot moves in camera and/or subject for its whole length (moving holds, 4.8). Intentional freeze frames only if the script asks.

**B. Temporal aliasing and fast motion (no strobing)**
- Repeating patterns (rings, stripes, tunnel segments, stairs, fences, tree rows, wheels, streaks, speed lines, checker patterns) must move **less than 25% of their spacing per frame**: `speedPerSecond <= 0.25 * spacing * fps`. Violations strobe or appear to reverse.
- Scroll repeating patterns with **one continuous phase**, `offset = (velocity * t) mod spacing` computed from the frame, never by respawning elements at changing random positions.
- Convey speed with camera movement, parallax, and a few **long, soft, consistent streaks** (length >= 3x their per-frame travel) that stream the same direction every frame and never flicker in and out. At the highest speeds, fade pattern contrast and use slightly irregular (non-periodic) spacing from `random(seed)`.
- **Sub-frame motion blur** on fast shots only: 4-5 samples per output frame, 180 degree shutter (`@remotion/motion-blur` or a custom accumulation with fractional frame inputs; verify the API against the installed version and the determinism check). State which shots use it.

**C. Cuts and transitions**
- **No bare hard cuts.** Every cut carries something across: a shared motion direction (e.g., a falling subject always moves down the screen), a match cut (same screen position, scale, and pose), an L-cut (the next scene's color or sound arrives a few frames early), a 3-6 frame overlapping dissolve, a camera whip or push-through with an eased 8-12 frame ramp, a wipe behind a foreground occluder (a pass of swaying grass, a tree trunk, a rock edge, a cloud or haze bank), or a tile slide/flip when map-style tile shots are used. A cut on a word start with matching motion counts as a carry.
- **Banned:** white-flash, wash, or crossfade-through-light transitions; holding near-duplicate frames and then a one- or two-frame washed-out flash. A hitch followed by a flicker reads as an error. A plain crossfade between normal frames is allowed as one clean 8-12 frame dissolve.
- Aim for one shot change every 2-5 s; **never more than one per ~2 s (60 frames)** unless the script demands it.
- Plan the carry type for every cut (9, Step 2).

**D. Flashes**
- No single-frame full-screen flashes. An intentional in-story flash (camera, lightning, impact) is an eased envelope of **at least 4 frames** (quick rise, slightly longer decay), soft rather than harsh, and never more than 3 bright flashes per second.

**E. Scale and zoom changes**
- A "pull back through the scales" or "dive in" is **one continuous camera move**, eased in **log-scale** (zoom factor = `exp(lerp(...))`) so apparent speed stays constant. Hide scene swaps (surface to orbit, room to map) behind a motion-blurred ramp, a cloud/haze pass, or an occluding element.
- Keep depth precision healthy: scale near/far with camera distance, use `logarithmicDepthBuffer` when scale ranges are huge, offset coplanar surfaces >= 0.002.
- If the range is too large for one depth range (many orders of magnitude), split it into layered scenes and swap them behind an occluder inside the move as match cuts. **Never** replace the move with a chain of 3-4 jump cuts, and never chop the spoken sentence across them.

**F. Continuity (character, set, looping)**
- **Character:** match scale, screen position, and pose family across a cut, or use a transition that hides the change. A character must not jump from small and side-on to huge and front-on in one cut. Prefer one continuous orbit/track when the same character stays the subject. One locked skin/material per character; skin tone shifts only through colored lighting (watch for accidentally emissive or unlit skin).
- **Set and cast:** scenes depicting the same place at different times keep identical set dressing, cast, positions, and counts unless the script changes them on screen. NPCs keep a fixed position with small idle motion unless the script moves them; no unmotivated sliding. Blend animation-state changes over several frames to avoid arm jerks.
- **Looping:** unless the script says otherwise, the last frame closely matches the first frame's framing and composition so a looped playback does not jump.

**G. Action matches captions and audio**
- Any action named in the voiceover ("you jump in", "he opens the door") is **shown on screen** for about 0.4-0.6 s before or as the scene changes. Never hard-cut from the setup straight to the aftermath.
- When a cut lands inside a phrase, the caption chunk changes on that exact cut frame. No caption text carries one frame into a different scene by accident.

**H. Interaction with geometry (falls, entries, exits)**
- Aim trajectories at the target (hole, door, basket) with gravity easing (accelerating down) and orient the subject naturally (upright, or an intentional tumble).
- Never let a subject clip through ground or walls. Use depth masks, stencil, clip planes, or occluding rim geometry so the subject goes behind the rim or into the opening convincingly.

**I. Diagram, cross-section, and infographic shots**
- Never near-static for more than ~2 s. Show the key motion as a visible **path or trail** (damped curve, orbit line, arrow), exaggerate amplitude when the real scale is tiny, and scale small actors up about 2-3x so they stay readable.
- Add **labeled markers** at key moments (time stamps, distances, stages) when the script cites numbers.
- Compose the diagram's focal content in the upper ~58% of the frame. Move the composition, not the captions.

**J. Subject readability in dark or fast shots**
- The hero subject has a rim light and a minimum brightness so it never reads as a black silhouette. Verify on the rendered frame, not in the editor.

**K. Rendering stability**
- Fixed light and shadow camera (no swimming); no z-fighting; mipmaps and anisotropy on textures; no integer snapping of positions; no LOD popping. **Objects never pop in or out:** they appear via scale or opacity easing over >= 6 frames.
- **Grass and thin geometry:** dense thin blades alias and shimmer. Use alpha-tested, mipmapped cards (or alpha-to-coverage), widen blades slightly with distance, fade tuft scale to zero over a long distance band (no popping), keep tip-sway amplitude low, and use sub-frame motion blur on fast travel shots through grass. Verify by stepping frames and with `check-motion.mjs`.

**L. Continuous motion and frame accuracy**
- Velocity-continuous paths through every segment join (`keyframes.ts`); ease every speed ramp; `interpolate` with `extrapolateLeft/Right: 'clamp'`. No snapping.
- No duplicated or dropped frames (ffprobe frame count, 3.6).

### 4.10 Automated motion QA (required)
Run `scripts/check-motion.mjs` on the draft render (final must be checked at full resolution). It uses ffmpeg:
`scale=216:384,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=motion.txt`
(write to a **relative** filename; a Windows drive-letter path breaks the filter syntax).

It computes per-frame mean absolute difference and per-frame mean luma, and flags:
- **Frozen runs:** >= 6 consecutive frames with difference < 0.35, and total near-duplicate frames > 2%. Also any run of 4+ near-duplicate frames that is not an intentional hold.
- **Spikes:** frames where change exceeds ~3x the rolling median, and runs of >= 3 consecutive frames with difference > 15 (list frame numbers). Each must be a planned transition from the shot list with a carry (4.9 C), or be fixed.
- **Periodic spikes** (a repeating cycle of high change, e.g., every ~12 frames): strobing. Fix per 4.9 B.
- **Brightness jumps:** any frame-to-frame mean-luma jump > 30 levels outside planned cuts (flash errors; fix per 4.9 D).
- **Static stretches:** very low change for more than ~2 s on diagram/cross-section shots (fix per 4.9 I).

Then:
- Make a contact sheet (`scripts/contact-sheet.mjs`, one frame per ~1.5 s) and look at it.
- Inspect frames **on both sides of every cut** by eye for scale, pose, skin-tone, and set-dressing continuity (4.9 F).
- Confirm the real bitrate with `ffprobe` (3.6).
- Paste the motion report summary into the delivery notes.

### 4.11 Optional game-UI overlay
Off by default. Only if the script asks for a "game footage" feel. Build an original `GameHud` kit piece (health pips, a small circular minimap with a heading arrow, clock and weather chips, a context-prompt strip), drawn in 2D over the canvas in palette tokens with soft outlines. Place it inside the safe zones of 8.2 and never overlap the caption block (the top corners suit health and minimap; skip the prompt strip if there is no room). Values are frame-driven data. No icons, fonts, or layouts copied from commercial games (IP rule, 4.1), and it must never reduce the hero's readability.

---

## 5. Principles (the quality bar)

1. **Clarity over complexity.** One idea per shot, understood in under a second.
2. **Lush, not busy, not crude.** Rich painterly detail in the focal zone and near foreground, calm open space elsewhere; silhouettes and the story still read instantly.
3. **Consistency.** Same palette logic, lighting rig, character proportions, and motion language every video. The channel looks like one world.
4. **Sync is sacred.** Visual beats land on voiceover beats. Captions match audio to the frame, and every spoken action is shown.
5. **Deterministic and reproducible.** Re-rendering gives an identical result.
6. **Readable on a phone.** Strong silhouettes, one clear focal point per frame, large captions.
7. **Calm, continuous pacing.** Let shots breathe; every change is motivated and bridged (4.9 C).
8. **Motion is clean.** No strobing, no jitter, no frozen frames, no unexplained pops in scale, pose, or color.
9. **Calm but alive.** There is always something subtly moving, and diagrams have visible, meaningful motion.
10. **Reuse over rebuild.** Kit first; new reusable pieces go back into the kit.
11. **Ship-ready.** The project runs and renders with the commands provided, with no placeholder errors.

---

## 6. Color palette

Define in `lib/palette.ts` and use only these tokens. Hex values are estimates from the reference screenshots; keep the relationships and tune by eye. A shot uses **one theme** (optionally plus the morning-haze modifier). Where a token covers a large surface, define a **tone ramp** (`light`, `base`, `shade`). `tint(color, seed, amount)` derives small deterministic variations; `ink(color)` derives the outline color (darker, slightly bluer, more saturated, never pure black).

**Themes**
| Token | Day (default) | Dusk | Night | Use |
|---|---|---|---|---|
| `skyTop` | `#4A9AE6` | `#4C5C9E` | `#0F1B40` | Sky zenith |
| `skyHorizon` | `#CFE8F7` | `#F4B98C` | `#2E4C80` | Sky at horizon |
| `fog` | `#C9E1F2` | `#D9A98F` | `#1F3560` | Haze, distant ranges |
| `grassLight` | `#A4D84A` | `#8AAE45` | `#3E7A5A` | Sunlit tips and slopes |
| `grass` | `#6DBE3C` | `#5E9A38` | `#2C5E48` | Ground base |
| `grassDark` | `#3F9A34` | `#3A7430` | `#1B3C34` | Hollows, blade bases |
| `shadowGrass` | `#1F6A52` | `#2A5A48` | `#112A2E` | Shade and bounce on grass |
| `shadowTint` | `#3E5A96` | `#4A4A88` | `#1A2450` | Shade on rock, stone, general |
| `foliage` | `#4A9A32` | `#3F7A2C` | `#1F4A3A` | Tree canopies |
| `foliageDark` | `#1F5A2A` | `#25502A` | `#12301F` | Canopy undersides, far groves |
| `keyLight` | `#FFF1D6` | `#FFB878` | `#A8C0FF` | Sun / moon key |
| `fillLight` | `#A6CCF5` | `#8A82B8` | `#3E58A0` | Hemisphere sky fill |
| `sunGlow` | `#FFF3C8` | `#FFD09A` | `#C8D8FF` | Sun sprite, bloom tint |
| `water` | `#5FB4C6` | `#6A9AB0` | `#2A5A8A` | Shallows |
| `waterDeep` | `#2F7FA8` | `#3A6088` | `#14305A` | Depths |

**Morning-haze modifier** (applies on top of Day): `fog #D3ECE4`, `skyHorizon #DCEFE8`, fog density x1.6-2, sun glow x1.5, warmer key, lower contrast.

**Land, rock, and structure**
| Token | Hex | Use |
|---|---|---|
| `cliff` / `cliffShade` / `cliffLight` | `#8C90A0` / `#5F6680` / `#B4B6BE` | Cliffs, mesas, spires |
| `mossCap` | `#6FAE4A` | Grassy and mossy rock tops |
| `rangeBlue` | `#6E86B0` | Base color of distant ridges before fog mixing |
| `ruinStone` / `ruinShade` | `#A8A292` / `#6E6A78` | Ruins, towers, standing stones |
| `pathDirt` / `pathDirtShade` | `#C98E52` / `#9C6A3C` | Dirt paths |
| `soil` | `#5A4330` | Banks, cut earth |
| `trunk` / `bark` | `#4A3322` / `#6A4A32` | Trunks, branches |
| `rimCool` | `#A9CCFF` | Rim and back light |
| `thatch` / `plaster` | `#D9B65C` / `#E8DFC8` | Village roofs and walls |
| `woodLight` / `woodDark` | `#B98A5A` / `#6E4B2F` | Wood, crates, fences |

**Sky and flora accents**
| Token | Hex | Use |
|---|---|---|
| `cloud` / `cloudShade` / `cloudWisp` | `#FBFAF2` / `#B8CDE6` / `#EAF3FA` | Cumulus top, cloud underside, cirrus |
| `flowerWhite` / `flowerYellow` | `#F6F3E8` / `#F5C934` | Wildflowers |
| `flowerBlue` / `flowerOrange` | `#5B8CE8` / `#F08A2E` | Wildflowers |
| `waterFoam` | `#EAF6F4` | Shoreline foam |

**Glows (emissive, also palette tokens)**
| Token | Hex | Use |
|---|---|---|
| `relicGlow` | `#49D6E0` | Ancient-tech and magic glow (cool) |
| `relicWarm` | `#FF9A3C` | Ancient-tech and magic glow (warm) |
| `windowGlow` / `lampGlow` | `#FFD98A` / `#FFC766` | Lit windows, lanterns, fire |
| `magma` / `core` | `#F08A2E` / `#FFD84A` | Lava, hot cores |

**Characters and creatures** (vary per character)
| Group | Tokens |
|---|---|
| Skin | `skinA #F2C29B`, `skinB #D9A074`, `skinC #B97B54`, `skinD #8A5535` |
| Outfit cloth | `blue #2F5BD0`, `navy #1F2F6B`, `white #E6E8EB`, `cream #E8DCB8`, `yellow #E6C21F`, `orange #E67E22`, `red #D2403A`, `teal #2FA39A`, `green #4C9A4A`, `purple #7B55C9` |
| Leather and gear | `leather #7A4B2A`, `leatherDark #4A2E1C`, `metal #8C93A0`, `pantsNavy #1B2340`, `pantsGray #3A3F55`, `pantsBrown #5B4A3A` |
| Hair | `hairDark #1A1412`, `hairBrown #6A3B22`, `hairBlond #D8B25A`, `hairGray #C9CCD2`, `hairRed #9C3A22` |
| Horse and animal coats | `coatBlack #2A2624`, `coatBay #8A4A24`, `coatChestnut #B5622A`, `coatCream #E6D6B0`, `coatWhite #EDE8DC`, `coatPatch #8A4B2A` |

**Optional legacy tokens** (town, tile, and special scenes; use sparingly, same rules apply): `backdropNavy #24213D`, `backdropDeep #191830`, `rock #9A9AA6`, `stone #8E8A82`, `bedrock #3A3340`, `brick #C4503A`, `brickShade #9E3A2C`, `trimStone #CDBF9B`, `awning #E6D27A`, `glass #6FB9CC`, `sand #E8B86A`, `snow #F1F7FA`, `ice #BFE6F5`, `iceDeep #7FC2E6`, `accentCoral #E8553A`, `accentTeal #36B3AB`, `accentOrange #F28A2E`, `accentMagenta #C2386B`, `strata1 #7A4B2E`, `strata2 #A0623A`, `strata3 #C4572B`, `blanketRed #C8202B`, `blanketWhite #F2EEE8`, `foodBrown #B07A3A`, `dark #2A1F22`, `hardhat #F2C230`, `hiVis #F26B21`.

**Captions:** `capText #FFFFFF`, `capHighlight #FFD83A`, `capStroke #000000`.

Palette rules:
- Per shot: **<= 3-4 harmonious dominant hues plus 1-2 accents**. Typical: greens, sky blues, blue-gray rock, plus warm path orange or a flower or cloth accent. The focal subject gets the most saturated accent.
- **Distance shifts color:** near is warm and saturated yellow-green, mid is fresh green, far is blue-gray through the fog mix (4.4).
- Warm key against cool fill in every theme. Shadows are tinted (`shadowGrass` on grass, `shadowTint` elsewhere), never neutral black; light sides lean warm, shade sides lean cool.
- Subject-to-background luminance contrast must stay clearly visible on a phone.
- Emissive colors are palette tokens too.
- Text always has enough contrast (stroke plus shadow).
- Do not add colors without adding them to `palette.ts` and listing them in the delivery notes.

---

## 7. Audio

### 7.1 Voiceover
- **AI-generated voice.** If I name a provider in the script prompt, use it. If not, default to a free or common TTS and tell me exactly how to generate the file (provider, voice, settings) so I can reproduce it. Prefer a TTS that returns **word-level timestamps** (e.g., ElevenLabs alignment, or an edge-tts library exposing word boundaries; verify the output and units), because it removes the Whisper step. If you cannot generate audio here, create `script.json` with the text split into beats and tell me where to drop `/public/audio/voiceover.wav` (or `.mp3` if that is what I supply).
- Voice default: clear, warm, medium pace, neutral accent, no robotic emphasis. Mention the voice you chose in your notes so it stays consistent across videos.
- Normalize loudness (about -16 LUFS final mix, peaks below -1 dBTP).
- **Order matters for caption sync:** generate the voice, trim leading/trailing silence (ffmpeg `silenceremove`), normalize, export WAV, and only THEN generate caption timings (8.4). Any later audio change means regenerating the timings.
- Pacing requested in the script prompt (e.g., "brisk, no long gaps") is applied at generation time and by trimming silence, never by speeding up the audio afterward unless timings are regenerated from the sped-up file.

### 7.2 Music / placeholder
- A placeholder track is acceptable. If none is supplied, use `/public/audio/music-placeholder.mp3` or wire the component so a track drops in without code changes. Never use copyrighted music.
- Music sits well under the voice (about -22 to -26 dB relative to VO). Fade in ~0.5 s, fade out ~1 s.

### 7.3 Implementation
- Use Remotion's audio component from the installed version, with `staticFile()`. Volume fades via `interpolate` on the frame.
- Total duration = voiceover length plus a short tail (~0.5-1 s).
- Optional sound effects only if supplied. Do not invent them.

---

## 8. Captions

### 8.1 Behavior
- **Word-by-word highlighted:** the full phrase is visible; the **currently spoken word** is highlighted (`capHighlight`, scale ~1.08-1.12x with a quick spring); the others are `capText`.
- **2-6 words per chunk** (2-4 for brisk narration), broken at natural phrase boundaries.
- Word timings come from **real timestamps of the exact audio file that gets rendered** (8.4). Estimated timings are not acceptable for delivery unless no audio exists yet (8.4, step 5).
- The text shown is the **script text**, not the speech-to-text transcript (8.4, step 3).
- Timings live in the video's `captions.json` (word, start ms, end ms, plus metadata). Captions read from data only.
- Use `@remotion/captions` (`createTikTokStyleCaptions` or equivalent) where it fits.

### 8.2 Layout and safe zones (vertical)
- Captions sit in the **lower-middle**, between ~60% and 75% of the height, centered, with >= ~80 px side margins.
- Avoid the bottom ~20% and the right ~12% (platform UI).
- **The caption block has one fixed position for the whole video.** Its y position never changes between chunks or shots.
- Compose the 3D action in the upper two-thirds, and keep the scene behind the captions calm. On diagram, cross-section, and infographic shots, the focal content stays in the upper ~58% (mandatory): move the composition, not the captions.

### 8.3 Typography and layout integrity
- Bold, rounded, highly legible sans-serif (Poppins ExtraBold or Montserrat ExtraBold via `@remotion/google-fonts`). Load fonts the Remotion way so renders are deterministic.
- ~64-84 px at 1080 wide. Uppercase optional but consistent across videos.
- Thick dark outline (`capStroke`, ~6-10 px via text stroke or layered shadow) plus a soft drop shadow. No background boxes by default.
- Chunks animate in with a short spring (pop or fade-up, ~4-6 frames) and out cleanly. No flicker between chunks.
- **Spacing and layout integrity (binding):**
  - Lay out the **entire chunk once**. Render each word as its own `inline-block` with an **explicit gap** (flex with `gap: 0.28em`, `{" "}`, or a fixed margin), never relying on whitespace between inline-blocks and never dropping the space when the highlight color changes. A previous render showed words fusing ("twelvekilometers") and the gap changing as the highlight moved.
  - Only **color** and a `transform` scale change per active word. Nothing about layout, font weight, letter spacing, or stroke width changes on highlight, and the chunk container is sized from the unscaled text so the line never shifts.
  - Fix the caption block's **height** for 2 lines and anchor it by a constant top (or bottom) y, so a one-line chunk and a two-line chunk occupy the same slot.
  - Measure with `@remotion/layout-utils` (`measureText`) where wrapping needs to be predicted, and cap line width so a chunk never wraps into a tall block that reaches over the action.
  - Keep the highlight style identical for every word (same color, same scale, same spring).

### 8.4 Timing pipeline (where most sync problems come from)
Captions drift when timings come from the wrong place. A basic TTS voice is **not** the problem: clean synthetic speech is easy to align. Remotion also does not generate the voice; it only plays the file it is given. The usual culprits are estimated timings, timings made from a different version of the audio, and leading silence or encoder padding.

Follow these steps **in order**:
1. **Lock the audio first.** Generate the voiceover, then do all processing (trim silence, normalize) BEFORE any alignment. Save as `/public/audio/voiceover.wav`. Prefer WAV (MP3 padding adds tens of ms). **Never align one file and render another.** If the audio changes, regenerate the timings.
2. **Get word-level timestamps from that exact file**, in this order:
   - a. The TTS provider's own word/character alignment (most accurate).
   - b. Whisper via `@remotion/install-whisper-cpp` with token-level timestamps, converted with `toCaptions`. Whisper needs 16 kHz mono WAV: make a temporary resampled copy for transcription only (ffmpeg `-ar 16000 -ac 1`) and render with the master. Use at least a `small` model (`small.en`/`medium.en` for English).
   - c. Forced alignment of the known script against the audio, if a tool is available.
   - Whisper word boundaries can be off by ~0.1 s, which is visible at brisk pace, so prefer (a).
3. **Display the script text, not the transcript.** Use speech-to-text for TIMING only: normalize both script and transcript (lowercase, strip punctuation, expand numbers to words), align them as sequences, copy timings onto the script words, interpolate timings for unmatched script words, and log every mismatch.
4. **Write `captions.json`** as `{ audioFile, audioDurationMs, timingSource, words: [{ text, startMs, endMs }] }` with `timingSource` of `"tts-alignment"`, `"whisper"`, or `"forced-alignment"`. Generate it with `scripts/make-captions.mjs` (runs on Windows; one command to re-run whenever the audio changes).
5. **Estimated timings are a last resort**, only when no audio exists yet. Mark `timingSource: "estimated"`, put a warning at the very top of the delivery notes, and do not call the captions synced.
6. **Close small gaps:** set each word's end to the next word's start when the gap is under ~200 ms, so the highlight never goes dark between words. Keep longer gaps (real pauses).

### 8.5 Render-time sync mechanics
- One helper in `lib/timing.ts`: `msToFrame(ms) = Math.round(ms / 1000 * fps)`. Use it everywhere; never hand-compute frames.
- Active word: `absoluteMs >= startMs && absoluteMs < endMs`, with `absoluteMs = frame / fps * 1000`. `useCurrentFrame()` is **local** inside a `<Sequence>`; add the Sequence's start frame back so you always compare against absolute audio time.
- The voiceover starts at frame 0 with no trim or offset, unless the caption data was generated with the same offset.
- One global `CAPTION_OFFSET_MS` (default 0) in `lib/timing.ts` shifts every caption (positive = later). It is for final calibration only. **Never fix sync by editing individual words.** If highlights feel late, try -40 to -80 ms; slightly early feels locked on, late reads as lag.
- The active-word pop is a spring of 6 frames or fewer. Never animate layout.

### 8.6 Chunking for fast narration
- 2-4 words per chunk for brisk voices (up to 6 for slow ones). Break at punctuation and phrase boundaries; never end a chunk on a weak word ("a", "the", "of", "to").
- A chunk stays visible from its first word's start until the next chunk begins (hold through short gaps), minimum ~350 ms. Merge chunks that would be shorter.
- With `createTikTokStyleCaptions`, start with `combineTokensWithinMilliseconds` ~800 and tune.
- Max 2 lines per chunk, ~18 characters per line at 64-84 px.

### 8.7 Sync verification (required before delivery)
1. **Judge sync on a rendered MP4**, not in Studio (Studio audio is not frame-accurate). A half-scale draft is fine.
2. **Debug mode:** a `debugCaptions` prop draws (outside the caption zone, top-left) the current ms, the active word index, and a tick on each word start.
3. **Sync report** (printed by `make-captions.mjs`, pasted into the delivery notes): word count, timing source, audio duration vs. last word end (within ~300 ms after trimming), words shorter than 60 ms or longer than 1.5 s (investigate each), script words with no transcript match, displayed script words in order equal to script word count, and the `CAPTION_OFFSET_MS` used.
4. **Calibration** on the first ~5 s:
   - Consistently early or late by a fixed amount: adjust `CAPTION_OFFSET_MS` once.
   - Error GROWS over the video: audio and timestamps come from different files or sample rates. Regenerate from 8.4 step 1.
   - Error varies randomly word to word: alignment quality. Use TTS alignment or a larger Whisper model.
5. **Text integrity test:** confirm the rendered caption text, joined chunk by chunk, equals the script text with correct spaces between every word. Spot-check stills where the highlight changes and where chunks switch, and confirm the caption block never moves vertically.
6. Report the timing source, the offset, and the sync report in the delivery notes.

---

## 9. Standard operating procedure

When I send this file plus a script, do the following **in order**.

**Step 0: Preflight.** Check for `/src/kit` (3.5). Confirm node, ffmpeg, and ffprobe work. Note anything missing once and continue.

**Step 1: Parse the script.** Break it into beats (one idea per beat) with approximate durations. Identify characters, props, locations, tone, and the motion risks of 4.9 (huge scale changes, fast repeating patterns, falls, diagram shots).

**Step 2: Produce a short plan before building** (keep it compact):
- **Shot list:** for each shot, the subject, camera move, theme, characters/props, and the voiceover line it covers.
- **Cut list:** for every cut or scene change, the carry type (shared motion direction, match cut, L-cut, dissolve length, whip/push-through, foreground-occluder wipe) and what is matched (scale, screen position, pose). Mark scale-change moves and how each is handled (4.9 E).
- **Action check:** each action the voiceover names and the shot beat that shows it.
- **Fast-motion shots:** how each avoids strobing (spacing/speed numbers, streaks, motion-blur samples).
- **Look setup:** theme (Day, Dusk, Night) plus haze modifier if any, sun direction, wind direction, the landmark for each wide shot, horizon height per shot, and which subjects get outlines.
- **Kit inventory:** what already exists, what you will add. **Assets** needed (and which fall back to primitives).
- Assumptions and decisions on anything the script left open.
- Any genuinely blocking question. Ask only if you truly cannot proceed; otherwise decide and flag it.

**Step 3: Build, in this order:**
1. Audio and caption timing first (7.1, 8.4); read the sync report before building visuals that depend on timing.
2. Kit additions (reusable pieces go in `/src/kit`): `palette.ts` (themes, tone ramps, `tint()`), characters, props, architecture, world, lighting rig, camera rig, transitions, captions, audio.
3. **Tier 1 scenes** (must-haves; if the script has no tiers, the core story beats), then a **draft render** and QA (Step 4). Only then add Tier 2/3 extras, keeping each tier shippable.
4. Final render.
Drive every animation from the frame (3.2). If you have file tools, write real files; otherwise output each file in a separate, clearly labeled code block with its full path. No "rest of code here".

**Step 4: Test render, QA, and self-review:**
- Run the checklist (Section 10).
- Run `check-motion.mjs` (4.10), `check-determinism.mjs`, the sync verification (8.7), and the ffprobe verification (3.6). Fix failures first.
- Render stills at the midpoint of every shot and at every transition, and look at them (composition, caption spacing, lighting, empty areas, continuity on both sides of each cut).

**Step 5: Deliver:**
- Short summary: what was built, duration in seconds and frames, draft seconds-per-frame.
- Exact commands (Windows-safe): install, preview, draft render, final render.
- The sync report, the motion report, and the verified bitrate.
- Assumptions, estimated timings, placeholders, new colors, new kit pieces, `ASSETS.md` additions, and required CC-BY attributions.
- How to drop in audio or replace placeholders.

**Step 6: Propose spec updates** (Section 11). Always.

If I later send feedback on a render, treat each point as a bug or improvement, fix it, then run the self-improvement protocol on anything that generalizes.

---

## 10. Pre-delivery checklist

Fix every failure before delivering.

**Technical**
- [ ] 1080x1920 @ 30 fps; duration computed from audio; ffprobe shows `yuv420p`, the expected frame count, and a real bitrate that is reported (10-15 Mbps expected on detailed scenes).
- [ ] No `useFrame`, `Math.random`, `Date.now`, timers, TAA, history-buffer effects, or other non-deterministic code in anything visible; every helper used passed `check-determinism.mjs`.
- [ ] All `@remotion/*` packages share one pinned version; Chromium GL set to `angle`.
- [ ] External assets are shipped in `/public`, logged in `ASSETS.md`, CC0 or CC-BY only; fonts load the Remotion way; frame 0 renders fully loaded.
- [ ] Shadow camera bounds, fog, light intensities, and post-effect strengths are set (no blown-out or pitch-black frames).
- [ ] Runs in `npx remotion studio` and renders with the provided commands without errors.

**Visual**
- [ ] Matches the "Painterly Open-World" target (4.1) and the reference screenshots: soft cel shading, soft outlines on characters only, living wind-swept grass, aerial-perspective ridge layers, painterly sky with gentle bloom. No photoreal PBR, no chrome, no hard-black shadows or pure-black outlines, no bare flat ground.
- [ ] **No game IP:** every character, creature, landmark, symbol, UI element, and font is original; nothing extracted or closely recreated from a commercial game.
- [ ] Every wide shot has a readable landmark; horizon sits at ~30-40% from the top; 4-5 ridge layers get lighter and bluer with distance; fog matches the sky horizon.
- [ ] Grass, flowers, trees, cloth, hair, manes, clouds, and particles all read from the single wind field; wind waves are visible across fields; stepping frames shows no grass shimmer or popping.
- [ ] Warm sun, soft tinted shadows (teal-green on grass, blue-violet on rock), rim light on characters, contact shadows, local glows where present; blacks lifted to >= ~10-12% luminance.
- [ ] All colors come from `palette.ts` (including emissive, `tint()` and `ink()` results); one theme per shot.
- [ ] Characters and creatures use `ToonMaterial`, a soft outline, stylized eyes (unless the script says blank), pivot groups, swaying cloth, hair and manes, are never dark silhouettes, and show anticipation, follow-through, and secondary motion.
- [ ] Every shot has foreground (grass, flowers, rock), midground subject, and background layers, a clear focal point, intentional camera motion, and calm low-contrast ground behind the caption zone.

**Motion**
- [ ] `check-motion.mjs` passed: no frozen runs, near-duplicate frames <= 2%, every flagged spike is a planned transition, no periodic spikes, no unexplained brightness jumps.
- [ ] No strobing: repeating-pattern travel per frame under 25% of spacing; streaks consistent; fast shots use sub-frame motion blur or soft streaks.
- [ ] Every cut carries motion, a match, an L-cut, a dissolve, a whip, or a foreground-occluder wipe; no hold-then-flash or white-wash transitions; at most one shot change per ~2 s.
- [ ] No single-frame flashes; any flash is an eased envelope of at least 4 frames, at most 3 per second.
- [ ] Every action named in the voiceover is shown before or at the scene change; captions change on cut frames.
- [ ] Scale changes are one continuous log-scale move (or layered match-cut swaps hidden behind an occluder), never chained jump cuts.
- [ ] Characters keep scale, pose family, material, and skin tone across cuts; set dressing and cast stay consistent across scenes of the same place; first and last frames match for looping unless the script says otherwise.
- [ ] No clipping through geometry; falls and entries are aimed, eased, and masked at rims.
- [ ] No shadow swimming, z-fighting, popping objects, or edge crawl when stepping frames.
- [ ] Diagram shots have visible paths/trails/markers and stay above the caption zone.
- [ ] Camera paths are velocity-continuous and the camera is never fully still.

**Audio and captions**
- [ ] Voiceover and music present or wired for drop-in; music well below the voice.
- [ ] `captions.json` was generated from the exact `voiceover.wav` that is rendered (same file, after trimming and normalizing).
- [ ] Caption text matches the script text with correct spaces between every word; no fused or reflowing words on stills; every script word displayed in order.
- [ ] Caption block has a fixed position and fixed 2-line height and never moves or reflows when highlights change.
- [ ] Sync was checked on a rendered MP4; the sync report and `CAPTION_OFFSET_MS` are in the delivery notes.
- [ ] Highlight never goes dark between words; no chunk under ~350 ms; captions stay in the safe zones with a strong outline.
- [ ] Estimated timings are not used, or are flagged at the top of the notes.

**Process**
- [ ] Plan included a shot list, a cut list with carry types, and an action check.
- [ ] Assumptions, placeholders, new colors, and new kit pieces are listed.
- [ ] Exact commands provided; spec-update proposals included.

---

## 11. Self-improvement protocol

This file gets better over time. A fresh chat cannot edit my copy, so:

1. **At the end of every video task**, after delivering, add a section titled **`Proposed spec updates`**.
2. Each proposal is a **single line**, pasteable into Section 12:
   `- [YYYY-MM-DD] [Tag] Rule, written as an instruction. (Why: one short reason.)`
   Tags: `Style`, `Tech`, `Audio`, `Caption`, `Camera`, `Process`, `Palette`, `Motion`, `Smoothness`, `Assets`.
3. Proposals must be **general and reusable**. Never include anything specific to one video's story, characters' names, or script content.
4. Propose updates when you notice: a bug you had to work around, a technique that clearly worked better, an ambiguity or contradiction in this spec, a recurring correction from me, a missing default you had to invent, or a **reusable component worth adding to the starter kit**.
5. If nothing generalizable came up, say "No spec updates this time." Do not pad.
6. Flag **conflicts or outdated rules** in the spec (e.g., a library API changed) and propose corrected wording.
7. If Section 12 has grown past ~25 entries, propose a **consolidation**: a merged rewrite to replace Section 12, folding rules into the main sections where appropriate. Bump the spec version in the proposal.
8. I decide what gets added. Only entries actually in Section 12 are binding. Do not treat your own proposals as rules until I include them.

---

## 12. Learnings

Binding rules added over time. Newest knowledge. Overrides older sections on conflict.

<!-- Paste approved entries below, newest at the bottom. Format:
- [YYYY-MM-DD] [Tag] Rule. (Why: reason.)
-->

- [2026-11-05] [Style] The target look is the painterly open-world described in 4.1 (soft cel shading, wind-swept grass, layered atmospheric ranges, painterly sky, bloom). Where any older wording says "simple", "bare box", "sparse", "toy-like", "low-poly", "faceted", "diorama", or "dot eyes by default", the painterly open-world look wins. (Why: the reference screenshots show a stylized open-world landscape, not floating miniature tiles; this entry supersedes the 2026-10-29 refined-low-poly-miniature rule.)
- [2026-10-29] [Motion] Keep per-frame travel of any repeating pattern under 25% of its spacing, scroll it on one continuous phase, and use long soft streaks plus sub-frame motion blur for extreme speed. (Why: a fast tunnel fall strobed with a wagon-wheel effect and read as jitter.)
- [2026-10-29] [Motion] Show every action the voiceover names on screen for about 0.4-0.6 s before the scene changes, and change the caption on the exact cut frame. (Why: "you jump in" was spoken and captioned but the jump was never shown.)
- [2026-10-29] [Motion] Implement scale changes (room to planet, dive in, pull back) as one continuous log-scale camera move, or as layered match-cut swaps hidden behind an occluder when depth range forbids it, never as a chain of jump cuts. (Why: a zoom-out was three hard cuts and chopped the sentence being spoken.)
- [2026-10-29] [Motion] Never use a bare hard cut, a white-flash/wash transition, or a hold-then-flash: carry motion across, use a match cut, an L-cut, a 3-6 frame dissolve, a whip, or one clean 8-12 frame crossfade. Any intentional flash is an eased envelope of at least 4 frames. (Why: near-duplicate holds, one-frame white flashes and abrupt cuts read as render errors.)
- [2026-10-29] [Motion] Keep each character's scale, pose family, and material continuous across cuts, with one locked skin material tinted only by lights, and always add secondary motion. (Why: the character popped in size, pose and skin tone, and drifted as a rigid sprite.)
- [2026-10-29] [Motion] Aim falls and entries at the target with gravity easing and mask them at rims (depth mask or clip plane) so subjects never clip through ground. (Why: the character landed flat and sank through the ground as a black silhouette.)
- [2026-10-29] [Motion] Keep diagram and cross-section shots alive with visible paths or trails, 2-3x larger actors, and labeled time markers, composed in the upper ~58% above the caption zone. (Why: a static planet shot with tiny figures and captions over its center communicated nothing for seven seconds.)
- [2026-10-29] [Caption] Render each caption word as its own inline-block with an explicit gap, change only color and transform on highlight, and anchor the caption block at a fixed position and 2-line height. (Why: spaces disappeared on highlight color changes and lines shifted as words were added.)
- [2026-10-29] [Tech] Render finals at CRF 16 (or 10-15 Mbps) and verify the real bitrate with ffprobe. (Why: about 3.5 Mbps made fine lines and high-contrast motion shimmer and macroblock.)
- [2026-10-29] [Process] Run scripts/check-motion.mjs on every test render and inspect frames on both sides of every cut before delivery. (Why: strobing, duplicate-frame holds and flash glitches were only found by frame-difference analysis after rendering.)
- [2026-10-29] [Process] Keep set dressing and cast identical across scenes of the same place, and match the last frame to the first for looping unless the script says otherwise. (Why: the dig site and cast changed between scenes and the end frame did not match the start.)
- [2026-10-30] [Tech] Verify the output pixel format with ffprobe and force `--pixel-format=yuv420p`. (Why: a render came out `yuvj420p` and some players showed shifted contrast.)
- [2026-10-30] [Smoothness] Never leave frozen frames: every shot moves in camera and/or subject for its full length, and the motion QA script must show no run of 6+ frozen frames. (Why: about 14% of frames in a delivered render were frozen.)

---

## 13. Defaults at a glance

- 1080x1920, 30 fps, H.264 `yuv420p`, CRF 16 final (verify real bitrate, ~10-15 Mbps expected), AAC ~192 kbps, Chromium GL `angle`
- Three.js via `@remotion/three`; everything frame-driven and deterministic; every helper must pass the determinism check
- Reuse `/src/kit` first; glTF assets only from CC0/CC-BY sources with primitive fallbacks; log everything in `ASSETS.md`
- **Painterly open-world:** soft 3-band toon shading (`ToonMaterial`), painted vertex colors, wind-animated instanced grass and wildflowers, rolling terrain, clumpy trees, stratified rock, 4-5 aerial-perspective ridge layers, painterly sky with cumulus and cirrus, cloud shadows, a landmark on every wide shot, soft outlines on characters only, sun bloom; original IP only
- Warm sun + cool sky fill + green ground bounce + soft low-contrast tinted shadows + rim light + fixed shadow map and blob contact shadows + fake AO + local emissive glows; ACES tone mapping; soft bloom and a stateless color grade; no tilt-shift
- Day theme by default (Dusk and Night available, plus a morning-haze modifier); 3-4 hues + 1-2 accents per shot; tone ramps, `tint()` and `ink()`
- Characters: heroic proportions (chibi only on request), layered clothing, stylized eyes, soft outline, pivot groups, locked materials, swaying cloth and hair, anticipation, follow-through, secondary motion, moving holds; creatures with painted coats and phase-driven gaits
- Camera: keyframe tracks (velocity-continuous), never fully still, slow and motivated, follow cams with damped lag, horizon at ~30-40% from the top, subject in the upper two-thirds, calm grass behind the caption zone
- Smoothness: no frozen frames, no bare hard cuts, no flash/wash transitions, no strobing (travel under 25% of spacing), sub-frame motion blur on fast shots, scale changes as one log-scale move, every spoken action shown, diagram shots stay in motion above the caption zone
- Captions: word-by-word highlight, lower-middle, fixed position and 2-line height, explicit word gaps, no reflow, thick outline, safe zones; timings from the exact rendered WAV (TTS alignment, else Whisper); script text on screen; sync verified on a rendered MP4
- Motion QA script run on the render; ffprobe verification; stills at every shot midpoint and transition
- AI voiceover (prefer TTS with word timestamps) + placeholder music well under the voice
- Plan (shot list, cut list, action check) first; audio and captions first; Tier 1 draft before extras; self-review with checklist; deliver with commands; propose spec updates