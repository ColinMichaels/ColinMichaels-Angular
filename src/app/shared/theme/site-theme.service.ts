import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {Injectable, PLATFORM_ID, computed, inject, signal} from '@angular/core';

export type SiteThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'colinmichaels-site-theme';
const THEME_CLASS_NAMES: readonly SiteThemeMode[] = ['light', 'dark'];

@Injectable({
  providedIn: 'root',
})
export class SiteThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly modeSignal = signal<SiteThemeMode>(this.getInitialMode());

  readonly mode = this.modeSignal.asReadonly();
  readonly isDark = computed(() => this.modeSignal() === 'dark');

  constructor() {
    this.applyMode(this.modeSignal());
  }

  setMode(mode: SiteThemeMode): void {
    this.modeSignal.set(mode);
    this.applyMode(mode);
    this.persistMode(mode);
  }

  toggleMode(): void {
    this.setMode(this.modeSignal() === 'dark' ? 'light' : 'dark');
  }

  private getInitialMode(): SiteThemeMode {
    if (!this.isBrowser) {
      return 'dark';
    }

    const storedMode = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (storedMode === 'light' || storedMode === 'dark') {
      return storedMode;
    }

    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  private applyMode(mode: SiteThemeMode): void {
    const root = this.document.documentElement;

    root.classList.remove(...THEME_CLASS_NAMES);
    root.classList.add(mode);
    root.style.colorScheme = mode;
  }

  private persistMode(mode: SiteThemeMode): void {
    if (!this.isBrowser) {
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }
}
