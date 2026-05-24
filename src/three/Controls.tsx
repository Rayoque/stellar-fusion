// src/three/Controls.tsx
import React, { useRef, useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/state';
import { resolveSlideTarget } from '../geometry/slide';

export function Controls() {
  const controlsRef = useRef<any>(null);
  const { camera, gl, scene } = useThree();
  const startDrag = useGameStore(s => s.startDrag);
  const endDrag = useGameStore(s => s.endDrag);
  const setDragTargetId = useGameStore(s => s.setDragTargetId);
  const faces = useGameStore(s => s.faces);
  const isAnimating = useGameStore(s => s.isAnimating);
  const selectedFaceId = useGameStore(s => s.selectedFaceId);

  const dragStartPos = useRef<THREE.Vector3 | null>(null);
  const [isDraggingTile, setIsDraggingTile] = React.useState(false);

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
        setIsDraggingTile(true);
        dragStartPos.current = new THREE.Vector3(x, y, 0);
        startDrag(hitFaceId);
        try {
          dom.setPointerCapture(event.pointerId);
        } catch (err) {}
      } else {
        setIsDraggingTile(false);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isDraggingTile || selectedFaceId === null || isAnimating) return;

      const rect = dom.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const deltaX = x - (dragStartPos.current?.x || 0);
      const deltaY = y - (dragStartPos.current?.y || 0);

      // Add a slight deadzone threshold to avoid accidental highlights on immediate touch down
      if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) < 0.04) {
        setDragTargetId(null);
        return;
      }

      const dragVec = new THREE.Vector3(deltaX, deltaY, 0);
      dragVec.transformDirection(camera.matrixWorld).normalize();

      const fromFace = faces[selectedFaceId];
      if (fromFace) {
        const nextId = resolveSlideTarget(fromFace, { x: dragVec.x, y: dragVec.y, z: dragVec.z }, faces);
        setDragTargetId(nextId);
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      try {
        dom.releasePointerCapture(event.pointerId);
      } catch (err) {}

      if (!isDraggingTile || selectedFaceId === null) {
        setIsDraggingTile(false);
        dragStartPos.current = null;
        setDragTargetId(null);
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

      setIsDraggingTile(false);
      dragStartPos.current = null;
      setDragTargetId(null);
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', onPointerUp);

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointercancel', onPointerUp);
    };
  }, [camera, gl, scene, startDrag, endDrag, setDragTargetId, faces, isAnimating, selectedFaceId, isDraggingTile]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      enableRotate={!isDraggingTile}
      minDistance={2.5}
      maxDistance={12}
      dampingFactor={0.1}
      makeDefault
    />
  );
}
