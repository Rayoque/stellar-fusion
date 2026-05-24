// src/three/AnimatedTile.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/state';
import { Tile } from './Tile';

// Helper to calculate 3D distance squared
const distSq = (a: any, b: any) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx*dx + dy*dy + dz*dz;
};

// Cyclic-shift target vertices to align with base vertices (prevents twisting)
const alignVertices = (baseVerts: any[], targetVerts: any[]) => {
  if (!baseVerts || !targetVerts || baseVerts.length === 0 || targetVerts.length === 0) return targetVerts;
  const v0 = baseVerts[0];
  let minDistance = Infinity;
  let bestShift = 0;
  
  for (let i = 0; i < targetVerts.length; i++) {
    const d = distSq(targetVerts[i], v0);
    if (d < minDistance) {
      minDistance = d;
      bestShift = i;
    }
  }
  
  if (bestShift === 0) return targetVerts;
  
  const aligned = [];
  const len = targetVerts.length;
  for (let i = 0; i < len; i++) {
    aligned.push(targetVerts[(i + bestShift) % len]);
  }
  return aligned;
};

// Seamless polygon morphing algorithm between different face sizes (N1 -> N2)
const getMorphedFace = (face1: any, face2: any, t: number): any => {
  const N1 = face1.vertices.length;
  // Align target face vertices CCW starting from the closest to face1's first vertex
  const alignedV2 = alignVertices(face1.vertices, face2.vertices);
  const N2 = alignedV2.length;
  const N = Math.max(N1, N2);
  
  const morphedVerts = [];
  
  // Interpolated center
  const center = {
    x: face1.center.x + (face2.center.x - face1.center.x) * t,
    y: face1.center.y + (face2.center.y - face1.center.y) * t,
    z: face1.center.z + (face2.center.z - face1.center.z) * t
  };
  
  // Normalize the center to keep it perfectly on the sphere surface
  const len = Math.sqrt(center.x*center.x + center.y*center.y + center.z*center.z);
  center.x /= len;
  center.y /= len;
  center.z /= len;
  
  for (let i = 0; i < N; i++) {
    // Fractional sampling of face1 boundary
    const idx1_float = (i * N1) / N;
    const idx1_floor = Math.floor(idx1_float);
    const idx1_ceil = (idx1_floor + 1) % N1;
    const t1 = idx1_float - idx1_floor;
    const v1_start = face1.vertices[idx1_floor];
    const v1_end = face1.vertices[idx1_ceil];
    const p1 = {
      x: v1_start.x + (v1_end.x - v1_start.x) * t1,
      y: v1_start.y + (v1_end.y - v1_start.y) * t1,
      z: v1_start.z + (v1_end.z - v1_start.z) * t1
    };
    
    // Fractional sampling of aligned face2 boundary
    const idx2_float = (i * N2) / N;
    const idx2_floor = Math.floor(idx2_float);
    const idx2_ceil = (idx2_floor + 1) % N2;
    const t2 = idx2_float - idx2_floor;
    const v2_start = alignedV2[idx2_floor];
    const v2_end = alignedV2[idx2_ceil];
    const p2 = {
      x: v2_start.x + (v2_end.x - v2_start.x) * t2,
      y: v2_start.y + (v2_end.y - v2_start.y) * t2,
      z: v2_start.z + (v2_end.z - v2_start.z) * t2
    };
    
    // Interpolate between the two sampled boundary points
    morphedVerts.push({
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
      z: p1.z + (p2.z - p1.z) * t
    });
  }
  
  // Orthonormal tangent frame
  const nn = { ...center };
  let up = { x: 0, y: 1, z: 0 };
  const dotVal = nn.x * up.x + nn.y * up.y + nn.z * up.z;
  if (Math.abs(dotVal) > 0.99) up = { x: 1, y: 0, z: 0 };
  
  // cross(nn, up)
  const ux = nn.y * up.z - nn.z * up.y;
  const uy = nn.z * up.x - nn.x * up.z;
  const uz = nn.x * up.y - nn.y * up.x;
  const uLen = Math.sqrt(ux*ux + uy*uy + uz*uz);
  const u = { x: ux / uLen, y: uy / uLen, z: uz / uLen };
  
  // cross(nn, u)
  const v = {
    x: nn.y * u.z - nn.z * u.y,
    y: nn.z * u.x - nn.x * u.z,
    z: nn.x * u.y - nn.y * u.x
  };
  
  return {
    id: face1.id,
    shape: N === 5 ? 'pentagon' : 'hexagon',
    center,
    vertices: morphedVerts,
    neighbors: [],
    tangentFrame: [u, v, nn]
  };
};

export function AnimatedTile() {
  const activeSlide = useGameStore(s => s.activeSlide);
  const faces = useGameStore(s => s.faces);
  const groupRef = useRef<THREE.Group>(null);
  
  const [morphedFaceState, setMorphedFaceState] = useState<any>(null);

  useEffect(() => {
    if (!activeSlide) {
      setMorphedFaceState(null);
    }
  }, [activeSlide]);

  useFrame(() => {
    if (!activeSlide || !groupRef.current) return;
    const { path, startTime, duration } = activeSlide;
    const elapsed = performance.now() - startTime;
    
    const segmentCount = path.length - 1;
    if (segmentCount <= 0) return;
    
    const segmentDuration = duration / segmentCount;
    const segmentIndex = Math.min(Math.floor(elapsed / segmentDuration), segmentCount - 1);
    const segmentT = Math.min(Math.max((elapsed - segmentIndex * segmentDuration) / segmentDuration, 0), 1);
    
    const fromFace = faces[path[segmentIndex]];
    const toFace = faces[path[segmentIndex + 1]];
    
    // Update the dynamic, morphed face
    const currentMorphedFace = getMorphedFace(fromFace, toFace, segmentT);
    setMorphedFaceState(currentMorphedFace);

    // Dynamic elevation arc (hop) to prevent flat shape clipping through neighboring flat faces
    const hopScale = 1.02 + 0.05 * Math.sin(segmentT * Math.PI);
    groupRef.current.scale.set(hopScale, hopScale, hopScale);
  });

  if (!activeSlide) return null;
  const startFace = faces[activeSlide.path[0]];

  return (
    <group ref={groupRef} scale={[1.02, 1.02, 1.02]}>
      <Tile 
        face={morphedFaceState || startFace} 
        tile={{ faceId: startFace.id, element: activeSlide.element, spawnedAtTurn: 0 }} 
      />
    </group>
  );
}
