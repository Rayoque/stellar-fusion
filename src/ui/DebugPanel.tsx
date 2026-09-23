import React from 'react';
import { useGameStore } from '../game/state';
import { SHORTCUTS } from '../game/shortcuts';
import { LEVELS, formatScenarioNumber } from '../game/levels';
import type { ElementSymbol, EndState } from '../game/types';
import { unlockAllStars } from '../game/stars';
import { BOTS, getBot } from '../game/bots';

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
  const autoPlayBot = useGameStore(s => s.autoPlayBot);
  const setAutoPlayBot = useGameStore(s => s.setAutoPlayBot);
  const autoPlayTurbo = useGameStore(s => s.autoPlayTurbo);
  const setAutoPlayTurbo = useGameStore(s => s.setAutoPlayTurbo);
  const autoPlayLoop = useGameStore(s => s.autoPlayLoop);
  const setAutoPlayLoop = useGameStore(s => s.setAutoPlayLoop);
  const autoPlayNote = useGameStore(s => s.autoPlayNote);
  const autoRunLog = useGameStore(s => s.autoRunLog);
  const clearAutoRunLog = useGameStore(s => s.clearAutoRunLog);
  const setEditorMode = useGameStore(s => s.setEditorMode);

  const unlockAll = () => {
    const allLevels = LEVELS.map(l => l.id);
    localStorage.setItem('stellar_completed_levels', JSON.stringify(allLevels));
    localStorage.setItem('stellar_unlocked_elements', JSON.stringify(STABLE));
    useGameStore.setState({ completedLevels: allLevels, unlockedElements: STABLE });
    unlockAllStars();
  };

  const wipeProgress = () => {
    localStorage.removeItem('stellar_completed_levels');
    localStorage.removeItem('stellar_unlocked_elements');
    localStorage.removeItem('stellar_endings_seen');
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

  // Replay any end-state ceremony on the current board without playing to it.
  // Clearing endState first lets the same ceremony re-trigger back to back.
  // Collapse-family previews also set the collapse phase so the core shrinks
  // beneath the ejecta exactly like a real death.
  const previewEndState = (es: EndState) => {
    useGameStore.setState({ endState: null });
    setTimeout(() => {
      useGameStore.setState({
        endState: es,
        ...(es !== 'jammed' && es !== 'core_full' ? { phase: 'collapse' as const } : {}),
      });
    }, 80);
    onClose();
  };

  const btn = 'w-full text-left px-2.5 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-200 transition-colors cursor-pointer';
  const toggle = (on: boolean) =>
    `px-2 py-1.5 rounded border transition-colors cursor-pointer text-left ${
      on
        ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-200'
        : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-200'
    }`;
  const bot = getBot(autoPlayBot);

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
        <div className="grid grid-cols-5 gap-1 mt-0.5" role="radiogroup" aria-label="Bot">
          {BOTS.map(b => (
            <button
              key={b.id}
              role="radio"
              aria-checked={b.id === autoPlayBot}
              onClick={() => setAutoPlayBot(b.id)}
              title={b.blurb}
              className={`py-1 rounded border transition-colors cursor-pointer text-[8px] ${
                b.id === autoPlayBot
                  ? 'bg-amber-400/25 border-amber-400/60 text-amber-100 font-bold'
                  : 'bg-amber-500/5 hover:bg-amber-500/15 border-amber-500/20 text-amber-300/80'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
        <div className="text-[8px] text-amber-100/70 leading-snug px-0.5 min-h-[2.4em]">
          {bot.blurb}
        </div>
        {autoPlay && autoPlayNote && (
          <div className="text-[8px] text-emerald-300/90 leading-snug px-0.5">
            <span className="text-emerald-500/70 uppercase tracking-[1px]">{bot.name}: </span>{autoPlayNote}
          </div>
        )}

        <div className={`flex items-center gap-2 px-0.5 ${autoPlayTurbo ? 'opacity-35' : ''}`}>
          <span className="text-[8px] text-amber-500/60 uppercase tracking-[1px] whitespace-nowrap">Speed</span>
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.1}
            value={autoPlaySpeed}
            disabled={autoPlayTurbo}
            onChange={(e) => setAutoPlaySpeed(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-amber-400 cursor-pointer disabled:cursor-not-allowed"
          />
          <span className="text-[9px] text-amber-200 tabular-nums w-8 text-right">{autoPlaySpeed.toFixed(1)}×</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button onClick={() => setAutoPlayTurbo(!autoPlayTurbo)} className={toggle(autoPlayTurbo)} title="Skip the grab, the camera orbit and the slide animation">
            Turbo: {autoPlayTurbo ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => setAutoPlayLoop(!autoPlayLoop)} className={toggle(autoPlayLoop)} title="Start a new run (or the next scenario) when one ends">
            Keep playing: {autoPlayLoop ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="text-[8px] text-amber-500/50 leading-tight px-0.5">
          Turbo plays about 45 moves a second. Keep playing starts a new run when one ends; a solved scenario moves on to the next. Auto-played runs never set a best or count toward the campaign.
        </div>

        {autoRunLog.length > 0 && (
          <div className="mt-1">
            <div className="flex items-center justify-between px-0.5 mb-0.5">
              <span className="text-[8px] tracking-[2px] text-amber-500/60 uppercase">Recent runs</span>
              <button onClick={clearAutoRunLog} className="text-[8px] text-amber-400/60 hover:text-amber-200 cursor-pointer">Clear</button>
            </div>
            <div className="flex flex-col gap-px">
              {autoRunLog.map(r => (
                <div key={r.run} className="px-1.5 py-1 rounded bg-amber-500/5 leading-tight">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-amber-300 font-bold">
                      {getBot(r.bot).name}
                      {r.turbo && <span className="text-amber-500/60 font-normal"> turbo</span>}
                    </span>
                    <span className="text-amber-200 tabular-nums">
                      {r.score.toLocaleString()}
                      <span className="text-amber-500/60"> in {r.moves.toLocaleString()} {r.moves === 1 ? 'move' : 'moves'}</span>
                    </span>
                  </div>
                  <div className="text-amber-100/60 text-[8px]">{r.mode} · {r.result}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-[8px] tracking-[2px] text-amber-500/60 uppercase mb-1.5">End-State Ceremony Preview</div>
      <div className="grid grid-cols-2 gap-1 mb-1.5">
        <button onClick={() => previewEndState('white_dwarf')} className={btn}>White Dwarf</button>
        <button onClick={() => previewEndState('neutron_star')} className={btn}>Neutron Star</button>
        <button onClick={() => previewEndState('black_hole')} className={btn}>Black Hole</button>
        <button onClick={() => previewEndState('failed_collapse')} className={btn}>Failed Collapse</button>
        <button onClick={() => previewEndState('jammed')} className={btn}>Jammed</button>
        <button onClick={() => previewEndState('core_full')} className={btn}>Core Full</button>
      </div>
      <div className="text-[8px] text-amber-500/50 leading-tight px-0.5 mb-3">
        Plays the full ceremony on the current board. Needs tiles in play for ejecta.
      </div>

      <div className="text-[8px] tracking-[2px] text-amber-500/60 uppercase mb-1.5">Dev Actions</div>
      <div className="flex flex-col gap-1 mb-3">
        <button
          onClick={() => {
            setEditorMode(true);
            onClose();
          }}
          className={btn}
        >
          Enter Scenario Editor
        </button>
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
            className="py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-200 transition-colors cursor-pointer text-[8px]"
          >
            {formatScenarioNumber(l.id)}
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
