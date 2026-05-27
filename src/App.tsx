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
    <div className="relative w-full h-screen h-[100dvh] overflow-hidden bg-[#050508] text-white font-sans select-none antialiased">
      <Scene />
      <TouchIndicator />

      <HUD
        phase={phase}
        starMass={starMass}
        turn={turn}
        elementCounts={elementCounts}
        onOpenMenu={() => setPaused(true)}
      />

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
      <div className="absolute bottom-[92px] sm:bottom-28 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] opacity-35 tracking-[4px] pointer-events-none whitespace-nowrap uppercase font-mono">
        DRAG TILES TO FUSE • BUILD YOUR STAR
      </div>
    </div>
  );
}
