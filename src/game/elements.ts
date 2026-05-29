// src/game/elements.ts
import type { Element, ElementSymbol } from './types';

export const ELEMENTS: Record<ElementSymbol, Element> = {
  // Standard Elements (Classic Mode)
  H:  { symbol: 'H',  atomicNumber: 1,  displayName: 'Hydrogen',  color: '#ff6b6b', slideDistance: 4, pitch: 220 },
  He: { symbol: 'He', atomicNumber: 2,  displayName: 'Helium',    color: '#feca57', slideDistance: 4, pitch: 277 },
  C:  { symbol: 'C',  atomicNumber: 6,  displayName: 'Carbon',    color: '#48dbfb', slideDistance: 3, pitch: 330 },
  O:  { symbol: 'O',  atomicNumber: 8,  displayName: 'Oxygen',    color: '#1dd1a1', slideDistance: 3, pitch: 392 },
  Ne: { symbol: 'Ne', atomicNumber: 10, displayName: 'Neon',      color: '#ff9ff3', slideDistance: 2, pitch: 440 },
  Mg: { symbol: 'Mg', atomicNumber: 12, displayName: 'Magnesium', color: '#a29bfe', slideDistance: 1, pitch: 494 },
  Si: { symbol: 'Si', atomicNumber: 14, displayName: 'Silicon',   color: '#dfe6e9', slideDistance: 1, pitch: 587 },
  Fe: { symbol: 'Fe', atomicNumber: 26, displayName: 'Iron',      color: '#636e72', slideDistance: 0, pitch: 698 },

  // Astrophysicist Mode Custom Isotopes (Fe26 logic)
  D:    { symbol: 'D',    atomicNumber: 1,  displayName: 'Deuteron',    color: '#ff9f43', slideDistance: 4, pitch: 240 },
  He3:  { symbol: 'He3',  atomicNumber: 2,  displayName: '3-Helium',    color: '#ffd266', slideDistance: 4, pitch: 260 },
  He4:  { symbol: 'He4',  atomicNumber: 2,  displayName: '4-Helium',    color: '#feca57', slideDistance: 4, pitch: 277 },
  Be7:  { symbol: 'Be7',  atomicNumber: 4,  displayName: '7-Beryllium', color: '#badc58', slideDistance: 3, pitch: 300 },
  Be8:  { symbol: 'Be8',  atomicNumber: 4,  displayName: '8-Beryllium', color: '#6ab04c', slideDistance: 3, pitch: 320 },
  C12:  { symbol: 'C12',  atomicNumber: 6,  displayName: '12-Carbon',   color: '#48dbfb', slideDistance: 3, pitch: 330 },
  O16:  { symbol: 'O16',  atomicNumber: 8,  displayName: '16-Oxygen',   color: '#1dd1a1', slideDistance: 3, pitch: 392 },
  Ne20: { symbol: 'Ne20', atomicNumber: 10, displayName: '20-Neon',     color: '#ff9ff3', slideDistance: 2, pitch: 440 },
  Mg24: { symbol: 'Mg24', atomicNumber: 12, displayName: '24-Magnesium',color: '#a29bfe', slideDistance: 2, pitch: 494 },
  Si28: { symbol: 'Si28', atomicNumber: 14, displayName: '28-Silicon',  color: '#dfe6e9', slideDistance: 1, pitch: 587 },
  S32:  { symbol: 'S32',  atomicNumber: 16, displayName: '32-Sulfur',   color: '#ffeb3b', slideDistance: 1, pitch: 620 },
  Ar36: { symbol: 'Ar36', atomicNumber: 18, displayName: '36-Argon',    color: '#8c7ae6', slideDistance: 1, pitch: 660 },
  Ca40: { symbol: 'Ca40', atomicNumber: 20, displayName: '40-Calcium',  color: '#00d2d3', slideDistance: 1, pitch: 700 },
  Ti44: { symbol: 'Ti44', atomicNumber: 22, displayName: '44-Titanium', color: '#95a5a6', slideDistance: 1, pitch: 740 },
  Cr48: { symbol: 'Cr48', atomicNumber: 24, displayName: '48-Chromium', color: '#74b9ff', slideDistance: 1, pitch: 780 },
  Fe52: { symbol: 'Fe52', atomicNumber: 26, displayName: '52-Iron',     color: '#d63031', slideDistance: 1, pitch: 820 },
  Ni56: { symbol: 'Ni56', atomicNumber: 28, displayName: '56-Nickel',   color: '#ffeaa7', slideDistance: 1, pitch: 860 },
  Fe56: { symbol: 'Fe56', atomicNumber: 26, displayName: '56-Iron',     color: '#57606f', slideDistance: 0, pitch: 900 },
};

// Pitches spaced by progressive fourths and fifths for pleasing cosmic synthesis tones.
// Iron-56 (Fe56) is completely immovable (slideDistance: 0), representing the endothermic dead-end of fusion.
