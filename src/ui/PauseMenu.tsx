// src/ui/PauseMenu.tsx
import React, { useState } from 'react';
import { useGameStore } from '../game/state';

interface PauseMenuProps {
  onResume: () => void;
  onMainMenu: () => void;
}

export function PauseMenu({ onResume, onMainMenu }: PauseMenuProps) {
  const reset = useGameStore(s => s.reset);
  const showRealtimeGraphics = useGameStore(s => s.showRealtimeGraphics);
  const setShowRealtimeGraphics = useGameStore(s => s.setShowRealtimeGraphics);

  const [showSettings, setShowSettings] = useState(false);

  const handleReset = () => {
    reset();
    onResume();
  };

  const handleMainMenu = () => {
    onMainMenu();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md">
      <div className="bg-[#111113]/90 border border-white/10 rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="uppercase tracking-[4px] text-[10px] text-white/40 mb-2">SYSTEM INTERACTION</div>
          <h2 className="text-3xl font-semibold tracking-tight mb-8">GAME MENU</h2>

          <div className="space-y-3.5 mb-6">
            <button
              onClick={onResume}
              className="w-full py-3 bg-white text-black rounded-xl font-medium tracking-wide hover:bg-white/90 active:scale-[0.985] transition-all flex items-center justify-center gap-2"
            >
              RESUME FUSION
            </button>

            <button
              onClick={handleReset}
              className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-xl font-medium tracking-wide hover:bg-white/10 active:scale-[0.985] transition-all flex items-center justify-center gap-2"
            >
              RESET STAR
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`w-full py-3 border text-white rounded-xl font-medium tracking-wide active:scale-[0.985] transition-all flex items-center justify-center gap-2 px-6 ${
                showSettings ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <span>SETTINGS</span>
              <span className={`text-[10px] transition-transform duration-200 ${showSettings ? 'rotate-90' : ''}`}>
                ▶
              </span>
            </button>

            {/* Expanded Settings Panel */}
            {showSettings && (
              <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-left space-y-4 animate-fadeIn transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white/90">Real-Time Graphics</div>
                    <div className="text-[10px] text-white/40 mt-0.5 leading-snug">Disable volumetric convective shells to boost performance.</div>
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
              </div>
            )}

            <button
              onClick={handleMainMenu}
              className="w-full py-3 bg-red-950/20 border border-red-500/10 text-red-400 rounded-xl font-medium tracking-wide hover:bg-red-950/40 active:scale-[0.985] transition-all flex items-center justify-center gap-2"
            >
              QUIT TO MAIN MENU
            </button>
          </div>

          <div className="text-[9px] text-white/30 tracking-wider uppercase mt-4">
            STELLAR FUSION ENGINE • V0.1.0
          </div>
        </div>
      </div>
    </div>
  );
}
