// src/audio/synth.ts
import { ELEMENTS } from '../game/elements';
import type { ElementSymbol } from '../game/types';

let audioCtx: AudioContext | null = null;

export function initAudio(): void {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export function playMerge(parent: ElementSymbol, child: ElementSymbol): void {
  if (!audioCtx) return;

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
  if (!audioCtx) return;
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
  if (!audioCtx) return;
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
let ambientOsc5: OscillatorNode | null = null;
let ambientGain: GainNode | null = null;

export function startAmbientDrone(): void {
  if (!audioCtx || ambientOsc1) return;

  ambientOsc1 = audioCtx.createOscillator();
  ambientOsc2 = audioCtx.createOscillator();
  ambientOsc3 = audioCtx.createOscillator();
  ambientOsc4 = audioCtx.createOscillator();
  ambientOsc5 = audioCtx.createOscillator();
  ambientGain = audioCtx.createGain();
  
  const filter = audioCtx.createBiquadFilter();
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  
  const osc3Gain = audioCtx.createGain();
  const osc4Gain = audioCtx.createGain();
  const osc5Gain = audioCtx.createGain();

  // Low base frequencies (sub-bass)
  ambientOsc1.type = 'sine';
  ambientOsc1.frequency.value = 58; // Bb1

  ambientOsc2.type = 'sine';
  ambientOsc2.frequency.value = 87; // F2 (fifth)

  // Mid-range harmonic helper
  ambientOsc3.type = 'sine';
  ambientOsc3.frequency.value = 174; // F3

  // Higher frequency textures (audible on small phone/laptop speakers)
  // 348 Hz (F4) - Warm triangle wave for analog-synth style texture
  ambientOsc4.type = 'triangle';
  ambientOsc4.frequency.value = 348;

  // 522 Hz (C5) - Gentle sine wave for shimmering cosmic high fifth
  ambientOsc5.type = 'sine';
  ambientOsc5.frequency.value = 522;

  // Adjust lowpass filter cutoff to allow higher frequency textures to shine through
  filter.type = 'lowpass';
  filter.frequency.value = 750; // raised from 420 to 750 to let the texture breathe

  // LFO to slowly modulate pitch for an organic, shifting interstellar drone
  lfo.type = 'sine';
  lfo.frequency.value = 0.06;
  lfoGain.gain.value = 2.5;

  // Ambient master gain
  ambientGain.gain.value = 0.045;

  // Individual gains for delicate balance
  osc3Gain.gain.value = 0.12; 
  osc4Gain.gain.value = 0.05; // Soft volume for the triangle wave so it's a gentle textured shimmer
  osc5Gain.gain.value = 0.04; // Soft shimmering high-harmonic sine wave

  // Connect LFO for gentle pitch modulation across all oscillators
  lfo.connect(lfoGain);
  lfoGain.connect(ambientOsc1.frequency);
  lfoGain.connect(ambientOsc2.frequency);
  lfoGain.connect(ambientOsc3.frequency);
  lfoGain.connect(ambientOsc4.frequency);
  lfoGain.connect(ambientOsc5.frequency);

  // Connect oscillators to their gain nodes, then to filter, then to master destination
  ambientOsc1.connect(filter);
  ambientOsc2.connect(filter);
  
  ambientOsc3.connect(osc3Gain);
  osc3Gain.connect(filter);

  ambientOsc4.connect(osc4Gain);
  osc4Gain.connect(filter);

  ambientOsc5.connect(osc5Gain);
  osc5Gain.connect(filter);

  filter.connect(ambientGain);
  ambientGain.connect(audioCtx.destination);

  // Start all oscillators
  ambientOsc1.start();
  ambientOsc2.start();
  ambientOsc3.start();
  ambientOsc4.start();
  ambientOsc5.start();
  lfo.start();
}

export function stopAmbientDrone(): void {
  if (ambientOsc1) ambientOsc1.stop();
  if (ambientOsc2) ambientOsc2.stop();
  if (ambientOsc3) ambientOsc3.stop();
  if (ambientOsc4) ambientOsc4.stop();
  if (ambientOsc5) ambientOsc5.stop();
  ambientOsc1 = ambientOsc2 = ambientOsc3 = ambientOsc4 = ambientOsc5 = ambientGain = null;
}
