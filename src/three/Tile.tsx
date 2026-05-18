// src/three/Tile.tsx
import React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Edges } from '@react-three/drei';
import { lerpVec3 } from '../utils/math';
import type { Face, Tile as TileType } from '../game/types';
import { ELEMENTS } from '../game/elements';
import { useGameStore } from '../game/state';

interface TileProps {
  face: Face;
  tile?: TileType;
}

export function Tile({ face, tile }: TileProps) {
  const startDrag = useGameStore(s => s.startDrag);
  const endDrag = useGameStore(s => s.endDrag);
  const isAnimating = useGameStore(s => s.isAnimating);

  const element = tile ? ELEMENTS[tile.element] : null;
  const color = element ? element.color : '#334155';

  // Proper 3D polygon geometry from the face's 3D vertices
  const geometry = React.useMemo(() => {
    const verts = face.vertices;
    if (!verts || verts.length < 3) {
      return new THREE.BufferGeometry();
    }

    const positions: number[] = [];
    const center = face.center;

    const shrinkFactor = 0.94;
    const shrunkVerts = verts.map(v => lerpVec3(center, v, shrinkFactor));

    // Create a simple fan from the center (works well for convex pentagons/hexagons)
    for (let i = 0; i < shrunkVerts.length; i++) {
      const next = (i + 1) % shrunkVerts.length;

      // Triangle: center -> vert[i] -> vert[next]
      positions.push(center.x, center.y, center.z);
      positions.push(shrunkVerts[i].x, shrunkVerts[i].y, shrunkVerts[i].z);
      positions.push(shrunkVerts[next].x, shrunkVerts[next].y, shrunkVerts[next].z);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }, [face.vertices, face.center]);

  const handlePointerDown = (e: any) => {
    if (isAnimating) return;
    e.stopPropagation();
    if (tile) startDrag(face.id);
  };

  const textRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (textRef.current && face.tangentFrame) {
      const localNormal = new THREE.Vector3(face.center.x, face.center.y, face.center.z).normalize();
      const localUp = new THREE.Vector3(face.tangentFrame.v.x, face.tangentFrame.v.y, face.tangentFrame.v.z).normalize();
      const localRight = new THREE.Vector3().crossVectors(localUp, localNormal).normalize();
      const m = new THREE.Matrix4().makeBasis(localRight, localUp, localNormal);
      textRef.current.quaternion.setFromRotationMatrix(m);
    }
  }, [face]);

  return (
    <group>
      <mesh
        geometry={geometry}
        onPointerDown={handlePointerDown}
        userData={{ faceId: face.id }}
      >
        <meshLambertMaterial 
          color={color} 
          side={THREE.DoubleSide} 
          flatShading 
        />
        <Edges scale={1} threshold={15} color={element ? "black" : "#1a1e20"} />
      </mesh>

      {/* Pentagon indicator */}
      {face.shape === 'pentagon' && (
        <mesh geometry={geometry} scale={0.9}>
          <meshBasicMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.12} 
            side={THREE.DoubleSide} 
          />
        </mesh>
      )}

      {/* Element symbol */}
      {element && (
        <Text
          ref={textRef}
          position={[face.center.x * 1.01, face.center.y * 1.01, face.center.z * 1.01]}
          fontSize={0.25}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000000"
          renderOrder={1}
        >
          {element.symbol}
        </Text>
      )}
    </group>
  );
}