// src/three/Sphere.tsx
import React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../game/state';
import { Tile } from './Tile';
import { AnimatedTile } from './AnimatedTile';

function hexToRgb(hex: string) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function interpolateColor(color1: string, color2: string, factor: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + factor * (c2.r - c1.r));
  const g = Math.round(c1.g + factor * (c2.g - c1.g));
  const b = Math.round(c1.b + factor * (c2.b - c1.b));
  return rgbToHex(r, g, b);
}

function getMainSequenceColor(mass: number): string {
  // Real stellar astrophysics mass-color scaling:
  // Low mass (1 M☉ - 1.5 M☉): Orange -> Bright Yellow
  // Intermediate mass (1.5 M☉ - 3 M☉): Yellow -> Warm Yellow-White
  // Medium mass (3 M☉ - 8 M☉): Yellow-White -> Pale Blue-White
  // High mass (8 M☉ - 16 M☉): Pale Blue-White -> Vivid Sky Blue
  // Supermassive (16 M☉ - 30 M☉): Vivid Sky Blue -> Hot Deep Electric Blue
  if (mass <= 1.5) {
    const t = (mass - 1.0) / 0.5;
    return interpolateColor('#f97316', '#fbbf24', Math.min(Math.max(t, 0), 1));
  } else if (mass <= 3.0) {
    const t = (mass - 1.5) / 1.5;
    return interpolateColor('#fbbf24', '#fef08a', Math.min(Math.max(t, 0), 1));
  } else if (mass <= 8.0) {
    const t = (mass - 3.0) / 5.0;
    return interpolateColor('#fef08a', '#e0f2fe', Math.min(Math.max(t, 0), 1));
  } else if (mass <= 16.0) {
    const t = (mass - 8.0) / 8.0;
    return interpolateColor('#e0f2fe', '#38bdf8', Math.min(Math.max(t, 0), 1));
  } else {
    const t = (mass - 16.0) / 14.0;
    return interpolateColor('#38bdf8', '#1d4ed8', Math.min(Math.max(t, 0), 1));
  }
}

export function Sphere() {
  const faces = useGameStore(s => s.faces);
  const tiles = useGameStore(s => s.tiles);
  const phase = useGameStore(s => s.phase);
  const starMass = useGameStore(s => s.starMass);
  const showRealtimeGraphics = useGameStore(s => s.showRealtimeGraphics);

  const scale = phaseScale(phase);

  const innerRef = React.useRef<THREE.Mesh>(null);
  const middleRef = React.useRef<THREE.Mesh>(null);
  const outerRef = React.useRef<THREE.Mesh>(null);

  // Dynamic astrophysics colors to ensure Red Giant & Supergiant are completely distinct from all Main Sequence colors:
  // - MS: Mass-dependent dynamic color (Orange -> Yellow -> White -> Blue)
  // - Red Giant: Deep vibrant Scarlet Red
  // - Supergiant: Intensely glowing Crimson-Magenta with rapid convection pulsing
  // - Collapse: Energetic Purple
  const msColor = React.useMemo(() => getMainSequenceColor(starMass), [starMass]);
  const auraColor = React.useMemo(() => {
    switch (phase) {
      case 'red_giant':   return '#ff1a1a'; // Deep vibrant Scarlet Red
      case 'supergiant':  return '#f43f5e'; // Hot electric Crimson-Magenta
      case 'collapse':    return '#a855f7'; // Purple
      default:            return msColor;   // Mass-dependent Main Sequence color
    }
  }, [phase, msColor]);

  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();

    // Volumetric counter-rotating layers to create a deep, boiling gas/convection effect
    if (innerRef.current) {
      innerRef.current.rotation.y += delta * 0.015;
      innerRef.current.rotation.x += delta * 0.005;

      // Premium core emissive intensity pulsing to represent advanced fusion state
      if (innerRef.current.material) {
        const mat = innerRef.current.material as THREE.MeshLambertMaterial;
        if (phase === 'red_giant') {
          mat.emissiveIntensity = 0.65 + Math.sin(elapsed * 1.5) * 0.15; // Slow, breathing pulse
        } else if (phase === 'supergiant') {
          mat.emissiveIntensity = 0.9 + Math.sin(elapsed * 4.5) * 0.25;  // High frequency energetic boiling
        } else if (phase === 'collapse') {
          mat.emissiveIntensity = 0.4 + Math.sin(elapsed * 6.0) * 0.20;  // Highly unstable pre-collapse flicker
        } else {
          mat.emissiveIntensity = 0.65;
        }
      }
    }

    if (showRealtimeGraphics) {
      if (middleRef.current) {
        middleRef.current.rotation.y -= delta * 0.028;
        middleRef.current.rotation.z += delta * 0.01;

        // Additive atmosphere layer 1 convection pulsing
        if (phase === 'red_giant') {
          const s = 0.90 * (1.0 + Math.sin(elapsed * 1.5) * 0.02);
          middleRef.current.scale.set(s, s, s);
        } else if (phase === 'supergiant') {
          const s = 0.90 * (1.0 + Math.sin(elapsed * 4.5) * 0.04);
          middleRef.current.scale.set(s, s, s);
        } else {
          middleRef.current.scale.set(0.90, 0.90, 0.90);
        }
      }
      if (outerRef.current) {
        outerRef.current.rotation.y += delta * 0.045;
        outerRef.current.rotation.x -= delta * 0.012;

        // Additive atmosphere layer 2 convection pulsing
        if (phase === 'red_giant') {
          const s = 0.918 * (1.0 + Math.cos(elapsed * 1.5) * 0.03);
          outerRef.current.scale.set(s, s, s);
        } else if (phase === 'supergiant') {
          const s = 0.918 * (1.0 + Math.cos(elapsed * 4.5) * 0.05);
          outerRef.current.scale.set(s, s, s);
        } else {
          outerRef.current.scale.set(0.918, 0.918, 0.918);
        }
      }
    }
  });

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