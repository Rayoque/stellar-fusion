// src/three/EndStateEffect.tsx
// End-of-run ejecta. The burst is seeded from the actual final board: every
// tile ejects particles in its element's color, so the nebula a player sees
// is literally the elements their star forged — which is what a real stellar
// death does. One simple rule set, four behaviors:
//   white_dwarf     gentle shell shed drifting outward (planetary nebula)
//   neutron_star    violent fast burst
//   black_hole      burst that reverses — everything falls back in and vanishes
//   failed_collapse a fizzle: a weak puff that sinks back to the surface
import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../game/state';
import { ELEMENTS } from '../game/elements';
import type { EndState } from '../game/types';

interface EjectaParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  scale: number;
  age: number;
  maxAge: number;
  dead: boolean;
}

interface BehaviorParams {
  speedMin: number;
  speedMax: number;
  drag: number;
  maxAge: number;       // frames
  perTile: number;
  whiten: number;       // 0..1 lerp toward white for hotter looks
  reverseAt?: number;   // age (frames) after which gravity pulls back to origin
  pullStrength?: number;
  killRadius?: number;  // particles vanish inside this radius (event horizon / surface)
}

const BEHAVIORS: Partial<Record<EndState, BehaviorParams>> = {
  white_dwarf:     { speedMin: 0.004, speedMax: 0.010, drag: 0.988, maxAge: 260, perTile: 16, whiten: 0.45 },
  neutron_star:    { speedMin: 0.022, speedMax: 0.052, drag: 0.966, maxAge: 170, perTile: 24, whiten: 0.25 },
  black_hole:      { speedMin: 0.018, speedMax: 0.042, drag: 0.972, maxAge: 240, perTile: 22, whiten: 0.1, reverseAt: 50, pullStrength: 0.0024, killRadius: 0.18 },
  failed_collapse: { speedMin: 0.005, speedMax: 0.012, drag: 0.975, maxAge: 170, perTile: 10, whiten: 0.0, reverseAt: 35, pullStrength: 0.0008, killRadius: 0.95 },
};

const MAX_INSTANCES = 900;
const WHITE = new THREE.Color('#ffffff');

export function EndStateEffect() {
  const endState = useGameStore(s => s.endState);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particlesRef = useRef<EjectaParticle[]>([]);
  const firedForRef = useRef<number>(-1); // runGeneration the burst belongs to

  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const tempVec = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (!endState) {
      // New run / continue: let any remaining ejecta finish on its own, but a
      // fresh game (generation bump) clears immediately via the check below.
      return;
    }
    const params = BEHAVIORS[endState];
    if (!params) return; // 'jammed' gets no ceremony — the board speaks for itself

    const state = useGameStore.getState();
    if (firedForRef.current === state.runGeneration) return; // one burst per run
    firedForRef.current = state.runGeneration;

    const particles: EjectaParticle[] = [];
    for (const tile of state.tiles.values()) {
      const face = state.faces[tile.faceId];
      const el = ELEMENTS[tile.element];
      if (!face || !el) continue;

      const normal = tempVec.set(face.center.x, face.center.y, face.center.z).clone().normalize();
      const baseColor = new THREE.Color(el.color).lerp(WHITE, params.whiten);

      for (let i = 0; i < params.perTile; i++) {
        if (particles.length >= MAX_INSTANCES) break;
        const speed = params.speedMin + Math.random() * (params.speedMax - params.speedMin);
        // Mostly radial, with a cone of jitter so each tile blooms outward
        const jitter = new THREE.Vector3(
          (Math.random() - 0.5) * 0.9,
          (Math.random() - 0.5) * 0.9,
          (Math.random() - 0.5) * 0.9
        );
        const dir = normal.clone().multiplyScalar(1.6).add(jitter).normalize();
        particles.push({
          position: normal.clone().multiplyScalar(1.02 + Math.random() * 0.04),
          velocity: dir.multiplyScalar(speed),
          color: baseColor.clone().multiplyScalar(0.75 + Math.random() * 0.5),
          scale: 0.02 + Math.random() * 0.035,
          age: 0,
          maxAge: params.maxAge * (0.7 + Math.random() * 0.5),
          dead: false,
        });
      }
    }
    particlesRef.current = particles;
  }, [endState]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // A brand-new run invalidates leftover ejecta instantly
    const gen = useGameStore.getState().runGeneration;
    if (particlesRef.current.length > 0 && firedForRef.current !== gen && !useGameStore.getState().endState) {
      particlesRef.current = [];
    }

    const endStateNow = useGameStore.getState().endState;
    const params = endStateNow ? BEHAVIORS[endStateNow] : undefined;

    let idx = 0;
    for (const p of particlesRef.current) {
      if (p.dead || p.age >= p.maxAge) continue;

      p.velocity.multiplyScalar(params?.drag ?? 0.97);

      // Reversal: gravity reasserts itself (black hole infall / fizzle sink)
      if (params?.reverseAt !== undefined && p.age > params.reverseAt) {
        const r = p.position.length();
        if (r > 0.001) {
          const pull = (params.pullStrength ?? 0.001) / Math.max(r * r, 0.04);
          p.velocity.addScaledVector(tempVec.copy(p.position).normalize(), -pull);
        }
      }

      p.position.add(p.velocity);
      p.age += 1;

      // Swallowed (event horizon) or re-absorbed (fell back to the surface)
      if (params?.killRadius !== undefined && params.reverseAt !== undefined && p.age > params.reverseAt) {
        if (p.position.length() < params.killRadius) {
          p.dead = true;
          continue;
        }
      }

      const progress = p.age / p.maxAge;
      const s = p.scale * (1 - progress * 0.85);
      tempObject.position.copy(p.position);
      tempObject.scale.set(s, s, s);
      tempObject.updateMatrix();
      mesh.setMatrixAt(idx, tempObject.matrix);
      tempColor.copy(p.color).multiplyScalar(1 - progress);
      mesh.setColorAt(idx, tempColor);
      idx++;
    }

    // Park unused instances out of sight
    tempObject.position.set(9999, 9999, 9999);
    tempObject.scale.set(0, 0, 0);
    tempObject.updateMatrix();
    for (let i = idx; i < MAX_INSTANCES; i++) {
      mesh.setMatrixAt(i, tempObject.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, MAX_INSTANCES]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}
