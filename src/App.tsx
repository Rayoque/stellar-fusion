// src/App.tsx
import React, { useEffect } from 'react';
import { Scene } from './three/Scene';
import { useGameStore } from './game/state';
import { initAudio, startAmbientDrone, playSpawnTick } from './audio/synth';
import { HUD } from './ui/HUD';
import { EndScreen } from './ui/EndScreen';
import { StartScreen } from './ui/StartScreen';
import { TouchIndicator } from './ui/TouchIndicator';

export default function App() {
  const newGame = useGameStore(s => s.newGame);
  const endState = useGameStore(s => s.endState);
  const phase = useGameStore(s => s.phase);
  const starMass = useGameStore(s => s.starMass);
  const turn = useGameStore(s => s.turn);
  const elementCounts = useGameStore(s => s.elementCounts);
  const isAnimating = useGameStore(s => s.isAnimating);

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
      />

      {endState && (
        <EndScreen
          endState={endState}
          starMass={starMass}
          elementCounts={elementCounts}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {/* Subtle instructions */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs opacity-40 tracking-[3px]">
        DRAG TILES TO FUSE • BUILD YOUR STAR
      </div>
    </div>
  );
}
