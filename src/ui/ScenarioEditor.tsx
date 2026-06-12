// src/ui/ScenarioEditor.tsx
import React from 'react';
import { useGameStore } from '../game/state';
import type { ElementSymbol, LevelObjective, Level } from '../game/types';
import { playSpawnTick } from '../audio/synth';

export function ScenarioEditor() {
  const isEditorMode = useGameStore(s => s.isEditorMode);
  const setEditorMode = useGameStore(s => s.setEditorMode);
  const editorBrush = useGameStore(s => s.editorBrush);
  const setEditorBrush = useGameStore(s => s.setEditorBrush);
  const metadata = useGameStore(s => s.editorLevelMetadata);
  const updateEditorMetadata = useGameStore(s => s.updateEditorMetadata);
  const customScenarios = useGameStore(s => s.customScenarios) || [];
  const loadScenarioForEditing = useGameStore(s => s.loadScenarioForEditing);
  const deleteScenario = useGameStore(s => s.deleteScenario);
  const publishScenario = useGameStore(s => s.publishScenario);
  const saveEditorDraft = useGameStore(s => s.saveEditorDraft);
  const newGame = useGameStore(s => s.newGame);

  const [activeTab, setActiveTab] = React.useState<'metadata' | 'objectives' | 'saved'>('metadata');
  // Drawer state: the panel slides away so the sphere is paintable on small
  // screens. Tap outside closes it; a floating tab brings it back.
  const [panelOpen, setPanelOpen] = React.useState(true);

  if (!isEditorMode) return null;

  const handleTest = () => {
    saveEditorDraft();
    // Launch game in playtesting mode (levelId 9999)
    newGame(undefined, 9999);
    useGameStore.setState({ isEditorMode: false, isTestingCustomScenario: true });
    playSpawnTick();
  };

  const handlePublish = () => {
    publishScenario();
    alert(`"${metadata.title}" has been saved & published! You can now play it from the Custom Scenarios tab in the Campaign Selection menu.`);
  };

  const handleNewScenario = () => {
    if (confirm('Create a new blank scenario? This will clear the current editor board.')) {
      // Clear draft in localStorage
      localStorage.removeItem('stellar_editor_draft');
      // Reload draft state
      useGameStore.getState().loadEditorDraft();
    }
  };

  const handleAddObjective = () => {
    const newObj: LevelObjective = {
      type: 'has_element',
      element: 'He',
      count: 1,
      hint: 'Synthesize Helium',
    };
    updateEditorMetadata({
      objectives: [...metadata.objectives, newObj]
    });
  };

  const handleRemoveObjective = (index: number) => {
    const nextObjs = metadata.objectives.filter((_, i) => i !== index);
    updateEditorMetadata({ objectives: nextObjs });
  };

  const handleObjectiveChange = (index: number, fields: Partial<LevelObjective>) => {
    const nextObjs = metadata.objectives.map((obj, i) => {
      if (i === index) {
        return { ...obj, ...fields };
      }
      return obj;
    });
    updateEditorMetadata({ objectives: nextObjs });
  };

  const brushBtn = (type: typeof editorBrush, label: string, colorClass: string, bgClass: string) => {
    const isSelected = editorBrush === type;
    return (
      <button
        onClick={() => setEditorBrush(type)}
        className={`px-3 py-2 rounded-xl border text-[10px] font-mono font-bold tracking-wider uppercase transition-all active:scale-[0.97] cursor-pointer flex flex-col items-center justify-center text-center gap-1 min-w-[70px] ${
          isSelected
            ? `${bgClass} border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.25)]`
            : 'bg-black/45 border-white/5 text-white/55 hover:text-white/80 hover:border-white/12'
        }`}
      >
        <span className={`w-3 h-3 rounded-full ${colorClass}`} />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Tap-outside-to-dismiss backdrop (small screens only — on desktop the
          panel and the sphere coexist). Invisible: the sphere stays in view,
          and the dismissing tap never paints a face. */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-[140] md:hidden"
          onPointerDown={() => setPanelOpen(false)}
        />
      )}

      {/* Floating reopen tab while the drawer is tucked away */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-[150] pl-2 pr-3 py-4 rounded-r-2xl border border-l-0 border-emerald-500/30 bg-[#0c0c10]/90 backdrop-blur-md text-emerald-300 shadow-[0_8px_24px_rgba(0,0,0,0.5)] cursor-pointer active:scale-95 transition-all flex flex-col items-center gap-1.5 animate-fade-in-up"
          title="Open the scenario editor panel"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className="text-[8px] font-mono font-bold tracking-[2px] uppercase" style={{ writingMode: 'vertical-rl' }}>Editor</span>
        </button>
      )}

      <div className={`fixed top-4 left-4 z-[150] w-[340px] max-w-[88vw] max-h-[92vh] overflow-hidden rounded-[24px] border border-white/10 bg-[#0c0c10]/95 backdrop-blur-lg flex flex-col text-white shadow-[0_16px_48px_rgba(0,0,0,0.8)] select-none transition-transform duration-300 ease-out ${panelOpen ? 'translate-x-0' : '-translate-x-[120%] pointer-events-none'}`}>

      {/* Header */}
      <div className="p-4 border-b border-white/5 flex flex-col gap-1 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono tracking-[3px] text-cyan-400 font-bold uppercase">Stellar Core Builder</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPanelOpen(false)}
              className="text-white/40 hover:text-white cursor-pointer px-1.5 py-0.5 rounded hover:bg-white/5 flex items-center gap-1 text-[10px]"
              title="Tuck the panel away to paint the sphere (tap the sphere area or this button)"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Hide
            </button>
            <button
              onClick={() => setEditorMode(false)}
              className="text-white/40 hover:text-white text-xs cursor-pointer px-1.5 py-0.5 rounded hover:bg-white/5"
            >
              Exit
            </button>
          </div>
        </div>
        <h2 className="text-sm font-semibold tracking-wide uppercase">Scenario Editor</h2>
      </div>

      {/* Action Buttons Hub */}
      <div className="px-4 py-3 border-b border-white/5 flex gap-2 flex-shrink-0 bg-white/2">
        <button
          onClick={handleTest}
          className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold tracking-wider text-[10px] uppercase rounded-xl transition-all active:scale-[0.97] cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
          title="Playtest the scenario on the 3D sphere"
        >
          Test Scenario
        </button>
        <button
          onClick={handlePublish}
          className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold tracking-wider text-[10px] uppercase rounded-xl transition-all active:scale-[0.97] cursor-pointer shadow-[0_4px_12px_rgba(6,182,212,0.2)]"
          title="Save/Publish scenario to campaign map"
        >
          Save / Publish
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-2 border-b border-white/5 flex gap-4 text-[10px] font-mono font-bold tracking-wider uppercase flex-shrink-0">
        <button
          onClick={() => setActiveTab('metadata')}
          className={`pb-2 transition-colors cursor-pointer relative ${activeTab === 'metadata' ? 'text-cyan-400' : 'text-white/40 hover:text-white/70'}`}
        >
          Properties
          {activeTab === 'metadata' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />}
        </button>
        <button
          onClick={() => setActiveTab('objectives')}
          className={`pb-2 transition-colors cursor-pointer relative ${activeTab === 'objectives' ? 'text-cyan-400' : 'text-white/40 hover:text-white/70'}`}
        >
          Objectives
          {activeTab === 'objectives' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />}
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`pb-2 transition-colors cursor-pointer relative ${activeTab === 'saved' ? 'text-cyan-400' : 'text-white/40 hover:text-white/70'}`}
        >
          Library ({customScenarios.length})
          {activeTab === 'saved' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4 min-h-0">
        
        {activeTab === 'metadata' && (
          <div className="flex flex-col gap-3.5 text-xs">
            
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-mono tracking-widest text-white/40 uppercase">Title</label>
              <input
                type="text"
                value={metadata.title}
                onChange={e => updateEditorMetadata({ title: e.target.value })}
                className="w-full bg-black/45 border border-white/5 hover:border-white/10 focus:border-cyan-500/55 rounded-xl px-3 py-2 text-white placeholder-white/20 outline-none transition-colors"
                placeholder="Scenario title"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-mono tracking-widest text-white/40 uppercase">Author</label>
              <input
                type="text"
                value={metadata.author}
                onChange={e => updateEditorMetadata({ author: e.target.value })}
                className="w-full bg-black/45 border border-white/5 hover:border-white/10 focus:border-cyan-500/55 rounded-xl px-3 py-2 text-white outline-none transition-colors"
                placeholder="Architect name"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-mono tracking-widest text-white/40 uppercase">Description</label>
              <textarea
                value={metadata.description}
                onChange={e => updateEditorMetadata({ description: e.target.value })}
                className="w-full h-16 bg-black/45 border border-white/5 hover:border-white/10 focus:border-cyan-500/55 rounded-xl px-3 py-2 text-white outline-none resize-none transition-colors custom-scrollbar"
                placeholder="Stellar briefing notes..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono tracking-widest text-white/40 uppercase">Max Turns</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={metadata.maxTurns}
                  onChange={e => updateEditorMetadata({ maxTurns: parseInt(e.target.value, 10) || 10 })}
                  className="w-full bg-black/45 border border-white/5 hover:border-white/10 focus:border-cyan-500/55 rounded-xl px-3 py-2 text-white outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono tracking-widest text-white/40 uppercase">Par Moves</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={metadata.parMoves}
                  onChange={e => updateEditorMetadata({ parMoves: parseInt(e.target.value, 10) || 5 })}
                  className="w-full bg-black/45 border border-white/5 hover:border-white/10 focus:border-cyan-500/55 rounded-xl px-3 py-2 text-white outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-mono tracking-widest text-white/40 uppercase">Star Mass</label>
                <span className="text-[10px] font-mono text-cyan-400 font-bold">{metadata.starMass.toFixed(1)} M☉</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={0.5}
                value={metadata.starMass}
                onChange={e => updateEditorMetadata({ starMass: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="flex items-center gap-2 border-t border-white/5 pt-3 select-none">
              <input
                type="checkbox"
                id="disableSpawns"
                checked={metadata.disableSpawns}
                onChange={e => updateEditorMetadata({ disableSpawns: e.target.checked })}
                className="w-4 h-4 bg-black/45 border border-white/5 rounded accent-cyan-500 cursor-pointer"
              />
              <label htmlFor="disableSpawns" className="text-[10px] font-mono uppercase text-white/70 cursor-pointer">
                Deterministic Puzzle Mode
              </label>
            </div>
            <div className="text-[8px] text-white/35 font-light leading-tight">
              Disables random Hydrogen rain after slides. Rely purely on placed elements.
            </div>

          </div>
        )}

        {activeTab === 'objectives' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono tracking-widest text-white/40 uppercase">Level Objectives</span>
              <button
                onClick={handleAddObjective}
                className="text-[9px] font-mono text-cyan-400 hover:text-cyan-300 font-bold uppercase cursor-pointer"
              >
                + Add Goal
              </button>
            </div>

            {metadata.objectives.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-white/5 bg-black/10 rounded-2xl text-[10px] text-white/30 italic">
                No objectives defined. Add at least one!
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {metadata.objectives.map((obj, i) => (
                  <div key={i} className="bg-black/35 border border-white/5 p-3 rounded-2xl flex flex-col gap-2.5 relative">
                    <button
                      onClick={() => handleRemoveObjective(i)}
                      className="absolute top-2.5 right-3 text-white/30 hover:text-red-400 cursor-pointer text-[9px]"
                      title="Remove Goal"
                    >
                      ✕
                    </button>

                    <div className="flex flex-col gap-1 text-[10px]">
                      <label className="text-[8.5px] font-mono text-white/40 uppercase">Goal Type</label>
                      <select
                        value={obj.type}
                        onChange={e => handleObjectiveChange(i, { type: e.target.value as any })}
                        className="bg-[#121217] border border-white/5 rounded-lg px-2 py-1 text-white outline-none cursor-pointer text-[10px]"
                      >
                        <option value="has_element">Synthesize Element</option>
                        <option value="has_element_on_pentagon">Reach Element on Pentagon</option>
                        <option value="has_element_count">Possess Element Count</option>
                        <option value="has_all_elements">Complete Equilibrium (All 8)</option>
                      </select>
                    </div>

                    {obj.type !== 'has_all_elements' && (
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="flex flex-col gap-1">
                          <label className="text-[8.5px] font-mono text-white/40 uppercase">Target Element</label>
                          <select
                            value={obj.element || 'He'}
                            onChange={e => handleObjectiveChange(i, { element: e.target.value as ElementSymbol })}
                            className="bg-[#121217] border border-white/5 rounded-lg px-2 py-1 text-white outline-none cursor-pointer text-[10px]"
                          >
                            {['H', 'He', 'C', 'O', 'Ne', 'Mg', 'Si', 'Fe'].map(el => (
                              <option key={el} value={el}>{el}</option>
                            ))}
                          </select>
                        </div>

                        {obj.type === 'has_element_count' && (
                          <div className="flex flex-col gap-1">
                            <label className="text-[8.5px] font-mono text-white/40 uppercase">Count</label>
                            <input
                              type="number"
                              min={1}
                              max={32}
                              value={obj.count || 1}
                              onChange={e => handleObjectiveChange(i, { count: parseInt(e.target.value, 10) || 1 })}
                              className="bg-[#121217] border border-white/5 rounded-lg px-2 py-1 text-white outline-none text-[10px]"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col gap-1 text-[10px]">
                      <label className="text-[8.5px] font-mono text-white/40 uppercase">Guide Hint</label>
                      <input
                        type="text"
                        value={obj.hint || ''}
                        onChange={e => handleObjectiveChange(i, { hint: e.target.value })}
                        className="w-full bg-[#121217] border border-white/5 rounded-lg px-2 py-1 text-white outline-none text-[10px]"
                        placeholder="Scientific guide hint"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono tracking-widest text-white/40 uppercase">Scenario Library</span>
              <button
                onClick={handleNewScenario}
                className="text-[9px] font-mono text-cyan-400 hover:text-cyan-300 font-bold uppercase cursor-pointer"
              >
                + New Blank
              </button>
            </div>

            {customScenarios.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-white/5 bg-black/10 rounded-2xl text-[10px] text-white/30 italic">
                No custom scenarios saved yet. Use the editor to paint elements and click Save/Publish!
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {customScenarios.map(level => (
                  <div 
                    key={level.id}
                    className="p-3 bg-black/35 border border-white/5 rounded-2xl flex justify-between items-center gap-4 hover:border-white/10 transition-colors"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8.5px] font-mono text-cyan-400 font-bold uppercase">ID: {level.id}</span>
                      <span className="text-xs font-semibold leading-tight text-white">{level.title}</span>
                      <span className="text-[9px] text-white/40">by {level.author || 'Stellar Architect'}</span>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => loadScenarioForEditing(level)}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/15 text-white rounded-lg text-[9px] font-bold tracking-wider uppercase transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete custom scenario "${level.title}"?`)) {
                            deleteScenario(level.id);
                          }
                        }}
                        className="px-2.5 py-1 bg-red-950/20 hover:bg-red-500/20 text-red-300 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Footer / Paint Brush Palette */}
      <div className="p-4 border-t border-white/5 bg-black/30 flex-shrink-0 flex flex-col gap-2">
        <span className="text-[8px] font-mono tracking-widest text-white/40 uppercase">Paint Brush Tool</span>
        
        {/* Elements Brushes */}
        <div className="flex overflow-x-auto gap-2.5 pb-2 custom-scrollbar mask-grad pr-1">
          {brushBtn('H', 'Hydrogen', 'bg-[#ff7675]', 'bg-[#ff7675]/10')}
          {brushBtn('He', 'Helium', 'bg-[#fdcb6e]', 'bg-[#fdcb6e]/10')}
          {brushBtn('C', 'Carbon', 'bg-[#00cec9]', 'bg-[#00cec9]/10')}
          {brushBtn('O', 'Oxygen', 'bg-[#0984e3]', 'bg-[#0984e3]/10')}
          {brushBtn('Ne', 'Neon', 'bg-[#e84393]', 'bg-[#e84393]/10')}
          {brushBtn('Mg', 'Magnesium', 'bg-[#ffeaa7]', 'bg-[#ffeaa7]/10')}
          {brushBtn('Si', 'Silicon', 'bg-[#a29bfe]', 'bg-[#a29bfe]/10')}
          {brushBtn('Fe', 'Iron', 'bg-[#d63031]', 'bg-[#d63031]/10')}
        </div>

        {/* Obstacles & Erase Brushes */}
        <div className="flex gap-2.5 pt-1 border-t border-white/5 overflow-x-auto custom-scrollbar">
          {brushBtn('cme', 'CME Gate', 'bg-[#fd9644] border-dashed animate-pulse', 'bg-[#fd9644]/10')}
          {brushBtn('gravity', 'Anomaly', 'bg-[#a55eea] border-double', 'bg-[#a55eea]/10')}
          {brushBtn('wormhole', 'Wormhole', 'bg-[#45aaf2] border-double animate-spin-slow', 'bg-[#45aaf2]/10')}
          {brushBtn('clear', 'Eraser ✕', 'bg-white/20 border-dotted', 'bg-white/5')}
        </div>

        <div className="text-[8px] text-white/35 text-center mt-2 leading-tight flex flex-col gap-1">
          <div>Select brush above, then hide this panel and tap faces on the 3D sphere.</div>
          <div className="text-amber-500/70 font-semibold uppercase tracking-wider text-[7px] leading-tight mt-0.5">
            ⚠️ Environmental factors (CME, Anomaly, Wormhole) are in active development and may exhibit unexpected behavior.
          </div>
        </div>
      </div>

      </div>
    </>
  );
}
