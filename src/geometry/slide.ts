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
  const visitedPortals = new Set<number>();

  let slideStartId = startFaceId;
  let slideFirstStepId: number | null = null;

  while (remainingDistance > 0) {
    const currentFace = state.faces[currentId];
    if (!currentFace) break;

    const nextId = resolveSlideTarget(currentFace, currentDrag, state.faces);
    if (nextId === null || path.includes(nextId)) break;

    const nextFace = state.faces[nextId];

    // Straight line enforcement: if we have already made at least one step,
    // verify that the new step direction is closely aligned with the first step direction.
    // This prevents tiles from curving or turning around the hexagonal grid sphere.
    // We completely bypass this for Hydrogen ('H') to give it a bouncy, organic, fly-around-the-sphere feel!
    if (element !== 'H' && slideFirstStepId !== null) {
      const firstStart = state.faces[slideStartId].center;
      const firstEnd = state.faces[slideFirstStepId].center;
      const vFirst = normalize(subtract(firstEnd, firstStart));
      
      const currentCenter = currentFace.center;
      const nextCenter = nextFace.center;
      const vNext = normalize(subtract(nextCenter, currentCenter));
      
      const isThroughPentagon = currentFace.shape === 'pentagon' || nextFace.shape === 'pentagon';
      const stepDot = dot(vFirst, vNext);
      if (!isThroughPentagon && stepDot < 0.40) {
        // This step represents a turn/curve — stop the slide!
        break;
      }
    }

    // Check obstacles at nextId
    const obstacle = state.obstacles?.get(nextId);
    if (obstacle) {
      if (obstacle.type === 'gravity') {
        // Gravitational Anomaly acts as a solid wall for sliding tiles
        return { path, stoppedReason: 'blocked' };
      }
      if (obstacle.type === 'wormhole') {
        const targetId = obstacle.targetFaceId;
        if (targetId !== undefined && !visitedPortals.has(nextId)) {
          visitedPortals.add(nextId);
          visitedPortals.add(targetId);

          const targetTile = state.tiles.get(targetId);
          if (targetTile) {
            // Target occupied: check if we can merge upon exiting
            if (canMerge(element, targetTile.element, state.astrophysicistMode)) {
              path.push(nextId);
              path.push(targetId);
              return { path, stoppedReason: 'merge' };
            } else if (element === 'He' && targetTile.element === 'He') {
              const targetFace = state.faces[targetId];
              const hasThirdHelium = targetFace?.neighbors.some(nid =>
                nid !== nextId &&
                state.tiles.get(nid)?.element === 'He'
              );
              if (hasThirdHelium) {
                path.push(nextId);
                path.push(targetId);
                return { path, stoppedReason: 'merge' };
              }
            }
            // Blocked at entrance because exit is occupied
            return { path, stoppedReason: 'blocked' };
          } else {
            // Target empty: teleport tile!
            path.push(nextId); // enter portal
            path.push(targetId); // exit portal
            currentId = targetId;
            remainingDistance -= 1;

            // Reset straight-line reference for the post-teleport segment
            slideStartId = targetId;
            slideFirstStepId = null;
            continue;
          }
        } else if (targetId === undefined) {
          // Unpaired wormholes behave as a wall
          return { path, stoppedReason: 'blocked' };
        }
      }
    }

    const nextTile = state.tiles.get(nextId);

    if (!nextTile) {
      // Empty — can move there
      path.push(nextId);
      currentId = nextId;
      remainingDistance -= 1;

      if (slideFirstStepId === null) {
        slideFirstStepId = nextId;
      }

      // Continue sliding in the same geodesic direction along the sphere's curvature!
      const stepDir = subtract(nextFace.center, currentFace.center);
      currentDrag = normalize(stepDir);
    } else if (canMerge(element, nextTile.element, state.astrophysicistMode)) {
      // Direct pair or pair-alpha merge combinable. Append target face and stop.
      path.push(nextId);
      return { path, stoppedReason: 'merge' };
    } else if (element === 'He' && nextTile.element === 'He') {
      // For Helium, check if there is a third adjacent Helium to complete the triangle
      const currentFace = state.faces[currentId];
      const nextFace = state.faces[nextId];
      
      const hasThirdHelium = currentFace.neighbors.some(nid => 
        nid !== nextId && 
        nextFace.neighbors.includes(nid) && 
        state.tiles.get(nid)?.element === 'He'
      );
      
      if (hasThirdHelium) {
        // Complete triangle exists — valid merge!
        path.push(nextId);
        return { path, stoppedReason: 'merge' };
      } else {
        // No third Helium to complete the triangle — this swipe is blocked!
        return { path, stoppedReason: 'blocked' };
      }
    } else {
      // Different element or immovable — blocked
      return { path, stoppedReason: 'blocked' };
    }

    if (path.length > maxDistance + 1) break;
  }

  return { path, stoppedReason: path.length > 1 ? 'empty' : 'limit' };
}
