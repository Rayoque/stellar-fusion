// src/three/AnimatedTile.tsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/state';
import { Tile } from './Tile';

// Shared pre-allocated vector & quaternion pools to prevent per-frame object instantiation garbage
const tempStartVec = new THREE.Vector3();
const tempEndVec = new THREE.Vector3();
const tempCurrentVec = new THREE.Vector3();
const tempBaseVec = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();

export function AnimatedTile() {
  const activeSlide = useGameStore(s => s.activeSlide);
  const faces = useGameStore(s => s.faces);
  const groupRef = useRef<THREE.Group>(null);

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
    
    tempStartVec.set(fromFace.center.x, fromFace.center.y, fromFace.center.z);
    tempEndVec.set(toFace.center.x, toFace.center.y, toFace.center.z);
    
    // Lerp on the sphere surface using pre-allocated instances
    tempCurrentVec.copy(tempStartVec).lerp(tempEndVec, segmentT).normalize();
    
    const startFace = faces[path[0]];
    tempBaseVec.set(startFace.center.x, startFace.center.y, startFace.center.z);
    
    // Set quaternion from vectors in-place
    tempQuaternion.setFromUnitVectors(tempBaseVec, tempCurrentVec);
    groupRef.current.quaternion.copy(tempQuaternion);

    // Dynamic elevation arc (hop) to prevent flat shape clipping through neighboring flat faces
    const hopScale = 1.02 + 0.05 * Math.sin(segmentT * Math.PI);
    groupRef.current.scale.set(hopScale, hopScale, hopScale);
  });

  if (!activeSlide) return null;
  const startFace = faces[activeSlide.path[0]];

  return (
    <group ref={groupRef} scale={[1.02, 1.02, 1.02]}>
      <Tile 
        face={startFace} 
        tile={{ faceId: startFace.id, element: activeSlide.element, spawnedAtTurn: 0 }} 
      />
    </group>
  );
}
