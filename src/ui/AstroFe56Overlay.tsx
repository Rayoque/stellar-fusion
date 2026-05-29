// src/ui/AstroFe56Overlay.tsx
import React from 'react';

interface AstroFe56OverlayProps {
  onContinue: () => void;
}

export function AstroFe56Overlay({ onContinue }: AstroFe56OverlayProps) {
  const accentColor = '#00d2d3'; // Hot neon cyan for advanced astrophysics!
  const shadowGlow = 'rgba(0, 210, 211, 0.12)';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md select-none pointer-events-auto">
      {/* Modal Container */}
      <div 
        className="border border-white/10 rounded-[32px] p-8 sm:p-10 max-w-md w-full mx-4 text-center shadow-[0_16px_48px_rgba(0,0,0,0.65)] relative overflow-hidden animate-fade-in-up isolate"
        style={{ 
          borderColor: 'rgba(0, 210, 211, 0.3)',
          boxShadow: `0 16px 48px rgba(0,0,0,0.65), 0 0 24px ${shadowGlow}`,
          background: `radial-gradient(circle at 0% 0%, rgba(0, 210, 211, 0.08), transparent 45%), radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.06), transparent 45%), rgba(15, 15, 19, 0.95)`,
        }}
      >
        <div className="relative z-10">
          <div 
            className="uppercase tracking-[4px] text-[8.5px] sm:text-[9.5px] mb-2 font-mono font-bold"
            style={{ color: accentColor }}
          >
            ☢ ASTROPHYSICS ACHIEVEMENT ☢
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-light tracking-wide mb-3 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
            STABLE CORE SYNTHESIZED
          </h1>
          
          <div className="text-white/50 mb-8 text-xs sm:text-[13px] leading-relaxed max-w-[280px] sm:max-w-sm mx-auto font-light space-y-3">
            <p>
              Congratulations, Astrophysicist! You have successfully completed the nucleosynthesis pathway by fusing all the way to <strong>Iron-56 (Fe56)</strong>.
            </p>
            <p>
              Iron-56 represents the thermodynamic peak of nuclear binding energy per nucleon. Beyond this limit, fusion consumes energy rather than releasing it. You have established a completely stable, immovable iron ash core.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={onContinue}
              className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-full font-bold tracking-[2px] transition-all active:scale-[0.97] text-xs uppercase shadow-[0_4px_16px_rgba(0,210,211,0.15)] cursor-pointer"
            >
              Continue Core Fusion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
