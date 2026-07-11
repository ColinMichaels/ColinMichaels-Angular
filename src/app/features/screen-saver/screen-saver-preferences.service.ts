import {DOCUMENT} from '@angular/common';
import {Injectable, inject, signal} from '@angular/core';

import {
  DEFAULT_SCREEN_SAVER_PREFERENCES,
  SCREEN_SAVER_KEN_BURNS_SPEED_MAX,
  SCREEN_SAVER_KEN_BURNS_SPEED_MIN,
  SCREEN_SAVER_SLIDESHOW_SECONDS_MAX,
  SCREEN_SAVER_SLIDESHOW_SECONDS_MIN,
  ScreenSaverModuleId,
  ScreenSaverPreferences,
} from './screen-saver.model';

export const SCREEN_SAVER_PREFERENCES_STORAGE_KEY = 'colinmichaels.screen-saver.preferences.v1';

@Injectable({providedIn: 'root'})
export class ScreenSaverPreferencesService {
  private readonly browserWindow = inject(DOCUMENT).defaultView;
  private readonly initialPreferences = this.readPreferences();
  private readonly moduleIdState = signal<ScreenSaverModuleId>(this.initialPreferences.moduleId);
  private readonly kenBurnsEnabledState = signal(this.initialPreferences.kenBurnsEnabled);
  private readonly kenBurnsSpeedState = signal(this.initialPreferences.kenBurnsSpeed);
  private readonly slideshowIntervalSecondsState = signal(this.initialPreferences.slideshowIntervalSeconds);

  readonly moduleId = this.moduleIdState.asReadonly();
  readonly kenBurnsEnabled = this.kenBurnsEnabledState.asReadonly();
  readonly kenBurnsSpeed = this.kenBurnsSpeedState.asReadonly();
  readonly slideshowIntervalSeconds = this.slideshowIntervalSecondsState.asReadonly();

  setModule(moduleId: ScreenSaverModuleId): void {
    this.moduleIdState.set(moduleId);
    this.persist();
  }

  setKenBurnsEnabled(enabled: boolean): void {
    this.kenBurnsEnabledState.set(enabled);
    this.persist();
  }

  setKenBurnsSpeed(speed: number): void {
    this.kenBurnsSpeedState.set(clampInteger(
      speed,
      SCREEN_SAVER_KEN_BURNS_SPEED_MIN,
      SCREEN_SAVER_KEN_BURNS_SPEED_MAX
    ));
    this.persist();
  }

  setSlideshowIntervalSeconds(seconds: number): void {
    this.slideshowIntervalSecondsState.set(clampInteger(
      seconds,
      SCREEN_SAVER_SLIDESHOW_SECONDS_MIN,
      SCREEN_SAVER_SLIDESHOW_SECONDS_MAX
    ));
    this.persist();
  }

  private readPreferences(): ScreenSaverPreferences {
    const localStorage = this.browserWindow?.localStorage;

    if (!localStorage) {
      return DEFAULT_SCREEN_SAVER_PREFERENCES;
    }

    try {
      const rawValue = localStorage.getItem(SCREEN_SAVER_PREFERENCES_STORAGE_KEY);

      if (!rawValue) {
        return DEFAULT_SCREEN_SAVER_PREFERENCES;
      }

      const value: unknown = JSON.parse(rawValue);

      if (!isRecord(value)) {
        return DEFAULT_SCREEN_SAVER_PREFERENCES;
      }

      return {
        moduleId: value['moduleId'] === 'local' ? 'local' : 'hero',
        kenBurnsEnabled: typeof value['kenBurnsEnabled'] === 'boolean'
          ? value['kenBurnsEnabled']
          : DEFAULT_SCREEN_SAVER_PREFERENCES.kenBurnsEnabled,
        kenBurnsSpeed: clampInteger(
          value['kenBurnsSpeed'],
          SCREEN_SAVER_KEN_BURNS_SPEED_MIN,
          SCREEN_SAVER_KEN_BURNS_SPEED_MAX,
          DEFAULT_SCREEN_SAVER_PREFERENCES.kenBurnsSpeed
        ),
        slideshowIntervalSeconds: clampInteger(
          value['slideshowIntervalSeconds'],
          SCREEN_SAVER_SLIDESHOW_SECONDS_MIN,
          SCREEN_SAVER_SLIDESHOW_SECONDS_MAX,
          DEFAULT_SCREEN_SAVER_PREFERENCES.slideshowIntervalSeconds
        ),
      };
    } catch {
      return DEFAULT_SCREEN_SAVER_PREFERENCES;
    }
  }

  private persist(): void {
    try {
      this.browserWindow?.localStorage.setItem(SCREEN_SAVER_PREFERENCES_STORAGE_KEY, JSON.stringify({
        moduleId: this.moduleIdState(),
        kenBurnsEnabled: this.kenBurnsEnabledState(),
        kenBurnsSpeed: this.kenBurnsSpeedState(),
        slideshowIntervalSeconds: this.slideshowIntervalSecondsState(),
      } satisfies ScreenSaverPreferences));
    } catch {
      // Preferences remain active for the current session when local storage is unavailable.
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function clampInteger(value: unknown, minimum: number, maximum: number, fallback = minimum): number {
  const numericValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, Math.round(numericValue)));
}
