// src/three/Tile.tsx
import React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Edges } from '@react-three/drei';
import { lerpVec3 } from '../utils/math';
import type { Face, Tile as TileType } from '../game/types';
import { ELEMENTS } from '../game/elements';
import { useGameStore } from '../game/state';

interface TileProps {
  face: Face;
  tile?: TileType;
}

// Shared temporary vector pools for useFrame culling calculations to avoid per-frame allocations
const tempWorldCenter = new THREE.Vector3();
const tempCamDir = new THREE.Vector3();

export function Tile({ face, tile }: TileProps) {
  const startDrag = useGameStore(s => s.startDrag);
  const endDrag = useGameStore(s => s.endDrag);
  const isAnimating = useGameStore(s => s.isAnimating);
  const selectedFaceId = useGameStore(s => s.selectedFaceId);
  const dragTargetId = useGameStore(s => s.dragTargetId);
  const blockedFaceId = useGameStore(s => s.blockedFaceId);
  const blockedTime = useGameStore(s => s.blockedTime) || 0;
  const dragOffset3D = useGameStore(s => s.dragOffset3D);
  const activeSlide = useGameStore(s => s.activeSlide);
  const isAstro = useGameStore(s => s.astrophysicistMode);

  const isSelected = face.id === selectedFaceId;
  const isTarget = face.id === dragTargetId;
  const isBlocked = face.id === blockedFaceId;
  const isMergeTarget = activeSlide?.isMerge && face.id === activeSlide.path[activeSlide.path.length - 1];

  const element = tile ? ELEMENTS[tile.element] : null;
  const color = element ? element.color : '#334155';

  // Proper 3D polygon geometry from the face's 3D vertices
  const geometry = React.useMemo(() => {
    const verts = face.vertices;
    if (!verts || verts.length < 3) {
      return new THREE.BufferGeometry();
    }

    const positions: number[] = [];
    const center = face.center;

    const shrinkFactor = 0.94;
    const shrunkVerts = verts.map(v => lerpVec3(center, v, shrinkFactor));

    // Create a simple fan from the center (works well for convex pentagons/hexagons)
    for (let i = 0; i < shrunkVerts.length; i++) {
      const next = (i + 1) % shrunkVerts.length;

      // Triangle: center -> vert[i] -> vert[next]
      positions.push(center.x, center.y, center.z);
      positions.push(shrunkVerts[i].x, shrunkVerts[i].y, shrunkVerts[i].z);
      positions.push(shrunkVerts[next].x, shrunkVerts[next].y, shrunkVerts[next].z);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }, [face.vertices, face.center]);

  // Dedicated pentagon geometry that planarly shrinks the indicator,
  // but lifts it slightly off the tile surface (liftFactor = 1.002) rather
  // than scaling it towards the origin. This prevents it from intersecting
  // the star's glowing convective shells and eliminates the "shadow" artifact.
  const pentagonGeometry = React.useMemo(() => {
    if (face.shape !== 'pentagon') return null;
    const verts = face.vertices;
    if (!verts || verts.length < 3) {
      return new THREE.BufferGeometry();
    }

    const positions: number[] = [];
    const center = face.center;

    // Outer edge is at 0.94 shrinkFactor.
    // 0.82 makes a beautifully inset, concentric inner pentagon marker.
    const shrinkFactor = 0.82;
    const liftFactor = 1.03;

    const liftedCenter = {
      x: center.x * liftFactor,
      y: center.y * liftFactor,
      z: center.z * liftFactor
    };

    const shrunkVerts = verts.map(v => {
      const p = lerpVec3(center, v, shrinkFactor);
      return {
        x: p.x * liftFactor,
        y: p.y * liftFactor,
        z: p.z * liftFactor
      };
    });

    for (let i = 0; i < shrunkVerts.length; i++) {
      const next = (i + 1) % shrunkVerts.length;

      // Triangle fan from lifted center
      positions.push(liftedCenter.x, liftedCenter.y, liftedCenter.z);
      positions.push(shrunkVerts[i].x, shrunkVerts[i].y, shrunkVerts[i].z);
      positions.push(shrunkVerts[next].x, shrunkVerts[next].y, shrunkVerts[next].z);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }, [face.shape, face.vertices, face.center]);

  const textQuaternion = React.useMemo(() => {
    const localNormal = new THREE.Vector3(face.center.x, face.center.y, face.center.z).normalize();
    
    // Choose "up" direction to point towards world-up (0, 1, 0)
    let localUp = new THREE.Vector3(0, 1, 0);
    
    // Project world-up onto the tangent plane: localUp = worldUp - localNormal * (worldUp . localNormal)
    const dotVal = localUp.dot(localNormal);
    if (Math.abs(dotVal) > 0.99) {
      // If we are at the poles, use world-forward (0, 0, -1) as "up"
      localUp.set(0, 0, -1);
      // Project world-forward onto the tangent plane
      const dotVal2 = localUp.dot(localNormal);
      localUp.sub(localNormal.clone().multiplyScalar(dotVal2)).normalize();
    } else {
      localUp.sub(localNormal.clone().multiplyScalar(dotVal)).normalize();
    }
    
    const localRight = new THREE.Vector3().crossVectors(localUp, localNormal).normalize();
    const m = new THREE.Matrix4().makeBasis(localRight, localUp, localNormal);
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, [face]);

  const groupRef = React.useRef<THREE.Group>(null);
  const tileContentGroupRef = React.useRef<THREE.Group>(null);
  const textRef = React.useRef<any>(null);
  const decayTextRef = React.useRef<any>(null);
  const pentagonRef = React.useRef<THREE.Mesh>(null);
  const smoothOpacityRef = React.useRef(0.12);

  const selectedTimeRef = React.useRef<number>(0);
  const prevIsSelectedRef = React.useRef<boolean>(false);
  const smoothPullRef = React.useRef(new THREE.Vector3(0, 0, 0));

  // Spawning / Merging animation hooks
  const lastTileIdRef = React.useRef<string | null>(null);
  const animTypeRef = React.useRef<'none' | 'spawn' | 'merge'>('none');
  const animStartTimeRef = React.useRef<number>(0);

  const currentTileId = tile ? `${tile.element}-${tile.spawnedAtTurn}` : null;

  if (tile && currentTileId !== lastTileIdRef.current) {
    const reason = tile.spawnReason;
    if (reason === 'spawn') {
      animTypeRef.current = 'spawn';
      animStartTimeRef.current = performance.now();
    } else if (reason === 'merge') {
      animTypeRef.current = 'merge';
      animStartTimeRef.current = performance.now();
    } else {
      animTypeRef.current = 'none';
    }
    lastTileIdRef.current = currentTileId;
  } else if (!tile) {
    lastTileIdRef.current = null;
    animTypeRef.current = 'none';
  }

  if (isSelected && !prevIsSelectedRef.current) {
    selectedTimeRef.current = performance.now();
    prevIsSelectedRef.current = true;
  } else if (!isSelected) {
    prevIsSelectedRef.current = false;
  }

  useFrame((state) => {
    if (!groupRef.current) return;
    
    // The sphere is stationary at the origin, and the camera rotates around it using OrbitControls.
    // Therefore, the world-space direction of the tile is simply its normalized local center vector.
    // This optimization bypasses manual matrix updates/multiplications for 32 tiles per frame!
    tempWorldCenter.set(face.center.x, face.center.y, face.center.z).normalize();
    
    // Copy camera position and normalize
    tempCamDir.copy(state.camera.position).normalize();
    
    // Compute dot product
    const dot = tempWorldCenter.dot(tempCamDir);
    
    // Keep visible slightly past the horizon (threshold -0.85) to avoid popping,
    // but cull entirely beyond that to prevent any edges/text from clipping.
    groupRef.current.visible = dot > -0.85;

    // Calculate dynamic animScale for spawn/merge transitions
    let animScale = 1.0;
    if (tile && animTypeRef.current !== 'none') {
      const elapsed = performance.now() - animStartTimeRef.current;
      if (animTypeRef.current === 'spawn') {
        const duration = 250;
        const progress = Math.min(elapsed, duration) / duration;
        if (progress < 1) {
          animScale = 1.0 - Math.exp(-progress * 5) * Math.cos(progress * Math.PI * 2.5);
        } else {
          animTypeRef.current = 'none';
        }
      } else if (animTypeRef.current === 'merge') {
        const duration = 300;
        const progress = Math.min(elapsed, duration) / duration;
        if (progress < 1) {
          animScale = 1.0 + 0.35 * Math.sin(Math.pow(progress, 0.5) * Math.PI) * Math.exp(-progress * 3);
        } else {
          animTypeRef.current = 'none';
        }
      }
    }

    // Only apply holding/pickup dynamics if the tile is selected/held
    if (isSelected) {
      // Dynamic pickup spring jiggle & wobbly inflation
      const heldTime = performance.now() - selectedTimeRef.current;
      
      // 1. Softer pickup jiggle scale
      const scaleJiggle = 1.0 + 0.06 * Math.sin(heldTime * 0.024) * Math.exp(-heldTime * 0.007);
      
      // 2. Softer pickup jiggle wobble
      const wobbleX = Math.sin(heldTime * 0.035) * 0.014 * Math.exp(-heldTime * 0.008);
      const wobbleY = Math.cos(heldTime * 0.03) * 0.014 * Math.exp(-heldTime * 0.008);

      // 3. Ethereal pull toward cursor/finger with smooth spring-damper lerp
      const targetPull = new THREE.Vector3(0, 0, 0);
      if (dragOffset3D) {
        targetPull.set(dragOffset3D.x, dragOffset3D.y, dragOffset3D.z);
      }
      smoothPullRef.current.lerp(targetPull, 0.18); // Highly responsive spring decay factor
      // 4. Toned-down, extremely subtle and organic quantum electron hum/jitter
      const tSec = state.clock.getElapsedTime();
      const jitterX = Math.sin(tSec * 28) * 0.0016 + Math.cos(tSec * 47) * 0.0010;
      const jitterY = Math.cos(tSec * 31) * 0.0016 + Math.sin(tSec * 53) * 0.0010;

      if (tileContentGroupRef.current) {
        // Main group scale stays stationary at 1.0 (so grid outline doesn't scale/jiggle)
        groupRef.current.scale.set(1.0, 1.0, 1.0);
        
        // Scale and wobble only the floating child tileContentGroup
        const totalScale = 1.06 * scaleJiggle * animScale;
        tileContentGroupRef.current.scale.set(totalScale, totalScale, totalScale);
        
        tileContentGroupRef.current.position.set(
          face.tangentFrame.u.x * (wobbleX + jitterX) + face.tangentFrame.v.x * (wobbleY + jitterY) + smoothPullRef.current.x,
          face.tangentFrame.u.y * (wobbleX + jitterX) + face.tangentFrame.v.y * (wobbleY + jitterY) + smoothPullRef.current.y,
          face.tangentFrame.u.z * (wobbleX + jitterX) + face.tangentFrame.v.z * (wobbleY + jitterY) + smoothPullRef.current.z
        );
      }
    } else {
      // Smoothly reset pull ref and tile content group scale/position when not selected
      smoothPullRef.current.set(0, 0, 0);
      if (tileContentGroupRef.current) {
        tileContentGroupRef.current.scale.set(animScale, animScale, animScale);
        tileContentGroupRef.current.position.set(0, 0, 0);
      }
    }

    // Blocked jiggle/shake animation parallel to the sphere's surface
    if (isBlocked) {
      const elapsed = performance.now() - blockedTime;
      if (elapsed < 300) {
        const progress = elapsed / 300;
        const decay = Math.exp(-progress * 4.5); // rapid exponential decay
        const amp = 0.08 * decay; // starting displacement amplitude
        const shakeVal = Math.sin(elapsed * 0.12) * amp; // high-frequency vibration
        
        groupRef.current.position.set(
          face.tangentFrame.u.x * shakeVal,
          face.tangentFrame.u.y * shakeVal,
          face.tangentFrame.u.z * shakeVal
        );
      } else {
        groupRef.current.position.set(0, 0, 0);
      }
    } else {
      // Keep position reset when not blocked
      groupRef.current.position.set(0, 0, 0);
    }

    // Dynamic screen-up text billboarding using singularity-free geodesic camera-relative formula
    if (textRef.current) {
      const localNormal = tempWorldCenter;
      const camDir = tempCamDir;
      const qCam = state.camera.quaternion;
      const qGeodesic = new THREE.Quaternion().setFromUnitVectors(camDir, localNormal);
      const finalQ = qGeodesic.clone().multiply(qCam);
      textRef.current.quaternion.copy(finalQ);

      if (decayTextRef.current) {
        decayTextRef.current.quaternion.copy(finalQ);
        
        // 1. Get world space camera right and up axes
        const tempRight = new THREE.Vector3(1, 0, 0).applyQuaternion(state.camera.quaternion).normalize();
        const tempUp = new THREE.Vector3(0, 1, 0).applyQuaternion(state.camera.quaternion).normalize();
        
        // 2. Get the unit normal of the face (pointing radially outward)
        const faceNormal = new THREE.Vector3(face.center.x, face.center.y, face.center.z).normalize();
        
        // 3. Project camera vectors onto the face's tangent plane to keep them flat on the tile surface!
        // v_proj = v - (v . n) * n
        const projRight = tempRight.clone().sub(faceNormal.clone().multiplyScalar(tempRight.dot(faceNormal))).normalize();
        const projUp = tempUp.clone().sub(faceNormal.clone().multiplyScalar(tempUp.dot(faceNormal))).normalize();
        
        // 4. Calculate shift along these projected screen-up/screen-right surface directions
        // Lifted higher up (0.16) and slightly closer horizontally (0.11) to clear superscript numbers
        const shiftX = projRight.x * 0.11 + projUp.x * 0.16;
        const shiftY = projRight.y * 0.11 + projUp.y * 0.16;
        const shiftZ = projRight.z * 0.11 + projUp.z * 0.16;
        
        decayTextRef.current.position.set(
          face.center.x * 1.045 + shiftX,
          face.center.y * 1.045 + shiftY,
          face.center.z * 1.045 + shiftZ
        );
      }
    }

    // Shimmering breathing animation for the pentagon confinement field
    if (pentagonRef.current) {
      const elapsed = state.clock.getElapsedTime();
      const restBase = isAstro ? 0.2 : 0.12;
      const targetBase = (tile && !isSelected) ? 0.0 : restBase;
      smoothOpacityRef.current = THREE.MathUtils.lerp(smoothOpacityRef.current, targetBase, 0.12);

      const pulse = Math.sin(elapsed * 2.2) * 0.04 * (smoothOpacityRef.current / 0.12);
      const finalOpacity = Math.max(0, smoothOpacityRef.current + pulse);
      
      (pentagonRef.current.material as THREE.MeshBasicMaterial).opacity = finalOpacity;
      pentagonRef.current.traverse((child) => {
        if (child instanceof THREE.LineSegments && child.material) {
          const mat = child.material as THREE.LineBasicMaterial;
          mat.transparent = true;
          mat.opacity = Math.min(1.0, finalOpacity * 4.5);
        }
      });
      const scalePulse = 1.0 + Math.sin(elapsed * 2.2) * 0.012 * (smoothOpacityRef.current / 0.12);
      pentagonRef.current.scale.set(scalePulse, scalePulse, scalePulse);
    }
  });

  return (
    <group ref={groupRef} scale={[1, 1, 1]}>
      {/* Empty slot grid outline (stays anchored to the sphere grid!) */}
      {(!element || isSelected) && (
        <mesh geometry={geometry} userData={{ faceId: face.id }}>
          <meshBasicMaterial visible={false} />
          <Edges
            scale={1}
            threshold={15}
            color={isAstro ? "#38bdf8" : "rgba(255, 255, 255, 0.08)"}
          />
        </mesh>
      )}

      {/* Dynamic, wobbly, and cursor-pulled tile content group */}
      <group ref={tileContentGroupRef}>
        {element && (
          <mesh geometry={geometry} userData={{ faceId: face.id }}>
            <meshLambertMaterial 
              color={color} 
              flatShading 
              side={THREE.DoubleSide}
              transparent={false}
              depthWrite={true}
            />
            <Edges 
              scale={1} 
              threshold={15} 
              color={tile && tile.decayTurns !== undefined ? "#10ac84" : (isSelected ? "#38bdf8" : "black")} 
            />
            {tile && tile.decayTurns !== undefined && (
              <Edges 
                scale={1.015} 
                threshold={15} 
                color="#2ecc71" 
              />
            )}
          </mesh>
        )}

        {/* Pentagon indicator (always visible, rendered on top of elements using renderOrder) */}
        {face.shape === 'pentagon' && pentagonGeometry && !isMergeTarget && (
          <mesh ref={pentagonRef} geometry={pentagonGeometry} renderOrder={2}>
            <meshBasicMaterial
              color={isAstro ? "#67e8f9" : "#38bdf8"} // Confinement field cyan (brighter in astro to stand out from the neon grid)
              transparent
              opacity={0.12}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
            <Edges
              scale={1.0}
              threshold={15}
              color={isAstro ? "#a5f3fc" : "#38bdf8"} // Glowing cyan outline (hotter in astro for nucleation-site identity)
            />
          </mesh>
        )}

        {/* Element symbol */}
        {element && !isMergeTarget && (
          <Text
            ref={textRef}
            position={[face.center.x * 1.04, face.center.y * 1.04, face.center.z * 1.04]}
            fontSize={0.25}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="#000000"
            renderOrder={1}
          >
            {element.symbol}
          </Text>
        )}

        {/* Decay countdown badge */}
        {element && tile && tile.decayTurns !== undefined && !isMergeTarget && (
          <Text
            ref={decayTextRef}
            position={[face.center.x * 1.045, face.center.y * 1.045, face.center.z * 1.045]}
            fontSize={0.11}
            color="#2ecc71"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.008}
            outlineColor="#000000"
            renderOrder={2}
          >
            {tile.decayTurns.toString()}
          </Text>
        )}
      </group>

      {/* Drag target indicator overlay (keeps separate from pulling content, stays anchored on the target slot!) */}
      {isTarget && (
        <mesh geometry={geometry} scale={1.01}>
          <meshBasicMaterial 
            color="#f59e0b" 
            transparent 
            opacity={0.25} 
            side={THREE.DoubleSide}
            depthWrite={false}
          />
          <Edges scale={1.005} threshold={15} color="#f59e0b" />
        </mesh>
      )}
    </group>
  );
}