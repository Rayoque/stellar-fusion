// src/three/Background.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/state';

export function Background() {
  const pointsRef = useRef<THREE.Points>(null!);
  const showRealtimeGraphics = useGameStore(s => s.showRealtimeGraphics);

  const particles = useMemo(() => {
    const count = 1200; // high density
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1200 + Math.random() * 400; // placed at extreme, infinite distance to eliminate parallax dust illusion
      positions[i] = r * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = r * Math.cos(phi);
    }
    return positions;
  }, []);

  const colors = useMemo(() => {
    const count = 1200;
    const colorArr = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      // Exponential magnitude distribution: many faint stars, very few highly brilliant ones
      const intensity = 0.15 + Math.pow(Math.random(), 3.5) * 0.85;
      colorArr[i] = intensity;     // R
      colorArr[i + 1] = intensity; // G
      colorArr[i + 2] = intensity; // B
    }
    return colorArr;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      // Gentle twinkle
      const material = pointsRef.current.material as THREE.PointsMaterial;
      material.opacity = 0.6 + Math.sin(state.clock.elapsedTime * 1.5) * 0.15;

      // Extremely slow and subtle independent ambient star field rotation
      const slowSpeed = 0.005; // rad/sec
      pointsRef.current.rotation.y = state.clock.elapsedTime * slowSpeed;
      pointsRef.current.rotation.x = state.clock.elapsedTime * (slowSpeed * 0.4);
    }
  });

  if (!showRealtimeGraphics) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.6} // Super-tiny microscopic pinpricks of light!
        color="#ffffff"
        vertexColors // Enable magnitude intensity variance
        transparent
        opacity={0.8}
        sizeAttenuation={false} // Fixed pixel size on all DPRs
        fog={false} // Completely bypass core collapse convective fog!
      />
    </points>
  );
}
