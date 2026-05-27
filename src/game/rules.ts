// src/game/rules.ts
import type { ElementSymbol, GameState } from './types';
import { ELEMENTS } from './elements';

export type MergePattern = 'pair' | 'triangle' | 'pair_alpha';

export interface MergeRule {
  inputs: ElementSymbol[];
  output: ElementSymbol;
  pattern: MergePattern;
  requiresPentagon?: boolean;
}

// Physics-honest but playability-tuned rules.
// H-burning simplified 2-to-1 (real is 4p→He, but 4-way clustering feels bad in puzzle).
// Triple-alpha as triangle (mechanically distinctive regime shift → red giant feel).
// Alpha captures real. Si+Si→Fe simplified (real path Si→Ni56→Fe56).
export const MERGE_RULES: MergeRule[] = [
  // Hydrogen burning (playable 2-to-1)
  { inputs: ['H', 'H'], output: 'He', pattern: 'pair' },

  // CNO cycle catalyst shortcut on pentagons
  { inputs: ['H'], output: 'He', pattern: 'pair', requiresPentagon: true },

  // Triple-alpha process (3 He → C). Triangle pattern is the key mechanical shift.
  { inputs: ['He', 'He', 'He'], output: 'C', pattern: 'triangle' },

  // Alpha-capture chain (real stellar nucleosynthesis)
  { inputs: ['C', 'He'], output: 'O', pattern: 'pair_alpha' },
  { inputs: ['O', 'He'], output: 'Ne', pattern: 'pair_alpha' },
  { inputs: ['Ne', 'He'], output: 'Mg', pattern: 'pair_alpha' },
  { inputs: ['Mg', 'He'], output: 'Si', pattern: 'pair_alpha' },

  // Silicon burning → Iron (end of fusion)
  { inputs: ['Si', 'Si'], output: 'Fe', pattern: 'pair' },
];

/**
 * Check if two elements have a potential pair or pair_alpha merge rule.
 */
export function canMerge(elementA: ElementSymbol, elementB: ElementSymbol): boolean {
  for (const rule of MERGE_RULES) {
    if (rule.pattern === 'pair' || rule.pattern === 'pair_alpha') {
      if (rule.inputs.length !== 2) continue;
      const [a, b] = rule.inputs;
      if ((a === elementA && b === elementB) || (a === elementB && b === elementA)) {
        return true;
      }
    }
  }
  return false;
}


/**
 * Detect and return applicable merge rule after a tile lands.
 * Order matters: triangle first (for He), then pair/pair_alpha, then pentagon H shortcut.
 */
export function detectMerge(landedFaceId: number, state: GameState): MergeRule | null {
  const landedTile = state.tiles.get(landedFaceId);
  if (!landedTile) return null;

  const landedElement = landedTile.element;
  const landedFace = state.faces[landedFaceId];
  if (!landedFace) return null;

  // Resolve the actual ending/destination face where the merged output tile will be formed.
  // This is crucial for checking if the ending element is actually on a nucleation site.
  const activeSlide = state.activeSlide;
  const finalDestFaceId = (activeSlide && activeSlide.isMerge)
    ? activeSlide.path[activeSlide.path.length - 1]
    : landedFaceId;
  const finalDestFace = state.faces[finalDestFaceId];
  const isFinalDestPentagon = finalDestFace?.shape === 'pentagon';

  // 1. Triangle (triple-alpha): only relevant for He landing
  if (landedElement === 'He') {
    const heNeighbors = landedFace.neighbors.filter(nid => {
      const t = state.tiles.get(nid);
      return t && t.element === 'He';
    });

    // Check for any pair of He neighbors that are also adjacent to each other
    for (let i = 0; i < heNeighbors.length; i++) {
      for (let j = i + 1; j < heNeighbors.length; j++) {
        const n1 = heNeighbors[i];
        const n2 = heNeighbors[j];
        const n1Face = state.faces[n1];
        if (n1Face.neighbors.includes(n2)) {
          // Found a triangle of He
          return MERGE_RULES.find(r => r.pattern === 'triangle' && r.inputs[0] === 'He') || null;
        }
      }
    }
  }

  // 2. Pair or pair_alpha: same element neighbor with matching rule
  for (const rule of MERGE_RULES) {
    if (rule.pattern === 'pair' || rule.pattern === 'pair_alpha') {
      if (rule.inputs.length !== 2) continue;
      const [a, b] = rule.inputs;
      if (a !== landedElement && b !== landedElement) continue;

      const other = a === landedElement ? b : a;

      for (const nid of landedFace.neighbors) {
        const neighborTile = state.tiles.get(nid);
        if (neighborTile && neighborTile.element === other) {
          // For pair_alpha, the 'He' is the alpha particle — order doesn't matter here
          return rule;
        }
      }
    }
  }

  // 3. Pentagon CNO shortcut: lone H on pentagon self-fuses.
  // Strictly enforce that the ending element must actually form on a pentagon nucleation site.
  if (landedElement === 'H' && isFinalDestPentagon) {
    const pentagonRule = MERGE_RULES.find(r => r.requiresPentagon && r.inputs[0] === 'H');
    if (pentagonRule) return pentagonRule;
  }

  return null;
}

/**
 * Apply a merge rule: remove inputs, place output, update counts.
 * Assumes the rule was validated by detectMerge.
 */
export function applyMerge(
  rule: MergeRule,
  landedFaceId: number,
  state: GameState,
  overrideOutputFaceId?: number
): void {
  const landedFace = state.faces[landedFaceId];
  if (!landedFace) return;

  // Collect tiles to remove (for pair/triangle)
  const toRemove: number[] = [];

  if (rule.pattern === 'triangle') {
    // For triple-alpha, remove the three He (landed + two neighbors in triangle)
    toRemove.push(landedFaceId);
    if (overrideOutputFaceId !== undefined) {
      toRemove.push(overrideOutputFaceId);
      const destFace = state.faces[overrideOutputFaceId];
      if (destFace) {
        const thirdHeId = landedFace.neighbors.find(nid => 
          nid !== overrideOutputFaceId &&
          destFace.neighbors.includes(nid) &&
          state.tiles.get(nid)?.element === 'He'
        );
        if (thirdHeId !== undefined) {
          toRemove.push(thirdHeId);
        }
      }
    } else {
      // Find the two other He in the triangle
      const heNeighbors = landedFace.neighbors.filter(nid => {
        const t = state.tiles.get(nid);
        return t?.element === 'He';
      });
      for (let i = 0; i < heNeighbors.length && toRemove.length < 3; i++) {
        for (let j = i + 1; j < heNeighbors.length && toRemove.length < 3; j++) {
          if (state.faces[heNeighbors[i]].neighbors.includes(heNeighbors[j])) {
            if (!toRemove.includes(heNeighbors[i])) toRemove.push(heNeighbors[i]);
            if (!toRemove.includes(heNeighbors[j])) toRemove.push(heNeighbors[j]);
          }
        }
      }
    }
  } else if (rule.pattern === 'pair' && rule.requiresPentagon) {
    // Self-fuse on pentagon: only remove the single H
    toRemove.push(landedFaceId);
  } else if (rule.pattern === 'pair' || rule.pattern === 'pair_alpha') {
    toRemove.push(landedFaceId);
    if (overrideOutputFaceId !== undefined) {
      toRemove.push(overrideOutputFaceId);
    } else {
      const [inputA, inputB] = rule.inputs;
      const currentTile = state.tiles.get(landedFaceId);
      const currentElement = currentTile ? currentTile.element : inputA;
      const otherInput = inputA === currentElement ? inputB : inputA;

      for (const nid of landedFace.neighbors) {
        const nt = state.tiles.get(nid);
        if (nt && nt.element === otherInput) {
          toRemove.push(nid);
          break;
        }
      }
    }
  }

  // Remove input tiles
  for (const fid of toRemove) {
    state.tiles.delete(fid);
  }

  // Place output tile on landed face or overridden face
  const outputFaceId = overrideOutputFaceId !== undefined ? overrideOutputFaceId : landedFaceId;
  state.tiles.set(outputFaceId, {
    faceId: outputFaceId,
    element: rule.output,
    spawnedAtTurn: state.turn,
  });

  // Update counts (simple recount is safest for correctness)
  const newCounts: Record<ElementSymbol, number> = {
    H: 0, He: 0, C: 0, O: 0, Ne: 0, Mg: 0, Si: 0, Fe: 0
  };
  for (const tile of state.tiles.values()) {
    newCounts[tile.element]++;
  }
  state.elementCounts = newCounts;

  // Record last merge for potential animation hooks
  state.lastMerge = {
    fromFaceIds: toRemove,
    toFaceId: outputFaceId,
    output: rule.output,
  };
}
