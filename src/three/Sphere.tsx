// src/three/Sphere.tsx
import React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useGameStore } from '../game/state';
import { Tile } from './Tile';
import { AnimatedTile } from './AnimatedTile';

const PHASE_AURA_COLORS: Record<string, string> = {
  main_sequence: '#38bdf8', // Cyan/Neon Blue
  red_giant: '#f97316',     // Orange/Red
  supergiant: '#fbbf24',    // Gold/Amber
  collapse: '#a855f7'       // Purple/Magenta
};

export function Sphere() {
  const faces = useGameStore(s => s.faces);
  const tiles = useGameStore(s => s.tiles);
  const phase = useGameStore(s => s.phase);

  const scale = phaseScale(phase);

  // Preload iconic, copyright-free NASA and ESO stellar phase photographs
  const textures = useTexture({
    main_sequence: `${import.meta.env.BASE_URL}main_sequence.jpg`,
    red_giant: `${import.meta.env.BASE_URL}red_giant.jpg`,
    supergiant: `${import.meta.env.BASE_URL}supergiant.jpg`,
    collapse: `${import.meta.env.BASE_URL}collapse.jpg`,
  });

  const innerRef = React.useRef<THREE.Mesh>(null);
  const middleRef = React.useRef<THREE.Mesh>(null);
  const outerRef = React.useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    // Volumetric counter-rotating layers to create a deep, boiling gas/convection effect
    if (innerRef.current) {
      innerRef.current.rotation.y += delta * 0.015;
      innerRef.current.rotation.x += delta * 0.005;
    }
    if (middleRef.current) {
      middleRef.current.rotation.y -= delta * 0.028;
      middleRef.current.rotation.z += delta * 0.01;
    }
    if (outerRef.current) {
      outerRef.current.rotation.y += delta * 0.045;
      outerRef.current.rotation.x -= delta * 0.012;
    }
  });

  const auraColor = PHASE_AURA_COLORS[phase] || PHASE_AURA_COLORS.main_sequence;

  return (
    <group scale={[scale, scale, scale]}>
      {/* Layer 1: Solid Inner Foundation Core (Opaque texture mapping to prevent backface see-through artifacts) */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.88, 48, 48]} />
        <meshBasicMaterial 
          map={textures[phase]} 
          transparent={false}
        />
      </mesh>

      {/* Layer 2: Middle Translucent Shell (Additive blending, counter-rotating for volumetric fluid motion) */}
      <mesh ref={middleRef}>
        <sphereGeometry args={[0.90, 48, 48]} />
        <meshBasicMaterial 
          map={textures[phase]} 
          transparent={true} 
          opacity={0.45} 
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Layer 3: Outer Atmospheric Shell (Additive blending, faster rotation for convective plasma drift) */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[0.918, 48, 48]} />
        <meshBasicMaterial 
          map={textures[phase]} 
          transparent={true} 
          opacity={0.35} 
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Layer 4: Stellar Corona Aura (Self-illuminating glowing atmosphere matching current phase color) */}
      <mesh>
        <sphereGeometry args={[0.925, 48, 48]} />
        <meshBasicMaterial 
          color={auraColor}
          transparent={true}
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {faces.map((face) => (
        <Tile
          key={face.id}
          face={face}
          tile={tiles.get(face.id)}
        />
      ))}
      <AnimatedTile />
    </group>
  );
}

// Local helper (only used in this file)
function phaseScale(phase: string): number {
  switch (phase) {
    case 'red_giant':   return 1.3;
    case 'supergiant':  return 1.6;
    case 'collapse':    return 0.45;
    default:            return 1.0;
  }
}