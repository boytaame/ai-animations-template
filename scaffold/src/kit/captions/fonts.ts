import {continueRender, delayRender, staticFile} from 'remotion';
import {useEffect, useState} from 'react';

/**
 * Caption font (spec 8.3): Poppins ExtraBold, self-hosted in /public/fonts so a
 * render never depends on the network.
 *
 * The face is registered with FontFace + delayRender so no frame is captured
 * before the font is ready (spec 3.2). `@remotion/google-fonts` is installed as
 * an alternative — swap `loadFont('Poppins', ...)` in captions/FontLoader if you
 * prefer the CDN route; it needs internet on the first render.
 */

export const CAPTION_FONT_FAMILY = 'KitPoppins';
export const CAPTION_FONT_FILE = 'fonts/Poppins-ExtraBold-latin.woff2';

let registered = false;

/** Registers the font once per tab and holds the frame until it is usable. */
export const useCaptionFont = (): boolean => {
  const [ready, setReady] = useState(registered);
  const [handle] = useState(() => (registered ? null : delayRender('caption-font')));

  useEffect(() => {
    if (registered) {
      setReady(true);
      return;
    }
    let cancelled = false;
    const face = new FontFace(CAPTION_FONT_FAMILY, `url(${staticFile(CAPTION_FONT_FILE)})`, {
      weight: '800',
      style: 'normal',
    });
    face
      .load()
      .then((loaded) => {
        if (!cancelled) {
          document.fonts.add(loaded);
          registered = true;
          setReady(true);
        }
        if (handle !== null) {
          continueRender(handle);
        }
      })
      .catch(() => {
        // A missing font must not freeze the render; fall back to a system stack.
        if (handle !== null) {
          continueRender(handle);
        }
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  return ready;
};

/** Font stack used by every caption element. */
export const CAPTION_FONT_STACK = `"${CAPTION_FONT_FAMILY}", "Arial Black", sans-serif`;
