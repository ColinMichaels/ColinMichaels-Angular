import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {Injectable, PLATFORM_ID, computed, inject, signal} from '@angular/core';

export const READER_FONT_SCALES = [100, 112, 125, 150, 175, 200] as const;
export type ReaderFontScale = typeof READER_FONT_SCALES[number];
export type ReaderSpacing = 'normal' | 'comfortable' | 'open';

export interface ReaderPreferences {
  fontScale: ReaderFontScale;
  spacing: ReaderSpacing;
  highContrast: boolean;
  reduceMotion: boolean;
}

const READER_STORAGE_KEY = 'colinmichaels-reader-preferences-v1';
const READER_FONT_CLASS_NAMES = READER_FONT_SCALES.map(scale => `reader-font-${scale}`);
const READER_SPACING_CLASS_NAMES: readonly string[] = [
  'reader-spacing-normal',
  'reader-spacing-comfortable',
  'reader-spacing-open',
];
const HIGH_CONTRAST_CLASS_NAME = 'reader-contrast-high';
const REDUCED_MOTION_CLASS_NAME = 'reader-motion-reduce';
const SPACING_SEQUENCE: readonly ReaderSpacing[] = ['normal', 'comfortable', 'open'];

function isReaderFontScale(value: unknown): value is ReaderFontScale {
  return typeof value === 'number' && READER_FONT_SCALES.includes(value as ReaderFontScale);
}

function isReaderSpacing(value: unknown): value is ReaderSpacing {
  return value === 'normal' || value === 'comfortable' || value === 'open';
}

@Injectable({
  providedIn: 'root',
})
export class ReaderPreferencesService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly preferencesSignal = signal<ReaderPreferences>(this.getInitialPreferences());

  readonly preferences = this.preferencesSignal.asReadonly();
  readonly canDecreaseFont = computed(() => this.getFontScaleIndex() > 0);
  readonly canIncreaseFont = computed(() => this.getFontScaleIndex() < READER_FONT_SCALES.length - 1);
  readonly fontScaleLabel = computed(() => `${this.preferencesSignal().fontScale}%`);
  readonly spacingLabel = computed(() => {
    switch (this.preferencesSignal().spacing) {
      case 'comfortable':
        return 'Comfortable';
      case 'open':
        return 'Open';
      default:
        return 'Normal';
    }
  });

  constructor() {
    this.applyPreferences(this.preferencesSignal());
  }

  decreaseFontScale(): void {
    const nextIndex = Math.max(0, this.getFontScaleIndex() - 1);
    this.updatePreferences({fontScale: READER_FONT_SCALES[nextIndex]});
  }

  increaseFontScale(): void {
    const nextIndex = Math.min(READER_FONT_SCALES.length - 1, this.getFontScaleIndex() + 1);
    this.updatePreferences({fontScale: READER_FONT_SCALES[nextIndex]});
  }

  cycleSpacing(): void {
    const currentIndex = SPACING_SEQUENCE.indexOf(this.preferencesSignal().spacing);
    const nextIndex = (currentIndex + 1) % SPACING_SEQUENCE.length;

    this.updatePreferences({spacing: SPACING_SEQUENCE[nextIndex]});
  }

  toggleHighContrast(): void {
    this.updatePreferences({highContrast: !this.preferencesSignal().highContrast});
  }

  toggleReducedMotion(): void {
    this.updatePreferences({reduceMotion: !this.preferencesSignal().reduceMotion});
  }

  reset(): void {
    const nextPreferences = this.getDefaultPreferences();

    this.preferencesSignal.set(nextPreferences);
    this.applyPreferences(nextPreferences);
    this.removeStoredPreferences();
  }

  private updatePreferences(partialPreferences: Partial<ReaderPreferences>): void {
    const nextPreferences = {
      ...this.preferencesSignal(),
      ...partialPreferences,
    };

    this.preferencesSignal.set(nextPreferences);
    this.applyPreferences(nextPreferences);
    this.persistPreferences(nextPreferences);
  }

  private getFontScaleIndex(): number {
    return READER_FONT_SCALES.indexOf(this.preferencesSignal().fontScale);
  }

  private getInitialPreferences(): ReaderPreferences {
    const storedPreferences = this.readStoredPreferences();

    return storedPreferences ?? this.getDefaultPreferences();
  }

  private getDefaultPreferences(): ReaderPreferences {
    return {
      fontScale: 100,
      spacing: 'normal',
      highContrast: false,
      reduceMotion: this.getPrefersReducedMotion(),
    };
  }

  private getPrefersReducedMotion(): boolean {
    return this.isBrowser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private readStoredPreferences(): ReaderPreferences | null {
    if (!this.isBrowser) {
      return null;
    }

    try {
      const rawValue = window.localStorage.getItem(READER_STORAGE_KEY);

      if (!rawValue) {
        return null;
      }

      const parsedValue = JSON.parse(rawValue) as Partial<ReaderPreferences>;

      return {
        fontScale: isReaderFontScale(parsedValue.fontScale) ? parsedValue.fontScale : 100,
        spacing: isReaderSpacing(parsedValue.spacing) ? parsedValue.spacing : 'normal',
        highContrast: parsedValue.highContrast === true,
        reduceMotion: typeof parsedValue.reduceMotion === 'boolean'
          ? parsedValue.reduceMotion
          : this.getPrefersReducedMotion(),
      };
    } catch {
      return null;
    }
  }

  private applyPreferences(preferences: ReaderPreferences): void {
    const root = this.document.documentElement;

    root.classList.remove(...READER_FONT_CLASS_NAMES, ...READER_SPACING_CLASS_NAMES);
    root.classList.toggle(HIGH_CONTRAST_CLASS_NAME, preferences.highContrast);
    root.classList.toggle(REDUCED_MOTION_CLASS_NAME, preferences.reduceMotion);
    root.classList.add(`reader-font-${preferences.fontScale}`, `reader-spacing-${preferences.spacing}`);
  }

  private persistPreferences(preferences: ReaderPreferences): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      window.localStorage.setItem(READER_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      return;
    }
  }

  private removeStoredPreferences(): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      window.localStorage.removeItem(READER_STORAGE_KEY);
    } catch {
      return;
    }
  }
}
