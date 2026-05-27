// src/ui/CampaignStatusOverlay.tsx
import React from 'react';
import { LEVELS } from '../game/levels';
import { useGameStore } from '../game/state';

interface CampaignStatusOverlayProps {
  levelId: number;
  status: 'win' | 'fail';
  onNextLevel?: () => void;
  onRetry: () => void;
  onBackToCampaign: () => void;
}

const SUCCESS_MESSAGES: Record<number, string> = {
  1: "Hydrogen nuclei successfully merged. The protostar's core has ignited, establishing a stable main-sequence equilibrium.",
  2: "The CNO cycle catalyst shortcut has ignited! Hydrogen burning has bypassed traditional bottlenecks on the star's pentagons.",
  3: "The Triple-Alpha barrier is broken. Helium-4 nuclei have merged into a stable Carbon-12 core under immense convective resonance.",
  4: "Carbon nuclei have captured alpha particles. Your red giant has synthesized a rich, heavy Oxygen shell, securing core stability.",
  5: "Curved topological paths navigated. Oxygen has fused with Helium to form a glowing, stable Neon-20 shell layer.",
  6: "Neon alpha-capture resonance achieved! A beautiful, glowing Magnesium-24 shell layer now sits securely in the supergiant concentric shells.",
  7: "Silicon synthesized. High-mass nuclei have successfully merged despite massive slide constraints and gravitational drag.",
  8: "Silicon trap avoided. Two separate, heavy Silicon cores have been synthesized and positioned in the convective shells.",
  9: "Silicon burned. Iron synthesized in the core. Thermal pressure has ceased, triggering the ultimate, glorious Core Collapse supernova!",
  10: "Cosmic equilibrium reached. You have successfully balanced and possessed all 8 stable elements on the board simultaneously. You are a Master of Stellar Physics!"
};

const FAILURE_MESSAGES: Record<number, string> = {
  1: "The protostar failed to establish stable hydrogen fusion. The gas cloud dispersed into a cold brown dwarf.",
  2: "The Hydrogen did not reach the pentagons in time to trigger CNO cycle catalysis. The core cooled prematurely.",
  3: "Helium nuclei failed to form the required triple-alpha triangle. The star collapsed under gravity before Carbon could ignite.",
  4: "Convection currents pulled elements apart before Carbon could capture enough alpha particles. The red giant collapsed.",
  5: "Helium failed to navigate the curved grid pathways into your oxygen core. The Neon shell collapsed.",
  6: "Stellar core became overcrowded and jammed before Magnesium resonance could be achieved.",
  7: "Heavy Silicon nuclei got trapped in the outer convective shells, unable to reach the core under severe slide limits.",
  8: "Silicon tiles blocked each other's slide paths, resulting in a locked grid before dual-Silicon targets were met.",
  9: "Silicon fuel exhausted before Silicon could fuse. The star collapsed as a failed white dwarf without forming Iron.",
  10: "The fragile chemical equilibrium was disrupted. The star collapsed into a black hole before all 8 elements could be balanced."
};

export function CampaignStatusOverlay({ levelId, status, onNextLevel, onRetry, onBackToCampaign }: CampaignStatusOverlayProps) {
  const level = LEVELS.find(l => l.id === levelId);
  if (!level) return null;

  const isWin = status === 'win';
  const message = isWin 
    ? (SUCCESS_MESSAGES[levelId] || "Success! Scenario objective achieved.") 
    : (FAILURE_MESSAGES[levelId] || "Defeat. The scenario constraints were exceeded.");

  const accentColor = isWin ? '#34d399' : '#f87171'; // Emerald vs Red
  const shadowGlow = isWin 
    ? 'rgba(52, 211, 153, 0.12)' 
    : 'rgba(248, 113, 113, 0.12)';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md select-none pointer-events-auto">
      {/* Modal Container */}
      <div 
        className="bg-[#0f0f13]/90 border border-white/10 rounded-[32px] p-8 sm:p-10 max-w-md w-full mx-4 text-center shadow-[0_16px_48px_rgba(0,0,0,0.65)] relative overflow-hidden animate-fade-in-up isolate"
        style={{ 
          borderColor: isWin ? 'rgba(52, 211, 153, 0.2)' : 'rgba(248, 113, 113, 0.2)',
          boxShadow: `0 16px 48px rgba(0,0,0,0.65), 0 0 24px ${shadowGlow}`
        }}
      >
        {/* Dynamic decorative corner glows */}
        <div 
          className="absolute -top-32 -left-32 w-64 h-64 rounded-full blur-[70px] pointer-events-none transition-all duration-500"
          style={{ backgroundColor: isWin ? 'rgba(52, 211, 153, 0.08)' : 'rgba(248, 113, 113, 0.08)' }}
        />
        <div 
          className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full blur-[70px] pointer-events-none transition-all duration-500"
          style={{ backgroundColor: 'rgba(168, 85, 247, 0.08)' }} // deep purple bottom corner
        />

        <div className="relative z-10">
          <div 
            className="uppercase tracking-[4px] text-[8.5px] sm:text-[9.5px] mb-2 font-mono font-bold"
            style={{ color: accentColor }}
          >
            {isWin ? '✦ Scenario Completed ✦' : '✕ Scenario Failed ✕'}
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-light tracking-wide mb-3 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
            {level.title}
          </h1>
          
          <p className="text-white/50 mb-8 text-xs sm:text-[13px] leading-relaxed max-w-[280px] sm:max-w-sm mx-auto font-light">
            {message}
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
