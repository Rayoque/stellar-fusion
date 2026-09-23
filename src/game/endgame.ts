// src/game/endgame.ts
import type { GameState, EndState, EndReason } from './types';
import { hasLegalMove } from '../geometry/slide';

// Jammed means the player has no move left at all: no tile can slide anywhere and
// no fusion is possible. (A full sphere with a fusion still available is not over —
// the same rule Fe26 and 2048 use.)
export function isJammed(state: GameState): boolean {
  return !hasLegalMove(state);
}

// What a star of this mass leaves behind when its core gives out.
export function remnantForMass(mass: number): EndState {
  if (mass < 8) return 'white_dwarf';
  if (mass < 25) return 'neutron_star';
  return 'black_hole';
}

// Astrophysicist Mode: every move adds a tile and only fusion makes room, so the
// run ends when the last empty face fills. (Fe26's own rule, "no move left",
// almost never happens on the sphere, where a single tile moves at a time.)
export function isSphereFull(state: GameState): boolean {
  return state.tiles.size >= state.faces.length;
}

/**
 * Called after every committed move.
 * - Forging iron collapses the core at once (standard rules).
 * - A Stellar Life star dies when its lifetime runs out.
 * - Astrophysicist Mode ends when the sphere is full: a completed iron-56 core
 *   collapses into a supernova; without one, the core is simply full.
 * - Any mode ends when no move is left.
 */
export function checkEndState(
  state: GameState,
  forgedIron: boolean
): { end: EndState; reason: EndReason } | null {
  if (!state.astrophysicistMode && forgedIron) {
    return { end: remnantForMass(state.starMass), reason: 'iron' };
  }
  if (state.astrophysicistMode && isSphereFull(state)) {
    return { end: (state.elementCounts.Fe56 || 0) > 0 ? 'neutron_star' : 'core_full', reason: 'full' };
  }
  if (state.lifetime !== null && state.turn >= state.lifetime) {
    return { end: remnantForMass(state.starMass), reason: 'lifetime' };
  }
  if (isJammed(state)) {
    return { end: 'jammed', reason: 'jammed' };
  }
  return null;
}
