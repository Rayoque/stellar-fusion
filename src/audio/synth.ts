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
  gain.gain.linearRampToValueAtTime(0.28, now + 0.025);
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

export function startAmbientDrone(): void {
  if (!bgSoundEnabled || !audioCtx || ambientOsc1) return;

  ambientOsc1 = audioCtx.createOscillator();
  ambientOsc2 = audioCtx.createOscillator();
  ambientOsc3 = audioCtx.createOscillator();
  ambientOsc4 = audioCtx.createOscillator();
  ambientGain = audioCtx.createGain();
  
  const filter = audioCtx.createBiquadFilter();
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  
  const osc3Gain = audioCtx.createGain();
  const osc4Gain = audioCtx.createGain();

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
  filter.type = 'lowpass';
  filter.frequency.value = 450;

  // LFO to slowly modulate pitch for an organic, shifting interstellar drone
  lfo.type = 'sine';
  lfo.frequency.value = 0.05;
  lfoGain.gain.value = 2.0;

  // Ambient master gain
  ambientGain.gain.value = 0.045;

  // Individual gains for delicate balance
  osc3Gain.gain.value = 0.12; 
  osc4Gain.gain.value = 0.06; // Soft, warm presence to be heard on built-in speakers

  // Connect LFO for gentle pitch modulation across all oscillators
  lfo.connect(lfoGain);
  lfoGain.connect(ambientOsc1.frequency);
  lfoGain.connect(ambientOsc2.frequency);
  lfoGain.connect(ambientOsc3.frequency);
  lfoGain.connect(ambientOsc4.frequency);

  // Connect oscillators to their gain nodes, then to filter, then to master destination
  ambientOsc1.connect(filter);
  ambientOsc2.connect(filter);
  
  ambientOsc3.connect(osc3Gain);
  osc3Gain.connect(filter);

  ambientOsc4.connect(osc4Gain);
  osc4Gain.connect(filter);

  filter.connect(ambientGain);
  ambientGain.connect(audioCtx.destination);

  // Start all oscillators
  ambientOsc1.start();
  ambientOsc2.start();
  ambientOsc3.start();
  ambientOsc4.start();
  lfo.start();
}

export function stopAmbientDrone(): void {
  if (ambientOsc1) ambientOsc1.stop();
  if (ambientOsc2) ambientOsc2.stop();
  if (ambientOsc3) ambientOsc3.stop();
  if (ambientOsc4) ambientOsc4.stop();
  ambientOsc1 = ambientOsc2 = ambientOsc3 = ambientOsc4 = ambientGain = null;
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

