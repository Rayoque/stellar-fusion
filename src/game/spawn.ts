// src/game/spawn.ts
import type { GameState, ElementSymbol } from './types';
import { currentPhaseRule } from './phases';
import { LEVELS } from './levels';

// Hydrogen "rain" may land on pentagons too, but much less often than hexagons.
// This is a per-slot weight: a pentagon is ~30% as likely to be picked as a hexagon.
const PENTAGON_SPAWN_WEIGHT = 0.3;

// Fe26 spawns a deuteron instead of a proton one time in ten.
const ASTRO_DEUTERON_CHANCE = 0.1;

function rainDisabledForLevel(state: GameState): boolean {
  if (state.currentLevelId === null) return false;
  if (state.currentLevelId === 9999) return state.editorLevelMetadata?.disableSpawns ?? true;
  const level = LEVELS.find(l => l.id === state.currentLevelId)
    || state.customScenarios?.find(l => l.id === state.currentLevelId);
  return !!level?.disableSpawns;
}

/**
 * Spawn hydrogen(s) after every committed move.
 * Rewards efficient play: even non-merging drags cost a new H.
 * In collapse phase, no new fuel (hSpawnRate = 0).
 *
 * Standard rules: hydrogen can rain onto pentagons (nucleation sites) too, at a
 * lower chance, and immediately becomes helium there — the same self-fusion the
 * player gets by dragging H onto a pentagon, but silent.
 * Astrophysicist Mode follows Fe26: one nucleus per move on a uniformly random
 * empty face, a deuteron 10% of the time, and pentagons are ordinary faces.
 */
export function spawnHydrogen(state: GameState): void {
  if (rainDisabledForLevel(state)) return;

  const rate = state.astrophysicistMode ? 1 : currentPhaseRule(state).hSpawnRate;
  if (rate <= 0) return;

  // Obstacle faces (anomalies, wormholes, CME gates) never receive rain.
  const emptyFaces = state.faces.filter(f => !state.tiles.has(f.id) && !state.obstacles?.has(f.id));
  if (emptyFaces.length === 0) return;

  if (state.astrophysicistMode) {
    const target = emptyFaces[Math.floor(Math.random() * emptyFaces.length)];
    const element: ElementSymbol = Math.random() < ASTRO_DEUTERON_CHANCE ? 'D' : 'H';
    state.tiles.set(target.id, { faceId: target.id, element, spawnedAtTurn: state.turn, spawnReason: 'spawn' });
    return;
  }

  const lastFaceId = state.lastMoveFaceId;
  const lastFace = lastFaceId !== null && lastFaceId !== undefined ? state.faces[lastFaceId] : null;

  for (let i = 0; i < rate; i++) {
    if (emptyFaces.length === 0) break;

    // When the board is getting full (empty slots <= 10), bias spawns away from the
    // user's last landing position so they don't get boxed in.
    const useDistanceBias = emptyFaces.length <= 10 && !!lastFace;

    // Weighted pick: shape weight (pentagons lower) times optional distance bias.
    const weights = emptyFaces.map(f => {
      const shapeWeight = f.shape === 'pentagon' ? PENTAGON_SPAWN_WEIGHT : 1;
      if (useDistanceBias && lastFace) {
        const dx = f.center.x - lastFace.center.x;
        const dy = f.center.y - lastFace.center.y;
        const dz = f.center.z - lastFace.center.z;
        return shapeWeight * (dx * dx + dy * dy + dz * dz); // farther = more likely
      }
      return shapeWeight;
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let rand = Math.random() * totalWeight;
    let targetIdx = 0;
    for (let k = 0; k < emptyFaces.length; k++) {
      rand -= weights[k];
      if (rand <= 0) {
        targetIdx = k;
        break;
      }
    }

    const target = emptyFaces[targetIdx];
    state.tiles.set(target.id, {
      faceId: target.id,
      // On a pentagon the hydrogen instantly self-fuses to helium (silent — not a player move).
      element: target.shape === 'pentagon' ? 'He' : 'H',
      spawnedAtTurn: state.turn,
      spawnReason: 'spawn',
    });

    emptyFaces.splice(targetIdx, 1);
  }
}
