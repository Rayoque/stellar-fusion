// src/game/rules.ts
import type { ElementSymbol, GameState, Face } from './types';
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

export const ASTRO_MERGE_RULES: MergeRule[] = [
  // H + H -> D
  { inputs: ['H', 'H'], output: 'D', pattern: 'pair' },
  // D + H -> He3
  { inputs: ['D', 'H'], output: 'He3', pattern: 'pair' },
  // He3 + He3 -> He4
  { inputs: ['He3', 'He3'], output: 'He4', pattern: 'pair' },
  // He4 + He3 -> Be7
  { inputs: ['He4', 'He3'], output: 'Be7', pattern: 'pair' },
  // He4 + He4 -> Be8
  { inputs: ['He4', 'He4'], output: 'Be8', pattern: 'pair' },
  // Be8 + He4 -> C12
  { inputs: ['Be8', 'He4'], output: 'C12', pattern: 'pair' },
  // C12 + He4 -> O16
  { inputs: ['C12', 'He4'], output: 'O16', pattern: 'pair' },
  // O16 + He4 -> Ne20
  { inputs: ['O16', 'He4'], output: 'Ne20', pattern: 'pair' },
  // Ne20 + He4 -> Mg24
  { inputs: ['Ne20', 'He4'], output: 'Mg24', pattern: 'pair' },
  // Mg24 + He4 -> Si28
  { inputs: ['Mg24', 'He4'], output: 'Si28', pattern: 'pair' },
  // Si28 + He4 -> S32
  { inputs: ['Si28', 'He4'], output: 'S32', pattern: 'pair' },
  // S32 + He4 -> Ar36
  { inputs: ['S32', 'He4'], output: 'Ar36', pattern: 'pair' },
  // Ar36 + He4 -> Ca40
  { inputs: ['Ar36', 'He4'], output: 'Ca40', pattern: 'pair' },
  // Ca40 + He4 -> Ti44
  { inputs: ['Ca40', 'He4'], output: 'Ti44', pattern: 'pair' },
  // Ti44 + He4 -> Cr48
  { inputs: ['Ti44', 'He4'], output: 'Cr48', pattern: 'pair' },
  // Cr48 + He4 -> Fe52
  { inputs: ['Cr48', 'He4'], output: 'Fe52', pattern: 'pair' },
  // Fe52 + He4 -> Ni56
  { inputs: ['Fe52', 'He4'], output: 'Ni56', pattern: 'pair' },
  // O16 + O16 -> Si28
  { inputs: ['O16', 'O16'], output: 'Si28', pattern: 'pair' },
  // C12 + C12 -> Ne20
  { inputs: ['C12', 'C12'], output: 'Ne20', pattern: 'pair' }
];

/**
 * Check if two elements have a potential pair or pair_alpha merge rule.
 */
export function canMerge(elementA: ElementSymbol, elementB: ElementSymbol, isAstro: boolean = false): boolean {
  const rules = isAstro ? ASTRO_MERGE_RULES : MERGE_RULES;
  for (const rule of rules) {
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
export function detectMerge(
  landedFaceId: number,
  state: GameState,
  targetFaceId?: number
): MergeRule | null {
  if (state.astrophysicistMode) {
    if (targetFaceId === undefined) {
      const landedTile = state.tiles.get(landedFaceId);
      if (landedTile && landedTile.element === 'H' && state.faces[landedFaceId]?.shape === 'pentagon') {
        // CNO catalyst self-fusion: Hydrogen on pentagon instantly fuses to Helium-4!
        return { inputs: ['H'], output: 'He4', pattern: 'pair', requiresPentagon: true };
      }
      return null;
    }
    const landedTile = state.tiles.get(landedFaceId);
    const targetTile = state.tiles.get(targetFaceId);
    if (!landedTile || !targetTile) return null;

    const landedElement = landedTile.element;
    const targetElement = targetTile.element;

    for (const rule of ASTRO_MERGE_RULES) {
      const [a, b] = rule.inputs;
      if ((a === landedElement && b === targetElement) || (a === targetElement && b === landedElement)) {
        return rule;
      }
    }
    return null;
  }

  const landedTile = state.tiles.get(landedFaceId);
  if (!landedTile) return null;

  const landedElement = landedTile.element;
  const landedFace = state.faces[landedFaceId];
  if (!landedFace) return null;

  // Resolve the actual ending/destination face where the merged output tile will be formed.
  // This is crucial for checking if the ending element is actually on a nucleation site.
  const finalDestFaceId = targetFaceId !== undefined ? targetFaceId : landedFaceId;
  const finalDestFace = state.faces[finalDestFaceId];
  const isFinalDestPentagon = finalDestFace?.shape === 'pentagon';

  // Get target element if targetFaceId is provided
  const targetTile = targetFaceId !== undefined ? state.tiles.get(targetFaceId) : undefined;
  const targetElement = targetTile?.element;

  // 1. Pentagon CNO shortcut: H landing on an empty pentagon self-fuses immediately!
  // This takes absolute precedence to preserve its behavior as a quantum self-fusion shortcut,
  // but only applies to a lone Hydrogen landing (no target merge tile on the face).
  if (landedElement === 'H' && isFinalDestPentagon && targetFaceId === undefined) {
    const pentagonRule = MERGE_RULES.find(r => r.requiresPentagon && r.inputs[0] === 'H');
    if (pentagonRule) return pentagonRule;
  }

  // 2. Triangle (triple-alpha): only relevant for He landing
  if (landedElement === 'He') {
    const heNeighbors = landedFace.neighbors.filter(nid => {
      const t = state.tiles.get(nid);
      return t && t.element === 'He';
    });

    if (targetFaceId !== undefined && targetElement === 'He') {
      // If targetFaceId is specified, it must be part of the triangle!
      if (heNeighbors.includes(targetFaceId)) {
        for (const otherNeighbor of heNeighbors) {
          if (otherNeighbor !== targetFaceId) {
            const otherFace: Face = state.faces[otherNeighbor];
            if (otherFace && otherFace.neighbors.includes(targetFaceId)) {
              return MERGE_RULES.find(r => r.pattern === 'triangle' && r.inputs[0] === 'He') || null;
            }
          }
        }
      }
    } else if (targetFaceId === undefined) {
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
  }

  // 3. Pair or pair_alpha: same element neighbor with matching rule
  for (const rule of MERGE_RULES) {
    if (rule.pattern === 'pair' || rule.pattern === 'pair_alpha') {
      if (rule.inputs.length !== 2) continue;
      const [a, b] = rule.inputs;
      if (a !== landedElement && b !== landedElement) continue;

      const other = a === landedElement ? b : a;

      if (targetFaceId !== undefined) {
        // Strict matching: only merge with the target face's element if adjacent
        if (other === targetElement && landedFace.neighbors.includes(targetFaceId)) {
          return rule;
        }
      } else {
        // Fallback: scan all neighbors
        for (const nid of landedFace.neighbors) {
          const neighborTile = state.tiles.get(nid);
          if (neighborTile && neighborTile.element === other) {
            return rule;
          }
        }
      }
    }
  }

  return null;
}

export const SCORE_VALUES: Record<ElementSymbol, number> = {
  H: 0,
  He: 4,     // mass 4
  C: 12,     // mass 12
  O: 16,     // mass 16
  Ne: 20,    // mass 20
  Mg: 24,    // mass 24
  Si: 28,    // mass 28
  Fe: 56,    // mass 56

  // Astrophysicist Mode — exact fusion point values from Fe26 (dimit.me/Fe26)
  D: 1,
  He3: 1.5,
  He4: 2,
  Be7: 3,
  Be8: 4,
  C12: 6,
  O16: 8,
  Ne20: 10,
  Mg24: 12,
  Si28: 14,
  S32: 16,
  Ar36: 18,
  Ca40: 20,
  Ti44: 22,
  Cr48: 24,
  Fe52: 26,
  Ni56: 28,
  Fe56: 56   // winning element, worth full mass
};

// Astrophysicist Mode — score change when an isotope decays (Fe26).
// Most decays forfeit the points the isotope earned; Ni56 -> Fe56 is rewarded.
export const DECAY_POINTS: Partial<Record<ElementSymbol, number>> = {
  Be7: -3,
  Be8: -4,
  Ne20: -10,
  Fe52: -26,
  Ni56: 56,
};

export function getDecayTurns(element: ElementSymbol): number | undefined {
  if (element === 'Be7') return 12 + Math.floor(Math.random() * 11); // 12 to 22
  if (element === 'Be8') return 3 + Math.floor(Math.random() * 4);   // 3 to 6
  if (element === 'Ne20') return 5 + Math.floor(Math.random() * 6);  // 5 to 10
  if (element === 'Fe52') return 4 + Math.floor(Math.random() * 5);  // 4 to 8
  if (element === 'Ni56') return 3 + Math.floor(Math.random() * 3);  // 3 to 5
  return undefined;
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
  const decayTurns = getDecayTurns(rule.output);
  state.tiles.set(outputFaceId, {
    faceId: outputFaceId,
    element: rule.output,
    spawnedAtTurn: state.turn,
    spawnReason: 'merge',
    decayTurns,
  });

  // Add score
  const points = SCORE_VALUES[rule.output] || 0;
  state.score = (state.score || 0) + points;

  // Update counts (dynamic recount to support both standard elements and custom isotopes)
  const newCounts = {} as Record<ElementSymbol, number>;
  for (const tile of state.tiles.values()) {
    if (!newCounts[tile.element]) {
      newCounts[tile.element] = 0;
    }
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
