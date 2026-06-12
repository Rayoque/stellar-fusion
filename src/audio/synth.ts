// src/audio/synth.ts
import { ELEMENTS } from '../game/elements';
import type { ElementSymbol } from '../game/types';

let bgSoundEnabled = localStorage.getItem('stellar_bg_sound') !== 'false';
let effectsSoundEnabled = localStorage.getItem('stellar_effects_sound') !== 'false';
let audioCtx: AudioContext | null = null;
let bgVolume = Number(localStorage.getItem('stellar_bg_volume') ?? '50');
let effectsVolume = Number(localStorage.getItem('stellar_effects_volume') ?? '80');
let currentBaseGain = 0.06;

let capacitorHaptics: any = null;
if (typeof window !== 'undefined' && (window as any).Capacitor && (window as any).Capacitor.Plugins) {
  capacitorHaptics = (window as any).Capacitor.Plugins.Haptics;
}

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

/**
 * Universal Haptics Bridge
 * Triggers native iOS haptics if running inside Capacitor, otherwise falls back to HTML5 Vibration API.
 */
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'): void {
  try {
    if (capacitorHaptics) {
      switch (type) {
        case 'light':
          capacitorHaptics.impact({ style: 'light' });
          break;
        case 'medium':
          capacitorHaptics.impact({ style: 'medium' });
          break;
        case 'heavy':
          capacitorHaptics.impact({ style: 'heavy' });
          break;
        case 'success':
          capacitorHaptics.notification({ type: 'success' });
          break;
        case 'warning':
          capacitorHaptics.notification({ type: 'warning' });
          break;
        case 'error':
          capacitorHaptics.notification({ type: 'error' });
          break;
      }
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      switch (type) {
        case 'light':
          navigator.vibrate(15);
          break;
        case 'medium':
          navigator.vibrate(35);
          break;
        case 'heavy':
          navigator.vibrate(65);
          break;
        case 'success':
          navigator.vibrate([40, 30, 40]);
          break;
        case 'warning':
          navigator.vibrate([60, 40, 60]);
          break;
        case 'error':
          navigator.vibrate([100, 50, 100, 50, 150]);
          break;
      }
    }
  } catch (err) {
    // Fail silently on unsupported configurations
  }
}

/**
 * Play Slide Sound (Inspired by The Room's physical weight)
 * Pitch is mapped to atomic weight and slide step distance, using FM synthesis.
 */
export function playSlide(symbol: ElementSymbol, steps: number): void {
  if (!effectsSoundEnabled || !audioCtx) return;
  initAudio();
  const now = audioCtx.currentTime;
  const element = ELEMENTS[symbol];
  if (!element) return;

  const baseFreq = element.pitch / 2; // Slide frequencies are lower octaves
  const duration = Math.min(0.12 * steps, 0.45);

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  // FM Modulator to add physical rasp/grind to heavier elements
  const modOsc = audioCtx.createOscillator();
  const modGain = audioCtx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.linearRampToValueAtTime(baseFreq * 0.88, now + duration);

  modOsc.type = 'sine';
  modOsc.frequency.setValueAtTime(baseFreq * 0.4, now);
  // Heavier elements get high modulation depth for a raspy/metallic slide feel
  const modDepth = element.slideDistance <= 2 ? baseFreq * 0.75 : baseFreq * 0.15;
  modGain.gain.setValueAtTime(modDepth, now);
  modGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  filter.type = 'lowpass';
  // Darker filter for heavier, inert elements
  const filterCutoff = element.slideDistance <= 2 ? 350 : 1000;
  filter.frequency.setValueAtTime(filterCutoff, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15 * (effectsVolume / 100), now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  modOsc.connect(modGain);
  modGain.connect(osc.frequency);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  modOsc.start(now);
  osc.start(now);
  modOsc.stop(now + duration + 0.05);
  osc.stop(now + duration + 0.05);

  triggerHaptic(element.slideDistance <= 2 ? 'medium' : 'light');
}

/**
 * Play Merge Sound (Inspired by Monument Valley's synesthetic chords)
 * Plays a beautiful major/minor chord sweep based on the output atomic properties.
 */
export function playMerge(parent: ElementSymbol, child: ElementSymbol): void {
  if (!effectsSoundEnabled || !audioCtx) return;
  initAudio();
  const parentPitch = ELEMENTS[parent].pitch;
  const childPitch = ELEMENTS[child].pitch;

  const now = audioCtx.currentTime;

  // Build a consonant triad chord (Root -> Third -> Fifth)
  // Even elements use Major thirds (1.25x), odd elements use Minor thirds (1.20x)
  const isEven = ELEMENTS[child].atomicNumber % 2 === 0;
  const thirdRatio = isEven ? 1.25 : 1.20;
  const notes = [childPitch, childPitch * thirdRatio, childPitch * 1.5];

  notes.forEach((freq, idx) => {
    const noteTime = now + idx * 0.045;
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    const filter = audioCtx!.createBiquadFilter();

    osc.type = 'sine';
    // Sweep pitch from parent pitch up to child pitch component
    osc.frequency.setValueAtTime(parentPitch * (freq / childPitch), now);
    osc.frequency.exponentialRampToValueAtTime(freq, noteTime + 0.22);

    gain.gain.setValueAtTime(0, noteTime);
    gain.gain.linearRampToValueAtTime(0.12 * (effectsVolume / 100), noteTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.5);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, noteTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx!.destination);

    osc.start(noteTime);
    osc.stop(noteTime + 0.6);
  });

  triggerHaptic('success');
}

/**
 * Play Spawn Tick Sound
 * Light FM metallic snap for new tile spawns.
 */
export function playSpawnTick(): void {
  if (!effectsSoundEnabled || !audioCtx) return;
  initAudio();
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const modOsc = audioCtx.createOscillator();
  const modGain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1400, now);
  osc.frequency.exponentialRampToValueAtTime(900, now + 0.07);

  modOsc.type = 'sine';
  modOsc.frequency.setValueAtTime(600, now);
  modGain.gain.setValueAtTime(400, now);
  modGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  gain.gain.setValueAtTime(0.12 * (effectsVolume / 100), now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

  modOsc.connect(modGain);
  modGain.connect(osc.frequency);
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  modOsc.start(now);
  osc.start(now);
  modOsc.stop(now + 0.1);
  osc.stop(now + 0.1);
}

/**
 * Play Blocked Sound (Inspired by The Room's lock mechanisms)
 * A heavy, physical mechanical thud/buzz.
 */
export function playBlocked(): void {
  if (!effectsSoundEnabled || !audioCtx) return;
  initAudio();
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(55, now + 0.2);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.24 * (effectsVolume / 100), now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(170, now);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 0.25);

  triggerHaptic('warning');
}

/**
 * Play Collapse Crack
 * The detonation tick before the vacuum — thin, high, gone instantly.
 * (Seismic-charge profile, part 1 of 3: crack → silence → WHOMM.)
 */
export function playCollapseCrack(): void {
  if (!effectsSoundEnabled || !audioCtx) return;
  initAudio();
  const now = audioCtx.currentTime;
  const vol = effectsVolume / 100;

  const len = 0.045;
  const buf = audioCtx.createBuffer(1, Math.ceil(audioCtx.sampleRate * len), audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);

  const crack = audioCtx.createBufferSource();
  crack.buffer = buf;
  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2200;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.15 * vol, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

  crack.connect(hp);
  hp.connect(g);
  g.connect(audioCtx.destination);
  crack.start(now);

  triggerHaptic('light');
}

/**
 * Play Supernova — the WHOMM.
 * Sharp-attack shockwave voice (bandpassed sawtooth falling an octave-plus),
 * detuned sub foundation dropping to the floor, and a filtered-noise debris
 * tail. Designed to land ~0.7s after playCollapseCrack with the ambient
 * drone ducked: detonation, vacuum, then this.
 */
export function playSupernova(): void {
  if (!effectsSoundEnabled || !audioCtx) return;
  initAudio();
  const now = audioCtx.currentTime;
  const vol = effectsVolume / 100;

  // The shockwave's voice — "bwah"
  const bwah = audioCtx.createOscillator();
  const bwahGain = audioCtx.createGain();
  const bwahFilter = audioCtx.createBiquadFilter();
  bwah.type = 'sawtooth';
  bwah.frequency.setValueAtTime(180, now);
  bwah.frequency.exponentialRampToValueAtTime(48, now + 1.1);
  bwahFilter.type = 'bandpass';
  bwahFilter.Q.value = 1.1;
  bwahFilter.frequency.setValueAtTime(640, now);
  bwahFilter.frequency.exponentialRampToValueAtTime(110, now + 1.2);
  bwahGain.gain.setValueAtTime(0, now);
  bwahGain.gain.linearRampToValueAtTime(0.34 * vol, now + 0.025);
  bwahGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
  bwah.connect(bwahFilter);
  bwahFilter.connect(bwahGain);
  bwahGain.connect(audioCtx.destination);
  bwah.start(now);
  bwah.stop(now + 1.7);

  // Sub foundation — two detuned voices falling to the floor
  [52, 52.8].forEach(f => {
    const osc = audioCtx!.createOscillator();
    const g = audioCtx!.createGain();
    const lp = audioCtx!.createBiquadFilter();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f / 2.1, now + 2.0);
    lp.type = 'lowpass';
    lp.frequency.value = 110;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.42 * vol, now + 0.035);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
    osc.connect(lp);
    lp.connect(g);
    g.connect(audioCtx!.destination);
    osc.start(now);
    osc.stop(now + 2.5);
  });

  // Debris rumble — filtered noise tail
  const len = 1.6;
  const buf = audioCtx.createBuffer(1, Math.ceil(audioCtx.sampleRate * len), audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buf;
  const ng = audioCtx.createGain();
  const nf = audioCtx.createBiquadFilter();
  nf.type = 'lowpass';
  nf.frequency.setValueAtTime(420, now);
  nf.frequency.exponentialRampToValueAtTime(60, now + len);
  ng.gain.setValueAtTime(0, now);
  ng.gain.linearRampToValueAtTime(0.16 * vol, now + 0.05);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + len);
  noise.connect(nf);
  nf.connect(ng);
  ng.connect(audioCtx.destination);
  noise.start(now);

  triggerHaptic('error');
}

/**
 * Play Shell Shed (planetary nebula)
 * The gentle counterpart to the supernova: a soft, airy exhale for low-mass
 * endings (white dwarf, failed collapse). Slow attack, no bite — a release,
 * not an explosion.
 */
export function playShellShed(): void {
  if (!effectsSoundEnabled || !audioCtx) return;
  initAudio();
  const now = audioCtx.currentTime;

  const freqs = [116.5, 174.6, 233.1]; // Bb2, F3, Bb3 — the drone's own chord, exhaled
  freqs.forEach((f, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    const filter = audioCtx!.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.linearRampToValueAtTime(f * 0.84, now + 2.4);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 2.4);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.10 * (effectsVolume / 100), now + 0.5 + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx!.destination);

    osc.start(now);
    osc.stop(now + 2.8);
  });

  triggerHaptic('medium');
}

let ambientOsc1: OscillatorNode | null = null;
let ambientOsc2: OscillatorNode | null = null;
let ambientOsc3: OscillatorNode | null = null;
let ambientOsc4: OscillatorNode | null = null;
let ambientGain: GainNode | null = null;
let ambientFilter: BiquadFilterNode | null = null;
let osc3GainNode: GainNode | null = null;
let osc4GainNode: GainNode | null = null;

export function startAmbientDrone(): void {
  if (!bgSoundEnabled || !audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  if (ambientOsc1) return;

  ambientOsc1 = audioCtx.createOscillator();
  ambientOsc2 = audioCtx.createOscillator();
  ambientOsc3 = audioCtx.createOscillator();
  ambientOsc4 = audioCtx.createOscillator();
  ambientGain = audioCtx.createGain();
  
  ambientFilter = audioCtx.createBiquadFilter();
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  
  osc3GainNode = audioCtx.createGain();
  osc4GainNode = audioCtx.createGain();

  // Bb1 (58 Hz)
  ambientOsc1.type = 'sine';
  ambientOsc1.frequency.value = 58;

  // F2 (87 Hz)
  ambientOsc2.type = 'sine';
  ambientOsc2.frequency.value = 87;

  // F3 (174 Hz)
  ambientOsc3.type = 'sine';
  ambientOsc3.frequency.value = 174;

  // Bb3 (232 Hz)
  ambientOsc4.type = 'sine';
  ambientOsc4.frequency.value = 232;

  ambientFilter.type = 'lowpass';
  ambientFilter.frequency.value = 450;

  lfo.type = 'sine';
  lfo.frequency.value = 0.05;
  lfoGain.gain.value = 2.0;

  currentBaseGain = 0.06;
  ambientGain.gain.value = currentBaseGain * (bgVolume / 100);
  osc3GainNode.gain.value = 0.25; 
  osc4GainNode.gain.value = 0.18;

  lfo.connect(lfoGain);
  lfoGain.connect(ambientOsc1.frequency);
  lfoGain.connect(ambientOsc2.frequency);
  lfoGain.connect(ambientOsc3.frequency);
  lfoGain.connect(ambientOsc4.frequency);

  ambientOsc1.connect(ambientFilter);
  ambientOsc2.connect(ambientFilter);
  
  ambientOsc3.connect(osc3GainNode);
  osc3GainNode.connect(ambientFilter);

  ambientOsc4.connect(osc4GainNode);
  osc4GainNode.connect(ambientFilter);

  ambientFilter.connect(ambientGain);
  ambientGain.connect(audioCtx.destination);

  ambientOsc1.start();
  ambientOsc2.start();
  ambientOsc3.start();
  ambientOsc4.start();
  lfo.start();
}

export function resumeAmbientDrone(): void {
  if (!bgSoundEnabled || !audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  if (!ambientOsc1) startAmbientDrone();
}

// While ducked, updateAmbientDrone must not re-schedule gain ramps on top of
// the duck envelope — the silence IS the effect (seismic-charge vacuum).
let droneDuckedUntil = 0;

/**
 * Duck the ambient drone to near-silence almost instantly, hold, then breathe
 * back in. The beat of nothing before the supernova WHOMM.
 */
export function duckAmbientDrone(holdSeconds: number): void {
  if (!audioCtx || !ambientGain) return;
  const now = audioCtx.currentTime;
  droneDuckedUntil = now + holdSeconds + 2.5;

  ambientGain.gain.cancelScheduledValues(now);
  ambientGain.gain.setValueAtTime(Math.max(ambientGain.gain.value, 0.0001), now);
  ambientGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  ambientGain.gain.setValueAtTime(0.0001, now + holdSeconds);
  ambientGain.gain.exponentialRampToValueAtTime(
    Math.max(currentBaseGain * (bgVolume / 100), 0.0001),
    now + holdSeconds + 2.5
  );
}

export function stopAmbientDrone(): void {
  if (ambientOsc1) {
    try { ambientOsc1.stop(); } catch {}
  }
  if (ambientOsc2) {
    try { ambientOsc2.stop(); } catch {}
  }
  if (ambientOsc3) {
    try { ambientOsc3.stop(); } catch {}
  }
  if (ambientOsc4) {
    try { ambientOsc4.stop(); } catch {}
  }
  ambientOsc1 = ambientOsc2 = ambientOsc3 = ambientOsc4 = ambientGain = ambientFilter = osc3GainNode = osc4GainNode = null;
}

/**
 * Update Ambient Drone with Board Tension
 * Lowers filter cutoff and adds minor octave volume adjustments when board has high tension (close to jamming).
 */
export function updateAmbientDrone(phase: string, hasCollapsed: boolean, boardTension: boolean = false): void {
  if (!bgSoundEnabled || !audioCtx || !ambientGain || !ambientOsc2 || !ambientFilter || !osc3GainNode || !osc4GainNode) return;
  // Respect an active duck — the ceremony owns the gain envelope right now.
  if (audioCtx.currentTime < droneDuckedUntil) return;

  const now = audioCtx.currentTime;
  const transitionTime = 2.0;

  if (hasCollapsed) {
    // SOMBER CORE COLLAPSE (Minor third shift)
    currentBaseGain = 0.04;
    ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
    ambientGain.gain.exponentialRampToValueAtTime(currentBaseGain * (bgVolume / 100), now + transitionTime);

    ambientOsc2.frequency.setValueAtTime(ambientOsc2.frequency.value, now);
    ambientOsc2.frequency.exponentialRampToValueAtTime(69.3, now + transitionTime);

    osc3GainNode.gain.setValueAtTime(osc3GainNode.gain.value, now);
    osc3GainNode.gain.exponentialRampToValueAtTime(0.0001, now + transitionTime);

    osc4GainNode.gain.setValueAtTime(osc4GainNode.gain.value, now);
    osc4GainNode.gain.exponentialRampToValueAtTime(0.0001, now + transitionTime);

    ambientFilter.frequency.setValueAtTime(ambientFilter.frequency.value, now);
    ambientFilter.frequency.exponentialRampToValueAtTime(220, now + transitionTime);
  } else {
    // Restore perfect fifth
    ambientOsc2.frequency.setValueAtTime(ambientOsc2.frequency.value, now);
    ambientOsc2.frequency.exponentialRampToValueAtTime(87, now + transitionTime);

    // Dynamic scale based on board space tightness (Tension multiplier)
    const tensionMult = boardTension ? 1.25 : 1.0;
    const filterCutoff = boardTension ? 330 : 450;

    if (phase === 'main_sequence') {
      ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
      currentBaseGain = 0.06 * tensionMult;
      ambientGain.gain.exponentialRampToValueAtTime(currentBaseGain * (bgVolume / 100), now + transitionTime);

      osc3GainNode.gain.setValueAtTime(osc3GainNode.gain.value, now);
      osc3GainNode.gain.exponentialRampToValueAtTime(0.25, now + transitionTime);

      osc4GainNode.gain.setValueAtTime(osc4GainNode.gain.value, now);
      osc4GainNode.gain.exponentialRampToValueAtTime(0.18, now + transitionTime);

      ambientFilter.frequency.setValueAtTime(ambientFilter.frequency.value, now);
      ambientFilter.frequency.exponentialRampToValueAtTime(filterCutoff, now + transitionTime);
    } else if (phase === 'red_giant') {
      ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
      currentBaseGain = 0.09 * tensionMult;
      ambientGain.gain.exponentialRampToValueAtTime(currentBaseGain * (bgVolume / 100), now + transitionTime);

      osc3GainNode.gain.setValueAtTime(osc3GainNode.gain.value, now);
      osc3GainNode.gain.exponentialRampToValueAtTime(0.35, now + transitionTime);

      osc4GainNode.gain.setValueAtTime(osc4GainNode.gain.value, now);
      osc4GainNode.gain.exponentialRampToValueAtTime(0.26, now + transitionTime);

      ambientFilter.frequency.setValueAtTime(ambientFilter.frequency.value, now);
      ambientFilter.frequency.exponentialRampToValueAtTime(filterCutoff + 150, now + transitionTime);
    } else if (phase === 'supergiant' || phase === 'collapse') {
      ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
      currentBaseGain = 0.12 * tensionMult;
      ambientGain.gain.exponentialRampToValueAtTime(currentBaseGain * (bgVolume / 100), now + transitionTime);

      osc3GainNode.gain.setValueAtTime(osc3GainNode.gain.value, now);
      osc3GainNode.gain.exponentialRampToValueAtTime(0.45, now + transitionTime);

      osc4GainNode.gain.setValueAtTime(osc4GainNode.gain.value, now);
      osc4GainNode.gain.exponentialRampToValueAtTime(0.35, now + transitionTime);

      ambientFilter.frequency.setValueAtTime(ambientFilter.frequency.value, now);
      ambientFilter.frequency.exponentialRampToValueAtTime(filterCutoff + 350, now + transitionTime);
    }
  }
}

export function createSilentWavUrl(): string {
  const sampleRate = 8000;
  const numSamples = 8000;
  const buffer = new ArrayBuffer(44 + numSamples);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);

  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, numSamples, true);

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

export function getBgVolume(): number {
  return bgVolume;
}

export function setBgVolume(vol: number): void {
  bgVolume = vol;
  localStorage.setItem('stellar_bg_volume', String(vol));
  if (audioCtx && ambientGain) {
    const now = audioCtx.currentTime;
    ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
    ambientGain.gain.linearRampToValueAtTime(currentBaseGain * (bgVolume / 100), now + 0.15);
  }
}

export function getEffectsVolume(): number {
  return effectsVolume;
}

export function setEffectsVolume(vol: number): void {
  effectsVolume = vol;
  localStorage.setItem('stellar_effects_volume', String(vol));
}

export function playHeliumLaugh(): void {
  if (!effectsSoundEnabled) return;
  const audio = new Audio('/hehehe.mp3');
  audio.volume = 0.495;
  audio.play().catch(() => {});
}

export function playSuccess(): void {
  if (!effectsSoundEnabled || !audioCtx) return;
  initAudio();
  const now = audioCtx.currentTime;

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
    gain.gain.linearRampToValueAtTime(0.10 * (effectsVolume / 100), time + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.45);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, time);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx!.destination);

    osc.start(time);
    osc.stop(time + 1.6);
  });
}
