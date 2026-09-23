// src/game/state.ts
import { create } from 'zustand';
import type { GameState, Phase, ElementSymbol, Tile, ObstacleInstance, Level, MoveSnapshot, StarClassId, BotId, AutoRunRecord } from './types';
import { generateTruncatedIcosahedron } from '../geometry/truncatedIcosahedron';
import { ELEMENTS } from './elements';
import { countElements } from './rules';
import { commitMove, cloneForMove } from './engine';
import { executeSlide } from '../geometry/slide';
import { playMerge, playBlocked, playHeliumLaugh, playSuccess, playSlide, hapticFusion, hapticBlocked, hapticSlide } from '../audio/synth';
import { LEVELS, findLevel } from './levels';
import { getStarClass, recordEndingSeen, bestScoreKey, type StarClass } from './stars';

// Leaderboards exist per star class (different lifetimes) plus one for Astrophysicist Mode.
function leaderboardId(state: Pick<GameState, 'astrophysicistMode' | 'starClass'>): string | null {
  if (state.astrophysicistMode) return 'stellar_fusion_astro_leaderboard';
  if (state.starClass) return `stellar_fusion_${state.starClass}_leaderboard`;
  return null;
}

function submitScoreToGameCenter(score: number, board: string): void {
  try {
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      const GameServices = (window as any).Capacitor.Plugins.GameServices;
      if (GameServices) {
        GameServices.submitScore({ leaderboardId: board, score }).catch(() => {});
      }
    }
  } catch (err) {}
}

// localStorage key for the personal best of the current open-ended run, if it keeps one.
function bestKeyFor(state: Pick<GameState, 'astrophysicistMode' | 'starClass' | 'currentLevelId'>): string | null {
  if (state.currentLevelId !== null) return null;
  if (state.astrophysicistMode) return 'stellar_high_score_astro';
  return state.starClass ? bestScoreKey(state.starClass) : null;
}

function readBest(key: string | null): number {
  if (!key) return 0;
  try {
    return parseInt(localStorage.getItem(key) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

function snapshotOf(s: GameState): MoveSnapshot {
  const tiles = new Map<number, Tile>();
  for (const [id, t] of s.tiles) tiles.set(id, { ...t });
  const obstacles = new Map<number, ObstacleInstance>();
  for (const [id, o] of s.obstacles) obstacles.set(id, { ...o });
  return {
    tiles,
    obstacles,
    turn: s.turn,
    phase: s.phase,
    phaseTransitions: { ...s.phaseTransitions },
    elementCounts: { ...s.elementCounts },
    levelObjectiveMet: s.levelObjectiveMet,
    levelFailed: s.levelFailed,
    endState: s.endState,
    endReason: s.endReason,
    score: s.score,
    hasPlayedHeliumLaugh: s.hasPlayedHeliumLaugh,
    lastMoveFaceId: s.lastMoveFaceId,
  };
}

interface GameActions {
  newGame: (mass?: number, levelId?: number, isAstro?: boolean, starClass?: StarClassId) => void;
  startDrag: (faceId: number) => void;
  endDrag: (faceId: number, dragWorld: { x: number; y: number; z: number }) => void;
  setDragTargetId: (id: number | null) => void;
  reset: () => void;
  setPaused: (paused: boolean) => void;
  setShowRealtimeGraphics: (show: boolean) => void;
  dismissToast: () => void;
  undo: () => void;
  dismissNucleationTutorial: () => void;
  resetNucleationTutorial: () => void;
  setManuallyZoomed: () => void;
  saveCurrentGame: () => void;
  loadSavedGame: (isAstro: boolean) => boolean;
  clearSavedGame: (isAstro: boolean) => void;
  setAutoPlay: (on: boolean) => void;
  setAutoPlaySpeed: (speed: number) => void;
  setAutoPlayBot: (bot: BotId) => void;
  setAutoPlayTurbo: (on: boolean) => void;
  setAutoPlayLoop: (on: boolean) => void;
  logAutoRun: (record: AutoRunRecord) => void;
  clearAutoRunLog: () => void;
  setAutoRotateTarget: (faceId: number | null) => void;
  toggleZenMode: () => void;
  dismissSystemToast: () => void;

  // Scenario Editor Actions
  setEditorMode: (isOpen: boolean) => void;
  setEditorBrush: (brush: any) => void;
  updateEditorMetadata: (metadata: Partial<GameState['editorLevelMetadata']>) => void;
  applyEditorBrush: (faceId: number) => void;
  saveEditorDraft: () => void;
  loadEditorDraft: () => void;
  publishScenario: () => void;
  deleteScenario: (id: number) => void;
  loadScenarioForEditing: (level: Level) => void;
}

type GameStore = GameState & GameActions;

const initialElementCounts = (): Record<ElementSymbol, number> => ({
  H: 0, He: 0, C: 0, O: 0, Ne: 0, Mg: 0, Si: 0, Fe: 0,
  D: 0, He3: 0, He4: 0, Be7: 0, Be8: 0, C12: 0, O16: 0, Ne20: 0, Mg24: 0, Si28: 0, S32: 0, Ar36: 0, Ca40: 0, Ti44: 0, Cr48: 0, Fe52: 0, Ni56: 0, Fe56: 0
});

// Bumping this clears campaign progress and the Astrophysicist Mode unlock for
// players carrying an older save, so the mode must be re-earned. High scores and
// audio settings are intentionally preserved.
const STORAGE_VERSION = '2';
// Rules version 3 (v0.13): Stellar Life replaced the old endless sandbox, so its
// saves can't be resumed; campaign pars were re-derived from the solver, so old
// "perfect" marks no longer mean optimal. Campaign progress is kept.
const RULES_VERSION = '3';
(function migrateStorage() {
  try {
    if (localStorage.getItem('stellar_storage_version') !== STORAGE_VERSION) {
      localStorage.removeItem('stellar_completed_levels');
      localStorage.removeItem('stellar_unlocked_elements');
      localStorage.setItem('stellar_storage_version', STORAGE_VERSION);
    }
    if (localStorage.getItem('stellar_rules_version') !== RULES_VERSION) {
      localStorage.removeItem('stellar_save_standard');
      // Astrophysicist rules changed too (Fe26 parity).
      localStorage.removeItem('stellar_save_astro');
      localStorage.removeItem('stellar_perfect_levels');
      localStorage.setItem('stellar_rules_version', RULES_VERSION);
    }
  } catch {
    // localStorage unavailable (e.g. private mode); nothing to migrate
  }
})();

// --- Open-ended game persistence (Stellar Life + Astrophysicist) ---
// Campaign levels are NOT persisted. Geometry is deterministic, so a save only
// needs tiles + scalar state; faces are regenerated on load.
interface SavedGame {
  starMass: number;
  starClass: StarClassId | null;
  lifetime: number | null;
  tiles: [number, Tile][];
  turn: number;
  phase: Phase;
  elementCounts: Record<ElementSymbol, number>;
  score: number;
  phaseTransitions: GameState['phaseTransitions'];
  astrophysicistMode: boolean;
  hasPlayedHeliumLaugh: boolean;
  hasSeenFe56Splash: boolean;
  wasAutoPlayedThisRun?: boolean;
}

// Auto-player preferences survive reloads (debug builds only ever read them).
function readDebugPref(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeDebugPref(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}
const BOT_IDS: BotId[] = ['greedy', 'planner', 'patient', 'random', 'solver'];
const savedBot = readDebugPref('stellar_debug_bot') as BotId | null;

// Turbo moves skip the slide animation, so their fusion sounds are thinned out
// to one every so often instead of a machine-gun rattle.
let lastTurboSoundAt = 0;

const saveKey = (isAstro: boolean) => (isAstro ? 'stellar_save_astro' : 'stellar_save_life');

// The saved Stellar Life run, if any — the star picker offers to resume it.
export function peekSavedLife(): { starClass: StarClass; movesLeft: number } | null {
  try {
    const raw = localStorage.getItem(saveKey(false));
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedGame;
    const star = getStarClass(data.starClass);
    if (!star || data.lifetime === null || !Array.isArray(data.tiles) || data.tiles.length === 0) return null;
    return { starClass: star, movesLeft: Math.max(0, data.lifetime - data.turn) };
  } catch {
    return null;
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial empty state — populated by newGame()
  starMass: 0,
  faces: [],
  tiles: new Map(),
  turn: 0,
  phase: 'main_sequence',
  elementCounts: initialElementCounts(),
  score: 0,
  highScore: 0,
  phaseTransitions: {
    main_sequence: 0,
    red_giant: null,
    supergiant: null,
    collapse: null,
  },

  // Campaign initial states loaded from localStorage
  currentLevelId: null,
  completedLevels: JSON.parse(localStorage.getItem('stellar_completed_levels') || '[]'),
  perfectLevels: JSON.parse(localStorage.getItem('stellar_perfect_levels') || '[]'),
  showZenMode: false,
  levelObjectiveMet: false,
  levelFailed: false,
  unlockedElements: JSON.parse(localStorage.getItem('stellar_unlocked_elements') || '["H", "He"]'),
  activeToastElement: null,

  // Scenario Editor & Obstacles initial state
  obstacles: new Map(),
  isEditorMode: false,
  isTestingCustomScenario: false,
  editorBrush: 'H',
  editorLevelMetadata: {
    title: 'New Scenario',
    description: 'Use the editor to build your custom nucleosynthesis puzzle.',
    author: 'Stellar Architect',
    starMass: 4.0,
    maxTurns: 10,
    parMoves: 6,
    objectives: [{ type: 'has_element', element: 'He', count: 1, hint: 'Create Helium' }],
    disableSpawns: true,
  },
  customScenarios: (() => {
    try {
      return JSON.parse(localStorage.getItem('stellar_custom_scenarios') || '[]');
    } catch {
      return [];
    }
  })(),

  starClass: null,
  lifetime: null,
  unlockedStarThisRun: null,

  selectedFaceId: null,
  dragTargetId: null,
  isAnimating: false,
  endState: null,
  endReason: null,
  supernovaBonus: 0,
  astrophysicistMode: false,
  isPaused: false,
  showRealtimeGraphics: true,
  showNucleationTutorial: false,
  hasSeenNucleationTutorial: localStorage.getItem('stellar_seen_nucleation') === 'true',
  history: [],
  hasPlayedHeliumLaugh: false,
  hasManuallyZoomed: (() => {
    const lastZoomTime = localStorage.getItem('stellar_last_zoom_time');
    if (lastZoomTime) {
      const daysPassed = (Date.now() - parseInt(lastZoomTime, 10)) / (1000 * 60 * 60 * 24);
      if (daysPassed < 7) {
        return true;
      }
    }
    return false;
  })(),
  isOrbitingFromHUD: false,
  isSphereTooBig: false,
  lastMoveFaceId: null,
  hasSeenFe56Splash: false,
  showFe56Splash: false,
  autoPlay: false,
  autoPlaySpeed: 1,
  autoPlayBot: savedBot && BOT_IDS.includes(savedBot) ? savedBot : 'greedy',
  autoPlayTurbo: readDebugPref('stellar_debug_turbo') === 'true',
  autoPlayLoop: readDebugPref('stellar_debug_loop') === 'true',
  autoPlayNote: null,
  autoRunLog: [],
  autoRotateTargetFaceId: null,
  wasAutoPlayedThisRun: false,
  systemToast: null,
  runGeneration: 0,
  lastActionWasUndo: false,

  dismissToast: () => {
    set({ activeToastElement: null });
  },

  dismissSystemToast: () => {
    set({ systemToast: null });
  },

  newGame: (mass, levelId, isAstro, starClassId) => {
    const faces = generateTruncatedIcosahedron();
    const initialTiles = new Map<number, Tile>();
    const initialObstacles = new Map<number, ObstacleInstance>();
    let currentLevelId: number | null = null;
    const isAstroMode = isAstro ?? false;

    // Stellar Life is the default open-ended run: a chosen star with a lifetime.
    const star = !isAstroMode && levelId === undefined ? (getStarClass(starClassId) ?? getStarClass('sunlike')!) : null;
    let starMass = mass ?? star?.mass ?? 1;

    if (isAstroMode) {
      // Astrophysicist mode: always start with 5 hydrogens on hexagons
      const emptyIndices = faces.filter(f => f.shape === 'hexagon').map(f => f.id);
      for (let i = 0; i < 5 && emptyIndices.length > 0; i++) {
        const idx = Math.floor(Math.random() * emptyIndices.length);
        const faceId = emptyIndices[idx];
        initialTiles.set(faceId, {
          faceId,
          element: 'H' as ElementSymbol,
          spawnedAtTurn: 0,
        });
        emptyIndices.splice(idx, 1);
      }
    } else if (levelId !== undefined) {
      if (levelId === 9999) {
        currentLevelId = 9999;
        const raw = localStorage.getItem('stellar_editor_draft');
        if (raw) {
          const draft = JSON.parse(raw);
          starMass = draft.metadata.starMass;
          if (draft.tiles) {
            for (const [fid, t] of draft.tiles) {
              initialTiles.set(fid, { ...t, spawnedAtTurn: 0 });
            }
          }
          if (draft.obstacles) {
            for (const [fid, o] of draft.obstacles) {
              initialObstacles.set(fid, { ...o });
            }
          }
        }
      } else {
        const level = LEVELS.find(l => l.id === levelId) || get().customScenarios.find(l => l.id === levelId);
        if (level) {
          currentLevelId = levelId;
          starMass = level.starMass;
          for (const t of level.initialTiles) {
            initialTiles.set(t.faceId, {
              faceId: t.faceId,
              element: t.element,
              spawnedAtTurn: 0,
            });
          }
          if (level.obstacles) {
            for (const obs of level.obstacles) {
              initialObstacles.set(obs.faceId, { ...obs });
            }
          }
        }
      }
    } else {
      // Spawn initial ~5 hydrogens
      const emptyIndices = faces.filter(f => f.shape === 'hexagon').map(f => f.id);
      for (let i = 0; i < 5 && emptyIndices.length > 0; i++) {
        const idx = Math.floor(Math.random() * emptyIndices.length);
        const faceId = emptyIndices[idx];
        initialTiles.set(faceId, {
          faceId,
          element: 'H' as ElementSymbol,
          spawnedAtTurn: 0,
        });
        emptyIndices.splice(idx, 1);
      }
    }

    const highScore = readBest(bestKeyFor({ astrophysicistMode: isAstroMode, starClass: star?.id ?? null, currentLevelId }));

    set({
      starMass,
      starClass: star?.id ?? null,
      lifetime: star?.lifetime ?? null,
      unlockedStarThisRun: null,
      faces,
      tiles: initialTiles,
      obstacles: initialObstacles,
      turn: 0,
      phase: 'main_sequence',
      elementCounts: countElements(initialTiles),
      score: 0,
      highScore,
      phaseTransitions: {
        main_sequence: 0,
        red_giant: null,
        supergiant: null,
        collapse: null,
      },
      currentLevelId,
      levelObjectiveMet: false,
      levelFailed: false,
      selectedFaceId: null,
      dragTargetId: null,
      isAnimating: false,
      endState: null,
      endReason: null,
      supernovaBonus: 0,
      astrophysicistMode: isAstroMode,
      activeSlide: undefined,
      lastMerge: undefined,
      blockedFaceId: null,
      blockedTime: 0,
      dragOffset3D: null,
      isPaused: false,
      showNucleationTutorial: false,
      history: [],
      hasPlayedHeliumLaugh: false,
      lastMoveFaceId: null,
      hasSeenFe56Splash: false,
      showFe56Splash: false,
      autoPlay: false,
      autoRotateTargetFaceId: null,
      wasAutoPlayedThisRun: false,
      systemToast: null,
      runGeneration: get().runGeneration + 1,
      lastActionWasUndo: false,
    });
  },

  startDrag: (faceId) => {
    const state = get();
    if (state.isAnimating || state.endState || state.isPaused || state.levelObjectiveMet || state.levelFailed) return;
    const tile = state.tiles.get(faceId);
    if (!tile || ELEMENTS[tile.element].slideDistance === 0) return;

    set({ selectedFaceId: faceId });
  },

  endDrag: async (fromFaceId, dragWorld) => {
    const state = get();
    if (state.isAnimating || state.endState || state.selectedFaceId !== fromFaceId) {
      set({ selectedFaceId: null, dragTargetId: null });
      return;
    }

    // Capture the run this move belongs to. If newGame/loadSavedGame replaces
    // the run while we're awaiting the slide animation, abort instead of
    // committing stale state over the fresh game.
    const runGen = state.runGeneration;

    set({ isAnimating: true, selectedFaceId: null, dragTargetId: null });

    try {
      const slide = executeSlide(fromFaceId, dragWorld as any, state);

      if (slide.path.length <= 1) {
        // Nowhere to go: blocked cue and a short shake.
        playBlocked();
        hapticBlocked();
        set({
          blockedFaceId: fromFaceId,
          blockedTime: performance.now(),
          selectedFaceId: null,
          dragTargetId: null,
          dragOffset3D: null,
          isAnimating: false,
        });
        setTimeout(() => set({ blockedFaceId: null }), 350);
        return;
      }

      const tile = state.tiles.get(fromFaceId)!;
      // Turbo (auto-player only): the move lands instantly, without its slide.
      const turbo = state.autoPlay && state.autoPlayTurbo;
      const duration = turbo ? 0 : (slide.path.length - 1) * 180;
      if (!turbo) {
        playSlide(tile.element, slide.path.length - 1);
        hapticSlide(tile.element);
      }

      // Single-step undo keeps just the position before this move.
      const history = [snapshotOf(state)];

      // Lift the tile off the board while the slide animates.
      const lifted = new Map(state.tiles);
      lifted.delete(fromFaceId);
      const landedId = slide.path[slide.path.length - 1];
      const willSelfFuse = tile.element === 'H' && !state.astrophysicistMode && state.faces[landedId]?.shape === 'pentagon';
      if (turbo) {
        set({ history, dragOffset3D: null });
      } else {
        set({
          tiles: lifted,
          history,
          dragOffset3D: null,
          activeSlide: {
            element: tile.element,
            path: slide.path,
            startTime: performance.now(),
            duration,
            isMerge: slide.stoppedReason === 'merge' || willSelfFuse,
          },
        });

        await new Promise(r => setTimeout(r, duration));
        if (get().runGeneration !== runGen) return;
      }

      // Resolve the move on a copy of the pre-move state, then publish it.
      const level = state.currentLevelId !== null
        ? findLevel(state.currentLevelId, state.customScenarios, state.editorLevelMetadata) ?? null
        : null;
      const work = cloneForMove(state);
      const outcome = commitMove(work, fromFaceId, slide, { level });

      if (outcome.mergeRule) {
        const now = performance.now();
        if (!turbo) {
          playMerge(outcome.mover, outcome.mergeRule.output);
          hapticFusion(outcome.mergeRule.output);
        } else if (now - lastTurboSoundAt > 140) {
          lastTurboSoundAt = now;
          playMerge(outcome.mover, outcome.mergeRule.output);
        }
      }

      // Fe56 only ever arises from Ni56 decay (Fe26's rule), so the synthesis
      // celebration keys off decays.
      let showFe56Splash = false;
      let hasSeenFe56Splash = state.hasSeenFe56Splash;
      if (work.astrophysicistMode && !hasSeenFe56Splash && outcome.decays.some(d => d.to === 'Fe56')) {
        showFe56Splash = true;
        hasSeenFe56Splash = true;
        playSuccess();
      }

      // Personal best for runs that keep one.
      let highScore = state.highScore;
      const bestKey = bestKeyFor(work);
      if (bestKey && !state.wasAutoPlayedThisRun && work.score > highScore) {
        highScore = work.score;
        try {
          localStorage.setItem(bestKey, String(highScore));
        } catch {
          // storage unavailable
        }
        const board = leaderboardId(work);
        if (board) submitScoreToGameCenter(highScore, board);
      }

      // Helium "HeHeHe" Easter Egg trigger: requires >= 26 Helium (80% of 32 faces),
      // plays only once per game, has a 60% chance to trigger each turn,
      // and plays with a 1-second delay for suspense!
      let hasPlayedHeliumLaugh = state.hasPlayedHeliumLaugh;
      if ((work.elementCounts.He || 0) >= 26 && !hasPlayedHeliumLaugh && Math.random() < 0.60) {
        hasPlayedHeliumLaugh = true;
        setTimeout(() => playHeliumLaugh(), 1000);
      }

      // Codex discoveries
      let activeToastElement: ElementSymbol | null = null;
      const unlocked = get().unlockedElements;
      const newlyFound = (Object.keys(work.elementCounts) as ElementSymbol[])
        .filter(sym => work.elementCounts[sym] > 0 && !unlocked.includes(sym));
      if (newlyFound.length > 0) {
        const nextUnlocked = [...unlocked, ...newlyFound];
        activeToastElement = newlyFound[newlyFound.length - 1];
        try {
          localStorage.setItem('stellar_unlocked_elements', JSON.stringify(nextUnlocked));
        } catch {
          // storage unavailable
        }
        set({ unlockedElements: nextUnlocked });
      }

      // Campaign bookkeeping. Only built-in levels count toward progression —
      // custom scenarios, editor playtests and auto-played solves must not
      // inflate the completion count that gates Astrophysicist Mode.
      if (level && outcome.objectiveMet) {
        const isCampaignLevel = LEVELS.some(l => l.id === level.id) && !state.wasAutoPlayedThisRun;
        const completed = get().completedLevels;
        const perfect = get().perfectLevels || [];
        let nextCompleted = completed;
        let nextPerfect = perfect;
        if (isCampaignLevel && !completed.includes(level.id)) {
          nextCompleted = [...completed, level.id];
          localStorage.setItem('stellar_completed_levels', JSON.stringify(nextCompleted));
        }
        if (isCampaignLevel && work.turn <= level.parMoves && !perfect.includes(level.id)) {
          nextPerfect = [...perfect, level.id];
          localStorage.setItem('stellar_perfect_levels', JSON.stringify(nextPerfect));
        }
        set({ completedLevels: nextCompleted, perfectLevels: nextPerfect });
        if (!state.levelObjectiveMet) playSuccess();
      }

      // The pentagon tutorial waits for a calm moment: never on top of a level
      // result or the end of the run (it shows at the next self-fusion instead).
      const triggerTutorial = outcome.isNucleation
        && !state.hasSeenNucleationTutorial
        && !outcome.objectiveMet
        && !outcome.levelFailed
        && !outcome.end;
      if (triggerTutorial) {
        localStorage.setItem('stellar_seen_nucleation', 'true');
      }

      const published = {
        tiles: work.tiles,
        obstacles: work.obstacles,
        turn: work.turn,
        phase: work.phase,
        phaseTransitions: work.phaseTransitions,
        elementCounts: work.elementCounts,
        score: work.score,
        highScore,
        lastMerge: work.lastMerge,
        lastMoveFaceId: work.lastMoveFaceId,
        levelObjectiveMet: outcome.objectiveMet,
        levelFailed: outcome.levelFailed,
        activeToastElement,
        showNucleationTutorial: triggerTutorial,
        hasSeenNucleationTutorial: triggerTutorial ? true : state.hasSeenNucleationTutorial,
        showFe56Splash,
        hasSeenFe56Splash,
        hasPlayedHeliumLaugh,
        lastActionWasUndo: false,
      };

      if (outcome.end) {
        set({
          ...published,
          endState: outcome.end,
          endReason: outcome.endReason,
          supernovaBonus: outcome.supernovaBonus,
          isAnimating: false,
          activeSlide: undefined,
        });
        // A finished Stellar Life run records the ending, which may unlock a heavier star.
        if (work.starClass && outcome.end !== 'jammed' && !state.wasAutoPlayedThisRun) {
          const unlockedStar = recordEndingSeen(outcome.end);
          if (unlockedStar) set({ unlockedStarThisRun: unlockedStar.id });
        }
        // True end-of-run: clear the saved game so re-entering starts fresh.
        get().clearSavedGame(work.astrophysicistMode);
        return;
      }

      // Snappy settle delay: 40ms clears mobile pointer events without feeling laggy.
      if (!turbo) {
        await new Promise(r => setTimeout(r, 40));
        if (get().runGeneration !== runGen) return;
      }

      set({ ...published, isAnimating: false, activeSlide: undefined });
      // Persist the in-progress open-ended game after each committed move.
      get().saveCurrentGame();
    } catch (e) {
      console.error('Error in endDrag:', e);
      set({ isAnimating: false, selectedFaceId: null, dragTargetId: null, dragOffset3D: null, activeSlide: undefined });
    }
  },

  setDragTargetId: (id) => {
    set({ dragTargetId: id });
  },

  reset: () => {
    const { astrophysicistMode, currentLevelId, starClass } = get();
    if (currentLevelId !== null) {
      get().newGame(undefined, currentLevelId);
      return;
    }
    // Open-ended modes: wipe the saved game and start fresh with the same star / mode.
    get().clearSavedGame(astrophysicistMode);
    get().newGame(undefined, undefined, astrophysicistMode, starClass ?? undefined);
  },

  saveCurrentGame: () => {
    const s = get();
    // Only persist live, open-ended runs. Skip campaign levels, an empty board,
    // and a finished run (cleared at end-of-run, must stay cleared).
    if (s.currentLevelId !== null || s.tiles.size === 0 || s.endState !== null) return;
    if (!s.astrophysicistMode && !s.starClass) return;
    const data: SavedGame = {
      starMass: s.starMass,
      starClass: s.starClass,
      lifetime: s.lifetime,
      tiles: Array.from(s.tiles.entries()),
      turn: s.turn,
      phase: s.phase,
      elementCounts: s.elementCounts,
      score: s.score,
      phaseTransitions: s.phaseTransitions,
      astrophysicistMode: s.astrophysicistMode,
      hasPlayedHeliumLaugh: s.hasPlayedHeliumLaugh,
      hasSeenFe56Splash: s.hasSeenFe56Splash,
      wasAutoPlayedThisRun: s.wasAutoPlayedThisRun,
    };
    try {
      localStorage.setItem(saveKey(s.astrophysicistMode), JSON.stringify(data));
    } catch {
      // localStorage unavailable (private mode / quota) — skip silently.
    }
  },

  clearSavedGame: (isAstro) => {
    try {
      localStorage.removeItem(saveKey(isAstro));
    } catch {
      // ignore
    }
  },

  loadSavedGame: (isAstro) => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(saveKey(isAstro));
    } catch {
      return false;
    }
    if (!raw) return false;

    let data: SavedGame;
    try {
      data = JSON.parse(raw);
    } catch {
      return false;
    }
    if (!data || !Array.isArray(data.tiles) || data.tiles.length === 0) return false;
    if (!isAstro && (!getStarClass(data.starClass) || data.lifetime == null)) return false;

    const faces = generateTruncatedIcosahedron();
    const tiles = new Map<number, Tile>(data.tiles);
    const highScore = readBest(bestKeyFor({ astrophysicistMode: isAstro, starClass: data.starClass, currentLevelId: null }));

    set({
      starMass: data.starMass,
      starClass: isAstro ? null : data.starClass,
      lifetime: isAstro ? null : (data.lifetime ?? null),
      unlockedStarThisRun: null,
      faces,
      tiles,
      obstacles: new Map(),
      turn: data.turn,
      phase: data.phase,
      elementCounts: data.elementCounts,
      score: data.score,
      highScore: data.wasAutoPlayedThisRun ? highScore : Math.max(highScore, data.score || 0),
      phaseTransitions: data.phaseTransitions,
      currentLevelId: null,
      levelObjectiveMet: false,
      levelFailed: false,
      selectedFaceId: null,
      dragTargetId: null,
      isAnimating: false,
      endState: null,
      endReason: null,
      supernovaBonus: 0,
      astrophysicistMode: data.astrophysicistMode,
      activeSlide: undefined,
      lastMerge: undefined,
      blockedFaceId: null,
      blockedTime: 0,
      dragOffset3D: null,
      isPaused: false,
      showNucleationTutorial: false,
      history: [],
      hasPlayedHeliumLaugh: data.hasPlayedHeliumLaugh,
      lastMoveFaceId: null,
      hasSeenFe56Splash: data.hasSeenFe56Splash,
      showFe56Splash: false,
      wasAutoPlayedThisRun: data.wasAutoPlayedThisRun || false,
      systemToast: null,
      runGeneration: get().runGeneration + 1,
      lastActionWasUndo: false,
    });
    return true;
  },
  setPaused: (paused) => {
    set({ isPaused: paused });
  },
  setShowRealtimeGraphics: (show) => {
    set({ showRealtimeGraphics: show });
  },

  undo: () => {
    const state = get();
    if (state.isAnimating || state.history.length === 0) return;
    // One step of mercy, not a search tool: a second undo needs a move between.
    if (state.lastActionWasUndo) return;

    // Restore copies so the kept snapshot can never be touched by later moves.
    const snapshot = snapshotOf({ ...state, ...state.history[state.history.length - 1] } as GameState);
    set({
      tiles: snapshot.tiles,
      obstacles: snapshot.obstacles,
      turn: snapshot.turn,
      phase: snapshot.phase,
      phaseTransitions: snapshot.phaseTransitions,
      elementCounts: snapshot.elementCounts,
      levelObjectiveMet: snapshot.levelObjectiveMet,
      levelFailed: snapshot.levelFailed,
      endState: snapshot.endState,
      endReason: snapshot.endReason,
      supernovaBonus: 0,
      hasPlayedHeliumLaugh: snapshot.hasPlayedHeliumLaugh,
      lastMoveFaceId: snapshot.lastMoveFaceId,
      score: snapshot.score,
      selectedFaceId: null,
      dragTargetId: null,
      dragOffset3D: null,
      activeSlide: undefined,
      lastActionWasUndo: true,
    });
    get().saveCurrentGame();
  },

  dismissNucleationTutorial: () => {
    set({ showNucleationTutorial: false });
  },

  resetNucleationTutorial: () => {
    localStorage.removeItem('stellar_seen_nucleation');
    set({ hasSeenNucleationTutorial: false, showNucleationTutorial: false });
  },
  setManuallyZoomed: () => {
    localStorage.setItem('stellar_last_zoom_time', Date.now().toString());
    set({ hasManuallyZoomed: true });
  },
  setAutoPlay: (on) => {
    const wasAutoPlayedThisRun = on ? true : get().wasAutoPlayedThisRun;
    const systemToast = on ? "High score tracking disabled for this run" : get().systemToast;
    set({ 
      autoPlay: on, 
      autoRotateTargetFaceId: null,
      wasAutoPlayedThisRun,
      systemToast
    });
  },
  setAutoPlaySpeed: (speed) => {
    set({ autoPlaySpeed: speed });
  },
  setAutoPlayBot: (bot) => {
    writeDebugPref('stellar_debug_bot', bot);
    set({ autoPlayBot: bot, autoPlayNote: null });
  },
  setAutoPlayTurbo: (on) => {
    writeDebugPref('stellar_debug_turbo', String(on));
    set({ autoPlayTurbo: on, autoRotateTargetFaceId: null });
  },
  setAutoPlayLoop: (on) => {
    writeDebugPref('stellar_debug_loop', String(on));
    set({ autoPlayLoop: on });
  },
  logAutoRun: (record) => {
    const log = get().autoRunLog;
    if (log.some(r => r.run === record.run)) return;
    set({ autoRunLog: [record, ...log].slice(0, 8) });
  },
  clearAutoRunLog: () => {
    set({ autoRunLog: [] });
  },
  setAutoRotateTarget: (faceId) => {
    set({ autoRotateTargetFaceId: faceId });
  },
  toggleZenMode: () => {
    set(state => ({ showZenMode: !state.showZenMode }));
  },

  setEditorMode: (isOpen) => {
    if (isOpen) {
      set({
        isEditorMode: true,
        isPaused: false,
        currentLevelId: null,
        isTestingCustomScenario: false,
      });
      get().loadEditorDraft();
    } else {
      set({ isEditorMode: false, isTestingCustomScenario: false });
      get().newGame();
    }
  },

  setEditorBrush: (brush) => {
    set({ editorBrush: brush });
  },

  updateEditorMetadata: (metadata) => {
    set(state => ({
      editorLevelMetadata: {
        ...state.editorLevelMetadata,
        ...metadata,
      }
    }));
    get().saveEditorDraft();
  },

  applyEditorBrush: (faceId) => {
    const state = get();
    const brush = state.editorBrush;
    const tiles = new Map(state.tiles);
    const obstacles = new Map(state.obstacles);

    if (brush === 'clear') {
      tiles.delete(faceId);
      const obs = obstacles.get(faceId);
      if (obs && obs.type === 'wormhole' && obs.targetFaceId !== undefined) {
        const partner = obstacles.get(obs.targetFaceId);
        if (partner && partner.type === 'wormhole') {
          obstacles.set(obs.targetFaceId, { ...partner, targetFaceId: undefined });
        }
      }
      obstacles.delete(faceId);
    } else if (['H', 'He', 'C', 'O', 'Ne', 'Mg', 'Si', 'Fe'].includes(brush)) {
      tiles.set(faceId, { faceId, element: brush as ElementSymbol, spawnedAtTurn: 0 });
      const obs = obstacles.get(faceId);
      if (obs && (obs.type === 'gravity' || obs.type === 'wormhole')) {
        if (obs.type === 'wormhole' && obs.targetFaceId !== undefined) {
          const partner = obstacles.get(obs.targetFaceId);
          if (partner && partner.type === 'wormhole') {
            obstacles.set(obs.targetFaceId, { ...partner, targetFaceId: undefined });
          }
        }
        obstacles.delete(faceId);
      }
    } else if (brush === 'gravity') {
      tiles.delete(faceId);
      obstacles.set(faceId, { type: 'gravity', faceId });
    } else if (brush === 'cme') {
      const existing = obstacles.get(faceId);
      if (existing && existing.type === 'cme') {
        if (existing.state === 'inactive') {
          obstacles.set(faceId, { type: 'cme', faceId, state: 'warning' });
        } else if (existing.state === 'warning') {
          obstacles.set(faceId, { type: 'cme', faceId, state: 'active' });
        } else {
          obstacles.delete(faceId);
        }
      } else {
        obstacles.set(faceId, { type: 'cme', faceId, state: 'inactive' });
      }
    } else if (brush === 'wormhole') {
      tiles.delete(faceId);
      const existing = obstacles.get(faceId);
      if (existing && existing.type === 'wormhole') {
        if (existing.targetFaceId !== undefined) {
          const partner = obstacles.get(existing.targetFaceId);
          if (partner && partner.type === 'wormhole') {
            obstacles.set(existing.targetFaceId, { ...partner, targetFaceId: undefined });
          }
        }
        obstacles.delete(faceId);
      } else {
        let unpairedId: number | null = null;
        for (const [id, obs] of obstacles.entries()) {
          if (obs.type === 'wormhole' && obs.targetFaceId === undefined) {
            unpairedId = id;
            break;
          }
        }
        if (unpairedId !== null) {
          obstacles.set(faceId, { type: 'wormhole', faceId, targetFaceId: unpairedId });
          obstacles.set(unpairedId, { type: 'wormhole', faceId: unpairedId, targetFaceId: faceId });
        } else {
          obstacles.set(faceId, { type: 'wormhole', faceId });
        }
      }
    }

    set({ tiles, obstacles });
    get().saveEditorDraft();
  },

  saveEditorDraft: () => {
    const state = get();
    const draft = {
      metadata: state.editorLevelMetadata,
      tiles: Array.from(state.tiles.entries()),
      obstacles: Array.from(state.obstacles.entries()),
    };
    localStorage.setItem('stellar_editor_draft', JSON.stringify(draft));
  },

  loadEditorDraft: () => {
    try {
      const raw = localStorage.getItem('stellar_editor_draft');
      if (raw) {
        const draft = JSON.parse(raw);
        set({
          editorLevelMetadata: draft.metadata,
          tiles: new Map(draft.tiles),
          obstacles: new Map(draft.obstacles),
        });
      } else {
        set({
          editorLevelMetadata: {
            title: 'New Scenario',
            description: 'Use the editor to build your custom nucleosynthesis puzzle.',
            author: 'Stellar Architect',
            starMass: 4.0,
            maxTurns: 10,
            parMoves: 6,
            objectives: [{ type: 'has_element', element: 'He', count: 1, hint: 'Create Helium' }],
            disableSpawns: true,
          },
          tiles: new Map(),
          obstacles: new Map(),
        });
      }
    } catch (err) {
      console.error('Failed to load editor draft:', err);
    }
  },

  publishScenario: () => {
    const state = get();
    const meta = state.editorLevelMetadata;
    const initialTiles = Array.from(state.tiles.entries()).map(([faceId, t]) => ({
      faceId,
      element: t.element,
    }));
    const levelObstacles = Array.from(state.obstacles.values());

    const currentScenarios = [...state.customScenarios];
    let levelId = (meta as any).id;
    let isNew = false;
    if (!levelId) {
      levelId = 1000 + (Date.now() % 100000);
      isNew = true;
      (meta as any).id = levelId;
      set({ editorLevelMetadata: { ...meta, id: levelId } as any });
      get().saveEditorDraft();
    }

    const newLevel: Level = {
      id: levelId,
      title: meta.title,
      description: meta.description,
      author: meta.author,
      starMass: meta.starMass,
      maxTurns: meta.maxTurns,
      parMoves: meta.parMoves,
      initialTiles,
      objectives: meta.objectives,
      campaign: 'custom',
      disableSpawns: meta.disableSpawns,
      obstacles: levelObstacles,
    };

    let nextScenarios;
    if (isNew) {
      nextScenarios = [...currentScenarios, newLevel];
    } else {
      nextScenarios = currentScenarios.map(l => (l.id === levelId ? newLevel : l));
      if (!currentScenarios.some(l => l.id === levelId)) {
        nextScenarios = [...currentScenarios, newLevel];
      }
    }

    localStorage.setItem('stellar_custom_scenarios', JSON.stringify(nextScenarios));
    set({ customScenarios: nextScenarios });
  },

  deleteScenario: (id) => {
    const nextScenarios = get().customScenarios.filter(l => l.id !== id);
    localStorage.setItem('stellar_custom_scenarios', JSON.stringify(nextScenarios));
    set({ customScenarios: nextScenarios });
  },

  loadScenarioForEditing: (level) => {
    const initialTiles = new Map<number, Tile>();
    for (const t of level.initialTiles) {
      initialTiles.set(t.faceId, { faceId: t.faceId, element: t.element, spawnedAtTurn: 0 });
    }
    const initialObstacles = new Map<number, ObstacleInstance>();
    if (level.obstacles) {
      for (const obs of level.obstacles) {
        initialObstacles.set(obs.faceId, { ...obs });
      }
    }

    const metadata = {
      id: level.id,
      title: level.title,
      description: level.description,
      author: level.author,
      starMass: level.starMass,
      maxTurns: level.maxTurns,
      parMoves: level.parMoves,
      objectives: level.objectives,
      disableSpawns: level.disableSpawns ?? true,
    };

    set({
      isEditorMode: true,
      editorLevelMetadata: metadata as any,
      tiles: initialTiles,
      obstacles: initialObstacles,
      isTestingCustomScenario: false,
    });
    get().saveEditorDraft();
  },
}));
