// src/ui/PauseMenu.tsx
import React, { useState } from 'react';
import { useGameStore } from '../game/state';

interface PauseMenuProps {
  onResume: () => void;
  onMainMenu: () => void;
  onOpenCampaign: () => void;
  onOpenCodex: () => void;
}

export function PauseMenu({ onResume, onMainMenu, onOpenCampaign, onOpenCodex }: PauseMenuProps) {
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
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-[#0f0f13]/90 border border-white/10 rounded-[32px] p-8 max-w-sm w-full mx-4 text-center shadow-[0_16px_48px_rgba(0,0,0,0.6)] relative overflow-hidden animate-fade-in-up isolate">
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-[60px] pointer-events-none" />

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
              onClick={() => {
                onOpenCampaign();
                onResume();
              }}
              className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-full font-semibold tracking-[1.5px] hover:bg-white/10 active:scale-[0.97] transition-all flex items-center justify-center gap-2 text-xs uppercase cursor-pointer mt-3"
            >
              STELLAR CAMPAIGN
            </button>

            <button
              onClick={() => {
                onOpenCodex();
                onResume();
              }}
              className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-full font-semibold tracking-[1.5px] hover:bg-white/10 active:scale-[0.97] transition-all flex items-center justify-center gap-2 text-xs uppercase cursor-pointer mt-3"
            >
              STELLAR CODEX
            </button>

            <button
              onClick={handleReset}
              className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-full font-semibold tracking-[1.5px] hover:bg-white/10 active:scale-[0.97] transition-all flex items-center justify-center gap-2 text-xs uppercase cursor-pointer mt-3"
            >
              RESET STAR
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`w-full py-3 border text-white rounded-full font-semibold tracking-[1.5px] active:scale-[0.97] transition-all flex items-center justify-center gap-2 px-6 text-xs uppercase cursor-pointer mt-3 ${
                showSettings ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              SETTINGS
            </button>

            {/* Expanded Settings Panel */}
            {showSettings && (
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-left space-y-4 animate-fade-in-up mt-3">
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
            STELLAR FUSION ENGINE • V0.8.0
          </div>
        </div>
      </div>
    </div>
  );
}
