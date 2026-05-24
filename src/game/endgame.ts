// src/game/endgame.ts
import type { GameState, EndState } from './types';
import { detectMerge } from './rules';

export function isJammed(state: GameState): boolean {
  if (state.tiles.size < state.faces.length) return false;

  for (const faceId of state.tiles.keys()) {
    if (detectMerge(faceId, state)) {
      return false; // at least one possible merge exists
    }
  }
  return true;
}

export function checkEndState(state: GameState): EndState | null {
  // Jammed: full sphere, no legal merges possible
  if (isJammed(state)) {
    return 'jammed';
  }

  // Iron triggers core collapse → mass-dependent remnant
  if (state.elementCounts.Fe >= 1) {
    if (state.starMass < 1.4) return 'failed_collapse';
    if (state.starMass < 8)   return 'white_dwarf';
    if (state.starMass < 25)  return 'neutron_star';
    return 'black_hole';
  }

  // Low-mass natural white dwarf: O accumulated + no more H fuel
  if (
    state.starMass < 8 &&
    state.elementCounts.O >= 4 &&
    state.elementCounts.H === 0
  ) {
    return 'white_dwarf';
  }

  return null;
}
