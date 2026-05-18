// src/utils/math.ts
// Minimal 3D vector helpers (no external deps). Immutable where practical.

export interface Vec3 { x: number; y: number; z: number; }

export const EPSILON = 1e-6;

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function multiplyScalar(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function length(v: Vec3): number {
  return Math.sqrt(dot(v, v));
}

export function normalize(v: Vec3): Vec3 {
  const len = length(v);
  if (len < EPSILON) return vec3(0, 0, 1);
  return multiplyScalar(v, 1 / len);
}

export function distance(a: Vec3, b: Vec3): number {
  return length(subtract(a, b));
}

/** Project vector onto plane with normal n (assumes n normalized) */
export function projectToPlane(v: Vec3, n: Vec3): Vec3 {
  const projOnN = multiplyScalar(n, dot(v, n));
  return subtract(v, projOnN);
}

/** Create orthonormal tangent frame for a face center (normal n) */
export function createTangentFrame(n: Vec3): { u: Vec3; v: Vec3; n: Vec3 } {
  const nn = normalize(n);
  // Choose arbitrary perpendicular: cross with world up, fallback to X
  let up = vec3(0, 1, 0);
  if (Math.abs(dot(nn, up)) > 0.99) up = vec3(1, 0, 0);
  const u = normalize(cross(nn, up));
  const v = cross(nn, u); // already normalized
  return { u, v, n: nn };
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}
