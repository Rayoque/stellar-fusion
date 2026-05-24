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

// Shared temporary vector pools for useFrame culling calculations to avoid per-frame allocations
const tempWorldCenter = new THREE.Vector3();
const tempCamDir = new THREE.Vector3();

export function Tile({ face, tile }: TileProps) {
  const startDrag = useGameStore(s => s.startDrag);
  const endDrag = useGameStore(s => s.endDrag);
  const isAnimating = useGameStore(s => s.isAnimating);
  const selectedFaceId = useGameStore(s => s.selectedFaceId);
  const dragTargetId = useGameStore(s => s.dragTargetId);

  const isSelected = face.id === selectedFaceId;
  const isTarget = face.id === dragTargetId;

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

  const textQuaternion = React.useMemo(() => {
    const localNormal = new THREE.Vector3(face.center.x, face.center.y, face.center.z).normalize();
    
    // Choose "up" direction to point towards world-up (0, 1, 0)
    let localUp = new THREE.Vector3(0, 1, 0);
    
    // Project world-up onto the tangent plane: localUp = worldUp - localNormal * (worldUp . localNormal)
    const dotVal = localUp.dot(localNormal);
    if (Math.abs(dotVal) > 0.99) {
      // If we are at the poles, use world-forward (0, 0, -1) as "up"
      localUp.set(0, 0, -1);
      // Project world-forward onto the tangent plane
      const dotVal2 = localUp.dot(localNormal);
      localUp.sub(localNormal.clone().multiplyScalar(dotVal2)).normalize();
    } else {
      localUp.sub(localNormal.clone().multiplyScalar(dotVal)).normalize();
    }
    
    const localRight = new THREE.Vector3().crossVectors(localUp, localNormal).normalize();
    const m = new THREE.Matrix4().makeBasis(localRight, localUp, localNormal);
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, [face]);

  const groupRef = React.useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Ensure world matrix is up to date (handling orbit camera rotations and animations)
    groupRef.current.updateWorldMatrix(true, false);
    
    // Get the world position of the face center using shared static pool
    tempWorldCenter.set(face.center.x, face.center.y, face.center.z);
    tempWorldCenter.applyMatrix4(groupRef.current.matrixWorld);
    tempWorldCenter.normalize();
    
    // Copy camera position and normalize using shared static pool
    tempCamDir.copy(state.camera.position).normalize();
    
    // Compute dot product with zero object allocations
    const dot = tempWorldCenter.dot(tempCamDir);
    
    // Keep visible slightly past the horizon (threshold -0.2) to avoid popping,
    // but cull entirely beyond that to prevent any edges/text from clipping.
    groupRef.current.visible = dot > -0.2;
  });

  return (
    <group ref={groupRef} scale={isSelected ? [1.06, 1.06, 1.06] : [1, 1, 1]}>
      <mesh
        geometry={geometry}
        onPointerDown={handlePointerDown}
        userData={{ faceId: face.id }}
      >
        <meshLambertMaterial 
          color={color} 
          flatShading 
          side={THREE.DoubleSide}
          transparent={!element}
          opacity={element ? 1.0 : 0.15}
        />
        <Edges 
          scale={1} 
          threshold={15} 
          color={isSelected ? "#38bdf8" : (element ? "black" : "rgba(255, 255, 255, 0.12)")} 
        />
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

      {/* Drag target indicator overlay */}
      {isTarget && (
        <mesh geometry={geometry} scale={1.01}>
          <meshBasicMaterial 
            color="#f59e0b" 
            transparent 
            opacity={0.25} 
            side={THREE.DoubleSide}
          />
          <Edges scale={1.005} threshold={15} color="#f59e0b" />
        </mesh>
      )}

      {/* Element symbol */}
      {element && (
        <Text
          quaternion={textQuaternion}
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