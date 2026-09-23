// Balance simulator. Plays thousands of Stellar Life and Astrophysicist runs with
// simple bots through the real move engine and reports how they end.
// Usage: npm run simulate [-- runsPerCell]
import { commitMove } from '../src/game/engine';
import { countElements } from '../src/game/rules';
import { chooseMove, type BotId } from '../src/game/bots';
import { generateTruncatedIcosahedron } from '../src/geometry/truncatedIcosahedron';
import { STAR_CLASSES, type StarClass } from '../src/game/stars';
import type { ElementSymbol, GameState, Tile } from '../src/game/types';

const RUNS = Number(process.argv[2] || 200);

// Deterministic runs: seed Math.random (the engine's rain and decay use it).
let seed = 20260922;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const FACES = generateTruncatedIcosahedron();

function startState(opts: { star?: StarClass; astro?: boolean }): GameState {
  const hexes = FACES.filter(f => f.shape === 'hexagon').map(f => f.id);
  const tiles = new Map<number, Tile>();
  for (let i = 0; i < 5; i++) {
    const idx = Math.floor(Math.random() * hexes.length);
    tiles.set(hexes[idx], { faceId: hexes[idx], element: 'H', spawnedAtTurn: 0 });
    hexes.splice(idx, 1);
  }
  return {
    starMass: opts.star?.mass ?? 1,
    starClass: opts.star?.id ?? null,
    lifetime: opts.star?.lifetime ?? null,
    astrophysicistMode: !!opts.astro,
    faces: FACES,
    tiles,
    obstacles: new Map(),
    turn: 0,
    phase: 'main_sequence',
    phaseTransitions: { main_sequence: 0, red_giant: null, supergiant: null, collapse: null },
    elementCounts: countElements(tiles),
    score: 0,
    currentLevelId: null,
    customScenarios: [],
    lastMoveFaceId: null,
  } as unknown as GameState;
}

// The same bots the in-game auto-player offers (src/game/bots.ts).
const bot = (id: BotId) => (s: GameState) => chooseMove(s, id);
type Bot = ReturnType<typeof bot>;

const RANK: Partial<Record<ElementSymbol, number>> = {
  He: 1, C: 2, O: 3, Ne: 4, Mg: 5, Si: 6, Fe: 7,
  D: 1, He3: 2, He4: 3, Be8: 4, C12: 5, O16: 6, Ne20: 7, Si28: 9, S32: 10, Ar36: 11,
  Ca40: 12, Ti44: 13, Cr48: 14, Fe52: 15, Ni56: 16,
};

interface RunResult { end: string; reason: string; turns: number; score: number; bonus: number; top: number; fe56At: number | null }

function play(state: GameState, bot: Bot, cap = 1500): RunResult {
  let top = 0;
  let fe56At: number | null = null;
  for (let i = 0; i < cap; i++) {
    const m = bot(state);
    if (!m) return { end: 'jammed', reason: 'jammed', turns: state.turn, score: state.score, bonus: 0, top, fe56At };
    const outcome = commitMove(state, m.fromFaceId, m.slide);
    for (const t of state.tiles.values()) top = Math.max(top, RANK[t.element] ?? 0);
    if (outcome.mergeRule) top = Math.max(top, RANK[outcome.mergeRule.output] ?? 0);
    if (fe56At === null && (state.elementCounts.Fe56 || 0) > 0) fe56At = state.turn;
    if (outcome.end) {
      return { end: outcome.end, reason: outcome.endReason!, turns: state.turn, score: state.score, bonus: outcome.supernovaBonus, top, fe56At };
    }
  }
  return { end: 'cap', reason: 'cap', turns: state.turn, score: state.score, bonus: 0, top, fe56At };
}

const pct = (n: number, d: number) => `${Math.round((100 * n) / d)}%`.padStart(4);
function quantile(xs: number[], q: number): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

console.log(`Stellar Life — ${RUNS} runs per cell`);
console.log('star            bot            iron in time   score p10 / p50 / p90   median moves');
for (const star of STAR_CLASSES) {
  for (const id of ['random', 'greedy', 'planner', 'patient'] as BotId[]) {
    const label = id;
    const runs = Array.from({ length: RUNS }, () => play(startState({ star }), bot(id)));
    const iron = runs.filter(r => r.reason === 'iron').length;
    const scores = runs.map(r => r.score);
    console.log(
      `${star.name.padEnd(19)}${label.padEnd(12)}${(star.ceiling === 'Fe' ? pct(iron, RUNS) : '   -').padStart(12)}` +
      `   ${String(quantile(scores, 0.1)).padStart(5)} / ${String(quantile(scores, 0.5)).padStart(5)} / ${String(quantile(scores, 0.9)).padStart(5)}` +
      `   ${String(quantile(runs.map(r => r.turns), 0.5)).padStart(10)}`
    );
  }
}

console.log(`\nAstrophysicist Mode — ${RUNS} runs per bot, run ends when the sphere is full`);
console.log('bot      iron-56 core   score p10 / p50 / p90   moves p10 / p50 / p90');
for (const id of ['random', 'greedy', 'planner'] as BotId[]) {
  const label = id;
  const runs = Array.from({ length: RUNS }, () => play(startState({ astro: true }), bot(id), 20000));
  const iron = runs.filter(r => r.end === 'neutron_star').length;
  const scores = runs.map(r => r.score);
  const turns = runs.map(r => r.turns);
  console.log(
    `${label.padEnd(9)}${pct(iron, RUNS).padStart(12)}` +
    `   ${String(quantile(scores, 0.1)).padStart(5)} / ${String(quantile(scores, 0.5)).padStart(5)} / ${String(quantile(scores, 0.9)).padStart(5)}` +
    `   ${String(quantile(turns, 0.1)).padStart(5)} / ${String(quantile(turns, 0.5)).padStart(5)} / ${String(quantile(turns, 0.9)).padStart(5)}`
  );
}
