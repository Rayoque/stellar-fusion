// src/game/bots.ts
// The auto-player's personalities. Each bot ranks the legal moves of a position;
// the in-game auto-player and scripts/simulate.ts both pick from the top of that
// ranking, so what you watch in the debug menu is what the simulator measures.
// Pure: reads a GameState, never touches the store or the camera.

import type { BotId, ElementSymbol, GameState } from './types';
import { listLegalMoves, executeSlide, dragToward, type LegalMove } from '../geometry/slide';
import { pairFusionOutput } from './rules';
import { cloneForMove, commitMove } from './engine';

export type { BotId };

export interface BotInfo {
  id: BotId;
  name: string;
  blurb: string;
}

export const BOTS: BotInfo[] = [
  { id: 'greedy', name: 'Greedy', blurb: 'Fuses the heaviest thing it can, right now. The default.' },
  { id: 'planner', name: 'Planner', blurb: 'Looks one move ahead. When it can’t fuse, it parks a tile beside a partner.' },
  { id: 'patient', name: 'Patient', blurb: 'Greedy, but sits on a ready silicon pair until the star’s last moves to bank score first. Sometimes waits too long.' },
  { id: 'random', name: 'Random', blurb: 'Any legal move, no plan. The baseline every other bot has to beat.' },
  { id: 'solver', name: 'Solver', blurb: 'In scenarios, plays a proven shortest line and replans after every move. Elsewhere it plays like Greedy.' },
];

export function getBot(id: BotId | null | undefined): BotInfo {
  return BOTS.find(b => b.id === id) ?? BOTS[0];
}

// How far up its fusion chain each product sits: heavier products score higher.
const OUTPUT_RANK: Partial<Record<ElementSymbol, number>> = {
  // Standard chain
  He: 1, C: 2, O: 3, Ne: 4, Mg: 5, Si: 6, Fe: 7,
  // Astrophysicist (Fe26) chain
  D: 1, He3: 2, He4: 3, Be8: 4, C12: 5, O16: 6, Ne20: 7, Mg24: 8,
  Si28: 9, S32: 10, Ar36: 11, Ca40: 12, Ti44: 13, Cr48: 14, Fe52: 15,
  Ni56: 16, Fe56: 17,
};

// Products nothing can fuse with: Be7 only decays back to He4, and Fe26 leaves
// Mg24 a dead end, so making either is a wasted move.
const DEAD_ENDS = new Set<ElementSymbol>(['Be7', 'Mg24']);

// Tier scores. Gaps are wide enough that no tie-break crosses a tier.
const FUSION = 1000;
const NUCLEATION = 900;
const PARKED = 100;
const DEAD_END = 5;

/** What a move would make, or null if it doesn't fuse. */
export function fusionProduct(state: GameState, move: LegalMove): ElementSymbol | null {
  if (move.slide.stoppedReason !== 'merge') return null;
  const mover = state.tiles.get(move.fromFaceId)?.element;
  const target = state.tiles.get(move.slide.path[move.slide.path.length - 1])?.element;
  if (!mover || !target) return null;
  // Standard triple-alpha: the slide only stops as a merge when the triangle is there.
  if (!state.astrophysicistMode && mover === 'He' && target === 'He') return 'C';
  return pairFusionOutput(mover, target, state);
}

function isNucleation(state: GameState, move: LegalMove): boolean {
  if (state.astrophysicistMode || move.slide.stoppedReason === 'merge') return false;
  const landed = move.slide.path[move.slide.path.length - 1];
  return state.tiles.get(move.fromFaceId)?.element === 'H' && state.faces[landed]?.shape === 'pentagon';
}

function greedyScore(state: GameState, move: LegalMove): number {
  const product = fusionProduct(state, move);
  if (product) return DEAD_ENDS.has(product) ? DEAD_END : FUSION + (OUTPUT_RANK[product] ?? 0) * 40;
  if (isNucleation(state, move)) return NUCLEATION;
  return Math.random() * 5; // shuffle: any reposition is as good as another
}

// The best fusion the tile resting on `faceId` could take part in next move,
// either by sliding into a neighbor or by a neighbor sliding into it.
function bestFollowUp(state: GameState, faceId: number): number {
  const tile = state.tiles.get(faceId);
  const face = state.faces[faceId];
  if (!tile || !face) return 0;
  let best = 0;
  for (const n of face.neighbors) {
    const partner = state.tiles.get(n);
    if (!partner) continue;
    for (const [from, to] of [[faceId, n], [n, faceId]] as const) {
      const slide = executeSlide(from, dragToward(state.faces[from], state.faces[to]), state);
      if (slide.stoppedReason !== 'merge' || slide.path[1] !== to) continue;
      const product = fusionProduct(state, { fromFaceId: from, firstStepId: to, dragWorld: { x: 0, y: 0, z: 0 }, slide });
      if (product && !DEAD_ENDS.has(product)) best = Math.max(best, OUTPUT_RANK[product] ?? 0);
    }
  }
  return best;
}

// Greedy's instincts plus a one-move look ahead: among equal fusions it prefers
// the one whose product can fuse again, and when nothing fuses it parks the tile
// where it can fuse next move instead of shuffling at random.
function plannerScore(state: GameState, move: LegalMove): number {
  const base = greedyScore(state, move);
  if (base === DEAD_END) return base;
  const after = cloneForMove(state);
  const outcome = commitMove(after, move.fromFaceId, move.slide, { spawn: false });
  const followUp = bestFollowUp(after, outcome.landedId);
  if (base >= NUCLEATION) return base + followUp * 2;
  return (followUp > 0 ? PARKED + followUp * 10 : 0) + Math.random() * 5;
}

// Greedy, except it won't forge iron while the star still has time to burn:
// every fusion before the supernova adds score, and iron ends the run.
function patientScore(state: GameState, move: LegalMove): number {
  const product = fusionProduct(state, move);
  const movesLeft = state.lifetime !== null ? state.lifetime - state.turn : Infinity;
  if (product === 'Fe' && state.lifetime !== null && movesLeft > 2) return 8;
  return greedyScore(state, move);
}

export function scoreMove(state: GameState, move: LegalMove, bot: BotId): number {
  switch (bot) {
    case 'random': return 0;
    case 'planner': return plannerScore(state, move);
    case 'patient': return patientScore(state, move);
    default: return greedyScore(state, move); // greedy, and solver's fallback
  }
}

/** The bot's favourite moves: everything within a point of the best score. */
export function topMoves(state: GameState, bot: BotId, moves = listLegalMoves(state)): LegalMove[] {
  if (moves.length === 0) return [];
  const scored = moves.map(move => ({ move, score: scoreMove(state, move, bot) }));
  const best = Math.max(...scored.map(s => s.score));
  return scored.filter(s => s.score >= best - 1).map(s => s.move);
}

export function chooseMove(state: GameState, bot: BotId): LegalMove | null {
  const top = topMoves(state, bot);
  return top.length ? top[Math.floor(Math.random() * top.length)] : null;
}
