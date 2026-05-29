// src/three/Background.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Background() {
  const pointsRef = useRef<THREE.Points>(null!);

  const particles = useMemo(() => {
    const count = 350; // elegant, sparse density to avoid busy visual noise
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 160 + Math.random() * 60; // distant shell to ensure zero zoom parallax
      positions[i] = r * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = r * Math.cos(phi);
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      // Extremely subtle and gentle twinkle
      const material = pointsRef.current.material as THREE.PointsMaterial;
      material.opacity = 0.25 + Math.sin(state.clock.elapsedTime * 0.8) * 0.07;

      // Imperceptibly slow ambient star field drift
      const slowSpeed = 0.0006; // rad/sec (extremely calming and slow)
      pointsRef.current.rotation.y = state.clock.elapsedTime * slowSpeed;
      pointsRef.current.rotation.x = state.clock.elapsedTime * (slowSpeed * 0.3);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.1} // Fine, microscopic point size in 3D world units
        color="#ffffff"
        transparent
        opacity={0.32} // Dimmed significantly to keep focus on the star/board and avoid jarring movements
        sizeAttenuation={true} // Universally supported WebGL point sizing across all mobile devices/browsers
        fog={false} // Ignore local camera fog
      />
    </points>
  );
}
