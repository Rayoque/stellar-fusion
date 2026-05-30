// src/game/autoplayer.ts
// Dev-only auto-player. Picks a move the same way a human swipe resolves:
// for each movable tile it tries sliding toward each neighbor, simulates the
// slide (executeSlide is pure — it only reads state), scores the outcome, and
// returns the chosen { fromFaceId, targetFaceId, dragWorld }. The driver commits
// it via the normal startDrag/endDrag store actions.
//
// Moves whose source/landing are currently on the front hemisphere score higher,
// so the player prefers in-view moves. But a clearly better move on the back is
// still allowed — the driver will orbit the camera to bring it into view first.

import type { GameState, Vec3 } from './types';
import { ELEMENTS } from './elements';
import { executeSlide } from '../geometry/slide';
import { subtract, normalize, dot } from '../utils/math';
import { cameraState } from '../three/cameraState';

export interface AutoMove {
  fromFaceId: number;
  targetFaceId: number;
  dragWorld: Vec3;
  score: number;
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

export function pickAutoMove(state: GameState): AutoMove | null {
  const candidates: AutoMove[] = [];

  for (const [faceId, tile] of state.tiles) {
    const el = ELEMENTS[tile.element];
    if (!el || el.slideDistance <= 0) continue; // immovable (e.g. Fe / Fe56)
    const face = state.faces[faceId];
    if (!face) continue;
    const sourceVisible = isFaceVisible(face.center);

    for (const nId of face.neighbors) {
      const nFace = state.faces[nId];
      if (!nFace) continue;

      // World-space drag straight at the neighbor center; resolveSlideTarget
      // projects it onto the tangent plane and picks this neighbor. This is
      // camera-independent, so the move stays valid after any rotation.
      const dragWorld = normalize(subtract(nFace.center, face.center));
      const result = executeSlide(faceId, dragWorld, state);
      const moved = result.path.length > 1;
      const isMerge = result.stoppedReason === 'merge';
      if (!moved && !isMerge) continue; // blocked / no-op

      const landed = result.path[result.path.length - 1];
      const landedVisible = isFaceVisible(state.faces[landed].center);

      let score: number;
      if (isMerge) {
        // Prefer fusing; weight by source heaviness so it climbs the chain.
        score = 1000 + el.atomicNumber * 10;
      } else if (tile.element === 'H' && state.faces[landed]?.shape === 'pentagon') {
        // Hydrogen landing on an empty pentagon self-fuses (nucleation).
        score = 800;
      } else {
        // Plain reposition — low priority, keeps the board flowing.
        score = 10 + Math.random() * 5;
      }

      // Favor in-view moves so it doesn't spin the sphere unless a back move is
      // genuinely better (e.g. a merge when the front only offers shuffles).
      if (sourceVisible) score += 600;
      if (landedVisible) score += 200;

      candidates.push({ fromFaceId: faceId, targetFaceId: landed, dragWorld, score });
    }
  }

  if (candidates.length === 0) return null; // jammed — nothing to do

  // Pick randomly among the top tier so runs look varied, not deterministic.
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0].score;
  const topTier = candidates.filter(c => c.score >= best - 1);
  return topTier[Math.floor(Math.random() * topTier.length)];
}
