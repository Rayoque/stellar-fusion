// src/three/Sphere.tsx
import React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
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
  const showRealtimeGraphics = useGameStore(s => s.showRealtimeGraphics);

  const scale = phaseScale(phase);

  const innerRef = React.useRef<THREE.Mesh>(null);
  const middleRef = React.useRef<THREE.Mesh>(null);
  const outerRef = React.useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    // Volumetric counter-rotating layers to create a deep, boiling gas/convection effect
    if (innerRef.current) {
      innerRef.current.rotation.y += delta * 0.015;
      innerRef.current.rotation.x += delta * 0.005;
    }
    if (showRealtimeGraphics) {
      if (middleRef.current) {
        middleRef.current.rotation.y -= delta * 0.028;
        middleRef.current.rotation.z += delta * 0.01;
      }
      if (outerRef.current) {
        outerRef.current.rotation.y += delta * 0.045;
        outerRef.current.rotation.x -= delta * 0.012;
      }
    }
  });

  const auraColor = PHASE_AURA_COLORS[phase] || PHASE_AURA_COLORS.main_sequence;

  return (
    <group scale={[scale, scale, scale]}>
      {/* Layer 1: Solid Inner Foundation Core (Opaque emissive material for vector plasma core) */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.88, 48, 48]} />
        <meshLambertMaterial 
          color={auraColor}
          emissive={auraColor}
          emissiveIntensity={0.65}
          transparent={false}
        />
      </mesh>

      {/* Layer 2: Middle Translucent Shell (Additive blending, counter-rotating for volumetric fluid motion) */}
      {showRealtimeGraphics && (
        <mesh ref={middleRef}>
          <sphereGeometry args={[0.90, 48, 48]} />
          <meshBasicMaterial 
            color={auraColor} 
            transparent={true} 
            opacity={0.25} 
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Layer 3: Outer Atmospheric Shell (Additive blending, faster rotation for convective plasma drift) */}
      {showRealtimeGraphics && (
        <mesh ref={outerRef}>
          <sphereGeometry args={[0.918, 48, 48]} />
          <meshBasicMaterial 
            color={auraColor} 
            transparent={true} 
            opacity={0.15} 
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

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