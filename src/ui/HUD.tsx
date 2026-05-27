// src/ui/HUD.tsx
import React from 'react';
import type { Phase, ElementSymbol } from '../game/types';
import { ELEMENTS } from '../game/elements';
import { useGameStore } from '../game/state';
import { getStarAgeInfo } from '../game/phases';

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
  const state = useGameStore();
  const ageInfo = getStarAgeInfo(state);
  const [showModal, setShowModal] = React.useState(false);

  // Dynamic astrophysics ages based on stellar mass: T_MS = 10 / M^2.5 Billion Years
  const tMS = 10 / Math.pow(starMass, 2.5);
  const isMyr = tMS < 0.1;
  const scale = isMyr ? 1000 : 1;
  const unit = isMyr ? 'Million Years' : 'Billion Years';

  const ageMS_start = 0;
  const ageMS_end = tMS * scale * 0.95;
  const ageRG_start = ageMS_end;
  const ageRG_end = tMS * scale * 0.99;
  const ageSG_start = ageRG_end;
  const ageSG_end = tMS * scale * 0.999;
  const ageCollapse = ageSG_end;

  return (
    <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-start pointer-events-none">
      {/* Left Column: Hamburger Menu & HUD horizontal info box */}
      <div className="flex items-center gap-3 pointer-events-auto">
        {/* Hamburger Menu Button */}
        <button 
          onClick={onOpenMenu}
          className="flex items-center justify-center bg-black/40 backdrop-blur-md w-11 h-11 rounded-2xl border border-white/10 cursor-pointer hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] active:scale-[0.95] transition-all text-white text-lg select-none"
          title="Open Pause Menu"
        >
          ☰
        </button>

        {/* HUD horizontal bar (Info Box) */}
        <div 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-between bg-black/40 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 cursor-pointer hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] active:scale-[0.98] transition-all select-none gap-4"
          title="Open Stellar Evolution Guide"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{PHASE_ICONS[phase]}</span>
            <div>
              <div className="text-[9px] tracking-[1.5px] text-white/50">PHASE</div>
              <div className="font-semibold tracking-wide text-xs">{PHASE_LABELS[phase]}</div>
            </div>
          </div>

          <div className="h-6 w-px bg-white/25" />

          <div>
            <div className="text-[9px] tracking-[1.5px] text-white/50">MASS</div>
            <div className="font-mono text-sm tabular-nums">{starMass.toFixed(1)} <span className="text-[10px] align-super">M☉</span></div>
          </div>

          <div className="h-6 w-px bg-white/25" />

          <div>
            <div className="text-[9px] tracking-[1.5px] text-white/50">STAR AGE</div>
            <div className="font-mono text-sm tabular-nums text-cyan-400 font-bold">{ageInfo.formatted}</div>
          </div>

          <div className="h-6 w-px bg-white/25" />

          <div>
            <div className="text-[9px] tracking-[1.5px] text-white/50">TURN</div>
            <div className="font-mono text-sm tabular-nums">{turn}</div>
          </div>
        </div>
      </div>

      {/* Right Column: Element legend */}
      <div className="bg-black/40 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-sm min-w-[180px] pointer-events-auto">
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

      {/* Stellar Life Stage Guide Modal Pop-up Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex justify-center items-center p-4 pointer-events-auto">
          {/* Modal Container */}
          <div className="bg-slate-900/90 border border-white/15 p-6 rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto flex flex-col gap-5 text-white shadow-2xl relative select-none animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 text-lg cursor-pointer"
            >
              ✕
            </button>

            {/* Header */}
            <div className="flex flex-col gap-1.5 border-b border-white/10 pb-4 pr-8">
              <span className="text-[10px] tracking-[2.5px] text-cyan-400 font-bold uppercase">Stellar Physics Journal</span>
              <h2 className="text-xl font-bold tracking-wide">STELLAR LIFE STAGE GUIDE</h2>
              <p className="text-xs text-white/50 leading-relaxed font-normal mt-1">
                A star's lifespan is governed entirely by core nuclear fusion. More massive stars burn through their fuel exponentially faster:
              </p>
              <div className="bg-white/5 border border-white/5 p-2 rounded-xl text-xs font-semibold text-cyan-300 font-mono mt-1 text-center">
                This {starMass.toFixed(1)} Solar Mass Star's Lifespan Model
              </div>
            </div>

            {/* Timeline stages list */}
            <div className="flex flex-col gap-6 relative pl-5 border-l border-white/15 ml-2 text-sm">
              {/* 1. Main Sequence */}
              <div className={`relative ${phase === 'main_sequence' ? 'text-cyan-400 font-bold' : 'text-white/60'}`}>
                {/* Active indicator dot */}
                <div className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border border-black transition-all ${
                  phase === 'main_sequence' 
                    ? 'bg-cyan-400 animate-pulse shadow-[0_0_12px_#22d3ee]' 
                    : 'bg-white/20'
                }`} />
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-base">1. Main Sequence</span>
                  <span className="font-mono text-xs text-white/40">{ageMS_start.toFixed(1)} to {ageMS_end.toFixed(1)} {unit}</span>
                </div>
                <p className="text-xs text-white/45 leading-relaxed font-normal">
                  Hydrogen core fusion sustains stable gravitational equilibrium. This is the longest and most stable phase of a star's life.
                  <span className="block mt-1 text-[10px] text-cyan-400/80 font-mono">Unlocks: H, He</span>
                </p>
              </div>

              {/* 2. Red Giant */}
              <div className={`relative ${phase === 'red_giant' ? 'text-amber-400 font-bold' : 'text-white/60'}`}>
                {/* Active indicator dot */}
                <div className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border border-black transition-all ${
                  phase === 'red_giant' 
                    ? 'bg-amber-400 animate-pulse shadow-[0_0_12px_#fbbf24]' 
                    : 'bg-white/20'
                }`} />
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-base">2. Red Giant</span>
                  <span className="font-mono text-xs text-white/44">{ageRG_start.toFixed(1)} to {ageRG_end.toFixed(1)} {unit}</span>
                </div>
                <p className="text-xs text-white/45 leading-relaxed font-normal">
                  Helium core shrinks & heats up, causing the outer hydrogen layers to expand. Fuses Helium into Carbon and Oxygen.
                  <span className="block mt-1 text-[10px] text-amber-400/80 font-mono">Trigger: Accumulate 8 Helium tiles | Unlocks: C, O</span>
                </p>
              </div>

              {/* 3. Supergiant */}
              <div className={`relative ${phase === 'supergiant' ? 'text-red-400 font-bold' : 'text-white/60'}`}>
                {/* Active indicator dot */}
                <div className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border border-black transition-all ${
                  phase === 'supergiant' 
                    ? 'bg-red-400 animate-pulse shadow-[0_0_12px_#f87171]' 
                    : 'bg-white/20'
                }`} />
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-base">3. Supergiant</span>
                  <span className="font-mono text-xs text-white/44">{ageSG_start.toFixed(1)} to {ageSG_end.toFixed(1)} {unit}</span>
                </div>
                <p className="text-xs text-white/45 leading-relaxed font-normal">
                  Advanced core-shell fusion begins. The star burns Carbon, Oxygen, Neon, Magnesium, and Silicon in concentric layers like an onion.
                  <span className="block mt-1 text-[10px] text-red-400/80 font-mono">Trigger: Star Mass ≥ 8 & 4 Carbon tiles | Unlocks: Ne, Mg, Si</span>
                </p>
              </div>

              {/* 4. Core Collapse */}
              <div className={`relative ${phase === 'collapse' ? 'text-purple-400 font-bold' : 'text-white/60'}`}>
                {/* Active indicator dot */}
                <div className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border border-black transition-all ${
                  phase === 'collapse' 
                    ? 'bg-purple-400 animate-pulse shadow-[0_0_12px_#c084fc]' 
                    : 'bg-white/20'
                }`} />
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-base">4. Core Collapse</span>
                  <span className="font-mono text-xs text-white/44">Above {ageCollapse.toFixed(1)} {unit}</span>
                </div>
                <p className="text-xs text-white/45 leading-relaxed font-normal">
                  Silicon fuses into Iron. Since Iron fusion consumes energy instead of releasing it, the star collapses under extreme gravity, triggering a violent Supernova!
                  <span className="block mt-1 text-[10px] text-purple-400/80 font-mono">Trigger: Create 1 Iron tile | Target: Core Collapse</span>
                </p>
              </div>
            </div>

            {/* Footer Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="mt-2 bg-white/10 border border-white/10 hover:bg-white/25 text-white text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-center"
            >
              Back to Fusion Board
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
