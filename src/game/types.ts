// src/game/types.ts
// Core domain types for Stellar Fusion — a stellar nucleosynthesis puzzle on a truncated icosahedron.

export type ElementSymbol = 
  | 'H' | 'He' | 'C' | 'O' | 'Ne' | 'Mg' | 'Si' | 'Fe'
  | 'D' | 'He3' | 'He4' | 'Be7' | 'Be8' | 'C12' | 'O16' | 'Ne20' | 'Mg24' | 'Si28' | 'S32' | 'Ar36' | 'Ca40' | 'Ti44' | 'Cr48' | 'Fe52' | 'Ni56' | 'Fe56';

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
  decayTurns?: number;      // counts down moves left before decay
}

export interface ObstacleInstance {
  type: 'cme' | 'gravity' | 'wormhole';
  faceId: number;
  targetFaceId?: number;
  state?: 'inactive' | 'warning' | 'active';
}

export interface LevelObjective {
  type: 'has_element' | 'has_element_on_pentagon' | 'has_element_count' | 'has_all_elements' | 'reach_turn';
  element?: ElementSymbol;
  count?: number;
  faceId?: number;
  hint?: string;
}

export interface Level {
  id: number;
  title: string;
  description: string;
  author: string;
  starMass: number;
  maxTurns: number;
  parMoves: number;
  initialTiles: Array<{ faceId: number; element: ElementSymbol }>;
  objectives: LevelObjective[];
  campaign?: 'nursery' | 'advanced' | 'custom';
  disableSpawns?: boolean;
  obstacles?: ObstacleInstance[];
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
  | 'core_full'    // Astrophysicist Mode: the sphere filled before iron-56 was made
  | 'jammed';

// Why a run ended: the player forged iron, the star's lifetime ran out, or no move was left.
export type EndReason = 'iron' | 'lifetime' | 'full' | 'jammed';

export type StarClassId = 'sunlike' | 'massive' | 'very_massive';

// Dev auto-player personalities (src/game/bots.ts).
export type BotId = 'greedy' | 'planner' | 'patient' | 'random' | 'solver';

// One finished auto-played run, for the debug panel's run log.
export interface AutoRunRecord {
  run: number;             // runGeneration, so each run is logged once
  bot: BotId;
  turbo: boolean;
  mode: string;            // "Astro", a star name, or "Scenario 07"
  result: string;          // short outcome, e.g. "Iron core" or "Solved at par"
  score: number;
  moves: number;
}

// Pre-move snapshot kept for the single-step undo. Tiles and obstacles are deep
// copies, so nothing the next move mutates can leak back into it.
export interface MoveSnapshot {
  tiles: Map<number, Tile>;
  obstacles: Map<number, ObstacleInstance>;
  turn: number;
  phase: Phase;
  phaseTransitions: GameState['phaseTransitions'];
  elementCounts: Record<ElementSymbol, number>;
  levelObjectiveMet: boolean;
  levelFailed: boolean;
  endState: EndState | null;
  endReason: EndReason | null;
  score: number;
  hasPlayedHeliumLaugh: boolean;
  lastMoveFaceId: number | null;
}

export interface GameState {
  // immutable per run
  starMass: number;         // initial mass in solar masses (M☉), 1-30
  faces: Face[];            // static geometry, cached

  // mutable game state
  tiles: Map<number, Tile>; // faceId -> Tile (sparse)
  turn: number;
  phase: Phase;
  elementCounts: Record<ElementSymbol, number>;
  score: number;
  highScore: number;
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

  // Stellar Life: the chosen star and its move budget (null in campaign/astro runs)
  starClass: StarClassId | null;
  lifetime: number | null;
  // Heavier star unlocked by the ending of this run, for the end card.
  unlockedStarThisRun: StarClassId | null;

  // UI state
  selectedFaceId: number | null;
  dragTargetId: number | null;
  isAnimating: boolean;
  endState: EndState | null;
  endReason: EndReason | null;
  supernovaBonus: number;
  astrophysicistMode: boolean;
  isPaused: boolean;
  showRealtimeGraphics: boolean;
  showNucleationTutorial: boolean;
  hasSeenNucleationTutorial: boolean;
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
  history: MoveSnapshot[];
  hasPlayedHeliumLaugh: boolean;
  hasManuallyZoomed: boolean;
  isOrbitingFromHUD: boolean;
  isSphereTooBig: boolean;
  lastMoveFaceId: number | null;
  hasSeenFe56Splash: boolean;
  showFe56Splash: boolean;
  // Dev-only auto-player: when true, a driver makes moves on its own using the
  // same startDrag/endDrag path a human uses. Toggled from the debug panel.
  autoPlay: boolean;
  // Auto-player pace multiplier (0.5×–4×); scales the dwell + idle between moves.
  autoPlaySpeed: number;
  // Which bot drives, whether moves skip their animation (turbo), and whether a
  // finished run is followed by a fresh one (or the next scenario).
  autoPlayBot: BotId;
  autoPlayTurbo: boolean;
  autoPlayLoop: boolean;
  // What the bot is up to, shown in the debug panel (the Solver reports its plan).
  autoPlayNote: string | null;
  autoRunLog: AutoRunRecord[];
  // When set, Controls smoothly orbits the camera to bring this face to the front,
  // so the auto-player can fetch a piece that's currently on the back.
  autoRotateTargetFaceId: number | null;
  showZenMode: boolean;
  perfectLevels: number[];

  // Obstacles & Scenario Editor state
  obstacles: Map<number, ObstacleInstance>;
  isEditorMode: boolean;
  isTestingCustomScenario: boolean;
  editorBrush: 'H' | 'He' | 'C' | 'O' | 'Ne' | 'Mg' | 'Si' | 'Fe' | 'cme' | 'gravity' | 'wormhole' | 'clear';
  editorLevelMetadata: {
    title: string;
    description: string;
    author: string;
    starMass: number;
    maxTurns: number;
    parMoves: number;
    objectives: LevelObjective[];
    disableSpawns: boolean;
  };
  customScenarios: Level[];
  wasAutoPlayedThisRun: boolean;
  systemToast: string | null;

  // Monotonic run counter. Bumped by newGame/loadSavedGame so async move
  // pipelines (endDrag) can detect that the run they started in is gone and
  // abort instead of committing stale state over the fresh game.
  runGeneration: number;
  // True right after an undo; cleared by the next committed move. Limits the
  // undo to a single step back so it stays a mercy, not a search tool.
  lastActionWasUndo: boolean;
}
