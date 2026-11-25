// src/three/FusionParticles.tsx
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../game/state';
import { ELEMENTS } from '../game/elements';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  scale: number;
  maxAge: number;
  age: number;
}

interface ParticleBurst {
  id: number;
  center: THREE.Vector3;
  particles: Particle[];
}

export function FusionParticles() {
  const lastMerge = useGameStore(s => s.lastMerge);
  const faces = useGameStore(s => s.faces);
  const burstsRef = useRef<ParticleBurst[]>([]);
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const nextId = useRef(0);
  const wasActiveRef = useRef(false);

  // Pre-allocate temporary objects to avoid allocations in the render loop
  const tempObject = React.useMemo(() => new THREE.Object3D(), []);
  const tempColor = React.useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    if (instancedMeshRef.current) {
      instancedMeshRef.current.count = 0;
    }
  }, []);

  // Listen for new merges and spawn particle bursts
  useEffect(() => {
    if (!lastMerge) return;

    const face = faces[lastMerge.toFaceId];
    if (!face) return;

    const center = new THREE.Vector3(face.center.x, face.center.y, face.center.z).normalize().multiplyScalar(1.03);
    const element = ELEMENTS[lastMerge.output];
    const elColor = new THREE.Color(element ? element.color : '#ffffff');

    const particleCount = 20;
    const particles: Particle[] = [];

    // Tangent axes for radial ejection flat against the sphere's surface
    const normal = center.clone().normalize();
    let up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(up.dot(normal)) > 0.95) {
      up.set(0, 0, -1);
    }
    const right = new THREE.Vector3().crossVectors(up, normal).normalize();
    const tangentUp = new THREE.Vector3().crossVectors(normal, right).normalize();

    for (let i = 0; i < particleCount; i++) {
      // Create circular distribution on the tangent plane (velocities in units/sec for 120Hz invariance)
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.01 + Math.random() * 0.02) * 60;

      const velocity = new THREE.Vector3()
        .addScaledVector(right, Math.cos(angle))
        .addScaledVector(tangentUp, Math.sin(angle))
        .normalize()
        .multiplyScalar(speed)
        // Add a slight outward push away from the core
        .addScaledVector(normal, (0.003 + Math.random() * 0.007) * 60);

      particles.push({
        position: center.clone(),
        velocity,
        color: elColor.clone().multiplyScalar(0.8 + Math.random() * 0.4), // slight color variation
        scale: 0.02 + Math.random() * 0.03,
        maxAge: 0.33 + Math.random() * 0.25, // seconds
        age: 0,
      });
    }

    burstsRef.current.push({
      id: nextId.current++,
      center,
      particles,
    });
  }, [lastMerge, faces]);

  useFrame((_, rawDelta) => {
    const mesh = instancedMeshRef.current;
    if (!mesh) return;

    if (burstsRef.current.length === 0) {
      if (wasActiveRef.current) {
        mesh.count = 0;
        wasActiveRef.current = false;
      }
      return;
    }

    const delta = Math.min(rawDelta, 0.05);
    const drag = Math.pow(0.93, delta * 60);
    const activeBursts: ParticleBurst[] = [];

    // 1. Update particle physics & filter out dead bursts
    for (const burst of burstsRef.current) {
      let burstHasLivingParticles = false;
      for (const p of burst.particles) {
        if (p.age < p.maxAge) {
          p.velocity.multiplyScalar(drag);
          p.position.addScaledVector(p.velocity, delta);
          p.age += delta;
          if (p.age < p.maxAge) {
            burstHasLivingParticles = true;
          }
        }
      }
      if (burstHasLivingParticles) {
        activeBursts.push(burst);
      }
    }

    burstsRef.current = activeBursts;

    // 2. Set instanced positions, scales, and colors for active particles only
    let idx = 0;
    const maxCapacity = 500;
    for (const burst of activeBursts) {
      for (const p of burst.particles) {
        if (p.age < p.maxAge && idx < maxCapacity) {
          const progress = p.age / p.maxAge;
          const currentScale = p.scale * (1.0 - progress);

          tempObject.position.copy(p.position);
          tempObject.scale.set(currentScale, currentScale, currentScale);
          tempObject.updateMatrix();

          mesh.setMatrixAt(idx, tempObject.matrix);

          // Ethereal glowing fade out
          tempColor.copy(p.color).multiplyScalar(1.0 - progress);
          mesh.setColorAt(idx, tempColor);

          idx++;
        }
      }
    }

    mesh.count = idx;
    wasActiveRef.current = idx > 0;
    if (idx > 0) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  });

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[null as any, null as any, 500]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}
