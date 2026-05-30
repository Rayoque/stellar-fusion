// src/three/cameraState.ts
// Lightweight singleton holding the latest camera world position. Written each
// frame by Controls' useFrame; read by the dev auto-player to decide which faces
// are currently on the front (visible) hemisphere. No React state => no rerenders.

import type { Vec3 } from '../game/types';

export const cameraState: { pos: Vec3 } = { pos: { x: 0, y: 0, z: 5.5 } };

export function setCameraPos(x: number, y: number, z: number) {
  cameraState.pos.x = x;
  cameraState.pos.y = y;
  cameraState.pos.z = z;
}
