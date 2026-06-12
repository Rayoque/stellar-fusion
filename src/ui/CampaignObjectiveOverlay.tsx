// src/ui/CampaignObjectiveOverlay.tsx
import React from 'react';
import { findLevel, formatScenarioNumber } from '../game/levels';
import { ELEMENTS } from '../game/elements';
import { useGameStore } from '../game/state';

interface CampaignObjectiveOverlayProps {
  levelId: number;
  onStart: () => void;
}

export function CampaignObjectiveOverlay({ levelId, onStart }: CampaignObjectiveOverlayProps) {
  const customScenarios = useGameStore(s => s.customScenarios);
  const editorLevelMetadata = useGameStore(s => s.editorLevelMetadata);
  const level = findLevel(levelId, customScenarios, editorLevelMetadata);
  if (!level) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm select-none pointer-events-auto animate-fade-in"
      onClick={onStart}
    >
      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="border border-cyan-500/20 rounded-[32px] p-8 sm:p-10 max-w-md w-full mx-4 text-center shadow-[0_16px_48px_rgba(0,0,0,0.65)] relative overflow-hidden animate-fade-in-up isolate"
        style={{ 
          background: 'radial-gradient(circle at 0% 0%, rgba(6, 182, 212, 0.08), transparent 50%), radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.08), transparent 50%), rgba(15, 15, 19, 0.94)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.65), 0 0 24px rgba(6, 182, 212, 0.08)',
        }}
      >
        <div className="relative z-10">
          <div className="uppercase tracking-[4.5px] text-[8.5px] sm:text-[9.5px] text-cyan-400 mb-2.5 font-mono font-bold">
            ✦ Scenario {formatScenarioNumber(level.id)} • Objective ✦
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-light tracking-wide mb-3 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 uppercase">
            {level.title}
          </h1>
          
          <p className="text-white/50 mb-6 text-xs sm:text-[13px] leading-relaxed mx-auto font-light">
            {level.description}
          </p>

          {/* Objectives Box */}
          <div className="bg-black/45 border border-cyan-500/10 rounded-2xl p-5 mb-8 text-left">
            <span className="text-[9px] font-mono font-bold text-cyan-400 tracking-widest block mb-2 uppercase">MISSION OBJECTIVES:</span>
            <ul className="space-y-3">
              {level.objectives.map((obj, index) => {
                let text = '';
                const elName = obj.element ? (ELEMENTS[obj.element]?.displayName || obj.element) : '';
                
                if (obj.type === 'has_element') {
                  text = `Synthesize and possess a ${elName} (${obj.element}) core tile.`;
                } else if (obj.type === 'has_element_on_pentagon') {
                  text = `Fuse a ${elName} (${obj.element}) tile on one of the 12 pentagon nucleation catalyst sites.`;
                } else if (obj.type === 'has_element_count') {
                  text = `Possess at least ${obj.count} ${elName} (${obj.element}) tiles on the board simultaneously.`;
                } else if (obj.type === 'has_all_elements') {
                  text = `Achieve complete cosmic equilibrium: possess all 8 stable elements on the board simultaneously.`;
                }

                return (
                  <li key={index} className="flex gap-2.5 items-start text-xs text-white/75 font-light leading-relaxed">
                    <span className="text-cyan-400 text-sm leading-none select-none">⚡</span>
                    <div>
                      {text}
                      {obj.hint && (
                        <p className="text-[10px] text-white/35 leading-normal mt-1.5 font-light italic">
                          {obj.hint}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            
            {/* Turns Limit Badge */}
            <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center justify-between">
              <span className="text-[9px] font-mono text-white/30 tracking-wider uppercase">FUSION LIFESPAN:</span>
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold font-mono text-cyan-400 tracking-wider">
                MAX {level.maxTurns} TURNS
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={onStart}
              className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black rounded-full font-bold tracking-[2.5px] transition-all active:scale-[0.97] text-xs uppercase shadow-[0_4px_20px_rgba(6,182,212,0.25)] cursor-pointer"
            >
              IGNITE CORE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
