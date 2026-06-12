import React, { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGameStore } from '../game/state';
import { Background } from '../three/Background';
import { APP_VERSION } from '../version';

interface StartScreenProps {
  onStart: () => void;
  onOpenCampaign: () => void;
  onStartAstro: () => void;
}

export function StartScreen({ onStart, onOpenCampaign, onStartAstro }: StartScreenProps) {
  const completedLevels = useGameStore(s => s.completedLevels);
  const isAstroUnlocked = completedLevels.length >= 25;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'p') {
        if (!isAstroUnlocked) return;
        onStartAstro();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartAstro, isAstroUnlocked]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050508] text-white overflow-hidden select-none">
      {/* Slowly rotating starfield behind everything */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 5.5], fov: 48, far: 5000 }} gl={{ alpha: true }} dpr={[1, 1.5]}>
          <Background />
        </Canvas>
      </div>

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

        <div className="flex flex-col gap-4 justify-center items-center">
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

          {/* Astrophysicist Mode Button (Locked/Unlocked) */}
          {isAstroUnlocked ? (
            <button
              onClick={onStartAstro}
              className="group px-8 py-3.5 border border-cyan-500/35 bg-cyan-950/20 hover:bg-cyan-900/30 text-cyan-300 text-xs font-bold tracking-[3px] rounded-full transition-all duration-300 active:scale-[0.96] flex items-center gap-3 shadow-[0_4px_16px_rgba(6,182,212,0.15)] hover:shadow-[0_0_24px_rgba(6,182,212,0.3)] cursor-pointer"
            >
              ASTROPHYSICIST MODE
              <span className="text-[10px] select-none animate-spin-slow">☢</span>
            </button>
          ) : (
            <button
              className="group px-8 py-3.5 border border-white/5 bg-white/3 text-white/20 text-xs font-bold tracking-[3px] rounded-full flex items-center gap-3 cursor-not-allowed opacity-50"
              title="Locked: Complete all 25 Campaign Scenarios to unlock!"
            >
              🔒 ASTROPHYSICIST MODE
            </button>
          )}
        </div>
      </div>

      {/* Footer: headphone whisper + version. A suggestion, never an interruption. */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 select-none pointer-events-none bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center gap-1.5 text-white/25">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 14v-3a9 9 0 0 1 18 0v3" />
            <path d="M3 14a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3Z" />
            <path d="M21 14a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3Z" />
          </svg>
          <span className="text-[8px] sm:text-[9px] tracking-[3px] font-mono uppercase">Best with headphones</span>
        </div>
        <div className="text-[8px] sm:text-[9px] text-white/25 tracking-[3px] font-mono uppercase">
          V{APP_VERSION}
        </div>
      </div>
    </div>
  );
}
