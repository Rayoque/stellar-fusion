// Single source of truth for keyboard shortcuts. The debug panel renders this
// list, so documenting a new shortcut here keeps the on-screen help in sync.
export interface Shortcut {
  key: string;
  desc: string;
}

export const SHORTCUTS: Shortcut[] = [
  { key: 'R', desc: 'Restart current run' },
  { key: 'B', desc: 'Undo last move' },
  { key: 'N', desc: 'Reset onboarding (headphones + tutorial)' },
  { key: 'P', desc: 'Launch Astrophysicist Mode (start screen, if unlocked)' },
  { key: 'W A S D / Arrows', desc: 'Rotate camera' },
  { key: '`', desc: 'Toggle debug panel (when debug enabled)' },
];
