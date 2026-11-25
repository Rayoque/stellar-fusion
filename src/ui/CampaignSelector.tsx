// src/ui/CampaignSelector.tsx
import React from 'react';
import { LEVELS, findLevel, formatScenarioNumber } from '../game/levels';
import { useGameStore } from '../game/state';
import { LockIcon } from './icons';

interface CampaignSelectorProps {
  onClose: () => void;
  onSelectLevel: (levelId: number) => void;
}

export function CampaignSelector({ onClose, onSelectLevel }: CampaignSelectorProps) {
  const completedLevels = useGameStore(s => s.completedLevels);
  const perfectLevels = useGameStore(s => s.perfectLevels) || [];
  const currentLevelId = useGameStore(s => s.currentLevelId);

  const isAdvancedUnlocked = completedLevels.filter(id => id <= 10).length >= 10;

  const customScenarios = useGameStore(s => s.customScenarios) || [];

  const [activeCampaign, setActiveCampaign] = React.useState<'nursery' | 'advanced' | 'custom'>(() => {
    const activeId = currentLevelId ?? 1;
    if (activeId >= 1000) return 'custom';
    if (activeId > 10 && isAdvancedUnlocked) return 'advanced';
    return 'nursery';
  });

  const [selectedLevelId, setSelectedLevelId] = React.useState<number>(() => {
    const activeId = currentLevelId ?? 1;
    if (activeId > 10 && !isAdvancedUnlocked && activeId < 1000) return 1;
    return activeId;
  });

  const [activeHintIdx, setActiveHintIdx] = React.useState<number | null>(null);
  const [confirmingReset, setConfirmingReset] = React.useState(false);
  const resetConfirmTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedLevel = findLevel(selectedLevelId, customScenarios) ?? LEVELS[0];

  React.useEffect(() => {
    setActiveHintIdx(null);
  }, [selectedLevelId]);

  // Reset selectedLevelId to first scenario in active campaign if out of bounds
  React.useEffect(() => {
    if (activeCampaign === 'nursery') {
      if (selectedLevelId > 10 || selectedLevelId >= 1000) {
        setSelectedLevelId(1);
      }
    } else if (activeCampaign === 'advanced') {
      if (selectedLevelId <= 10 || selectedLevelId >= 1000) {
        setSelectedLevelId(11);
      }
    } else if (activeCampaign === 'custom') {
      if (customScenarios.length > 0) {
        if (!customScenarios.some(l => l.id === selectedLevelId)) {
          setSelectedLevelId(customScenarios[0].id);
        }
      } else {
        setActiveCampaign('nursery');
        setSelectedLevelId(1);
      }
    }
  }, [activeCampaign]);

  React.useEffect(() => {
    return () => {
      if (resetConfirmTimer.current) clearTimeout(resetConfirmTimer.current);
    };
  }, []);

  const handleRequestReset = () => {
    if (resetConfirmTimer.current) clearTimeout(resetConfirmTimer.current);
    setConfirmingReset(true);
    resetConfirmTimer.current = setTimeout(() => {
      setConfirmingReset(false);
    }, 4000);
  };

  const handleConfirmReset = () => {
    if (resetConfirmTimer.current) clearTimeout(resetConfirmTimer.current);
    localStorage.setItem('stellar_completed_levels', '[]');
    localStorage.setItem('stellar_perfect_levels', '[]');
    useGameStore.setState({ completedLevels: [], perfectLevels: [] });
    setConfirmingReset(false);
    setActiveCampaign('nursery');
    setSelectedLevelId(1);
  };

  const handleCancelReset = () => {
    if (resetConfirmTimer.current) clearTimeout(resetConfirmTimer.current);
    setConfirmingReset(false);
  };

  const filteredLevels = LEVELS.filter(l => {
    if (activeCampaign === 'nursery') {
      return l.id <= 10;
    } else {
      return l.id > 10;
    }
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex justify-center items-center p-4 animate-fade-in-up select-none pointer-events-auto">
      {/* Modal Container with stable height to prevent window sizing jumps between campaigns */}
      <div className="bg-[#0f0f15]/95 border border-white/10 p-6 sm:p-8 rounded-[32px] max-w-3xl w-full max-h-[92dvh] md:h-[580px] md:max-h-[85vh] overflow-hidden flex flex-col gap-4 text-white shadow-[0_16px_48px_rgba(0,0,0,0.7)] relative isolate">
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
            Hand-built puzzles. Par is the fewest moves each one can be solved in.
          </p>
        </div>

        {/* Campaign Tabs */}
        <div className="flex gap-4 border-b border-white/5 pb-2 select-none flex-shrink-0">
          <button
            onClick={() => setActiveCampaign('nursery')}
            className={`pb-2 text-xs tracking-[2px] uppercase font-bold transition-all relative cursor-pointer ${
              activeCampaign === 'nursery' ? 'text-cyan-400' : 'text-white/40 hover:text-white/70'
            }`}
          >
            Stellar Nursery
            {activeCampaign === 'nursery' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            )}
          </button>
          <button
            onClick={() => {
              if (isAdvancedUnlocked) {
                setActiveCampaign('advanced');
              }
            }}
            className={`pb-2 text-xs tracking-[2px] uppercase font-bold transition-all relative ${
              isAdvancedUnlocked 
                ? activeCampaign === 'advanced' ? 'text-cyan-400 cursor-pointer' : 'text-white/40 hover:text-white/70 cursor-pointer'
                : 'text-white/15 cursor-not-allowed'
            }`}
            title={isAdvancedUnlocked ? "Play advanced challenge levels" : "Complete Stellar Nursery campaign to unlock!"}
          >
            <span className="flex items-center gap-1.5">
              {!isAdvancedUnlocked && <LockIcon size={11} />}
              Advanced Fusion
            </span>
            {activeCampaign === 'advanced' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            )}
          </button>
          {customScenarios.length > 0 && (
            <button
              onClick={() => setActiveCampaign('custom')}
              className={`pb-2 text-xs tracking-[2px] uppercase font-bold transition-all relative cursor-pointer ${
                activeCampaign === 'custom' ? 'text-cyan-400' : 'text-white/40 hover:text-white/70'
              }`}
            >
              Custom Scenarios
              {activeCampaign === 'custom' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
              )}
            </button>
          )}
          {/* Scenario Editor — for every stellar architect, not just devs */}
          <button
            onClick={() => {
              useGameStore.getState().setEditorMode(true);
              onClose();
            }}
            className="pb-2 text-xs tracking-[2px] uppercase font-bold transition-all relative cursor-pointer text-emerald-400/70 hover:text-emerald-300 ml-auto"
            title="Build your own scenario in the editor"
          >
            + Create
          </button>
        </div>

        {/* Content Body: Left Level Map grid, Right level details */}
        <div className="flex flex-col md:flex-row gap-5 flex-1 min-h-0 overflow-y-auto md:overflow-hidden custom-scrollbar">
          
          {/* Left Panel: Level selection scrollable grid */}
          <div className="flex-shrink-0 md:flex-1 md:max-w-[320px] md:overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2">
            <span className="text-[8px] tracking-[2px] text-white/35 font-mono uppercase mb-1 hidden md:block">SCENARIO LIST</span>

            {/* Phones: a compact grid of numbered chips instead of a tall list */}
            {activeCampaign !== 'custom' && (
              <div className="grid grid-cols-5 gap-2 md:hidden">
                {filteredLevels.map(level => {
                  const isCompleted = completedLevels.includes(level.id);
                  const isUnlocked = level.id === 1 || level.id === 11 || completedLevels.includes(level.id - 1);
                  const isSelected = selectedLevelId === level.id;
                  return (
                    <button
                      key={level.id}
                      disabled={!isUnlocked}
                      onClick={() => setSelectedLevelId(level.id)}
                      className={`h-11 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1 transition-all ${
                        !isUnlocked
                          ? 'border-dashed border-white/5 text-white/20'
                          : isSelected
                            ? 'bg-white/10 border-white/30 text-white'
                            : 'bg-black/35 border-white/5 text-white/70 active:scale-95 cursor-pointer'
                      }`}
                    >
                      {isUnlocked ? formatScenarioNumber(level.id).split('-')[1] : <LockIcon size={11} />}
                      {isCompleted && <span className="text-emerald-400 text-[10px]">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
            
            {activeCampaign === 'custom' ? (
              customScenarios.map(level => {
                const isSelected = selectedLevelId === level.id;
                return (
                  <div key={level.id} className="w-full flex items-center gap-2 pr-1 flex-shrink-0">
                    <button
                      onClick={() => setSelectedLevelId(level.id)}
                      className={`flex-grow py-2.5 px-4 rounded-2xl border transition-all text-left flex justify-between items-center active:scale-[0.98] cursor-pointer ${
                        isSelected
                          ? 'bg-white/10 border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.25)]'
                          : 'bg-black/35 border-white/5 hover:bg-white/5 hover:border-white/12'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-mono tracking-widest text-cyan-400 uppercase leading-none font-bold">
                          Custom Level
                        </span>
                        <span className="text-xs font-semibold tracking-wide text-white mt-0.5">
                          {level.title}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete "${level.title}"?`)) {
                          const deleteScenario = useGameStore.getState().deleteScenario;
                          deleteScenario(level.id);
                          const remaining = useGameStore.getState().customScenarios.filter(l => l.id !== level.id);
                          if (remaining.length > 0) {
                            setSelectedLevelId(remaining[0].id);
                          } else {
                            setActiveCampaign('nursery');
                            setSelectedLevelId(1);
                          }
                        }
                      }}
                      className="p-2 text-white/30 hover:text-red-400 rounded-lg hover:bg-red-500/10 cursor-pointer transition-colors"
                      title="Delete custom scenario"
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            ) : (
              filteredLevels.map(level => {
                const isCompleted = completedLevels.includes(level.id);
                const isUnlocked = level.id === 1 || level.id === 11 || completedLevels.includes(level.id - 1);
                const isSelected = selectedLevelId === level.id;

                if (isUnlocked) {
                  return (
                    <button
                      key={level.id}
                      onClick={() => setSelectedLevelId(level.id)}
                      className={`hidden md:flex w-full py-2.5 px-4 rounded-2xl border transition-all text-left justify-between items-center active:scale-[0.98] cursor-pointer ${
                        isSelected
                          ? 'bg-white/10 border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.25)]'
                          : 'bg-black/35 border-white/5 hover:bg-white/5 hover:border-white/12'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-mono tracking-widest text-cyan-400 uppercase leading-none font-bold">
                          Scenario {formatScenarioNumber(level.id)}
                        </span>
                        <span className="text-xs font-semibold tracking-wide text-white mt-0.5">
                          {level.title}
                        </span>
                      </div>

                      {isCompleted ? (
                        <span className="text-xs text-emerald-400 font-bold tracking-wide flex items-center gap-1 select-none">
                          {perfectLevels.includes(level.id) ? <span className="text-[9px] font-mono text-cyan-300">PAR</span> : null}
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
                      className="hidden md:flex w-full py-2.5 px-4 rounded-2xl border border-dashed border-white/5 bg-black/10 justify-between items-center opacity-30 select-none cursor-default"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-mono tracking-widest text-white/40 uppercase leading-none">
                          Scenario {formatScenarioNumber(level.id)}
                        </span>
                        <span className="text-xs font-medium text-white/50 mt-0.5 italic">
                          Locked Star
                        </span>
                      </div>
                      <LockIcon size={12} className="text-white/30" />
                    </div>
                  );
                }
              })
            )}
          </div>

          {/* Right Panel: Selected Level conditions & Launch Button */}
          <div className="md:flex-1 bg-white/3 border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col justify-between md:overflow-hidden">
            {/* Scrollable details container */}
            <div className="md:flex-grow md:overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-4">
              {/* Scenario details */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950/20 border border-cyan-500/15 px-2.5 py-0.5 rounded-full uppercase leading-none">
                    Scenario {formatScenarioNumber(selectedLevel.id)}
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
              <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4 text-xs font-mono select-none">
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex flex-col gap-1">
                  <span className="text-[7.5px] text-white/40 tracking-wider font-semibold uppercase">Star</span>
                  <span className="font-bold text-white/90">{selectedLevel.starMass.toFixed(1)} M☉</span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex flex-col gap-1">
                  <span className="text-[7.5px] text-white/40 tracking-wider font-semibold uppercase">Par</span>
                  <span className="font-bold text-cyan-300">{selectedLevel.parMoves} {selectedLevel.parMoves === 1 ? 'move' : 'moves'}</span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex flex-col gap-1">
                  <span className="text-[7.5px] text-white/40 tracking-wider font-semibold uppercase">Limit</span>
                  <span className="font-bold text-white/90">{selectedLevel.maxTurns} moves</span>
                </div>
              </div>

              {/* Objectives lists */}
              <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
                <span className="text-[8px] tracking-[2px] text-white/35 font-mono uppercase mb-0.5">Objective · tap for a hint</span>
                {selectedLevel.objectives.map((obj, i) => {
                  const isHintActive = activeHintIdx === i;
                  let text = "";
                  if (obj.type === 'has_element') {
                    text = `Make ${(obj.count ?? 1) > 1 ? `${obj.count} ` : ''}${obj.element}.`;
                  } else if (obj.type === 'has_element_on_pentagon') {
                    text = `Get ${obj.element} onto a pentagon.`;
                  } else if (obj.type === 'has_element_count') {
                    text = `Hold ${obj.count} ${obj.element} at once.`;
                  } else if (obj.type === 'has_all_elements') {
                    text = `Hold all 8 elements at once: H, He, C, O, Ne, Mg, Si and Fe.`;
                  }
                  return (
                    <div key={i} className="flex flex-col gap-1">
                      <div 
                        onClick={() => setActiveHintIdx(isHintActive ? null : i)}
                        className="flex gap-2 items-start text-xs font-light text-cyan-300 cursor-pointer hover:text-cyan-200 active:scale-[0.99] transition-all select-none"
                        title="Show a hint"
                      >
                        <span className="text-[10px] leading-none mt-0.5">{isHintActive ? '✦' : '✧'}</span>
                        <span className="leading-relaxed border-b border-dashed border-cyan-400/25 hover:border-cyan-300/60 pb-0.5">{text}</span>
                      </div>
                      {isHintActive && obj.hint && (
                        <div className="pl-4 pr-2 py-2 mt-1 rounded-lg bg-cyan-950/20 border border-cyan-500/10 text-[10.5px] leading-relaxed text-white/70 font-light animate-fade-in-up">
                          <span className="text-cyan-400 font-semibold font-mono block mb-0.5 text-[8.5px] tracking-[1.5px] uppercase">HINT</span>
                          {obj.hint}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Launch Ignition + Explicit Safe Reset Progress */}
            <div className="flex-shrink-0 border-t border-white/5 mt-4 pt-4 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => onSelectLevel(selectedLevel.id)}
                className="w-full h-[52px] bg-white hover:bg-white/95 text-black rounded-full font-bold text-xs tracking-[2px] uppercase flex items-center justify-center cursor-pointer select-none transition-all active:scale-[0.98] shadow-[0_4px_16px_rgba(255,255,255,0.12)]"
              >
                LAUNCH IGNITION
              </button>

              {completedLevels.length > 0 && (
                <div className="flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                  {!confirmingReset ? (
                    <button
                      type="button"
                      onClick={handleRequestReset}
                      className="text-white/35 hover:text-red-400 transition-colors cursor-pointer py-1 px-2"
                    >
                      Reset Progress
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 animate-fade-in-up">
                      <button
                        type="button"
                        onClick={handleConfirmReset}
                        className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 font-bold cursor-pointer transition-all"
                      >
                        Confirm Reset
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelReset}
                        className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white cursor-pointer transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
