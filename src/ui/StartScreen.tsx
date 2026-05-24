// src/ui/StartScreen.tsx
import React from 'react';

interface StartScreenProps {
  onStart: () => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f] text-white">
      <div className="max-w-md text-center px-6">
        <div className="mb-4 text-[11px] tracking-[6px] text-white/40">A STELLAR NUCLEOSYNTHESIS PUZZLE</div>
        
        <h1 className="text-7xl font-semibold tracking-[-3.5px] mb-3">STELLAR FUSION</h1>
        
        <p className="text-xl text-white/70 mb-10">
          Drag elements across a soccer-ball star.<br />Fuse according to real stellar physics.
        </p>

        <button
          onClick={onStart}
          className="group px-10 py-4 bg-white text-black text-lg font-semibold tracking-[1.5px] rounded-3xl hover:bg-white/95 active:scale-[0.985] transition-all flex items-center gap-3 mx-auto"
        >
          BEGIN FUSION
          <span className="group-hover:translate-x-0.5 transition">→</span>
        </button>

        <div className="mt-12 text-[10px] text-white/40 tracking-widest">
          MVP • TRUNCATED ICOSAHEDRON • 8 ELEMENTS • REAL FUSION RULES
        </div>
      </div>
    </div>
  );
}
