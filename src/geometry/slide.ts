// src/geometry/slide.ts
// Drag-to-slide resolution and execution on the sphere surface.

import type { Face, GameState, Vec3 } from '../game/types';
import {
  subtract, normalize, dot, projectToPlane, length, EPSILON
} from '../utils/math';
import { ELEMENTS } from '../game/elements';
import { canMerge } from '../game/rules';

/**
 * Resolve the best neighbor to slide toward given a world-space drag vector from a face.
 */
export function resolveSlideTarget(
  fromFace: Face,
  dragWorld: Vec3,
  faces: Face[]
): number | null {
  const dTangent = projectToPlane(dragWorld, fromFace.tangentFrame.n);
  if (length(dTangent) < EPSILON) return null;

  let bestId = -1;
  let bestDot = -Infinity;

  for (const neighborId of fromFace.neighbors) {
    const toNeighbor = subtract(faces[neighborId].center, fromFace.center);
    const projected = projectToPlane(toNeighbor, fromFace.tangentFrame.n);
    const dotVal = dot(normalize(projected), normalize(dTangent));
    if (dotVal > bestDot) {
      bestDot = dotVal;
      bestId = neighborId;
    }
  }

  return bestId >= 0 ? bestId : null;
}

/**
 * Execute a slide for a tile.
 * Returns list of faces the tile traversed (for animation chaining).
 * Stops on merge opportunity, block, or slideDistance limit.
 */
export function executeSlide(
  startFaceId: number,
  initialDragWorld: Vec3,
  state: GameState
): { path: number[]; stoppedReason: 'empty' | 'merge' | 'blocked' | 'limit' } {
  const tile = state.tiles.get(startFaceId);
  if (!tile) return { path: [], stoppedReason: 'blocked' };

  const element = tile.element;
  const maxDistance = state.faces[startFaceId] ? 
    (ELEMENTS[element]?.slideDistance ?? 0) : 0;

  if (maxDistance <= 0) return { path: [startFaceId], stoppedReason: 'blocked' };

  let currentId = startFaceId;
  const path: number[] = [currentId];
  let remainingDistance = maxDistance;

  let currentDrag = initialDragWorld;

  while (remainingDistance > 0) {
    const currentFace = state.faces[currentId];
    if (!currentFace) break;

    const nextId = resolveSlideTarget(currentFace, currentDrag, state.faces);
    if (nextId === null || path.includes(nextId)) break;

    const nextFace = state.faces[nextId];
    const nextTile = state.tiles.get(nextId);

    if (!nextTile) {
      // Empty — can move there
      path.push(nextId);
      currentId = nextId;
      remainingDistance -= 1;

      // Re-resolve direction from new face (sphere curvature)
      currentDrag = initialDragWorld; // keep original intent or reproject if needed
    } else if (canMerge(element, nextTile.element) || (element === 'He' && nextTile.element === 'He')) {
      // Combinable or potential Helium triple-alpha triangle merge. Stop here; caller will detect & apply.
      return { path, stoppedReason: 'merge' };
    } else {
      // Different element or immovable — blocked
      return { path, stoppedReason: 'blocked' };
    }

    if (path.length > maxDistance + 1) break;
  }

  return { path, stoppedReason: path.length > 1 ? 'empty' : 'limit' };
}
