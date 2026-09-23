// src/game/solver.worker.ts
// Runs the scenario solver off the main thread so the editor stays responsive.
import { solveLevel } from './solver';
import type { Level } from './types';

self.onmessage = (event: MessageEvent<{ id: number; level: Level }>) => {
  const { id, level } = event.data;
  const result = solveLevel(level, { maxStates: 500_000 });
  (self as unknown as Worker).postMessage({ id, result });
};
