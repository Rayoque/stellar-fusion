// src/ui/Codex.tsx
import React from 'react';
import { ELEMENTS } from '../game/elements';
import type { ElementSymbol } from '../game/types';
import { useGameStore } from '../game/state';
import { BohrModel } from './BohrModel';

interface CodexProps {
  onClose: () => void;
  initialElement?: ElementSymbol | null;
}

const ELEMENT_DESCRIPTIONS: Record<ElementSymbol, string> = {
  // Standard Elements
  H: "Hydrogen. The fundamental thermodynamic fuel of all main-sequence stars. Under gravitational compression, hydrogen cores fuse to release the radiation pressure that prevents stellar collapse.",
  He: "Helium. The primary ash of hydrogen fusion. As hydrogen fuel depletes, the core contracts and heats, eventually triggering helium fusion and expansion into a Red Giant.",
  C: "Carbon. Synthesized via the Triple-Alpha Process, where three helium nuclei collide in a high-temperature resonance. This marks the birth of core helium burning.",
  O: "Oxygen. Synthesized when a carbon nucleus captures a helium-4 alpha particle under extreme core temperatures, building the primary convective ash layer of mature stars.",
  Ne: "Neon. Created by alpha-particle capture on oxygen-16. It serves as a vital thermal intermediate in the advanced shell-burning cycles of massive stars.",
  Mg: "Magnesium. Formed via neon alpha-capture. It is a key constituent in the onion-like concentric shell layers of high-mass supergiants.",
  Si: "Silicon. The final combustible fuel of a massive star. Silicon core fusion occurs rapidly under extreme pressures, forming the final active shell before core collapse.",
  Fe: "Iron. The ultimate nuclear ash. Fusing iron consumes energy rather than releasing it, immediately halting thermal pressure. Gravity wins, triggering a core collapse supernova.",

  // Custom Isotopes (Astrophysicist Mode)
  D: "Deuterium (Deuteron). A stable heavy hydrogen isotope containing one proton and one neutron. Formed as the initial step of the proton-proton chain in stellar cores.",
  He3: "Helium-3. A light, stable helium isotope. Fusing two Helium-3 cores forms Helium-4 and ejects two protons, completing the primary branch of hydrogen burning.",
  He4: "Helium-4. The highly stable alpha particle product of hydrogen burning. It serves as the primary building block for all subsequent alpha-capture reactions.",
  Be7: "Beryllium-7. An unstable isotope formed via Helium-3 and Helium-4 capture. Undergoes electron capture to decay into Lithium-7, which then captures a proton to form Helium-4.",
  Be8: "Beryllium-8. A highly unstable isotope with a half-life of 10^-16 seconds, formed by two colliding alpha particles. It must capture a third alpha particle instantly to form Carbon.",
  C12: "Carbon-12. The stable isotope synthesized in the triple-alpha bottleneck. It is the catalyst that enables the highly efficient CNO cycle in massive stars.",
  O16: "Oxygen-16. The primary product of carbon alpha-capture. It is the most abundant isotope of oxygen and builds the core convective ash layers of mature stars.",
  Ne20: "Neon-20. Formed by oxygen alpha-capture. During advanced shell burning, high-energy gamma rays photodisintegrate Neon, releasing alpha particles that feed silicon creation.",
  Mg24: "Magnesium-24. Synthesized via neon alpha-capture. It forms an onion-skin shell in massive supergiants, marking the onset of extreme core temperatures.",
  Si28: "Silicon-28. The final combustible ash of massive stars. Under extreme core pressures, Silicon burning starts a rapid photodisintegration ladder that ends at Iron.",
  S32: "Sulfur-32. Formed during the silicon alpha-process ladder. It represents the outer convective layer of the dense pre-supernova core.",
  Ar36: "Argon-36. Synthesized by silicon-burning alpha-capture. It is stable but can capture further alpha particles to create calcium under multi-billion Kelvin heat.",
  Ca40: "Calcium-40. The doubly magic isotope with 20 protons and 20 neutrons, synthesized during advanced core contraction before collapse.",
  Ti44: "Titanium-44. An unstable isotope formed via calcium alpha-capture. It decays with a half-life of 60 years, producing diagnostic gamma-rays in supernova remnants.",
  Cr48: "Chromium-48. Synthesized via titanium alpha-capture. It is an unstable intermediate that participates in the rapid thermonuclear synthesis of nickel.",
  Fe52: "Iron-52. An unstable isotope of iron that decays rapidly into Chromium-48. It is a critical intermediate in high-temperature silicon-burning ash.",
  Ni56: "Nickel-56. The primary thermonuclear product of silicon-burning. Extremely unstable, it decays into Cobalt-56 and then stable Iron-56, powering the glow of supernovae.",
  Fe56: "Iron-56. The ultimate nuclear ash. Fusing iron consumes energy rather than releasing it, halting thermal pressure. Gravity wins, triggering core collapse."
};

const REACTION_FORMULAS: Record<ElementSymbol, string> = {
  H: "¹H + ¹H → ²H + e⁺ + ν_e  (Proton-Proton)",
  D: "²H + ¹H → ³He + γ  (Deuterium Fusion)",
  He3: "³He + ³He → ⁴He + 2¹H",
  He4: "3 ⁴He → ¹²C + γ  (Triple-Alpha Process)",
  Be7: "⁴He + ³He → ⁷Be + γ",
  Be8: "⁴He + ⁴He ⇄ ⁸Be  (Unstable Intermediate)",
  C12: "¹²C + ⁴He → ¹⁶O + γ  (Alpha Capture)",
  O16: "¹⁶O + ⁴He → ²⁰Ne + γ",
  Ne20: "²⁰Ne + ⁴He → ²⁴Mg + γ",
  Mg24: "²⁴Mg + ⁴He → ²⁸Si + γ",
  Si28: "²⁸Si + ⁴He → ³²S + γ",
  S32: "³²S + ⁴He → ³⁶Ar + γ",
  Ar36: "³⁶Ar + ⁴He → ⁴⁰Ca + γ",
  Ca40: "⁴⁰Ca + ⁴He → ⁴⁴Ti + γ",
  Ti44: "⁴⁴Ti + ⁴He → ⁴⁸Cr + γ",
  Cr48: "⁴⁸Cr + ⁴He → ⁵²Fe + γ",
  Fe52: "⁵²Fe + ⁴He → ⁵⁶Ni + γ",
  Ni56: "⁵⁶Ni → ⁵⁶Co + e⁺ + ν_e → ⁵⁶Fe  (Radioactive Decay)",
  Fe56: "⁵⁶Fe  (Maximum Binding Energy Core Ash)",
  
  // Standard mode fallbacks
  He: "¹H + ¹H → ⁴He  (Simplified Hydrogen Burning)",
  C: "3 ⁴He → ¹²C  (Triple-Alpha Process)",
  O: "¹²C + ⁴He → ¹⁶O  (Oxygen Synthesis)",
  Ne: "¹⁶O + ⁴He → ²⁰Ne  (Neon Shell Burning)",
  Mg: "²⁰Ne + ⁴He → ²⁴Mg  (Alpha Process)",
  Si: "²⁴Mg + ⁴He → ²⁸Si  (Silicon Synthesis)",
  Fe: "²⁸Si + ²⁸Si → ⁵⁶Fe  (Core Collapse Threshold)"
};

export function Codex({ onClose, initialElement }: CodexProps) {
  const unlockedElements = useGameStore(s => s.unlockedElements);
  const isAstro = useGameStore(s => s.astrophysicistMode);
  const [selectedSym, setSelectedSym] = React.useState<ElementSymbol | null>(initialElement ?? null);

  const activeIsotopes: ElementSymbol[] = isAstro
    ? ['H', 'D', 'He3', 'He4', 'Be7', 'Be8', 'C12', 'O16', 'Ne20', 'Mg24', 'Si28', 'S32', 'Ar36', 'Ca40', 'Ti44', 'Cr48', 'Fe52', 'Ni56', 'Fe56']
    : ['H', 'He', 'C', 'O', 'Ne', 'Mg', 'Si', 'Fe'];

  React.useEffect(() => {
    const firstUnlockedInActive = unlockedElements.find(x => activeIsotopes.includes(x));
    if (firstUnlockedInActive && !selectedSym) {
      setSelectedSym(firstUnlockedInActive);
    }
  }, [unlockedElements, selectedSym, activeIsotopes]);

  const unlockedCount = unlockedElements.filter(x => activeIsotopes.includes(x)).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex justify-center items-center p-4 animate-fade-in-up select-none pointer-events-auto"
      onClick={onClose}
    >
      {/* Modal Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0f0f15]/95 border border-white/10 p-6 sm:p-8 rounded-[32px] max-w-2xl w-full h-[580px] md:h-[480px] max-h-[90vh] overflow-hidden flex flex-col gap-5 text-white shadow-[0_16px_48px_rgba(0,0,0,0.7)] relative isolate"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white hover:bg-white/5 w-8 h-8 rounded-full border border-white/5 flex items-center justify-center transition-all active:scale-95 text-lg cursor-pointer z-10"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex flex-col gap-1 border-b border-white/5 pb-3 pr-8">
          <span className="text-[9px] tracking-[3px] text-cyan-400 font-bold uppercase font-mono">Stellar Physics Journal</span>
          <h2 className="text-xl font-light tracking-[0.12em] uppercase">
            {isAstro ? 'ASTROPHYSICIST CODEX' : 'STELLAR CODEX'}
          </h2>
          <p className="text-xs text-white/55 font-light leading-relaxed">
            Nuclear nucleosynthesis drives stellar evolution. Fuse elements on the 3D board to unlock entries in this astrophysical journal.
          </p>
        </div>

        {/* Content Body: Split layout on desktop, stacked on mobile */}
        <div className="flex flex-col md:flex-row gap-5 flex-1 overflow-hidden min-h-0">
          {/* Left Panel: Grid of elements */}
          <div className="flex-1 md:max-w-[280px] overflow-y-auto pr-1 custom-scrollbar">
            <div className="grid grid-cols-4 gap-2">
              {activeIsotopes.map((sym) => {
                const el = ELEMENTS[sym];
                const isUnlocked = unlockedElements.includes(sym);
                const isSelected = selectedSym === sym;
                
                if (isUnlocked) {
                  return (
                    <button
                      key={sym}
                      onClick={() => setSelectedSym(sym)}
                      className={`aspect-square rounded-2xl border transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 cursor-pointer ${
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
                      <span className="font-mono text-sm font-bold">{sym}</span>
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

            <div className="mt-4 hidden md:block text-[8px] font-mono text-white/30 tracking-widest leading-relaxed uppercase border-t border-white/5 pt-3">
              Progression: {unlockedCount} / {activeIsotopes.length} Elements Discovered
            </div>
          </div>

          {/* Right Panel: Selected Element scientific detail card */}
          <div className="flex-1 bg-white/3 border border-white/5 rounded-2xl p-4 flex flex-col justify-between overflow-y-auto custom-scrollbar">
            {selectedSym ? (
              <div className="flex flex-col gap-4 animate-fade-in-up">
                <div className="flex items-center gap-3">
                  {/* Element Glowing Badge */}
                  <div 
                    className="w-11 h-11 rounded-full border flex items-center justify-center shadow-lg font-mono text-base font-bold select-none bg-black/30 animate-pulse"
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

                {/* 3D Interactive Bohr Model component placement */}
                <BohrModel atomicNumber={ELEMENTS[selectedSym].atomicNumber} />

                {/* Chemical / Fusion Reaction Formula notation */}
                <div className="bg-black/30 border border-white/5 px-3 py-2 rounded-xl text-center">
                  <span className="text-[7.5px] font-mono font-bold tracking-widest text-cyan-400 block mb-1 uppercase">Reaction Equation</span>
                  <div className="text-[10px] font-mono text-white/85">
                    {REACTION_FORMULAS[selectedSym]}
                  </div>
                </div>

                <p className="text-[11px] text-white/60 font-light leading-relaxed flex-1 border-t border-white/5 pt-3">
                  {ELEMENT_DESCRIPTIONS[selectedSym]}
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
