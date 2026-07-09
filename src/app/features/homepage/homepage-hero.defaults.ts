import {HomepageHeroSettings, HomepageHeroSlide} from './models/homepage-hero.model';

export const DEFAULT_HOMEPAGE_HERO_IMAGE = '/assets/images/backgrounds/colinmichaels-hero-background.webp';
export const HOMEPAGE_HERO_SETTINGS_COLLECTION = 'homepageSettings';
export const HOMEPAGE_HERO_SETTINGS_ID = 'home';

export function createDefaultHomepageHeroSlide(now = '2026-01-01T00:00:00.000Z'): HomepageHeroSlide {
  return {
    id: 'homepage-hero-default-slide',
    imageUrl: DEFAULT_HOMEPAGE_HERO_IMAGE,
    altText: '',
    width: 1717,
    height: 916,
    focalPointX: 50,
    focalPointY: 50,
    sortOrder: 10,
    status: 'published',
    createdAt: now,
    updatedAt: now,
  };
}

export function createDefaultHomepageHeroSettings(now = '2026-01-01T00:00:00.000Z'): HomepageHeroSettings {
  return {
    id: HOMEPAGE_HERO_SETTINGS_ID,
    status: 'published',
    headlineLines: [
      'A Life of Curiosity.',
      'A Journey of Growth.',
    ],
    summary: 'Exploring the worlds of AI, technology, outdoor adventure, and personal development. Real experiences. Honest insights. Practical tools.',
    featuredPostMode: 'latest',
    featuredPostId: null,
    slideshowEnabled: true,
    intervalMs: 6500,
    transitionMs: 900,
    slides: [createDefaultHomepageHeroSlide(now)],
    createdAt: now,
    updatedAt: now,
  };
}

export const DEFAULT_HOMEPAGE_HERO_SETTINGS = createDefaultHomepageHeroSettings();

