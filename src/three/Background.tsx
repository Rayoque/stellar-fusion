// src/three/Background.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/state';

export function Background() {
  const pointsRef = useRef<THREE.Points>(null!);
  const isAstro = useGameStore(s => s.astrophysicistMode);

  const count = 350; // elegant, sparse density to avoid busy visual noise

  // 1. Generate star coordinates shell
  const particles = useMemo(() => {
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

  // 2. Generate O/B/G spectral temperature star colors dynamically!
  const colors = useMemo(() => {
    const colorArr = new Float32Array(count * 3);
    
    // Curated high-end stellar spectrum color palettes
    const oType = new THREE.Color("#00cec9");  // Electric cyan
    const bType = new THREE.Color("#38bdf8");  // Electric blue
    const gType = new THREE.Color("#fbbf24");  // Warm gold
    const white = new THREE.Color("#ffffff");
    
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      let col = white;
      
      if (isAstro) {
        const rand = Math.random();
        if (rand < 0.65) {
          col = bType; // 65% electric blue
        } else if (rand < 0.85) {
          col = oType; // 20% electric cyan
        } else if (rand < 0.95) {
          col = gType; // 10% warm gold
        } else {
          col = white; // 5% brilliant white
        }
      } else {
        col = white; // Classic mode is pure white stars
      }
      
      colorArr[idx] = col.r;
      colorArr[idx + 1] = col.g;
      colorArr[idx + 2] = col.b;
    }
    return colorArr;
  }, [isAstro]);

  useFrame((state) => {
    if (pointsRef.current) {
      // Extremely subtle and gentle twinkle
      const material = pointsRef.current.material as THREE.PointsMaterial;
      material.opacity = 0.25 + Math.sin(state.clock.elapsedTime * 0.8) * 0.07;

      // Drift slightly faster in Astrophysicist Mode to represent high core kinetic energies!
      const slowSpeed = isAstro ? 0.0014 : 0.0006; 
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
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.1} // Fine, microscopic point size in 3D world units
        vertexColors={true} // Enable our gorgeous O/B/G celestial spectrum colors!
        transparent
        opacity={isAstro ? 0.40 : 0.32} // Slightly brighter stars for high energy
        sizeAttenuation={true} // Universally supported WebGL point sizing across all mobile devices/browsers
        fog={false} // Ignore local camera fog
      />
    </points>
  );
}
