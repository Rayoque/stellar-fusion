// src/game/spawn.ts
import type { GameState, ElementSymbol } from './types';
import { currentPhaseRule } from './phases';
import { LEVELS } from './levels';

// Hydrogen "rain" may land on pentagons too, but much less often than hexagons.
// This is a per-slot weight: a pentagon is ~30% as likely to be picked as a hexagon.
const PENTAGON_SPAWN_WEIGHT = 0.3;

/**
 * Spawn hydrogen(s) after every committed move.
 * Rewards efficient play: even non-merging drags cost a new H.
 * In collapse phase, no new fuel (hSpawnRate = 0).
 *
 * Hydrogen can rain onto pentagons (nucleation sites) too, but at a lower chance.
 * When it does, it immediately becomes helium (the same self-fusion the player gets
 * by dragging H onto a pentagon) — but silently, since this isn't a player action.
 */
export function spawnHydrogen(state: GameState): void {
  if (state.currentLevelId !== null) {
    let disableSpawns = false;
    if (state.currentLevelId === 9999) {
      const raw = localStorage.getItem('stellar_editor_draft');
      if (raw) {
        disableSpawns = JSON.parse(raw).metadata.disableSpawns ?? true;
      }
    } else {
      const level = LEVELS.find(l => l.id === state.currentLevelId) || (state as any).customScenarios?.find((l: any) => l.id === state.currentLevelId);
      if (level && level.disableSpawns) {
        disableSpawns = true;
      }
    }
    if (disableSpawns) return;
  }

  const phaseRule = currentPhaseRule(state);
  const rate = state.astrophysicistMode ? 1 : phaseRule.hSpawnRate;

  if (rate <= 0) return;

  // Both hexagons and pentagons are valid landing slots now (pentagons weighted lower).
  const emptyFaces = state.faces.filter(
    f => (f.shape === 'hexagon' || f.shape === 'pentagon') && !state.tiles.has(f.id)
  );
  if (emptyFaces.length === 0) return;

  // H self-fuses to helium on a pentagon; the output isotope is mode-dependent.
  const heliumOnPentagon: ElementSymbol = state.astrophysicistMode ? 'He4' : 'He';

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
    const isPentagon = target.shape === 'pentagon';

    state.tiles.set(target.id, {
      faceId: target.id,
      // On a pentagon the hydrogen instantly self-fuses to helium (silent — not a player move).
      element: isPentagon ? heliumOnPentagon : 'H',
      spawnedAtTurn: state.turn,
      spawnReason: 'spawn',
    });

    emptyFaces.splice(targetIdx, 1);
  }
}
