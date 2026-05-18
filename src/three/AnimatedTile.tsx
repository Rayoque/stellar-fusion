// src/three/AnimatedTile.tsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/state';
import { Tile } from './Tile';

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
    
    const startVec = new THREE.Vector3(fromFace.center.x, fromFace.center.y, fromFace.center.z);
    const endVec = new THREE.Vector3(toFace.center.x, toFace.center.y, toFace.center.z);
    
    // Lerp on the sphere surface
    const currentVec = startVec.clone().lerp(endVec, segmentT).normalize();
    
    const startFace = faces[path[0]];
    const baseVec = new THREE.Vector3(startFace.center.x, startFace.center.y, startFace.center.z);
    
    const q = new THREE.Quaternion().setFromUnitVectors(baseVec, currentVec);
    groupRef.current.quaternion.copy(q);
  });

  if (!activeSlide) return null;
  const startFace = faces[activeSlide.path[0]];

  return (
    <group ref={groupRef} scale={[1.01, 1.01, 1.01]}>
      <Tile 
        face={startFace} 
        tile={{ faceId: startFace.id, element: activeSlide.element, spawnedAtTurn: 0 }} 
      />
    </group>
  );
}
