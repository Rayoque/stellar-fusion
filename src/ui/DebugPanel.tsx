import React from 'react';
import { useGameStore } from '../game/state';
import { SHORTCUTS } from '../game/shortcuts';
import { LEVELS } from '../game/levels';
import type { ElementSymbol } from '../game/types';

interface DebugPanelProps {
  onClose: () => void;
  onJumpAstro: () => void;
  onJumpLevel: (id: number) => void;
}

const STABLE: ElementSymbol[] = ['H', 'He', 'C', 'O', 'Ne', 'Mg', 'Si', 'Fe'];

export function DebugPanel({ onClose, onJumpAstro, onJumpLevel }: DebugPanelProps) {
  const showRealtimeGraphics = useGameStore(s => s.showRealtimeGraphics);
  const setShowRealtimeGraphics = useGameStore(s => s.setShowRealtimeGraphics);
  const completedLevels = useGameStore(s => s.completedLevels);
  const autoPlay = useGameStore(s => s.autoPlay);
  const setAutoPlay = useGameStore(s => s.setAutoPlay);
  const autoPlaySpeed = useGameStore(s => s.autoPlaySpeed);
  const setAutoPlaySpeed = useGameStore(s => s.setAutoPlaySpeed);

  const unlockAll = () => {
    const allLevels = LEVELS.map(l => l.id);
    localStorage.setItem('stellar_completed_levels', JSON.stringify(allLevels));
    localStorage.setItem('stellar_unlocked_elements', JSON.stringify(STABLE));
    useGameStore.setState({ completedLevels: allLevels, unlockedElements: STABLE });
  };

  const wipeProgress = () => {
    localStorage.removeItem('stellar_completed_levels');
    localStorage.removeItem('stellar_unlocked_elements');
    useGameStore.setState({ completedLevels: [], unlockedElements: ['H', 'He'] });
  };

  const resetOnboarding = () => {
    localStorage.removeItem('stellar_headphones_suggested');
    useGameStore.getState().resetNucleationTutorial();
  };

  const disableDebug = () => {
    localStorage.removeItem('stellar_debug');
    onClose();
  };

  const btn = 'w-full text-left px-2.5 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-200 transition-colors cursor-pointer';

  return (
    <div className="fixed top-3 left-3 z-[200] w-[260px] max-h-[92vh] overflow-y-auto rounded-xl border border-amber-500/30 bg-[#0a0a0c]/95 backdrop-blur-md p-3 font-mono text-[10px] text-amber-100 shadow-[0_8px_32px_rgba(0,0,0,0.6)] select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold tracking-[2px] text-amber-400 uppercase text-[9px]">Debug Mode</span>
        <button onClick={onClose} className="text-amber-400/70 hover:text-amber-200 px-1 cursor-pointer" title="Close (`)">✕</button>
      </div>

      <div className="text-[8px] tracking-[2px] text-amber-500/60 uppercase mb-1.5">Auto-Player</div>
      <div className="flex flex-col gap-1 mb-3">
        <button
          onClick={() => setAutoPlay(!autoPlay)}
          className={`w-full text-left px-2.5 py-1.5 rounded border transition-colors cursor-pointer ${
            autoPlay
              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-200'
              : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-200'
          }`}
        >
          {autoPlay ? '⏸  Pause auto-player' : '▶  Play auto-player'}
        </button>
        <div className="flex items-center gap-2 px-0.5">
          <span className="text-[8px] text-amber-500/60 uppercase tracking-[1px] whitespace-nowrap">Speed</span>
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.1}
            value={autoPlaySpeed}
            onChange={(e) => setAutoPlaySpeed(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-amber-400 cursor-pointer"
          />
          <span className="text-[9px] text-amber-200 tabular-nums w-8 text-right">{autoPlaySpeed.toFixed(1)}×</span>
        </div>
        <div className="text-[8px] text-amber-500/50 leading-tight px-0.5">
          Watches itself fuse. You can still drag tiles while it runs.
        </div>
      </div>

      <div className="text-[8px] tracking-[2px] text-amber-500/60 uppercase mb-1.5">Dev Actions</div>
      <div className="flex flex-col gap-1 mb-3">
        <button onClick={onJumpAstro} className={btn}>Jump to Astrophysicist Mode</button>
        <button onClick={unlockAll} className={btn}>Unlock all ({completedLevels.length}/{LEVELS.length})</button>
        <button onClick={() => setShowRealtimeGraphics(!showRealtimeGraphics)} className={btn}>
          Realtime graphics: {showRealtimeGraphics ? 'ON' : 'OFF'}
        </button>
        <button onClick={resetOnboarding} className={btn}>Reset onboarding</button>
        <button onClick={wipeProgress} className={btn}>Wipe progress</button>
        <button onClick={disableDebug} className={btn}>Disable debug</button>
      </div>

      <div className="text-[8px] tracking-[2px] text-amber-500/60 uppercase mb-1.5">Jump to Level</div>
      <div className="grid grid-cols-5 gap-1 mb-3">
        {LEVELS.map(l => (
          <button
            key={l.id}
            onClick={() => onJumpLevel(l.id)}
            title={l.title}
            className="py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-200 transition-colors cursor-pointer"
          >
            {l.id}
          </button>
        ))}
      </div>

      <div className="text-[8px] tracking-[2px] text-amber-500/60 uppercase mb-1.5">Shortcuts</div>
      <div className="flex flex-col gap-0.5">
        {SHORTCUTS.map(s => (
          <div key={s.key} className="flex gap-2 leading-tight">
            <span className="text-amber-400 font-bold whitespace-nowrap min-w-[64px]">{s.key}</span>
            <span className="text-amber-100/70">{s.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
