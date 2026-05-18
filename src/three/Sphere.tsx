// src/three/Sphere.tsx
import React from 'react';
import { useGameStore } from '../game/state';
import { Tile } from './Tile';
import { AnimatedTile } from './AnimatedTile';

export function Sphere() {
  const faces = useGameStore(s => s.faces);
  const tiles = useGameStore(s => s.tiles);
  const phase = useGameStore(s => s.phase);

  const scale = phaseScale(phase);

  return (
    <group scale={[scale, scale, scale]}>
      {/* Inner core to block visibility through gaps */}
      <mesh>
        <sphereGeometry args={[0.92, 32, 32]} />
        <meshBasicMaterial color="#1e293b" />
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