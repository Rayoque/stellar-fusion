// src/ui/StartScreen.tsx
import React from 'react';

interface StartScreenProps {
  onStart: () => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050508] text-white overflow-hidden select-none">
      {/* Immersive Breathing Stellar Body Background Glow */}
      <div className="absolute top-1/2 left-1/2 w-[320px] h-[320px] sm:w-[480px] sm:h-[480px] rounded-full bg-gradient-to-tr from-cyan-500/20 to-purple-600/10 blur-[80px] sm:blur-[120px] animate-stellar-pulse pointer-events-none z-0" />
      
      {/* Content wrapper */}
      <div className="relative z-10 max-w-md text-center px-6 flex flex-col items-center justify-center">
        <div className="mb-4 text-[9px] sm:text-[10px] tracking-[6px] text-white/40 uppercase font-mono font-medium">
          A Stellar Nucleosynthesis Puzzle
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-light tracking-[0.18em] mb-4 text-center text-transparent bg-clip-text bg-gradient-to-b from-white via-white/95 to-white/40 drop-shadow-[0_0_12px_rgba(255,255,255,0.15)] uppercase pr-[-0.18em]">
          STELLAR FUSION
        </h1>
        
        <p className="text-sm sm:text-base text-white/50 mb-10 tracking-[0.06em] leading-relaxed max-w-[280px] sm:max-w-sm mx-auto font-light">
          Drag elements across a soccer-ball star.<br />Fuse according to real stellar physics.
        </p>

        <button
          onClick={onStart}
          className="group px-8 py-3.5 border border-white/15 bg-white/5 hover:bg-white text-white hover:text-black text-xs font-bold tracking-[3px] rounded-full transition-all duration-300 active:scale-[0.96] flex items-center gap-3 mx-auto shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(255,255,255,0.12)] cursor-pointer"
        >
          BEGIN FUSION
          <span className="group-hover:translate-x-0.5 transition duration-200">→</span>
        </button>

        <div className="mt-20 text-[7.5px] sm:text-[8px] text-white/25 tracking-[4px] font-mono uppercase whitespace-nowrap">
          Truncated Icosahedron • 8 Elements • Fusion Rules
        </div>
      </div>
    </div>
  );
}
