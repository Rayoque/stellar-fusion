// src/ui/HUD.tsx
import React from 'react';
import type { Phase, ElementSymbol } from '../game/types';
import { ELEMENTS } from '../game/elements';
import { useGameStore } from '../game/state';
import { findLevel } from '../game/levels';
import { CARBON_IGNITION_MASS, DECAY } from '../game/rules';
import { getStarClass, formatStarAge } from '../game/stars';
import { ZoomTooltip } from './ZoomTooltip';
import { AtomIcon, BookIcon, UndoIcon } from './icons';

const CARBON_BURNING: ElementSymbol[] = ['Ne', 'Mg', 'Si', 'Fe'];

// Short objective label for the banner under the stats pill.
function objectiveLabel(level: { objectives: Array<{ type: string; element?: ElementSymbol; count?: number }> }): string {
  return level.objectives.map(obj => {
    const el = obj.element ?? '';
    switch (obj.type) {
      case 'has_element': return (obj.count ?? 1) > 1 ? `Make ${obj.count} ${el}` : `Make ${el}`;
      case 'has_element_count': return `Hold ${obj.count ?? 1} ${el}`;
      case 'has_element_on_pentagon': return `${el} on a pentagon`;
      case 'has_all_elements': return 'All 8 elements at once';
      default: return '';
    }
  }).filter(Boolean).join(' + ');
}

interface HUDProps {
  phase: Phase;
  starMass: number;
  turn: number;
  elementCounts: Record<ElementSymbol, number>;
  onOpenMenu: () => void;
  onOpenCodex: () => void;
  onOpenObjectives?: () => void;
  showZoomHint?: boolean;
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

export function HUD({ phase, starMass, turn, elementCounts, onOpenMenu, onOpenCodex, onOpenObjectives, showZoomHint }: HUDProps) {
  const state = useGameStore();
  const showZenMode = useGameStore(s => (s as any).showZenMode);
  const zenClass = showZenMode ? 'opacity-0 pointer-events-none transition-all duration-500' : 'transition-all duration-500';
  const [showModal, setShowModal] = React.useState(false);

  // Stellar Life runs have a lifetime counted in moves.
  const star = getStarClass(state.starClass);
  const lifetime = state.lifetime;
  const movesLeft = lifetime !== null ? Math.max(0, lifetime - turn) : null;
  const lifeFraction = lifetime !== null ? Math.min(1, turn / lifetime) : 0;
  // Astrophysicist runs end when the sphere is full, so the pill counts free faces.
  const freeFaces = state.astrophysicistMode ? Math.max(0, state.faces.length - state.tiles.size) : null;
  const lowMassStar = !state.astrophysicistMode && starMass < CARBON_IGNITION_MASS;

  const handleCloseGuide = () => {
    setShowModal(false);
    window.scrollTo(0, 0);
  };

  const trayRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const hasDispatchedDownRef = React.useRef(false);
  // One gesture model for the whole tray, mouse and touch alike:
  // vertical-dominant drags orbit the star, horizontal-dominant drags scroll
  // the tray. Decided once per gesture at a small movement threshold.
  const gestureModeRef = React.useRef<'orbit' | 'tray' | null>(null);
  const trayScrollStartRef = React.useRef(0);

  React.useEffect(() => {
    const tray = trayRef.current;
    if (!tray) return;

    // Scroll wheel behavior (shifts vertically scrolled wheel horizontally)
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        tray.scrollLeft += e.deltaY;
      }
    };
    tray.addEventListener('wheel', handleWheel, { passive: false });

    // Block native image/text drag-drop ghosting to prevent scroll hijacking
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };
    tray.addEventListener('dragstart', handleDragStart);

    return () => {
      tray.removeEventListener('wheel', handleWheel);
      tray.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  // Campaign support (resolves built-in, custom, and editor-playtest levels)
  const currentLevelId = useGameStore(s => s.currentLevelId);
  const customScenarios = useGameStore(s => s.customScenarios);
  const editorLevelMetadata = useGameStore(s => s.editorLevelMetadata);
  const level = currentLevelId !== null ? (findLevel(currentLevelId, customScenarios, editorLevelMetadata) ?? null) : null;
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

  const currentThemeColor = state.astrophysicistMode
    ? '#00d2d3' // Hot neon cyan for advanced astrophysics!
    : (phase === 'main_sequence'
      ? getMainSequenceColor(starMass)
      : (PHASE_COLORS[phase] || '#38bdf8'));

  // Astrophysicist Mode Custom stats helper
  const getAstroStats = () => {
    const isotopesOrder: ElementSymbol[] = [
      'H', 'D', 'He3', 'He4', 'Be7', 'Be8', 'C12', 'O16', 'Ne20', 
      'Mg24', 'Si28', 'S32', 'Ar36', 'Ca40', 'Ti44', 'Cr48', 'Fe52', 'Ni56', 'Fe56'
    ];
    
    let heaviest: ElementSymbol = 'H';
    for (const sym of isotopesOrder) {
      if ((elementCounts[sym] || 0) > 0) {
        heaviest = sym;
      }
    }

    const tempMap: Partial<Record<ElementSymbol, string>> = {
      H: '15M K',
      D: '20M K',
      He3: '80M K',
      He4: '100M K',
      Be7: '150M K',
      Be8: '180M K',
      C12: '600M K',
      O16: '1.2B K',
      Ne20: '1.5B K',
      Mg24: '1.8B K',
      Si28: '2.2B K',
      S32: '2.5B K',
      Ar36: '2.8B K',
      Ca40: '3.0B K',
      Ti44: '3.2B K',
      Cr48: '3.4B K',
      Fe52: '3.6B K',
      Ni56: '3.8B K',
      Fe56: '4.0B K',
    };

    let stage = 'HYDROGEN BURNING';
    let stageShort = 'HYDROGEN';
    
    if (['H', 'D', 'He3', 'He4'].includes(heaviest)) {
      stage = 'HYDROGEN BURNING';
      stageShort = 'HYDROGEN';
    } else if (['Be7', 'Be8', 'C12', 'O16'].includes(heaviest)) {
      stage = 'HELIUM BURNING';
      stageShort = 'HELIUM';
    } else if (['Ne20', 'Mg24'].includes(heaviest)) {
      stage = 'CARBON & NEON';
      stageShort = 'CARBON';
    } else if (heaviest === 'Fe56') {
      stage = 'STABLE CORE';
      stageShort = 'STABLE';
    } else {
      // Si28, S32, Ar36, Ca40, Ti44, Cr48, Fe52, Ni56
      stage = 'SILICON BURNING';
      stageShort = 'SILICON';
    }

    return {
      heaviest,
      temp: tempMap[heaviest] || '15M K',
      stage,
      stageShort,
    };
  };

  const astroStats = getAstroStats();

  const activeIsotopes: ElementSymbol[] = state.astrophysicistMode
    ? ['H', 'D', 'He3', 'He4', 'Be7', 'Be8', 'C12', 'O16', 'Ne20', 'Mg24', 'Si28', 'S32', 'Ar36', 'Ca40', 'Ti44', 'Cr48', 'Fe52', 'Ni56', 'Fe56']
    : ['H', 'He', 'C', 'O', 'Ne', 'Mg', 'Si', 'Fe'];

  return (
    <div className="absolute inset-0 z-10 pointer-events-none select-none">
      {/* Top HUD Header Bar: 1fr/auto/1fr grid keeps the center info bar screen-centered
          regardless of the left/right widths, only shrinking it if it can't fit. */}
      {/* items-start keeps the menu button, stats pill, and score pills on one
          shared top line — the undo glyph hangs beneath without sinking the row. */}
      <div className={`absolute top-0 left-0 right-0 px-4 pointer-events-none select-none hud-top-container grid grid-cols-[1fr_auto_1fr] items-start gap-2.5 ${zenClass}`}>
        {/* Left Section: Menu Button + quiet single-step Undo beneath it */}
        <div className="pointer-events-auto flex-shrink-0 justify-self-start flex flex-col items-center gap-2.5 w-11">
          <button
            onClick={onOpenMenu}
            className="flex items-center justify-center bg-black/40 backdrop-blur-md w-11 h-11 rounded-full border border-white/10 cursor-pointer hover:bg-white/10 hover:border-white/20 active:scale-[0.92] transition-all text-white text-base select-none shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
            style={{ borderColor: `${currentThemeColor}25` }}
            title="Open Pause Menu"
          >
            ☰
          </button>
          {/* Undo: a bare glyph, centered under the menu — no chrome. Single
              step by design (a mercy, not a search tool); near-invisible once
              spent, back at full presence after the next move. */}
          {state.history.length > 0 && !state.endState && (
            <button
              onClick={() => { state.undo(); }}
              disabled={state.lastActionWasUndo}
              className={`flex items-center justify-center w-9 h-9 text-white transition-all duration-300 select-none animate-fade-in-up ${
                state.lastActionWasUndo
                  ? 'opacity-[0.08] cursor-default'
                  : 'opacity-50 hover:opacity-95 active:scale-[0.88] cursor-pointer'
              }`}
              title="Undo last move"
            >
              <UndoIcon size={16} strokeWidth={2.2} />
            </button>
          )}
        </div>

        {/* Center Section: Core Stats Pill & Campaign objective secondary banner */}
        <div className="justify-self-center flex flex-col items-center justify-center min-w-0 max-w-full pointer-events-auto">
          {/* Main horizontal stats pill */}
          <div
            onClick={() => setShowModal(true)}
            className="relative overflow-hidden flex items-center justify-between glass-pill px-3 md:px-4 h-11 rounded-full cursor-pointer hover:bg-white/5 active:scale-[0.98] transition-all select-none gap-2 md:gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.35)] border border-white/8 min-w-0 max-w-full"
            style={{
              borderColor: `${currentThemeColor}30`,
              boxShadow: `0 0 16px ${currentThemeColor}08, inset 0 0 10px ${currentThemeColor}05`
            }}
            title={state.astrophysicistMode ? 'Open the fusion guide' : 'Open the stellar evolution guide'}
          >
            {/* Desktop Layout (md:flex hidden with fluid gaps/text on medium-to-large viewports) */}
            <div className="hidden md:flex items-center gap-2.5 lg:gap-4">
              {state.astrophysicistMode ? (
                <>
                  <div className="flex items-center gap-1.5 lg:gap-2.5">
                    <span className="flex items-center justify-center" style={{ color: currentThemeColor }}><AtomIcon size={15} /></span>
                    <div>
                      <div className="text-[6.5px] lg:text-[7.5px] tracking-[1px] lg:tracking-[1.5px] text-white/40 leading-none">CORE STAGE</div>
                      <div className="font-semibold tracking-wide text-[9px] lg:text-[10px] leading-tight mt-0.5 whitespace-nowrap">{astroStats.stage}</div>
                    </div>
                  </div>

                  <div className="h-5 w-px bg-white/15" />

                  <div>
                    <div className="text-[6.5px] lg:text-[7.5px] tracking-[1px] lg:tracking-[1.5px] text-white/40 leading-none">CORE TEMP</div>
                    <div className="font-mono text-[11px] lg:text-xs mt-0.5 tabular-nums font-bold whitespace-nowrap" style={{ color: currentThemeColor }}>{astroStats.temp}</div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1.5 lg:gap-2.5">
                  <span className="text-sm lg:text-base flex items-center justify-center translate-y-[-0.5px]" style={{ color: currentThemeColor }}>{PHASE_ICONS[phase]}</span>
                  <div>
                    <div className="text-[6.5px] lg:text-[7.5px] tracking-[1px] lg:tracking-[1.5px] text-white/40 leading-none">{star ? `${star.mass} M☉ · PHASE` : 'PHASE'}</div>
                    <div className="font-semibold tracking-wide text-[9px] lg:text-[10px] leading-tight mt-0.5 whitespace-nowrap">{PHASE_LABELS[phase]}</div>
                  </div>
                </div>
              )}

              <div className="h-5 w-px bg-white/15" />

              {freeFaces !== null ? (
                <div>
                  <div className="text-[6.5px] lg:text-[7.5px] tracking-[1px] lg:tracking-[1.5px] text-white/40 leading-none">SPACE</div>
                  <div className="font-mono text-[11px] lg:text-xs mt-0.5 tabular-nums whitespace-nowrap">
                    <span className="font-bold" style={{ color: currentThemeColor }}>{freeFaces}</span>
                    <span className="text-white/60"> {freeFaces === 1 ? 'face' : 'faces'} free</span>
                  </div>
                </div>
              ) : movesLeft !== null ? (
                <div>
                  <div className="text-[6.5px] lg:text-[7.5px] tracking-[1px] lg:tracking-[1.5px] text-white/40 leading-none">LIFETIME</div>
                  <div className="font-mono text-[11px] lg:text-xs mt-0.5 tabular-nums whitespace-nowrap">
                    <span className="font-bold" style={{ color: currentThemeColor }}>{movesLeft}</span>
                    <span className="text-white/60"> {movesLeft === 1 ? 'move' : 'moves'} left</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-[6.5px] lg:text-[7.5px] tracking-[1px] lg:tracking-[1.5px] text-white/40 leading-none">
                    {level ? 'TURN / PAR' : 'TURN'}
                  </div>
                  <div className="font-mono text-[11px] lg:text-xs mt-0.5 tabular-nums text-white/90 whitespace-nowrap">
                    {turn}
                    {level && (
                      <>
                        {' / '}<span className="text-cyan-400 font-bold">{level.parMoves}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile/Compact Layout (flex md:hidden) */}
            <div className="flex md:hidden items-center gap-1.5 text-[8.5px] font-mono tracking-wider font-semibold uppercase text-white/80 whitespace-nowrap">
              {state.astrophysicistMode ? (
                <>
                  <span className="flex items-center justify-center" style={{ color: currentThemeColor }}><AtomIcon size={11} /></span>
                  <span className="font-bold tracking-widest text-white">{astroStats.stageShort}</span>
                </>
              ) : (
                <>
                  <span className="text-[10px] leading-none flex items-center justify-center translate-y-[-0.5px]" style={{ color: currentThemeColor }}>{PHASE_ICONS[phase]}</span>
                  <span className="font-bold tracking-widest" style={{ color: currentThemeColor }}>
                    {phase === 'main_sequence' ? 'MAIN' : phase === 'red_giant' ? 'GIANT' : phase === 'supergiant' ? 'SUPER' : 'COLLAPSE'}
                  </span>
                </>
              )}
              <span className="opacity-25">•</span>
              {freeFaces !== null ? (
                <span className="text-white"><span className="font-bold" style={{ color: currentThemeColor }}>{freeFaces}</span> FREE</span>
              ) : movesLeft !== null ? (
                <span className="text-white"><span className="font-bold" style={{ color: currentThemeColor }}>{movesLeft}</span> LEFT</span>
              ) : (
                <span className="text-white">
                  T{turn}
                  {level && <>{' '}<span className="text-cyan-400 font-bold">(PAR {level.parMoves})</span></>}
                </span>
              )}
            </div>

            {/* Remaining lifetime (or free space), as a hairline along the bottom of the pill */}
            {(lifetime !== null || freeFaces !== null) && (
              <div className="absolute left-3 right-3 bottom-[3px] h-[2px] rounded-full bg-white/10 overflow-hidden pointer-events-none">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(freeFaces !== null ? freeFaces / state.faces.length : 1 - lifeFraction) * 100}%`,
                    backgroundColor: currentThemeColor,
                  }}
                />
              </div>
            )}
          </div>

          {/* Campaign Objective Floating Secondary Banner */}
          {level && onOpenObjectives && (
            <div
              onClick={onOpenObjectives}
              className="glass-pill px-3 py-1 rounded-full text-[7.5px] font-mono tracking-widest text-cyan-300 font-bold uppercase whitespace-nowrap shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-cyan-500/15 hover:bg-white/10 active:scale-[0.96] transition-all cursor-pointer pointer-events-auto mt-1 flex-shrink-0 animate-fade-in-up"
              title="Show the objective"
            >
              {objectiveLabel(level)}
            </div>
          )}
        </div>

        {/* Right Section: Score and Best pill (open-ended runs only) */}
        {currentLevelId === null ? (
          <div className="pointer-events-auto flex-shrink-0 flex items-center gap-1.5 xs:gap-2 justify-self-end">
            <div
              className="flex flex-col items-center justify-center bg-black/40 backdrop-blur-md px-2.5 xs:px-3 h-11 rounded-2xl border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.3)] font-mono"
              style={{ borderColor: `${currentThemeColor}20` }}
            >
              <div className="text-[6.5px] tracking-[1px] text-white/40 leading-none">SCORE</div>
              <div className="text-[11px] xs:text-[12px] font-bold text-white leading-tight mt-0.5 tabular-nums">
                {state.score % 1 === 0 ? state.score.toString() : state.score.toFixed(1)}
              </div>
            </div>

            <div
              className={`flex flex-col items-center justify-center bg-black/40 backdrop-blur-md px-2.5 xs:px-3 h-11 rounded-2xl border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.3)] font-mono transition-all duration-300 ${state.wasAutoPlayedThisRun ? 'opacity-50' : ''}`}
              style={{ borderColor: state.wasAutoPlayedThisRun ? '#f59e0b40' : `${currentThemeColor}20` }}
              title={state.wasAutoPlayedThisRun ? "High score tracking disabled (Autoplayer used this run)" : "Your best score with this star"}
            >
              <div className={`text-[6.5px] tracking-[1px] leading-none ${state.wasAutoPlayedThisRun ? 'text-amber-400 font-semibold' : 'text-white/40'}`}>BEST</div>
              <div className={`text-[11px] xs:text-[12px] font-bold leading-tight mt-0.5 tabular-nums ${state.wasAutoPlayedThisRun ? 'text-amber-500/70 line-through decoration-amber-500' : 'text-cyan-400'}`}>
                {state.highScore % 1 === 0 ? state.highScore.toString() : state.highScore.toFixed(1)}
              </div>
            </div>
          </div>
        ) : (
          /* Empty placeholder to balance the layout in level modes, keeping the main pill centered! */
          <div className="w-11 h-11 flex-shrink-0 md:block hidden justify-self-end" />
        )}
      </div>

      {/* pointer-events-none here: the strip of empty screen around the tray
          must fall through to the canvas so it stays usable as orbit space
          when the star fills the screen. The panel re-enables its own events. */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 pointer-events-none hud-bottom-container ${zenClass}`}
      >
        <div className="flex flex-col items-center gap-2 xs:gap-3.5 pointer-events-none select-none max-w-[94vw]">
          {/* Pinch-to-zoom hint, floated directly above the instructions line */}
          {showZoomHint && <ZoomTooltip />}

          {/* Dynamic Instructions placed directly above the Elements Tray */}
          <div className="text-[8px] xs:text-[9px] sm:text-[10px] opacity-35 tracking-[2px] xs:tracking-[4px] font-mono uppercase whitespace-nowrap mb-0.5 select-none">
            {state.astrophysicistMode
              ? 'FUSE BEFORE THE SPHERE FILLS'
              : star
                ? (star.ceiling === 'Fe' ? 'FORGE IRON BEFORE TIME RUNS OUT' : 'BUILD A CARBON–OXYGEN CORE')
                : 'DRAG TILES TO FUSE'}
          </div>

          {/* Elements Tray Wrapper Container with Smart Touch Orbiting handlers */}
          <div
            className="glass-panel rounded-[20px] xs:rounded-[22px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center overflow-hidden max-w-full pointer-events-auto border border-white/8"
            style={{
              borderColor: `${currentThemeColor}15`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${currentThemeColor}05`,
              // Without this, mobile browsers steal the gesture for native
              // scrolling (pointercancel) and the tray can neither orbit nor
              // scroll reliably by touch.
              touchAction: 'none'
            }}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest('button')) {
                return;
              }
              try {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              } catch (err) {}

              dragStartRef.current = { x: e.clientX, y: e.clientY };
              gestureModeRef.current = null;
              trayScrollStartRef.current = trayRef.current?.scrollLeft ?? 0;
              hasDispatchedDownRef.current = false;
            }}
            onPointerMove={(e) => {
              if (!dragStartRef.current) return;

              const dx = e.clientX - dragStartRef.current.x;
              const dy = e.clientY - dragStartRef.current.y;

              // Decide the gesture once: up/down swings the star, left/right
              // slides the tray. Same rule in every mode.
              if (gestureModeRef.current === null) {
                if (Math.hypot(dx, dy) < 7) return;
                gestureModeRef.current = Math.abs(dy) >= Math.abs(dx) ? 'orbit' : 'tray';
                if (gestureModeRef.current === 'orbit') {
                  (window as any).isOrbitingFromHUD = true;
                } else {
                  setIsDragging(true);
                }
              }

              if (gestureModeRef.current === 'tray') {
                if (trayRef.current) {
                  trayRef.current.scrollLeft = trayScrollStartRef.current - dx;
                }
                return;
              }

              const canvas = document.querySelector('canvas');
              if (canvas) {
                if (!hasDispatchedDownRef.current) {
                  hasDispatchedDownRef.current = true;
                  const downEvent = new PointerEvent('pointerdown', {
                    bubbles: true,
                    cancelable: true,
                    clientX: dragStartRef.current.x,
                    clientY: dragStartRef.current.y,
                    pointerId: e.pointerId,
                    pointerType: e.pointerType,
                  });
                  canvas.dispatchEvent(downEvent);
                }

                const moveEvent = new PointerEvent('pointermove', {
                  bubbles: true,
                  cancelable: true,
                  clientX: e.clientX,
                  clientY: e.clientY,
                  pointerId: e.pointerId,
                  pointerType: e.pointerType,
                });
                canvas.dispatchEvent(moveEvent);
              }
            }}
            onPointerUp={(e) => {
              try {
                (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
              } catch (err) {}

              if (hasDispatchedDownRef.current) {
                const canvas = document.querySelector('canvas');
                if (canvas) {
                  const upEvent = new PointerEvent('pointerup', {
                    bubbles: true,
                    cancelable: true,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    pointerId: e.pointerId,
                    pointerType: e.pointerType,
                  });
                  canvas.dispatchEvent(upEvent);
                }
              }
              dragStartRef.current = null;
              gestureModeRef.current = null;
              hasDispatchedDownRef.current = false;
              (window as any).isOrbitingFromHUD = false;
              setIsDragging(false);
            }}
            onPointerCancel={(e) => {
              try {
                (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
              } catch (err) {}

              if (hasDispatchedDownRef.current) {
                const canvas = document.querySelector('canvas');
                if (canvas) {
                  const cancelEvent = new PointerEvent('pointercancel', {
                    bubbles: true,
                    cancelable: true,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    pointerId: e.pointerId,
                    pointerType: e.pointerType,
                  });
                  canvas.dispatchEvent(cancelEvent);
                }
              }
              dragStartRef.current = null;
              gestureModeRef.current = null;
              hasDispatchedDownRef.current = false;
              (window as any).isOrbitingFromHUD = false;
              setIsDragging(false);
            }}
          >
            {/* Scrollable Elements List */}
            <div 
              ref={trayRef}
              className="flex items-center gap-1.5 xs:gap-2.5 overflow-x-auto no-scrollbar pl-2.5 xs:pl-3.5 py-2.5 xs:py-3 pr-1.5 xs:pr-2.5 min-w-0"
              style={{
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                touchAction: 'none',
              }}
            >
              {activeIsotopes.map((sym) => {
                const el = ELEMENTS[sym];
                const count = elementCounts[sym] || 0;
                const isUnlocked = count > 0 || (state.astrophysicistMode ? sym === 'H' : ['H', 'He'].includes(sym));
                
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
                  // In a star under 8 M☉ the carbon-burning products are out of reach entirely.
                  const outOfReach = lowMassStar && CARBON_BURNING.includes(sym);
                  return (
                    <div
                      key={sym}
                      className={`relative flex items-center justify-center w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-full border border-dashed border-white/10 bg-black/10 select-none cursor-default flex-shrink-0 ${outOfReach ? 'opacity-15' : 'opacity-30'}`}
                      title={outOfReach ? `Needs a star of ${CARBON_IGNITION_MASS} M☉ or more` : 'Not made yet'}
                    >
                      <span className={`font-mono text-[9px] xs:text-[10px] sm:text-xs text-white/50 font-medium ${outOfReach ? 'line-through' : ''}`}>
                        {sym}
                      </span>
                    </div>
                  );
                }
              })}
            </div>

            {/* Static Divider & Codex Circular shortcut button */}
            <div className="flex items-center gap-1.5 xs:gap-2.5 py-2.5 xs:py-3 pr-2.5 xs:pr-3.5 pl-1.5 xs:pl-2.5 flex-shrink-0 border-l border-white/5 bg-black/20">
              {/* Codex Circular shortcut button */}
              <button
                onClick={onOpenCodex}
                className="relative flex items-center justify-center w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-[1.08] active:scale-[0.95] cursor-pointer flex-shrink-0"
                title={state.astrophysicistMode ? "Open Astrophysicist Codex" : "Open Stellar Codex Journal"}
              >
                <BookIcon size={15} className="text-white/75" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stellar Life Stage / Advanced Fe26 Guide Modal Pop-up Overlay */}
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

            {state.astrophysicistMode ? (
              <>
                {/* Header */}
                <div className="flex flex-col gap-1 border-b border-white/5 pb-4 pr-8">
                  <span className="text-[9px] tracking-[2.5px] text-cyan-400 font-bold uppercase font-mono">Astrophysicist Journal</span>
                  <h2 className="text-lg font-semibold tracking-wide">FUSION GUIDE</h2>
                  <p className="text-xs text-white/50 leading-relaxed font-normal mt-1">
                    Fe26's isotope chain, rule for rule. Every move adds a new tile and only fusion makes room: the run ends when the sphere is full{freeFaces !== null ? ` (${freeFaces} ${freeFaces === 1 ? 'face' : 'faces'} free)` : ''}. Reach iron-56 on the way for a supernova.
                  </p>
                </div>

                <div className="flex flex-col gap-4 text-xs font-normal max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="bg-white/5 border border-white/5 p-3 rounded-2xl">
                    <span className="text-[9px] font-mono font-bold text-cyan-400 block mb-1">UNSTABLE ISOTOPES</span>
                    <p className="text-[11px] leading-relaxed text-white/70">
                      Five isotopes decay if you leave them. The badge on the tile counts the moves left. Nickel-56 is the one you want to decay: it becomes iron-56.
                    </p>
                    <ul className="mt-2 text-[10.5px] text-white/60 space-y-1 font-mono">
                      {(Object.keys(DECAY) as ElementSymbol[]).map(sym => {
                        const d = DECAY[sym]!;
                        return (
                          <li key={sym} className="flex justify-between gap-3">
                            <span>{sym} → {d.to}</span>
                            <span className="text-white/40">{Math.ceil(4 * d.multiplier)}–{Math.ceil(8 * d.multiplier)} moves · {d.points > 0 ? '+' : ''}{d.points}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="bg-white/5 border border-white/5 p-3 rounded-2xl flex flex-col gap-2">
                    <span className="text-[9px] font-mono font-bold text-cyan-400 block">BURNING STAGES</span>
                    <div className="space-y-2 mt-1">
                      <div className="border-l border-[#ff7f50]/40 pl-2.5">
                        <div className="flex justify-between items-baseline"><span className="text-xs font-bold text-[#ff7f50]">1. Hydrogen burning</span><span className="text-[9px] text-white/40">15M K</span></div>
                        <p className="text-[10px] text-white/50 mt-0.5 leading-relaxed">The proton–proton chain: H + H → D, D + H → He3, He3 + He3 → He4.</p>
                      </div>
                      <div className="border-l border-[#fbbf24]/40 pl-2.5">
                        <div className="flex justify-between items-baseline"><span className="text-xs font-bold text-[#fbbf24]">2. Helium burning</span><span className="text-[9px] text-white/40">100M K</span></div>
                        <p className="text-[10px] text-white/50 mt-0.5 leading-relaxed">He4 + He4 makes fleeting Be8; catch it with another He4 for carbon, then oxygen.</p>
                      </div>
                      <div className="border-l border-[#fb7185]/40 pl-2.5">
                        <div className="flex justify-between items-baseline"><span className="text-xs font-bold text-[#fb7185]">3. Carbon and neon burning</span><span className="text-[9px] text-white/40">600M K</span></div>
                        <p className="text-[10px] text-white/50 mt-0.5 leading-relaxed">C12 + C12 → Ne20, and Ne20 + He4 → Mg24. As in Fe26, nothing fuses with Mg24.</p>
                      </div>
                      <div className="border-l border-[#38bdf8]/40 pl-2.5">
                        <div className="flex justify-between items-baseline"><span className="text-xs font-bold text-[#38bdf8]">4. Oxygen and silicon burning</span><span className="text-[9px] text-white/40">2B K</span></div>
                        <p className="text-[10px] text-white/50 mt-0.5 leading-relaxed">O16 + O16 → Si28, then helium captures climb from Si28 all the way to Ni56.</p>
                      </div>
                    </div>
                  </div>

                  <table className="w-full text-left font-mono text-[10.5px] border-collapse text-white/80">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40">
                        <th className="pb-1 text-left">Output</th>
                        <th className="pb-1 text-left">Reactants</th>
                        <th className="pb-1 text-right">Stability</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr><td className="py-1.5 text-cyan-300">D</td><td className="py-1.5">H + H</td><td className="py-1.5 text-right text-emerald-400">Stable</td></tr>
                      <tr><td className="py-1.5 text-cyan-300">He3</td><td className="py-1.5">D + H</td><td className="py-1.5 text-right text-emerald-400">Stable</td></tr>
                      <tr><td className="py-1.5 text-cyan-300">He4</td><td className="py-1.5">He3 + He3</td><td className="py-1.5 text-right text-emerald-400">Stable</td></tr>
                      <tr><td className="py-1.5 text-amber-400">Be7</td><td className="py-1.5">He4 + He3</td><td className="py-1.5 text-right text-amber-400">Unstable</td></tr>
                      <tr><td className="py-1.5 text-amber-400">Be8</td><td className="py-1.5">He4 + He4</td><td className="py-1.5 text-right text-amber-400">Unstable</td></tr>
                      <tr><td className="py-1.5 text-cyan-300">C12</td><td className="py-1.5">Be8 + He4</td><td className="py-1.5 text-right text-emerald-400">Stable</td></tr>
                      <tr><td className="py-1.5 text-cyan-300">O16</td><td className="py-1.5">C12 + He4</td><td className="py-1.5 text-right text-emerald-400">Stable</td></tr>
                      <tr><td className="py-1.5 text-amber-400">Ne20</td><td className="py-1.5">O16 + He4 · C12 + C12</td><td className="py-1.5 text-right text-amber-400">Unstable</td></tr>
                      <tr><td className="py-1.5 text-cyan-300">Mg24</td><td className="py-1.5">Ne20 + He4</td><td className="py-1.5 text-right text-white/45">Dead end</td></tr>
                      <tr><td className="py-1.5 text-cyan-300">Si28</td><td className="py-1.5">O16 + O16</td><td className="py-1.5 text-right text-emerald-400">Stable</td></tr>
                      <tr><td className="py-1.5 text-cyan-300">S32</td><td className="py-1.5">Si28 + He4</td><td className="py-1.5 text-right text-emerald-400">Stable</td></tr>
                      <tr><td className="py-1.5 text-cyan-300">Ar36</td><td className="py-1.5">S32 + He4</td><td className="py-1.5 text-right text-emerald-400">Stable</td></tr>
                      <tr><td className="py-1.5 text-cyan-300">Ca40</td><td className="py-1.5">Ar36 + He4</td><td className="py-1.5 text-right text-emerald-400">Stable</td></tr>
                      <tr><td className="py-1.5 text-cyan-300">Ti44</td><td className="py-1.5">Ca40 + He4</td><td className="py-1.5 text-right text-emerald-400">Stable</td></tr>
                      <tr><td className="py-1.5 text-cyan-300">Cr48</td><td className="py-1.5">Ti44 + He4</td><td className="py-1.5 text-right text-emerald-400">Stable</td></tr>
                      <tr><td className="py-1.5 text-amber-400">Fe52</td><td className="py-1.5">Cr48 + He4</td><td className="py-1.5 text-right text-amber-400">Unstable</td></tr>
                      <tr><td className="py-1.5 text-amber-400">Ni56</td><td className="py-1.5">Fe52 + He4</td><td className="py-1.5 text-right text-amber-400">Unstable</td></tr>
                      <tr><td className="py-1.5 text-purple-400 font-bold">Fe56</td><td className="py-1.5 font-bold">Ni56 decay</td><td className="py-1.5 text-right text-purple-400 font-bold">Immovable</td></tr>
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                {/* Header */}
                <div className="flex flex-col gap-1 border-b border-white/5 pb-4 pr-8">
                  <span className="text-[9px] tracking-[2.5px] text-cyan-400 font-bold uppercase font-mono">Stellar Physics Journal</span>
                  <h2 className="text-lg font-semibold tracking-wide">
                    {star ? `${star.name} · ${star.mass} M☉` : `${starMass.toFixed(1)} M☉ star`}
                  </h2>
                  <p className="text-xs text-white/50 leading-relaxed font-normal mt-1">
                    {star
                      ? `Heavier stars burn hotter and die sooner. This one has ${star.lifetime} moves before its core runs out of fuel${movesLeft !== null ? `, and ${movesLeft} are left` : ''}.`
                      : 'Heavier stars burn hotter and die sooner, and mass decides how they end.'}
                  </p>
                  {star && lifetime !== null && (
                    <div className="bg-white/5 border border-white/5 p-2 rounded-xl text-[11px] text-cyan-300 font-mono mt-1 text-center">
                      Age {formatStarAge(star.mass, lifeFraction)}
                    </div>
                  )}
                </div>

                {/* Timeline stages list */}
                <div className="flex flex-col gap-5 relative pl-5 border-l border-white/10 ml-2 text-sm">
                  {([
                    {
                      key: 'main_sequence', title: '1. Main sequence', active: 'text-cyan-400', dot: 'bg-cyan-400 shadow-[0_0_12px_#22d3ee]', tag: 'text-cyan-400/80',
                      body: 'Hydrogen fuses into helium. The longest, calmest part of a star’s life.',
                      trigger: 'From the start',
                    },
                    {
                      key: 'red_giant', title: '2. Red giant', active: 'text-amber-400', dot: 'bg-amber-400 shadow-[0_0_12px_#fbbf24]', tag: 'text-amber-400/80',
                      body: 'The helium core contracts and ignites: three helium in a triangle make carbon, and carbon plus helium makes oxygen.',
                      trigger: 'Once 8 nuclei are heavier than hydrogen',
                    },
                    {
                      key: 'supergiant', title: '3. Supergiant', active: 'text-red-400', dot: 'bg-red-400 shadow-[0_0_12px_#f87171]', tag: 'text-red-400/80',
                      body: lowMassStar
                        ? `Stars under ${CARBON_IGNITION_MASS} M☉ never get hot enough to burn carbon. This one ends as a carbon–oxygen white dwarf.`
                        : 'Neon, magnesium and silicon burn in shells like an onion. Hydrogen rains twice as fast.',
                      trigger: `Stars of ${CARBON_IGNITION_MASS} M☉ or more, once 4 nuclei are carbon or heavier`,
                    },
                    {
                      key: 'collapse', title: '4. Core collapse', active: 'text-purple-400', dot: 'bg-purple-400 shadow-[0_0_12px_#c084fc]', tag: 'text-purple-400/80',
                      body: 'Silicon fuses into iron, which cannot release energy. The core collapses in a supernova.',
                      trigger: 'Forge iron (silicon + silicon)',
                    },
                  ] as const).map(stage => {
                    const isActive = phase === stage.key;
                    const unreachable = lowMassStar && (stage.key === 'supergiant' || stage.key === 'collapse');
                    return (
                      <div key={stage.key} className={`relative ${isActive ? `${stage.active} font-bold` : 'text-white/60'} ${unreachable ? 'opacity-45' : ''}`}>
                        <div className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border border-[#0f0f15] transition-all ${isActive ? `${stage.dot} animate-pulse` : 'bg-white/20'}`} />
                        <div className="text-base font-semibold mb-1">{stage.title}</div>
                        <p className="text-xs text-white/45 leading-relaxed font-normal">
                          {stage.body}
                          <span className={`block mt-1 text-[10px] font-mono ${stage.tag}`}>{stage.trigger}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Footer Close Button */}
            <button
              onClick={handleCloseGuide}
              className="mt-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-center active:scale-[0.985]"
            >
              {state.astrophysicistMode ? 'Close Fusion Table' : 'Back to Fusion Board'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
