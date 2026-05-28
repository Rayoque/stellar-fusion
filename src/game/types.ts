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
  spawnReason?: 'spawn' | 'merge' | 'slide';
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
  phaseTransitions: {
    main_sequence: number;
    red_giant: number | null;
    supergiant: number | null;
    collapse: number | null;
  };

  // Campaign state
  currentLevelId: number | null;  // null = endless sandbox mode
  completedLevels: number[];      // list of completed level IDs
  levelObjectiveMet: boolean;
  levelFailed: boolean;
  unlockedElements: ElementSymbol[]; // elements discovered across all plays
  activeToastElement: ElementSymbol | null; // currently showing toast notification

  // UI state
  selectedFaceId: number | null;
  dragTargetId: number | null;
  isAnimating: boolean;
  endState: EndState | null;
  endlessMode: boolean;
  isPaused: boolean;
  showRealtimeGraphics: boolean;
  activeSlide?: {
    element: ElementSymbol;
    path: number[];
    startTime: number;
    duration: number;
    isMerge?: boolean;
  };
  lastMerge?: {
    fromFaceIds: number[];
    toFaceId: number;
    output: ElementSymbol;
  };
  blockedFaceId?: number | null;
  blockedTime?: number;
  dragOffset3D?: Vec3 | null;
  history: Array<{
    tiles: Map<number, Tile>;
    turn: number;
    phase: Phase;
    elementCounts: Record<ElementSymbol, number>;
    levelObjectiveMet: boolean;
    levelFailed: boolean;
    endState: EndState | null;
  }>;
  hasPlayedHeliumLaugh: boolean;
}
