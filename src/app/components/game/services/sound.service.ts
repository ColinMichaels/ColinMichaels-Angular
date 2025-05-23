import {Inject, Injectable, InjectionToken, OnDestroy, OnInit} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {SettingsService} from './settings.service';
import {LogService} from './log.service';
import {PatchService} from './patch.service';

interface SoundOptions {
  loop?: boolean;
  volume?: number;
  forceRestart?: boolean;
  onEnded?: () => void;
}

export interface SoundServiceConfig {
  debounceInterval: number;
  maxCacheSize: number;
  defaultVolume: number;
  basePath: string;
}

export const SOUND_SERVICE_CONFIG = new InjectionToken<SoundServiceConfig>('SOUND_SERVICE_CONFIG');

export const defaultSoundConfig: SoundServiceConfig = {
  debounceInterval: 60,
  maxCacheSize: 20,
  defaultVolume: 1.0,
  basePath: 'assets/audio/efx/'
};


@Injectable({ providedIn: 'root' })
export class SoundService implements OnDestroy, OnInit {

  private readonly basePath = 'assets/audio/efx/';

  private readonly audioVariantPools: Record<string, string[]> = {
    'click': ['click-1.mp3', 'click-2.mp3', 'click-3.mp3'],
    'glitch': ['glitch-1.mp3', 'glitch-2.mp3', 'glitch-3.mp3', 'glitch-4.mp3'],
    'beep': ['digital-beep-1.mp3', 'digital-beep-2.mp3'],
    'dramatic': ['dramatic1.mp3', 'dramatic2.mp3'],
    'drums' : ['drum-1.mp3', 'drum-2.mp3', "drum-3.mp3", 'drum-4.mp3', 'drum-5.mp3']
  };

  private audioCache = new Map<string, HTMLAudioElement>();

  private readonly mute$ = new BehaviorSubject<boolean>(false);

  public isInitialized = false;

  private lastPlayedTimestamps: Record<string, number> = {};
  private debounceIntervalMs = 60; // Adjust as needed

  constructor(
    @Inject(SOUND_SERVICE_CONFIG) private config: SoundServiceConfig,
    private settingsService: SettingsService,
    private readonly patchService: PatchService,
    private readonly logger: LogService
  ) {
  }

  ngOnInit() {
    this.detectMobileAndMute();
    this.bootAudio().then(() => {
      this.patchService.registerPatches();
    });
  }

  async preloadAudio(fileName: string): Promise<boolean> {
    try {
      const audio = new Audio();
      audio.src = `${this.basePath}${this.sanitizeFileName(fileName)}`;

      await new Promise((resolve, reject) => {
        audio.oncanplaythrough = resolve;
        audio.onerror = reject;
        audio.load();
      });

      this.audioCache.set(fileName, audio);
      return true;
    } catch (error) {
      console.error(`Failed to preload audio: ${fileName}`, error);
      return false;
    }
  }


  async bootAudio(): Promise<void> {
    if (this.isInitialized) return Promise.resolve();

    try {
      await this.preloadAudio('bootup.mp3');
      this.isInitialized = true;
      this.logger.debug('[SoundService] Audio system initialized');
    } catch (error) {
      this.logger.error('[SoundService] Failed to initialize audio:', error);
      throw error;
    }
  }


  private detectMobileAndMute(): void {
    const hasTouch = 'ontouchstart' in window ||
      navigator.maxTouchPoints > 0;
    const hasLowBattery = false;
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: { level: number }) => {
        if (battery.level < 0.2) {
          this.setMute(true);
          console.log('[SoundService] Low battery detected. Sound muted.');
        }
      });
    }

    if (hasTouch || hasLowBattery) {
      this.setMute(true);
      console.log('[SoundService] Mobile/low power device detected. Sound muted.');
    }
  }

  playVariant(poolKey: string, options: SoundOptions = {}) {
    const now = Date.now();
    const lastPlayed = this.lastPlayedTimestamps[poolKey] || 0;

    if (now - lastPlayed < this.debounceIntervalMs) {
      return; // ⏸ Debounced
    }

    this.lastPlayedTimestamps[poolKey] = now;

    const file = this.getRandomVariant(poolKey);
    if (file) this.play(file, options);
  }

  getRandomVariant(key: string): string | null {
    const pool = this.audioVariantPools[key];
    if (!pool || pool.length === 0) return null;
    const index = Math.floor(Math.random() * pool.length);
    return pool[index];
  }

  play(fileName: string, options: SoundOptions = {}) {
    if (this.isMuted) return;

    const { loop = false, volume = 1.0, forceRestart = false, onEnded } = options;

    const sanitizedName = this.sanitizeFileName(fileName);

    const path = `${this.config.basePath}${sanitizedName}`;

    let audio = this.audioCache.get(path);

    if (!audio || forceRestart) {
      audio = new Audio(path);
      audio.crossOrigin = 'anonymous';
      this.audioCache.set(path, audio);
    }

    audio.loop = loop;
    audio.volume = volume;

    if (forceRestart) {
      audio.pause();
      audio.currentTime = 0;
    }

    if (onEnded) {
      audio.onended = () => {
        onEnded();
        audio!.onended = null; // Clear callback to avoid repeats
      };
    }

    audio.play().catch(err => {
      console.warn(`Audio play error for ${fileName}:`, err);
    });
  }

  private sanitizeFileName(fileName: string): string {
    // Remove path traversal attempts and normalize
    const normalized = fileName.trim();

    return normalized.endsWith('.mp3') ? normalized : `${normalized}.mp3`;
  }


  stop(fileName: string) {
    const path = this.config.basePath + fileName;
    const audio = this.audioCache.get(path);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
    }
  }

  pause(fileName: string) {
    const path = this.config.basePath + fileName;
    const audio = this.audioCache.get(path);
    if (audio) {
      audio.pause();
      audio.onended = null;
    }
  }

  stopAll() {
    this.audioCache.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
    });
  }


  get isMuted(): boolean {
    return this.mute$.value;
  }

  setMute(state: boolean): void {
    this.mute$.next(state);
    if (state) this.stopAll();
  }

  toggleMute(): void {
    this.setMute(!this.isMuted);
  }


  setVolume(fileName: string, volume: number) {
    const path = this.config.basePath + fileName;
    const audio = this.audioCache.get(path);
    if (audio) {
      // Convert volume from 0-100 range to 0-1 range
      audio.volume = volume / 100;
    }
  }


  ngOnDestroy() {
    this.stopAll();
    this.audioCache.clear();
  }


}
