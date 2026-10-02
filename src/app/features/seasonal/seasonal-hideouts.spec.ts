import {SEASONAL_EDITIONS} from './seasonal.catalog';
import {seasonalHideoutFor, seasonalHideoutsFor} from './seasonal-hideouts';

describe('seasonal hiding places', () => {
  it('uses exact registered routes and normalizes query, hash and trailing slash', () => {
    expect(seasonalHideoutsFor('/topics/gadgets-toys/?from=clue#topic-posts'))
      .toEqual(seasonalHideoutsFor('/topics/gadgets-toys'));
    for (const route of ['/archive/seasons/scary-christmas-2026', '/admin', '/blog/preview/token',
      '/blog/some-article', '/topics/unknown', '/authors/colin-michaels', 'https://other.example/']) {
      expect(seasonalHideoutsFor(route)).withContext(route).toEqual([]);
      expect(seasonalHideoutFor('scary-christmas-2026', route, 0, 14, 0)).toBeUndefined();
    }
  });

  it('is stable for the same visit and rotates through every available content area on return', () => {
    for (const route of ['/', '/blog', '/topics/gadgets-toys', '/topics/drones-fpv', '/topics/labs-projects', '/authors']) {
      for (const seed of [0, 14, 0xffffffff]) {
        const slots = seasonalHideoutsFor(route);
        const placements = slots.map((_, visit) => seasonalHideoutFor('scary-christmas-2026', route, 0, seed, visit));
        expect(new Set(placements).size).withContext(route).toBe(slots.length);
        expect(seasonalHideoutFor('scary-christmas-2026', route, 0, seed, 0)).toBe(placements[0]);
      }
    }
  });

  it('has enough distinct hiding places for every catalog edition without stacking objects', () => {
    for (const edition of SEASONAL_EDITIONS) {
      for (const route of new Set(edition.items.map(item => item.route))) {
        const items = edition.items.filter(item => item.route === route);
        const slots = items.map((_, ordinal) => seasonalHideoutFor(edition.id, route, ordinal, 42, 7));
        expect(slots.every(Boolean)).withContext(`${edition.id}: ${route}`).toBeTrue();
        expect(new Set(slots).size).withContext(`${edition.id}: ${route}`).toBe(items.length);
      }
    }
  });
});
