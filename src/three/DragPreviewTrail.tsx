// src/three/DragPreviewTrail.tsx
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../game/state';
import { ELEMENTS } from '../game/elements';

const PREVIEW_RADIUS = 1.028;
const STEPS_PER_SEGMENT = 6;

export function DragPreviewTrail() {
  const dragPreview = useGameStore(s => s.dragPreview);
  const faces = useGameStore(s => s.faces);

  const color = useMemo(() => {
    if (!dragPreview) return '#93c5fd';
    if (dragPreview.outcome === 'merge' && dragPreview.mergeOutput) {
      return ELEMENTS[dragPreview.mergeOutput]?.color ?? '#fbbf24';
    }
    if (dragPreview.outcome === 'catalyst') return '#22d3ee';
    if (dragPreview.outcome === 'blocked') return '#ef4444';
    return '#93c5fd';
  }, [dragPreview]);

  const { geometry, waypoints } = useMemo(() => {
    if (!dragPreview || dragPreview.path.length < 2) {
      return { geometry: null as THREE.BufferGeometry | null, waypoints: [] as THREE.Vector3[] };
    }

    const arcPoints: THREE.Vector3[] = [];
    const intermediateDots: THREE.Vector3[] = [];

    for (let i = 0; i < dragPreview.path.length - 1; i++) {
      const fA = faces[dragPreview.path[i]];
      const fB = faces[dragPreview.path[i + 1]];
      if (!fA || !fB) continue;

      const vA = new THREE.Vector3(fA.center.x, fA.center.y, fA.center.z).normalize();
      const vB = new THREE.Vector3(fB.center.x, fB.center.y, fB.center.z).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(vA, vB);

      if (i === 0) {
        arcPoints.push(vA.clone().multiplyScalar(PREVIEW_RADIUS));
      } else {
        intermediateDots.push(vA.clone().multiplyScalar(PREVIEW_RADIUS));
      }

      for (let s = 1; s <= STEPS_PER_SEGMENT; s++) {
        const t = s / STEPS_PER_SEGMENT;
        const qStep = new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), q, t);
        arcPoints.push(vA.clone().applyQuaternion(qStep).normalize().multiplyScalar(PREVIEW_RADIUS));
      }
    }

    if (arcPoints.length < 2) {
      return { geometry: null, waypoints: [] };
    }

    return {
      geometry: new THREE.BufferGeometry().setFromPoints(arcPoints),
      waypoints: intermediateDots,
    };
  }, [dragPreview, faces]);

  if (!dragPreview || !geometry) return null;

  const LineElement = 'line' as any;

  return (
    <group>
      <LineElement geometry={geometry}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={0.75}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </LineElement>
      {waypoints.map((pt, idx) => (
        <mesh key={idx} position={pt}>
          <sphereGeometry args={[0.022, 10, 10]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
