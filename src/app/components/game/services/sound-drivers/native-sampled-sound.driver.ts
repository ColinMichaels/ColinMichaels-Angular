import {LogService} from '../log.service';

type AudioContextFactory = () => AudioContext;
type SampleFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface NativeSamplerInstrumentDefinition {
  folder: string;
  gain: number;
  release: number;
  urls: Record<string, string>;
}

interface SampleAnchor {
  filename: string;
  playbackRate: number;
}

const MIDI_JS_BASE_URL = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/';
const MINIMUM_GAIN = 0.0001;
const PITCH_CLASS: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const DEFAULT_SAMPLE_URLS: Record<string, string> = {
  C2: 'C2.mp3',
  F2: 'F2.mp3',
  A2: 'A2.mp3',
  C3: 'C3.mp3',
  F3: 'F3.mp3',
  A3: 'A3.mp3',
  C4: 'C4.mp3',
  F4: 'F4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
  F5: 'F5.mp3',
  A5: 'A5.mp3',
};

const BASS_SAMPLE_URLS: Record<string, string> = {
  C1: 'C1.mp3',
  G1: 'G1.mp3',
  C2: 'C2.mp3',
  G2: 'G2.mp3',
  C3: 'C3.mp3',
  G3: 'G3.mp3',
  C4: 'C4.mp3',
};

const samplerInstrument = (
  instrument: string,
  release: number,
  volumeDb: number,
  urls: Record<string, string> = DEFAULT_SAMPLE_URLS
): NativeSamplerInstrumentDefinition => ({
  folder: `${instrument}-mp3`,
  gain: Math.pow(10, volumeDb / 20),
  release,
  urls,
});

const NATIVE_SAMPLER_INSTRUMENTS: Record<string, NativeSamplerInstrumentDefinition> = {
  piano: samplerInstrument('acoustic_grand_piano', 1, -6),
  'bright piano': samplerInstrument('bright_acoustic_piano', 0.8, -7),
  'soft piano': samplerInstrument('acoustic_grand_piano', 1.2, -9),
  'electric piano': samplerInstrument('electric_piano_1', 1.1, -8),
  guitar: samplerInstrument('acoustic_guitar_steel', 0.8, -8),
  'nylon guitar': samplerInstrument('acoustic_guitar_nylon', 0.85, -8),
  'clean electric guitar': samplerInstrument('electric_guitar_clean', 0.7, -9),
  'muted guitar': samplerInstrument('electric_guitar_muted', 0.35, -8),
  organ: samplerInstrument('drawbar_organ', 0.25, -9),
  'jazz organ': samplerInstrument('percussive_organ', 0.28, -9),
  'pipe organ': samplerInstrument('church_organ', 1.1, -10),
  strings: samplerInstrument('string_ensemble_1', 1.4, -10),
  'slow strings': samplerInstrument('string_ensemble_2', 1.8, -10),
  'synth strings': samplerInstrument('synth_strings_1', 1.25, -10),
  'warm pad': samplerInstrument('pad_2_warm', 1.6, -11),
  'glass pad': samplerInstrument('pad_7_halo', 1.8, -11),
  bass: samplerInstrument('electric_bass_finger', 0.55, -8, BASS_SAMPLE_URLS),
  'sub bass': samplerInstrument('synth_bass_1', 0.5, -8, BASS_SAMPLE_URLS),
  'synth bass': samplerInstrument('synth_bass_2', 0.45, -8, BASS_SAMPLE_URLS),
  'pluck bass': samplerInstrument('electric_bass_pick', 0.3, -8, BASS_SAMPLE_URLS),
  bell: samplerInstrument('music_box', 1.3, -9),
  vibraphone: samplerInstrument('vibraphone', 1.35, -9),
  marimba: samplerInstrument('marimba', 0.65, -8),
  lead: samplerInstrument('lead_2_sawtooth', 0.45, -9),
  'square lead': samplerInstrument('lead_1_square', 0.4, -9),
  'acid lead': samplerInstrument('lead_5_charang', 0.38, -9),
};

export class NativeSampledSoundDriver {
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
      this.logger.warn(`Native sampler has no instrument for preset: ${presetName}`);
      return;
    }

    try {
      const audioCtx = this.getAudioContext();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const anchor = this.getSampleAnchor(note, instrument.urls);
      const buffer = await this.getSampleBuffer(instrument.folder, anchor.filename);
      this.playBuffer(audioCtx, buffer, anchor.playbackRate, duration, instrument);
    } catch (error) {
      this.logger.warn(`Native sampled playback failed: ${String(error)}`);
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
    this.audioCtx?.close().catch(error => this.logger.warn(`Native sampler context close failed: ${String(error)}`));
  }

  private async getSampleBuffer(folder: string, filename: string): Promise<AudioBuffer> {
    const cacheKey = `${folder}:${filename}`;
    let bufferPromise = this.buffers.get(cacheKey);
    if (!bufferPromise) {
      bufferPromise = this.loadSampleBuffer(folder, filename).catch(error => {
        this.buffers.delete(cacheKey);
        throw error;
      });
      this.buffers.set(cacheKey, bufferPromise);
    }

    return bufferPromise;
  }

  private async loadSampleBuffer(folder: string, filename: string): Promise<AudioBuffer> {
    const response = await this.fetchSample(`${MIDI_JS_BASE_URL}${folder}/${filename}`);
    if (!response.ok) {
      throw new Error(`Sample request failed with status ${response.status}`);
    }

    return this.getAudioContext().decodeAudioData(await response.arrayBuffer());
  }

  private playBuffer(
    audioCtx: AudioContext,
    buffer: AudioBuffer,
    playbackRate: number,
    duration: number,
    instrument: NativeSamplerInstrumentDefinition
  ): void {
    const source = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    const startTime = audioCtx.currentTime;
    const releaseStart = startTime + Math.max(duration, 0.01);
    const endTime = releaseStart + Math.max(instrument.release, 0.01);

    source.buffer = buffer;
    source.playbackRate.setValueAtTime(playbackRate, startTime);
    source.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(instrument.gain, startTime);
    gain.gain.setValueAtTime(instrument.gain, releaseStart);
    gain.gain.exponentialRampToValueAtTime(MINIMUM_GAIN, endTime);

    this.activeSources.add(source);
    source.addEventListener('ended', () => this.activeSources.delete(source), {once: true});
    source.start(startTime);
    source.stop(endTime);
  }

  private getSampleAnchor(note: string, urls: Record<string, string>): SampleAnchor {
    const targetMidi = this.noteToMidi(note);
    let nearestNote = '';
    let nearestMidi = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const sampleNote of Object.keys(urls)) {
      const sampleMidi = this.noteToMidi(sampleNote);
      const distance = Math.abs(targetMidi - sampleMidi);
      if (distance < nearestDistance) {
        nearestNote = sampleNote;
        nearestMidi = sampleMidi;
        nearestDistance = distance;
      }
    }

    return {
      filename: urls[nearestNote],
      playbackRate: Math.pow(2, (targetMidi - nearestMidi) / 12),
    };
  }

  private noteToMidi(note: string): number {
    const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(note.trim());
    if (!match) {
      throw new Error(`Unsupported note format: ${note}`);
    }

    const [, pitch, accidental, octaveText] = match;
    const accidentalOffset = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
    return (Number(octaveText) + 1) * 12 + PITCH_CLASS[pitch.toUpperCase()] + accidentalOffset;
  }

  private getAudioContext(): AudioContext {
    this.audioCtx ??= this.createAudioContext();
    return this.audioCtx;
  }

  private getInstrumentDefinition(presetName: string): NativeSamplerInstrumentDefinition | null {
    return NATIVE_SAMPLER_INSTRUMENTS[presetName.trim().toLowerCase()] ?? null;
  }
}
