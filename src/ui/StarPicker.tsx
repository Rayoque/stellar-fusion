// src/ui/StarPicker.tsx
// Stellar Life's front door: choose which star to burn. Heavier stars unlock as
// the player witnesses each kind of stellar death.
import React from 'react';
import { STAR_CLASSES, isStarUnlocked, getEndingsSeen, bestScoreKey, type StarClass } from '../game/stars';
import { peekSavedLife } from '../game/state';
import type { StarClassId, EndState } from '../game/types';
import { LockIcon } from './icons';
import { ELEMENTS } from '../game/elements';

interface StarPickerProps {
  onPick: (id: StarClassId) => void;
  onResume: () => void;
  onClose: () => void;
}

const ACCENT: Record<StarClassId, string> = {
  sunlike: '#fbbf24',
  massive: '#93c5fd',
  very_massive: '#a5b4fc',
};

const FATE_LABEL: Partial<Record<EndState, string>> = {
  white_dwarf: 'white dwarf',
  neutron_star: 'neutron star',
  black_hole: 'black hole',
};

function readBest(id: StarClassId): number {
  try {
    return parseInt(localStorage.getItem(bestScoreKey(id)) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function StarPicker({ onPick, onResume, onClose }: StarPickerProps) {
  const seen = getEndingsSeen();
  const saved = peekSavedLife();

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex justify-center items-center p-4 animate-fade-in-up select-none"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-[#0f0f15]/95 border border-white/10 rounded-[28px] max-w-md w-full max-h-[90dvh] overflow-y-auto custom-scrollbar p-6 sm:p-7 text-white shadow-[0_16px_48px_rgba(0,0,0,0.7)] relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white hover:bg-white/5 w-8 h-8 rounded-full border border-white/5 flex items-center justify-center transition-all active:scale-95 text-lg cursor-pointer"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="text-xl font-light tracking-[0.12em] uppercase pr-10">Choose a star</h2>
        <p className="text-xs text-white/50 font-light leading-relaxed mt-1.5 mb-5 pr-6">
          Mass decides how long a star lives and how it dies.
        </p>

        {saved && (
          <button
            onClick={onResume}
            className="w-full mb-4 px-4 py-3 rounded-2xl bg-white text-black text-left flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>
              <span className="block text-[9px] font-mono tracking-[2px] uppercase text-black/50">Resume</span>
              <span className="block text-sm font-semibold mt-0.5">{saved.starClass.name}</span>
            </span>
            <span className="text-xs font-mono font-bold">{saved.movesLeft} moves left</span>
          </button>
        )}

        <div className="flex flex-col gap-3">
          {STAR_CLASSES.map((star: StarClass) => {
            const unlocked = isStarUnlocked(star, seen);
            const best = unlocked ? readBest(star.id) : 0;
            const accent = ACCENT[star.id];
            return (
              <button
                key={star.id}
                disabled={!unlocked}
                onClick={() => onPick(star.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  unlocked
                    ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] active:scale-[0.98] cursor-pointer'
                    : 'bg-black/20 border-dashed border-white/10 opacity-55 cursor-default'
                }`}
                style={unlocked ? { borderColor: `${accent}40` } : undefined}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={unlocked
                      ? { background: `radial-gradient(circle at 35% 35%, #ffffff, ${accent} 45%, ${accent}33 75%)`, boxShadow: `0 0 18px ${accent}55` }
                      : { background: 'rgba(255,255,255,0.05)' }}
                  >
                    {!unlocked && <LockIcon size={14} className="text-white/50" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold tracking-wide">{star.name}</span>
                      <span className="text-[11px] font-mono text-white/60">{star.mass} M☉</span>
                    </span>
                    <span className="block text-[11px] text-white/55 font-light leading-snug mt-0.5">
                      {unlocked ? star.blurb : `Witness a ${FATE_LABEL[star.unlockAfter!]} to unlock.`}
                    </span>
                  </span>
                </div>
                {unlocked && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pl-12 text-[10px] font-mono uppercase tracking-wide text-white/45">
                    <span className="whitespace-nowrap"><span className="text-white/80 font-bold">{star.lifetime}</span> moves</span>
                    <span className="whitespace-nowrap">to <span className="text-white/80 font-bold">{ELEMENTS[star.ceiling].displayName.toLowerCase()}</span></span>
                    {best > 0 && <span className="whitespace-nowrap">best <span className="font-bold" style={{ color: accent }}>{best}</span></span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
