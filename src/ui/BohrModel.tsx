// src/ui/BohrModel.tsx
import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { triggerHaptic } from '../audio/synth';

interface BohrModelSceneProps {
  atomicNumber: number;
}

// Nucleus particle definition
interface Nucleon {
  position: THREE.Vector3;
  isProton: boolean;
}

function BohrModelScene({ atomicNumber }: BohrModelSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [ionizedElectrons, setIonizedElectrons] = useState<Record<string, boolean>>({});
  const LineElement = 'line' as any;

  // 1. Generate a packed nucleus (Protons: Red, Neutrons: Blue)
  const nucleons = useMemo(() => {
    const arr: Nucleon[] = [];
    const count = Math.min(atomicNumber * 2, 40); // cap visual complexity to avoid lagging
    
    // Golden spiral shell algorithm for spherical packaging
    for (let i = 0; i < count; i++) {
      const isProton = i % 2 === 0;
      
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const radius = 0.14 + Math.random() * 0.06; // tightly packed core

      const position = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );

      arr.push({ position, isProton });
    }
    return arr;
  }, [atomicNumber]);

  // 2. Distribute electrons into shells based on Bohr configurations (2, 8, 18, 32)
  const electronShells = useMemo(() => {
    const shells: Array<{ radius: number; count: number; ids: string[] }> = [];
    let remaining = atomicNumber;
    const shellCapacities = [2, 8, 18, 32];
    const radii = [0.7, 1.2, 1.7, 2.2];

    for (let i = 0; i < shellCapacities.length; i++) {
      if (remaining <= 0) break;
      const cap = shellCapacities[i];
      const countInShell = Math.min(remaining, cap);
      
      const ids: string[] = [];
      for (let j = 0; j < countInShell; j++) {
        ids.push(`shell-${i}-e-${j}`);
      }

      shells.push({
        radius: radii[i],
        count: countInShell,
        ids
      });
      remaining -= countInShell;
    }
    return shells;
  }, [atomicNumber]);

  // Orbit rotation and wave-boiling hum
  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.rotation.y = elapsed * 0.18;
      groupRef.current.rotation.x = Math.sin(elapsed * 0.08) * 0.15;
    }
  });

  const handleIonize = (id: string) => {
    if (ionizedElectrons[id]) return;
    setIonizedElectrons(prev => ({ ...prev, [id]: true }));
    triggerHaptic('light');
  };

  return (
    <group ref={groupRef}>
      {/* 3D Packed Nucleus Core */}
      {nucleons.map((n, i) => (
        <mesh key={i} position={n.position}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshLambertMaterial
            color={n.isProton ? '#ef4444' : '#3b82f6'} // Protons red, Neutrons blue
            emissive={n.isProton ? '#ef4444' : '#3b82f6'}
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}

      {/* Orbit Shell Rings & Orbiting Electrons */}
      {electronShells.map((shell, sIdx) => {
        // Orbit ring helper geometry (drawn flat on XZ plane)
        const ringPoints = [];
        const segments = 64;
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          ringPoints.push(new THREE.Vector3(shell.radius * Math.cos(theta), 0, shell.radius * Math.sin(theta)));
        }
        const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPoints);

        return (
          <group key={sIdx}>
            {/* Transparent shell trajectory guide line */}
            <LineElement geometry={ringGeo}>
              <lineBasicMaterial
                color="rgba(255, 255, 255, 0.06)"
                transparent
                depthWrite={false}
              />
            </LineElement>

            {/* Orbiting electrons */}
            {shell.ids.map((id, eIdx) => {
              const speedMultiplier = 1.6 / shell.radius; // Closer shells orbit faster

              return (
                <Electron
                  key={id}
                  id={id}
                  radius={shell.radius}
                  angleOffset={(eIdx * Math.PI * 2) / shell.count}
                  speed={speedMultiplier}
                  isIonized={!!ionizedElectrons[id]}
                  onIonize={() => handleIonize(id)}
                />
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

interface ElectronProps {
  id: string;
  radius: number;
  angleOffset: number;
  speed: number;
  isIonized: boolean;
  onIonize: () => void;
}

function Electron({ radius, angleOffset, speed, isIonized, onIonize }: ElectronProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const velocityRef = useRef<THREE.Vector3 | null>(null);
  const currentAngle = useRef(angleOffset);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    if (!isIonized) {
      // Regular orbit motion in XZ plane
      currentAngle.current += delta * speed;
      meshRef.current.position.set(
        radius * Math.cos(currentAngle.current),
        0,
        radius * Math.sin(currentAngle.current)
      );
    } else {
      // Ionized ejection: fly outwards radially away from the origin
      if (velocityRef.current === null) {
        // Compute direction pointing outwards
        const dir = meshRef.current.position.clone().normalize();
        if (dir.lengthSq() < 0.1) dir.set(0, 1, 0);
        velocityRef.current = dir.multiplyScalar(0.08); // fly speed
      }
      // Apply delta movement
      meshRef.current.position.addScaledVector(velocityRef.current, delta * 60);
      meshRef.current.scale.multiplyScalar(Math.max(0.92, 1.0 - delta * 2));
    }
  });

  return (
    <mesh
      ref={meshRef}
      onClick={(e) => {
        e.stopPropagation();
        onIonize();
      }}
    >
      <sphereGeometry args={[0.045, 10, 10]} />
      <meshBasicMaterial
        color={isIonized ? '#ff9ff3' : '#10ac84'} // Glows green stably, flashes pink when ionized
        transparent
        opacity={isIonized ? 0.6 : 0.9}
        blending={isIonized ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </mesh>
  );
}

export function BohrModel({ atomicNumber }: { atomicNumber: number }) {
  return (
    <div className="w-full h-[130px] sm:h-[150px] relative select-none rounded-2xl overflow-hidden bg-black/35 border border-white/5 shadow-inner">
      <Canvas
        camera={{ position: [0, 2.5, 3.2], fov: 45 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.9} />
        <pointLight position={[5, 5, 5]} intensity={1.5} color="#fff" />
        <React.Suspense fallback={null}>
          <BohrModelScene atomicNumber={atomicNumber} />
        </React.Suspense>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
          rotateSpeed={0.8}
        />
      </Canvas>
      <div className="absolute bottom-1 right-2 text-[6.5px] font-mono text-white/20 tracking-wider uppercase select-none pointer-events-none">
        Drag to orbit • Tap electron to ionize
      </div>
    </div>
  );
}
