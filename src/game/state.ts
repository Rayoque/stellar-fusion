// src/game/state.ts
import { create } from 'zustand';
import type { GameState, EndState, Phase, ElementSymbol, Tile } from './types';
import { generateTruncatedIcosahedron } from '../geometry/truncatedIcosahedron';
import { ELEMENTS } from './elements';
import { currentPhaseRule, updatePhase } from './phases';
import { spawnHydrogen } from './spawn';
import { checkEndState } from './endgame';
import { detectMerge, applyMerge } from './rules';
import { executeSlide } from '../geometry/slide';
import { playMerge } from '../audio/synth';

interface GameActions {
  newGame: (mass?: number) => void;
  startDrag: (faceId: number) => void;
  endDrag: (faceId: number, dragWorld: { x: number; y: number; z: number }) => void;
  setDragTargetId: (id: number | null) => void;
  updatePhaseIfNeeded: () => void;
  reset: () => void;
}

type GameStore = GameState & GameActions;

const initialElementCounts = (): Record<ElementSymbol, number> => ({
  H: 0, He: 0, C: 0, O: 0, Ne: 0, Mg: 0, Si: 0, Fe: 0
});

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial empty state — populated by newGame()
  starMass: 0,
  faces: [],
  tiles: new Map(),
  turn: 0,
  phase: 'main_sequence',
  elementCounts: initialElementCounts(),
  selectedFaceId: null,
  dragTargetId: null,
  isAnimating: false,
  endState: null,

  newGame: (mass) => {
    const starMass = mass ?? (1 + Math.random() * 29); // 1–30 M☉
    const faces = generateTruncatedIcosahedron();

    const initialTiles = new Map<number, Tile>();
    // Spawn initial ~5 hydrogens
    const emptyIndices = faces.map((_, i) => i);
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

    const initialCounts = initialElementCounts();
    for (const t of initialTiles.values()) initialCounts[t.element]++;

    set({
      starMass,
      faces,
      tiles: initialTiles,
      turn: 0,
      phase: 'main_sequence',
      elementCounts: initialCounts,
      selectedFaceId: null,
      dragTargetId: null,
      isAnimating: false,
      endState: null,
      activeSlide: undefined,
      lastMerge: undefined,
    });
  },

  startDrag: (faceId) => {
    const state = get();
    if (state.isAnimating || state.endState) return;
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
      // Execute slide
      const slideResult = executeSlide(fromFaceId, dragWorld as any, state);
      const moved = slideResult.path.length > 1 || slideResult.stoppedReason === 'merge';
      console.log('Slide result:', slideResult, 'moved:', moved);

      if (moved) {
        const tile = state.tiles.get(fromFaceId)!;
        const duration = (slideResult.path.length - 1) * 150;
        
        // Remove tile from original position for animation
        state.tiles.delete(fromFaceId);
        
        set({
          isAnimating: true,
          selectedFaceId: null,
          dragTargetId: null,
          tiles: new Map(state.tiles),
          activeSlide: {
            element: tile.element,
            path: slideResult.path,
            startTime: performance.now(),
            duration
          }
        });

        // Wait for slide animation
        await new Promise(r => setTimeout(r, duration));
        
        // Place tile at destination
        const landedId = slideResult.path[slideResult.path.length - 1];
        state.tiles.set(landedId, { ...tile, faceId: landedId });

        // Check for merge at landing position
        const mergeRule = detectMerge(landedId, state);
        console.log('Merge rule detected:', mergeRule);

        if (mergeRule) {
          const parentElement = tile.element;
          applyMerge(mergeRule, landedId, state);
          playMerge(parentElement, mergeRule.output);
          // Optional: wait a bit for merge animation
          await new Promise(r => setTimeout(r, 200));
        }

        // Increment turn
        state.turn += 1;

        // Spawn hydrogen(s)
        spawnHydrogen(state);

        // Update phase
        updatePhase(state);

        // Check end state
        const end = checkEndState(state);
        if (end) {
          set({ endState: end, isAnimating: false, activeSlide: undefined, tiles: new Map(state.tiles) });
          return;
        }
      }

      set({
        tiles: new Map(state.tiles), // trigger reactivity
        turn: state.turn,
        phase: state.phase,
        elementCounts: { ...state.elementCounts },
        isAnimating: false,
        activeSlide: undefined,
        lastMerge: state.lastMerge,
      });
    } catch (e) {
      console.error('Error in endDrag:', e);
      set({ isAnimating: false, selectedFaceId: null, dragTargetId: null });
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
}));
