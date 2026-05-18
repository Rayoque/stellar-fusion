// src/three/Controls.tsx
import React, { useRef, useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/state';

export function Controls() {
  const controlsRef = useRef<any>(null);
  const { camera, gl, scene } = useThree();
  const startDrag = useGameStore(s => s.startDrag);
  const endDrag = useGameStore(s => s.endDrag);
  const isAnimating = useGameStore(s => s.isAnimating);
  const selectedFaceId = useGameStore(s => s.selectedFaceId);

  const dragStartPos = useRef<THREE.Vector3 | null>(null);
  const isDraggingTile = useRef(false);

  useEffect(() => {
    const dom = gl.domElement;

    const onPointerDown = (event: PointerEvent) => {
      if (isAnimating) return;

      const rect = dom.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

      const intersects = raycaster.intersectObjects(scene.children, true);

      let hitFaceId: number | null = null;

      for (const hit of intersects) {
        if (hit.object.userData?.faceId !== undefined) {
          hitFaceId = hit.object.userData.faceId;
          break;
        }
      }

      if (hitFaceId !== null) {
        isDraggingTile.current = true;
        dragStartPos.current = new THREE.Vector3(x, y, 0);
        startDrag(hitFaceId);
      } else {
        isDraggingTile.current = false;
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!isDraggingTile.current || !selectedFaceId) {
        isDraggingTile.current = false;
        dragStartPos.current = null;
        return;
      }

      const rect = dom.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const deltaX = x - (dragStartPos.current?.x || 0);
      const deltaY = y - (dragStartPos.current?.y || 0);

      const dragVec = new THREE.Vector3(deltaX, deltaY, 0);
      dragVec.transformDirection(camera.matrixWorld).normalize();

      endDrag(selectedFaceId, { x: dragVec.x, y: dragVec.y, z: dragVec.z });

      isDraggingTile.current = false;
      dragStartPos.current = null;
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointerup', onPointerUp);

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointerup', onPointerUp);
    };
  }, [camera, gl, scene, startDrag, endDrag, isAnimating, selectedFaceId]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      enableRotate={!(isDraggingTile.current || isAnimating)}
      minDistance={2.5}
      maxDistance={12}
      dampingFactor={0.1}
      makeDefault
    />
  );
}
