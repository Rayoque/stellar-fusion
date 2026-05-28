// src/ui/EndScreen.tsx
import React from 'react';
import type { EndState, ElementSymbol } from '../game/types';
import { ELEMENTS } from '../game/elements';
import { useGameStore } from '../game/state';

interface EndScreenProps {
  endState: EndState;
  starMass: number;
  elementCounts: Record<ElementSymbol, number>;
  onPlayAgain: () => void;
}

const END_DESCRIPTIONS: Record<EndState, string> = {
  white_dwarf: 'The star has shed its outer layers. A dense carbon-oxygen core remains.',
  neutron_star: 'Core collapse halted by neutron degeneracy pressure. Extreme density achieved.',
  black_hole: 'Gravity wins. The core has collapsed beyond the event horizon.',
  failed_collapse: 'Iron formed too early. The star could not sustain fusion long enough.',
  jammed: 'The sphere is full. No further fusion reactions are possible.',
};

const CONTINUE_LABELS: Record<EndState, string> = {
  white_dwarf: "Expand White Dwarf Core",
  neutron_star: "Ignite Neutron Degeneracy",
  black_hole: "Enter Singularity Core",
  failed_collapse: "Force Super-Ignition",
  jammed: "Trigger Stellar Wind",
};

const CONTINUE_DESCRIPTIONS: Record<EndState, string> = {
  white_dwarf: "Keep fusing your carbon-oxygen ash into a massive super white dwarf.",
  neutron_star: "Defy degeneracy pressure and keep packing neutrons into exotic heavy matter.",
  black_hole: "Play beyond the event horizon. Defy gravitational infinity and keep fusing.",
  failed_collapse: "Inject quantum thermal energy to force iron core fusion to burn.",
  jammed: "Vaporize the 4 lightest nuclei via a violent solar flare to clear space.",
};

export function EndScreen({ endState, starMass, elementCounts, onPlayAgain }: EndScreenProps) {
  const totalElements = Object.values(elementCounts).reduce((a, b) => a + b, 0);
  const continueEndless = useGameStore(s => s.continueEndless);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div 
        className="border border-white/10 rounded-[32px] p-8 sm:p-10 max-w-md w-full mx-4 text-center shadow-[0_16px_48px_rgba(0,0,0,0.65)] relative overflow-hidden animate-fade-in-up isolate"
        style={{
          background: 'radial-gradient(circle at 0% 0%, rgba(6, 182, 212, 0.08), transparent 45%), radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.08), transparent 45%), rgba(15, 15, 19, 0.95)',
        }}
      >
        <div className="relative z-10">
          <div className="uppercase tracking-[4px] text-[8px] sm:text-[9px] text-white/35 mb-2 font-mono">STELLAR END STATE</div>
          
          <h1 className="text-3xl sm:text-4xl font-light tracking-wide mb-3 capitalize text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
            {endState.replace('_', ' ')}
          </h1>
          
          <p className="text-white/50 mb-8 text-xs sm:text-sm leading-relaxed max-w-[280px] sm:max-w-xs mx-auto font-light font-normal">
            {END_DESCRIPTIONS[endState]}
          </p>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 sm:p-5 mb-6 max-w-[280px] sm:max-w-xs mx-auto">
            <div className="text-[9px] tracking-[2.5px] text-white/35 mb-3.5 uppercase font-mono text-center">FINAL COMPOSITION</div>
            <div className="space-y-2 text-left">
              {Object.entries(elementCounts).filter(([,c]) => c > 0).map(([sym, count]) => (
                <div key={sym} className="flex justify-between items-center text-xs tracking-wide">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shadow-[0_0_6px_currentColor]" style={{ color: ELEMENTS[sym as ElementSymbol].color, backgroundColor: 'currentColor' }} />
                    <span className="text-white/70">{ELEMENTS[sym as ElementSymbol].displayName}</span>
                  </div>
                  <span className="font-mono tabular-nums font-bold text-white/90">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[9px] text-white/30 mb-6 font-mono tracking-wider">
            INITIAL MASS: <span className="font-bold text-white/50">{starMass.toFixed(1)} M☉</span> • 
            TOTAL NUCLEI: <span className="font-bold text-white/50">{totalElements}</span>
          </div>

          {/* Dual Continuation/Reset Buttons Layout */}
          <div className="flex flex-col gap-3 max-w-[280px] sm:max-w-xs mx-auto">
            <button
              onClick={continueEndless}
              className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-full font-bold tracking-[2px] transition-all active:scale-[0.97] text-xs uppercase shadow-[0_4px_16px_rgba(6,182,212,0.25)] cursor-pointer"
              title={CONTINUE_DESCRIPTIONS[endState]}
            >
              {CONTINUE_LABELS[endState]}
            </button>
            <div className="text-[9px] text-cyan-400/70 font-mono tracking-wider max-w-[280px] leading-normal font-medium mb-2 uppercase text-center select-none">
              {CONTINUE_DESCRIPTIONS[endState]}
            </div>

            <button
              onClick={onPlayAgain}
              className="w-full py-3.5 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-full font-semibold tracking-[2px] transition-all active:scale-[0.97] text-xs uppercase cursor-pointer"
            >
              FUSE ANOTHER STAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
