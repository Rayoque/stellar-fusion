// src/game/autoplayer.ts
// Dev-only auto-player. Asks the chosen bot (src/game/bots.ts) for its favourite
// moves and returns one as { fromFaceId, targetFaceId, dragWorld }; the driver
// commits it via the normal startDrag/endDrag store actions.
//
// Among the bot's equally good moves it prefers ones already facing the camera,
// so play stays on screen. That tie-break never changes the bot's strategy: a
// better move on the back still wins, and the driver orbits the camera to it.

import type { BotId, GameState, Vec3 } from './types';
import { topMoves } from './bots';
import { normalize, dot } from '../utils/math';
import { cameraState } from '../three/cameraState';

export interface AutoMove {
  fromFaceId: number;
  targetFaceId: number;
  dragWorld: Vec3;
}

// Cosine of the angle between a face's outward direction (its center, since the
// sphere is centered at the origin) and the camera direction. > 0 is the near
// hemisphere; ~1 is dead-center front.
export function frontDot(center: Vec3): number {
  return dot(normalize(center), normalize(cameraState.pos));
}

// "Visible" trims limb faces that are edge-on and barely readable.
export function isFaceVisible(center: Vec3): boolean {
  return frontDot(center) > 0.2;
}

export function pickAutoMove(state: GameState, bot: BotId, preferInView = true): AutoMove | null {
  const top = topMoves(state, bot);
  if (top.length === 0) return null; // jammed: nothing to do

  let pool = top;
  if (preferInView) {
    const weight = (m: typeof top[number]) =>
      (isFaceVisible(state.faces[m.fromFaceId].center) ? 2 : 0) +
      (isFaceVisible(state.faces[m.slide.path[m.slide.path.length - 1]].center) ? 1 : 0);
    const bestView = Math.max(...top.map(weight));
    pool = top.filter(m => weight(m) === bestView);
  }

  const move = pool[Math.floor(Math.random() * pool.length)];
  return {
    fromFaceId: move.fromFaceId,
    targetFaceId: move.slide.path[move.slide.path.length - 1],
    dragWorld: move.dragWorld,
  };
}
