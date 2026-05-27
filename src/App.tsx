// src/App.tsx
import React, { useEffect } from 'react';
import { Scene } from './three/Scene';
import { useGameStore } from './game/state';
import { initAudio, startAmbientDrone, playSpawnTick } from './audio/synth';
import { HUD } from './ui/HUD';
import { EndScreen } from './ui/EndScreen';
import { StartScreen } from './ui/StartScreen';
import { TouchIndicator } from './ui/TouchIndicator';
import { PauseMenu } from './ui/PauseMenu';
import { CampaignSelector } from './ui/CampaignSelector';
import { Codex } from './ui/Codex';
import { CampaignStatusOverlay } from './ui/CampaignStatusOverlay';
import { ELEMENTS } from './game/elements';

export default function App() {
  const newGame = useGameStore(s => s.newGame);
  const endState = useGameStore(s => s.endState);
  const phase = useGameStore(s => s.phase);
  const starMass = useGameStore(s => s.starMass);
  const turn = useGameStore(s => s.turn);
  const elementCounts = useGameStore(s => s.elementCounts);
  const isPaused = useGameStore(s => s.isPaused);
  const setPaused = useGameStore(s => s.setPaused);

  // Campaign state bindings
  const currentLevelId = useGameStore(s => s.currentLevelId);
  const levelObjectiveMet = useGameStore(s => s.levelObjectiveMet);
  const levelFailed = useGameStore(s => s.levelFailed);
  const activeToastElement = useGameStore(s => s.activeToastElement);
  const dismissToast = useGameStore(s => s.dismissToast);

  // UI state variables
  const [showStart, setShowStart] = React.useState(true);
  const [showCampaign, setShowCampaign] = React.useState(false);
  const [showCodex, setShowCodex] = React.useState(false);

  useEffect(() => {
    // Initialize audio on first interaction
    const handleFirstInteraction = () => {
      initAudio();
      startAmbientDrone();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // Auto-dismiss the Codex toast after 4.5 seconds
  useEffect(() => {
    if (activeToastElement) {
      const timer = setTimeout(() => {
        dismissToast();
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [activeToastElement, dismissToast]);

  const handleStart = () => {
    newGame();
    setShowStart(false);
    // Play a subtle spawn tick on start
    setTimeout(() => playSpawnTick(), 120);
  };

  const handlePlayAgain = () => {
    newGame();
    setShowStart(false);
  };

  const handleMainMenu = () => {
    setShowStart(true);
    setPaused(false);
    newGame();
  };

  const handleLaunchLevel = (levelId: number) => {
    newGame(undefined, levelId);
    setShowCampaign(false);
    setShowStart(false);
    setTimeout(() => playSpawnTick(), 120);
  };

  const handleRetryLevel = () => {
    if (currentLevelId !== null) {
      newGame(undefined, currentLevelId);
    }
  };

  const handleNextLevel = () => {
    if (currentLevelId !== null && currentLevelId < 10) {
      newGame(undefined, currentLevelId + 1);
    }
  };

  if (showStart) {
    return (
      <>
        <StartScreen 
          onStart={handleStart} 
          onOpenCampaign={() => setShowCampaign(true)} 
        />
        {showCampaign && (
          <CampaignSelector
            onClose={() => setShowCampaign(false)}
            onSelectLevel={handleLaunchLevel}
          />
        )}
      </>
    );
  }

  return (
    <div className="relative w-full h-screen h-[100dvh] overflow-hidden bg-[#050508] text-white font-sans select-none antialiased">
      <Scene />
      <TouchIndicator />

      <HUD
        phase={phase}
        starMass={starMass}
        turn={turn}
        elementCounts={elementCounts}
        onOpenMenu={() => setPaused(true)}
        onOpenCodex={() => setShowCodex(true)}
      />

      {/* Standard Sandbox End Screen */}
      {endState && currentLevelId === null && (
        <EndScreen
          endState={endState}
          starMass={starMass}
          elementCounts={elementCounts}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {/* Pause Menu Overlay */}
      {isPaused && (
        <PauseMenu
          onResume={() => setPaused(false)}
          onMainMenu={handleMainMenu}
          onOpenCampaign={() => setShowCampaign(true)}
          onOpenCodex={() => setShowCodex(true)}
        />
      )}

      {/* Campaign Scenarios Level Selector Modal */}
      {showCampaign && (
        <CampaignSelector
          onClose={() => setShowCampaign(false)}
          onSelectLevel={handleLaunchLevel}
        />
      )}

      {/* Stellar Codex Journal Modal */}
      {showCodex && (
        <Codex
          onClose={() => setShowCodex(false)}
        />
      )}

      {/* Campaign Success & Defeat Overlay Screens */}
      {currentLevelId !== null && (levelObjectiveMet || levelFailed) && (
        <CampaignStatusOverlay
          levelId={currentLevelId}
          status={levelObjectiveMet ? 'win' : 'fail'}
          onNextLevel={currentLevelId < 10 ? handleNextLevel : undefined}
          onRetry={handleRetryLevel}
          onBackToCampaign={() => {
            newGame();
            setShowStart(true);
            setShowCampaign(true);
          }}
        />
      )}

      {/* Subtle discovery dynamic toast notification */}
      {activeToastElement && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 glass-pill px-5 py-2.5 rounded-full border border-cyan-500/20 text-cyan-400 font-bold tracking-[3px] text-[8.5px] sm:text-[9.5px] shadow-[0_0_20px_rgba(34,211,238,0.15)] flex items-center gap-2.5 uppercase font-mono pointer-events-auto cursor-pointer select-none animate-fade-in-up"
          onClick={() => {
            dismissToast();
            setShowCodex(true);
          }}
          title="Click to view Codex Journal log"
        >
          <span className="text-xs">✦</span>
          <span>NEW ELEMENT SYNTHESIZED: {ELEMENTS[activeToastElement].displayName}</span>
          <span className="text-xs">✦</span>
        </div>
      )}

      {/* Subtle instructions */}
      <div className="absolute bottom-[92px] sm:bottom-28 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] opacity-35 tracking-[4px] pointer-events-none whitespace-nowrap uppercase font-mono">
        DRAG TILES TO FUSE • BUILD YOUR STAR
      </div>
    </div>
  );
}
