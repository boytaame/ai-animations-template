import {useMemo} from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {springs} from '../lib/easing';
import {captions as capTokens, materials} from '../lib/palette';
import {CAPTION_OFFSET_MS, absoluteMs, msToFrame, type WordSpan} from '../lib/timing';
import {chunkAt, chunkWords, type CaptionChunk} from './chunker';
import {CAPTION_FONT_STACK, useCaptionFont} from './fonts';

/**
 * Word-by-word captions (spec 8.1-8.3, 8.5).
 *
 * Layout integrity, in order of importance:
 *  1. Every word is its own inline-block; the gap is an explicit flex `gap`,
 *     never a text space, so nothing fuses and nothing reflows.
 *  2. Highlighting changes ONLY colour and a transform scale. Layout, font,
 *     letter spacing and stroke are identical in both states, so the line
 *     cannot shift as the highlight moves.
 *  3. The block is absolutely positioned with a fixed 2-line height and a fixed
 *     top, so one-line and two-line chunks occupy the same slot, chunk to chunk.
 *  4. The chunk is laid out once from its unscaled text; the scale is a
 *     transform, so it never feeds back into layout.
 */

export type CaptionsProps = {
  words: WordSpan[];
  /** 0-100 style diagnostics outside the caption zone (spec 8.7). */
  debugCaptions?: boolean;
  /** Calibration shift for the whole video; never edit individual words. */
  offsetMs?: number;
  fontSize?: number;
  /** Top of the fixed caption slot, in px from the top of the frame. */
  topPx?: number;
  /** Width of the caption column (safe margins are 80 px each side). */
  maxWidthPx?: number;
  align?: 'center';
};

const SAFE_MARGIN = 80;

export const Captions = ({
  words,
  debugCaptions = false,
  offsetMs = CAPTION_OFFSET_MS,
  fontSize = 76,
  topPx,
  maxWidthPx,
  align = 'center',
}: CaptionsProps) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  useCaptionFont();

  const chunks: CaptionChunk[] = useMemo(() => chunkWords(words), [words]);
  const nowMs = absoluteMs(frame, fps, {offsetMs});
  const activeChunkIndex = chunkAt(chunks, nowMs);
  const chunk = activeChunkIndex >= 0 ? chunks[activeChunkIndex] : null;

  const top = topPx ?? Math.round(height * 0.615);
  const columnWidth = maxWidthPx ?? width - SAFE_MARGIN * 2;
  const lineHeight = Math.round(fontSize * 1.16);
  const blockHeight = lineHeight * 2 + 12;

  // Chunk entrance: opacity + a scale pop on an inner wrapper. The block itself
  // never moves, and the slot height is fixed, so chunks cannot jump.
  const chunkStartFrame = chunk ? msToFrame(chunk.startMs, fps) : 0;
  const entrance = chunk
    ? spring({
        frame: frame - chunkStartFrame,
        fps,
        config: springs.pop,
        durationInFrames: 6,
      })
    : 0;

  let activeWordIndex = -1;
  if (chunk) {
    for (let i = 0; i < chunk.words.length; i++) {
      const w = chunk.words[i];
      if (nowMs >= w.startMs && nowMs < w.endMs) {
        activeWordIndex = i;
      }
    }
    if (activeWordIndex === -1) {
      // Between words: hold the previous one lit rather than going dark.
      for (let i = 0; i < chunk.words.length; i++) {
        if (chunk.words[i].startMs <= nowMs) {
          activeWordIndex = i;
        }
      }
    }
  }

  const activeStartFrame =
    chunk && activeWordIndex >= 0 ? msToFrame(chunk.words[activeWordIndex].startMs, fps) : 0;
  const pop = spring({
    frame: frame - activeStartFrame,
    fps,
    config: springs.pop,
    durationInFrames: 6,
  });

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top,
          left: (width - columnWidth) / 2,
          width: columnWidth,
          height: blockHeight,
          display: 'flex',
          justifyContent: align === 'center' ? 'center' : 'flex-start',
          alignItems: 'flex-start',
          opacity: chunk ? Math.min(1, entrance * 1.4) : 0,
        }}
      >
        {chunk ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'flex-start',
              columnGap: '0.28em',
              rowGap: '0.02em',
              maxWidth: columnWidth,
              // Scale pop from the centre; nothing in the flow changes.
              transform: `scale(${0.94 + 0.06 * entrance})`,
              transformOrigin: 'center top',
              fontFamily: CAPTION_FONT_STACK,
              fontSize,
              lineHeight: `${lineHeight}px`,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.005em',
            }}
          >
            {chunk.words.map((word, i) => {
              const isActive = i === activeWordIndex;
              return (
                <span
                  key={`${word.startMs}-${i}`}
                  style={{
                    display: 'inline-block',
                    whiteSpace: 'nowrap',
                    color: isActive ? capTokens.highlight : capTokens.text,
                    WebkitTextStroke: `0.09em ${capTokens.stroke}`,
                    paintOrder: 'stroke fill',
                    textShadow: `0 6px 0 ${capTokens.shadow}66`,
                    transform: isActive ? `scale(${1 + 0.1 * pop})` : 'scale(1)',
                    transformOrigin: 'center bottom',
                    willChange: 'transform',
                  }}
                >
                  {word.text}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      {debugCaptions ? <CaptionDebug frame={frame} ms={nowMs} chunk={chunk} index={activeChunkIndex} /> : null}
    </AbsoluteFill>
  );
};

const CaptionDebug = ({
  frame,
  ms,
  chunk,
  index,
}: {
  frame: number;
  ms: number;
  chunk: CaptionChunk | null;
  index: number;
}) => (
  <div
    style={{
      position: 'absolute',
      top: 40,
      left: 40,
      padding: 16,
      fontFamily: 'monospace',
      fontSize: 22,
      color: materials.paper,
      background: `${capTokens.stroke}aa`,
      borderRadius: 8,
      maxWidth: 620,
    }}
  >
    <div>{`frame ${frame} · ${ms.toFixed(0)} ms`}</div>
    <div>{`chunk ${index} · words ${chunk?.words.length ?? 0}`}</div>
    {chunk ? (
      <div style={{display: 'flex', gap: '0.4em', marginTop: 8, flexWrap: 'wrap'}}>
        {chunk.words.map((w, i) => (
          <span key={i} style={{opacity: ms >= w.startMs ? 1 : 0.35}}>
            {ms >= w.startMs && ms < w.endMs ? '▮' : '·'}
            {w.text}
          </span>
        ))}
      </div>
    ) : null}
  </div>
);
