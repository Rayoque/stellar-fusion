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
  const tiles = useGameStore(s => s.tiles);
  const isAnimating = useGameStore(s => s.isAnimating);

  const dragStartFaceId = useRef<number | null>(null);
  const dragStartPos = useRef<THREE.Vector3 | null>(null);
  const [isDraggingTile, setIsDraggingTile] = React.useState(false);
  const [isPointerDownOnTile, setIsPointerDownOnTile] = React.useState(false);

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

      // Only begin tracking a drag if the clicked face actually has an active tile on it!
      if (hitFaceId !== null && tiles.has(hitFaceId)) {
        dragStartFaceId.current = hitFaceId;
        dragStartPos.current = new THREE.Vector3(x, y, 0);
        setIsPointerDownOnTile(true);
        try {
          dom.setPointerCapture(event.pointerId);
        } catch (err) {}
      } else {
        dragStartFaceId.current = null;
        dragStartPos.current = null;
        setIsDraggingTile(false);
        setIsPointerDownOnTile(false);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (dragStartPos.current === null || dragStartFaceId.current === null || isAnimating) return;

      const rect = dom.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const deltaX = x - dragStartPos.current.x;
      const deltaY = y - dragStartPos.current.y;
      const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // If we haven't locked into tile dragging yet, check if the swipe threshold is crossed (deliberate swipe)
      if (!isDraggingTile) {
        if (dist > 0.08) {
          setIsDraggingTile(true);
          startDrag(dragStartFaceId.current);
        } else {
          // Otherwise, allow OrbitControls to rotate the sphere (blocked immediately by isPointerDownOnTile anyway)
          return;
        }
      }

      // If they drag their finger back to the start shape (dist < 0.08), clear the drag target indicator
      if (dist < 0.08) {
        setDragTargetId(null);
        return;
      }

      const dragVec = new THREE.Vector3(deltaX, deltaY, 0);
      dragVec.transformDirection(camera.matrixWorld).normalize();

      const fromFace = faces[dragStartFaceId.current];
      if (fromFace) {
        const nextId = resolveSlideTarget(fromFace, { x: dragVec.x, y: dragVec.y, z: dragVec.z }, faces);
        setDragTargetId(nextId);
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      try {
        dom.releasePointerCapture(event.pointerId);
      } catch (err) {}

      const startFaceId = dragStartFaceId.current;
      const startPos = dragStartPos.current;
      const wasDragging = isDraggingTile;

      // Reset states
      setIsDraggingTile(false);
      setIsPointerDownOnTile(false);
      dragStartFaceId.current = null;
      dragStartPos.current = null;
      setDragTargetId(null);

      if (!wasDragging || startFaceId === null || startPos === null || isAnimating) {
        return;
      }

      const rect = dom.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const deltaX = x - startPos.x;
      const deltaY = y - startPos.y;
      const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // DELIBERATE SWIPE CANCELLATION CHECK:
      // If the release position is close to the start touch position (dist < 0.08),
      // it means the player dragged their finger back over the starting shape.
      // We cancel the swipe, clear store drag targets, and return early.
      if (dist < 0.08) {
        useGameStore.setState({ selectedFaceId: null });
        return;
      }

      const dragVec = new THREE.Vector3(deltaX, deltaY, 0);
      dragVec.transformDirection(camera.matrixWorld).normalize();

      endDrag(startFaceId, { x: dragVec.x, y: dragVec.y, z: dragVec.z });
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
  }, [camera, gl, scene, startDrag, endDrag, setDragTargetId, faces, tiles, isAnimating, isDraggingTile]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      enableRotate={!isDraggingTile && !isPointerDownOnTile}
      minDistance={2.5}
      maxDistance={12}
      dampingFactor={0.1}
      makeDefault
    />
  );
}
