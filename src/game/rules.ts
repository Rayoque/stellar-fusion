// src/game/rules.ts
import type { ElementSymbol, GameState } from './types';

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

const TRIPLE_ALPHA = MERGE_RULES.find(r => r.pattern === 'triangle')!;
const PENTAGON_SELF_FUSION = MERGE_RULES.find(r => r.requiresPentagon)!;

// Astrophysicist Mode — Fe26's fusion table, verbatim (dimit.me/Fe26, js/game_manager.js).
// Note what is NOT here: nothing fuses with Mg24. Fe26 leaves it a dead end on purpose.
export const ASTRO_MERGE_RULES: MergeRule[] = [
  { inputs: ['H', 'H'], output: 'D', pattern: 'pair' },
  { inputs: ['D', 'H'], output: 'He3', pattern: 'pair' },
  { inputs: ['He3', 'He3'], output: 'He4', pattern: 'pair' },
  { inputs: ['He4', 'He3'], output: 'Be7', pattern: 'pair' },
  { inputs: ['He4', 'He4'], output: 'Be8', pattern: 'pair' },
  { inputs: ['Be8', 'He4'], output: 'C12', pattern: 'pair' },
  { inputs: ['C12', 'He4'], output: 'O16', pattern: 'pair' },
  { inputs: ['O16', 'He4'], output: 'Ne20', pattern: 'pair' },
  { inputs: ['Ne20', 'He4'], output: 'Mg24', pattern: 'pair' },
  { inputs: ['Si28', 'He4'], output: 'S32', pattern: 'pair' },
  { inputs: ['S32', 'He4'], output: 'Ar36', pattern: 'pair' },
  { inputs: ['Ar36', 'He4'], output: 'Ca40', pattern: 'pair' },
  { inputs: ['Ca40', 'He4'], output: 'Ti44', pattern: 'pair' },
  { inputs: ['Ti44', 'He4'], output: 'Cr48', pattern: 'pair' },
  { inputs: ['Cr48', 'He4'], output: 'Fe52', pattern: 'pair' },
  { inputs: ['Fe52', 'He4'], output: 'Ni56', pattern: 'pair' },
  { inputs: ['O16', 'O16'], output: 'Si28', pattern: 'pair' },
  { inputs: ['C12', 'C12'], output: 'Ne20', pattern: 'pair' },
];

// Stars lighter than ~8 M☉ never get hot enough to ignite carbon: their cores stop
// at carbon and oxygen and they end as white dwarfs.
export const CARBON_IGNITION_MASS = 8;
const CARBON_BURNING_PRODUCTS: ElementSymbol[] = ['Ne', 'Mg', 'Si', 'Fe'];

export function canCoreMake(
  output: ElementSymbol,
  state: Pick<GameState, 'starMass' | 'astrophysicistMode'>
): boolean {
  if (state.astrophysicistMode) return true;
  return state.starMass >= CARBON_IGNITION_MASS || !CARBON_BURNING_PRODUCTS.includes(output);
}

function findPairRule(a: ElementSymbol, b: ElementSymbol, isAstro: boolean): MergeRule | undefined {
  const rules = isAstro ? ASTRO_MERGE_RULES : MERGE_RULES;
  return rules.find(r => {
    if (r.requiresPentagon || r.inputs.length !== 2) return false;
    const [x, y] = r.inputs;
    return (x === a && y === b) || (x === b && y === a);
  });
}

/**
 * Product of fusing a mover into a target by a two-body rule, or null if they
 * don't fuse (or this star's core is too cool to make the product).
 * The helium triangle is handled separately — see detectMerge.
 */
export function pairFusionOutput(
  a: ElementSymbol,
  b: ElementSymbol,
  state: Pick<GameState, 'starMass' | 'astrophysicistMode'>
): ElementSymbol | null {
  const rule = findPairRule(a, b, state.astrophysicistMode);
  if (!rule || !canCoreMake(rule.output, state)) return null;
  return rule.output;
}

/**
 * The rule that fires when a tile comes to rest.
 * - With a target (the slide ran into a partner): pair/alpha fusion, or the helium
 *   triangle when a third He touches both.
 * - Without one: a lone hydrogen resting on a pentagon self-fuses (standard rules
 *   only — Fe26 has no such shortcut).
 * `viaPortal` means the mover reached the target through a wormhole, so the two
 * faces need not be adjacent.
 */
export function detectMerge(
  landedFaceId: number,
  state: GameState,
  targetFaceId?: number,
  viaPortal = false
): MergeRule | null {
  const landedTile = state.tiles.get(landedFaceId);
  const landedFace = state.faces[landedFaceId];
  if (!landedTile || !landedFace) return null;
  const landed = landedTile.element;

  if (targetFaceId === undefined) {
    if (!state.astrophysicistMode && landed === 'H' && landedFace.shape === 'pentagon') {
      return PENTAGON_SELF_FUSION;
    }
    return null;
  }

  const targetTile = state.tiles.get(targetFaceId);
  const targetFace = state.faces[targetFaceId];
  if (!targetTile || !targetFace) return null;
  const adjacent = landedFace.neighbors.includes(targetFaceId);
  if (!adjacent && !viaPortal) return null;

  if (!state.astrophysicistMode && landed === 'He' && targetTile.element === 'He') {
    return findThirdHelium(state, landedFaceId, targetFaceId) !== undefined ? TRIPLE_ALPHA : null;
  }

  const rule = findPairRule(landed, targetTile.element, state.astrophysicistMode);
  return rule && canCoreMake(rule.output, state) ? rule : null;
}

// The third helium of a triple-alpha: touching the target, and the mover too when
// the two are adjacent (through a wormhole only the target side can be checked).
function findThirdHelium(state: GameState, moverFaceId: number, targetFaceId: number): number | undefined {
  const moverFace = state.faces[moverFaceId];
  const targetFace = state.faces[targetFaceId];
  const adjacent = moverFace.neighbors.includes(targetFaceId);
  return targetFace.neighbors.find(n =>
    n !== moverFaceId &&
    n !== targetFaceId &&
    state.tiles.get(n)?.element === 'He' &&
    (!adjacent || moverFace.neighbors.includes(n))
  );
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

// Astrophysicist Mode — Fe26's decay table: what each unstable isotope becomes,
// the score change when it does, and its lifetime multiplier m (Fe26 draws the
// number of moves uniformly from ceil(4m) to ceil(8m)).
export const DECAY: Partial<Record<ElementSymbol, { to: ElementSymbol; multiplier: number; points: number }>> = {
  Be7:  { to: 'He4',  multiplier: 3,   points: -3 },
  Be8:  { to: 'He4',  multiplier: 1,   points: -4 },
  Ne20: { to: 'O16',  multiplier: 2.5, points: -10 },
  Fe52: { to: 'Cr48', multiplier: 2,   points: -26 },
  Ni56: { to: 'Fe56', multiplier: 1.5, points: 56 },
};

export function getDecayTurns(element: ElementSymbol): number | undefined {
  const decay = DECAY[element];
  if (!decay) return undefined;
  const min = Math.ceil(4 * decay.multiplier);
  const max = Math.ceil(8 * decay.multiplier);
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Apply a merge rule: remove inputs, place output, update counts and score.
 * `targetFaceId` is the partner the mover slid into (absent for the pentagon
 * self-fusion); the product forms there.
 */
export function applyMerge(
  rule: MergeRule,
  landedFaceId: number,
  state: GameState,
  targetFaceId?: number
): void {
  if (!state.faces[landedFaceId]) return;

  const toRemove: number[] = [landedFaceId];
  if (targetFaceId !== undefined) {
    toRemove.push(targetFaceId);
    if (rule.pattern === 'triangle') {
      const third = findThirdHelium(state, landedFaceId, targetFaceId);
      if (third !== undefined) toRemove.push(third);
    }
  }

  for (const fid of toRemove) {
    state.tiles.delete(fid);
  }

  const outputFaceId = targetFaceId ?? landedFaceId;
  state.tiles.set(outputFaceId, {
    faceId: outputFaceId,
    element: rule.output,
    spawnedAtTurn: state.turn,
    spawnReason: 'merge',
    decayTurns: getDecayTurns(rule.output),
  });

  state.score = (state.score || 0) + (SCORE_VALUES[rule.output] || 0);
  state.elementCounts = countElements(state.tiles);

  state.lastMerge = {
    fromFaceIds: toRemove,
    toFaceId: outputFaceId,
    output: rule.output,
  };
}

export function countElements(tiles: Map<number, { element: ElementSymbol }>): Record<ElementSymbol, number> {
  const counts = {} as Record<ElementSymbol, number>;
  for (const tile of tiles.values()) {
    counts[tile.element] = (counts[tile.element] || 0) + 1;
  }
  return counts;
}
