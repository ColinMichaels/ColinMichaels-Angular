import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeOption = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private themeSubject = new BehaviorSubject<ThemeOption>(this.getStoredTheme());
  private accentColorSubject = new BehaviorSubject<string>(this.getStoredAccentColor());

  readonly theme$ = this.themeSubject.asObservable();
  readonly accentColor$ = this.accentColorSubject.asObservable();

  private getStoredTheme(): ThemeOption {
    return (localStorage.getItem('theme') as ThemeOption) || 'system';
  }

  private getStoredAccentColor(): string {
    return localStorage.getItem('accentColor') || '#4f46e5';
  }

  setTheme(theme: ThemeOption): void {
    localStorage.setItem('theme', theme);
    this.themeSubject.next(theme);
  }

  setAccentColor(color: string): void {
    localStorage.setItem('accentColor', color);
    this.accentColorSubject.next(color);
  }
}
