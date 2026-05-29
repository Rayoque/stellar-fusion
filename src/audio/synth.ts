// src/audio/synth.ts
import { ELEMENTS } from '../game/elements';
import type { ElementSymbol } from '../game/types';

let bgSoundEnabled = localStorage.getItem('stellar_bg_sound') !== 'false';
let effectsSoundEnabled = localStorage.getItem('stellar_effects_sound') !== 'false';
let audioCtx: AudioContext | null = null;

export function initAudio(): void {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass({
      latencyHint: 'interactive'
    });
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export function playMerge(parent: ElementSymbol, child: ElementSymbol): void {
  if (!effectsSoundEnabled || !audioCtx) return;

  const parentPitch = ELEMENTS[parent].pitch;
  const childPitch = ELEMENTS[child].pitch;

  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(parentPitch, now);
  osc.frequency.exponentialRampToValueAtTime(childPitch, now + 0.32);

  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(0.22, now + 0.025); // Lowered from 0.28 to prevent audio clipping/popping
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

  filter.type = 'lowpass';
  filter.frequency.value = 1800;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 0.6);
}

export function playSpawnTick(): void {
  if (!effectsSoundEnabled || !audioCtx) return;
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 1180;

  gain.gain.value = 0.09;
  gain.gain.linearRampToValueAtTime(0.0001, now + 0.08);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

export function playBlocked(): void {
  if (!effectsSoundEnabled || !audioCtx) return;
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  // Low frequency sub-bass warm thud/buzz
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(130, now);
  osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

  filter.type = 'lowpass';
  filter.frequency.value = 240;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 0.25);
}

// --- Ambient drone: pre-baked seamless loops played via <audio> elements ---
//
// iOS suspends raw WebAudio on screen-lock; only real media elements keep playing,
// and live WebAudio routed through a MediaStream crackled after session interrupts.
// So we render the drone to seamless 20s WAV loops up-front (OfflineAudioContext)
// and play them through <audio loop> elements. A static file can't glitch, and the
// media element survives lock. Phase changes crossfade between two pooled elements.
//
// Seamless loop: all carriers (58/87/174/232/69.3 Hz) complete an integer number of
// cycles in 20s and the 0.05 Hz LFO completes exactly one cycle (its pitch offset
// integrates to zero), so the waveform returns to its start at t=20s. We render with
// a 4s warm-up that is sliced off, so the lowpass is at steady state at the loop seam.

type Voicing = 'main_sequence' | 'red_giant' | 'supergiant' | 'collapsed';
interface VoicingParams { osc2: number; osc3Gain: number; osc4Gain: number; cutoff: number; master: number; }

// Mirrors the per-phase targets the old live updateAmbientDrone used to ramp to.
const VOICINGS: Record<Voicing, VoicingParams> = {
  main_sequence: { osc2: 87,   osc3Gain: 0.12,   osc4Gain: 0.06,   cutoff: 450, master: 0.045 },
  red_giant:     { osc2: 87,   osc3Gain: 0.192,  osc4Gain: 0.096,  cutoff: 630, master: 0.069 },
  supergiant:    { osc2: 87,   osc3Gain: 0.288,  osc4Gain: 0.168,  cutoff: 870, master: 0.099 },
  collapsed:     { osc2: 69.3, osc3Gain: 0.0001, osc4Gain: 0.0001, cutoff: 250, master: 0.022 },
};

const LOOP_SECONDS = 20;
const WARMUP_SECONDS = 4;
const RENDER_SR = 44100;

const loopUrls: Partial<Record<Voicing, string>> = {};
let renderStarted = false;

const bgEls: [HTMLAudioElement | null, HTMLAudioElement | null] = [null, null];
let activeIdx = 0;
let currentVoicing: Voicing = 'main_sequence';
let pendingVoicing: Voicing | null = null;
let bgStarted = false;

function encodeLoopToWavUrl(buffer: AudioBuffer, startSample: number, length: number): string {
  const data = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const dataSize = length * 2; // 16-bit mono
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);
  view.setUint32(0, 0x52494646, false);  // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false);  // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, 1, true);           // mono
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * 2, true);      // byte rate
  view.setUint16(32, 2, true);           // block align
  view.setUint16(34, 16, true);          // bits/sample
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);
  let off = 44;
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, data[startSample + i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return URL.createObjectURL(new Blob([ab], { type: 'audio/wav' }));
}

async function renderVoicing(p: VoicingParams): Promise<string> {
  const total = LOOP_SECONDS + WARMUP_SECONDS;
  const ctx = new OfflineAudioContext(1, RENDER_SR * total, RENDER_SR);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = p.cutoff;
  const master = ctx.createGain();
  master.gain.value = p.master;
  filter.connect(master);
  master.connect(ctx.destination);

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.05;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 2.0;
  lfo.connect(lfoGain);

  const addOsc = (freq: number, gainVal: number) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    lfoGain.connect(o.frequency); // gentle organic pitch drift
    if (gainVal === 1) {
      o.connect(filter);
    } else {
      const g = ctx.createGain();
      g.gain.value = gainVal;
      o.connect(g);
      g.connect(filter);
    }
    o.start(0);
  };
  addOsc(58, 1);        // Bb1 sub-bass
  addOsc(p.osc2, 1);    // F2 fifth (or minor third when collapsed)
  addOsc(174, p.osc3Gain); // F3 warm harmonic
  addOsc(232, p.osc4Gain); // Bb3 presence
  lfo.start(0);

  const rendered = await ctx.startRendering();
  // Slice off the warm-up so the lowpass is in steady state at the loop seam.
  return encodeLoopToWavUrl(rendered, WARMUP_SECONDS * RENDER_SR, LOOP_SECONDS * RENDER_SR);
}

let silentPrimerUrl: string | null = null;
function getSilentPrimerUrl(): string {
  if (!silentPrimerUrl) silentPrimerUrl = createSilentWavUrl();
  return silentPrimerUrl;
}

function ensureLoopsRendered(): void {
  if (renderStarted || typeof OfflineAudioContext === 'undefined') return;
  renderStarted = true;
  (Object.keys(VOICINGS) as Voicing[]).forEach(name => {
    renderVoicing(VOICINGS[name])
      .then(url => {
        loopUrls[name] = url;
        // If the active element is currently playing the silent primer (or a stale
        // loop) while waiting for THIS voicing, swap in the real loop now. The element
        // was already unlocked by the in-gesture primer play, so this play() is allowed.
        if (bgSoundEnabled && bgStarted && pendingVoicing === name) {
          pendingVoicing = null;
          const cur = bgEls[activeIdx]!;
          cur.src = url;
          cur.currentTime = 0;
          cur.volume = 1;
          cur.play().catch(() => {});
        }
      })
      .catch(() => {});
  });
}

function makeBgEl(): HTMLAudioElement {
  const el = new Audio();
  el.loop = true;
  el.preload = 'auto';
  el.setAttribute('playsinline', '');
  el.volume = 0;
  return el;
}

function ensureEls(): void {
  if (!bgEls[0]) bgEls[0] = makeBgEl();
  if (!bgEls[1]) bgEls[1] = makeBgEl();
}

// Volume ramp via rAF. Phase transitions only happen in the foreground (gameplay),
// where rAF runs, so this is sufficient; background just holds the current loop.
function fadeEl(el: HTMLAudioElement, target: number, ms: number, onDone?: () => void): void {
  const anyEl = el as unknown as { _fadeRAF?: number };
  if (anyEl._fadeRAF) cancelAnimationFrame(anyEl._fadeRAF);
  const startT = performance.now();
  const from = el.volume;
  const step = (t: number) => {
    const k = ms <= 0 ? 1 : Math.min(1, (t - startT) / ms);
    el.volume = Math.max(0, Math.min(1, from + (target - from) * k));
    if (k < 1) {
      anyEl._fadeRAF = requestAnimationFrame(step);
    } else {
      anyEl._fadeRAF = 0;
      onDone?.();
    }
  };
  anyEl._fadeRAF = requestAnimationFrame(step);
}

// Crossfade the active element to `name`'s loop. Used for phase transitions, which
// only occur during foreground gameplay (well after the loops have finished baking).
function crossfadeVoicing(name: Voicing): void {
  ensureEls();
  if (name === currentVoicing) return;
  const url = loopUrls[name];
  if (!url) {
    // Extremely rare (transition before bake done): fall back to an active swap.
    pendingVoicing = name;
    currentVoicing = name;
    return;
  }
  currentVoicing = name;
  const cur = bgEls[activeIdx]!;
  const nextIdx = 1 - activeIdx;
  const nxt = bgEls[nextIdx]!;
  nxt.src = url;
  nxt.currentTime = 0;
  nxt.volume = 0;
  nxt.play().catch(() => {});
  fadeEl(nxt, 1, 2000);
  fadeEl(cur, 0, 2000, () => cur.pause());
  activeIdx = nextIdx;
}

function setupBgMediaSession(): void {
  if (!('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  ms.metadata = new MediaMetadata({ title: 'Ambient Drone', artist: 'Stellar Fusion' });
  // Lock-screen / control-center transport maps to the bg-sound toggle.
  try {
    ms.setActionHandler('play', () => setBgSoundEnabled(true));
    ms.setActionHandler('pause', () => setBgSoundEnabled(false));
    ms.setActionHandler('stop', () => setBgSoundEnabled(false));
  } catch { /* unsupported action */ }
  ms.playbackState = 'playing';
}

// Must be invoked from a user gesture the first time (it is — see App.tsx).
export function startAmbientDrone(): void {
  if (!bgSoundEnabled) return;
  ensureLoopsRendered();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  ensureEls();
  setupBgMediaSession();
  bgStarted = true;

  const cur = bgEls[activeIdx]!;
  const url = loopUrls[currentVoicing];
  if (url) {
    if (cur.src !== url) { cur.src = url; cur.currentTime = 0; }
    pendingVoicing = null;
  } else {
    // Loop not baked yet — prime with a short silent loop to UNLOCK the element
    // inside this user gesture; ensureLoopsRendered() swaps in the real loop on bake.
    cur.src = getSilentPrimerUrl();
    pendingVoicing = currentVoicing;
  }
  cur.volume = 1;
  cur.play().catch(() => {});
}

export function stopAmbientDrone(): void {
  bgStarted = false;
  bgEls[0]?.pause();
  bgEls[1]?.pause();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
}

// Re-assert playback after the tab/app returns to the foreground or the OS
// interrupted the audio session (lock/unlock, Bluetooth handoff, phone call).
export function resumeAmbientDrone(): void {
  if (!bgSoundEnabled) return;
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  if (!bgStarted) { startAmbientDrone(); return; }
  const el = bgEls[activeIdx];
  if (el && el.src && el.paused) el.play().catch(() => {});
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
}

export function updateAmbientDrone(phase: string, hasCollapsed: boolean): void {
  if (!bgSoundEnabled) return;
  let name: Voicing;
  if (hasCollapsed) name = 'collapsed';
  else if (phase === 'red_giant') name = 'red_giant';
  else if (phase === 'supergiant' || phase === 'collapse') name = 'supergiant';
  else name = 'main_sequence';

  if (!bgStarted) {
    // Not playing yet — record so the right loop is used once it starts.
    currentVoicing = name;
    return;
  }
  crossfadeVoicing(name);
}

/**
 * Programmatically generates a binary-perfect 1-second silent WAV file Blob URL.
 * Bypasses data URI decoder restrictions in mobile Safari, enabling seamless ringer bypass.
 */
export function createSilentWavUrl(): string {
  const sampleRate = 8000;
  const numSamples = 8000; // 1 second of silence
  const buffer = new ArrayBuffer(44 + numSamples);
  const view = new DataView(buffer);

  // RIFF Chunk Descriptor
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // "fmt " Sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);          // Sub-chunk size = 16
  view.setUint16(20, 1, true);           // AudioFormat = 1 (PCM)
  view.setUint16(22, 1, true);           // NumChannels = 1 (Mono)
  view.setUint32(24, sampleRate, true);  // SampleRate = 8000
  view.setUint32(28, sampleRate, true);  // ByteRate = 8000
  view.setUint16(32, 1, true);           // BlockAlign = 1
  view.setUint16(34, 8, true);           // BitsPerSample = 8

  // "data" Sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, numSamples, true);  // Data size = 8000

  // Fill audio data block with silent 8-bit PCM sample values (neutral mid-point is 128)
  const data = new Uint8Array(buffer, 44, numSamples);
  data.fill(128);

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export function isBgSoundEnabled(): boolean {
  return bgSoundEnabled;
}

export function setBgSoundEnabled(enabled: boolean): void {
  bgSoundEnabled = enabled;
  localStorage.setItem('stellar_bg_sound', String(enabled));
  if (enabled) {
    startAmbientDrone();
  } else {
    stopAmbientDrone();
  }
}

export function isEffectsSoundEnabled(): boolean {
  return effectsSoundEnabled;
}

export function setEffectsSoundEnabled(enabled: boolean): void {
  effectsSoundEnabled = enabled;
  localStorage.setItem('stellar_effects_sound', String(enabled));
}

export function playHeliumLaugh(): void {
  if (!effectsSoundEnabled) return;

  const audio = new Audio('/hehehe.mp3');
  audio.volume = 0.495;
  audio.play().catch(err => {
    console.warn("Failed to play Helium laugh easter egg (hehehe.mp3 missing?):", err);
  });
}

export function playSuccess(): void {
  if (!effectsSoundEnabled || !audioCtx) return;
  initAudio();
  const now = audioCtx.currentTime;

  // Extremely subtle, warm, deep cosmic resonance chord (Eb3 -> G3 -> Bb3 -> Eb4)
  const notes = [155.56, 196.00, 233.08, 311.13];
  const delays = [0, 0.05, 0.10, 0.15];

  notes.forEach((freq, i) => {
    const time = now + delays[i];
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    const filter = audioCtx!.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.038, time + 0.15); // Very soft, gentle attack
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.4); // Slow, smooth wash-out decay

    filter.type = 'lowpass';
    filter.frequency.value = 1000; // Warm, dark filter cutoff

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx!.destination);

    osc.start(time);
    osc.stop(time + 1.6);
  });
}


