// src/game/types.ts
// Core domain types for Stellar Fusion — a stellar nucleosynthesis puzzle on a truncated icosahedron.

export type ElementSymbol = 'H' | 'He' | 'C' | 'O' | 'Ne' | 'Mg' | 'Si' | 'Fe';

export interface Element {
  symbol: ElementSymbol;
  atomicNumber: number;
  displayName: string;
  color: string;            // hex, biased toward stellar spectrum
  slideDistance: number;    // max faces traversable per drag (0 = immovable)
  pitch: number;            // Hz, for merge synth (perfect fourths spacing)
}

export interface Tile {
  faceId: number;
  element: ElementSymbol;
  spawnedAtTurn: number;    // for potential future animations / age
}

export type FaceShape = 'pentagon' | 'hexagon';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TangentFrame {
  u: Vec3;
  v: Vec3;
  n: Vec3; // outward normal
}

export interface Face {
  id: number;
  shape: FaceShape;
  center: Vec3;             // unit sphere position (also normal)
  vertices: Vec3[];         // 5 or 6 vertices in CCW order around center
  neighbors: number[];      // adjacent face ids (symmetric)
  tangentFrame: TangentFrame;
}

export type Phase = 'main_sequence' | 'red_giant' | 'supergiant' | 'collapse';

export type EndState =
  | 'white_dwarf'
  | 'neutron_star'
  | 'black_hole'
  | 'failed_collapse'
  | 'jammed';

export interface GameState {
  // immutable per run
  starMass: number;         // initial mass in solar masses (M☉), 1-30
  faces: Face[];            // static geometry, cached

  // mutable game state
  tiles: Map<number, Tile>; // faceId -> Tile (sparse)
  turn: number;
  phase: Phase;
  elementCounts: Record<ElementSymbol, number>;

  // UI state
  selectedFaceId: number | null;
  dragTargetId: number | null;
  isAnimating: boolean;
  endState: EndState | null;
  activeSlide?: {
    element: ElementSymbol;
    path: number[];
    startTime: number;
    duration: number;
  };
  lastMerge?: {
    fromFaceIds: number[];
    toFaceId: number;
    output: ElementSymbol;
  };
}
