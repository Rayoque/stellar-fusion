// src/game/AutoPlayerDriver.tsx
// Headless driver for the dev-only auto-player. While state.autoPlay is true it
// asks the chosen bot for a move and commits it via the same startDrag/endDrag
// path a human uses, so the user can still grab and drag tiles at any time.
//
// Turbo skips the grab, the camera orbit and the slide animation, so a move
// lands every frame or so. "Keep playing" starts a fresh run (or the next
// scenario) a moment after each one ends, and every auto-played run is logged
// for the debug panel.

import { useEffect } from 'react';
import { useGameStore } from './state';
import { pickAutoMove, frontDot, type AutoMove } from './autoplayer';
import { dragToward } from '../geometry/slide';
import { findLevel, formatScenarioNumber, LEVELS } from './levels';
import { getStarClass } from './stars';
import type { EndState, GameState, Level } from './types';
import type { SolveResult } from './solver';

type Store = ReturnType<typeof useGameStore.getState>;

const MOVE_INTERVAL = 500;   // ms idle between committed auto moves (at 1× speed)
const GRAB_DWELL = 380;      // ms to show the grab + target indicator (at 1× speed)
const TURBO_INTERVAL = 16;   // ms between turbo moves: about one per frame
const CENTERED_DOT = 0.5;    // bring a fetched face at least this far to the front
const ROTATE_TIMEOUT = 1800; // ms cap on the orbit-into-view spin

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Pace scales inversely with the speed multiplier; floors keep the grab readable
// and avoid a busy-loop at the fast end.
const dwellFor = (speed: number) => Math.max(120, GRAB_DWELL / speed);
const intervalFor = (s: GameState) => (s.autoPlayTurbo ? TURBO_INTERVAL : Math.max(80, MOVE_INTERVAL / s.autoPlaySpeed));

// How long a finished run stays on screen before "Keep playing" starts the next
// one: long enough to watch the ending ceremony, or just a beat in turbo.
function restartDelay(s: GameState): number {
  if (s.autoPlayTurbo) return 1200;
  return s.currentLevelId !== null ? 3500 : 6500;
}

// ---------------------------------------------------------------------------
// Solver bot: the scenario solver runs in a worker, from the current position.

let solverWorker: Worker | null = null;
let solveRequestId = 0;
const pendingSolves = new Map<number, (result: SolveResult | null) => void>();

function solveInWorker(level: Level): Promise<SolveResult | null> {
  try {
    if (!solverWorker) {
      solverWorker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
      solverWorker.onmessage = (e: MessageEvent<{ id: number; result: SolveResult }>) => {
        pendingSolves.get(e.data.id)?.(e.data.result);
        pendingSolves.delete(e.data.id);
      };
      solverWorker.onerror = () => {
        pendingSolves.forEach(resolve => resolve(null));
        pendingSolves.clear();
        solverWorker?.terminate();
        solverWorker = null;
      };
    }
  } catch {
    return Promise.resolve(null);
  }
  const id = ++solveRequestId;
  return new Promise(resolve => {
    pendingSolves.set(id, resolve);
    solverWorker!.postMessage({ id, level });
  });
}

function currentLevel(s: GameState): Level | null {
  if (s.currentLevelId === null) return null;
  return findLevel(s.currentLevelId, s.customScenarios, s.editorLevelMetadata) ?? null;
}

// The scenario as it stands right now: today's board, the moves still left.
function levelFromHere(s: GameState, level: Level): Level {
  return {
    ...level,
    initialTiles: [...s.tiles.values()].map(t => ({ faceId: t.faceId, element: t.element })),
    obstacles: [...(s.obstacles?.values() ?? [])].map(o => ({ ...o })),
    maxTurns: Math.max(1, level.maxTurns - s.turn),
  };
}

const note = (text: string | null) => {
  if (useGameStore.getState().autoPlayNote !== text) useGameStore.setState({ autoPlayNote: text });
};

// Null means "play like Greedy this move"; the note says why.
async function solverMove(s: GameState): Promise<AutoMove | null> {
  const level = currentLevel(s);
  if (!level) {
    note('No scenario here, so it plays like Greedy.');
    return null;
  }
  note('Thinking…');
  const result = await solveInWorker(levelFromHere(s, level));
  if (!result || result.status !== 'solved' || result.example.length === 0) {
    note(result?.status === 'too_big'
      ? 'Too many positions to search. Playing like Greedy.'
      : 'No win from here. Playing like Greedy.');
    return null;
  }
  const toGo = result.optimal ?? result.example.length;
  const finish = s.turn + toGo;
  note(`${toGo} ${toGo === 1 ? 'move' : 'moves'} to go: done in ${finish}, par ${level.parMoves}.`);
  const step = result.example[0];
  return {
    fromFaceId: step.fromFaceId,
    targetFaceId: step.landedId,
    dragWorld: dragToward(s.faces[step.fromFaceId], s.faces[step.firstStepId]),
  };
}

// ---------------------------------------------------------------------------
// Run log labels.

const END_LABELS: Record<EndState, string> = {
  white_dwarf: 'White dwarf',
  neutron_star: 'Neutron star',
  black_hole: 'Black hole',
  failed_collapse: 'Failed collapse',
  core_full: 'Core full',
  jammed: 'Jammed',
};

function modeLabel(s: GameState): string {
  if (s.astrophysicistMode) return 'Astro';
  if (s.currentLevelId !== null) {
    if (s.currentLevelId === 9999) return 'Editor draft';
    const n = formatScenarioNumber(s.currentLevelId);
    return n === 'Custom' ? 'Custom scenario' : `Scenario ${n}`;
  }
  return getStarClass(s.starClass)?.name ?? 'Star';
}

function resultLabel(s: GameState): string {
  if (s.currentLevelId !== null) {
    if (!s.levelObjectiveMet) return 'Failed';
    const par = currentLevel(s)?.parMoves;
    return par !== undefined && s.turn <= par ? 'Solved at par' : `Solved, par ${par}`;
  }
  if (s.astrophysicistMode && s.endState === 'neutron_star') return 'Iron core';
  const label = s.endState ? END_LABELS[s.endState] : 'Ended';
  return s.endReason === 'iron' && s.lifetime !== null ? `${label}, iron in time` : label;
}

// "Keep playing": a solved scenario moves on to the next campaign level;
// anything else goes again from the top. The new run stays auto-played.
function startNextRun(s: Store): void {
  const campaignIndex = LEVELS.findIndex(l => l.id === s.currentLevelId);
  if (s.levelObjectiveMet && campaignIndex >= 0 && !s.isTestingCustomScenario) {
    s.newGame(undefined, LEVELS[(campaignIndex + 1) % LEVELS.length].id);
  } else {
    s.reset();
  }
  useGameStore.setState({ autoPlay: true, wasAutoPlayedThisRun: true, autoPlayNote: null });
}

// ---------------------------------------------------------------------------

export function AutoPlayerDriver() {
  const autoPlay = useGameStore(s => s.autoPlay);

  useEffect(() => {
    if (!autoPlay) {
      note(null);
      return;
    }
    // Per-run flag: a stale loop from an earlier effect never wakes back up.
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let finishedAt: number | null = null;
    let splashAt: number | null = null;

    const playMove = async (s: Store) => {
      const turbo = s.autoPlayTurbo;
      const run = s.runGeneration;
      const turn = s.turn;

      let move: AutoMove | null = null;
      if (s.autoPlayBot === 'solver') {
        move = await solverMove(s);
        const now = useGameStore.getState();
        // The human (or a restart) moved while the solver thought: plan again.
        if (cancelled || now.runGeneration !== run || now.turn !== turn || now.isAnimating) return;
      } else {
        note(null);
      }
      move ??= pickAutoMove(s, s.autoPlayBot === 'solver' ? 'greedy' : s.autoPlayBot, !turbo);
      if (!move) return; // jammed: idle until the run resets

      if (turbo) {
        s.startDrag(move.fromFaceId);
        await s.endDrag(move.fromFaceId, move.dragWorld);
        return;
      }

      // If the piece it wants is on the back, orbit the sphere to bring it to
      // the front before grabbing it.
      const srcCenter = s.faces[move.fromFaceId]?.center;
      if (srcCenter && frontDot(srcCenter) < CENTERED_DOT) {
        s.setAutoRotateTarget(move.fromFaceId);
        const deadline = Date.now() + ROTATE_TIMEOUT;
        while (!cancelled && Date.now() < deadline) {
          const c = useGameStore.getState().faces[move.fromFaceId]?.center;
          if (!c || frontDot(c) >= CENTERED_DOT) break;
          await sleep(60);
        }
        s.setAutoRotateTarget(null);
      }
      if (cancelled) return;

      // Grab the tile (morphs to a blob) and highlight where it's headed, the
      // same visual feedback a human swipe produces, then dwell so it's visible.
      s.startDrag(move.fromFaceId);
      s.setDragTargetId(move.targetFaceId);
      await sleep(dwellFor(useGameStore.getState().autoPlaySpeed));

      if (!cancelled && useGameStore.getState().selectedFaceId === move.fromFaceId) {
        await s.endDrag(move.fromFaceId, move.dragWorld); // awaits the slide
      }
      s.setDragTargetId(null);
    };

    const tick = async () => {
      if (cancelled) return;
      const s = useGameStore.getState();
      const finished = !!s.endState || s.levelObjectiveMet || s.levelFailed;

      if (finished) {
        if (s.wasAutoPlayedThisRun) {
          s.logAutoRun({
            run: s.runGeneration,
            bot: s.autoPlayBot,
            turbo: s.autoPlayTurbo,
            mode: modeLabel(s),
            result: resultLabel(s),
            score: s.score,
            moves: s.turn,
          });
        }
        finishedAt ??= Date.now();
        if (s.autoPlayLoop && !s.isPaused && Date.now() - finishedAt >= restartDelay(s)) {
          finishedAt = null;
          startNextRun(s);
        }
      } else {
        finishedAt = null;
        if (s.showFe56Splash) {
          // The iron-56 celebration pauses play; turbo and "keep playing" wave it through.
          splashAt ??= Date.now();
          if (s.autoPlayTurbo || (s.autoPlayLoop && Date.now() - splashAt > 2500)) {
            useGameStore.setState({ showFe56Splash: false, levelObjectiveMet: false });
            splashAt = null;
          }
        } else {
          splashAt = null;
          // Stand down while a move is mid-flight or the game is paused; just
          // re-check next tick.
          const busy = s.isAnimating || s.isPaused || s.tiles.size === 0;
          if (!busy) await playMove(s);
        }
      }

      if (!cancelled) timer = setTimeout(tick, intervalFor(useGameStore.getState()));
    };

    timer = setTimeout(tick, intervalFor(useGameStore.getState()));
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [autoPlay]);

  return null;
}
