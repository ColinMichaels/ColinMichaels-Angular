export type ScreenSaverModuleId = 'hero' | 'local';

export interface ScreenSaverDisplaySlide {
  id: string;
  imageUrl: string;
  focalPointX: number;
  focalPointY: number;
}

export interface ScreenSaverLocalImage {
  id: string;
  name: string;
  addedAt: string;
  size: number;
}

export interface ScreenSaverActiveLocalImage extends ScreenSaverLocalImage {
  imageUrl: string;
  sourceIndex: number;
}

export interface ScreenSaverPreferences {
  moduleId: ScreenSaverModuleId;
  kenBurnsEnabled: boolean;
  kenBurnsSpeed: number;
  slideshowIntervalSeconds: number;
}

export interface ScreenSaverModuleOption {
  id: ScreenSaverModuleId;
  label: string;
}

export const SCREEN_SAVER_MODULES: readonly ScreenSaverModuleOption[] = [
  {id: 'hero', label: 'Hero'},
  {id: 'local', label: 'My Images'},
];

export const DEFAULT_SCREEN_SAVER_PREFERENCES: ScreenSaverPreferences = {
  moduleId: 'hero',
  kenBurnsEnabled: true,
  kenBurnsSpeed: 1,
  slideshowIntervalSeconds: 8,
};

export const SCREEN_SAVER_KEN_BURNS_SPEED_MIN = 1;
export const SCREEN_SAVER_KEN_BURNS_SPEED_MAX = 5;
export const SCREEN_SAVER_SLIDESHOW_SECONDS_MIN = 4;
export const SCREEN_SAVER_SLIDESHOW_SECONDS_MAX = 20;

export const SCREEN_SAVER_KEN_BURNS_SPEED_LABELS: Readonly<Record<number, string>> = {
  1: 'Slow',
  2: 'Calm',
  3: 'Medium',
  4: 'Quick',
  5: 'Fast',
};

export const SCREEN_SAVER_KEN_BURNS_DURATION_SECONDS: Readonly<Record<number, number>> = {
  1: 24,
  2: 20,
  3: 16,
  4: 13,
  5: 10,
};

export function getScreenSaverActiveWindowIndexes(
  activeIndex: number,
  slideCount: number
): readonly number[] {
  if (slideCount <= 0) {
    return [];
  }

  const normalizedIndex = Number.isFinite(activeIndex) ? Math.trunc(activeIndex) : 0;
  const currentIndex = Math.min(slideCount - 1, Math.max(0, normalizedIndex));
  return [...new Set([
    currentIndex,
    (currentIndex + 1) % slideCount,
    (currentIndex - 1 + slideCount) % slideCount,
  ])];
}
