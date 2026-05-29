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
    triggers: (s) => {
      const He = s.elementCounts.He || 0;
      const C = s.elementCounts.C || 0;
      const O = s.elementCounts.O || 0;
      const Ne = s.elementCounts.Ne || 0;
      const Mg = s.elementCounts.Mg || 0;
      const Si = s.elementCounts.Si || 0;
      const Fe = s.elementCounts.Fe || 0;
      return (He + C + O + Ne + Mg + Si + Fe) >= 8;
    },
    visualScale: 1.3,
    hSpawnRate: 1,
    unlocksElements: ['H', 'He', 'C', 'O'],
  },
  {
    phase: 'supergiant',
    triggers: (s) => {
      const He = s.elementCounts.He || 0;
      const C = s.elementCounts.C || 0;
      const O = s.elementCounts.O || 0;
      const Ne = s.elementCounts.Ne || 0;
      const Mg = s.elementCounts.Mg || 0;
      const Si = s.elementCounts.Si || 0;
      const Fe = s.elementCounts.Fe || 0;
      
      const totalHeliumOrHeavier = He + C + O + Ne + Mg + Si + Fe;
      const totalCarbonOrHeavier = C + O + Ne + Mg + Si + Fe;
      
      return totalHeliumOrHeavier >= 8 && totalCarbonOrHeavier >= 4 && C > 0 && s.starMass >= 8;
    },
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
  const currentPhaseIndex = PHASES.findIndex(p => p.phase === state.phase);
  const newPhaseRule = currentPhaseRule(state);
  const newPhaseIndex = PHASES.findIndex(p => p.phase === newPhaseRule.phase);
  
  // Phase progression is strictly ONE-WAY (forward only). A star can only evolve forward!
  if (newPhaseIndex > currentPhaseIndex) {
    // Evolve strictly one phase at a time to prevent skipping intermediate phases (e.g. main_sequence -> supergiant)
    const nextPhaseRule = PHASES[currentPhaseIndex + 1];
    state.phase = nextPhaseRule.phase;
    if (state.phaseTransitions) {
      state.phaseTransitions[nextPhaseRule.phase] = state.turn;
    }
    return true;
  }
  return false;
}

export interface StarAgeInfo {
  ageValue: number;
  ageUnit: 'Billion Years' | 'Million Years';
  formatted: string;
  stellarEra: string;
}

export function getStarAgeInfo(state: GameState): StarAgeInfo {
  // Main sequence lifetime formula from astrophysics: T_MS = 10 / (M^2.5) Billion Years
  const tMS_Gyr = 10 / Math.pow(state.starMass, 2.5);

  let ageGyr = 0;
  let era = 'Hydrogen Core Burning';

  const transitions = state.phaseTransitions || {
    main_sequence: 0,
    red_giant: null,
    supergiant: null,
    collapse: null,
  };

  const turn = state.turn;
  const phase = state.phase;

  if (phase === 'main_sequence') {
    // Progress through main sequence is simulated based on turn count relative to expected phase length (15 turns)
    const progress = Math.min(turn / 15, 0.99);
    ageGyr = progress * 0.95 * tMS_Gyr; // first 95% of stellar lifespan
    era = 'Hydrogen Core Burning';
  } else if (phase === 'red_giant') {
    const rgStart = transitions.red_giant ?? 15;
    const progress = Math.min(Math.max(turn - rgStart, 0) / 10, 0.99);
    ageGyr = tMS_Gyr * (0.95 + 0.04 * progress); // Helium shell/core burning adds ~4% to lifetime
    era = 'Helium Core & Shell Burning';
  } else if (phase === 'supergiant') {
    const sgStart = transitions.supergiant ?? 25;
    const progress = Math.min(Math.max(turn - sgStart, 0) / 10, 0.99);
    ageGyr = tMS_Gyr * (0.99 + 0.009 * progress); // Supergiant phase is very rapid, adds ~0.9% to lifetime
    era = 'Carbon, Neon, Oxygen, Silicon Core-Shell Burn';
  } else {
    // Collapse phase: right at the terminal age limit
    ageGyr = tMS_Gyr * 0.9999;
    era = 'Iron Core Collapse & Supernova Brink';
  }

  // If the lifetime is very short (massive stars), convert Gyr to Myr (Million Years)
  if (tMS_Gyr < 0.1) {
    const ageMyr = ageGyr * 1000;
    return {
      ageValue: ageMyr,
      ageUnit: 'Million Years',
      formatted: `${ageMyr.toFixed(2)} Million Years`,
      stellarEra: era,
    };
  } else {
    return {
      ageValue: ageGyr,
      ageUnit: 'Billion Years',
      formatted: `${ageGyr.toFixed(2)} Billion Years`,
      stellarEra: era,
    };
  }
}
