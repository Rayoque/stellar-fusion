// src/ui/CampaignSelector.tsx
import React from 'react';
import { LEVELS, type Level, formatScenarioNumber } from '../game/levels';
import { useGameStore } from '../game/state';

interface CampaignSelectorProps {
  onClose: () => void;
  onSelectLevel: (levelId: number) => void;
}

export function CampaignSelector({ onClose, onSelectLevel }: CampaignSelectorProps) {
  const completedLevels = useGameStore(s => s.completedLevels);
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

  const selectedLevel = LEVELS.find(l => l.id === selectedLevelId) || customScenarios.find(l => l.id === selectedLevelId) || LEVELS[0];

  React.useEffect(() => {
    setActiveHintIdx(null);
  }, [selectedLevelId]);

  // Swipe states
  const [translateX, setTranslateX] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStart = React.useRef<number>(0);
  const currentTranslateX = React.useRef<number>(0);
  const maxReveal = 140; // width of the reset button

  // Long press / click-and-hold states
  const [holdProgress, setHoldProgress] = React.useState(0);
  const holdTimer = React.useRef<any>(null);
  const progressInterval = React.useRef<any>(null);

  // Snap back swipe when level selection changes
  React.useEffect(() => {
    setTranslateX(0);
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

  // Clean up timers on unmount
  React.useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStart.current = e.clientX;
    currentTranslateX.current = translateX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const diff = e.clientX - dragStart.current;
    let target = currentTranslateX.current + diff;
    // Clamp between -maxReveal and 0
    target = Math.max(Math.min(target, 0), -maxReveal);
    setTranslateX(target);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    const diff = e.clientX - dragStart.current;
    
    // If movement is tiny, trigger regular launch tap/click
    if (Math.abs(diff) < 5) {
      onSelectLevel(selectedLevel.id);
      return;
    }

    // Snap threshold
    if (translateX < -60) {
      setTranslateX(-maxReveal);
    } else {
      setTranslateX(0);
    }
  };

  const startResetHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (progressInterval.current) clearInterval(progressInterval.current);

    setHoldProgress(0);
    const startTime = Date.now();

    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / 1000) * 100, 100);
      setHoldProgress(pct);
    }, 20);

    holdTimer.current = setTimeout(() => {
      clearInterval(progressInterval.current);
      clearTimeout(holdTimer.current);
      progressInterval.current = null;
      holdTimer.current = null;

      // Reset campaign checkmarks
      localStorage.setItem('stellar_completed_levels', '[]');
      useGameStore.setState({ completedLevels: [] });

      setHoldProgress(0);
      setTranslateX(0);
      setActiveCampaign('nursery');
      setSelectedLevelId(1);
    }, 1000);
  };

  const cancelResetHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    setHoldProgress(0);
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
      <div className="bg-[#0f0f15]/95 border border-white/10 p-6 sm:p-8 rounded-[32px] max-w-3xl w-full h-[620px] max-h-[90vh] md:h-[580px] md:max-h-[85vh] overflow-hidden flex flex-col gap-5 text-white shadow-[0_16px_48px_rgba(0,0,0,0.7)] relative isolate">
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
            Progress through curated cosmic puzzle scenarios. Achieve specific nuclear fusion milestones.
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
              {!isAdvancedUnlocked && '🔒 '}
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
        </div>

        {/* Content Body: Left Level Map grid, Right level details */}
        <div className="flex flex-col md:flex-row gap-6 flex-1 overflow-hidden min-h-0">
          
          {/* Left Panel: Level selection scrollable grid */}
          <div className="h-[130px] md:h-auto flex-shrink-0 md:flex-1 md:max-w-[320px] overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2">
            <span className="text-[8px] tracking-[2px] text-white/35 font-mono uppercase mb-1 block">SCENARIO LIST</span>
            
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
                      className={`w-full py-2.5 px-4 rounded-2xl border transition-all text-left flex justify-between items-center active:scale-[0.98] cursor-pointer ${
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
                          Scenario {formatScenarioNumber(level.id)}
                        </span>
                        <span className="text-xs font-medium text-white/50 mt-0.5 italic">
                          Locked Star
                        </span>
                      </div>
                      <span className="text-xs text-white/30">🔒</span>
                    </div>
                  );
                }
              })
            )}
          </div>

          {/* Right Panel: Selected Level conditions & Launch Button */}
          <div className="flex-grow flex-1 bg-white/3 border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden">
            {/* Scrollable details container */}
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-4">
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
                <span className="text-[8px] tracking-[2px] text-white/35 font-mono uppercase mb-0.5">Scenario Objectives (Tap to view details)</span>
                {selectedLevel.objectives.map((obj, i) => {
                  const isHintActive = activeHintIdx === i;
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
                    <div key={i} className="flex flex-col gap-1">
                      <div 
                        onClick={() => setActiveHintIdx(isHintActive ? null : i)}
                        className="flex gap-2 items-start text-xs font-light text-cyan-300 cursor-pointer hover:text-cyan-200 active:scale-[0.99] transition-all select-none"
                        title="Click to view detailed scientific objective guide"
                      >
                        <span className="text-[10px] leading-none mt-0.5">{isHintActive ? '✦' : '✧'}</span>
                        <span className="leading-relaxed border-b border-dashed border-cyan-400/25 hover:border-cyan-300/60 pb-0.5">{text}</span>
                      </div>
                      {isHintActive && obj.hint && (
                        <div className="pl-4 pr-2 py-2 mt-1 rounded-lg bg-cyan-950/20 border border-cyan-500/10 text-[10.5px] leading-relaxed text-white/70 font-light animate-fade-in-up">
                          <span className="text-cyan-400 font-semibold font-mono block mb-0.5 text-[8.5px] tracking-[1.5px] uppercase">ASTRONOMICAL GUIDE:</span>
                          {obj.hint}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Swipeable Ignition + Reset Campaign Dock */}
            <div className="flex-shrink-0 border-t border-white/5 mt-4 pt-4 relative">
              <div className="relative w-full h-[52px] rounded-full overflow-hidden bg-black/45 border border-white/5 select-none">
                {/* Background Red Reset Campaign Button */}
                <button
                  onPointerDown={startResetHold}
                  onPointerUp={cancelResetHold}
                  onPointerLeave={cancelResetHold}
                  className="absolute right-0 top-0 bottom-0 w-[140px] bg-red-700 hover:bg-red-600 text-white font-bold text-[10px] tracking-[1.5px] uppercase rounded-full flex flex-col items-center justify-center cursor-pointer select-none transition-all z-0 overflow-hidden pr-3"
                  style={{
                    boxShadow: 'inset 0 0 12px rgba(239, 68, 68, 0.4)'
                  }}
                  title="Click and hold for 1 second to completely reset all campaign checkmarks"
                >
                  <span className="relative z-10 leading-none">Hold 1s</span>
                  <span className="relative z-10 text-[7px] text-white/70 tracking-[1px] mt-1 leading-none">To Reset Map</span>
                  
                  {/* Dynamic hold-progress filling bar */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-red-500/40 pointer-events-none transition-all"
                    style={{ width: `${holdProgress}%` }}
                  />
                </button>

                {/* Foreground White Launch Ignition Button (Swipeable) */}
                <div
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="absolute inset-0 bg-white hover:bg-white/95 text-black rounded-full font-bold flex items-center justify-center cursor-grab active:cursor-grabbing select-none transition-transform duration-100 ease-out z-10 shadow-[0_4px_16px_rgba(255,255,255,0.12)]"
                  style={{
                    transform: `translate3d(${translateX}px, 0, 0)`,
                  }}
                >
                  <span className="text-xs tracking-[2px] uppercase select-none pointer-events-none">
                    LAUNCH IGNITION
                  </span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
