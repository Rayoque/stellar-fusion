// src/game/AutoPlayerDriver.tsx
// Headless driver for the dev-only auto-player. While state.autoPlay is true it
// makes one move every MOVE_INTERVAL ms via the same startDrag/endDrag path a
// human uses, so the user can still grab and drag tiles at any time.

import { useEffect, useRef } from 'react';
import { useGameStore } from './state';
import { pickAutoMove, frontDot } from './autoplayer';

const MOVE_INTERVAL = 500;   // ms idle between committed auto moves (at 1× speed)
const GRAB_DWELL = 380;      // ms to show the grab + target indicator (at 1× speed)
const CENTERED_DOT = 0.5;    // bring a fetched face at least this far to the front
const ROTATE_TIMEOUT = 1800; // ms cap on the orbit-into-view spin

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Pace scales inversely with the speed multiplier; floors keep the grab readable
// and avoid a busy-loop at the fast end.
const dwellFor = (speed: number) => Math.max(120, GRAB_DWELL / speed);
const intervalFor = (speed: number) => Math.max(80, MOVE_INTERVAL / speed);

export function AutoPlayerDriver() {
  const autoPlay = useGameStore(s => s.autoPlay);
  const cancelled = useRef(false);

  useEffect(() => {
    if (!autoPlay) return;
    cancelled.current = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (cancelled.current) return;
      const s = useGameStore.getState();

      // Stand down while anything is mid-flight or the run is over; the human may
      // also be dragging right now. We just skip this tick and re-check later.
      const busy =
        s.isAnimating || s.isPaused || s.endState ||
        s.levelObjectiveMet || s.levelFailed || s.showFe56Splash ||
        s.tiles.size === 0;

      if (!busy) {
        const move = pickAutoMove(s);
        if (move) {
          // If the piece it wants is on the back, orbit the sphere to bring it to
          // the front before grabbing it.
          const srcCenter = s.faces[move.fromFaceId]?.center;
          if (srcCenter && frontDot(srcCenter) < CENTERED_DOT) {
            s.setAutoRotateTarget(move.fromFaceId);
            const deadline = Date.now() + ROTATE_TIMEOUT;
            while (!cancelled.current && Date.now() < deadline) {
              const c = useGameStore.getState().faces[move.fromFaceId]?.center;
              if (!c || frontDot(c) >= CENTERED_DOT) break;
              await sleep(60);
            }
            s.setAutoRotateTarget(null);
          }

          if (cancelled.current) return;

          // Grab the tile (morphs to a blob) and highlight where it's headed, the
          // same visual feedback a human swipe produces, then dwell so it's visible.
          s.startDrag(move.fromFaceId);
          s.setDragTargetId(move.targetFaceId);
          await sleep(dwellFor(useGameStore.getState().autoPlaySpeed));

          if (!cancelled.current && useGameStore.getState().selectedFaceId === move.fromFaceId) {
            await s.endDrag(move.fromFaceId, move.dragWorld); // awaits the slide
          }
          s.setDragTargetId(null);
        }
        // No move => board jammed; idle until the run resets.
      }

      if (!cancelled.current) timer = setTimeout(tick, intervalFor(useGameStore.getState().autoPlaySpeed));
    };

    timer = setTimeout(tick, intervalFor(useGameStore.getState().autoPlaySpeed));
    return () => {
      cancelled.current = true;
      clearTimeout(timer);
    };
  }, [autoPlay]);

  return null;
}
