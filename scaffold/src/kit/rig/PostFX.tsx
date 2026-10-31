import {EffectComposer, SSAO, Vignette} from '@react-three/postprocessing';

/**
 * Post-processing (spec 4.6).
 *
 * DEFAULT OFF — deliberately. Screen-space AO and any composer pass must pass
 * `npm run check:determinism` before they are used in a delivered video
 * (spec 3.2). They are stateless per frame in principle, but the composer
 * allocates render targets and writes depth/normal passes whose sampling can
 * differ between renders in some GPU/driver combinations.
 *
 * Gate:
 *   1. Set POSTFX_ENABLED to true (or pass enabled on a single scene).
 *   2. `npm run check:determinism` — frame N must be byte-identical after N→M→N.
 *   3. Only then keep it on, and only AO + vignette (<= 0.25) + optionally a
 *      soft bloom on emissives. Chromatic aberration, lens flare, grain, TAA
 *      and anything history-based are banned outright.
 *
 * Status in this kit: NOT verified, so it stays off. Fake AO (vertex-colour
 * darkening plus blob shadows) is what the kit actually uses.
 */
export const POSTFX_ENABLED = false;

export type PostFXProps = {
  enabled?: boolean;
  /** AO strength, kept subtle so shadows stay tinted rather than black. */
  aoIntensity?: number;
  vignette?: number;
};

export const PostFX = ({enabled = POSTFX_ENABLED, aoIntensity = 1.6, vignette = 0.2}: PostFXProps) => {
  if (!enabled) {
    return null;
  }
  return (
    <EffectComposer enableNormalPass multisampling={0}>
      <SSAO intensity={aoIntensity} radius={0.08} luminanceInfluence={0.5} color="black" />
      <Vignette eskil={false} offset={0.28} darkness={vignette} />
    </EffectComposer>
  );
};
