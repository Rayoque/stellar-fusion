// src/ui/TouchIndicator.tsx
import React, { useEffect } from 'react';
import { useGameStore } from '../game/state';

const PHASE_COLORS = {
  main_sequence: {
    primary: '#38bdf8', // Cyan
    glow: 'rgba(56, 189, 248, 0.25)',
    particles: ['#38bdf8', '#0ea5e9', '#ffffff', '#7dd3fc']
  },
  red_giant: {
    primary: '#f97316', // Orange
    glow: 'rgba(249, 115, 22, 0.25)',
    particles: ['#f97316', '#ef4444', '#ffffff', '#fdba74']
  },
  supergiant: {
    primary: '#fbbf24', // Amber/Gold
    glow: 'rgba(251, 191, 36, 0.25)',
    particles: ['#fbbf24', '#f59e0b', '#ffffff', '#fef08a', '#38bdf8']
  },
  collapse: {
    primary: '#a855f7', // Purple/Magenta
    glow: 'rgba(168, 85, 247, 0.25)',
    particles: ['#a855f7', '#ec4899', '#ffffff', '#c084fc', '#f472b6']
  }
};

export function TouchIndicator() {
  const phase = useGameStore(s => s.phase);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const activeElementsRef = React.useRef<Map<number, HTMLDivElement>>(new Map());

  const colors = PHASE_COLORS[phase] || PHASE_COLORS.main_sequence;

  // Sync color themes dynamically when game phase changes mid-drag
  useEffect(() => {
    activeElementsRef.current.forEach(el => {
      el.style.borderColor = colors.primary;
      el.style.backgroundColor = colors.glow;
      el.style.boxShadow = `0 0 15px ${colors.primary}, inset 0 0 8px ${colors.primary}`;
    });
  }, [colors]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePointerDown = (e: PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      const id = e.pointerId;

      // 1. Clean up any existing stale element for this ID
      const existing = activeElementsRef.current.get(id);
      if (existing) {
        existing.remove();
      }

      // 2. Create the tracking orb programmatically
      const el = document.createElement('div');
      el.className = 'absolute rounded-full border pointer-events-none';
      el.style.width = '16px';
      el.style.height = '16px';
      el.style.borderColor = colors.primary;
      el.style.backgroundColor = colors.glow;
      el.style.boxShadow = `0 0 10px ${colors.primary}, inset 0 0 5px ${colors.primary}`;
      el.style.opacity = '0.9';
      el.style.backdropFilter = 'blur(0.5px)';
      // Center the element under the physical finger using translate3d
      el.style.transform = `translate3d(${x - 8}px, ${y - 8}px, 0)`;

      container.appendChild(el);
      activeElementsRef.current.set(id, el);

      // 3. Programmatically spawn the premium dynamic dual-ripples
      const rippleGroup = document.createElement('div');
      rippleGroup.className = 'absolute pointer-events-none';
      rippleGroup.style.left = `${x}px`;
      rippleGroup.style.top = `${y}px`;

      // Main ripple ring (smaller, faster)
      const ring1 = document.createElement('div');
      ring1.className = 'absolute rounded-full';
      ring1.style.width = '24px';
      ring1.style.height = '24px';
      ring1.style.backgroundColor = 'transparent';
      ring1.style.border = `1.5px solid ${colors.primary}`;
      ring1.style.boxShadow = `0 0 10px ${colors.primary}`;
      ring1.style.transform = 'translate(-50%, -50%)';
      ring1.style.animation = 'touch-ripple 0.3s cubic-bezier(0.1, 0.8, 0.3, 1) forwards';

      // Large faint secondary ring (smaller, faster)
      const ring2 = document.createElement('div');
      ring2.className = 'absolute rounded-full';
      ring2.style.width = '24px';
      ring2.style.height = '24px';
      ring2.style.backgroundColor = 'transparent';
      ring2.style.border = `0.75px solid ${colors.primary}`;
      ring2.style.transform = 'translate(-50%, -50%)';
      ring2.style.animation = 'touch-ring 0.32s cubic-bezier(0.15, 0.85, 0.45, 1) forwards';

      rippleGroup.appendChild(ring1);
      rippleGroup.appendChild(ring2);
      container.appendChild(rippleGroup);

      // Self-destruct ripple elements after their CSS animations complete
      setTimeout(() => {
        rippleGroup.remove();
      }, 400);

      // 4. Programmatically spawn the beautiful drift particles (fewer, smaller, faster)
      const particleCount = 5;
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 12 + Math.random() * 28;
        const dx = `${(Math.cos(angle) * distance).toFixed(1)}px`;
        const dy = `${(Math.sin(angle) * distance).toFixed(1)}px`;
        const color = colors.particles[Math.floor(Math.random() * colors.particles.length)];
        const size = 3 + Math.random() * 3; // 3px to 6px (was 5px to 11px)

        const pEl = document.createElement('div');
        pEl.className = 'absolute rounded-full pointer-events-none';
        pEl.style.left = `${x}px`;
        pEl.style.top = `${y}px`;
        pEl.style.width = `${size}px`;
        pEl.style.height = `${size}px`;
        pEl.style.backgroundColor = color;
        pEl.style.boxShadow = `0 0 5px ${color}, 0 0 10px ${color}`;
        pEl.style.transform = 'translate(-50%, -50%)';
        pEl.style.animation = 'particle-drift 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards';
        pEl.style.setProperty('--dx', dx);
        pEl.style.setProperty('--dy', dy);

        container.appendChild(pEl);

        // Self-destruct particle element after animation completes
        setTimeout(() => {
          pEl.remove();
        }, 500);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      const id = e.pointerId;

      // Instantly track active pointer element's position using high-performance translate3d
      const el = activeElementsRef.current.get(id);
      if (el) {
        el.style.transform = `translate3d(${x - 8}px, ${y - 8}px, 0)`;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const id = e.pointerId;
      const el = activeElementsRef.current.get(id);
      if (el) {
        el.remove();
        activeElementsRef.current.delete(id);
      }
    };

    // Capture gestures across the entire window
    window.addEventListener('pointerdown', handlePointerDown, { capture: true });
    window.addEventListener('pointermove', handlePointerMove, { capture: true });
    window.addEventListener('pointerup', handlePointerUp, { capture: true });
    window.addEventListener('pointercancel', handlePointerUp, { capture: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      window.removeEventListener('pointermove', handlePointerMove, { capture: true });
      window.removeEventListener('pointerup', handlePointerUp, { capture: true });
      window.removeEventListener('pointercancel', handlePointerUp, { capture: true });

      // Clean up all active tracking elements from the DOM on unmount
      activeElementsRef.current.forEach(el => el.remove());
      activeElementsRef.current.clear();
    };
  }, [colors]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 pointer-events-none z-50 overflow-hidden" 
    />
  );
}
