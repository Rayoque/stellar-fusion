// src/ui/HUD.tsx
import React from 'react';
import type { Phase, ElementSymbol } from '../game/types';
import { ELEMENTS } from '../game/elements';
import { useGameStore } from '../game/state';
import { getStarAgeInfo } from '../game/phases';
import { LEVELS } from '../game/levels';

interface HUDProps {
  phase: Phase;
  starMass: number;
  turn: number;
  elementCounts: Record<ElementSymbol, number>;
  onOpenMenu: () => void;
  onOpenCodex: () => void;
  onOpenObjectives?: () => void;
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

function hexToRgb(hex: string) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function interpolateColor(color1: string, color2: string, factor: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + factor * (c2.r - c1.r));
  const g = Math.round(c1.g + factor * (c2.g - c1.g));
  const b = Math.round(c1.b + factor * (c2.b - c1.b));
  return rgbToHex(r, g, b);
}

function getMainSequenceColor(mass: number): string {
  if (mass <= 1.5) {
    const t = (mass - 1.0) / 0.5;
    return interpolateColor('#f97316', '#fbbf24', Math.min(Math.max(t, 0), 1));
  } else if (mass <= 3.0) {
    const t = (mass - 1.5) / 1.5;
    return interpolateColor('#fbbf24', '#fef08a', Math.min(Math.max(t, 0), 1));
  } else if (mass <= 8.0) {
    const t = (mass - 3.0) / 5.0;
    return interpolateColor('#fef08a', '#e0f2fe', Math.min(Math.max(t, 0), 1));
  } else if (mass <= 16.0) {
    const t = (mass - 8.0) / 8.0;
    return interpolateColor('#e0f2fe', '#38bdf8', Math.min(Math.max(t, 0), 1));
  } else {
    const t = (mass - 16.0) / 14.0;
    return interpolateColor('#38bdf8', '#1d4ed8', Math.min(Math.max(t, 0), 1));
  }
}

const PHASE_COLORS: Record<Phase, string> = {
  main_sequence: '#38bdf8', // Default fallback, dynamic override used in render
  red_giant: '#ff1a1a',     // Deep vibrant Scarlet Red
  supergiant: '#f43f5e',    // Hot electric Crimson-Magenta
  collapse: '#a855f7',      // Purple
};

export function HUD({ phase, starMass, turn, elementCounts, onOpenMenu, onOpenCodex, onOpenObjectives }: HUDProps) {
  const state = useGameStore();
  const ageInfo = getStarAgeInfo(state);
  const compactAge = ageInfo.formatted
    .replace(' Billion Years', 'B')
    .replace(' Million Years', 'M')
    .replace(' Years', 'Y');
  const [showModal, setShowModal] = React.useState(false);

  const handleCloseGuide = () => {
    setShowModal(false);
    window.scrollTo(0, 0);
  };

  // Campaign support
  const currentLevelId = useGameStore(s => s.currentLevelId);
  const level = currentLevelId !== null ? LEVELS.find(l => l.id === currentLevelId) : null;
  const maxTurns = level ? level.maxTurns : null;

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

  const currentThemeColor = phase === 'main_sequence'
    ? getMainSequenceColor(starMass)
    : (PHASE_COLORS[phase] || '#38bdf8');

  return (
    <div className="absolute inset-0 z-10 pointer-events-none select-none">
      {/* Top Left: Hamburger Menu Button */}
      <div className="absolute left-4 pointer-events-auto hud-top-container">
        <button 
          onClick={onOpenMenu}
          className="flex items-center justify-center bg-black/40 backdrop-blur-md w-11 h-11 rounded-full border border-white/10 cursor-pointer hover:bg-white/10 hover:border-white/20 active:scale-[0.92] transition-all text-white text-base select-none shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
          style={{ borderColor: `${currentThemeColor}25` }}
          title="Open Pause Menu"
        >
          ☰
        </button>
      </div>

      {/* Top Center: HUD Horizontal Stats Pill & Scenario Objective Banner */}
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-auto hud-top-container">
        <div 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-between glass-pill px-3 md:px-4 h-11 rounded-full cursor-pointer hover:bg-white/5 active:scale-[0.98] transition-all select-none gap-2 md:gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.35)] border border-white/8"
          style={{ 
            borderColor: `${currentThemeColor}30`, 
            boxShadow: `0 0 16px ${currentThemeColor}08, inset 0 0 10px ${currentThemeColor}05` 
          }}
          title="Open Stellar Evolution Guide"
        >
          {/* Desktop Layout (md:flex hidden with fluid gaps/text on medium-to-large viewports) */}
          <div className="hidden md:flex items-center gap-2.5 lg:gap-4">
            <div className="flex items-center gap-1.5 lg:gap-2.5">
              <span className="text-sm lg:text-base flex items-center justify-center translate-y-[-0.5px]" style={{ color: currentThemeColor }}>{PHASE_ICONS[phase]}</span>
              <div>
                <div className="text-[6.5px] lg:text-[7.5px] tracking-[1px] lg:tracking-[1.5px] text-white/40 leading-none">PHASE</div>
                <div className="font-semibold tracking-wide text-[9px] lg:text-[10px] leading-tight mt-0.5 whitespace-nowrap">{PHASE_LABELS[phase]}</div>
              </div>
            </div>

            <div className="h-5 w-px bg-white/15" />

            <div>
              <div className="text-[6.5px] lg:text-[7.5px] tracking-[1px] lg:tracking-[1.5px] text-white/40 leading-none">MASS</div>
              <div className="font-mono text-[11px] lg:text-xs mt-0.5 tabular-nums text-white/90 whitespace-nowrap">{starMass.toFixed(1)} <span className="text-[7.5px] lg:text-[8px] text-white/50 align-super">M☉</span></div>
            </div>

            <div className="h-5 w-px bg-white/15" />

            <div>
              <div className="text-[6.5px] lg:text-[7.5px] tracking-[1px] lg:tracking-[1.5px] text-white/40 leading-none">STAR AGE</div>
              <div className="font-mono text-[11px] lg:text-xs mt-0.5 tabular-nums font-bold whitespace-nowrap" style={{ color: currentThemeColor }}>{ageInfo.formatted}</div>
            </div>

            <div className="h-5 w-px bg-white/15" />

            <div>
              <div className="text-[6.5px] lg:text-[7.5px] tracking-[1px] lg:tracking-[1.5px] text-white/40 leading-none">TURN</div>
              <div className="font-mono text-[11px] lg:text-xs mt-0.5 tabular-nums text-white/90 whitespace-nowrap">
                {turn}{maxTurns !== null ? ` / ${maxTurns}` : ''}
              </div>
            </div>
          </div>

          {/* Mobile/Compact Layout (flex md:hidden) */}
          <div className="flex md:hidden items-center gap-1.5 text-[8.5px] font-mono tracking-wider font-semibold uppercase text-white/80 whitespace-nowrap">
            <span className="text-[10px] leading-none flex items-center justify-center translate-y-[-0.5px]" style={{ color: currentThemeColor }}>{PHASE_ICONS[phase]}</span>
            <span className="font-bold tracking-widest" style={{ color: currentThemeColor }}>
              {phase === 'main_sequence' ? 'MAIN' : phase === 'red_giant' ? 'GIANT' : phase === 'supergiant' ? 'SUPER' : 'COLLAPSE'}
            </span>
            <span className="opacity-25">•</span>
            <span className="text-white">{starMass.toFixed(1)} M☉</span>
            <span className="opacity-25">•</span>
            <span className="font-bold" style={{ color: currentThemeColor }}>{compactAge}</span>
            <span className="opacity-25">•</span>
            <span className="text-white">T{turn}{maxTurns !== null ? `/${maxTurns}` : ''}</span>
          </div>
        </div>

        {/* Campaign Objective Floating Secondary Banner */}
        {level && onOpenObjectives && (
          <div 
            onClick={onOpenObjectives}
            className="glass-pill px-3 py-1 rounded-full text-[7.5px] font-mono tracking-widest text-cyan-300 font-bold uppercase whitespace-nowrap shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-cyan-500/15 hover:bg-white/10 active:scale-[0.96] transition-all cursor-pointer pointer-events-auto animate-fade-in-up"
            title="Click to view detailed scientific scenario objective description"
          >
            Objective: {level.objectives[0].type === 'has_element' ? `Synthesize ${level.objectives[0].element}` : level.title}
          </div>
        )}
      </div>

      <div 
        className="absolute left-1/2 -translate-x-1/2 pointer-events-auto hud-bottom-container" 
      >
        <div className="flex flex-col items-center gap-2 xs:gap-3.5 pointer-events-none select-none max-w-[94vw] xs:max-w-[88vw] sm:max-w-md md:max-w-xl">
          {/* Dynamic Instructions placed directly above the Elements Tray */}
          <div className="text-[8px] xs:text-[9px] sm:text-[10px] opacity-35 tracking-[2px] xs:tracking-[4px] font-mono uppercase whitespace-nowrap mb-0.5 select-none">
            DRAG TILES TO FUSE • BUILD YOUR STAR
          </div>

          {/* Elements Tray */}
          <div 
            className="glass-panel px-2.5 xs:px-3.5 py-2.5 xs:py-3 rounded-[20px] xs:rounded-[22px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center gap-1.5 xs:gap-2.5 overflow-x-auto no-scrollbar max-w-full pointer-events-auto border border-white/8"
            style={{ 
              borderColor: `${currentThemeColor}15`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${currentThemeColor}05`
            }}
          >
            {Object.entries(ELEMENTS).map(([sym, el]) => {
              const count = elementCounts[sym as ElementSymbol] || 0;
              const isUnlocked = count > 0 || ['H', 'He'].includes(sym);
              
              if (isUnlocked) {
                return (
                  <div 
                    key={sym}
                    className="relative flex items-center justify-center w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-full border bg-black/40 transition-all duration-300 hover:scale-[1.08] active:scale-[0.95] flex-shrink-0"
                    style={{ 
                      borderColor: el.color,
                      boxShadow: `0 0 10px ${el.color}15, inset 0 0 6px ${el.color}10`
                    }}
                    title={`${el.displayName}: ${count} nuclei`}
                  >
                    <span 
                      className="font-mono text-[10px] xs:text-xs sm:text-sm font-bold tracking-tight"
                      style={{ color: el.color }}
                    >
                      {sym}
                    </span>
                    <span className="absolute -top-1 -right-1 bg-[#101015]/90 text-white border border-white/10 font-mono text-[7.5px] xs:text-[8px] sm:text-[9px] w-3.5 h-3.5 xs:w-4 xs:h-4 rounded-full flex items-center justify-center backdrop-blur-md font-bold tabular-nums">
                      {count}
                    </span>
                  </div>
                );
              } else {
                return (
                  <div 
                    key={sym}
                    className="relative flex items-center justify-center w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-full border border-dashed border-white/10 bg-black/10 opacity-30 select-none cursor-default flex-shrink-0"
                    title={`Locked Element (Fuse heavier nuclei to discover)`}
                  >
                    <span className="font-mono text-[9px] xs:text-[10px] sm:text-xs text-white/50 font-medium">
                      {sym}
                    </span>
                  </div>
                );
              }
            })}

            {/* Subtle Divider before Codex Button */}
            <div className="w-px h-5 xs:h-6 bg-white/10 self-center flex-shrink-0" />

            {/* Codex Circular shortcut button */}
            <button
              onClick={onOpenCodex}
              className="relative flex items-center justify-center w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-[1.08] active:scale-[0.95] cursor-pointer flex-shrink-0"
              title="Open Stellar Codex Journal"
            >
              <span className="text-xs xs:text-sm select-none">📔</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stellar Life Stage Guide Modal Pop-up Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-center items-center p-4 pointer-events-auto">
          {/* Modal Container */}
          <div className="bg-[#0f0f15]/95 border border-white/10 p-6 rounded-[28px] max-w-lg w-full max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col gap-5 text-white shadow-2xl relative select-none animate-fade-in-up">
            {/* Close Button */}
            <button 
              onClick={handleCloseGuide}
              className="absolute top-4 right-4 text-white/40 hover:text-white hover:bg-white/5 w-8 h-8 rounded-full border border-white/5 flex items-center justify-center transition-all active:scale-95 text-lg cursor-pointer"
            >
              ✕
            </button>

            {/* Header */}
            <div className="flex flex-col gap-1 border-b border-white/5 pb-4 pr-8">
              <span className="text-[9px] tracking-[2.5px] text-cyan-400 font-bold uppercase font-mono">Stellar Physics Journal</span>
              <h2 className="text-lg font-semibold tracking-wide">STELLAR LIFE STAGE GUIDE</h2>
              <p className="text-xs text-white/50 leading-relaxed font-normal mt-1">
                A star's lifespan is governed entirely by core nuclear fusion. More massive stars burn through their fuel exponentially faster:
              </p>
              <div className="bg-white/5 border border-white/5 p-2 rounded-xl text-xs font-semibold text-cyan-300 font-mono mt-1 text-center">
                This {starMass.toFixed(1)} Solar Mass Star's Lifespan Model
              </div>
            </div>

            {/* Timeline stages list */}
            <div className="flex flex-col gap-6 relative pl-5 border-l border-white/10 ml-2 text-sm">
              {/* 1. Main Sequence */}
              <div className={`relative ${phase === 'main_sequence' ? 'text-cyan-400 font-bold' : 'text-white/60'}`}>
                {/* Active indicator dot */}
                <div className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border border-[#0f0f15] transition-all ${
                  phase === 'main_sequence' 
                    ? 'bg-cyan-400 animate-pulse shadow-[0_0_12px_#22d3ee]' 
                    : 'bg-white/20'
                }`} />
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-base font-semibold">1. Main Sequence</span>
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
                <div className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border border-[#0f0f15] transition-all ${
                  phase === 'red_giant' 
                    ? 'bg-amber-400 animate-pulse shadow-[0_0_12px_#fbbf24]' 
                    : 'bg-white/20'
                }`} />
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-base font-semibold">2. Red Giant</span>
                  <span className="font-mono text-xs text-white/40">{ageRG_start.toFixed(1)} to {ageRG_end.toFixed(1)} {unit}</span>
                </div>
                <p className="text-xs text-white/45 leading-relaxed font-normal">
                  Helium core shrinks & heats up, causing the outer hydrogen layers to expand. Fuses Helium into Carbon and Oxygen.
                  <span className="block mt-1 text-[10px] text-amber-400/80 font-mono">Trigger: Accumulate 8 Helium tiles | Unlocks: C, O</span>
                </p>
              </div>

              {/* 3. Supergiant */}
              <div className={`relative ${phase === 'supergiant' ? 'text-red-400 font-bold' : 'text-white/60'}`}>
                {/* Active indicator dot */}
                <div className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border border-[#0f0f15] transition-all ${
                  phase === 'supergiant' 
                    ? 'bg-red-400 animate-pulse shadow-[0_0_12px_#f87171]' 
                    : 'bg-white/20'
                }`} />
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-base font-semibold">3. Supergiant</span>
                  <span className="font-mono text-xs text-white/40">{ageSG_start.toFixed(1)} to {ageSG_end.toFixed(1)} {unit}</span>
                </div>
                <p className="text-xs text-white/45 leading-relaxed font-normal">
                  Advanced core-shell fusion begins. The star burns Carbon, Oxygen, Neon, Magnesium, and Silicon in concentric layers like an onion.
                  <span className="block mt-1 text-[10px] text-red-400/80 font-mono">Trigger: Star Mass ≥ 8 & 4 Carbon tiles | Unlocks: Ne, Mg, Si</span>
                </p>
              </div>

              {/* 4. Core Collapse */}
              <div className={`relative ${phase === 'collapse' ? 'text-purple-400 font-bold' : 'text-white/60'}`}>
                {/* Active indicator dot */}
                <div className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border border-[#0f0f15] transition-all ${
                  phase === 'collapse' 
                    ? 'bg-purple-400 animate-pulse shadow-[0_0_12px_#c084fc]' 
                    : 'bg-white/20'
                }`} />
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-base font-semibold">4. Core Collapse</span>
                  <span className="font-mono text-xs text-white/40 font-bold">Above {ageCollapse.toFixed(1)} {unit}</span>
                </div>
                <p className="text-xs text-white/45 leading-relaxed font-normal">
                  Silicon fuses into Iron. Since Iron fusion consumes energy instead of releasing it, the star collapses under extreme gravity, triggering a violent Supernova!
                  <span className="block mt-1 text-[10px] text-purple-400/80 font-mono">Trigger: Create 1 Iron tile | Target: Core Collapse</span>
                </p>
              </div>
            </div>

            {/* Footer Close Button */}
            <button
              onClick={handleCloseGuide}
              className="mt-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-center active:scale-[0.985]"
            >
              Back to Fusion Board
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
