// src/game/state.ts
import { create } from 'zustand';
import type { GameState, EndState, Phase, ElementSymbol, Tile } from './types';
import { generateTruncatedIcosahedron } from '../geometry/truncatedIcosahedron';
import { ELEMENTS } from './elements';
import { currentPhaseRule, updatePhase } from './phases';
import { spawnHydrogen } from './spawn';
import { checkEndState } from './endgame';
import { detectMerge, applyMerge, DECAY_POINTS } from './rules';
import { executeSlide } from '../geometry/slide';
import { playMerge, playBlocked, playHeliumLaugh, playSuccess } from '../audio/synth';
import { LEVELS } from './levels';

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
}

type GameStore = GameState & GameActions;

const initialElementCounts = (): Record<ElementSymbol, number> => ({
  H: 0, He: 0, C: 0, O: 0, Ne: 0, Mg: 0, Si: 0, Fe: 0,
  D: 0, He3: 0, He4: 0, Be7: 0, Be8: 0, C12: 0, O16: 0, Ne20: 0, Mg24: 0, Si28: 0, S32: 0, Ar36: 0, Ca40: 0, Ti44: 0, Cr48: 0, Fe52: 0, Ni56: 0, Fe56: 0
});

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
  levelObjectiveMet: false,
  levelFailed: false,
  unlockedElements: JSON.parse(localStorage.getItem('stellar_unlocked_elements') || '["H", "He"]'),
  activeToastElement: null,

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

  dismissToast: () => {
    set({ activeToastElement: null });
  },

  newGame: (mass, levelId, isAstro) => {
    const faces = generateTruncatedIcosahedron();
    let starMass = mass ?? (1 + Math.random() * 29); // 1–30 M☉
    const initialTiles = new Map<number, Tile>();
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
      const level = LEVELS.find(l => l.id === levelId);
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
        }

        // Increment turn
        state.turn += 1;

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
                }
              }
            }
          }
        }

        // Spawn hydrogen(s)
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
        if (state.score > state.highScore) {
          state.highScore = state.score;
          const lsKey = state.astrophysicistMode ? 'stellar_high_score_astro' : 'stellar_high_score';
          localStorage.setItem(lsKey, state.highScore.toString());
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
          const level = LEVELS.find(l => l.id === state.currentLevelId);
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
              const currentCompleted = get().completedLevels;
              if (!currentCompleted.includes(level.id)) {
                const nextCompleted = [...currentCompleted, level.id];
                localStorage.setItem('stellar_completed_levels', JSON.stringify(nextCompleted));
                set({ completedLevels: nextCompleted });
              }
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
          });
          return;
        }

        // Snappy, lag-free settle delay: exactly 40ms to clear mobile pointer events while maintaining instant response
        const settleDelay = 40;
        await new Promise(r => setTimeout(r, settleDelay));

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
        });
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
    get().newGame();
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
  },

  undo: () => {
    const state = get();
    if (state.isAnimating || state.history.length === 0) return;

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
    });
  },

  dismissNucleationTutorial: () => {
    set({ showNucleationTutorial: false });
  },

  resetNucleationTutorial: () => {
    localStorage.removeItem('stellar_seen_nucleation');
    set({ hasSeenNucleationTutorial: false, showNucleationTutorial: false });
  },
}));
