import {Injectable, OnDestroy} from '@angular/core';
import {SettingsService} from './settings.service';
import {customOscillators} from 'web-audio-oscillators';
import {LogService} from './log.service';

export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';
export type SynthFilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch';
export type SynthLfoTarget = 'pitch' | 'filter';

/**
 * An array of supported oscillator types used to define the waveform shape
 * of an audio oscillator. These types dictate the basic sound character
 * produced by the oscillator.
 *
 * The possible values are:
 * - 'sine': Represents a smooth periodic oscillation.
 * - 'square': Produces a waveform that alternates between two levels with equal duration.
 * - 'sawtooth': Generates a waveform that ramps up and drops sharply.
 * - 'triangle': Represents a waveform with a linear rise and fall, resembling a triangle shape.
 *
 * This variable is typically used in audio synthesis applications where
 * different oscillator shapes produce varying tonal qualities.
 */
export const OSCILLATOR_TYPES: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle'];
export const FILTER_TYPES: SynthFilterType[] = ['lowpass', 'highpass', 'bandpass', 'notch'];
export const LFO_TARGETS: SynthLfoTarget[] = ['pitch', 'filter'];

export interface SynthOscillatorConfig {
  type: OscillatorType;
  detune: number;
  volume: number;
  pan?: number;
  octave?: number;
}

export interface SynthPatch {
  name: string;
  oscillators: SynthOscillatorConfig[];
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  filter?: {
    enabled: boolean;
    type: SynthFilterType;
    frequency: number;
    resonance: number;
  };
  lfo?: {
    enabled: boolean;
    target: SynthLfoTarget;
    rate: number;
    depth: number;
  };
  delay?: {
    enabled: boolean;
    time: number;
    feedback: number;
    mix: number;
  };
  master?: {
    volume: number;
  };
}

export const DEFAULT_SYNTH_PATCH: SynthPatch = {
  name: 'Warm Pad',
  oscillators: [
    {type: 'sawtooth', detune: -10, volume: 0.26, pan: -0.35, octave: 0},
    {type: 'sawtooth', detune: 10, volume: 0.26, pan: 0.35, octave: 0}
  ],
  envelope: {
    attack: 0.1,
    decay: 0.2,
    sustain: 0.7,
    release: 0.3
  },
  filter: {
    enabled: true,
    type: 'lowpass',
    frequency: 2400,
    resonance: 4,
  },
  lfo: {
    enabled: false,
    target: 'pitch',
    rate: 4,
    depth: 12,
  },
  delay: {
    enabled: false,
    time: 0.24,
    feedback: 0.24,
    mix: 0.18,
  },
  master: {
    volume: 0.72,
  },
};

export const SYNTH_PRESET_PATCHES: readonly SynthPatch[] = [
  {
    name: 'Piano',
    oscillators: [
      {type: 'triangle', detune: -3, volume: 0.34, pan: -0.08, octave: 0},
      {type: 'sine', detune: 5, volume: 0.22, pan: 0.08, octave: 0},
      {type: 'sine', detune: 0, volume: 0.08, pan: 0, octave: 1},
    ],
    envelope: {
      attack: 0.006,
      decay: 0.34,
      sustain: 0.28,
      release: 0.32,
    },
    filter: {
      enabled: true,
      type: 'lowpass',
      frequency: 5200,
      resonance: 1.2,
    },
    lfo: {
      enabled: false,
      target: 'pitch',
      rate: 4,
      depth: 4,
    },
    delay: {
      enabled: false,
      time: 0.18,
      feedback: 0.12,
      mix: 0.08,
    },
    master: {
      volume: 0.74,
    },
  },
  {
    name: 'Guitar',
    oscillators: [
      {type: 'sawtooth', detune: -6, volume: 0.22, pan: -0.12, octave: 0},
      {type: 'triangle', detune: 4, volume: 0.18, pan: 0.12, octave: 0},
      {type: 'square', detune: 0, volume: 0.05, pan: 0, octave: 1},
    ],
    envelope: {
      attack: 0.008,
      decay: 0.22,
      sustain: 0.18,
      release: 0.22,
    },
    filter: {
      enabled: true,
      type: 'bandpass',
      frequency: 1800,
      resonance: 5.5,
    },
    lfo: {
      enabled: false,
      target: 'pitch',
      rate: 5,
      depth: 6,
    },
    delay: {
      enabled: true,
      time: 0.12,
      feedback: 0.16,
      mix: 0.1,
    },
    master: {
      volume: 0.68,
    },
  },
  {
    name: 'Organ',
    oscillators: [
      {type: 'sine', detune: 0, volume: 0.26, pan: -0.1, octave: 0},
      {type: 'square', detune: 0, volume: 0.16, pan: 0.1, octave: 0},
      {type: 'sine', detune: 0, volume: 0.14, pan: 0, octave: 1},
    ],
    envelope: {
      attack: 0.01,
      decay: 0.05,
      sustain: 0.88,
      release: 0.16,
    },
    filter: {
      enabled: true,
      type: 'lowpass',
      frequency: 3600,
      resonance: 2.4,
    },
    lfo: {
      enabled: true,
      target: 'pitch',
      rate: 5.8,
      depth: 3,
    },
    delay: {
      enabled: false,
      time: 0.22,
      feedback: 0.18,
      mix: 0.12,
    },
    master: {
      volume: 0.66,
    },
  },
  {
    name: 'Strings',
    oscillators: [
      {type: 'sawtooth', detune: -12, volume: 0.22, pan: -0.35, octave: 0},
      {type: 'sawtooth', detune: 12, volume: 0.22, pan: 0.35, octave: 0},
      {type: 'triangle', detune: 0, volume: 0.12, pan: 0, octave: 1},
    ],
    envelope: {
      attack: 0.48,
      decay: 0.28,
      sustain: 0.78,
      release: 1.3,
    },
    filter: {
      enabled: true,
      type: 'lowpass',
      frequency: 2300,
      resonance: 2.2,
    },
    lfo: {
      enabled: true,
      target: 'pitch',
      rate: 4.2,
      depth: 7,
    },
    delay: {
      enabled: true,
      time: 0.28,
      feedback: 0.2,
      mix: 0.14,
    },
    master: {
      volume: 0.7,
    },
  },
  {
    name: 'Bass',
    oscillators: [
      {type: 'square', detune: 0, volume: 0.3, pan: 0, octave: -1},
      {type: 'sawtooth', detune: -5, volume: 0.16, pan: -0.08, octave: -1},
      {type: 'triangle', detune: 4, volume: 0.12, pan: 0.08, octave: 0},
    ],
    envelope: {
      attack: 0.008,
      decay: 0.14,
      sustain: 0.42,
      release: 0.2,
    },
    filter: {
      enabled: true,
      type: 'lowpass',
      frequency: 760,
      resonance: 6,
    },
    lfo: {
      enabled: false,
      target: 'filter',
      rate: 2,
      depth: 120,
    },
    delay: {
      enabled: false,
      time: 0.16,
      feedback: 0.1,
      mix: 0.05,
    },
    master: {
      volume: 0.74,
    },
  },
  {
    name: 'Bell',
    oscillators: [
      {type: 'sine', detune: 0, volume: 0.28, pan: 0, octave: 0},
      {type: 'triangle', detune: 7, volume: 0.12, pan: -0.15, octave: 1},
      {type: 'sine', detune: -9, volume: 0.08, pan: 0.15, octave: 2},
    ],
    envelope: {
      attack: 0.004,
      decay: 0.75,
      sustain: 0.08,
      release: 1.15,
    },
    filter: {
      enabled: true,
      type: 'highpass',
      frequency: 420,
      resonance: 1.8,
    },
    lfo: {
      enabled: false,
      target: 'pitch',
      rate: 6,
      depth: 10,
    },
    delay: {
      enabled: true,
      time: 0.26,
      feedback: 0.34,
      mix: 0.22,
    },
    master: {
      volume: 0.62,
    },
  },
  {
    name: 'Lead',
    oscillators: [
      {type: 'sawtooth', detune: -8, volume: 0.24, pan: -0.12, octave: 0},
      {type: 'square', detune: 8, volume: 0.18, pan: 0.12, octave: 0},
    ],
    envelope: {
      attack: 0.018,
      decay: 0.12,
      sustain: 0.64,
      release: 0.18,
    },
    filter: {
      enabled: true,
      type: 'lowpass',
      frequency: 4200,
      resonance: 4.4,
    },
    lfo: {
      enabled: true,
      target: 'pitch',
      rate: 5,
      depth: 8,
    },
    delay: {
      enabled: true,
      time: 0.18,
      feedback: 0.18,
      mix: 0.12,
    },
    master: {
      volume: 0.68,
    },
  },
  DEFAULT_SYNTH_PATCH,
];

export const SYNTH_PRESET_NAMES: readonly string[] = SYNTH_PRESET_PATCHES.map(patch => patch.name);

export const FREQUENCIES: { [note: string]: number } = {
  // Octave 1
  'C1': 65.41, 'C#1': 69.30, 'D1': 73.42, 'D#1': 77.78, 'E1': 82.41,
  'F1': 87.31, 'F#1': 92.50, 'G1': 98.00, 'G#1': 103.83, 'A1': 110.00,
  'A#1': 116.54, 'B1': 123.47,

  // Octave 2
  'C2': 130.81, 'C#2': 138.59, 'D2': 146.83, 'D#2': 155.56, 'E2': 164.81,
  'F2': 174.61, 'F#2': 185.00, 'G2': 196.00, 'G#2': 207.65, 'A2': 220.00,
  'A#2': 233.08, 'B2': 246.94,

  // Octave 3
  'C3': 261.63, 'C#3': 277.18, 'D3': 293.66, 'D#3': 311.13, 'E3': 329.63,
  'F3': 349.23, 'F#3': 369.99, 'G3': 392.00, 'G#3': 415.30, 'A3': 440.00,
  'A#3': 466.16, 'B3': 493.88,

  // Octave 4
  'C4': 523.25, 'C#4': 554.37, 'D4': 587.33, 'D#4': 622.25, 'E4': 659.25,
  'F4': 698.46, 'F#4': 739.99, 'G4': 783.99, 'G#4': 830.61, 'A4': 880.00,
  'A#4': 932.33, 'B4': 987.77,

  // Octave 5
  'C5': 1046.50, 'C#5': 1108.73, 'D5': 1174.66, 'D#5': 1244.51, 'E5': 1318.51,
  'F5': 1396.91, 'F#5': 1479.98, 'G5': 1567.98, 'G#5': 1661.22, 'A5': 1760.00,
  'A#5': 1864.66, 'B5': 1975.53,

  // Octave 6
  'C6': 2093.00, 'C#6': 2217.46, 'D6': 2349.32, 'D#6': 2489.02, 'E6': 2637.02,
  'F6': 2793.83, 'F#6': 2959.96, 'G6': 3135.96, 'G#6': 3322.44, 'A6': 3520.00,
  'A#6': 3729.31, 'B6': 3951.07,

  // Octave 7
  'C7': 4186.01, 'C#7': 4434.92, 'D7': 4698.63, 'D#7': 4978.03, 'E7': 5274.04,
  'F7': 5587.65, 'F#7': 5919.91, 'G7': 6271.93, 'G#7': 6644.88, 'A7': 7040.00,
  'A#7': 7458.62, 'B7': 7902.13,

  // Octave 8
  'C8': 8372.02, 'C#8': 8869.84, 'D8': 9397.27, 'D#8': 9956.06, 'E8': 10548.08,
  'F8': 11175.30, 'F#8': 11839.82, 'G8': 12543.85, 'G#8': 13289.75, 'A8': 14080.00,
  'A#8': 14917.24, 'B8': 15804.26
};


@Injectable({
  providedIn: 'root'
})
export class PatchService implements OnDestroy {

  private audioCtx?: AudioContext;

  constructor(
    private settingsService: SettingsService,
    private readonly logger: LogService
  ) {
  }

  registerPatches() {
    this.settingsService.registerSettingSet('keyboard-patches', this.getPresetPatches());
  }

  playNote(note: string, duration: number = 0.6): void {
    this.playMultipleNotes([note], duration);
  }

  playCustomOscillator(notes: string[], duration = 0.6, type: string = 'bass'): void {
    const presetPatch = this.getPresetPatch(type);
    if (presetPatch) {
      notes.forEach(note => this.playPatch(note, duration, presetPatch));
      return;
    }

    const audioCtx = this.getAudioContext();
    const oscillatorFactories = customOscillators as Record<string, (context: AudioContext) => OscillatorNode>;
    const createCustomOscillator = oscillatorFactories[type];

    if (!createCustomOscillator) {
      this.logger.warn(`Unknown oscillator patch: ${type}`);
      return;
    }

    const customOscillator = createCustomOscillator(audioCtx);
    const time = audioCtx.currentTime;
    for (const note of notes) {
      const freq = FREQUENCIES[note];
      if (!freq) {
        this.logger.warn(`Unknown note: ${note}`);
        continue;
      }
      const gain = audioCtx.createGain();
      const pan = audioCtx.createStereoPanner();
      pan.pan.setValueAtTime(-1, time);
      customOscillator.connect(pan);


      customOscillator.frequency.setValueAtTime(freq, time);
      customOscillator.connect(gain);
      customOscillator.connect(audioCtx.destination);

      gain.gain.setValueAtTime(0.05, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      customOscillator.start();
      customOscillator.stop(time + duration);
    }
  }

  playPreset(note: string, duration = 0.6, presetName = 'Piano'): void {
    const presetPatch = this.getPresetPatch(presetName);
    if (!presetPatch) {
      this.logger.warn(`Unknown preset patch: ${presetName}`);
      return;
    }

    this.playPatch(note, duration, presetPatch);
  }

  playMultipleNotes(notes: string[], duration: number = 0.6): void {
    const audioCtx = this.getAudioContext();
    const time = audioCtx.currentTime;

    for (const note of notes) {
      const freq = FREQUENCIES[note];
      if (!freq) {
        console.warn(`Unknown note: ${note}`);
        continue;
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.start();
      osc.stop(time + duration);
    }
  }

  playPatch(note: string, duration = 0.5, patch: SynthPatch = DEFAULT_SYNTH_PATCH): void {
    const freq = FREQUENCIES[note];
    if (!freq) {
      this.logger.warn(`Unknown note: ${note}`);
      return;
    }

    const audioCtx = this.getAudioContext();
    const playablePatch = this.normalizePatch(patch);
    const now = audioCtx.currentTime;
    const attack = Math.max(0.001, playablePatch.envelope.attack);
    const decay = Math.max(0.001, playablePatch.envelope.decay);
    const release = Math.max(0.001, playablePatch.envelope.release);
    const releaseStart = now + Math.max(0.05, duration);
    const releaseEnd = releaseStart + release;
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(playablePatch.master?.volume ?? 0.7, now);

    const filter = playablePatch.filter?.enabled ? audioCtx.createBiquadFilter() : null;
    if (filter && playablePatch.filter) {
      filter.type = playablePatch.filter.type;
      filter.frequency.setValueAtTime(playablePatch.filter.frequency, now);
      filter.Q.setValueAtTime(playablePatch.filter.resonance, now);
      filter.connect(masterGain);
    }

    this.connectEffectsChain(audioCtx, masterGain, playablePatch);

    const lfo = playablePatch.lfo?.enabled ? audioCtx.createOscillator() : null;
    const lfoGain = playablePatch.lfo?.enabled ? audioCtx.createGain() : null;
    if (lfo && lfoGain && playablePatch.lfo) {
      lfo.frequency.setValueAtTime(playablePatch.lfo.rate, now);
      lfoGain.gain.setValueAtTime(playablePatch.lfo.depth, now);
      lfo.connect(lfoGain);

      if (playablePatch.lfo.target === 'filter' && filter) {
        lfoGain.connect(filter.frequency);
      }

      lfo.start(now);
      lfo.stop(releaseEnd);
    }

    playablePatch.oscillators.forEach(config => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const pan = audioCtx.createStereoPanner();
      const octave = config.octave ?? 0;
      const oscillatorFrequency = freq * Math.pow(2, octave);
      const peakGain = this.clamp(config.volume, 0, 1);
      const sustainGain = peakGain * this.clamp(playablePatch.envelope.sustain, 0, 1);

      osc.type = config.type;
      osc.frequency.setValueAtTime(oscillatorFrequency, now);
      osc.detune.setValueAtTime(config.detune, now);
      pan.pan.setValueAtTime(this.clamp(config.pan ?? 0, -1, 1), now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + attack);
      gain.gain.linearRampToValueAtTime(sustainGain, now + attack + decay);
      gain.gain.setValueAtTime(sustainGain, releaseStart);
      gain.gain.linearRampToValueAtTime(0.0001, releaseEnd);

      if (lfoGain && playablePatch.lfo?.target === 'pitch') {
        lfoGain.connect(osc.detune);
      }

      osc.connect(gain);
      gain.connect(pan);
      pan.connect(filter ?? masterGain);

      osc.start(now);
      osc.stop(releaseEnd);
    });
  }

  savePatch(patch: SynthPatch): void {
    const normalizedPatch = this.normalizePatch(patch);
    const existingPatches = this.getRegisteredPatches();
    const nextPatches = [
      normalizedPatch,
      ...existingPatches.filter(savedPatch => savedPatch.name !== normalizedPatch.name),
    ];

    this.settingsService.updateSettingSet('keyboard-patches', nextPatches);
  }

  loadPatch(name: string): SynthPatch | null {
    const patches = this.settingsService.getSettingSet('keyboard-patches')?.value as SynthPatch[] | undefined;
    const patch = patches?.find(savedPatch => savedPatch.name === name);
    return patch ? this.normalizePatch(patch) : this.getPresetPatch(name);
  }

  getPresetPatches(): SynthPatch[] {
    return SYNTH_PRESET_PATCHES.map(patch => this.clonePatch(patch));
  }

  getPresetPatch(name: string): SynthPatch | null {
    const normalizedName = name.trim().toLowerCase();
    const patch = SYNTH_PRESET_PATCHES.find(preset => preset.name.toLowerCase() === normalizedName);
    return patch ? this.clonePatch(patch) : null;
  }

  clonePatch(patch: SynthPatch, nextName = patch.name): SynthPatch {
    const normalized = this.normalizePatch(patch);
    return {
      ...normalized,
      name: nextName,
      oscillators: normalized.oscillators.map(oscillator => ({...oscillator})),
      envelope: {...normalized.envelope},
      filter: normalized.filter ? {...normalized.filter} : undefined,
      lfo: normalized.lfo ? {...normalized.lfo} : undefined,
      delay: normalized.delay ? {...normalized.delay} : undefined,
      master: normalized.master ? {...normalized.master} : undefined,
    };
  }

  normalizePatch(patch: SynthPatch): SynthPatch {
    return {
      name: patch.name?.trim() || 'Untitled Patch',
      oscillators: (patch.oscillators.length ? patch.oscillators : DEFAULT_SYNTH_PATCH.oscillators).map(oscillator => ({
        type: oscillator.type,
        detune: this.clamp(oscillator.detune ?? 0, -2400, 2400),
        volume: this.clamp(oscillator.volume ?? 0.2, 0, 1),
        pan: this.clamp(oscillator.pan ?? 0, -1, 1),
        octave: this.clamp(Math.round(oscillator.octave ?? 0), -2, 2),
      })),
      envelope: {
        attack: this.clamp(patch.envelope.attack ?? DEFAULT_SYNTH_PATCH.envelope.attack, 0.001, 5),
        decay: this.clamp(patch.envelope.decay ?? DEFAULT_SYNTH_PATCH.envelope.decay, 0.001, 5),
        sustain: this.clamp(patch.envelope.sustain ?? DEFAULT_SYNTH_PATCH.envelope.sustain, 0, 1),
        release: this.clamp(patch.envelope.release ?? DEFAULT_SYNTH_PATCH.envelope.release, 0.001, 8),
      },
      filter: {
        enabled: patch.filter?.enabled ?? DEFAULT_SYNTH_PATCH.filter?.enabled ?? false,
        type: patch.filter?.type ?? DEFAULT_SYNTH_PATCH.filter?.type ?? 'lowpass',
        frequency: this.clamp(patch.filter?.frequency ?? DEFAULT_SYNTH_PATCH.filter?.frequency ?? 2400, 40, 14000),
        resonance: this.clamp(patch.filter?.resonance ?? DEFAULT_SYNTH_PATCH.filter?.resonance ?? 1, 0.1, 30),
      },
      lfo: {
        enabled: patch.lfo?.enabled ?? DEFAULT_SYNTH_PATCH.lfo?.enabled ?? false,
        target: patch.lfo?.target ?? DEFAULT_SYNTH_PATCH.lfo?.target ?? 'pitch',
        rate: this.clamp(patch.lfo?.rate ?? DEFAULT_SYNTH_PATCH.lfo?.rate ?? 4, 0.05, 30),
        depth: this.clamp(patch.lfo?.depth ?? DEFAULT_SYNTH_PATCH.lfo?.depth ?? 8, 0, 2400),
      },
      delay: {
        enabled: patch.delay?.enabled ?? DEFAULT_SYNTH_PATCH.delay?.enabled ?? false,
        time: this.clamp(patch.delay?.time ?? DEFAULT_SYNTH_PATCH.delay?.time ?? 0.2, 0.01, 1.5),
        feedback: this.clamp(patch.delay?.feedback ?? DEFAULT_SYNTH_PATCH.delay?.feedback ?? 0.2, 0, 0.92),
        mix: this.clamp(patch.delay?.mix ?? DEFAULT_SYNTH_PATCH.delay?.mix ?? 0.15, 0, 0.85),
      },
      master: {
        volume: this.clamp(patch.master?.volume ?? DEFAULT_SYNTH_PATCH.master?.volume ?? 0.7, 0, 1),
      },
    };
  }

  ngOnDestroy() {
    this.audioCtx?.close();
  }

  private getAudioContext(): AudioContext {
    this.audioCtx ??= new AudioContext();

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(error => this.logger.warn(`Audio context resume failed: ${String(error)}`));
    }

    return this.audioCtx;
  }

  private connectEffectsChain(audioCtx: AudioContext, masterGain: GainNode, patch: SynthPatch): void {
    if (!patch.delay?.enabled || patch.delay.mix <= 0) {
      masterGain.connect(audioCtx.destination);
      return;
    }

    const delay = audioCtx.createDelay(1.5);
    const feedback = audioCtx.createGain();
    const wet = audioCtx.createGain();
    const dry = audioCtx.createGain();

    delay.delayTime.setValueAtTime(patch.delay.time, audioCtx.currentTime);
    feedback.gain.setValueAtTime(patch.delay.feedback, audioCtx.currentTime);
    wet.gain.setValueAtTime(patch.delay.mix, audioCtx.currentTime);
    dry.gain.setValueAtTime(1 - patch.delay.mix, audioCtx.currentTime);

    masterGain.connect(dry);
    dry.connect(audioCtx.destination);

    masterGain.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(audioCtx.destination);
  }

  private getRegisteredPatches(): SynthPatch[] {
    const patches = this.settingsService.getSettingSet('keyboard-patches')?.value as SynthPatch[] | undefined;
    return (patches ?? this.getPresetPatches()).map(patch => this.normalizePatch(patch));
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
