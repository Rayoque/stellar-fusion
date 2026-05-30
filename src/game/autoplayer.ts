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

import type { ElementSymbol, GameState, Vec3 } from './types';
import { ELEMENTS } from './elements';
import { executeSlide } from '../geometry/slide';
import { MERGE_RULES, ASTRO_MERGE_RULES } from './rules';
import { subtract, normalize, dot } from '../utils/math';
import { cameraState } from '../three/cameraState';

export interface AutoMove {
  fromFaceId: number;
  targetFaceId: number;
  dragWorld: Vec3;
  score: number;
}

// How far up its fusion chain each fusion OUTPUT sits. The auto-player scores a
// merge by its output (not the input mass), so it prefers advancing toward iron
// and can tell a productive fusion from a wasteful one.
const OUTPUT_RANK: Partial<Record<ElementSymbol, number>> = {
  // Standard mode chain
  He: 1, C: 2, O: 3, Ne: 4, Mg: 5, Si: 6, Fe: 7,
  // Astrophysicist (Fe-26) chain
  D: 1, He3: 2, He4: 3, Be8: 4, C12: 5, O16: 6, Ne20: 7, Mg24: 8,
  Si28: 9, S32: 10, Ar36: 11, Ca40: 12, Ti44: 13, Cr48: 14, Fe52: 15,
  Ni56: 16, Fe56: 17,
};

// Outputs that nothing can fuse with — making one is a wasted detour. Be7 only
// decays back to He4 (or, frozen on a pentagon, clogs the board forever). This is
// exactly what jammed the board, so we score it below even an idle shuffle.
const DEAD_END_OUTPUTS = new Set<ElementSymbol>(['Be7']);

// The output element a merge of (a, b) would produce, or null if none.
function mergeOutputFor(a: ElementSymbol, b: ElementSymbol, isAstro: boolean): ElementSymbol | null {
  const rules = isAstro ? ASTRO_MERGE_RULES : MERGE_RULES;
  for (const r of rules) {
    if (r.inputs.length !== 2) continue;
    const [x, y] = r.inputs;
    if ((x === a && y === b) || (x === b && y === a)) return r.output;
  }
  // Standard-mode triple-alpha completes as He + He (+ third He) -> C.
  if (!isAstro && a === 'He' && b === 'He') return 'C';
  return null;
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
        // Score by what the fusion PRODUCES, not the input mass. Advancing further
        // up the chain scores higher (climbs toward iron); a dead-end output scores
        // below an idle shuffle so it's avoided unless nothing else exists.
        const targetTile = state.tiles.get(landed);
        const output = targetTile
          ? mergeOutputFor(tile.element, targetTile.element, state.astrophysicistMode)
          : null;
        if (output && DEAD_END_OUTPUTS.has(output)) {
          score = 5;
        } else {
          score = 1000 + (output ? (OUTPUT_RANK[output] ?? 0) : 0) * 40;
        }
      } else if (tile.element === 'H' && state.faces[landed]?.shape === 'pentagon') {
        // Hydrogen landing on an empty pentagon self-fuses to He4 (nucleation) —
        // valuable alpha-ladder fuel, so rank it just under a real fusion.
        score = 900;
      } else {
        // Plain reposition — low priority, keeps the board flowing.
        score = 10 + Math.random() * 5;
      }

      // Small in-view tiebreaker so equally-good moves prefer staying on-screen;
      // kept well below the fusion-rank gaps so it never overrides strategy (a
      // clearly better fusion on the back still wins, and the camera rotates to it).
      if (sourceVisible) score += 50;
      if (landedVisible) score += 25;

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
