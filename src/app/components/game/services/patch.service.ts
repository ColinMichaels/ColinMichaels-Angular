import {Injectable, OnDestroy} from '@angular/core';
import {SettingsService} from './settings.service';
import {customOscillators} from 'web-audio-oscillators';
import {LogService} from './log.service';

export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

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

export interface SynthPatch {
  name: string;
  oscillators: {
    type: OscillatorType;
    detune: number;
    volume: number;
    pan?: number;
  }[];
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
}

export const DEFAULT_SYNTH_PATCH: SynthPatch = {
  name: 'Warm Pad',
  oscillators: [
    {type: 'sawtooth', detune: -10, volume: 0.3, pan: 0},
    {type: 'sawtooth', detune: 10, volume: 0.3, pan: 2}
  ],
  envelope: {
    attack: 0.1,
    decay: 0.2,
    sustain: 0.7,
    release: 0.3
  }
};

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

  private audioCtx = new AudioContext();

  constructor(
    private settingsService: SettingsService,
    private readonly logger: LogService
  ) {
  }

  registerPatches() {
    this.settingsService.registerSettingSet('keyboard-patches', [DEFAULT_SYNTH_PATCH]);
  }

  playNote(note: string, duration: number = 0.6): void {
    this.playMultipleNotes([note], duration);
  }

  playCustomOscillator(notes: string[], duration = 0.6, type: string = 'bass'): void {
    // @ts-ignore
    const customOscillator = customOscillators[type](this.audioCtx);
    const time = this.audioCtx.currentTime;
    for (const note of notes) {
      const freq = FREQUENCIES[note];
      if (!freq) {
        this.logger.warn(`Unknown note: ${note}`);
        continue;
      }
      const gain = this.audioCtx.createGain();
      const pan = this.audioCtx.createStereoPanner();
      pan.pan.setValueAtTime(-1, time);
      customOscillator.connect(pan);


      customOscillator.frequency.setValueAtTime(freq, time);
      customOscillator.connect(gain);
      customOscillator.connect(this.audioCtx.destination);

      gain.gain.setValueAtTime(0.05, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      customOscillator.start();
      customOscillator.stop(time + duration);
    }
  }

  playMultipleNotes(notes: string[], duration: number = 0.6): void {
    const time = this.audioCtx.currentTime;

    for (const note of notes) {
      const freq = FREQUENCIES[note];
      if (!freq) {
        console.warn(`Unknown note: ${note}`);
        continue;
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.start();
      osc.stop(time + duration);
    }
  }

  playPatch(note: string, duration = 0.5, patch: SynthPatch = DEFAULT_SYNTH_PATCH,) {
    const freq = FREQUENCIES[note];
    const now = this.audioCtx.currentTime;

    patch.oscillators.forEach(config => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const pan = this.audioCtx.createStereoPanner();

      osc.type = config.type;
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime(config.detune, now);
      osc.connect(pan);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(config.volume, now + patch.envelope.attack);
      gain.gain.linearRampToValueAtTime(patch.envelope.sustain, now + patch.envelope.attack + patch.envelope.decay);
      gain.gain.linearRampToValueAtTime(0, now + duration + patch.envelope.release);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + duration + patch.envelope.release);
    });
  }

  savePatch(patch: SynthPatch) {
    this.settingsService.updateSettingSet('keyboard-patches', [patch]);
  }

  loadPatch(name: string): SynthPatch | null {
    const raw = this.settingsService.getSettingSet('keyboard-patches')?.value;
    console.warn('raw defaultPatch ', raw);
    return DEFAULT_SYNTH_PATCH;
  }

  ngOnDestroy() {
    this.audioCtx.close();
  }
}
