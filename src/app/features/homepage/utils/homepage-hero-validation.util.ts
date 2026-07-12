import {
  DEFAULT_HOMEPAGE_HERO_SETTINGS,
  HOMEPAGE_HERO_SETTINGS_ID,
  createDefaultHomepageHeroSettings,
} from '../homepage-hero.defaults';
import {
  HomepageHeroFeaturedPostMode,
  HomepageHeroSettings,
  HomepageHeroSlide,
  HomepageHeroSlideStatus,
  HomepageHeroStatus,
} from '../models/homepage-hero.model';

export const HOMEPAGE_HERO_STATUSES: readonly HomepageHeroStatus[] = ['draft', 'published'];
export const HOMEPAGE_HERO_SLIDE_STATUSES: readonly HomepageHeroSlideStatus[] = ['draft', 'published'];
export const HOMEPAGE_HERO_FEATURED_POST_MODES: readonly HomepageHeroFeaturedPostMode[] = ['featured', 'selected'];

const homepageHeroStatusSet = new Set<string>(HOMEPAGE_HERO_STATUSES);
const homepageHeroSlideStatusSet = new Set<string>(HOMEPAGE_HERO_SLIDE_STATUSES);
const homepageHeroFeaturedPostModeSet = new Set<string>(HOMEPAGE_HERO_FEATURED_POST_MODES);
const MIN_INTERVAL_MS = 3500;
const MAX_INTERVAL_MS = 20000;
const MIN_TRANSITION_MS = 250;
const MAX_TRANSITION_MS = 2500;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isHomepageHeroStatus(value: unknown): value is HomepageHeroStatus {
  return typeof value === 'string' && homepageHeroStatusSet.has(value);
}

export function isHomepageHeroSlideStatus(value: unknown): value is HomepageHeroSlideStatus {
  return typeof value === 'string' && homepageHeroSlideStatusSet.has(value);
}

export function isHomepageHeroFeaturedPostMode(value: unknown): value is HomepageHeroFeaturedPostMode {
  return typeof value === 'string' && homepageHeroFeaturedPostModeSet.has(value);
}

export function normalizeHomepageHeroSettings(value: unknown, fallback: HomepageHeroSettings = DEFAULT_HOMEPAGE_HERO_SETTINGS): HomepageHeroSettings {
  if (!isRecord(value)) {
    return fallback;
  }

  const now = new Date().toISOString();
  const fallbackCreatedAt = fallback.createdAt || now;
  const fallbackUpdatedAt = fallback.updatedAt || now;
  const status = isHomepageHeroStatus(value['status']) ? value['status'] : fallback.status;
  // Legacy `latest` settings migrate in memory to the automatic newest-featured policy.
  const featuredPostMode = value['featuredPostMode'] === 'latest'
    ? 'featured'
    : isHomepageHeroFeaturedPostMode(value['featuredPostMode'])
      ? value['featuredPostMode']
      : fallback.featuredPostMode;
  const slides = getSlideArray(value['slides']);

  return {
    id: HOMEPAGE_HERO_SETTINGS_ID,
    status,
    headlineLines: getHeadlineLines(value['headlineLines'], fallback.headlineLines),
    summary: getString(value['summary'], fallback.summary),
    featuredPostMode,
    featuredPostId: getNullableString(value['featuredPostId']),
    useFeaturedPostBackground: getBoolean(
      value['useFeaturedPostBackground'],
      fallback.useFeaturedPostBackground
    ),
    slideshowEnabled: getBoolean(value['slideshowEnabled'], fallback.slideshowEnabled),
    intervalMs: clampInteger(value['intervalMs'], MIN_INTERVAL_MS, MAX_INTERVAL_MS, fallback.intervalMs),
    transitionMs: clampInteger(value['transitionMs'], MIN_TRANSITION_MS, MAX_TRANSITION_MS, fallback.transitionMs),
    slides: slides.length > 0 ? slides : fallback.slides,
    createdAt: getString(value['createdAt'], fallbackCreatedAt),
    updatedAt: getString(value['updatedAt'], fallbackUpdatedAt),
  };
}

export function normalizeHomepageHeroSettingsForSave(settings: HomepageHeroSettings): HomepageHeroSettings {
  const now = new Date().toISOString();
  const normalized = normalizeHomepageHeroSettings(settings, createDefaultHomepageHeroSettings(now));

  return {
    ...normalized,
    slides: normalized.slides
      .map((slide, index) => ({
        ...slide,
        imageUrl: slide.imageUrl.trim(),
        altText: slide.altText.trim(),
        sortOrder: Number.isFinite(slide.sortOrder) ? slide.sortOrder : (index + 1) * 10,
        updatedAt: slide.updatedAt || now,
      }))
      .filter(slide => slide.imageUrl.length > 0)
      .sort(sortSlides),
    createdAt: normalized.createdAt || now,
    updatedAt: now,
  };
}

export function createHomepageHeroSlide(overrides: Partial<HomepageHeroSlide>): HomepageHeroSlide {
  const now = new Date().toISOString();

  return {
    id: overrides.id || createHeroSlideId(),
    imageUrl: overrides.imageUrl?.trim() || '',
    storagePath: overrides.storagePath,
    mediaId: overrides.mediaId,
    altText: overrides.altText?.trim() || '',
    width: getPositiveInteger(overrides.width),
    height: getPositiveInteger(overrides.height),
    focalPointX: clampNumber(overrides.focalPointX, 0, 100, 50),
    focalPointY: clampNumber(overrides.focalPointY, 0, 100, 50),
    kenBurnsEnabled: overrides.kenBurnsEnabled === true,
    sortOrder: Number.isFinite(overrides.sortOrder) ? Number(overrides.sortOrder) : 10,
    status: isHomepageHeroSlideStatus(overrides.status) ? overrides.status : 'published',
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  };
}

export function getPublishedHomepageHeroSlides(settings: HomepageHeroSettings): readonly HomepageHeroSlide[] {
  return settings.slides
    .filter(slide => slide.status === 'published' && slide.imageUrl.trim().length > 0)
    .sort(sortSlides);
}

export function sortSlides(left: HomepageHeroSlide, right: HomepageHeroSlide): number {
  return left.sortOrder - right.sortOrder
    || left.createdAt.localeCompare(right.createdAt)
    || left.id.localeCompare(right.id);
}

function getSlideArray(value: unknown): readonly HomepageHeroSlide[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(item => normalizeSlide(item))
    .filter((slide): slide is HomepageHeroSlide => slide !== null)
    .sort(sortSlides);
}

function normalizeSlide(value: unknown): HomepageHeroSlide | null {
  if (!isRecord(value)) {
    return null;
  }

  const imageUrl = getString(value['imageUrl'], '').trim();

  if (!imageUrl) {
    return null;
  }

  return createHomepageHeroSlide({
    id: getString(value['id'], createHeroSlideId()),
    imageUrl,
    storagePath: getOptionalString(value['storagePath']),
    mediaId: getOptionalString(value['mediaId']),
    altText: getString(value['altText'], ''),
    width: getPositiveInteger(value['width']),
    height: getPositiveInteger(value['height']),
    focalPointX: clampNumber(value['focalPointX'], 0, 100, 50),
    focalPointY: clampNumber(value['focalPointY'], 0, 100, 50),
    kenBurnsEnabled: getBoolean(value['kenBurnsEnabled'], false),
    sortOrder: getNumber(value['sortOrder'], 10),
    status: isHomepageHeroSlideStatus(value['status']) ? value['status'] : 'published',
    createdAt: getString(value['createdAt'], new Date().toISOString()),
    updatedAt: getString(value['updatedAt'], new Date().toISOString()),
  });
}

function getHeadlineLines(value: unknown, fallback: readonly string[]): readonly string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const lines = value
    .filter((line): line is string => typeof line === 'string')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 3);

  return lines.length > 0 ? lines : fallback;
}

function getString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function getOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function getNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function getBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function getNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getPositiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  return Math.round(clampNumber(value, min, max, fallback));
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numericValue = typeof value === 'number' && Number.isFinite(value) ? value : fallback;

  return Math.min(max, Math.max(min, numericValue));
}

function createHeroSlideId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `homepage-hero-slide-${crypto.randomUUID()}`;
  }

  return `homepage-hero-slide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
