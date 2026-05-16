import {LogService} from '../log.service';

interface ToneSamplerOptions {
  urls: Record<string, string>;
  baseUrl: string;
  release?: number;
}

interface ToneSamplerLike {
  triggerAttackRelease(note: string, duration: number): void;

  toDestination(): ToneSamplerLike;

  dispose(): void;

  volume: {
    value: number;
  };
}

interface ToneModuleLike {
  start(): Promise<void>;

  loaded(): Promise<void>;

  Sampler: new(options: ToneSamplerOptions) => ToneSamplerLike;
}

interface ToneInstrumentDefinition {
  folder: string;
  release: number;
  volume: number;
  urls: Record<string, string>;
}

const MIDI_JS_BASE_URL = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/';

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

const toneInstrument = (
  instrument: string,
  release: number,
  volume: number,
  urls: Record<string, string> = DEFAULT_SAMPLE_URLS
): ToneInstrumentDefinition => ({
  folder: `${instrument}-mp3`,
  release,
  volume,
  urls,
});

const TONE_INSTRUMENTS: Record<string, ToneInstrumentDefinition> = {
  piano: toneInstrument('acoustic_grand_piano', 1, -6),
  'bright piano': toneInstrument('bright_acoustic_piano', 0.8, -7),
  'soft piano': toneInstrument('acoustic_grand_piano', 1.2, -9),
  'electric piano': toneInstrument('electric_piano_1', 1.1, -8),
  guitar: toneInstrument('acoustic_guitar_steel', 0.8, -8),
  'nylon guitar': toneInstrument('acoustic_guitar_nylon', 0.85, -8),
  'clean electric guitar': toneInstrument('electric_guitar_clean', 0.7, -9),
  'muted guitar': toneInstrument('electric_guitar_muted', 0.35, -8),
  organ: toneInstrument('drawbar_organ', 0.25, -9),
  'jazz organ': toneInstrument('percussive_organ', 0.28, -9),
  'pipe organ': toneInstrument('church_organ', 1.1, -10),
  strings: toneInstrument('string_ensemble_1', 1.4, -10),
  'slow strings': toneInstrument('string_ensemble_2', 1.8, -10),
  'synth strings': toneInstrument('synth_strings_1', 1.25, -10),
  'warm pad': toneInstrument('pad_2_warm', 1.6, -11),
  'glass pad': toneInstrument('pad_7_halo', 1.8, -11),
  bass: toneInstrument('electric_bass_finger', 0.55, -8, BASS_SAMPLE_URLS),
  'sub bass': toneInstrument('synth_bass_1', 0.5, -8, BASS_SAMPLE_URLS),
  'synth bass': toneInstrument('synth_bass_2', 0.45, -8, BASS_SAMPLE_URLS),
  'pluck bass': toneInstrument('electric_bass_pick', 0.3, -8, BASS_SAMPLE_URLS),
  bell: toneInstrument('music_box', 1.3, -9),
  vibraphone: toneInstrument('vibraphone', 1.35, -9),
  marimba: toneInstrument('marimba', 0.65, -8),
  lead: toneInstrument('lead_2_sawtooth', 0.45, -9),
  'square lead': toneInstrument('lead_1_square', 0.4, -9),
  'acid lead': toneInstrument('lead_5_charang', 0.38, -9),
};

export class ToneSampledSoundDriver {
  private toneModule?: ToneModuleLike;
  private readonly samplers = new Map<string, Promise<ToneSamplerLike>>();

  constructor(private readonly logger: LogService) {
  }

  canPlayPreset(presetName: string): boolean {
    return this.getInstrumentDefinition(presetName) !== null;
  }

  async playPreset(note: string, duration: number, presetName: string): Promise<void> {
    const instrument = this.getInstrumentDefinition(presetName);
    if (!instrument) {
      this.logger.warn(`Tone sampled driver has no instrument for preset: ${presetName}`);
      return;
    }

    try {
      const tone = await this.getToneModule();
      await tone.start();
      const sampler = await this.getSampler(presetName, instrument);
      sampler.triggerAttackRelease(note, duration);
    } catch (error) {
      this.logger.warn(`Tone sampled playback failed: ${String(error)}`);
    }
  }

  dispose(): void {
    for (const samplerPromise of this.samplers.values()) {
      samplerPromise.then(sampler => sampler.dispose()).catch(() => undefined);
    }
    this.samplers.clear();
  }

  private async getSampler(presetName: string, instrument: ToneInstrumentDefinition): Promise<ToneSamplerLike> {
    const key = presetName.trim().toLowerCase();
    let samplerPromise = this.samplers.get(key);
    if (!samplerPromise) {
      samplerPromise = this.createSampler(instrument);
      this.samplers.set(key, samplerPromise);
    }

    return samplerPromise;
  }

  private async createSampler(instrument: ToneInstrumentDefinition): Promise<ToneSamplerLike> {
    const tone = await this.getToneModule();
    const sampler = new tone.Sampler({
      urls: instrument.urls,
      baseUrl: `${MIDI_JS_BASE_URL}${instrument.folder}/`,
      release: instrument.release,
    }).toDestination();
    sampler.volume.value = instrument.volume;
    await tone.loaded();
    return sampler;
  }

  private async getToneModule(): Promise<ToneModuleLike> {
    if (!this.toneModule) {
      this.toneModule = (await import('tone')) as unknown as ToneModuleLike;
    }

    return this.toneModule;
  }

  private getInstrumentDefinition(presetName: string): ToneInstrumentDefinition | null {
    return TONE_INSTRUMENTS[presetName.trim().toLowerCase()] ?? null;
  }
}
