import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGameStore } from '../game/state';
import { Background } from '../three/Background';

interface StartScreenProps {
  onStart: () => void;
  onOpenCampaign: () => void;
  onStartAstro: () => void;
}

export function StartScreen({ onStart, onOpenCampaign, onStartAstro }: StartScreenProps) {
  const completedLevels = useGameStore(s => s.completedLevels);
  const isAstroUnlocked = completedLevels.length >= 10;
  const [pendingAction, setPendingAction] = useState<'sandbox' | 'campaign' | 'astro' | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'p') {
        if (!isAstroUnlocked) return;
        const isFirstTime = localStorage.getItem('stellar_headphones_suggested') !== 'true';
        if (isFirstTime) {
          setPendingAction('astro');
        } else {
          onStartAstro();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartAstro, isAstroUnlocked]);

  const handleSandboxClick = () => {
    const isFirstTime = localStorage.getItem('stellar_headphones_suggested') !== 'true';
    if (isFirstTime) {
      setPendingAction('sandbox');
    } else {
      onStart();
    }
  };

  const handleCampaignClick = () => {
    const isFirstTime = localStorage.getItem('stellar_headphones_suggested') !== 'true';
    if (isFirstTime) {
      setPendingAction('campaign');
    } else {
      onOpenCampaign();
    }
  };

  const handleAstroClick = () => {
    const isFirstTime = localStorage.getItem('stellar_headphones_suggested') !== 'true';
    if (isFirstTime) {
      setPendingAction('astro');
    } else {
      onStartAstro();
    }
  };

  const handleConfirmAudio = () => {
    localStorage.setItem('stellar_headphones_suggested', 'true');
    const action = pendingAction;
    setPendingAction(null);
    if (action === 'sandbox') {
      onStart();
    } else if (action === 'campaign') {
      onOpenCampaign();
    } else if (action === 'astro') {
      onStartAstro();
    }
  };

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
              onClick={handleSandboxClick}
              className="group px-8 py-3.5 bg-white text-black hover:bg-white/95 text-xs font-bold tracking-[3px] rounded-full transition-all duration-300 active:scale-[0.96] flex items-center gap-3 shadow-[0_4px_16px_rgba(255,255,255,0.12)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer"
            >
              ENDLESS SANDBOX
              <span className="group-hover:translate-x-0.5 transition duration-200">→</span>
            </button>

            <button
              onClick={handleCampaignClick}
              className="group px-8 py-3.5 border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-bold tracking-[3px] rounded-full transition-all duration-300 active:scale-[0.96] flex items-center gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.3)] cursor-pointer animate-pulse"
            >
              PLAY SCENARIOS
              <span className="text-[10px] select-none">✦</span>
            </button>
          </div>

          {/* Astrophysicist Mode Button (Locked/Unlocked) */}
          {isAstroUnlocked ? (
            <button
              onClick={handleAstroClick}
              className="group px-8 py-3.5 border border-cyan-500/35 bg-cyan-950/20 hover:bg-cyan-900/30 text-cyan-300 text-xs font-bold tracking-[3px] rounded-full transition-all duration-300 active:scale-[0.96] flex items-center gap-3 shadow-[0_4px_16px_rgba(6,182,212,0.15)] hover:shadow-[0_0_24px_rgba(6,182,212,0.3)] cursor-pointer"
            >
              ASTROPHYSICIST MODE
              <span className="text-[10px] select-none animate-spin-slow">☢</span>
            </button>
          ) : (
            <button
              className="group px-8 py-3.5 border border-white/5 bg-white/3 text-white/20 text-xs font-bold tracking-[3px] rounded-full flex items-center gap-3 cursor-not-allowed opacity-50"
              title="Locked: Complete all 10 Campaign Scenarios to unlock!"
            >
              🔒 ASTROPHYSICIST MODE
            </button>
          )}
        </div>
      </div>

      {/* Headphones Suggestion Popup Overlay */}
      {pendingAction !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md">
          <div 
            className="border border-white/10 rounded-[32px] p-8 max-w-[290px] sm:max-w-sm w-full mx-4 text-center shadow-[0_16px_48px_rgba(0,0,0,0.6)] relative overflow-hidden animate-fade-in-up isolate"
            style={{
              background: 'radial-gradient(circle at 0% 0%, rgba(6, 182, 212, 0.08), transparent 45%), radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.08), transparent 45%), rgba(15, 15, 19, 0.95)',
            }}
          >
            <div className="relative z-10 flex flex-col items-center">
              <div className="text-4xl mb-4 select-none animate-float-slow">🎧</div>
              
              <div className="uppercase tracking-[3px] text-[7.5px] text-cyan-400 font-bold font-mono mb-2">AUDIO RECOMMENDATION</div>
              <h2 className="text-lg font-light tracking-[0.12em] mb-3 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 uppercase">HEADPHONES SUGGESTED</h2>
              
              <p className="text-[11px] text-white/40 leading-relaxed font-light mb-7 max-w-[240px]">
                Stellar Fusion is designed with an immersive ambient soundscape. Headphones are recommended for full immersion.
              </p>

              <button
                onClick={handleConfirmAudio}
                className="w-full py-3 bg-white text-black hover:bg-white/95 rounded-full font-bold tracking-[2px] active:scale-[0.97] transition-all text-xs uppercase shadow-[0_4px_16px_rgba(255,255,255,0.1)] cursor-pointer"
              >
                CONTINUE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
