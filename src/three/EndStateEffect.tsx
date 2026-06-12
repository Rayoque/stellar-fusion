// src/three/EndStateEffect.tsx
// End-of-run ceremony visuals, choreographed seismic-charge style:
// detonation crack → a beat of silence while the core collapses → WHOMM —
// and at the WHOMM, everything launches at once: a planar shockwave ring
// and ejecta seeded from the actual final board (every tile disperses in its
// element's color — the nebula is literally the elements the star forged).
//
//   white_dwarf     slow pastel shell-shed + faint, patient ring
//   neutron_star    violent burst + icy blue-white seismic ring
//   black_hole      burst + violet ring, then everything falls back in
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
  age: number;     // starts negative = frames until launch (the silent beat)
  maxAge: number;
  dead: boolean;
}

interface RingParams {
  delayMs: number;
  durMs: number;
  fromScale: number;
  toScale: number;
  color: string;
  maxOpacity: number;
}

interface BehaviorParams {
  speedMin: number;
  speedMax: number;
  drag: number;
  maxAge: number;            // frames
  perTile: number;
  whiten: number;            // 0..1 lerp toward white for hotter looks
  launchDelayFrames: number; // sync with the audio choreography (~60fps)
  reverseAt?: number;        // age (frames) after which gravity pulls back in
  pullStrength?: number;
  killRadius?: number;       // particles vanish inside this radius
  ring?: RingParams;
}

const BEHAVIORS: Partial<Record<EndState, BehaviorParams>> = {
  white_dwarf: {
    speedMin: 0.004, speedMax: 0.010, drag: 0.988, maxAge: 260, perTile: 24, whiten: 0.45,
    launchDelayFrames: 18,
    ring: { delayMs: 300, durMs: 3200, fromScale: 1.0, toScale: 3.4, color: '#fff3d6', maxOpacity: 0.28 },
  },
  neutron_star: {
    speedMin: 0.024, speedMax: 0.05, drag: 0.966, maxAge: 180, perTile: 18, whiten: 0.3,
    launchDelayFrames: 42,
    ring: { delayMs: 700, durMs: 1100, fromScale: 1.0, toScale: 7.0, color: '#bff8ff', maxOpacity: 0.85 },
  },
  black_hole: {
    speedMin: 0.02, speedMax: 0.044, drag: 0.972, maxAge: 240, perTile: 18, whiten: 0.1,
    launchDelayFrames: 42, reverseAt: 95, pullStrength: 0.0026, killRadius: 0.18,
    ring: { delayMs: 700, durMs: 1000, fromScale: 1.0, toScale: 6.5, color: '#c4b5fd', maxOpacity: 0.7 },
  },
  failed_collapse: {
    speedMin: 0.005, speedMax: 0.012, drag: 0.975, maxAge: 170, perTile: 10, whiten: 0.0,
    launchDelayFrames: 20, reverseAt: 55, pullStrength: 0.0008, killRadius: 0.95,
  },
};

const MAX_INSTANCES = 900;
const WHITE = new THREE.Color('#ffffff');

export function EndStateEffect() {
  const endState = useGameStore(s => s.endState);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<EjectaParticle[]>([]);
  const ringAnimRef = useRef<{ start: number } & RingParams | null>(null);
  const firedForGenRef = useRef<number>(-1);

  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const tempVec = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (!endState) return;
    const params = BEHAVIORS[endState];
    if (!params) return; // 'jammed' gets no ceremony — the board speaks for itself

    const state = useGameStore.getState();
    firedForGenRef.current = state.runGeneration;

    const particles: EjectaParticle[] = [];
    for (const tile of state.tiles.values()) {
      const face = state.faces[tile.faceId];
      const el = ELEMENTS[tile.element];
      if (!face || !el) continue;

      const normal = new THREE.Vector3(face.center.x, face.center.y, face.center.z).normalize();
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
          color: baseColor.clone().multiplyScalar(0.95 + Math.random() * 0.5),
          scale: 0.03 + Math.random() * 0.05,
          // Hold position through the silent beat; small stagger so the
          // launch reads as one impact with a breathing edge, not a grid tick.
          age: -(params.launchDelayFrames + Math.floor(Math.random() * 6)),
          maxAge: params.maxAge * (0.7 + Math.random() * 0.5),
          dead: false,
        });
      }
    }
    particlesRef.current = particles;

    if (params.ring && ringRef.current) {
      ringAnimRef.current = { start: performance.now() + params.ring.delayMs, ...params.ring };
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.color.set(params.ring.color);
      mat.opacity = 0;
    } else {
      ringAnimRef.current = null;
    }
  }, [endState]);

  useFrame((frameState) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // A brand-new run invalidates leftover ceremony instantly
    const store = useGameStore.getState();
    if (firedForGenRef.current !== store.runGeneration && !store.endState) {
      if (particlesRef.current.length > 0) particlesRef.current = [];
      ringAnimRef.current = null;
    }

    const params = store.endState ? BEHAVIORS[store.endState] : undefined;

    // --- Ejecta ---
    let idx = 0;
    for (const p of particlesRef.current) {
      if (p.dead) continue;
      if (p.age < 0) { p.age += 1; continue; } // held breath before the WHOMM
      if (p.age >= p.maxAge) continue;

      p.velocity.multiplyScalar(params?.drag ?? 0.97);

      // Reversal: gravity reasserts itself (black-hole infall / fizzle sink)
      if (params?.reverseAt !== undefined && p.age > params.reverseAt) {
        const r = p.position.length();
        if (r > 0.001) {
          const pull = (params.pullStrength ?? 0.001) / Math.max(r * r, 0.04);
          p.velocity.addScaledVector(tempVec.copy(p.position).normalize(), -pull);
        }
        if (params.killRadius !== undefined && p.position.length() < params.killRadius) {
          p.dead = true;
          continue;
        }
      }

      p.position.add(p.velocity);
      p.age += 1;

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

    // --- Shockwave ring (billboarded planar ring — the seismic charge) ---
    const ring = ringRef.current;
    if (ring) {
      const anim = ringAnimRef.current;
      if (anim) {
        const t = (performance.now() - anim.start) / anim.durMs;
        if (t < 0) {
          ring.visible = false;
        } else if (t >= 1) {
          ring.visible = false;
          ringAnimRef.current = null;
        } else {
          ring.visible = true;
          const easeOut = 1 - Math.pow(1 - t, 2.6);
          const s = anim.fromScale + (anim.toScale - anim.fromScale) * easeOut;
          ring.scale.set(s, s, s);
          ring.quaternion.copy(frameState.camera.quaternion);
          (ring.material as THREE.MeshBasicMaterial).opacity = anim.maxOpacity * (1 - t);
        }
      } else {
        ring.visible = false;
      }
    }
  });

  return (
    <>
      <instancedMesh ref={meshRef} args={[null as any, null as any, MAX_INSTANCES]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </instancedMesh>
      <mesh ref={ringRef} visible={false} frustumCulled={false}>
        <ringGeometry args={[0.93, 1.0, 64]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  );
}
