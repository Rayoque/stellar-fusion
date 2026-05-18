// src/three/Scene.tsx
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Background } from './Background';
import { Sphere } from './Sphere';
import { Controls } from './Controls';

export function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.5], fov: 48 }}
      style={{ background: '#050508' }}
      gl={{ antialias: true, alpha: true }}
    >
      <fog attach="fog" args={['#050508', 8.0, 60.0]} />
      <Background />
      <ambientLight intensity={0.8} />
      <pointLight position={[8, 8, 8]} intensity={2.0} color="#fff8e7" />
      <pointLight position={[-6, -4, -6]} intensity={0.6} color="#a0c4ff" />

      <Sphere />
      <Controls />
    </Canvas>
  );
}
