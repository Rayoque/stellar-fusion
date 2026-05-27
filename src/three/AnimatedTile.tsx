// src/three/AnimatedTile.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/state';
import { Text } from '@react-three/drei';
import { ELEMENTS } from '../game/elements';

export interface BlobMeshProps {
  position: THREE.Vector3;
  color: string;
  opacity: number;
  scaleFactor: number;
  symbol?: string;
  time: number;
}

export function BlobMesh({ position, color, opacity, scaleFactor, symbol, time }: BlobMeshProps) {
  // Pre-allocate position array and indices once
  const geom = React.useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(25 * 3); // 1 center + 24 outer vertices
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const indices = [];
    for (let i = 1; i <= 24; i++) {
      const next = i === 24 ? 1 : i + 1;
      indices.push(0, i, next);
    }
    g.setIndex(indices);
    return g;
  }, []);

  // Update outer vertices on every frame to create a boiling, organic fluid plasma blob
  React.useLayoutEffect(() => {
    const pos = geom.attributes.position.array as Float32Array;
    pos[0] = 0; pos[1] = 0; pos[2] = 0;

    for (let i = 0; i < 24; i++) {
      const angle = (i * 2 * Math.PI) / 24;
      // Multi-frequency organic wave deformation
      const wave = 0.02 * Math.sin(angle * 4 + time * 0.007) + 0.01 * Math.cos(angle * 7 - time * 0.004);
      const radius = 0.23 * scaleFactor + wave * scaleFactor;

      pos[(i + 1) * 3] = radius * Math.cos(angle);
      pos[(i + 1) * 3 + 1] = radius * Math.sin(angle);
      pos[(i + 1) * 3 + 2] = 0;
    }
    geom.attributes.position.needsUpdate = true;
    geom.computeVertexNormals();
  }, [geom, scaleFactor, time]);

  // Align the flat blob perfectly tangent to the sphere's curved surface and oriented upright (matching static shape)
  const quaternion = React.useMemo(() => {
    const localNormal = position.clone().normalize();
    
    let localUp = new THREE.Vector3(0, 1, 0);
    const dotVal = localUp.dot(localNormal);
    if (Math.abs(dotVal) > 0.99) {
      localUp.set(0, 0, -1);
      const dotVal2 = localUp.dot(localNormal);
      localUp.sub(localNormal.clone().multiplyScalar(dotVal2)).normalize();
    } else {
      localUp.sub(localNormal.clone().multiplyScalar(dotVal)).normalize();
    }
    
    const localRight = new THREE.Vector3().crossVectors(localUp, localNormal).normalize();
    const m = new THREE.Matrix4().makeBasis(localRight, localUp, localNormal);
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, [position]);

  return (
    <mesh position={position} quaternion={quaternion} geometry={geom}>
      <meshBasicMaterial 
        color={color} 
        transparent 
        opacity={opacity} 
        depthWrite={false} 
        side={THREE.DoubleSide} 
      />
      {symbol && (
        <Text
          position={[0, 0, 0.015]} // Hover text slightly above the blob to prevent z-fighting
          fontSize={0.24}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.012}
          outlineColor="#000000"
        >
          {symbol}
        </Text>
      )}
    </mesh>
  );
}

export function AnimatedTile() {
  const activeSlide = useGameStore(s => s.activeSlide);
  const faces = useGameStore(s => s.faces);
  const groupRef = useRef<THREE.Group>(null);
  
  const [time, setTime] = useState(0);

  // Pre-allocated vector references to avoid per-frame allocations
  const mainPos = useRef(new THREE.Vector3());
  const tail1Pos = useRef(new THREE.Vector3());
  const tail2Pos = useRef(new THREE.Vector3());
  const [hasTails, setHasTails] = useState({ tail1: false, tail2: false });

  // Track the active slide ID to detect when a new slide has been initiated
  const lastSlideStartRef = useRef<number | null>(null);

  if (activeSlide) {
    const slideId = activeSlide.startTime;
    if (lastSlideStartRef.current !== slideId) {
      lastSlideStartRef.current = slideId;
      const startFace = faces[activeSlide.path[0]];
      if (startFace) {
        const startPos = new THREE.Vector3(startFace.center.x, startFace.center.y, startFace.center.z).normalize().multiplyScalar(1.02);
        mainPos.current.copy(startPos);
        tail1Pos.current.copy(startPos);
        tail2Pos.current.copy(startPos);
      }
    }
  }

  useFrame(() => {
    if (!activeSlide || !groupRef.current) return;
    const { path, startTime, duration } = activeSlide;
    const now = performance.now();
    const elapsed = now - startTime;
    setTime(now);

    const segmentCount = path.length - 1;
    if (segmentCount <= 0) return;
    const segmentDuration = duration / segmentCount;

    // Helper to evaluate curved position along the actual path at any elapsed time
    const getPosAtPathTime = (tElapsed: number, outVec: THREE.Vector3): boolean => {
      if (tElapsed < 0) return false;
      if (tElapsed >= duration) {
        const endFace = faces[path[path.length - 1]];
        outVec.set(endFace.center.x, endFace.center.y, endFace.center.z).normalize().multiplyScalar(1.02);
        return true;
      }
      const segIndex = Math.min(Math.floor(tElapsed / segmentDuration), segmentCount - 1);
      const segT = (tElapsed - segIndex * segmentDuration) / segmentDuration;
      const fromFace = faces[path[segIndex]];
      const toFace = faces[path[segIndex + 1]];
      
      outVec.set(fromFace.center.x, fromFace.center.y, fromFace.center.z)
        .lerp(new THREE.Vector3(toFace.center.x, toFace.center.y, toFace.center.z), segT)
        .normalize()
        .multiplyScalar(1.02);
      return true;
    };

    // 1. Calculate Main Blob Position
    getPosAtPathTime(elapsed, mainPos.current);

    // 2. Calculate Tail 1 Position (delayed by 35ms)
    const t1Active = getPosAtPathTime(elapsed - 35, tail1Pos.current);
    
    // 3. Calculate Tail 2 Position (delayed by 70ms)
    const t2Active = getPosAtPathTime(elapsed - 70, tail2Pos.current);

    setHasTails({ tail1: t1Active, tail2: t2Active });

    // Smooth transition from 1.06 (held scale) using sin-based elevation arc
    const progress = Math.min(elapsed, duration) / duration;
    const hopScale = 1.06 * (1 - progress) + 1.0 * progress + 0.06 * Math.sin(progress * Math.PI);
    groupRef.current.scale.set(hopScale, hopScale, hopScale);
  });

  if (!activeSlide) return null;

  const element = ELEMENTS[activeSlide.element];
  const color = element ? element.color : '#ff6b6b';
  const symbol = element ? element.symbol : 'H';

  return (
    <group ref={groupRef}>
      {/* Tail Segment 2 (deep trail) */}
      {hasTails.tail2 && (
        <BlobMesh
          position={tail2Pos.current.clone()}
          color={color}
          opacity={0.22}
          scaleFactor={0.48}
          time={time - 70}
        />
      )}

      {/* Tail Segment 1 (close trail) */}
      {hasTails.tail1 && (
        <BlobMesh
          position={tail1Pos.current.clone()}
          color={color}
          opacity={0.48}
          scaleFactor={0.72}
          time={time - 35}
        />
      )}

      {/* Main Boiling Fluid Blob */}
      <BlobMesh
        position={mainPos.current.clone()}
        color={color}
        opacity={0.92}
        scaleFactor={1.0}
        symbol={symbol}
        time={time}
      />
    </group>
  );
}
