// src/ui/EndScreen.tsx
import React from 'react';
import type { EndState, ElementSymbol } from '../game/types';
import { ELEMENTS } from '../game/elements';
import { useGameStore } from '../game/state';
import { getStarClass } from '../game/stars';
import { UndoIcon } from './icons';

interface EndScreenProps {
  endState: EndState;
  starMass: number;
  elementCounts: Record<ElementSymbol, number>;
  score: number;
  highScore: number;
  astrophysicistMode: boolean;
  onPlayAgain: () => void;
  onChooseStar: () => void;
  onMainMenu: () => void;
}

const END_TITLES: Record<EndState, string> = {
  white_dwarf: 'White Dwarf',
  neutron_star: 'Neutron Star',
  black_hole: 'Black Hole',
  failed_collapse: 'Failed Collapse',
  core_full: 'Core Full',
  jammed: 'Jammed',
};

const END_DESCRIPTIONS: Record<EndState, string> = {
  white_dwarf: 'The star shed its outer layers. A dense carbon–oxygen core remains, cooling for billions of years.',
  neutron_star: 'The core collapsed and rebounded in a supernova. What is left is a city-sized ball of neutrons.',
  black_hole: 'The core collapsed and nothing could stop it. Gravity won.',
  failed_collapse: 'The core collapsed without a proper explosion.',
  core_full: 'Every face of the core filled up before it completed iron-56.',
  jammed: 'No move is left: every tile is blocked and nothing can fuse.',
};

// Where a star like this one ends up in us. Kept strictly true: carbon comes
// largely from low-mass stars, iron partly from core-collapse supernovae, and
// oxygen mostly from massive stars.
const EPILOGUES: Partial<Record<EndState, string>> = {
  white_dwarf: 'Much of the carbon in your body was made by stars like this one.',
  neutron_star: 'Some of the iron in your blood was forged in a star like this.',
  black_hole: 'Most of the oxygen you breathe was made in stars this massive.',
};

export function EndScreen({ endState, starMass, elementCounts, score, highScore, astrophysicistMode, onPlayAgain, onChooseStar, onMainMenu }: EndScreenProps) {
  const undo = useGameStore(s => s.undo);
  const canUndo = useGameStore(s => s.history.length > 0 && !s.lastActionWasUndo);
  const wasAutoPlayed = useGameStore(s => s.wasAutoPlayedThisRun);
  const endReason = useGameStore(s => s.endReason);
  const supernovaBonus = useGameStore(s => s.supernovaBonus);
  const turn = useGameStore(s => s.turn);
  const lifetime = useGameStore(s => s.lifetime);
  const star = getStarClass(useGameStore(s => s.starClass));
  const unlockedStar = getStarClass(useGameStore(s => s.unlockedStarThisRun));
  const isNewBest = !wasAutoPlayed && score >= highScore && score > 0;

  const astroIronCore = astrophysicistMode && endState === 'neutron_star';
  const title = astroIronCore ? 'Iron Core Collapse' : END_TITLES[endState];
  const description = astroIronCore
    ? 'Your iron-56 core could burn no further. It collapsed, as the core of every star massive enough to build one does.'
    : END_DESCRIPTIONS[endState];

  let result: string | null = null;
  if (endReason === 'iron' && lifetime !== null) {
    const spare = lifetime - turn;
    result = `You forged iron with ${spare} ${spare === 1 ? 'move' : 'moves'} to spare. Supernova bonus +${supernovaBonus}.`;
  } else if (endReason === 'lifetime' && star && star.ceiling === 'Fe') {
    result = 'Time ran out before you forged iron. No supernova bonus.';
  } else if (astroIronCore) {
    result = 'You completed an iron-56 core before the sphere filled.';
  }

  const epilogue = EPILOGUES[endState];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div
        className="border border-white/10 rounded-[32px] p-7 sm:p-10 max-w-md w-full max-h-[92dvh] overflow-y-auto custom-scrollbar text-center shadow-[0_16px_48px_rgba(0,0,0,0.65)] relative animate-fade-in-up isolate"
        style={{
          background: 'radial-gradient(circle at 0% 0%, rgba(6, 182, 212, 0.08), transparent 45%), radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.08), transparent 45%), rgba(15, 15, 19, 0.95)',
        }}
      >
        <div className="relative z-10">
          <div className="uppercase tracking-[4px] text-[8px] sm:text-[9px] text-white/35 mb-2 font-mono">
            {astrophysicistMode ? 'Core Result' : star ? star.name : 'Stellar End State'}
          </div>

          <h1 className="text-3xl sm:text-4xl font-light tracking-wide mb-3 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
            {title}
          </h1>

          <p className="text-white/55 mb-4 text-xs sm:text-sm leading-relaxed max-w-[300px] mx-auto font-light">
            {description}
          </p>

          {result && (
            <p className="text-cyan-300/90 mb-4 text-[11px] sm:text-xs leading-relaxed max-w-[300px] mx-auto font-mono">
              {result}
            </p>
          )}

          {epilogue && (
            <p className="text-white/80 mb-6 text-sm leading-relaxed max-w-[300px] mx-auto font-light italic">
              {epilogue}
            </p>
          )}

          {unlockedStar && (
            <div className="mb-6 mx-auto max-w-[300px] px-4 py-3 rounded-2xl border border-amber-300/25 bg-amber-300/5 text-amber-200 text-xs">
              New star unlocked: <span className="font-semibold">{unlockedStar.name}</span> · {unlockedStar.mass} M☉
            </div>
          )}

          {/* Score summary */}
          <div className="flex items-stretch gap-3 max-w-[300px] mx-auto mb-3">
            <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl py-3">
              <div className="text-[8px] tracking-[2px] text-white/35 uppercase font-mono">Score</div>
              <div className="text-xl font-bold font-mono tabular-nums text-white/90 mt-0.5">{score.toLocaleString()}</div>
            </div>
            <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl py-3">
              <div className="text-[8px] tracking-[2px] text-white/35 uppercase font-mono">Best</div>
              <div className={`text-xl font-bold font-mono tabular-nums mt-0.5 ${isNewBest ? 'text-cyan-300' : 'text-white/90'}`}>{highScore.toLocaleString()}</div>
            </div>
          </div>
          {isNewBest && (
            <div className="text-[9px] text-cyan-400 font-mono tracking-[2px] uppercase mb-3 select-none">New personal best</div>
          )}

          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 max-w-[300px] mx-auto mb-6">
            {Object.entries(elementCounts).filter(([, c]) => c > 0).map(([sym, count]) => (
              <span key={sym} className="flex items-center gap-1.5 text-[11px] font-mono text-white/70">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ELEMENTS[sym as ElementSymbol].color }} />
                {sym} <span className="text-white/90 font-bold">{count}</span>
              </span>
            ))}
          </div>

          <div className="text-[9px] text-white/30 mb-6 font-mono tracking-wider uppercase">
            {astrophysicistMode ? `${turn} moves` : `${starMass.toFixed(starMass % 1 === 0 ? 0 : 1)} M☉ · ${turn} moves`}
          </div>

          <div className="flex flex-col gap-3 max-w-[300px] mx-auto">
            {/* Mercy take-back on a jam: undoing restores the pre-jam snapshot
                (endState null), which dismisses this screen automatically. */}
            {endState === 'jammed' && canUndo && (
              <button
                onClick={undo}
                className="w-full py-3.5 bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 rounded-full font-semibold tracking-[2px] transition-all active:scale-[0.97] text-xs uppercase cursor-pointer flex items-center justify-center gap-2"
              >
                <UndoIcon size={13} strokeWidth={2.5} />
                Take back last move
              </button>
            )}

            {astrophysicistMode ? (
              <button
                onClick={onPlayAgain}
                className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-full font-bold tracking-[2px] transition-all active:scale-[0.97] text-xs uppercase shadow-[0_4px_16px_rgba(6,182,212,0.25)] cursor-pointer"
              >
                Fuse another core
              </button>
            ) : (
              <>
                <button
                  onClick={onChooseStar}
                  className="w-full py-3.5 bg-white text-black hover:bg-white/95 rounded-full font-bold tracking-[2px] transition-all active:scale-[0.97] text-xs uppercase shadow-[0_4px_16px_rgba(255,255,255,0.12)] cursor-pointer"
                >
                  Choose a star
                </button>
                <button
                  onClick={onPlayAgain}
                  className="w-full py-3.5 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-full font-semibold tracking-[2px] transition-all active:scale-[0.97] text-xs uppercase cursor-pointer"
                >
                  Burn this star again
                </button>
              </>
            )}

            <button
              onClick={onMainMenu}
              className="w-full py-3.5 bg-transparent border border-white/10 text-white/70 hover:bg-white/5 hover:text-white rounded-full font-semibold tracking-[2px] transition-all active:scale-[0.97] text-xs uppercase cursor-pointer"
            >
              Game menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
