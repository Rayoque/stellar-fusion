// src/ui/PauseMenu.tsx
import React, { useState } from 'react';
import { useGameStore } from '../game/state';
import { 
  isBgSoundEnabled, 
  setBgSoundEnabled, 
  getBgVolume, 
  setBgVolume, 
  isEffectsSoundEnabled, 
  setEffectsSoundEnabled, 
  getEffectsVolume,
  setEffectsVolume,
  isHapticsEnabled,
  setHapticsEnabled,
} from '../audio/synth';
import { APP_VERSION } from '../version';

interface PauseMenuProps {
  onResume: () => void;
  onMainMenu: () => void;
  onOpenCodex: () => void;
  onOpenCampaign?: () => void;
}

export function PauseMenu({ onResume, onMainMenu, onOpenCodex, onOpenCampaign }: PauseMenuProps) {
  const reset = useGameStore(s => s.reset);
  const showRealtimeGraphics = useGameStore(s => s.showRealtimeGraphics);
  const setShowRealtimeGraphics = useGameStore(s => s.setShowRealtimeGraphics);

  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [bgSound, setBgSound] = useState(isBgSoundEnabled());
  const [effectsSound, setEffectsSound] = useState(isEffectsSoundEnabled());
  const [bgVolume, setBgVolumeState] = useState(getBgVolume());
  const [effectsVolume, setEffectsVolumeState] = useState(getEffectsVolume());
  const [haptics, setHaptics] = useState(isHapticsEnabled());

  const handleToggleBgSound = () => {
    const nextVal = !bgSound;
    setBgSound(nextVal);
    setBgSoundEnabled(nextVal);
  };

  const handleToggleEffectsSound = () => {
    const nextVal = !effectsSound;
    setEffectsSound(nextVal);
    setEffectsSoundEnabled(nextVal);
  };

  const handleBgVolumeChange = (val: number) => {
    setBgVolumeState(val);
    setBgVolume(val);
  };

  const handleEffectsVolumeChange = (val: number) => {
    setEffectsVolumeState(val);
    setEffectsVolume(val);
  };

  const handleReset = () => {
    reset();
    onResume();
  };

  const handleMainMenu = () => {
    onMainMenu();
  };

  const handleToggleSettings = () => {
    setShowSettings(!showSettings);
    if (showGuide) setShowGuide(false);
  };

  const handleToggleGuide = () => {
    setShowGuide(!showGuide);
    if (showSettings) setShowSettings(false);
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={onResume}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="border border-white/10 rounded-[32px] p-8 max-w-sm w-full mx-4 text-center shadow-[0_16px_48px_rgba(0,0,0,0.6)] relative overflow-hidden animate-fade-in-up isolate"
        style={{
          background: 'radial-gradient(circle at 0% 0%, rgba(6, 182, 212, 0.08), transparent 45%), radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.08), transparent 45%), rgba(15, 15, 19, 0.95)',
        }}
      >
        <div className="relative z-10">
          <div className="uppercase tracking-[4px] text-[8px] text-white/35 mb-1.5 font-mono">System Interaction</div>
          <h2 className="text-2xl font-light tracking-[0.16em] mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 uppercase">GAME MENU</h2>

          <div className="flex flex-col mb-4">
            <button
              onClick={onResume}
              className="w-full py-3 bg-white text-black rounded-full font-bold tracking-[1.5px] hover:bg-white/95 active:scale-[0.97] transition-all flex items-center justify-center gap-2 text-xs uppercase shadow-[0_4px_16px_rgba(255,255,255,0.1)] cursor-pointer"
            >
              RESUME FUSION
            </button>

            <button
              onClick={handleToggleGuide}
              className={`w-full py-3 border text-white rounded-full font-semibold tracking-[1.5px] active:scale-[0.97] transition-all flex items-center justify-center gap-2 px-6 text-xs uppercase cursor-pointer mt-3 ${
                showGuide ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              HOW TO PLAY
            </button>

            {/* Expanded Visual Guide Panel */}
            {showGuide && (
              <div className="bg-[#0b0b0e]/95 border border-white/5 rounded-2xl p-4 text-left space-y-3.5 animate-fade-in-up mt-3 font-sans shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
                {[
                  {
                    title: 'Slide',
                    body: 'Drag a tile. It slides across the sphere until it hits something or runs out of range. Heavier nuclei travel less far. Drag empty space to turn the star.',
                  },
                  useGameStore.getState().astrophysicistMode
                    ? {
                        title: 'Fuse',
                        body: 'Slide a nucleus into a partner: H + H makes D, D + H makes He3, He3 + He3 makes He4, and He4 climbs the ladder toward nickel-56. Pentagons are ordinary faces here.',
                      }
                    : {
                        title: 'Fuse',
                        body: 'Slide a tile into a partner: H + H makes He, three He in a triangle make C, and each extra He climbs C → O → Ne → Mg → Si. Si + Si makes Fe. A lone H that stops on a pentagon becomes He.',
                      },
                  useGameStore.getState().currentLevelId !== null
                    ? {
                        title: 'Solve',
                        body: 'Meet the objective within the move limit. Par is the fewest moves the puzzle can be solved in.',
                      }
                    : useGameStore.getState().astrophysicistMode
                      ? {
                          title: 'Keep room',
                          body: 'Every move adds a new tile, and only fusion makes room. The run ends when the sphere is full. Unstable isotopes decay if you leave them.',
                        }
                      : {
                          title: 'Live and die',
                          body: 'Every move costs your star one move of life and rains new hydrogen. Forge iron before time runs out and the core collapses in a supernova.',
                        },
                ].map((step, i) => (
                  <div key={step.title} className={`flex gap-3 ${i > 0 ? 'border-t border-white/5 pt-3.5' : ''}`}>
                    <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-cyan-300">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold tracking-wider text-cyan-400 font-mono uppercase">{step.title}</h4>
                      <p className="text-[10px] text-white/55 leading-relaxed mt-0.5 font-light">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {onOpenCampaign && (
              <button
                onClick={() => {
                  onOpenCampaign();
                  onResume();
                }}
                className="w-full py-3 bg-cyan-950/20 border border-cyan-500/10 text-cyan-400 rounded-full font-bold tracking-[1.5px] hover:bg-cyan-950/45 active:scale-[0.97] transition-all flex items-center justify-center gap-2 text-xs uppercase cursor-pointer mt-3"
              >
                SELECT SCENARIO
              </button>
            )}

            <button
              onClick={() => {
                onOpenCodex();
                onResume();
              }}
              className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-full font-semibold tracking-[1.5px] hover:bg-white/10 active:scale-[0.97] transition-all flex items-center justify-center gap-2 text-xs uppercase cursor-pointer mt-3"
            >
              {useGameStore.getState().astrophysicistMode ? 'ASTROPHYSICIST CODEX' : 'STELLAR CODEX'}
            </button>

            <button
              onClick={handleReset}
              className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-full font-semibold tracking-[1.5px] hover:bg-white/10 active:scale-[0.97] transition-all flex items-center justify-center gap-2 text-xs uppercase cursor-pointer mt-3"
            >
              RESET STAR
            </button>

            <button
              onClick={handleToggleSettings}
              className={`w-full py-3 border text-white rounded-full font-semibold tracking-[1.5px] active:scale-[0.97] transition-all flex items-center justify-center gap-2 px-6 text-xs uppercase cursor-pointer mt-3 ${
                showSettings ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              SETTINGS
            </button>

            {/* Expanded Settings Panel */}
            {showSettings && (
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-left space-y-4 animate-fade-in-up mt-3">
                {/* Real-Time Graphics Toggle */}
                <div className="flex items-center justify-between">
                  <div className="pr-4">
                    <div className="text-xs font-semibold text-white/90">Real-Time Graphics</div>
                    <div className="text-[10px] text-white/40 mt-1 leading-normal">Disable volumetric convective shells to boost performance.</div>
                  </div>
                  <button
                    onClick={() => setShowRealtimeGraphics(!showRealtimeGraphics)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      showRealtimeGraphics ? 'bg-cyan-500' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        showRealtimeGraphics ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Background Sound Toggle */}
                <div className="flex flex-col border-t border-white/5 pt-3 gap-2">
                  <div className="flex items-center justify-between">
                    <div className="pr-4">
                      <div className="text-xs font-semibold text-white/90">Background Drone</div>
                      <div className="text-[10px] text-white/40 mt-1 leading-normal">Low-frequency atmospheric background drone.</div>
                    </div>
                    <button
                      onClick={handleToggleBgSound}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        bgSound ? 'bg-cyan-500' : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          bgSound ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  {bgSound && (
                    <div className="flex items-center gap-3 animate-fade-in-up mt-1">
                      <span className="text-[9px] text-white/45 font-mono uppercase tracking-wider">Vol</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={bgVolume}
                        onChange={(e) => handleBgVolumeChange(Number(e.target.value))}
                        className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                        style={{ outline: 'none' }}
                      />
                      <span className="text-[9px] text-white/60 font-mono w-6 text-right">{bgVolume}%</span>
                    </div>
                  )}
                </div>

                {/* Effects Sound Toggle */}
                <div className="flex flex-col border-t border-white/5 pt-3 gap-2">
                  <div className="flex items-center justify-between">
                    <div className="pr-4">
                      <div className="text-xs font-semibold text-white/90">Sound Effects</div>
                      <div className="text-[10px] text-white/40 mt-1 leading-normal">Nuclei spawning tick, blocked shake, and fusion merges.</div>
                    </div>
                    <button
                      onClick={handleToggleEffectsSound}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        effectsSound ? 'bg-cyan-500' : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          effectsSound ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  {effectsSound && (
                    <div className="flex items-center gap-3 animate-fade-in-up mt-1">
                      <span className="text-[9px] text-white/45 font-mono uppercase tracking-wider">Vol</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={effectsVolume}
                        onChange={(e) => handleEffectsVolumeChange(Number(e.target.value))}
                        className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                        style={{ outline: 'none' }}
                      />
                      <span className="text-[9px] text-white/60 font-mono w-6 text-right">{effectsVolume}%</span>
                    </div>
                  )}
                </div>

                {/* Haptics Toggle */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div className="pr-4">
                    <div className="text-xs font-semibold text-white/90">Haptics</div>
                    <div className="text-[10px] text-white/40 mt-1 leading-normal">Heavier nuclei hit harder. Needs a device that supports vibration.</div>
                  </div>
                  <button
                    onClick={() => { setHaptics(!haptics); setHapticsEnabled(!haptics); }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      haptics ? 'bg-cyan-500' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        haptics ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleMainMenu}
              className="w-full py-3 bg-red-950/20 border border-red-500/10 text-red-400 rounded-full font-semibold tracking-[1.5px] hover:bg-red-950/40 active:scale-[0.97] transition-all flex items-center justify-center gap-2 text-xs uppercase cursor-pointer mt-3"
            >
              QUIT TO MAIN MENU
            </button>
          </div>

          <div className="text-[7.5px] text-white/25 tracking-[3px] font-mono uppercase mt-8">
            STELLAR FUSION ENGINE • V{APP_VERSION}
          </div>
        </div>
      </div>
    </div>
  );
}
