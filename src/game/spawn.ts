// src/game/spawn.ts
import type { GameState } from './types';
import { currentPhaseRule } from './phases';

/**
 * Spawn hydrogen(s) after every committed move.
 * Rewards efficient play: even non-merging drags cost a new H.
 * In collapse phase, no new fuel (hSpawnRate = 0).
 */
export function spawnHydrogen(state: GameState): void {
  const phaseRule = currentPhaseRule(state);
  const rate = phaseRule.hSpawnRate;

  if (rate <= 0) return;

  const emptyFaces = state.faces.filter(f => !state.tiles.has(f.id));
  if (emptyFaces.length === 0) return;

  for (let i = 0; i < rate; i++) {
    if (emptyFaces.length === 0) break;

    const idx = Math.floor(Math.random() * emptyFaces.length);
    const target = emptyFaces[idx];

    state.tiles.set(target.id, {
      faceId: target.id,
      element: 'H',
      spawnedAtTurn: state.turn,
    });

    emptyFaces.splice(idx, 1);
  }
}
