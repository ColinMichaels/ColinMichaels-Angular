import { Injectable } from '@angular/core';
import {BehaviorSubject} from 'rxjs';

interface SoundOptions {
  loop?: boolean;
  volume?: number;
  forceRestart?: boolean;
  onEnded?: () => void;
}

@Injectable({ providedIn: 'root' })
export class SoundService {
  private basePath = 'assets/audio/efx/';

  private audioVariantPools: Record<string, string[]> = {
    'click': ['click-1.mp3', 'click-2.mp3', 'click-3.mp3'],
    'glitch': ['glitch-1.mp3', 'glitch-2.mp3', 'glitch-3.mp3', 'glitch-4.mp3'],
    'beep': ['digital-beep-1.mp3', 'digital-beep-2.mp3'],
    'dramatic': ['dramatic1.mp3', 'dramatic2.mp3'],
    'drums' : ['drum-1.mp3', 'drum-2.mp3', "drum-3.mp3", 'drum-4.mp3', 'drum-5.mp3']
  };

  private audioCache = new Map<string, HTMLAudioElement>();

  private isMuted = false;
  public mute$ = new BehaviorSubject<boolean>(this.isMuted);

  public isInitialized = false;

  private lastPlayedTimestamps: Record<string, number> = {};
  private debounceIntervalMs = 60; // Adjust as needed

  constructor() {
    this.bootAudio();
    this.detectMobileAndMute();
  }

  bootAudio(): void {
    if (this.isInitialized) return;

    const silent = new Audio(this.basePath + 'bootup.mp3');
    silent.volume = 0.1;

    silent.onerror = () => {
      console.warn('[SoundService] Boot audio file missing or unsupported.');
    };

    silent.play()
      .then(() => {
        this.isInitialized = true;
        console.log('[SoundService] Audio unlocked and ready.');
      })
      .catch(err => {
        console.warn('[SoundService] bootAudio() failed:', err.message);
      });
  }

  private detectMobileAndMute(): void {
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isMobile) {
      this.setMute(true);
      console.log('[SoundService] Mobile device detected. Sound muted.');
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
    const path = this.basePath + fileName;

    /* check if filename includes .mp3 if not include it */
    if (!fileName.includes('.mp3')) {
      fileName = fileName + '.mp3';
    }

    let audio = this.audioCache.get(path);

    if (!audio || forceRestart) {
      audio = new Audio(path);
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

  stop(fileName: string) {
    const path = this.basePath + fileName;
    const audio = this.audioCache.get(path);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
    }
  }

  pause(fileName: string) {
    const path = this.basePath + fileName;
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

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.mute$.next(this.isMuted);
    if (this.isMuted) this.stopAll();
  }

  setMute(state: boolean) {
    this.isMuted = state;
    this.mute$.next(this.isMuted);
    if (state) this.stopAll();
  }

  getMute(): boolean {
    return this.isMuted;
  }

  setVolume(fileName: string, volume: number) {
    const path = this.basePath + fileName;
    const audio = this.audioCache.get(path);
    if (audio) {
      // Convert volume from 0-100 range to 0-1 range
      audio.volume = volume / 100;
    }
  }

}
