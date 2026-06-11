import {LogService} from '../log.service';

type SoundFontBank = 'FluidR3_GM' | 'MusyngKite';
type SoundFontFormat = 'mp3' | 'ogg';

interface SoundFontInstrumentOptions {
  soundfont?: SoundFontBank;
  format?: SoundFontFormat;
  gain?: number;
  attack?: number;
  release?: number;
}

interface SoundFontPlayOptions {
  duration: number;
  gain: number;
}

interface SoundFontPlayerLike {
  play(note: string, when?: number, options?: SoundFontPlayOptions): void;

  stop(when?: number): unknown;
}

interface SoundFontModuleLike {
  instrument(
    audioContext: AudioContext,
    name: string,
    options?: SoundFontInstrumentOptions
  ): Promise<SoundFontPlayerLike>;

  default?: {
    instrument(
      audioContext: AudioContext,
      name: string,
      options?: SoundFontInstrumentOptions
    ): Promise<SoundFontPlayerLike>;
  };
}

interface SoundFontInstrumentDefinition {
  instrument: string;
  gain: number;
  attack: number;
  release: number;
}

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
  private soundFontModule?: SoundFontModuleLike;
  private readonly players = new Map<string, Promise<SoundFontPlayerLike>>();

  constructor(private readonly logger: LogService) {
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

      const player = await this.getPlayer(instrument);
      player.play(note, audioCtx.currentTime, {
        duration,
        gain: instrument.gain,
      });
    } catch (error) {
      this.logger.warn(`SoundFont playback failed: ${String(error)}`);
    }
  }

  dispose(): void {
    for (const playerPromise of this.players.values()) {
      playerPromise.then(player => player.stop()).catch(() => undefined);
    }
    this.players.clear();
    this.audioCtx?.close().catch(error => this.logger.warn(`SoundFont context close failed: ${String(error)}`));
  }

  private async getPlayer(instrument: SoundFontInstrumentDefinition): Promise<SoundFontPlayerLike> {
    let playerPromise = this.players.get(instrument.instrument);
    if (!playerPromise) {
      playerPromise = this.createPlayer(instrument);
      this.players.set(instrument.instrument, playerPromise);
    }

    return playerPromise;
  }

  private async createPlayer(instrument: SoundFontInstrumentDefinition): Promise<SoundFontPlayerLike> {
    const soundFont = await this.getSoundFontModule();
    const loadInstrument = soundFont.instrument ?? soundFont.default?.instrument;
    if (!loadInstrument) {
      throw new Error('soundfont-player instrument loader is unavailable');
    }

    return loadInstrument(this.getAudioContext(), instrument.instrument, {
      soundfont: 'FluidR3_GM',
      format: 'mp3',
      gain: instrument.gain,
      attack: instrument.attack,
      release: instrument.release,
    });
  }

  private async getSoundFontModule(): Promise<SoundFontModuleLike> {
    if (!this.soundFontModule) {
      this.soundFontModule = (await import('soundfont-player')) as unknown as SoundFontModuleLike;
    }

    return this.soundFontModule;
  }

  private getAudioContext(): AudioContext {
    this.audioCtx ??= new AudioContext();
    return this.audioCtx;
  }

  private getInstrumentDefinition(presetName: string): SoundFontInstrumentDefinition | null {
    return SOUNDFONT_INSTRUMENTS[presetName.trim().toLowerCase()] ?? null;
  }
}
