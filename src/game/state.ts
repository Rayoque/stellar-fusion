// src/game/state.ts
import { create } from 'zustand';
import type { GameState, EndState, Phase, ElementSymbol, Tile, ObstacleInstance, Level } from './types';
import { generateTruncatedIcosahedron } from '../geometry/truncatedIcosahedron';
import { ELEMENTS } from './elements';
import { currentPhaseRule, updatePhase } from './phases';
import { spawnHydrogen } from './spawn';
import { checkEndState } from './endgame';
import { detectMerge, applyMerge, DECAY_POINTS } from './rules';
import { executeSlide } from '../geometry/slide';
import { playMerge, playBlocked, playHeliumLaugh, playSuccess, playSlide, playSpawnTick } from '../audio/synth';
import { LEVELS, findLevel } from './levels';

function submitScoreToGameCenter(score: number, isAstro: boolean): void {
  try {
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      const GameServices = (window as any).Capacitor.Plugins.GameServices;
      if (GameServices) {
        const leaderboardId = isAstro ? 'stellar_fusion_astro_leaderboard' : 'stellar_fusion_standard_leaderboard';
        GameServices.submitScore({ leaderboardId, score }).catch(() => {});
      }
    }
  } catch (err) {}
}

interface GameActions {
  newGame: (mass?: number, levelId?: number, isAstro?: boolean) => void;
  startDrag: (faceId: number) => void;
  endDrag: (faceId: number, dragWorld: { x: number; y: number; z: number }) => void;
  setDragTargetId: (id: number | null) => void;
  updatePhaseIfNeeded: () => void;
  reset: () => void;
  setPaused: (paused: boolean) => void;
  setShowRealtimeGraphics: (show: boolean) => void;
  dismissToast: () => void;
  continueEndless: () => void;
  undo: () => void;
  dismissNucleationTutorial: () => void;
  resetNucleationTutorial: () => void;
  setManuallyZoomed: () => void;
  saveCurrentGame: () => void;
  loadSavedGame: (isAstro: boolean) => boolean;
  clearSavedGame: (isAstro: boolean) => void;
  setAutoPlay: (on: boolean) => void;
  setAutoPlaySpeed: (speed: number) => void;
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
(function migrateStorage() {
  try {
    if (localStorage.getItem('stellar_storage_version') !== STORAGE_VERSION) {
      localStorage.removeItem('stellar_completed_levels');
      localStorage.removeItem('stellar_unlocked_elements');
      localStorage.setItem('stellar_storage_version', STORAGE_VERSION);
    }
  } catch {
    // localStorage unavailable (e.g. private mode); nothing to migrate
  }
})();

// --- Open-ended game persistence (Endless/standard + Astrophysicist) ---
// Campaign levels are NOT persisted. Geometry is deterministic, so a save only
// needs tiles + scalar state; faces are regenerated on load.
interface SavedGame {
  starMass: number;
  tiles: [number, Tile][];
  turn: number;
  phase: Phase;
  elementCounts: Record<ElementSymbol, number>;
  score: number;
  phaseTransitions: GameState['phaseTransitions'];
  endlessMode: boolean;
  astrophysicistMode: boolean;
  hasPlayedHeliumLaugh: boolean;
  hasSeenFe56Splash: boolean;
  wasAutoPlayedThisRun?: boolean;
}

const saveKey = (isAstro: boolean) => (isAstro ? 'stellar_save_astro' : 'stellar_save_standard');

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

  selectedFaceId: null,
  dragTargetId: null,
  isAnimating: false,
  endState: null,
  endlessMode: false,
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

  newGame: (mass, levelId, isAstro) => {
    const faces = generateTruncatedIcosahedron();
    let starMass = mass ?? (1 + Math.random() * 29); // 1–30 M☉
    const initialTiles = new Map<number, Tile>();
    const initialObstacles = new Map<number, ObstacleInstance>();
    let currentLevelId: number | null = null;
    const isAstroMode = isAstro ?? false;

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

    // Dynamic initial element counting to support standard elements + custom isotopes
    const initialCounts = {} as Record<ElementSymbol, number>;
    for (const t of initialTiles.values()) {
      if (!initialCounts[t.element]) {
        initialCounts[t.element] = 0;
      }
      initialCounts[t.element]++;
    }

    const lsKey = isAstroMode ? 'stellar_high_score_astro' : 'stellar_high_score';
    const highScore = parseInt(localStorage.getItem(lsKey) || '0', 10);

    set({
      starMass,
      faces,
      tiles: initialTiles,
      obstacles: initialObstacles,
      turn: 0,
      phase: 'main_sequence',
      elementCounts: initialCounts,
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
      endlessMode: false,
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
    // the run while we're awaiting an animation below, the mutated `state`
    // snapshot would clobber the fresh game — so re-check after every await.
    const runGen = state.runGeneration;

    set({ isAnimating: true, selectedFaceId: null, dragTargetId: null });

    try {
      let levelObjectiveMet = false;
      let levelFailed = false;
      let activeToastElement: ElementSymbol | null = null;
      // Execute slide
      const slideResult = executeSlide(fromFaceId, dragWorld as any, state);
      
      let moved = slideResult.path.length > 1;
      if (slideResult.stoppedReason === 'merge') {
        if (slideResult.path.length === 1) {
          // If we didn't slide through any empty spaces, we only count as moved if a merge is actually valid
          const tempMergeRule = detectMerge(fromFaceId, state);
          if (tempMergeRule) {
            moved = true;
          }
        } else {
          moved = true;
        }
      }
      console.log('Slide result:', slideResult, 'moved:', moved);

      if (moved) {
        const tile = state.tiles.get(fromFaceId)!;
        const duration = (slideResult.path.length - 1) * 180;
        
        // Play slide sound (synesthetic pitch mapped)
        playSlide(tile.element, slideResult.path.length - 1);
        
        // Save pre-move snapshot to history stack
        const snapshot = {
          tiles: new Map(state.tiles),
          turn: state.turn,
          phase: state.phase,
          elementCounts: { ...state.elementCounts },
          levelObjectiveMet: state.levelObjectiveMet,
          levelFailed: state.levelFailed,
          endState: state.endState,
          hasPlayedHeliumLaugh: state.hasPlayedHeliumLaugh,
          endlessMode: state.endlessMode,
          score: state.score,
        };
        const nextHistory = [...state.history, snapshot];
        
        // Remove tile from original position for animation
        state.tiles.delete(fromFaceId);
        
        const landedId = slideResult.path[slideResult.path.length - 1];
        const isPentagon = state.faces[landedId]?.shape === 'pentagon';
        const willSelfFuse = tile.element === 'H' && isPentagon;
        const willMerge = slideResult.stoppedReason === 'merge' || willSelfFuse;

        set({
          isAnimating: true,
          selectedFaceId: null,
          dragTargetId: null,
          dragOffset3D: null,
          tiles: new Map(state.tiles),
          history: nextHistory,
          activeSlide: {
            element: tile.element,
            path: slideResult.path,
            startTime: performance.now(),
            duration,
            isMerge: willMerge
          }
        });

        // Wait for slide animation
        await new Promise(r => setTimeout(r, duration));

        // Run was replaced mid-animation (reset, retry, mode switch) — abort
        // before committing anything from the dead run.
        if (get().runGeneration !== runGen) return;

        // Place tile at destination and handle merge detection
        let mergeRule = null;
        let mergeLandedId = landedId;
        const isMerge = slideResult.stoppedReason === 'merge';

        if (isMerge) {
          // If stopped due to a merge, the swiped tile travels into the target face.
          // To detect the merge correctly without overwriting the target tile,
          // we temporarily place the swiped tile at the preceding face.
          const beforeFaceId = slideResult.path[slideResult.path.length - 2];
          state.tiles.set(beforeFaceId, { ...tile, faceId: beforeFaceId });
          
          mergeRule = detectMerge(beforeFaceId, state, landedId);
          mergeLandedId = beforeFaceId;
          
          if (!mergeRule) {
            // Safety fallback: if no merge rule was actually detected, leave the tile at beforeFaceId
            console.warn('Merge reason stopped, but no merge rule was detected.');
          }
        } else {
          // Normal landing
          state.tiles.set(landedId, { ...tile, faceId: landedId, spawnReason: 'slide' });
          const isPentagon = state.faces[landedId]?.shape === 'pentagon';
          if (tile.element === 'H' && isPentagon) {
            mergeRule = detectMerge(landedId, state);
          } else {
            mergeRule = null;
          }
          mergeLandedId = landedId;
        }

        console.log('Merge rule detected:', mergeRule);
        const isNucleation = mergeRule !== null && mergeRule.requiresPentagon === true;

        if (mergeRule) {
          const parentElement = tile.element;
          applyMerge(mergeRule, mergeLandedId, state, isMerge ? landedId : undefined);
          playMerge(parentElement, mergeRule.output);
          // Eslint-clean, snappy instant merges just like 2048: no artificial lag or delays!

          // Trigger Astrophysicist Mode Iron-56 Synthesis Congratulations Overlay
          if (state.astrophysicistMode && mergeRule.output === 'Fe56' && !state.hasSeenFe56Splash) {
            state.levelObjectiveMet = true;
            state.showFe56Splash = true;
            state.hasSeenFe56Splash = true;
            playSuccess();
          }
        }

        // Vaporize tiles sitting on active CMEs (pre-turn check)
        if (state.obstacles) {
          for (const [faceId, obs] of state.obstacles.entries()) {
            if (obs.type === 'cme' && obs.state === 'active') {
              state.tiles.delete(faceId);
            }
          }
        }

        // Increment turn
        state.turn += 1;

        // Gravitational Anomaly Repulsion: Push adjacent tiles 1 step away into empty neighbors
        if (state.obstacles) {
          const pushedTiles = new Map<number, number>();
          for (const [faceId, obs] of state.obstacles.entries()) {
            if (obs.type !== 'gravity') continue;
            const A = state.faces[faceId];
            if (!A) continue;
            for (const B_id of A.neighbors) {
              if (state.tiles.has(B_id)) {
                const B = state.faces[B_id];
                let bestC_id = -1;
                let minDot = Infinity;
                for (const C_id of B.neighbors) {
                  if (C_id === faceId) continue;
                  const C = state.faces[C_id];
                  const dotVal = A.center.x * C.center.x + A.center.y * C.center.y + A.center.z * C.center.z;
                  if (dotVal < minDot) {
                    minDot = dotVal;
                    bestC_id = C_id;
                  }
                }
                if (bestC_id !== -1) {
                  const hasTile = state.tiles.has(bestC_id);
                  const hasGravity = state.obstacles.get(bestC_id)?.type === 'gravity';
                  if (!hasTile && !hasGravity) {
                    pushedTiles.set(B_id, bestC_id);
                  }
                }
              }
            }
          }
          if (pushedTiles.size > 0) {
            const nextTiles = new Map(state.tiles);
            for (const [fromId, toId] of pushedTiles.entries()) {
              const tileVal = nextTiles.get(fromId);
              if (tileVal) {
                nextTiles.delete(fromId);
                nextTiles.set(toId, { ...tileVal, faceId: toId, spawnReason: 'slide' });
              }
            }
            state.tiles = nextTiles;
          }
        }

        // Cycle CME phases: inactive -> warning -> active -> inactive
        if (state.obstacles) {
          const nextObstacles = new Map(state.obstacles);
          for (const [faceId, obs] of nextObstacles.entries()) {
            if (obs.type === 'cme') {
              let nextState: 'inactive' | 'warning' | 'active' = 'inactive';
              if (obs.state === 'inactive') nextState = 'warning';
              else if (obs.state === 'warning') nextState = 'active';
              else nextState = 'inactive';
              nextObstacles.set(faceId, { ...obs, state: nextState });
            }
          }
          state.obstacles = nextObstacles;

          // Vaporize tiles sitting on newly active CMEs (post-turn check)
          for (const [faceId, obs] of state.obstacles.entries()) {
            if (obs.type === 'cme' && obs.state === 'active') {
              state.tiles.delete(faceId);
            }
          }
        }

        // Astrophysicist Mode: Decay Stage
        if (state.astrophysicistMode) {
          for (const tile of state.tiles.values()) {
            if (tile.decayTurns !== undefined) {
              // Confinement Shield: Freeze decay countdown if tile sits on a pentagon nucleation site!
              const face = state.faces[tile.faceId];
              if (face && face.shape === 'pentagon') {
                continue; // Skip decrementing, decay timer is shielded/frozen!
              }

              tile.decayTurns -= 1;
              if (tile.decayTurns <= 0) {
                let decayed = false;
                let nextElement: ElementSymbol = tile.element;
                if (tile.element === 'Be7') {
                  nextElement = 'He4';
                  decayed = true;
                } else if (tile.element === 'Be8') {
                  nextElement = 'He4';
                  decayed = true;
                } else if (tile.element === 'Ne20') {
                  nextElement = 'O16';
                  decayed = true;
                } else if (tile.element === 'Fe52') {
                  nextElement = 'Cr48';
                  decayed = true;
                } else if (tile.element === 'Ni56') {
                  nextElement = 'Fe56';
                  decayed = true;
                }

                if (decayed) {
                  state.score = (state.score || 0) + (DECAY_POINTS[tile.element] ?? 0);
                  tile.element = nextElement;
                  tile.spawnedAtTurn = state.turn; // mark as transformed on this turn
                  tile.spawnReason = 'slide';      // trigger animation
                  tile.decayTurns = undefined;     // stable output

                  // Fe56 only ever arises from Ni56 decay (the alpha ladder
                  // tops out at Ni56), so the synthesis congratulations must
                  // fire HERE — the merge-output check can never reach it.
                  if (nextElement === 'Fe56' && !state.hasSeenFe56Splash) {
                    state.showFe56Splash = true;
                    state.hasSeenFe56Splash = true;
                    playSuccess();
                  }
                }
              }
            }
          }
        }

        // Record last move face ID and spawn hydrogen(s)
        state.lastMoveFaceId = landedId;
        spawnHydrogen(state);

        // Recount elementCounts dynamically to support standard mode + astrophysicist mode custom isotopes
        const newCounts = {} as Record<ElementSymbol, number>;
        for (const t of state.tiles.values()) {
          if (!newCounts[t.element]) {
            newCounts[t.element] = 0;
          }
          newCounts[t.element]++;
        }
        state.elementCounts = newCounts;

        // Check high score
        if (!state.wasAutoPlayedThisRun && state.score > state.highScore) {
          state.highScore = state.score;
          const lsKey = state.astrophysicistMode ? 'stellar_high_score_astro' : 'stellar_high_score';
          localStorage.setItem(lsKey, state.highScore.toString());
          submitScoreToGameCenter(state.score, state.astrophysicistMode);
        }

        // Update phase
        updatePhase(state);

        // Helium "HeHeHe" Easter Egg trigger: requires >= 26 Helium (80% of 32 faces),
        // plays only once per game, has a 60% chance to trigger each turn,
        // and plays with a 1-second delay for suspense!
        if (newCounts.He >= 26 && !state.hasPlayedHeliumLaugh) {
          if (Math.random() < 0.60) {
            state.hasPlayedHeliumLaugh = true;
            set({ hasPlayedHeliumLaugh: true });
            setTimeout(() => {
              playHeliumLaugh();
            }, 1000);
          }
        }

        // Check and unlock new elements in Codex
        const currentUnlocked = get().unlockedElements;
        const nextUnlocked = [...currentUnlocked];
        activeToastElement = null;
        let changedUnlocked = false;

        for (const sym of Object.keys(newCounts) as ElementSymbol[]) {
          if (newCounts[sym] > 0 && !nextUnlocked.includes(sym)) {
            nextUnlocked.push(sym);
            activeToastElement = sym; // trigger toast notification
            changedUnlocked = true;
          }
        }

        if (changedUnlocked) {
          localStorage.setItem('stellar_unlocked_elements', JSON.stringify(nextUnlocked));
          set({ unlockedElements: nextUnlocked });
        }

        // Check Campaign Scenario Objectives
        levelObjectiveMet = false;
        levelFailed = false;

        if (state.currentLevelId !== null) {
          const level = findLevel(state.currentLevelId, get().customScenarios, get().editorLevelMetadata);
          if (level) {
            let allObjectivesMet = true;
            for (const obj of level.objectives) {
              if (obj.type === 'has_element') {
                if ((state.elementCounts[obj.element!] || 0) < (obj.count || 1)) {
                  allObjectivesMet = false;
                }
              } else if (obj.type === 'has_element_on_pentagon') {
                const met = Array.from(state.tiles.values()).some(t => {
                  const face = state.faces[t.faceId];
                  return t.element === obj.element && face && face.shape === 'pentagon';
                });
                if (!met) allObjectivesMet = false;
              } else if (obj.type === 'has_element_count') {
                if ((state.elementCounts[obj.element!] || 0) < (obj.count || 1)) {
                  allObjectivesMet = false;
                }
              } else if (obj.type === 'has_all_elements') {
                const required: ElementSymbol[] = ['H', 'He', 'C', 'O', 'Ne', 'Mg', 'Si', 'Fe'];
                const allPresent = required.every(el => (state.elementCounts[el] || 0) > 0);
                if (!allPresent) allObjectivesMet = false;
              }
            }

            if (allObjectivesMet) {
              levelObjectiveMet = true;

              // Only built-in campaign levels count toward progression —
              // custom scenarios and editor playtests must not inflate the
              // completion count that gates Astrophysicist Mode.
              const isCampaignLevel = LEVELS.some(l => l.id === level.id);

              const currentCompleted = get().completedLevels;
              let nextCompleted = currentCompleted;
              if (isCampaignLevel && !currentCompleted.includes(level.id)) {
                nextCompleted = [...currentCompleted, level.id];
                localStorage.setItem('stellar_completed_levels', JSON.stringify(nextCompleted));
              }

              const currentPerfect = get().perfectLevels || [];
              let nextPerfect = currentPerfect;
              if (isCampaignLevel && state.turn <= (level as any).parMoves && !currentPerfect.includes(level.id)) {
                nextPerfect = [...currentPerfect, level.id];
                localStorage.setItem('stellar_perfect_levels', JSON.stringify(nextPerfect));
              }

              set({ completedLevels: nextCompleted, perfectLevels: nextPerfect });

              if (!state.levelObjectiveMet) {
                playSuccess();
              }
            } else if (state.turn >= level.maxTurns) {
              levelFailed = true;
            }
          }
        }

        // Check end state (standard jammed or collapse)
        const end = checkEndState(state);
        if (end) {
          // If in campaign mode and objectives aren't met, a jammed board means failure
          if (state.currentLevelId !== null && !levelObjectiveMet) {
            levelFailed = true;
          }
          const triggerTutorial = isNucleation && !state.hasSeenNucleationTutorial;
          if (triggerTutorial) {
            localStorage.setItem('stellar_seen_nucleation', 'true');
          }
          set({ 
            endState: end, 
            levelObjectiveMet,
            levelFailed,
            isAnimating: false, 
            activeSlide: undefined, 
            tiles: new Map(state.tiles),
            showNucleationTutorial: triggerTutorial,
            hasSeenNucleationTutorial: triggerTutorial ? true : state.hasSeenNucleationTutorial,
            score: state.score,
            highScore: state.highScore,
            phase: state.phase,
            turn: state.turn,
            elementCounts: { ...state.elementCounts },
          });
          // True end-of-run: clear the saved game so re-entering starts fresh.
          // Standard collapses/jams here; Astrophysicist only reaches an end via
          // 'jammed' (no legal moves), which is its intended full-stop reset point.
          get().clearSavedGame(state.astrophysicistMode);
          return;
        }

        // Snappy, lag-free settle delay: exactly 40ms to clear mobile pointer events while maintaining instant response
        const settleDelay = 40;
        await new Promise(r => setTimeout(r, settleDelay));

        if (get().runGeneration !== runGen) return;

        const triggerTutorial = isNucleation && !state.hasSeenNucleationTutorial;
        if (triggerTutorial) {
          localStorage.setItem('stellar_seen_nucleation', 'true');
        }

        set({
          tiles: new Map(state.tiles), // trigger reactivity
          turn: state.turn,
          phase: state.phase,
          elementCounts: { ...state.elementCounts },
          levelObjectiveMet,
          levelFailed,
          activeToastElement,
          isAnimating: false,
          activeSlide: undefined,
          lastMerge: state.lastMerge,
          showNucleationTutorial: triggerTutorial,
          hasSeenNucleationTutorial: triggerTutorial ? true : state.hasSeenNucleationTutorial,
          score: state.score,
          highScore: state.highScore,
          lastActionWasUndo: false,
        });
        // Persist the in-progress open-ended game after each committed move.
        get().saveCurrentGame();
      } else {
        // Play blocked audio cue
        playBlocked();

        // Trigger blocked visual shake
        set({
          blockedFaceId: fromFaceId,
          blockedTime: performance.now(),
          selectedFaceId: null,
          dragTargetId: null,
          dragOffset3D: null,
          isAnimating: false,
        });

        // Reset after 350ms so shake terminates cleanly
        setTimeout(() => {
          set({ blockedFaceId: null });
        }, 350);
        return;
      }
    } catch (e) {
      console.error('Error in endDrag:', e);
      set({ isAnimating: false, selectedFaceId: null, dragTargetId: null, dragOffset3D: null });
    }
  },

  setDragTargetId: (id) => {
    set({ dragTargetId: id });
  },

  updatePhaseIfNeeded: () => {
    const state = get();
    const changed = updatePhase(state);
    if (changed) {
      set({ phase: state.phase });
    }
  },

  reset: () => {
    const { astrophysicistMode, currentLevelId } = get();
    if (currentLevelId !== null) {
      // Campaign reset behavior unchanged.
      get().newGame();
      return;
    }
    // Open-ended modes: wipe the saved game and start fresh in the SAME mode.
    get().clearSavedGame(astrophysicistMode);
    get().newGame(undefined, undefined, astrophysicistMode);
  },

  saveCurrentGame: () => {
    const s = get();
    // Only persist live, open-ended runs. Skip:
    //  - campaign levels (not persisted)
    //  - an empty board
    //  - a finished run (endState set) — cleared at end-of-run, must stay cleared
    //  - the post-collapse degeneracy phase (endlessMode): the star has already
    //    collapsed and no hydrogen spawns, so anything past that is moot. High score
    //    still tracks, but leaving and returning gives a fresh Endless sandbox.
    if (s.currentLevelId !== null || s.tiles.size === 0 || s.endState !== null || s.endlessMode) return;
    const data: SavedGame = {
      starMass: s.starMass,
      tiles: Array.from(s.tiles.entries()),
      turn: s.turn,
      phase: s.phase,
      elementCounts: s.elementCounts,
      score: s.score,
      phaseTransitions: s.phaseTransitions,
      endlessMode: s.endlessMode,
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

    const faces = generateTruncatedIcosahedron();
    const tiles = new Map<number, Tile>(data.tiles);
    const lsKey = isAstro ? 'stellar_high_score_astro' : 'stellar_high_score';
    const highScore = parseInt(localStorage.getItem(lsKey) || '0', 10);

    set({
      starMass: data.starMass,
      faces,
      tiles,
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
      endlessMode: data.endlessMode,
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
  continueEndless: () => {
    const state = get();
    if (!state.endState) return;

    let nextTiles = new Map(state.tiles);

    if (state.endState) {
      const faceIds = Array.from(nextTiles.keys());
      faceIds.sort((a, b) => {
        const tA = nextTiles.get(a);
        const tB = nextTiles.get(b);
        const elA = tA ? ELEMENTS[tA.element].atomicNumber : 99;
        const elB = tB ? ELEMENTS[tB.element].atomicNumber : 99;
        return elA - elB;
      });

      // Shed 4 lightest tiles to free up board space
      const toRemove = faceIds.slice(0, 4);
      for (const id of toRemove) {
        nextTiles.delete(id);
      }
    }

    // Recount elementCounts to keep HUD and phase in sync immediately!
    const newCounts: Record<ElementSymbol, number> = {
      H: 0, He: 0, C: 0, O: 0, Ne: 0, Mg: 0, Si: 0, Fe: 0,
      D: 0, He3: 0, He4: 0, Be7: 0, Be8: 0, C12: 0, O16: 0, Ne20: 0, Mg24: 0, Si28: 0, S32: 0, Ar36: 0, Ca40: 0, Ti44: 0, Cr48: 0, Fe52: 0, Ni56: 0, Fe56: 0
    };
    for (const t of nextTiles.values()) {
      newCounts[t.element]++;
    }

    // Update phase rules with new counts
    const tempState = { ...state, tiles: nextTiles, elementCounts: newCounts };
    updatePhase(tempState);

    set({
      endState: null,
      endlessMode: true,
      isAnimating: false,
      activeSlide: undefined,
      tiles: nextTiles,
      elementCounts: newCounts,
      phase: tempState.phase
    });
    // Past the collapse (degeneracy phase) we intentionally do NOT persist — drop any
    // existing save so quitting and returning starts a fresh Endless sandbox.
    get().clearSavedGame(false);
  },

  undo: () => {
    const state = get();
    if (state.isAnimating || state.history.length === 0) return;
    // One step of mercy, not a search tool: a second undo needs a move between.
    if (state.lastActionWasUndo) return;

    const nextHistory = [...state.history];
    const snapshot = nextHistory.pop()!;

    set({
      tiles: snapshot.tiles,
      turn: snapshot.turn,
      phase: snapshot.phase,
      elementCounts: snapshot.elementCounts,
      levelObjectiveMet: snapshot.levelObjectiveMet,
      levelFailed: snapshot.levelFailed,
      endState: snapshot.endState,
      hasPlayedHeliumLaugh: (snapshot as any).hasPlayedHeliumLaugh ?? false,
      endlessMode: (snapshot as any).endlessMode ?? false,
      score: (snapshot as any).score ?? 0,
      history: nextHistory,
      selectedFaceId: null,
      dragTargetId: null,
      dragOffset3D: null,
      activeSlide: undefined,
      lastActionWasUndo: true,
    });
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
