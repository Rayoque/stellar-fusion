// src/ui/ZoomTooltip.tsx
import React from 'react';

export function ZoomTooltip() {
  return (
    <div className="pointer-events-none select-none flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/[0.035] border border-white/10 backdrop-blur-[2px] shadow-[0_4px_16px_rgba(0,0,0,0.25)] animate-fade-in-up">
      {/* Symmetrical technical vector gestures: low-opacity and ambient */}
      <div className="relative w-20 h-10 flex items-center justify-center text-cyan-400 opacity-55 animate-pulse">
        <svg 
          width="80" 
          height="40" 
          viewBox="0 0 80 40" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
        >
          {/* --- LEFT SIDE: Spread (Zoom In) --- */}
          {/* Top Dot */}
          <circle cx="24" cy="16" r="1.5" fill="currentColor" stroke="none" />
          {/* Top Arrow pointing UP */}
          <line x1="24" y1="13" x2="24" y2="6" />
          <path d="M21 9L24 6L27 9" />

          {/* Bottom Dot */}
          <circle cx="24" cy="24" r="1.5" fill="currentColor" stroke="none" />
          {/* Bottom Arrow pointing DOWN */}
          <line x1="24" y1="27" x2="24" y2="34" />
          <path d="M21 31L24 34L27 31" />


          {/* --- RIGHT SIDE: Pinch (Zoom Out) --- */}
          {/* Top Dot */}
          <circle cx="56" cy="7" r="1.5" fill="currentColor" stroke="none" />
          {/* Top Arrow pointing DOWN */}
          <line x1="56" y1="10" x2="56" y2="17" />
          <path d="M53 14L56 17L59 14" />

          {/* Bottom Dot */}
          <circle cx="56" cy="33" r="1.5" fill="currentColor" stroke="none" />
          {/* Bottom Arrow pointing UP */}
          <line x1="56" y1="30" x2="56" y2="23" />
          <path d="M53 26L56 23L59 26" />
        </svg>
      </div>

      {/* Futuristic, subtle, spaced typography */}
      <div className="font-mono text-[8px] xs:text-[9px] tracking-[4px] text-white/45 font-light text-center uppercase animate-pulse select-none whitespace-nowrap pl-[4px]">
        Pinch or Scroll to Zoom
      </div>
    </div>
  );
}
