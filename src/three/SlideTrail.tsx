// src/three/SlideTrail.tsx
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../game/state';
import { ELEMENTS } from '../game/elements';

export function SlideTrail() {
  const activeSlide = useGameStore(s => s.activeSlide);
  const faces = useGameStore(s => s.faces);
  const lineRef = React.useRef<THREE.Line>(null);

  const points = useMemo(() => {
    if (!activeSlide || activeSlide.path.length < 2) return [];

    const pathPoints: THREE.Vector3[] = [];
    for (const faceId of activeSlide.path) {
      const face = faces[faceId];
      if (face) {
        // Lift slightly above the sphere to avoid intersecting the tiles
        const p = new THREE.Vector3(face.center.x, face.center.y, face.center.z).normalize().multiplyScalar(1.025);
        pathPoints.push(p);
      }
    }
    return pathPoints;
  }, [activeSlide, faces]);

  const geometry = useMemo(() => {
    if (points.length === 0) return new THREE.BufferGeometry();
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  useFrame(() => {
    if (!activeSlide || !lineRef.current) return;

    const { startTime, duration } = activeSlide;
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1.0);

    // Fade out trail towards the end of the slide
    const mat = lineRef.current.material as THREE.LineBasicMaterial;
    if (mat) {
      mat.opacity = 0.55 * (1.0 - progress);
    }
  });

  if (!activeSlide || points.length === 0) return null;

  const element = ELEMENTS[activeSlide.element];
  const color = element ? element.color : '#38bdf8';

  const LineElement = 'line' as any;

  return (
    <LineElement ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={0.55}
        linewidth={3} // Note: linewidth > 1 is not supported by WebGL implementations in most browsers, but we keep it clean
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </LineElement>
  );
}
