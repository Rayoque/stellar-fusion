// src/ui/CampaignObjectiveOverlay.tsx
import React from 'react';
import { findLevel, formatScenarioNumber } from '../game/levels';
import { ELEMENTS } from '../game/elements';
import { useGameStore } from '../game/state';
import type { LevelObjective } from '../game/types';

interface CampaignObjectiveOverlayProps {
  levelId: number;
  onStart: () => void;
}

export function objectiveText(obj: LevelObjective): string {
  const name = obj.element ? (ELEMENTS[obj.element]?.displayName ?? obj.element).toLowerCase() : '';
  switch (obj.type) {
    case 'has_element': return (obj.count ?? 1) > 1 ? `Make ${obj.count} ${name}.` : `Make ${name}.`;
    case 'has_element_on_pentagon': return `Get ${name} onto a pentagon.`;
    case 'has_element_count': return `Hold ${obj.count} ${name} at once.`;
    case 'has_all_elements': return 'Hold all 8 elements at once: H, He, C, O, Ne, Mg, Si and Fe.';
    default: return '';
  }
}

export function CampaignObjectiveOverlay({ levelId, onStart }: CampaignObjectiveOverlayProps) {
  const customScenarios = useGameStore(s => s.customScenarios);
  const editorLevelMetadata = useGameStore(s => s.editorLevelMetadata);
  const level = findLevel(levelId, customScenarios, editorLevelMetadata);
  const [showHint, setShowHint] = React.useState(false);
  if (!level) return null;

  const hints = level.objectives.map(o => o.hint).filter(Boolean);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm select-none pointer-events-auto animate-fade-in p-4"
      onClick={onStart}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border border-cyan-500/20 rounded-[32px] p-7 sm:p-9 max-w-md w-full text-center shadow-[0_16px_48px_rgba(0,0,0,0.65)] relative overflow-hidden animate-fade-in-up isolate"
        style={{
          background: 'radial-gradient(circle at 0% 0%, rgba(6, 182, 212, 0.08), transparent 50%), radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.08), transparent 50%), rgba(15, 15, 19, 0.94)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.65), 0 0 24px rgba(6, 182, 212, 0.08)',
        }}
      >
        <div className="relative z-10">
          <div className="uppercase tracking-[4.5px] text-[8.5px] sm:text-[9.5px] text-cyan-400 mb-2.5 font-mono font-bold">
            Scenario {formatScenarioNumber(level.id)}
          </div>

          <h1 className="text-2xl sm:text-3xl font-light tracking-wide mb-3 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 uppercase">
            {level.title}
          </h1>

          <p className="text-white/55 mb-5 text-xs sm:text-[13px] leading-relaxed mx-auto font-light max-w-[320px]">
            {level.description}
          </p>

          <div className="bg-black/45 border border-cyan-500/10 rounded-2xl p-4 mb-6 text-left">
            <ul className="space-y-1.5">
              {level.objectives.map((obj, index) => (
                <li key={index} className="text-sm text-white/85 font-light leading-relaxed">
                  {objectiveText(obj)}
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
              <span className="text-white/40">{level.starMass.toFixed(1)} M☉</span>
              <span className="text-cyan-300">Par {level.parMoves}</span>
              <span className="text-white/40">Limit {level.maxTurns}</span>
            </div>
            {hints.length > 0 && (
              showHint ? (
                <p className="mt-3 text-[11px] text-white/55 leading-relaxed font-light italic">{hints.join(' ')}</p>
              ) : (
                <button
                  onClick={() => setShowHint(true)}
                  className="mt-3 text-[10px] font-mono uppercase tracking-wider text-cyan-400/70 hover:text-cyan-300 cursor-pointer"
                >
                  Show hint
                </button>
              )
            )}
          </div>

          <button
            onClick={onStart}
            className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black rounded-full font-bold tracking-[2.5px] transition-all active:scale-[0.97] text-xs uppercase shadow-[0_4px_20px_rgba(6,182,212,0.25)] cursor-pointer"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
