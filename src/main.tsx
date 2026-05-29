// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useGameStore } from './game/state';

// Extend the Window interface for TypeScript type safety
declare global {
  interface Window {
    enableDevMode: () => void;
    disableDevMode: () => void;
    gameStore: typeof useGameStore;
    _openDebugPanel?: () => void;
    _closeDebugPanel?: () => void;
  }
}

// Expose store globally
window.gameStore = useGameStore;

// Define helper to enable dev mode
window.enableDevMode = () => {
  localStorage.setItem('stellar_debug', 'true');
  console.clear();
  console.log(
    '%c☄️ DEVELOPER MODE ACTIVATED ☄️\n\n' +
    '%cThe dev tools are now live!\n' +
    '1. Press the backtick key (`) in the game to open/close the Debug Panel.\n' +
    '2. Inspect or manipulate the live game state using %cwindow.gameStore.getState()%c.\n' +
    '3. To turn off: run %cdisableDevMode()%c in this console.\n',
    'color: #f59e0b; font-weight: bold; font-size: 14px; font-family: monospace;',
    'color: #fef3c7; font-size: 11px; font-family: monospace;',
    'color: #38bdf8; font-weight: bold; font-family: monospace;',
    'color: #fef3c7; font-family: monospace;',
    'color: #38bdf8; font-weight: bold; font-family: monospace;',
    'color: #fef3c7; font-family: monospace;'
  );

  // Directly open the React DebugPanel if the App is active/mounted!
  if (typeof window._openDebugPanel === 'function') {
    window._openDebugPanel();
  }
};

// Define helper to disable dev mode
window.disableDevMode = () => {
  localStorage.removeItem('stellar_debug');
  console.log(
    '%c☄️ Developer Mode Disabled %c\n' +
    'Dev tools are closed and local storage has been cleared.',
    'color: #ef4444; font-weight: bold; font-size: 12px; font-family: monospace;',
    'color: #fca5a5; font-size: 11px; font-family: monospace;'
  );

  // Directly close the React DebugPanel if the App is active/mounted!
  if (typeof window._closeDebugPanel === 'function') {
    window._closeDebugPanel();
  }
};

// Log greeting on load
if (localStorage.getItem('stellar_debug') === 'true') {
  console.log(
    '%c☄️ STELLAR FUSION - DEV PLAYGROUND ACTIVE ☄️\n' +
    '%c- Press backtick (`) in-game to toggle the interactive Debug Panel.\n' +
    '- Access the live Zustand store via `window.gameStore.getState()`.\n' +
    '- To disable dev tools: type `disableDevMode()` and reload.',
    'color: #fbbf24; font-weight: bold; font-size: 12px; font-family: monospace;',
    'color: #fef3c7; font-size: 10px; font-family: monospace;'
  );
} else {
  console.log(
    '%c☄️ Stellar Fusion (Open Source) ☄️\n' +
    '%cInterested in stellar physics or debugging? Type %cenableDevMode()%c in this console to unlock the interactive Debug Panel!',
    'color: #38bdf8; font-weight: bold; font-size: 11px; font-family: monospace;',
    'color: #93c5fd; font-size: 10px; font-family: monospace;',
    'color: #34d399; font-weight: bold; font-family: monospace;',
    'color: #93c5fd; font-family: monospace;'
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

