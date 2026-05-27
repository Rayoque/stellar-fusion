// src/three/Controls.tsx
import React, { useRef, useEffect } from 'react';
import { TrackballControls } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
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
  const activeSlide = useGameStore(s => s.activeSlide);

  const dragStartFaceId = useRef<number | null>(null);
  const dragStartPos = useRef<THREE.Vector3 | null>(null);
  const [isDraggingTile, setIsDraggingTile] = React.useState(false);
  const [isPointerDownOnTile, setIsPointerDownOnTile] = React.useState(false);
  const camStartPos = useRef<THREE.Vector3 | null>(null);
  const camStartUp = useRef<THREE.Vector3 | null>(null);
  const slideQuaternion = useRef<THREE.Quaternion | null>(null);
 
  // Relative Proportional Camera Tracking: rotate camera position & up vector smoothly using the slide's geodesic quaternion,
  // while gradually drifting the sliding shape closer to the center of the viewport (40% drift per slide)
  useFrame(() => {
    if (!activeSlide) {
      camStartPos.current = null;
      camStartUp.current = null;
      slideQuaternion.current = null;
      return;
    }

    const { path, startTime, duration } = activeSlide;
    const startFaceId = path[0];
    const endFaceId = path[path.length - 1];
    const startFace = faces[startFaceId];
    const endFace = faces[endFaceId];
    if (!startFace || !endFace) return;

    // 1. Initialize starting camera states and the geodesic slide rotation quaternion
    if (camStartPos.current === null) {
      camStartPos.current = camera.position.clone();
      camStartUp.current = camera.up.clone();
      
      const vStart = new THREE.Vector3(startFace.center.x, startFace.center.y, startFace.center.z).normalize();
      const vEnd = new THREE.Vector3(endFace.center.x, endFace.center.y, endFace.center.z).normalize();
      slideQuaternion.current = new THREE.Quaternion().setFromUnitVectors(vStart, vEnd);
    }

    // 2. Calculate progress with a beautiful, high-fidelity ease-in-out cubic curve (snappy acceleration & soft natural snap)
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed, duration) / duration;
    const eased = progress < 0.5 
      ? 4 * progress * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 3) / 2; // easeInOutCubic

    // 3. Interpolate the slide quaternion (slerp from identity quaternion to full slide rotation)
    const qProgress = new THREE.Quaternion().slerpQuaternions(
      new THREE.Quaternion(), // Identity (no rotation)
      slideQuaternion.current!,
      eased
    );

    // 4. Calculate the tile's current position on the unit sphere (same interpolation as AnimatedTile.tsx)
    const segmentCount = path.length - 1;
    const segmentDuration = duration / segmentCount;
    const tEased = eased * duration;
    const vCurrent = new THREE.Vector3();
    
    if (segmentCount > 0) {
      const segIndex = Math.min(Math.floor(tEased / segmentDuration), segmentCount - 1);
      const segT = (tEased - segIndex * segmentDuration) / segmentDuration;
      const fromFace = faces[path[segIndex]];
      const toFace = faces[path[segIndex + 1]];
      if (fromFace && toFace) {
        vCurrent.set(fromFace.center.x, fromFace.center.y, fromFace.center.z)
          .lerp(new THREE.Vector3(toFace.center.x, toFace.center.y, toFace.center.z), segT)
          .normalize();
      } else {
        vCurrent.set(endFace.center.x, endFace.center.y, endFace.center.z).normalize();
      }
    } else {
      vCurrent.set(endFace.center.x, endFace.center.y, endFace.center.z).normalize();
    }

    // 5. Blend 100% relative offset position and perfectly centered position to achieve a 40% drift towards center
    const pRelative = camStartPos.current!.clone().applyQuaternion(qProgress);
    const currentDist = camStartPos.current!.length();
    
    const dirRelative = pRelative.clone().normalize();
    const dirCentered = vCurrent.clone().normalize();
    
    const driftFactor = 0.40; // 40% drift towards screen center per slide
    const blendedDir = new THREE.Vector3().lerpVectors(dirRelative, dirCentered, eased * driftFactor).normalize();

    // 6. Set camera position and up vector exactly in sync
    camera.position.copy(blendedDir.multiplyScalar(currentDist));
    camera.up.copy(camStartUp.current!.clone().applyQuaternion(qProgress));
    camera.lookAt(0, 0, 0);
  });

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

  return isAnimating ? null : (
    <TrackballControls
      ref={controlsRef}
      noPan={true}
      noZoom={false}
      noRotate={isDraggingTile || isPointerDownOnTile}
      minDistance={2.5}
      maxDistance={12}
      dynamicDampingFactor={0.15}
      makeDefault
    />
  );
}
