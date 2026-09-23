// src/game/solver.ts
// Exhaustive breadth-first solver for scenarios. Plays every possible move with
// the real rules (commitMove, hydrogen rain off) to find the fewest moves that
// meet the objectives, how many different optimal lines exist, and how many
// opening moves can still lead to one. Used by the scenario editor's Solve
// button and by scripts/verify-levels.ts.
import type { ElementSymbol, GameState, Level, Tile, ObstacleInstance } from './types';
import { generateTruncatedIcosahedron } from '../geometry/truncatedIcosahedron';
import { listLegalMoves, type LegalMove } from '../geometry/slide';
import { commitMove, cloneForMove } from './engine';
import { countElements } from './rules';
import { ELEMENTS } from './elements';

export interface SolutionStep {
  fromFaceId: number;
  firstStepId: number;
  element: ElementSymbol;
  landedId: number;
  steps: number;               // faces travelled
  // Why the tile stopped: fused into a partner, self-fused on a pentagon, hit a
  // tile, ran out of range, or halted because its straight path would bend.
  stop: 'fused' | 'nucleated' | 'blocked' | 'range' | 'bend';
  product?: ElementSymbol;
}

export interface SolveResult {
  status: 'solved' | 'unsolvable' | 'too_big';
  optimal: number | null;          // fewest moves that meet every objective
  solutions: number;               // distinct optimal move sequences
  openingMovesThatWork: number;    // first moves that still allow an optimal solve
  openingMoves: number;            // all legal first moves
  example: SolutionStep[];         // one optimal line
  statesExplored: number;
  searchedDepth: number;
}

let cachedFaces: GameState['faces'] | null = null;
function faces(): GameState['faces'] {
  if (!cachedFaces) cachedFaces = generateTruncatedIcosahedron();
  return cachedFaces;
}

/** A fresh board for a scenario, exactly as newGame() would set it up. */
export function levelStartState(level: Level): GameState {
  const tiles = new Map<number, Tile>();
  for (const t of level.initialTiles) tiles.set(t.faceId, { faceId: t.faceId, element: t.element, spawnedAtTurn: 0 });
  const obstacles = new Map<number, ObstacleInstance>();
  for (const o of level.obstacles ?? []) obstacles.set(o.faceId, { ...o });
  return {
    starMass: level.starMass,
    faces: faces(),
    tiles,
    obstacles,
    turn: 0,
    phase: 'main_sequence',
    elementCounts: countElements(tiles),
    score: 0,
    highScore: 0,
    phaseTransitions: { main_sequence: 0, red_giant: null, supergiant: null, collapse: null },
    currentLevelId: level.id,
    astrophysicistMode: false,
    starClass: null,
    lifetime: null,
    customScenarios: [],
    lastMoveFaceId: null,
    endState: null,
    endReason: null,
  } as unknown as GameState;
}

const SYMBOLS = 'H He C O Ne Mg Si Fe'.split(' ');
function stateKey(s: GameState): string {
  let key = '';
  for (let i = 0; i < s.faces.length; i++) {
    const t = s.tiles.get(i);
    key += t ? String.fromCharCode(97 + Math.max(0, SYMBOLS.indexOf(t.element))) : '.';
  }
  for (const [id, o] of s.obstacles) if (o.type === 'cme') key += `${id}${o.state?.[0] ?? 'i'}`;
  return key;
}

export function describeStep(
  before: GameState,
  move: LegalMove,
  landedId: number,
  product: ElementSymbol | undefined,
  nucleated: boolean
): SolutionStep {
  const element = before.tiles.get(move.fromFaceId)!.element;
  const steps = move.slide.path.length - 1;
  let stop: SolutionStep['stop'];
  if (nucleated) stop = 'nucleated';
  else if (move.slide.stoppedReason === 'merge') stop = 'fused';
  else if (move.slide.stoppedReason === 'blocked') stop = 'blocked';
  else stop = steps >= (ELEMENTS[element]?.slideDistance ?? 0) ? 'range' : 'bend';
  return { fromFaceId: move.fromFaceId, firstStepId: move.firstStepId, element, landedId, steps, stop, product };
}

interface Node {
  state: GameState;
  ways: number;              // move sequences reaching this position at this depth
  openings: Set<number>;     // indices of first moves on those sequences
  path: SolutionStep[];      // one sequence, for the example line
}

export function solveLevel(
  level: Level,
  opts: { maxDepth?: number; maxStates?: number } = {}
): SolveResult {
  const maxDepth = Math.min(opts.maxDepth ?? level.maxTurns, level.maxTurns);
  const maxStates = opts.maxStates ?? 600_000;

  const start = levelStartState(level);
  const openingMoves = listLegalMoves(start).length;
  const seen = new Set<string>([stateKey(start)]);
  let frontier: Node[] = [{ state: start, ways: 1, openings: new Set(), path: [] }];
  let explored = 0;

  for (let depth = 1; depth <= maxDepth; depth++) {
    const next = new Map<string, Node>();
    let solutions = 0;
    const winningOpenings = new Set<number>();
    let example: SolutionStep[] | null = null;

    for (const node of frontier) {
      listLegalMoves(node.state).forEach((move, index) => {
        const work = cloneForMove(node.state);
        const outcome = commitMove(work, move.fromFaceId, move.slide, { level, spawn: false });
        explored++;
        const step = describeStep(node.state, move, outcome.landedId, outcome.mergeRule?.output, outcome.isNucleation);
        const openings = depth === 1 ? new Set([index]) : node.openings;

        if (outcome.objectiveMet) {
          solutions += node.ways;
          openings.forEach(o => winningOpenings.add(o));
          if (!example) example = [...node.path, step];
          return;
        }
        if (outcome.levelFailed || outcome.end) return;

        const key = stateKey(work);
        const existing = next.get(key);
        if (existing) {
          existing.ways += node.ways;
          openings.forEach(o => existing.openings.add(o));
          return;
        }
        if (seen.has(key)) return; // reached sooner by another line
        seen.add(key);
        next.set(key, { state: work, ways: node.ways, openings: new Set(openings), path: [...node.path, step] });
      });
    }

    if (solutions > 0) {
      return {
        status: 'solved',
        optimal: depth,
        solutions,
        openingMovesThatWork: winningOpenings.size,
        openingMoves,
        example: example ?? [],
        statesExplored: explored,
        searchedDepth: depth,
      };
    }
    if (next.size === 0) {
      return { status: 'unsolvable', optimal: null, solutions: 0, openingMovesThatWork: 0, openingMoves, example: [], statesExplored: explored, searchedDepth: depth };
    }
    if (seen.size > maxStates) {
      return { status: 'too_big', optimal: null, solutions: 0, openingMovesThatWork: 0, openingMoves, example: [], statesExplored: explored, searchedDepth: depth };
    }
    frontier = [...next.values()];
  }

  return { status: 'unsolvable', optimal: null, solutions: 0, openingMovesThatWork: 0, openingMoves, example: [], statesExplored: explored, searchedDepth: maxDepth };
}
