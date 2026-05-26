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

export default function App() {
  const newGame = useGameStore(s => s.newGame);
  const endState = useGameStore(s => s.endState);
  const phase = useGameStore(s => s.phase);
  const starMass = useGameStore(s => s.starMass);
  const turn = useGameStore(s => s.turn);
  const elementCounts = useGameStore(s => s.elementCounts);
  const isAnimating = useGameStore(s => s.isAnimating);
  const isPaused = useGameStore(s => s.isPaused);
  const setPaused = useGameStore(s => s.setPaused);

  const [showStart, setShowStart] = React.useState(true);

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

  if (showStart) {
    return <StartScreen onStart={handleStart} />;
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0a0a0f] text-white font-mono">
      <Scene />
      <TouchIndicator />

      <HUD
        phase={phase}
        starMass={starMass}
        turn={turn}
        elementCounts={elementCounts}
        onOpenMenu={() => setPaused(true)}
      />

      {/* Floating Menu Button */}
      <button
        onClick={() => setPaused(true)}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/40 hover:bg-white/15 border border-white/10 hover:border-white/20 backdrop-blur-md px-5 py-2.5 rounded-xl text-[10px] tracking-[3px] font-semibold uppercase active:scale-95 transition-all flex items-center gap-2 pointer-events-auto"
      >
        MENU
      </button>

      {endState && (
        <EndScreen
          endState={endState}
          starMass={starMass}
          elementCounts={elementCounts}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {isPaused && (
        <PauseMenu
          onResume={() => setPaused(false)}
          onMainMenu={handleMainMenu}
        />
      )}

      {/* Subtle instructions */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs opacity-40 tracking-[3px]">
        DRAG TILES TO FUSE • BUILD YOUR STAR
      </div>
    </div>
  );
}
