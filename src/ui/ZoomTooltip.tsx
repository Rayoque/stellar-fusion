// src/ui/ZoomTooltip.tsx
import React from 'react';

export function ZoomTooltip() {
  return (
    <div className="fixed left-1/2 bottom-[14.5rem] xs:bottom-[16rem] md:bottom-[9rem] -translate-x-1/2 z-40 pointer-events-none select-none flex flex-col items-center gap-1.5 animate-fade-in-up">
      {/* Premium Double Expand/Contract Arrow SVG representing Zoom Gestures */}
      <div className="relative w-12 h-12 flex items-center justify-center text-cyan-400 opacity-40 animate-pulse">
        <svg 
          width="36" 
          height="36" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
        >
          {/* Top-Left Arrow pointing outwards */}
          <path d="M7 3H3V7" />
          <path d="M3 3L9 9" />
          
          {/* Bottom-Right Arrow pointing outwards */}
          <path d="M17 21H21V17" />
          <path d="M21 21L15 15" />

          {/* Top-Right Arrow pointing inwards */}
          <path d="M19 8V5H16" />
          <path d="M20 4L15 9" />

          {/* Bottom-Left Arrow pointing inwards */}
          <path d="M5 16V19H8" />
          <path d="M4 20L9 15" />
        </svg>
      </div>

      {/* Futuristic, subtle, spaced typography */}
      <div className="font-mono text-[8px] xs:text-[9px] tracking-[4px] text-white/35 font-light text-center uppercase animate-pulse select-none whitespace-nowrap pl-[4px]">
        Pinch or Scroll to Zoom
      </div>
    </div>
  );
}
