import {LogService} from '../log.service';

type AudioContextFactory = () => AudioContext;
type SampleFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface SoundFontInstrumentDefinition {
  instrument: string;
  gain: number;
  attack: number;
  release: number;
}

const SOUNDFONT_SAMPLE_BASE_URL = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/';
const MINIMUM_GAIN = 0.0001;

const soundFontInstrument = (
  instrument: string,
  gain: number,
  attack: number,
  release: number
): SoundFontInstrumentDefinition => ({
  instrument,
  gain,
  attack,
  release,
});

const SOUNDFONT_INSTRUMENTS: Record<string, SoundFontInstrumentDefinition> = {
  piano: soundFontInstrument('acoustic_grand_piano', 0.82, 0.005, 0.8),
  'bright piano': soundFontInstrument('bright_acoustic_piano', 0.76, 0.004, 0.7),
  'soft piano': soundFontInstrument('acoustic_grand_piano', 0.66, 0.018, 1),
  'electric piano': soundFontInstrument('electric_piano_1', 0.72, 0.01, 1),
  guitar: soundFontInstrument('acoustic_guitar_steel', 0.72, 0.006, 0.7),
  'nylon guitar': soundFontInstrument('acoustic_guitar_nylon', 0.72, 0.008, 0.75),
  'clean electric guitar': soundFontInstrument('electric_guitar_clean', 0.68, 0.006, 0.65),
  'muted guitar': soundFontInstrument('electric_guitar_muted', 0.74, 0.004, 0.32),
  organ: soundFontInstrument('drawbar_organ', 0.7, 0.01, 0.25),
  'jazz organ': soundFontInstrument('percussive_organ', 0.7, 0.006, 0.28),
  'pipe organ': soundFontInstrument('church_organ', 0.74, 0.08, 1.1),
  strings: soundFontInstrument('string_ensemble_1', 0.72, 0.28, 1.2),
  'slow strings': soundFontInstrument('string_ensemble_2', 0.72, 0.5, 1.8),
  'synth strings': soundFontInstrument('synth_strings_1', 0.7, 0.2, 1.2),
  'warm pad': soundFontInstrument('pad_2_warm', 0.72, 0.25, 1.4),
  'glass pad': soundFontInstrument('pad_7_halo', 0.68, 0.45, 1.6),
  bass: soundFontInstrument('electric_bass_finger', 0.78, 0.006, 0.45),
  'sub bass': soundFontInstrument('synth_bass_1', 0.78, 0.008, 0.42),
  'synth bass': soundFontInstrument('synth_bass_2', 0.76, 0.006, 0.38),
  'pluck bass': soundFontInstrument('electric_bass_pick', 0.74, 0.004, 0.3),
  bell: soundFontInstrument('music_box', 0.74, 0.005, 1.1),
  vibraphone: soundFontInstrument('vibraphone', 0.7, 0.006, 1.2),
  marimba: soundFontInstrument('marimba', 0.74, 0.004, 0.6),
  lead: soundFontInstrument('lead_2_sawtooth', 0.68, 0.01, 0.35),
  'square lead': soundFontInstrument('lead_1_square', 0.68, 0.008, 0.34),
  'acid lead': soundFontInstrument('lead_5_charang', 0.66, 0.006, 0.3),
};

export class SoundFontSampledSoundDriver {
  private audioCtx?: AudioContext;
  private readonly buffers = new Map<string, Promise<AudioBuffer>>();
  private readonly activeSources = new Set<AudioBufferSourceNode>();

  constructor(
    private readonly logger: LogService,
    private readonly createAudioContext: AudioContextFactory = () => new AudioContext(),
    private readonly fetchSample: SampleFetcher = (input, init) => fetch(input, init)
  ) {
  }

  canPlayPreset(presetName: string): boolean {
    return this.getInstrumentDefinition(presetName) !== null;
  }

  async playPreset(note: string, duration: number, presetName: string): Promise<void> {
    const instrument = this.getInstrumentDefinition(presetName);
    if (!instrument) {
      this.logger.warn(`SoundFont driver has no instrument for preset: ${presetName}`);
      return;
    }

    try {
      const audioCtx = this.getAudioContext();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const buffer = await this.getSampleBuffer(instrument.instrument, note);
      this.playBuffer(audioCtx, buffer, duration, instrument);
    } catch (error) {
      this.logger.warn(`SoundFont playback failed: ${String(error)}`);
    }
  }

  dispose(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // The source may already have stopped naturally.
      }
    }
    this.activeSources.clear();
    this.buffers.clear();
    this.audioCtx?.close().catch(error => this.logger.warn(`SoundFont context close failed: ${String(error)}`));
  }

  private async getSampleBuffer(instrument: string, note: string): Promise<AudioBuffer> {
    const sampleName = this.getSampleName(note);
    const cacheKey = `${instrument}:${sampleName}`;
    let bufferPromise = this.buffers.get(cacheKey);
    if (!bufferPromise) {
      bufferPromise = this.loadSampleBuffer(instrument, sampleName).catch(error => {
        this.buffers.delete(cacheKey);
        throw error;
      });
      this.buffers.set(cacheKey, bufferPromise);
    }

    return bufferPromise;
  }

  private async loadSampleBuffer(instrument: string, sampleName: string): Promise<AudioBuffer> {
    const sampleUrl = `${SOUNDFONT_SAMPLE_BASE_URL}${instrument}-mp3/${sampleName}.mp3`;
    const response = await this.fetchSample(sampleUrl);
    if (!response.ok) {
      throw new Error(`Sample request failed with status ${response.status}`);
    }

    return this.getAudioContext().decodeAudioData(await response.arrayBuffer());
  }

  private playBuffer(
    audioCtx: AudioContext,
    buffer: AudioBuffer,
    duration: number,
    instrument: SoundFontInstrumentDefinition
  ): void {
    const source = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    const startTime = audioCtx.currentTime;
    const playDuration = Math.max(duration, 0.01);
    const endTime = startTime + playDuration;
    const attackEnd = startTime + Math.min(instrument.attack, playDuration / 2);
    const releaseStart = Math.max(attackEnd, endTime - Math.min(instrument.release, playDuration / 2));

    source.buffer = buffer;
    source.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(MINIMUM_GAIN, startTime);
    gain.gain.linearRampToValueAtTime(instrument.gain, attackEnd);
    gain.gain.setValueAtTime(instrument.gain, releaseStart);
    gain.gain.exponentialRampToValueAtTime(MINIMUM_GAIN, endTime);

    this.activeSources.add(source);
    source.addEventListener('ended', () => this.activeSources.delete(source), {once: true});
    source.start(startTime);
    source.stop(endTime);
  }

  private getSampleName(note: string): string {
    const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(note.trim());
    if (!match) {
      throw new Error(`Unsupported note format: ${note}`);
    }

    const [, pitch, accidental, octave] = match;
    return `${pitch.toUpperCase()}${accidental === '#' ? 's' : accidental}${octave}`;
  }

  private getAudioContext(): AudioContext {
    this.audioCtx ??= this.createAudioContext();
    return this.audioCtx;
  }

  private getInstrumentDefinition(presetName: string): SoundFontInstrumentDefinition | null {
    return SOUNDFONT_INSTRUMENTS[presetName.trim().toLowerCase()] ?? null;
  }
}
