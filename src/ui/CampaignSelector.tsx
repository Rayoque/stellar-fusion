// src/ui/CampaignSelector.tsx
import React from 'react';
import { LEVELS, type Level } from '../game/levels';
import { useGameStore } from '../game/state';

interface CampaignSelectorProps {
  onClose: () => void;
  onSelectLevel: (levelId: number) => void;
}

export function CampaignSelector({ onClose, onSelectLevel }: CampaignSelectorProps) {
  const completedLevels = useGameStore(s => s.completedLevels);
  const [selectedLevelId, setSelectedLevelId] = React.useState<number>(1);

  const selectedLevel = LEVELS.find(l => l.id === selectedLevelId) || LEVELS[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex justify-center items-center p-4 animate-fade-in-up select-none pointer-events-auto">
      {/* Modal Container */}
      <div className="bg-[#0f0f15]/95 border border-white/10 p-6 sm:p-8 rounded-[32px] max-w-3xl w-full max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col gap-6 text-white shadow-[0_16px_48px_rgba(0,0,0,0.7)] relative isolate">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white hover:bg-white/5 w-8 h-8 rounded-full border border-white/5 flex items-center justify-center transition-all active:scale-95 text-lg cursor-pointer z-10"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex flex-col gap-1 border-b border-white/5 pb-4 pr-8">
          <span className="text-[9px] tracking-[3px] text-cyan-400 font-bold uppercase font-mono">Stellar Ignition Map</span>
          <h2 className="text-xl font-light tracking-[0.12em] uppercase">STELLAR CAMPAIGN</h2>
          <p className="text-xs text-white/55 font-light leading-relaxed">
            Progress through curated cosmic puzzle scenarios. Achieve specific nuclear fusion milestones inspired by famous logic puzzle designers.
          </p>
        </div>

        {/* Content Body: Left Level Map grid, Right level details */}
        <div className="flex flex-col md:flex-row gap-6 flex-1 overflow-hidden min-h-0">
          
          {/* Left Panel: Level selection scrollable grid */}
          <div className="h-[130px] md:h-auto flex-shrink-0 md:flex-1 md:max-w-[320px] overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2">
            <span className="text-[8px] tracking-[2px] text-white/35 font-mono uppercase mb-1 block">SCENARIO LIST</span>
            
            {LEVELS.map(level => {
              const isCompleted = completedLevels.includes(level.id);
              const isUnlocked = level.id === 1 || completedLevels.includes(level.id - 1);
              const isSelected = selectedLevelId === level.id;

              if (isUnlocked) {
                return (
                  <button
                    key={level.id}
                    onClick={() => setSelectedLevelId(level.id)}
                    className={`w-full py-2.5 px-4 rounded-2xl border transition-all text-left flex justify-between items-center active:scale-[0.98] cursor-pointer ${
                      isSelected
                        ? 'bg-white/10 border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.25)]'
                        : 'bg-black/35 border-white/5 hover:bg-white/5 hover:border-white/12'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-mono tracking-widest text-cyan-400 uppercase leading-none font-bold">
                        Scenario {level.id}
                      </span>
                      <span className="text-xs font-semibold tracking-wide text-white mt-0.5">
                        {level.title}
                      </span>
                    </div>

                    {isCompleted ? (
                      <span className="text-xs text-emerald-400 font-bold tracking-wide flex items-center gap-1 select-none">
                        ✓
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee] pointer-events-none" />
                    )}
                  </button>
                );
              } else {
                return (
                  <div
                    key={level.id}
                    className="w-full py-2.5 px-4 rounded-2xl border border-dashed border-white/5 bg-black/10 flex justify-between items-center opacity-30 select-none cursor-default"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-mono tracking-widest text-white/40 uppercase leading-none">
                        Scenario {level.id}
                      </span>
                      <span className="text-xs font-medium text-white/50 mt-0.5 italic">
                        Locked Star
                      </span>
                    </div>
                    <span className="text-xs text-white/30">🔒</span>
                  </div>
                );
              }
            })}
          </div>

          {/* Right Panel: Selected Level conditions & Launch Button */}
          <div className="flex-1 bg-white/3 border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden">
            {/* Scrollable details container */}
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-4">
              {/* Scenario details */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950/20 border border-cyan-500/15 px-2.5 py-0.5 rounded-full uppercase leading-none">
                    Scenario {selectedLevel.id}
                  </span>
                  <span className="text-[9px] font-mono font-medium text-white/40 tracking-wider leading-none uppercase">
                    {selectedLevel.author}
                  </span>
                </div>
                <h3 className="text-base font-semibold tracking-wide text-white/95 mt-1">
                  {selectedLevel.title}
                </h3>
              </div>

              <p className="text-xs text-white/55 leading-relaxed font-light border-t border-white/5 pt-4">
                {selectedLevel.description}
              </p>

              {/* Conditions Card */}
              <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-4 text-xs font-mono select-none">
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex flex-col gap-1">
                  <span className="text-[7.5px] text-white/40 tracking-wider font-semibold uppercase">Stellar Mass</span>
                  <span className="font-bold text-white/90">{selectedLevel.starMass.toFixed(1)} M☉</span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex flex-col gap-1">
                  <span className="text-[7.5px] text-white/40 tracking-wider font-semibold uppercase">Turn Limit</span>
                  <span className="font-bold text-white/90">{selectedLevel.maxTurns} slides</span>
                </div>
              </div>

              {/* Objectives lists */}
              <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
                <span className="text-[8px] tracking-[2px] text-white/35 font-mono uppercase mb-0.5">Scenario Objectives</span>
                {selectedLevel.objectives.map((obj, i) => {
                  let text = "";
                  if (obj.type === 'has_element') {
                    text = `Fuse and synthesize a stable '${obj.element}' tile.`;
                  } else if (obj.type === 'has_element_on_pentagon') {
                    text = `Fuse a '${obj.element}' tile on one of the 12 pentagon faces (CNO catalyst).`;
                  } else if (obj.type === 'has_element_count') {
                    text = `Possess at least ${obj.count} '${obj.element}' tiles on the board simultaneously.`;
                  } else if (obj.type === 'has_all_elements') {
                    text = `Reach complete equilibrium: possess all 8 stable elements on the board simultaneously.`;
                  }
                  return (
                    <div key={i} className="flex gap-2 items-start text-xs font-light text-cyan-300">
                      <span className="text-[10px] leading-none mt-0.5">✧</span>
                      <span className="leading-relaxed">{text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Docked Launch Button at bottom (not scrollable) */}
            <div className="flex-shrink-0 border-t border-white/5 mt-4 pt-4">
              <button
                onClick={() => onSelectLevel(selectedLevel.id)}
                className="w-full py-3.5 bg-white hover:bg-white/95 text-black rounded-full font-bold tracking-[2px] transition-all active:scale-[0.98] text-xs uppercase shadow-[0_4px_16px_rgba(255,255,255,0.12)] cursor-pointer"
              >
                LAUNCH IGNITION
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
