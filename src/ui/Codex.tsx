// src/ui/Codex.tsx
import React from 'react';
import { ELEMENTS } from '../game/elements';
import type { ElementSymbol } from '../game/types';
import { useGameStore } from '../game/state';

interface CodexProps {
  onClose: () => void;
  initialElement?: ElementSymbol | null;
}

const ELEMENT_DESCRIPTIONS: Partial<Record<ElementSymbol, string>> = {
  H: "Hydrogen. The most abundant chemical substance in the universe. It serves as the fundamental thermodynamic fuel of all main-sequence stars, sustaining stable gravitational equilibrium.",
  He: "Helium. Formed through hydrogen core fusion. Once hydrogen fuel is exhausted, core contraction heats the stellar core, triggering helium ignition and red giant expansion.",
  C: "Carbon. Synthesized via the Triple-Alpha Process, where three helium nuclei collide in a rare, high-pressure resonance. This ignition marks the birth of red giant core burning.",
  O: "Oxygen. Synthesized when a carbon nucleus captures a helium-4 alpha particle under extreme stellar core temperatures, building the primary convective ash layer.",
  Ne: "Neon. Created by alpha-particle capture on oxygen-16. It serves as a vital thermal intermediate in the advanced shell-burning cycles of massive stars.",
  Mg: "Magnesium. Formed via neon alpha-capture. It is a key constituent in the onion-like concentric shell layers of high-mass supergiants.",
  Si: "Silicon. The final combustible fuel of a massive star. Silicon core fusion occurs rapidly under extreme pressures, forming the final active shell before gravitational collapse.",
  Fe: "Iron. The ultimate nuclear ash. Fusing iron consumes energy rather than releasing it, immediately halting thermal pressure. Gravity wins, triggering a violent core collapse supernova."
};

export function Codex({ onClose, initialElement }: CodexProps) {
  const unlockedElements = useGameStore(s => s.unlockedElements);
  const isAstro = useGameStore(s => s.astrophysicistMode);
  const [selectedSym, setSelectedSym] = React.useState<ElementSymbol | null>(initialElement ?? null);

  const activeIsotopes: ElementSymbol[] = isAstro
    ? ['H', 'D', 'He3', 'He4', 'Be7', 'Be8', 'C12', 'O16', 'Ne20', 'Mg24', 'Si28', 'S32', 'Ar36', 'Ca40', 'Ti44', 'Cr48', 'Fe52', 'Ni56', 'Fe56']
    : ['H', 'He', 'C', 'O', 'Ne', 'Mg', 'Si', 'Fe'];

  // Auto-select the first unlocked element that is in the active list
  React.useEffect(() => {
    const firstUnlockedInActive = unlockedElements.find(x => activeIsotopes.includes(x));
    if (firstUnlockedInActive && !selectedSym) {
      setSelectedSym(firstUnlockedInActive);
    }
  }, [unlockedElements, selectedSym, activeIsotopes]);

  const unlockedCount = unlockedElements.filter(x => activeIsotopes.includes(x)).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex justify-center items-center p-4 animate-fade-in-up select-none pointer-events-auto">
      {/* Modal Card */}
      <div className="bg-[#0f0f15]/95 border border-white/10 p-6 sm:p-8 rounded-[32px] max-w-2xl w-full h-[550px] md:h-[440px] max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col gap-6 text-white shadow-[0_16px_48px_rgba(0,0,0,0.7)] relative isolate">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white hover:bg-white/5 w-8 h-8 rounded-full border border-white/5 flex items-center justify-center transition-all active:scale-95 text-lg cursor-pointer z-10"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex flex-col gap-1 border-b border-white/5 pb-4 pr-8">
          <span className="text-[9px] tracking-[3px] text-cyan-400 font-bold uppercase font-mono">Stellar Physics Journal</span>
          <h2 className="text-xl font-light tracking-[0.12em] uppercase">
            {isAstro ? 'ASTROPHYSICIST CODEX' : 'STELLAR CODEX'}
          </h2>
          <p className="text-xs text-white/55 font-light leading-relaxed">
            Nuclear nucleosynthesis drives stellar evolution. Fuse elements on the 3D board to unlock entries in this astrophysical journal.
          </p>
        </div>

        {/* Content Body: Split layout on desktop, stacked on mobile */}
        <div className="flex flex-col md:flex-row gap-6 flex-1 overflow-hidden min-h-0">
          {/* Left Panel: Grid of elements */}
          <div className="flex-1 md:max-w-[280px] overflow-y-auto pr-1 custom-scrollbar">
            <div className="grid grid-cols-4 gap-2.5">
              {activeIsotopes.map((sym) => {
                const el = ELEMENTS[sym];
                const isUnlocked = unlockedElements.includes(sym);
                const isSelected = selectedSym === sym;
                
                if (isUnlocked) {
                  return (
                    <button
                      key={sym}
                      onClick={() => setSelectedSym(sym)}
                      className={`aspect-square rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer ${
                        isSelected 
                          ? 'bg-white/10 border-white/30 shadow-[0_0_12px_rgba(255,255,255,0.08)]' 
                          : 'bg-black/35 border-white/8 hover:bg-white/5 hover:border-white/15'
                      }`}
                      style={{ 
                        color: el.color,
                        boxShadow: isSelected ? `0 0 16px ${el.color}20` : 'none',
                        borderColor: isSelected ? el.color : undefined
                      }}
                    >
                      <span className="font-mono text-base font-bold">{sym}</span>
                      <span className="text-[7.5px] font-mono tracking-wider opacity-60 text-white leading-none font-bold uppercase">
                        {el.atomicNumber}
                      </span>
                    </button>
                  );
                } else {
                  return (
                    <div
                      key={sym}
                      className="aspect-square rounded-2xl border border-dashed border-white/5 bg-black/10 flex items-center justify-center opacity-25 cursor-default select-none"
                      title="Locked Element"
                    >
                      <span className="font-mono text-sm text-white/40">?</span>
                    </div>
                  );
                }
              })}
            </div>

            <div className="mt-4 hidden md:block text-[8px] font-mono text-white/30 tracking-widest leading-relaxed uppercase border-t border-white/5 pt-4">
              Progression: {unlockedCount} / {activeIsotopes.length} Elements Discovered
            </div>
          </div>

          {/* Right Panel: Selected Element scientific detail card */}
          <div className="flex-1 bg-white/3 border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-y-auto custom-scrollbar">
            {selectedSym ? (
              <div className="flex flex-col gap-4 animate-fade-in-up">
                <div className="flex items-center gap-3">
                  {/* Element Glowing Badge */}
                  <div 
                    className="w-12 h-12 rounded-full border flex items-center justify-center shadow-lg font-mono text-lg font-bold select-none bg-black/30 animate-pulse"
                    style={{ 
                      borderColor: ELEMENTS[selectedSym].color,
                      color: ELEMENTS[selectedSym].color,
                      boxShadow: `0 0 16px ${ELEMENTS[selectedSym].color}25`
                    }}
                  >
                    {selectedSym}
                  </div>
                  <div>
                    <div className="text-[8px] tracking-[2px] text-white/35 font-mono leading-none uppercase">
                      Atomic No. {ELEMENTS[selectedSym].atomicNumber}
                    </div>
                    <div className="text-base font-semibold tracking-wide mt-1 text-white/95">
                      {ELEMENTS[selectedSym].displayName}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-white/60 font-light leading-relaxed flex-1 border-t border-white/5 pt-4">
                  {ELEMENT_DESCRIPTIONS[selectedSym] || 
                    `${ELEMENTS[selectedSym].displayName} (${selectedSym}). An advanced nuclear isotope participating in the astrophysicist fusion pathways. Synthesized in the extreme thermal and pressure environments of mature stellar cores.`}
                </p>
                
                <div className="text-[9px] font-mono text-cyan-400 bg-cyan-950/20 border border-cyan-500/10 px-3 py-1.5 rounded-xl flex justify-between items-center select-none font-semibold">
                  <span>Slide limit:</span>
                  <span className="font-bold">{ELEMENTS[selectedSym].slideDistance === 0 ? "Immovable (Core Ash)" : `${ELEMENTS[selectedSym].slideDistance} grid steps`}</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-white/30 p-6">
                <span className="text-2xl mb-2 font-light">📔</span>
                <p className="text-xs max-w-[200px] leading-relaxed">
                  Select an element on the left to read its astrophysical journal log.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer for Mobile progress summary */}
        <div className="md:hidden flex justify-between items-center text-[8px] font-mono text-white/35 tracking-widest border-t border-white/5 pt-2 uppercase">
          <span>Progression: {unlockedCount} / {activeIsotopes.length}</span>
          <span>Stellar Fusion Engine</span>
        </div>
      </div>
    </div>
  );
}
