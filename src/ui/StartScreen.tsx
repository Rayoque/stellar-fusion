// src/ui/StartScreen.tsx
import React from 'react';

interface StartScreenProps {
  onStart: () => void;
  onOpenCampaign: () => void;
}

export function StartScreen({ onStart, onOpenCampaign }: StartScreenProps) {
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
        
        <p className="text-xs sm:text-sm text-white/45 mb-10 tracking-[0.08em] leading-relaxed max-w-[280px] sm:max-w-xs mx-auto font-light">
          Navigate the curved geometry of a thermonuclear star.<br />Synthesize elements and ignite the core.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={onStart}
            className="group px-8 py-3.5 bg-white text-black hover:bg-white/95 text-xs font-bold tracking-[3px] rounded-full transition-all duration-300 active:scale-[0.96] flex items-center gap-3 shadow-[0_4px_16px_rgba(255,255,255,0.12)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer"
          >
            ENDLESS SANDBOX
            <span className="group-hover:translate-x-0.5 transition duration-200">→</span>
          </button>

          <button
            onClick={onOpenCampaign}
            className="group px-8 py-3.5 border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-bold tracking-[3px] rounded-full transition-all duration-300 active:scale-[0.96] flex items-center gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.3)] cursor-pointer animate-pulse"
          >
            PLAY SCENARIOS
            <span className="text-[10px] select-none">✦</span>
          </button>
        </div>
      </div>
    </div>
  );
}
