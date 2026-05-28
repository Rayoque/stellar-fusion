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

  // Align the flat blob perfectly tangent to the sphere's curved surface
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

  const textRef = React.useRef<any>(null);

  useFrame((state) => {
    if (textRef.current) {
      const localNormal = position.clone().normalize();
      const camDir = state.camera.position.clone().normalize();
      const qCam = state.camera.quaternion;
      const qGeodesic = new THREE.Quaternion().setFromUnitVectors(camDir, localNormal);
      const finalQ = qGeodesic.clone().multiply(qCam);
      textRef.current.quaternion.copy(finalQ);
    }
  });

  // Calculate high-fidelity billboard position slightly elevated above the sphere center
  const textPos = React.useMemo(() => {
    const norm = position.clone().normalize();
    const dist = position.length();
    return norm.multiplyScalar(dist + 0.015);
  }, [position]);

  return (
    <group>
      {/* Flat tangent plasma blob mesh */}
      <mesh position={position} quaternion={quaternion} geometry={geom}>
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={opacity} 
          depthWrite={false} 
          side={THREE.DoubleSide} 
        />
      </mesh>
      
      {/* Dynamic screen-up billboarded text */}
      {symbol && (
        <Text
          ref={textRef}
          position={textPos}
          fontSize={0.24}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.012}
          outlineColor="#000000"
          renderOrder={1}
        >
          {symbol}
        </Text>
      )}
    </group>
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

    // Helper to evaluate weaving geodesic position along the path from startFace to endFace at any elapsed time
    const getPosAtPathTime = (tElapsed: number, outVec: THREE.Vector3): boolean => {
      if (tElapsed < 0) return false;
      const startFace = faces[path[0]];
      const endFace = faces[path[path.length - 1]];
      if (!startFace || !endFace) return false;

      if (tElapsed >= duration) {
        outVec.set(endFace.center.x, endFace.center.y, endFace.center.z).normalize().multiplyScalar(1.02);
        return true;
      }

      const progress = tElapsed / duration;
      const vStart = new THREE.Vector3(startFace.center.x, startFace.center.y, startFace.center.z).normalize();
      const vEnd = new THREE.Vector3(endFace.center.x, endFace.center.y, endFace.center.z).normalize();

      // Slerp directly from start to end for a mathematically straight geodesic arc on the sphere!
      const q = new THREE.Quaternion().setFromUnitVectors(vStart, vEnd);
      const qSlerp = new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), q, progress);
      
      const posGeodesic = vStart.clone().applyQuaternion(qSlerp);

      // Apply gorgeous weaving/ping-pong lateral displacement along the geodesic line
      const lateralAxis = new THREE.Vector3().crossVectors(vStart, vEnd).normalize();
      if (lateralAxis.lengthSq() > 0.1) {
        const segments = path.length - 1;
        const weaveFreq = segments * Math.PI; // weaves smoothly back and forth per step
        const weaveAmp = 0.085; // highly curated side-to-side ping-pong sway amplitude
        const weaveOffset = Math.sin(progress * weaveFreq) * weaveAmp;
        
        posGeodesic.addScaledVector(lateralAxis, weaveOffset).normalize();
      }

      outVec.copy(posGeodesic).multiplyScalar(1.02);
      return true;
    };

    // Calculate progress with a beautiful ease-out cubic curve (perfectly synchronized with the camera!)
    const progress = Math.min(elapsed, duration) / duration;
    const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    const tEased = easedProgress * duration;

    // 1. Calculate Main Blob Position using eased timeline
    getPosAtPathTime(tEased, mainPos.current);

    // 2. Calculate Tail 1 Position (delayed on eased timeline)
    const t1Active = getPosAtPathTime(tEased - 35, tail1Pos.current);
    
    // 3. Calculate Tail 2 Position (delayed on eased timeline)
    const t2Active = getPosAtPathTime(tEased - 70, tail2Pos.current);

    setHasTails({ tail1: t1Active, tail2: t2Active });

    // Smooth transition from 1.06 (held scale) using sin-based elevation arc
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
