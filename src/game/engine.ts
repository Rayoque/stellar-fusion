// src/game/engine.ts
// The move pipeline — everything that happens between a tile being let go and the
// next turn. The live store, the level solver, and the dev simulator all run moves
// through commitMove, so they can never disagree about the rules.
import type { GameState, ElementSymbol, EndState, EndReason, Level, Tile, ObstacleInstance } from './types';
import type { SlideResult } from '../geometry/slide';
import { detectMerge, applyMerge, countElements, DECAY, type MergeRule } from './rules';
import { spawnHydrogen } from './spawn';
import { updatePhase } from './phases';
import { checkEndState } from './endgame';
import { SUPERNOVA_BONUS } from './stars';

export interface MoveOutcome {
  mover: ElementSymbol;
  landedId: number;
  mergeRule: MergeRule | null;
  isNucleation: boolean;
  decays: Array<{ faceId: number; from: ElementSymbol; to: ElementSymbol }>;
  objectiveMet: boolean;
  levelFailed: boolean;
  end: EndState | null;
  endReason: EndReason | null;
  supernovaBonus: number;
}

// Independent copy of the mutable board state; everything else is shared by reference.
export function cloneForMove<T extends GameState>(state: T): T {
  const tiles = new Map<number, Tile>();
  for (const [id, tile] of state.tiles) tiles.set(id, { ...tile });
  const obstacles = new Map<number, ObstacleInstance>();
  for (const [id, obs] of state.obstacles ?? []) obstacles.set(id, { ...obs });
  return {
    ...state,
    tiles,
    obstacles,
    elementCounts: { ...state.elementCounts },
    phaseTransitions: { ...state.phaseTransitions },
  };
}

export function objectivesMet(state: GameState, level: Level): boolean {
  for (const obj of level.objectives) {
    if (obj.type === 'has_element' || obj.type === 'has_element_count') {
      if ((state.elementCounts[obj.element!] || 0) < (obj.count || 1)) return false;
    } else if (obj.type === 'has_element_on_pentagon') {
      const met = Array.from(state.tiles.values()).some(
        t => t.element === obj.element && state.faces[t.faceId]?.shape === 'pentagon'
      );
      if (!met) return false;
    } else if (obj.type === 'has_all_elements') {
      const required: ElementSymbol[] = ['H', 'He', 'C', 'O', 'Ne', 'Mg', 'Si', 'Fe'];
      if (!required.every(el => (state.elementCounts[el] || 0) > 0)) return false;
    }
  }
  return true;
}

/**
 * Commit a slide that has already been resolved by executeSlide. Mutates `state`
 * (pass cloneForMove(...) to keep the original). Covers fusion, the turn tick,
 * obstacles, isotope decay, hydrogen rain, phase evolution, objectives and the
 * end of the run.
 */
export function commitMove(
  state: GameState,
  fromFaceId: number,
  slide: SlideResult,
  opts: { level?: Level | null; spawn?: boolean } = {}
): MoveOutcome {
  const tile = state.tiles.get(fromFaceId)!;
  state.tiles.delete(fromFaceId);

  const path = slide.path;
  const landedId = path[path.length - 1];
  const isMerge = slide.stoppedReason === 'merge';

  // The mover comes to rest beside its partner (or on its landing face) before fusing.
  let mergeRule: MergeRule | null = null;
  let restingId = landedId;
  if (isMerge) {
    restingId = path[path.length - 2];
    state.tiles.set(restingId, { ...tile, faceId: restingId });
    const viaPortal = state.obstacles?.get(restingId)?.type === 'wormhole';
    mergeRule = detectMerge(restingId, state, landedId, viaPortal);
  } else {
    state.tiles.set(landedId, { ...tile, faceId: landedId, spawnReason: 'slide' });
    mergeRule = detectMerge(landedId, state);
  }

  if (mergeRule) {
    applyMerge(mergeRule, restingId, state, isMerge ? landedId : undefined);
  }

  // Coronal mass ejections vaporize anything sitting in them (pre-turn check).
  vaporizeUnderActiveCMEs(state);

  state.turn += 1;

  applyGravityAnomalies(state);
  cycleCMEs(state);

  const decays = state.astrophysicistMode ? tickDecays(state) : [];

  state.lastMoveFaceId = landedId;
  if (opts.spawn !== false) spawnHydrogen(state);
  state.elementCounts = countElements(state.tiles);

  updatePhase(state);

  let objectiveMet = false;
  let levelFailed = false;
  if (opts.level) {
    objectiveMet = objectivesMet(state, opts.level);
    levelFailed = !objectiveMet && state.turn >= opts.level.maxTurns;
  }

  const forgedIron = mergeRule?.output === 'Fe';
  const finish = checkEndState(state, forgedIron);
  let supernovaBonus = 0;
  if (finish) {
    if (opts.level && !objectiveMet) levelFailed = true;
    if (finish.end !== 'jammed' && finish.end !== 'core_full') {
      // The core gives out: the sphere collapses into its remnant.
      state.phase = 'collapse';
      if (state.phaseTransitions && state.phaseTransitions.collapse === null) {
        state.phaseTransitions.collapse = state.turn;
      }
    }
    if (finish.reason === 'iron' && state.lifetime !== null) {
      supernovaBonus = SUPERNOVA_BONUS[finish.end] ?? 0;
      state.score += supernovaBonus;
    }
  }

  return {
    mover: tile.element,
    landedId,
    mergeRule,
    isNucleation: !!mergeRule?.requiresPentagon,
    decays,
    objectiveMet,
    levelFailed,
    end: finish?.end ?? null,
    endReason: finish?.reason ?? null,
    supernovaBonus,
  };
}

function vaporizeUnderActiveCMEs(state: GameState): void {
  if (!state.obstacles) return;
  for (const [faceId, obs] of state.obstacles) {
    if (obs.type === 'cme' && obs.state === 'active') state.tiles.delete(faceId);
  }
}

// Each anomaly pushes the tiles around it one step directly away, if there's room.
function applyGravityAnomalies(state: GameState): void {
  if (!state.obstacles) return;
  const pushes = new Map<number, number>();
  for (const [faceId, obs] of state.obstacles) {
    if (obs.type !== 'gravity') continue;
    const anomaly = state.faces[faceId];
    if (!anomaly) continue;
    for (const neighborId of anomaly.neighbors) {
      if (!state.tiles.has(neighborId)) continue;
      const neighbor = state.faces[neighborId];
      let awayId = -1;
      let minDot = Infinity;
      for (const candidateId of neighbor.neighbors) {
        if (candidateId === faceId) continue;
        const c = state.faces[candidateId].center;
        const d = anomaly.center.x * c.x + anomaly.center.y * c.y + anomaly.center.z * c.z;
        if (d < minDot) {
          minDot = d;
          awayId = candidateId;
        }
      }
      if (awayId !== -1 && !state.tiles.has(awayId) && state.obstacles.get(awayId)?.type !== 'gravity') {
        pushes.set(neighborId, awayId);
      }
    }
  }
  for (const [fromId, toId] of pushes) {
    const t = state.tiles.get(fromId);
    if (!t || state.tiles.has(toId)) continue; // two anomalies can aim at the same face
    state.tiles.delete(fromId);
    state.tiles.set(toId, { ...t, faceId: toId, spawnReason: 'slide' });
  }
}

// CME gates cycle inactive → warning → active → inactive, vaporizing tiles when active.
function cycleCMEs(state: GameState): void {
  if (!state.obstacles) return;
  for (const [faceId, obs] of state.obstacles) {
    if (obs.type !== 'cme') continue;
    const next = obs.state === 'inactive' ? 'warning' : obs.state === 'warning' ? 'active' : 'inactive';
    state.obstacles.set(faceId, { ...obs, state: next });
  }
  vaporizeUnderActiveCMEs(state);
}

// Astrophysicist Mode: every unstable isotope ages one move; expired ones decay
// (Fe26's table). Tiles are replaced, never mutated, so undo snapshots stay intact.
function tickDecays(state: GameState): MoveOutcome['decays'] {
  const decays: MoveOutcome['decays'] = [];
  for (const [faceId, t] of state.tiles) {
    if (t.decayTurns === undefined) continue;
    const left = t.decayTurns - 1;
    const rule = DECAY[t.element];
    if (left > 0 || !rule) {
      state.tiles.set(faceId, { ...t, decayTurns: left });
      continue;
    }
    state.score = (state.score || 0) + rule.points;
    decays.push({ faceId, from: t.element, to: rule.to });
    state.tiles.set(faceId, {
      ...t,
      element: rule.to,
      decayTurns: undefined,
      spawnedAtTurn: state.turn,
      spawnReason: 'slide',
    });
  }
  return decays;
}
