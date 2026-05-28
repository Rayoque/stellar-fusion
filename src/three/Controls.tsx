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
 
  // Momentum Drift state refs to track Buckyball coasting spin after a slide finishes
  const driftVelocity = useRef<number>(0);
  const driftAxis = useRef<THREE.Vector3>(new THREE.Vector3());

  // Proportional Camera Tracking: rotate camera position & up vector smoothly to track the sliding tile's position,
  // transitioning perfectly and gap-free into the post-slide momentum coasting.
  useFrame((state, delta) => {
    if (!activeSlide) {
      camStartPos.current = null;
      camStartUp.current = null;
      slideQuaternion.current = null;
    }

    // 1. ACTIVE SLIDE PHASE: Camera position is controlled by the slide slerp
    if (activeSlide) {
      const { path, startTime, duration } = activeSlide;
      const startFaceId = path[0];
      const endFaceId = path[path.length - 1];
      const startFace = faces[startFaceId];
      const endFace = faces[endFaceId];
      if (!startFace || !endFace) return;

      // Initialize starting camera states
      if (camStartPos.current === null) {
        camStartPos.current = camera.position.clone();
        camStartUp.current = camera.up.clone();

        // Calculate drift axis and initial velocity right now at the start of the slide!
        const vStart = new THREE.Vector3(startFace.center.x, startFace.center.y, startFace.center.z).normalize();
        const vEnd = new THREE.Vector3(endFace.center.x, endFace.center.y, endFace.center.z).normalize();
        driftAxis.current.crossVectors(vStart, vEnd).normalize();

        const ELEMENT_MASSES: Record<string, number> = {
          H: 1, He: 4, C: 12, O: 16, Ne: 20, Mg: 24, Si: 28, Fe: 56
        };
        const mass = ELEMENT_MASSES[activeSlide.element] || 1;
        const slideLength = path.length - 1;
        
        // Premium dynamic momentum: proportional to BOTH element mass AND slide length/velocity
        const initialVel = mass * 0.0020 * slideLength;
        driftVelocity.current = Math.min(initialVel, 0.12); // clamp at 0.12 rad/frame for visual stability
      }

      const elapsed = performance.now() - startTime;

      if (elapsed < duration) {
        // Calculate progress with a beautiful, high-fidelity ease-out cubic curve (starts fast, decelerates smoothly throughout)
        const progress = elapsed / duration;
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic

        const dirStart = camStartPos.current!.clone().normalize();
        const currentDist = camStartPos.current!.length();

        const vStart = new THREE.Vector3(startFace.center.x, startFace.center.y, startFace.center.z).normalize();
        const vEnd = new THREE.Vector3(endFace.center.x, endFace.center.y, endFace.center.z).normalize();

        // 1. Calculate the slide's geodesic rotation quaternion using eased progress
        const qTileGeodesic = new THREE.Quaternion().setFromUnitVectors(vStart, vEnd);
        const qTileProgress = new THREE.Quaternion().slerpQuaternions(
          new THREE.Quaternion(), // Identity
          qTileGeodesic,
          eased
        );

        // 2. Relative offset direction (keeps the shape exactly at its grabbed screen coordinates)
        const dirRelative = dirStart.clone().applyQuaternion(qTileProgress);

        // 3. Perfectly centered direction (chases the tile center)
        const dirTileCurrent = vStart.clone().applyQuaternion(qTileProgress);

        // 4. Blend by 40% drift factor to achieve the "slurping" center-line drift over time
        const driftFactor = 0.40;
        const blendedDir = new THREE.Vector3().lerpVectors(
          dirRelative, 
          dirTileCurrent, 
          eased * driftFactor
        ).normalize();

        // 5. Calculate up vector based on the blended direction's rotation
        const qCamGeodesic = new THREE.Quaternion().setFromUnitVectors(dirStart, blendedDir);
        
        const pFinal = blendedDir.multiplyScalar(currentDist);
        const uFinal = camStartUp.current!.clone().applyQuaternion(qCamGeodesic);

        camera.position.copy(pFinal);
        camera.up.copy(uFinal);
        camera.lookAt(0, 0, 0);
      } else {
        // Slide has completed! The tile has landed, but activeSlide is still true due to the settle delay.
        // We seamlessly continue coasting/drifting with no gaps or freezes!
        if (driftVelocity.current > 0.00005) {
          const decayFactor = Math.pow(0.94, delta * 60); // decay by 6% every equivalent 60fps frame
          const currentVel = driftVelocity.current;
          driftVelocity.current *= decayFactor;

          const qDrift = new THREE.Quaternion().setFromAxisAngle(driftAxis.current, currentVel);
          camera.position.applyQuaternion(qDrift);
          camera.up.applyQuaternion(qDrift);
          camera.lookAt(0, 0, 0);
        }
      }

      // Settle phase camera shake during slide end frames
      let shakeX = 0;
      let shakeY = 0;

      if (elapsed >= duration) {
        const tSpring = elapsed - duration;
        const ELEMENT_MASSES: Record<string, number> = {
          H: 1, He: 4, C: 12, O: 16, Ne: 20, Mg: 24, Si: 28, Fe: 56
        };
        const mass = ELEMENT_MASSES[activeSlide.element] || 1;

        // Fusion nuclear energy release snappy high-frequency crack shake
        if (activeSlide.isMerge) {
          const maxShake = Math.min(mass * 0.004, 0.07); // snappy visual thud punch
          const shakeDecay = 0.05; // extremely rapid shockwave decay
          const shakeFreq = 0.16; // high-frequency sharp crack vibration

          const shakeAmp = maxShake * Math.exp(-shakeDecay * tSpring);
          shakeX = shakeAmp * Math.sin(shakeFreq * tSpring);
          shakeY = shakeAmp * Math.cos(shakeFreq * 1.3 * tSpring);
        }
      }

      // Apply viewport-relative translation shake if there is a nuclear merge active
      if (shakeX !== 0 || shakeY !== 0) {
        const localRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        camera.position.addScaledVector(localRight, shakeX).addScaledVector(localUp, shakeY);
      }

      // Keep controls in sync during manual slerp movement
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      return;
    }

    // 2. BACKGROUND MOMENTUM DRIFT PHASE: Coast and decelerate the Buckyball in the slide direction
    if (driftVelocity.current > 0.00005) {
      // Cancel drift instantly if the user interacts with the canvas to guarantee zero lag
      if (isDraggingTile || isPointerDownOnTile) {
        driftVelocity.current = 0;
        return;
      }

      // Frame-rate independent exponential velocity decay (slower damping for longer, luxurious momentum glide!)
      const decayFactor = Math.pow(0.94, delta * 60); // decay by 6% every equivalent 60fps frame
      const currentVel = driftVelocity.current;
      driftVelocity.current *= decayFactor;

      // Apply incremental rotation around the slide's geodesic axis
      const qDrift = new THREE.Quaternion().setFromAxisAngle(driftAxis.current, currentVel);
      camera.position.applyQuaternion(qDrift);
      camera.up.applyQuaternion(qDrift);
      camera.lookAt(0, 0, 0);

      // Keep TrackballControls fully in sync with the drifted camera
      if (controlsRef.current) {
        controlsRef.current.update();
      }
    }
  });

  useEffect(() => {
    const dom = gl.domElement;

    const onPointerDown = (event: PointerEvent) => {
      // Cancel background drift on any user interaction
      driftVelocity.current = 0;

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
    <TrackballControls
      ref={controlsRef}
      enabled={!(isAnimating || isDraggingTile || isPointerDownOnTile)}
      noPan={true}
      noZoom={isAnimating || isDraggingTile || isPointerDownOnTile}
      noRotate={isAnimating || isDraggingTile || isPointerDownOnTile}
      minDistance={2.5}
      maxDistance={12}
      dynamicDampingFactor={0.15}
      makeDefault
    />
  );
}
