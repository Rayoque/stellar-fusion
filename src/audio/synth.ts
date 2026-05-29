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
  // Always try to resume — iOS suspends the context on lock/interrupt, and without
  // this the drone gets stuck silent even though the oscillators still exist.
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  if (ambientOsc1) return; // graph already built and running

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

  // Bb1 (58 Hz) - Deep sub-bass base
  ambientOsc1.type = 'sine';
  ambientOsc1.frequency.value = 58;

  // F2 (87 Hz) - Deep perfect fifth
  ambientOsc2.type = 'sine';
  ambientOsc2.frequency.value = 87;

  // F3 (174 Hz) - Warm mid-low harmonic helper (original drone note)
  ambientOsc3.type = 'sine';
  ambientOsc3.frequency.value = 174;

  // Bb3 (232 Hz) - Pure warm sine wave (audible on small phone/laptop speakers, smooth and soothing)
  ambientOsc4.type = 'sine';
  ambientOsc4.frequency.value = 232;

  // Lowpass filter cutoff set to a warm 450 Hz to keep the sound cozy and filter out any high buzz
  ambientFilter.type = 'lowpass';
  ambientFilter.frequency.value = 450;

  // LFO to slowly modulate pitch for an organic, shifting interstellar drone
  lfo.type = 'sine';
  lfo.frequency.value = 0.05;
  lfoGain.gain.value = 2.0;

  // Ambient master gain
  ambientGain.gain.value = 0.045;

  // Individual gains for delicate balance
  osc3GainNode.gain.value = 0.12; 
  osc4GainNode.gain.value = 0.06; // Soft, warm presence to be heard on built-in speakers

  // Connect LFO for gentle pitch modulation across all oscillators
  lfo.connect(lfoGain);
  lfoGain.connect(ambientOsc1.frequency);
  lfoGain.connect(ambientOsc2.frequency);
  lfoGain.connect(ambientOsc3.frequency);
  lfoGain.connect(ambientOsc4.frequency);

  // Connect oscillators to their gain nodes, then to filter, then to master destination
  ambientOsc1.connect(ambientFilter);
  ambientOsc2.connect(ambientFilter);
  
  ambientOsc3.connect(osc3GainNode);
  osc3GainNode.connect(ambientFilter);

  ambientOsc4.connect(osc4GainNode);
  osc4GainNode.connect(ambientFilter);

  ambientFilter.connect(ambientGain);
  ambientGain.connect(audioCtx.destination);

  // Start all oscillators
  ambientOsc1.start();
  ambientOsc2.start();
  ambientOsc3.start();
  ambientOsc4.start();
  lfo.start();
}

// Re-assert drone playback when the page returns to the foreground or after the OS
// interrupted the audio session (screen lock/unlock, Bluetooth handoff, phone call).
// Plays in foreground / app-switch; iOS stops it on screen-lock (accepted), but this
// guarantees it comes back instead of getting stuck off.
export function resumeAmbientDrone(): void {
  if (!bgSoundEnabled || !audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  // If the graph was torn down (e.g. toggled off), rebuild it.
  if (!ambientOsc1) startAmbientDrone();
}

export function stopAmbientDrone(): void {
  if (ambientOsc1) ambientOsc1.stop();
  if (ambientOsc2) ambientOsc2.stop();
  if (ambientOsc3) ambientOsc3.stop();
  if (ambientOsc4) ambientOsc4.stop();
  ambientOsc1 = ambientOsc2 = ambientOsc3 = ambientOsc4 = ambientGain = ambientFilter = osc3GainNode = osc4GainNode = null;
}

export function updateAmbientDrone(phase: string, hasCollapsed: boolean): void {
  if (!bgSoundEnabled || !audioCtx || !ambientGain || !ambientOsc2 || !ambientFilter || !osc3GainNode || !osc4GainNode) return;

  const now = audioCtx.currentTime;
  const transitionTime = 2.0; // 2 seconds smooth crossfade glide

  if (hasCollapsed) {
    // SOMBER CORE COLLAPSE: Lessened, cold sub-bass void (minor chord)
    ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
    ambientGain.gain.exponentialRampToValueAtTime(0.022, now + transitionTime);

    // Glide Bb2/F2 perfect fifth (87Hz) to minor third (69.3Hz) for dark, haunting somber tone
    ambientOsc2.frequency.setValueAtTime(ambientOsc2.frequency.value, now);
    ambientOsc2.frequency.exponentialRampToValueAtTime(69.3, now + transitionTime);

    // Mute higher warm harmonics
    osc3GainNode.gain.setValueAtTime(osc3GainNode.gain.value, now);
    osc3GainNode.gain.exponentialRampToValueAtTime(0.0001, now + transitionTime);

    osc4GainNode.gain.setValueAtTime(osc4GainNode.gain.value, now);
    osc4GainNode.gain.exponentialRampToValueAtTime(0.0001, now + transitionTime);

    // Dark filter
    ambientFilter.frequency.setValueAtTime(ambientFilter.frequency.value, now);
    ambientFilter.frequency.exponentialRampToValueAtTime(250, now + transitionTime);
  } else {
    // Restore perfect fifth (87Hz) if transitioning back
    ambientOsc2.frequency.setValueAtTime(ambientOsc2.frequency.value, now);
    ambientOsc2.frequency.exponentialRampToValueAtTime(87, now + transitionTime);

    if (phase === 'main_sequence') {
      // BASE MAIN SEQUENCE
      ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
      ambientGain.gain.exponentialRampToValueAtTime(0.045, now + transitionTime);

      osc3GainNode.gain.setValueAtTime(osc3GainNode.gain.value, now);
      osc3GainNode.gain.exponentialRampToValueAtTime(0.12, now + transitionTime);

      osc4GainNode.gain.setValueAtTime(osc4GainNode.gain.value, now);
      osc4GainNode.gain.exponentialRampToValueAtTime(0.06, now + transitionTime);

      ambientFilter.frequency.setValueAtTime(ambientFilter.frequency.value, now);
      ambientFilter.frequency.exponentialRampToValueAtTime(450, now + transitionTime);
    } else if (phase === 'red_giant') {
      // INTENSE RED GIANT (20% more intense relatively: base 0.045 + (0.020 * 1.2))
      ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
      ambientGain.gain.exponentialRampToValueAtTime(0.069, now + transitionTime);

      osc3GainNode.gain.setValueAtTime(osc3GainNode.gain.value, now);
      osc3GainNode.gain.exponentialRampToValueAtTime(0.192, now + transitionTime);

      osc4GainNode.gain.setValueAtTime(osc4GainNode.gain.value, now);
      osc4GainNode.gain.exponentialRampToValueAtTime(0.096, now + transitionTime);

      ambientFilter.frequency.setValueAtTime(ambientFilter.frequency.value, now);
      ambientFilter.frequency.exponentialRampToValueAtTime(630, now + transitionTime);
    } else if (phase === 'supergiant' || phase === 'collapse') {
      // MASSIVE SUPERGIANT / CHAOTIC COLLAPSE (20% more intense relatively: base 0.045 + (0.045 * 1.2))
      ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
      ambientGain.gain.exponentialRampToValueAtTime(0.099, now + transitionTime);

      osc3GainNode.gain.setValueAtTime(osc3GainNode.gain.value, now);
      osc3GainNode.gain.exponentialRampToValueAtTime(0.288, now + transitionTime);

      osc4GainNode.gain.setValueAtTime(osc4GainNode.gain.value, now);
      osc4GainNode.gain.exponentialRampToValueAtTime(0.168, now + transitionTime);

      ambientFilter.frequency.setValueAtTime(ambientFilter.frequency.value, now);
      ambientFilter.frequency.exponentialRampToValueAtTime(870, now + transitionTime);
    }
  }
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


