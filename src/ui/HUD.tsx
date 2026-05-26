// src/ui/HUD.tsx
import React from 'react';
import type { Phase, ElementSymbol } from '../game/types';
import { ELEMENTS } from '../game/elements';

interface HUDProps {
  phase: Phase;
  starMass: number;
  turn: number;
  elementCounts: Record<ElementSymbol, number>;
  onOpenMenu: () => void;
}

const PHASE_ICONS: Record<Phase, string> = {
  main_sequence: '◯',
  red_giant: '◍',
  supergiant: '⊛',
  collapse: '◉',
};

const PHASE_LABELS: Record<Phase, string> = {
  main_sequence: 'MAIN SEQUENCE',
  red_giant: 'RED GIANT',
  supergiant: 'SUPERGIANT',
  collapse: 'COLLAPSE',
};

export function HUD({ phase, starMass, turn, elementCounts, onOpenMenu }: HUDProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-start pointer-events-none">
      {/* Top bar (Phase Mass Turn Square - Interactive Menu Trigger) */}
      <div 
        onClick={onOpenMenu}
        onMouseEnter={onOpenMenu}
        className="flex items-center gap-6 bg-black/40 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 pointer-events-auto cursor-pointer hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] active:scale-[0.98] transition-all select-none"
        title="Open Menu"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{PHASE_ICONS[phase]}</span>
          <div>
            <div className="text-[10px] tracking-[2px] text-white/50">PHASE</div>
            <div className="font-semibold tracking-wide text-sm">{PHASE_LABELS[phase]}</div>
          </div>
        </div>

        <div className="h-6 w-px bg-white/20" />

        <div>
          <div className="text-[10px] tracking-[2px] text-white/50">MASS</div>
          <div className="font-mono text-lg tabular-nums">{starMass.toFixed(1)} <span className="text-xs align-super">M☉</span></div>
        </div>

        <div>
          <div className="text-[10px] tracking-[2px] text-white/50">TURN</div>
          <div className="font-mono text-lg tabular-nums">{turn}</div>
        </div>
      </div>

      {/* Element legend */}
      <div className="bg-black/40 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-sm min-w-[180px]">
        <div className="text-[10px] tracking-[2px] text-white/50 mb-2 px-1">ELEMENTS</div>
        {Object.entries(ELEMENTS).map(([sym, el]) => {
          const count = elementCounts[sym as ElementSymbol] || 0;
          const isUnlocked = count > 0 || ['H', 'He'].includes(sym); // basic visibility
          return (
            <div key={sym} className={`flex items-center justify-between py-0.5 px-1 rounded ${!isUnlocked ? 'opacity-40' : ''}`}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: el.color }} />
                <span className="font-mono w-6">{sym}</span>
                <span className="text-white/70 text-xs">{el.displayName}</span>
              </div>
              <span className="font-mono tabular-nums text-right w-6">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
