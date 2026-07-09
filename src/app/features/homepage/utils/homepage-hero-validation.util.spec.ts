import {DEFAULT_HOMEPAGE_HERO_SETTINGS} from '../homepage-hero.defaults';
import {
  getPublishedHomepageHeroSlides,
  normalizeHomepageHeroSettings,
  normalizeHomepageHeroSettingsForSave,
} from './homepage-hero-validation.util';

describe('homepage hero validation utilities', () => {
  it('falls back to the default hero settings for invalid input', () => {
    expect(normalizeHomepageHeroSettings(null)).toEqual(DEFAULT_HOMEPAGE_HERO_SETTINGS);
  });

  it('normalizes partial Firestore settings and clamps timing values', () => {
    const settings = normalizeHomepageHeroSettings({
      id: 'ignored',
      status: 'published',
      headlineLines: ['Custom hero'],
      summary: 'Custom summary',
      featuredPostMode: 'selected',
      featuredPostId: 'post-123',
      slideshowEnabled: true,
      intervalMs: 50,
      transitionMs: 9000,
      slides: [
        {
          id: 'slide-2',
          imageUrl: '/two.webp',
          focalPointX: 120,
          focalPointY: -20,
          sortOrder: 20,
          status: 'published',
          createdAt: '2026-07-02T00:00:00.000Z',
          updatedAt: '2026-07-02T00:00:00.000Z',
        },
        {
          id: 'slide-1',
          imageUrl: '/one.webp',
          focalPointX: 35,
          focalPointY: 65,
          sortOrder: 10,
          status: 'draft',
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
        },
      ],
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-02T00:00:00.000Z',
    });

    expect(settings.id).toBe('home');
    expect(settings.intervalMs).toBe(3500);
    expect(settings.transitionMs).toBe(2500);
    expect(settings.slides.map(slide => slide.id)).toEqual(['slide-1', 'slide-2']);
    expect(settings.slides[1].focalPointX).toBe(100);
    expect(settings.slides[1].focalPointY).toBe(0);
    expect(getPublishedHomepageHeroSlides(settings).map(slide => slide.id)).toEqual(['slide-2']);
  });

  it('removes empty image slides when preparing settings for save', () => {
    const settings = normalizeHomepageHeroSettingsForSave({
      ...DEFAULT_HOMEPAGE_HERO_SETTINGS,
      slides: [
        {
          ...DEFAULT_HOMEPAGE_HERO_SETTINGS.slides[0],
          id: 'valid-slide',
          imageUrl: '/valid.webp',
        },
        {
          ...DEFAULT_HOMEPAGE_HERO_SETTINGS.slides[0],
          id: 'empty-slide',
          imageUrl: ' ',
        },
      ],
    });

    expect(settings.slides.map(slide => slide.id)).toEqual(['valid-slide']);
  });
});

