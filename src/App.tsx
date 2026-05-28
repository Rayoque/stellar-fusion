// src/App.tsx
import React, { useEffect } from 'react';
import { Scene } from './three/Scene';
import { useGameStore } from './game/state';
import { initAudio, startAmbientDrone, playSpawnTick, createSilentWavUrl, updateAmbientDrone } from './audio/synth';
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

  // Nucleation Tutorial state bindings
  const showNucleationTutorial = useGameStore(s => s.showNucleationTutorial);
  const dismissNucleationTutorial = useGameStore(s => s.dismissNucleationTutorial);

  // UI state variables
  const [showStart, setShowStart] = React.useState(true);
  const [showCampaign, setShowCampaign] = React.useState(false);
  const [showCodex, setShowCodex] = React.useState(false);

  useEffect(() => {
    // Initialize audio on first interaction
    const handleFirstInteraction = () => {
      initAudio();
      startAmbientDrone();
      
      // Classic iOS silent-switch ringer bypass hack: playing a brief, programmatically generated 
      // 1-second silent WAV file Blob URL forces mobile Safari to elevate the page's AVAudioSession 
      // category from 'Ambient' (muted by silent switch) to 'Playback' (which overrides the silent switch).
      try {
        const url = createSilentWavUrl();
        const silentAudio = new Audio(url);
        silentAudio.loop = true;
        silentAudio.play().catch(() => {});
      } catch (err) {}
      
      const events = ['click', 'keydown', 'touchstart', 'touchend', 'pointerdown', 'pointerup'];
      for (const ev of events) {
        window.removeEventListener(ev, handleFirstInteraction);
      }
    };

    const events = ['click', 'keydown', 'touchstart', 'touchend', 'pointerdown', 'pointerup'];
    for (const ev of events) {
      window.addEventListener(ev, handleFirstInteraction, { once: true });
    }

    return () => {
      for (const ev of events) {
        window.removeEventListener(ev, handleFirstInteraction);
      }
    };
  }, []);

  // Inactivity/returning player re-onboarding timer (7 days)
  useEffect(() => {
    const lastPlayed = localStorage.getItem('stellar_last_played');
    const now = Date.now();
    if (lastPlayed) {
      const daysPassed = (now - parseInt(lastPlayed, 10)) / (1000 * 60 * 60 * 24);
      if (daysPassed > 7) {
        // Returning player: soft reset audio recommendation and nucleation tutorial
        localStorage.removeItem('stellar_headphones_suggested');
        useGameStore.getState().resetNucleationTutorial();
      }
    }
    localStorage.setItem('stellar_last_played', now.toString());
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

  const [showStatusOverlay, setShowStatusOverlay] = React.useState(false);

  useEffect(() => {
    if (levelObjectiveMet || levelFailed) {
      // Delay showing the campaign success/fail screen by 1400ms so they see the final merge/landing and board composition!
      const timer = setTimeout(() => {
        setShowStatusOverlay(true);
      }, 1400);
      return () => clearTimeout(timer);
    } else {
      setShowStatusOverlay(false);
    }
  }, [levelObjectiveMet, levelFailed]);

  const [delayedShowNucleation, setDelayedShowNucleation] = React.useState(false);

  useEffect(() => {
    if (showNucleationTutorial) {
      // Delay showing the nucleation pop-up by 2500ms so they see the self-fusion play out!
      const timer = setTimeout(() => {
        setDelayedShowNucleation(true);
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      setDelayedShowNucleation(false);
    }
  }, [showNucleationTutorial]);

  // Dynamic Ambient Drone Phase updates
  useEffect(() => {
    // The lessened, somber collapse sound (Bb-minor drone) should ONLY play
    // during the core collapse stage AFTER going past the splash screen for the end game.
    // So it plays when the phase is 'collapse' AND the splash screen is NOT active (endState === null).
    // Conversely, on the splash screen itself (endState !== null), it plays the pre-collapse (Supergiant) sound.
    const isCoreCollapseActive = phase === 'collapse' && endState === null;
    updateAmbientDrone(phase, isCoreCollapseActive);
  }, [phase, endState]);

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

  // Listen for global keys: 'r' / 'R' to reset, 'b' / 'B' to undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)) {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === 'r') {
        if (!showStart) {
          if (currentLevelId !== null) {
            newGame(undefined, currentLevelId);
          } else {
            newGame();
          }
          playSpawnTick();
        }
      }

      if (key === 'b') {
        if (!showStart) {
          useGameStore.getState().undo();
          playSpawnTick(); // Play organic confirmation feedback tick sound
        }
      }

      if (key === 'n') {
        localStorage.removeItem('stellar_headphones_suggested');
        useGameStore.getState().resetNucleationTutorial();
        playSpawnTick(); // Play organic confirmation feedback tick sound
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showStart, currentLevelId, newGame]);

  if (showStart) {
    return (
      <>
        <StartScreen 
          onStart={handleStart} 
          onOpenCampaign={() => setShowCampaign(true)} 
        />
        {showCampaign && (
          <CampaignSelector
            onClose={() => { setShowCampaign(false); window.scrollTo(0, 0); }}
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
          onClose={() => { setShowCampaign(false); window.scrollTo(0, 0); }}
          onSelectLevel={handleLaunchLevel}
        />
      )}

      {/* Stellar Codex Journal Modal */}
      {showCodex && (
        <Codex
          onClose={() => { setShowCodex(false); window.scrollTo(0, 0); }}
        />
      )}

      {/* Campaign Success & Defeat Overlay Screens (delayed for best user experience) */}
      {currentLevelId !== null && showStatusOverlay && (
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

      {/* Nucleation / Pentagon Self-Fusion Catalyst Tutorial Modal (Intuitively freezes active play once after action completes) */}
      {delayedShowNucleation && (
        <div className="fixed inset-0 z-[100] bg-black/35 flex justify-center items-center p-4 animate-fade-in-up">
          <div 
            className="border border-cyan-500/20 p-6 sm:p-8 rounded-[32px] max-w-md w-full text-center shadow-[0_16px_48px_rgba(6,182,212,0.15)] relative overflow-hidden isolate"
            style={{
              background: 'radial-gradient(circle at 0% 0%, rgba(6, 182, 212, 0.12), transparent 50%), radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.08), transparent 50%), rgba(15, 15, 19, 0.96)',
            }}
          >
            <div className="relative z-10 flex flex-col items-center">
              {/* Glowing Pentagon Catalyst SVG - Bigger, double-outline exactly matching the in-game tiles! */}
              <div className="mb-5 flex items-center justify-center select-none">
                <svg width="84" height="84" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_12px_rgba(34,211,238,0.7)] animate-pulse">
                  <polygon 
                    points="32,8 54,23 46,49 18,49 10,23" 
                    fill="rgba(6, 182, 212, 0.12)" 
                    stroke="#22d3ee" 
                    strokeWidth="3" 
                    strokeLinejoin="round"
                  />
                  <polygon 
                    points="32,13 49,25 43,45 21,45 15,25" 
                    fill="none" 
                    stroke="rgba(34, 211, 238, 0.4)" 
                    strokeWidth="1.2" 
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h2 className="text-xl sm:text-2xl font-light tracking-wide mb-4 uppercase text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
                Nucleation Site Catalyst
              </h2>

              <p className="text-white/60 text-xs sm:text-sm leading-relaxed mb-6 font-light font-normal text-center max-w-xs">
                Your star's topology contains 12 pentagonal faces. Under extreme stellar compression, pentagons act as catalytic <span className="text-cyan-400 font-bold">nucleation sites</span>.
              </p>

              <div className="bg-black/45 border border-cyan-500/10 rounded-2xl p-4 mb-6 text-left max-w-xs">
                <span className="text-[8.5px] font-mono font-bold text-cyan-400 tracking-wider block mb-1 uppercase">PHYSICS INSIGHT:</span>
                <p className="text-[10.5px] leading-relaxed text-white/75 font-light">
                  A single <span className="text-[#ff6b6b] font-bold">Hydrogen (H)</span> tile landing on a pentagon will immediately undergo self-fusion into <span className="text-[#feca57] font-bold">Helium (He)</span>—no secondary H tile is required!
                </p>
              </div>

              <button
                onClick={dismissNucleationTutorial}
                className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-full font-bold tracking-[2px] transition-all active:scale-[0.97] text-xs uppercase shadow-[0_4px_16px_rgba(6,182,212,0.25)] cursor-pointer"
              >
                HARNESS CATALYST
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtle discovery dynamic toast notification */}
      {activeToastElement && (
        <div 
          className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none flex justify-center w-full max-w-[90vw] sm:max-w-none"
          style={{ top: 'calc(4.8rem + env(safe-area-inset-top, 0px))' }}
        >
          <div 
            className="glass-pill px-6 py-3 rounded-full border border-cyan-500/20 text-cyan-400 font-bold tracking-[3.5px] text-[8.5px] sm:text-[9.5px] shadow-[0_0_24px_rgba(34,211,238,0.15)] flex items-center justify-center text-center gap-2.5 uppercase font-mono pointer-events-auto cursor-pointer select-none animate-fade-in-up"
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
        </div>
      )}
    </div>
  );
}
