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
  const rate = state.astrophysicistMode ? 1 : phaseRule.hSpawnRate;

  if (rate <= 0) return;

  const emptyFaces = state.faces.filter(f => f.shape === 'hexagon' && !state.tiles.has(f.id));
  if (emptyFaces.length === 0) return;

  const lastFaceId = state.lastMoveFaceId;
  const lastFace = lastFaceId !== null && lastFaceId !== undefined ? state.faces[lastFaceId] : null;

  for (let i = 0; i < rate; i++) {
    if (emptyFaces.length === 0) break;

    let target;
    // When the board is getting full (empty hexagons <= 10), make hydrogen tend to spawn 
    // further away from the user's last landing position to avoid blocking them.
    if (emptyFaces.length <= 10 && lastFace) {
      const facesWithDist = emptyFaces.map(f => {
        const dx = f.center.x - lastFace.center.x;
        const dy = f.center.y - lastFace.center.y;
        const dz = f.center.z - lastFace.center.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        return { face: f, weight: distSq }; // weight proportional to squared distance (opposite side has highest weight)
      });

      const totalWeight = facesWithDist.reduce((sum, item) => sum + item.weight, 0);
      let rand = Math.random() * totalWeight;
      target = emptyFaces[0];
      for (const item of facesWithDist) {
        rand -= item.weight;
        if (rand <= 0) {
          target = item.face;
          break;
        }
      }
    } else {
      // Standard purely random uniform fallback when board is not full
      const idx = Math.floor(Math.random() * emptyFaces.length);
      target = emptyFaces[idx];
    }

    state.tiles.set(target.id, {
      faceId: target.id,
      element: 'H',
      spawnedAtTurn: state.turn,
      spawnReason: 'spawn',
    });

    const indexToRemove = emptyFaces.findIndex(f => f.id === target.id);
    if (indexToRemove !== -1) {
      emptyFaces.splice(indexToRemove, 1);
    }
  }
}
