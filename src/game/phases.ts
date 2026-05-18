// src/game/phases.ts
import type { GameState, Phase } from './types';

export interface PhaseRule {
  phase: Phase;
  triggers: (state: GameState) => boolean;
  visualScale: number;
  hSpawnRate: number;
  unlocksElements: string[]; // for HUD legend
}

export const PHASES: PhaseRule[] = [
  {
    phase: 'main_sequence',
    triggers: () => true, // default / fallback
    visualScale: 1.0,
    hSpawnRate: 1,
    unlocksElements: ['H', 'He'],
  },
  {
    phase: 'red_giant',
    triggers: (s) => s.elementCounts.He >= 8,
    visualScale: 1.3,
    hSpawnRate: 1,
    unlocksElements: ['H', 'He', 'C', 'O'],
  },
  {
    phase: 'supergiant',
    triggers: (s) => s.elementCounts.C >= 4 && s.starMass >= 8,
    visualScale: 1.6,
    hSpawnRate: 2,
    unlocksElements: ['H', 'He', 'C', 'O', 'Ne', 'Mg', 'Si'],
  },
  {
    phase: 'collapse',
    triggers: (s) => s.elementCounts.Fe >= 1,
    visualScale: 0.4,
    hSpawnRate: 0,
    unlocksElements: [],
  },
];

export function currentPhaseRule(state: GameState): PhaseRule {
  // Scan in reverse so later phases take precedence when multiple could match
  for (let i = PHASES.length - 1; i >= 0; i--) {
    if (PHASES[i].triggers(state)) {
      return PHASES[i];
    }
  }
  return PHASES[0];
}

export function updatePhase(state: GameState): boolean {
  const newPhaseRule = currentPhaseRule(state);
  const changed = newPhaseRule.phase !== state.phase;
  if (changed) {
    state.phase = newPhaseRule.phase;
  }
  return changed;
}
