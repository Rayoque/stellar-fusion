// src/ui/CampaignStatusOverlay.tsx
import React from 'react';
import { findLevel, formatScenarioNumber } from '../game/levels';
import { useGameStore } from '../game/state';

interface CampaignStatusOverlayProps {
  levelId: number;
  status: 'win' | 'fail';
  onNextLevel?: () => void;
  onRetry: () => void;
  onBackToCampaign: () => void;
}

export function CampaignStatusOverlay({ levelId, status, onNextLevel, onRetry, onBackToCampaign }: CampaignStatusOverlayProps) {
  const customScenarios = useGameStore(s => s.customScenarios);
  const editorLevelMetadata = useGameStore(s => s.editorLevelMetadata);
  const turn = useGameStore(s => s.turn);
  const endState = useGameStore(s => s.endState);
  const level = findLevel(levelId, customScenarios, editorLevelMetadata);
  if (!level) return null;

  const isWin = status === 'win';
  const par = level.parMoves;
  const madePar = isWin && turn <= par;

  let headline: string;
  let detail: string;
  if (isWin) {
    headline = `Solved in ${turn} ${turn === 1 ? 'move' : 'moves'}`;
    detail = madePar
      ? `That is par: no solution is shorter.`
      : `Par is ${par}. There is a shorter way.`;
  } else {
    headline = endState === 'jammed' ? 'No move left' : endState ? 'The core collapsed' : 'Out of moves';
    detail = `Par is ${par}. Undo is free to try, and every level has a solution.`;
  }

  const accentColor = isWin ? '#34d399' : '#f87171';
  const shadowGlow = isWin ? 'rgba(52, 211, 153, 0.12)' : 'rgba(248, 113, 113, 0.12)';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md select-none pointer-events-auto p-4">
      <div
        className="border border-white/10 rounded-[32px] p-8 sm:p-10 max-w-md w-full text-center shadow-[0_16px_48px_rgba(0,0,0,0.65)] relative overflow-hidden animate-fade-in-up isolate"
        style={{
          borderColor: isWin ? 'rgba(52, 211, 153, 0.2)' : 'rgba(248, 113, 113, 0.2)',
          boxShadow: `0 16px 48px rgba(0,0,0,0.65), 0 0 24px ${shadowGlow}`,
          background: `radial-gradient(circle at 0% 0%, ${isWin ? 'rgba(52, 211, 153, 0.06)' : 'rgba(248, 113, 113, 0.06)'}, transparent 45%), radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.06), transparent 45%), rgba(15, 15, 19, 0.95)`,
        }}
      >
        <div className="relative z-10">
          <div
            className="uppercase tracking-[4px] text-[8.5px] sm:text-[9.5px] mb-2 font-mono font-bold"
            style={{ color: accentColor }}
          >
            Scenario {formatScenarioNumber(levelId)} · {isWin ? 'Complete' : 'Failed'}
          </div>

          <h1 className="text-2xl sm:text-3xl font-light tracking-wide mb-2 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
            {level.title}
          </h1>

          <p className="text-white/80 text-sm font-light mb-1">{headline}</p>
          <p className={`mb-8 text-xs leading-relaxed max-w-[280px] sm:max-w-sm mx-auto font-mono ${madePar ? 'text-cyan-300' : 'text-white/45'}`}>
            {detail}
          </p>

          <div className="flex flex-col gap-3">
            {isWin ? (
              onNextLevel ? (
                <button
                  onClick={onNextLevel}
                  className="w-full py-3.5 bg-white text-black hover:bg-white/95 rounded-full font-bold tracking-[2px] transition-all active:scale-[0.97] text-xs uppercase shadow-[0_4px_16px_rgba(255,255,255,0.12)] cursor-pointer"
                >
                  NEXT SCENARIO
                </button>
              ) : (
                <button
                  onClick={onBackToCampaign}
                  className="w-full py-3.5 bg-emerald-500 text-black hover:bg-emerald-400 rounded-full font-bold tracking-[2px] transition-all active:scale-[0.97] text-xs uppercase shadow-[0_4px_16px_rgba(52,211,153,0.15)] cursor-pointer"
                >
                  CAMPAIGN COMPLETED
                </button>
              )
            ) : (
              <button
                onClick={onRetry}
                className="w-full py-3.5 bg-white text-black hover:bg-white/95 rounded-full font-bold tracking-[2px] transition-all active:scale-[0.97] text-xs uppercase shadow-[0_4px_16px_rgba(255,255,255,0.12)] cursor-pointer"
              >
                RETRY SCENARIO
              </button>
            )}

            {isWin && !madePar && (
              <button
                onClick={onRetry}
                className="w-full py-3 bg-white/5 border border-cyan-500/20 text-cyan-300 rounded-full font-semibold tracking-[1.5px] hover:bg-white/10 active:scale-[0.97] transition-all text-xs uppercase cursor-pointer"
              >
                TRY FOR PAR
              </button>
            )}

            <button
              onClick={onBackToCampaign}
              className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-full font-semibold tracking-[1.5px] hover:bg-white/10 active:scale-[0.97] transition-all flex items-center justify-center gap-2 text-xs uppercase cursor-pointer"
            >
              BACK TO CHART
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
