// src/App.tsx
import React, { useEffect } from 'react';
import { Scene } from './three/Scene';
import { useGameStore } from './game/state';
import { initAudio, startAmbientDrone, playSpawnTick, updateAmbientDrone, resumeAmbientDrone, createSilentWavUrl, playSupernova, playShellShed } from './audio/synth';
import { HUD } from './ui/HUD';
import { EndScreen } from './ui/EndScreen';
import { StartScreen } from './ui/StartScreen';
import { TouchIndicator } from './ui/TouchIndicator';
import { PauseMenu } from './ui/PauseMenu';
import { CampaignSelector } from './ui/CampaignSelector';
import { Codex } from './ui/Codex';
import { CampaignStatusOverlay } from './ui/CampaignStatusOverlay';
import { CampaignObjectiveOverlay } from './ui/CampaignObjectiveOverlay';
import { DebugPanel } from './ui/DebugPanel';
import { AutoPlayerDriver } from './game/AutoPlayerDriver';
import { LEVELS } from './game/levels';
import { ELEMENTS } from './game/elements';
import type { ElementSymbol } from './game/types';
import { AstroFe56Overlay } from './ui/AstroFe56Overlay';
import { ScenarioEditor } from './ui/ScenarioEditor';

export default function App() {
  const newGame = useGameStore(s => s.newGame);
  const endState = useGameStore(s => s.endState);
  const phase = useGameStore(s => s.phase);
  const starMass = useGameStore(s => s.starMass);
  const turn = useGameStore(s => s.turn);
  const elementCounts = useGameStore(s => s.elementCounts);
  const score = useGameStore(s => s.score);
  const highScore = useGameStore(s => s.highScore);
  const astrophysicistMode = useGameStore(s => s.astrophysicistMode);
  const isPaused = useGameStore(s => s.isPaused);
  const setPaused = useGameStore(s => s.setPaused);

  // Campaign state bindings
  const currentLevelId = useGameStore(s => s.currentLevelId);
  const levelObjectiveMet = useGameStore(s => s.levelObjectiveMet);
  const levelFailed = useGameStore(s => s.levelFailed);
  const activeToastElement = useGameStore(s => s.activeToastElement);
  const dismissToast = useGameStore(s => s.dismissToast);
  const systemToast = useGameStore(s => s.systemToast);
  const dismissSystemToast = useGameStore(s => s.dismissSystemToast);

  // Nucleation Tutorial state bindings
  const showNucleationTutorial = useGameStore(s => s.showNucleationTutorial);
  const dismissNucleationTutorial = useGameStore(s => s.dismissNucleationTutorial);
  
  const hasManuallyZoomed = useGameStore(s => s.hasManuallyZoomed);
  const isSphereTooBig = useGameStore(s => s.isSphereTooBig);
  const showFe56Splash = useGameStore(s => s.showFe56Splash);
  const tilesCount = useGameStore(s => s.tiles.size);
  const isEditorMode = useGameStore(s => s.isEditorMode);
  const isTestingCustomScenario = useGameStore(s => s.isTestingCustomScenario);

  const [showAstroOverlay, setShowAstroOverlay] = React.useState(false);

  useEffect(() => {
    if (showFe56Splash) {
      const timer = setTimeout(() => {
        setShowAstroOverlay(true);
      }, 1400);
      return () => clearTimeout(timer);
    } else {
      setShowAstroOverlay(false);
    }
  }, [showFe56Splash]);

  // UI state variables
  const [showStart, setShowStart] = React.useState(true);
  const [showCampaign, setShowCampaign] = React.useState(false);
  const [showCodex, setShowCodex] = React.useState(false);
  const [codexInitialElement, setCodexInitialElement] = React.useState<ElementSymbol | null>(null);
  const [debugOpen, setDebugOpen] = React.useState(false);

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

  // Auto-dismiss the system toast after 3.5 seconds
  useEffect(() => {
    if (systemToast) {
      const timer = setTimeout(() => {
        dismissSystemToast();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [systemToast, dismissSystemToast]);

  // End-of-run ceremony: the death of the star plays out (ejecta, boom, flash)
  // BEFORE the end card arrives. The card is the epilogue, not the event.
  const [endScreenVisible, setEndScreenVisible] = React.useState(false);
  const [flashOn, setFlashOn] = React.useState(false);

  useEffect(() => {
    if (!endState) {
      setEndScreenVisible(false);
      setFlashOn(false);
      return;
    }

    const violent = endState === 'neutron_star' || endState === 'black_hole';
    const gentle = endState === 'white_dwarf' || endState === 'failed_collapse';
    const timers: ReturnType<typeof setTimeout>[] = [];

    // The sound of the death itself — in sandbox AND campaign (same physics).
    if (violent) {
      playSupernova();
      setFlashOn(true);
      timers.push(setTimeout(() => setFlashOn(false), 160));
    } else if (gentle) {
      playShellShed();
    }

    // The end card waits for the ceremony (sandbox only; campaign has its own overlay).
    if (currentLevelId === null) {
      const delay = violent ? 3000 : gentle ? 2600 : 500; // 'jammed' is quick
      timers.push(setTimeout(() => setEndScreenVisible(true), delay));
    }

    return () => timers.forEach(clearTimeout);
  }, [endState, currentLevelId]);

  const [showStatusOverlay, setShowStatusOverlay] = React.useState(false);
  const [showObjectiveLevelId, setShowObjectiveLevelId] = React.useState<number | null>(null);
  // Tracks whether the objective overlay is the game-start briefing (plays a tick on dismiss)
  // vs a mid-game reopen from the HUD (silent on dismiss).
  const [objectiveIsBriefing, setObjectiveIsBriefing] = React.useState(false);

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

  const [shouldShowZoomTooltip, setShouldShowZoomTooltip] = React.useState(false);

  useEffect(() => {
    const canShow = isSphereTooBig && 
                    !hasManuallyZoomed && 
                    !showStart && 
                    !isPaused && 
                    !showCampaign && 
                    !showCodex && 
                    !delayedShowNucleation && 
                    showObjectiveLevelId === null;

    if (canShow) {
      const timer = setTimeout(() => {
        setShouldShowZoomTooltip(true);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShouldShowZoomTooltip(false);
    }
  }, [isSphereTooBig, hasManuallyZoomed, showStart, isPaused, showCampaign, showCodex, delayedShowNucleation, showObjectiveLevelId]);


  // Dynamic Ambient Drone Phase updates
  useEffect(() => {
    // The lessened, somber collapse sound (Bb-minor drone) should ONLY play
    // during the core collapse stage AFTER going past the splash screen for the end game.
    // So it plays when the phase is 'collapse' AND the splash screen is NOT active (endState === null).
    // Conversely, on the splash screen itself (endState !== null), it plays the pre-collapse (Supergiant) sound.
    const isCoreCollapseActive = phase === 'collapse' && endState === null;
    const isBoardTense = tilesCount >= 28;
    updateAmbientDrone(phase, isCoreCollapseActive, isBoardTense);
  }, [phase, endState, tilesCount]);

  // Re-assert drone playback when returning to the foreground / after an OS audio
  // interruption (app-switch, lock-unlock, Bluetooth handoff, phone call).
  //
  // visibility/focus/pageshow handle desktop, but iOS Safari will NOT resume a
  // suspended AudioContext outside a user gesture — so those events alone leave the
  // drone silent after an app-switch. The fix: also resume on the next real tap/key
  // (a genuine gesture), which always succeeds. resumeAmbientDrone() is a cheap no-op
  // when the context is already running, so attaching it to pointer events is fine.
  useEffect(() => {
    const onWake = () => {
      if (document.visibilityState === 'visible') resumeAmbientDrone();
    };
    const onGesture = () => resumeAmbientDrone();

    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    window.addEventListener('pageshow', onWake);
    // Persistent (not once) — every app-switch needs a fresh gesture-driven resume.
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('touchend', onGesture);
    window.addEventListener('keydown', onGesture);
    return () => {
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
      window.removeEventListener('pageshow', onWake);
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('touchend', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
  }, []);

  const handleStart = () => {
    // Resume a saved standard/endless game if one exists; otherwise fresh.
    if (!useGameStore.getState().loadSavedGame(false)) {
      newGame();
    }
    setShowStart(false);
    // Play a subtle spawn tick on start
    setTimeout(() => playSpawnTick(), 120);
  };

  const handleStartAstro = () => {
    // Resume a saved Astrophysicist game if one exists; otherwise fresh.
    if (!useGameStore.getState().loadSavedGame(true)) {
      newGame(undefined, undefined, true);
    }
    setShowStart(false);
    setTimeout(() => playSpawnTick(), 120);
  };

  const handlePlayAgain = () => {
    // EndScreen only shows for open-ended modes; restart in the SAME mode + fresh save.
    const isAstro = useGameStore.getState().astrophysicistMode;
    useGameStore.getState().clearSavedGame(isAstro);
    newGame(undefined, undefined, isAstro);
    setShowStart(false);
  };

  const handleMainMenu = () => {
    // Persist the current open-ended game before wiping the board for the menu.
    useGameStore.getState().saveCurrentGame();
    setShowStart(true);
    setPaused(false);
    newGame();
  };

  const handleLaunchLevel = (levelId: number) => {
    setShowStatusOverlay(false); // Instantly hide stale overlay
    newGame(undefined, levelId);
    setShowCampaign(false);
    setShowStart(false);
    const completed = useGameStore.getState().completedLevels;
    if (!completed.includes(levelId)) {
      setObjectiveIsBriefing(true);
      setShowObjectiveLevelId(levelId);
    } else {
      setShowObjectiveLevelId(null);
    }
    setTimeout(() => playSpawnTick(), 120);
  };

  const handleRetryLevel = () => {
    if (currentLevelId !== null) {
      setShowStatusOverlay(false); // Instantly hide stale overlay
      newGame(undefined, currentLevelId);
      const completed = useGameStore.getState().completedLevels;
      if (!completed.includes(currentLevelId)) {
        setObjectiveIsBriefing(true);
        setShowObjectiveLevelId(currentLevelId);
      } else {
        setShowObjectiveLevelId(null);
      }
    }
  };

  const handleNextLevel = () => {
    if (currentLevelId !== null && currentLevelId < LEVELS.length) {
      setShowStatusOverlay(false); // Instantly hide stale overlay
      newGame(undefined, currentLevelId + 1);
      const completed = useGameStore.getState().completedLevels;
      if (!completed.includes(currentLevelId + 1)) {
        setObjectiveIsBriefing(true);
        setShowObjectiveLevelId(currentLevelId + 1);
      } else {
        setShowObjectiveLevelId(null);
      }
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
            // Respect astrophysicist mode on hotkey reload, and wipe its save.
            const isAstro = useGameStore.getState().astrophysicistMode;
            useGameStore.getState().clearSavedGame(isAstro);
            newGame(undefined, undefined, isAstro);
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

  // Hidden debug panel toggle: backtick (`), gated by localStorage.stellar_debug === 'true'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '`') return;
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)) {
        return;
      }
      if (localStorage.getItem('stellar_debug') !== 'true') return;
      setDebugOpen(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);

    // Mobile has no backtick key, so a hidden gesture opens the dev menu on touch:
    // 5 quick taps in the top-right corner (over the score readout). This also sets
    // the debug flag, so it's the one-time unlock on a phone.
    let taps: number[] = [];
    const handleSecretTap = (e: PointerEvent) => {
      const inCorner = e.clientX > window.innerWidth - 90 && e.clientY < 90;
      if (!inCorner) return;
      const now = Date.now();
      taps = taps.filter(t => now - t < 1500);
      taps.push(now);
      if (taps.length >= 5) {
        taps = [];
        localStorage.setItem('stellar_debug', 'true');
        setDebugOpen(true);
      }
    };
    window.addEventListener('pointerdown', handleSecretTap, { capture: true });

    // Expose direct React state triggers to window for immediate console feedback
    (window as any)._openDebugPanel = () => setDebugOpen(true);
    (window as any)._closeDebugPanel = () => setDebugOpen(false);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handleSecretTap, { capture: true } as any);
      delete (window as any)._openDebugPanel;
      delete (window as any)._closeDebugPanel;
    };
  }, []);

  const prevEditorModeRef = React.useRef(isEditorMode);
  useEffect(() => {
    if (isEditorMode) {
      setShowStart(false);
    } else if (prevEditorModeRef.current && !isEditorMode && !isTestingCustomScenario) {
      setShowStart(true);
    }
    prevEditorModeRef.current = isEditorMode;
  }, [isEditorMode, isTestingCustomScenario]);

  if (showStart) {
    return (
      <>
        <StartScreen 
          onStart={handleStart} 
          onOpenCampaign={() => setShowCampaign(true)} 
          onStartAstro={handleStartAstro}
        />
        {showCampaign && (
          <CampaignSelector
            onClose={() => { setShowCampaign(false); window.scrollTo(0, 0); }}
            onSelectLevel={handleLaunchLevel}
          />
        )}
        {debugOpen && (
          <DebugPanel
            onClose={() => setDebugOpen(false)}
            onJumpAstro={() => { handleStartAstro(); setDebugOpen(false); }}
            onJumpLevel={(id) => { handleLaunchLevel(id); setDebugOpen(false); }}
          />
        )}
      </>
    );
  }

  return (
    <div className="relative w-full h-screen h-[100dvh] overflow-hidden bg-[#050508] text-white font-sans select-none antialiased">
      <Scene />
      <TouchIndicator />
      <AutoPlayerDriver />

      {!isEditorMode && (
        <HUD
          phase={phase}
          starMass={starMass}
          turn={turn}
          elementCounts={elementCounts}
          onOpenMenu={() => setPaused(true)}
          onOpenCodex={() => setShowCodex(true)}
          onOpenObjectives={currentLevelId !== null ? () => { setObjectiveIsBriefing(false); setShowObjectiveLevelId(currentLevelId); } : undefined}
          showZoomHint={shouldShowZoomTooltip}
        />
      )}

      {isEditorMode && <ScenarioEditor />}

      {isTestingCustomScenario && (
        <div className="fixed right-4 z-[100] top-[calc(1.4rem+env(safe-area-inset-top,0px))]">
          <button
            onClick={() => {
              const setEditorMode = useGameStore.getState().setEditorMode;
              setEditorMode(true);
            }}
            className="glass-pill px-4 sm:px-6 py-2 sm:py-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold font-mono tracking-[1.5px] sm:tracking-[2px] text-[8.5px] sm:text-[10px] uppercase shadow-[0_0_24px_rgba(16,185,129,0.25)] cursor-pointer active:scale-95 transition-all"
          >
            Return to Editor
          </button>
        </div>
      )}

      {/* Supernova white-out: a beat of pure light at the instant of collapse */}
      <div
        className={`fixed inset-0 z-[60] pointer-events-none bg-white transition-opacity ease-out ${
          flashOn ? 'opacity-90 duration-100' : 'opacity-0 duration-[900ms]'
        }`}
      />

      {/* Standard Sandbox End Screen — arrives after the ceremony, not instead of it */}
      {endScreenVisible && endState && currentLevelId === null && (
        <EndScreen
          endState={endState}
          starMass={starMass}
          elementCounts={elementCounts}
          score={score}
          highScore={highScore}
          astrophysicistMode={astrophysicistMode}
          onPlayAgain={handlePlayAgain}
          onMainMenu={handleMainMenu}
        />
      )}

      {/* Pause Menu Overlay */}
      {isPaused && (
        <PauseMenu
          onResume={() => setPaused(false)}
          onMainMenu={handleMainMenu}
          onOpenCodex={() => setShowCodex(true)}
          onOpenCampaign={currentLevelId !== null ? () => setShowCampaign(true) : undefined}
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
          initialElement={codexInitialElement}
          onClose={() => { setShowCodex(false); setCodexInitialElement(null); window.scrollTo(0, 0); }}
        />
      )}

      {/* Scenario Briefing Objective Pop-up (translucent, lets player see star in background!) */}
      {showObjectiveLevelId !== null && (
        <CampaignObjectiveOverlay
          levelId={showObjectiveLevelId}
          onStart={() => {
            const wasBriefing = objectiveIsBriefing;
            setShowObjectiveLevelId(null);
            setObjectiveIsBriefing(false);
            if (wasBriefing) playSpawnTick();
          }}
        />
      )}

      {/* Campaign Success & Defeat Overlay Screens (delayed for best user experience) */}
      {currentLevelId !== null && showStatusOverlay && (
        <CampaignStatusOverlay
          levelId={currentLevelId}
          status={levelObjectiveMet ? 'win' : 'fail'}
          onNextLevel={isTestingCustomScenario ? undefined : (currentLevelId < LEVELS.length ? handleNextLevel : undefined)}
          onRetry={handleRetryLevel}
          onBackToCampaign={
            isTestingCustomScenario
              ? () => {
                  setShowStatusOverlay(false);
                  const setEditorMode = useGameStore.getState().setEditorMode;
                  setEditorMode(true);
                }
              : () => {
                  setShowStatusOverlay(false); // Instantly hide stale overlay
                  newGame();
                  setShowStart(true);
                  setShowCampaign(true);
                }
          }
        />
      )}

      {/* Astrophysicist Mode Iron-56 Synthesis Congratulations Overlay */}
      {showAstroOverlay && (
        <AstroFe56Overlay
          onContinue={() => {
            useGameStore.setState({ 
              showFe56Splash: false,
              levelObjectiveMet: false
            });
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


      {/* System Warning Toast (e.g. autoplay high score tracking disabled) */}
      {systemToast && !showStart && !isPaused && !showCampaign && !showCodex && !delayedShowNucleation && showObjectiveLevelId === null && !showStatusOverlay && (
        <div 
          className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none flex justify-center w-full max-w-[90vw] sm:max-w-none hud-system-toast-container"
        >
          <div 
            className="glass-pill px-6 py-3 rounded-full border border-amber-500/30 text-amber-400 font-bold tracking-[2px] text-[8px] sm:text-[9px] shadow-[0_0_24px_rgba(245,158,11,0.2)] flex items-center justify-center text-center gap-2.5 uppercase font-mono pointer-events-auto cursor-pointer select-none animate-fade-in-up"
            onClick={dismissSystemToast}
            title="Dismiss warning"
          >
            <span className="text-[10px] text-amber-500 animate-pulse">⚠️</span>
            <span>{systemToast}</span>
            <span className="text-[10px] text-amber-500 animate-pulse">⚠️</span>
          </div>
        </div>
      )}

      {/* Subtle discovery dynamic toast notification gated to avoid overlaps */}
      {activeToastElement && !showStart && !isPaused && !showCampaign && !showCodex && !delayedShowNucleation && showObjectiveLevelId === null && !showStatusOverlay && (
        <div 
          className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none flex justify-center w-full max-w-[90vw] sm:max-w-none hud-toast-container"
        >
          <div 
            className="glass-pill px-6 py-3 rounded-full border border-cyan-500/20 text-cyan-400 font-bold tracking-[3.5px] text-[8.5px] sm:text-[9.5px] shadow-[0_0_24px_rgba(34,211,238,0.15)] flex items-center justify-center text-center gap-2.5 uppercase font-mono pointer-events-auto cursor-pointer select-none animate-fade-in-up"
            onClick={() => {
              setCodexInitialElement(activeToastElement);
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

      {debugOpen && (
        <DebugPanel
          onClose={() => setDebugOpen(false)}
          onJumpAstro={() => { handleStartAstro(); setDebugOpen(false); }}
          onJumpLevel={(id) => { handleLaunchLevel(id); setDebugOpen(false); }}
        />
      )}
    </div>
  );
}
