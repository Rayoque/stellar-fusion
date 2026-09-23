// src/game/stars.ts
// The stars a player can choose to burn in Stellar Life. Mass decides what a real
// star's fate depends on: how long it lives, how far up the fusion chain its core
// can climb, and what it leaves behind.
import type { ElementSymbol, EndState, StarClassId } from './types';

export type { StarClassId };

export interface StarClass {
  id: StarClassId;
  name: string;
  mass: number;                  // M☉
  lifetime: number;              // moves before the core runs out of fuel
  fate: EndState;                // what the star leaves behind
  ceiling: ElementSymbol;        // heaviest element its core can make
  unlockAfter: EndState | null;  // ending the player must witness first
  blurb: string;
}

// Lifetimes shrink with mass, as in real stars (τ ∝ M^-2.5), compressed into a
// playable range. Tuned with scripts/simulate.ts: a greedy fuser forges iron in
// time about half the time on the massive star and less often on the very massive one.
export const STAR_CLASSES: StarClass[] = [
  {
    id: 'sunlike',
    name: 'Sunlike star',
    mass: 1,
    lifetime: 60,
    fate: 'white_dwarf',
    ceiling: 'O',
    unlockAfter: null,
    blurb: 'Too light to fuse past oxygen. Ends as a white dwarf.',
  },
  {
    id: 'massive',
    name: 'Massive star',
    mass: 15,
    lifetime: 50,
    fate: 'neutron_star',
    ceiling: 'Fe',
    unlockAfter: 'white_dwarf',
    blurb: 'Burns all the way to iron, then explodes. Leaves a neutron star.',
  },
  {
    id: 'very_massive',
    name: 'Very massive star',
    mass: 30,
    lifetime: 42,
    fate: 'black_hole',
    ceiling: 'Fe',
    unlockAfter: 'neutron_star',
    blurb: 'Lives fast and collapses into a black hole.',
  },
];

// Forging iron before the lifetime runs out triggers the supernova yourself.
export const SUPERNOVA_BONUS: Partial<Record<EndState, number>> = {
  neutron_star: 200,
  black_hole: 300,
};

export function getStarClass(id: StarClassId | null | undefined): StarClass | undefined {
  return STAR_CLASSES.find(c => c.id === id);
}

// Main-sequence lifetime in billions of years: τ ≈ 10 Gyr × M^-2.5.
export function mainSequenceGyr(mass: number): number {
  return 10 / Math.pow(mass, 2.5);
}

// "4.2 of 10 billion years" style readout for the HUD.
export function formatStarAge(mass: number, fraction: number): string {
  const total = mainSequenceGyr(mass);
  const f = Math.min(Math.max(fraction, 0), 1);
  if (total >= 1) return `${(total * f).toFixed(1)} of ${total.toFixed(0)} billion years`;
  const myr = total * 1000;
  return `${(myr * f).toFixed(1)} of ${myr.toFixed(myr < 10 ? 1 : 0)} million years`;
}

// --- Unlocks: each ending you witness unlocks the next heavier star ---

const ENDINGS_KEY = 'stellar_endings_seen';

export function getEndingsSeen(): EndState[] {
  try {
    return JSON.parse(localStorage.getItem(ENDINGS_KEY) || '[]');
  } catch {
    return [];
  }
}

// Returns the star class this ending newly unlocked, if any.
export function recordEndingSeen(end: EndState): StarClass | undefined {
  const seen = getEndingsSeen();
  if (seen.includes(end)) return undefined;
  const before = new Set(STAR_CLASSES.filter(c => isStarUnlocked(c, seen)).map(c => c.id));
  const next = [...seen, end];
  try {
    localStorage.setItem(ENDINGS_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — unlocks just won't persist
  }
  return STAR_CLASSES.find(c => !before.has(c.id) && isStarUnlocked(c, next));
}

export function isStarUnlocked(star: StarClass, seen: EndState[] = getEndingsSeen()): boolean {
  return star.unlockAfter === null || seen.includes(star.unlockAfter);
}

export function unlockAllStars(): void {
  try {
    localStorage.setItem(ENDINGS_KEY, JSON.stringify(['white_dwarf', 'neutron_star', 'black_hole']));
  } catch {
    // ignore
  }
}

export function bestScoreKey(id: StarClassId): string {
  return `stellar_best_${id}`;
}
