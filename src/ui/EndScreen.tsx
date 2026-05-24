// src/ui/EndScreen.tsx
import React from 'react';
import type { EndState, ElementSymbol } from '../game/types';
import { ELEMENTS } from '../game/elements';

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

export function EndScreen({ endState, starMass, elementCounts, onPlayAgain }: EndScreenProps) {
  const totalElements = Object.values(elementCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl">
      <div className="bg-[#111113] border border-white/10 rounded-3xl p-10 max-w-md w-full mx-4 text-center">
        <div className="uppercase tracking-[4px] text-xs text-white/50 mb-2">STELLAR END STATE</div>
        
        <h1 className="text-5xl font-semibold tracking-tighter mb-3 capitalize">
          {endState.replace('_', ' ')}
        </h1>
        
        <p className="text-white/70 mb-8 text-[15px] leading-snug">
          {END_DESCRIPTIONS[endState]}
        </p>

        <div className="mb-8">
          <div className="text-xs tracking-widest text-white/50 mb-3">FINAL COMPOSITION</div>
          <div className="space-y-1 text-left max-w-[260px] mx-auto">
            {Object.entries(elementCounts).filter(([,c]) => c > 0).map(([sym, count]) => (
              <div key={sym} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded" style={{ background: ELEMENTS[sym as ElementSymbol].color }} />
                  <span>{ELEMENTS[sym as ElementSymbol].displayName}</span>
                </div>
                <span className="font-mono tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-white/50 mb-6">
          Initial mass: <span className="font-mono">{starMass.toFixed(1)} M☉</span> • 
          Total nuclei fused: <span className="font-mono">{totalElements}</span>
        </div>

        <button
          onClick={onPlayAgain}
          className="px-8 py-3 bg-white text-black rounded-2xl font-semibold tracking-wider hover:bg-white/90 active:scale-[0.985] transition-all"
        >
          FUSE ANOTHER STAR
        </button>
      </div>
    </div>
  );
}
