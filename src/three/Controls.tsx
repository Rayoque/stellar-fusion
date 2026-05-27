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
        const fromFace = faces[hitFaceId];
        if (fromFace) {
          // Calculate if the tile is clearly in the foreground relative to the camera
          const faceNormal = new THREE.Vector3(fromFace.center.x, fromFace.center.y, fromFace.center.z).normalize();
          const camDir = camera.position.clone().normalize();
          const dot = faceNormal.dot(camDir);
          // Require the tile to be clearly in the foreground (dot > 0.08) to select and move it.
          // This prevents selecting backs of shapes (dot < 0) or tiny slivers on the horizon (dot <= 0.08)
          if (dot <= 0.08) {
            dragStartFaceId.current = null;
            dragStartPos.current = null;
            setIsDraggingTile(false);
            setIsPointerDownOnTile(false);
            return;
          }
        }

        dragStartFaceId.current = hitFaceId;
        dragStartPos.current = new THREE.Vector3(x, y, 0);
        setIsPointerDownOnTile(true);
        startDrag(hitFaceId); // Morph into blob immediately on click/press!
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

      const deltaXTouch = x - dragStartPos.current.x;
      const deltaYTouch = y - dragStartPos.current.y;
      const distFromTouch = Math.sqrt(deltaXTouch * deltaXTouch + deltaYTouch * deltaYTouch);

      // If we haven't locked into tile dragging yet, check if the swipe threshold is crossed (deliberate swipe)
      if (!isDraggingTile) {
        if (distFromTouch > 0.05) {
          setIsDraggingTile(true);
        } else {
          // Otherwise, allow OrbitControls to rotate the sphere (blocked immediately by isPointerDownOnTile anyway)
          return;
        }
      }

      const fromFace = faces[dragStartFaceId.current];
      if (!fromFace) return;

      // Project the center of the starting tile onto the screen in NDC to get a fixed origin point (joystick center)
      const faceCenter = new THREE.Vector3(fromFace.center.x, fromFace.center.y, fromFace.center.z);
      const projectedCenter = faceCenter.project(camera);

      // Calculate the drag vector and distance relative to the projected center of the tile
      const dragVec = new THREE.Vector3(x - projectedCenter.x, y - projectedCenter.y, 0);
      const distFromCenter = dragVec.length();

      // If they drag their finger back close to the center of the tile (distFromCenter < 0.07),
      // clear the drag target indicator to show that releasing will cancel the swipe.
      if (distFromCenter < 0.07) {
        setDragTargetId(null);
      } else {
        const dragDir = dragVec.clone().transformDirection(camera.matrixWorld).normalize();
        const nextId = resolveSlideTarget(fromFace, { x: dragDir.x, y: dragDir.y, z: dragDir.z }, faces);
        setDragTargetId(nextId);
      }

      // Calculate a subtler 3D pull displacement based on the drag vector from the tile's center.
      // We transform it into world space to align with the camera viewport.
      const pullVec = dragVec.clone().transformDirection(camera.matrixWorld).multiplyScalar(0.4);
      if (pullVec.length() > 0.10) {
        pullVec.setLength(0.10); // clamped to 0.10 for local cell boundaries
      }
      useGameStore.setState({ dragOffset3D: { x: pullVec.x, y: pullVec.y, z: pullVec.z } });
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
      useGameStore.setState({ dragOffset3D: null });

      if (!wasDragging || startFaceId === null || startPos === null || isAnimating) {
        useGameStore.setState({ selectedFaceId: null });
        return;
      }

      const rect = dom.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const fromFace = faces[startFaceId];
      if (!fromFace) {
        useGameStore.setState({ selectedFaceId: null });
        return;
      }

      // Project the tile center to calculate final cancel / swipe distance
      const faceCenter = new THREE.Vector3(fromFace.center.x, fromFace.center.y, fromFace.center.z);
      const projectedCenter = faceCenter.project(camera);
      const dragVec = new THREE.Vector3(x - projectedCenter.x, y - projectedCenter.y, 0);
      const distFromCenter = dragVec.length();

      // DELIBERATE SWIPE CANCELLATION CHECK:
      // If the release position is close to the tile center (distFromCenter < 0.07),
      // it means the player dragged their finger back over the starting shape.
      // We cancel the swipe, clear store drag targets, and return early.
      if (distFromCenter < 0.07) {
        useGameStore.setState({ selectedFaceId: null });
        return;
      }

      const dragDir = dragVec.clone().transformDirection(camera.matrixWorld).normalize();
      endDrag(startFaceId, { x: dragDir.x, y: dragDir.y, z: dragDir.z });
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
