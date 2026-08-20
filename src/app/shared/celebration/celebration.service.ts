import {isPlatformBrowser} from '@angular/common';
import {Injectable, InjectionToken, PLATFORM_ID, inject} from '@angular/core';
import confetti from 'canvas-confetti';

import {ReaderPreferencesService} from '../reader-preferences/reader-preferences.service';

const CELEBRATION_COLORS = ['#22d3ee', '#67e8f9', '#34d399', '#a78bfa', '#fbbf24'];
const CELEBRATION_Z_INDEX = 250;

export type CelebrationLaunchOptions = NonNullable<Parameters<typeof confetti>[0]>;
export type CelebrationLauncher = (options: CelebrationLaunchOptions) => ReturnType<typeof confetti>;

export interface ConfirmedPointAward {
  readonly awarded?: boolean;
  readonly points?: number | null;
}

export const CELEBRATION_CONFETTI = new InjectionToken<CelebrationLauncher>('Celebration confetti launcher', {
  providedIn: 'root',
  factory: () => confetti,
});

/**
 * A single, accessible celebration boundary for reader rewards. Call this
 * only after the server has confirmed the interaction or point award.
 */
@Injectable({providedIn: 'root'})
export class CelebrationService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly readerPreferences = inject(ReaderPreferencesService);
  private readonly launchConfetti = inject(CELEBRATION_CONFETTI);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  celebrateCorrectAnswer(): void {
    this.launch({
      particleCount: 48,
      spread: 64,
      startVelocity: 34,
      origin: {y: 0.68},
    });
  }

  celebratePointsAwarded(points: number): void {
    const particleCount = Math.min(84, Math.max(42, Math.round(points) * 8));

    this.launch({
      particleCount,
      angle: 62,
      spread: 58,
      startVelocity: 38,
      origin: {x: 0.08, y: 0.72},
    });
    this.launch({
      particleCount,
      angle: 118,
      spread: 58,
      startVelocity: 38,
      origin: {x: 0.92, y: 0.72},
    });
  }

  /**
   * Keeps reward callers from animating a duplicate, zero-point, or otherwise
   * unconfirmed result. Returns whether a points celebration was displayed.
   */
  celebrateConfirmedPointAward(result: ConfirmedPointAward): boolean {
    const points = result.points ?? 0;

    if (!result.awarded || points <= 0) {
      return false;
    }

    this.celebratePointsAwarded(points);
    return true;
  }

  private launch(options: CelebrationLaunchOptions): void {
    if (!this.isBrowser || this.readerPreferences.preferences().reduceMotion) {
      return;
    }

    void this.launchConfetti({
      ...options,
      colors: CELEBRATION_COLORS,
      disableForReducedMotion: true,
      scalar: 0.92,
      ticks: 180,
      zIndex: CELEBRATION_Z_INDEX,
    });
  }
}
