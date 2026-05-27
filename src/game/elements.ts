// src/game/elements.ts
import type { Element, ElementSymbol } from './types';

export const ELEMENTS: Record<ElementSymbol, Element> = {
  H:  { symbol: 'H',  atomicNumber: 1,  displayName: 'Hydrogen',  color: '#ff6b6b', slideDistance: 32, pitch: 220 },
  He: { symbol: 'He', atomicNumber: 2,  displayName: 'Helium',    color: '#feca57', slideDistance: 5, pitch: 277 },
  C:  { symbol: 'C',  atomicNumber: 6,  displayName: 'Carbon',    color: '#48dbfb', slideDistance: 3, pitch: 330 },
  O:  { symbol: 'O',  atomicNumber: 8,  displayName: 'Oxygen',    color: '#1dd1a1', slideDistance: 2, pitch: 392 },
  Ne: { symbol: 'Ne', atomicNumber: 10, displayName: 'Neon',      color: '#ff9ff3', slideDistance: 2, pitch: 440 },
  Mg: { symbol: 'Mg', atomicNumber: 12, displayName: 'Magnesium', color: '#a29bfe', slideDistance: 1, pitch: 494 },
  Si: { symbol: 'Si', atomicNumber: 14, displayName: 'Silicon',   color: '#dfe6e9', slideDistance: 1, pitch: 587 },
  Fe: { symbol: 'Fe', atomicNumber: 26, displayName: 'Iron',      color: '#636e72', slideDistance: 0, pitch: 698 },
};

// Pitches spaced by perfect fourths (~1.334 ratio) for pleasing merge swoops.
// Heavier elements = higher pitch. Iron is immovable (slideDistance: 0) — core physics truth.
