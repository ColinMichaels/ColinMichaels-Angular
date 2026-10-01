import {SCARY_CHRISTMAS_CANDIES, SCARY_CHRISTMAS_CONFIG} from '../scary-christmas/scary-christmas.config';
import {getSeasonalEdition, SEASONAL_EDITIONS} from './seasonal.catalog';
import {
  chooseCalendarEdition, chooseEdition, isSeasonalArchiveRoute, isSeasonalReadingRoute,
  SEASONAL_CONFIG, seasonalDateKey, seasonalStorageKey,
} from './seasonal.config';
import {SeasonalEdition} from './seasonal.models';
import {SEASONAL_PLANS} from './seasonal.plans';

describe('seasonal catalog and selection', () => {
  const calendarConfig = {...SEASONAL_CONFIG, mode: 'calendar' as const};
  const manualConfig = {...SEASONAL_CONFIG, mode: 'manual' as const};
  function approved(id: string, priority?: number): SeasonalEdition {
    const edition = getSeasonalEdition(id)!;
    return {...edition, approvedForCalendar: true, priority: priority ?? edition.priority};
  }

  it('preserves the Halloween registry and storage key with external listening and only Halloween approved for the release calendar', () => {
    const halloween = getSeasonalEdition('scary-christmas-2026')!;
    expect(halloween.items).toBe(SCARY_CHRISTMAS_CANDIES);
    expect(halloween.musicSrc).toBeNull();
    expect(halloween.musicHref).toBe(SCARY_CHRISTMAS_CONFIG.musicHref);
    expect(seasonalStorageKey(halloween.id)).toBe('cm.scary-christmas-2026.v1');
    expect(SEASONAL_CONFIG.mode).toBe('calendar');
    expect(chooseEdition('/', new Date('2026-09-30T12:00:00Z'))).toBeNull();
    expect(chooseEdition('/', new Date('2026-10-15T12:00:00Z'))?.id).toBe(halloween.id);
    expect(chooseEdition('/blog', new Date('2027-06-01T12:00:00Z'))).toBeNull();
    for (const now of ['2026-11-26T12:00:00Z', '2026-12-04T12:00:00Z', '2026-12-21T12:00:00Z', '2027-01-01T12:00:00Z']) {
      expect(chooseEdition('/blog', new Date(now))).withContext(now).toBeNull();
    }
    expect(SEASONAL_EDITIONS.length).toBe(7 + SEASONAL_PLANS.length);
    expect(SEASONAL_EDITIONS.filter(edition => edition.approvedForCalendar).map(edition => edition.id)).toEqual([halloween.id]);
    expect(SEASONAL_EDITIONS.filter(edition => edition.id !== halloween.id).every(edition => edition.musicSrc === null)).toBeTrue();
  });

  it('keeps catalog collections finite, frozen, unique, and on registered public routes', () => {
    expect(new Set(SEASONAL_EDITIONS.map(edition => edition.id)).size).toBe(SEASONAL_EDITIONS.length);
    for (const edition of SEASONAL_EDITIONS) {
      expect(edition.items.length).toBeLessThanOrEqual(8);
      expect(edition.items.length).toBeGreaterThanOrEqual(edition.interaction === 'reflect' ? 0 : 1);
      if (edition.interaction === 'reflect') {
        expect(edition.items.length).toBe(0);
      }
      expect(new Set(edition.items.map(item => item.id)).size).toBe(edition.items.length);
      expect(edition.items.every(item => isSeasonalReadingRoute(item.route))).toBeTrue();
      expect(Object.isFrozen(edition)).toBeTrue();
      expect(Object.isFrozen(edition.items)).toBeTrue();
    }
    expect(getSeasonalEdition('unknown')).toBeNull();
  });

  it('prepares every plan without calendar activation and preserves both Kwanzaa principle editions', () => {
    for (const plan of SEASONAL_PLANS) {
      const edition = getSeasonalEdition(plan.id)!;
      expect(edition).withContext(plan.id).not.toBeNull();
      expect(edition.dateStatus).toBe(plan.dateStatus);
      expect(edition.approvedForCalendar).toBeFalse();
      expect(edition.musicSrc).toBeNull();
      expect(edition.interaction).toBe(plan.reflective ? 'reflect' : 'hunt');
      if (plan.dateStatus === 'needs-review') {
        expect(edition.displayStart).toBe('');
        expect(edition.displayEnd).toBe('');
      }
    }
    const principles = ['Umoja · Unity', 'Kujichagulia · Self-determination',
      'Ujima · Collective work and responsibility', 'Ujamaa · Cooperative economics',
      'Nia · Purpose', 'Kuumba · Creativity', 'Imani · Faith'];
    const original = getSeasonalEdition('kwanzaa-2026')!;
    const next = getSeasonalEdition('kwanzaa-2027')!;
    expect(original.items.map(item => item.name)).toEqual(principles);
    expect(next.items.map(item => item.name)).toEqual(principles);
    expect(seasonalStorageKey(next.id)).not.toBe(seasonalStorageKey(original.id));
  });

  it('permits exact public reading shapes and excludes preview, account, form, and OS surfaces', () => {
    ['/', '/blog', '/blog/search', '/blog/post-one', '/blog/category/gadgets', '/blog/tag/music',
      '/topics/gadgets-toys', '/authors', '/authors/colin-michaels?from=archive#top']
      .forEach(url => expect(isSeasonalReadingRoute(url)).withContext(url).toBeTrue());
    ['/admin', '/login', '/profile', '/privacy', '/contact', '/submissions', '/os', '/not-found',
      '/blog/preview', '/blog/preview/token', '/blog/%70review/token', '/blog/post/nested',
      '/blog;token=secret', '/blog%2fpreview', '/topics', '/authors/a/posts', '//example.com/blog',
      'https://example.com/blog', '/%ZZ', '/archive/seasons', '/archive/seasons/unknown']
      .forEach(url => expect(isSeasonalReadingRoute(url)).withContext(url).toBeFalse());
  });

  it('selects only known exact archives and never falls back for an invalid archive identifier', () => {
    expect(chooseEdition('/archive/seasons/thanksgiving-2026/?visit=1#find-thanksgiving-1')?.id).toBe('thanksgiving-2026');
    expect(isSeasonalArchiveRoute('/archive/seasons/hanukkah-2026')).toBeTrue();
    ['/archive/seasons', '/archive/seasons/unknown', '/archive/seasons/thanksgiving-2026/nested',
      '/archive/seasons%2fthanksgiving-2026', '/archive/seasons/thanksgiving-2026;token=private']
      .forEach(url => {
        expect(isSeasonalArchiveRoute(url)).withContext(url).toBeFalse();
        expect(chooseEdition(url)).withContext(url).toBeNull();
      });
    expect(chooseEdition('/blog', undefined, {...manualConfig, manualEditionId: 'unknown'})).toBeNull();
  });

  it('removes main decorations when off while preserving explicit known archive editions', () => {
    for (const config of [{...SEASONAL_CONFIG, enabled: false}, {...SEASONAL_CONFIG, mode: 'off' as const}]) {
      expect(chooseEdition('/blog', undefined, config)).toBeNull();
      expect(chooseEdition('/archive/seasons/christmas-2026', undefined, config)?.id).toBe('christmas-2026');
    }
  });

  it('activates only an owner-selected manual edition on public routes and leaves archives authoritative', () => {
    const future = getSeasonalEdition('thanksgiving-2026')!;
    const ownerConfig = {...manualConfig, manualEditionId: future.id};
    const outsideWindow = new Date('2027-06-01T12:00:00Z');
    expect(chooseEdition('/blog', outsideWindow, ownerConfig)).toBe(future);
    expect(chooseEdition('/blog', outsideWindow, manualConfig)?.id).toBe('scary-christmas-2026');
    expect(chooseEdition('/archive/seasons/hanukkah-2026', outsideWindow, ownerConfig)?.id).toBe('hanukkah-2026');
    for (const url of ['/admin', '/profile', '/os', '/blog/preview/token', '/archive/seasons', '/archive/seasons/unknown']) {
      expect(chooseEdition(url, outsideWindow, ownerConfig)).withContext(url).toBeNull();
    }
    for (const config of [{...ownerConfig, enabled: false}, {...ownerConfig, mode: 'off' as const}]) {
      expect(chooseEdition('/blog', outsideWindow, config)).toBeNull();
      expect(chooseEdition('/archive/seasons/hanukkah-2026', outsideWindow, config)?.id).toBe('hanukkah-2026');
    }
  });

  it('requires calendar mode and individual approval before a display window can activate', () => {
    const now = new Date('2026-10-15T12:00:00Z');
    expect(chooseCalendarEdition(now, calendarConfig, [{...approved('scary-christmas-2026'), approvedForCalendar: false}])).toBeNull();
    expect(chooseCalendarEdition(now, manualConfig, [approved('scary-christmas-2026')])).toBeNull();
    expect(chooseCalendarEdition(now, {...calendarConfig, enabled: false}, [approved('scary-christmas-2026')])).toBeNull();
    expect(chooseEdition('/blog', now, calendarConfig, [approved('scary-christmas-2026')])?.id).toBe('scary-christmas-2026');
  });

  it('uses New York dates at both inclusive window boundaries across daylight-saving offsets', () => {
    const halloween = [approved('scary-christmas-2026')];
    expect(chooseCalendarEdition(new Date('2026-10-01T03:59:59Z'), calendarConfig, halloween)).toBeNull();
    expect(chooseCalendarEdition(new Date('2026-10-01T04:00:00Z'), calendarConfig, halloween)?.id).toBe('scary-christmas-2026');
    expect(chooseCalendarEdition(new Date('2026-11-02T04:59:59Z'), calendarConfig, halloween)?.id).toBe('scary-christmas-2026');
    expect(chooseCalendarEdition(new Date('2026-11-02T05:00:00Z'), calendarConfig, halloween)).toBeNull();
    expect(seasonalDateKey(new Date('2026-12-31T04:59:59Z'))).toBe('2026-12-30');
    expect(seasonalDateKey(new Date('2026-12-31T05:00:00Z'))).toBe('2026-12-31');
  });

  it('resolves overlapping and cross-year windows by priority with a stable identifier tie-break', () => {
    const december = [approved('christmas-2026'), approved('winter-solstice-2026')];
    expect(chooseCalendarEdition(new Date('2026-12-21T12:00:00Z'), calendarConfig, december)?.id).toBe('winter-solstice-2026');
    const tied = december.map(edition => ({...edition, priority: 1}));
    expect(chooseCalendarEdition(new Date('2026-12-21T12:00:00Z'), calendarConfig, tied)?.id).toBe('christmas-2026');
    expect(chooseCalendarEdition(new Date('2026-12-21T12:00:00Z'), calendarConfig, [...tied].reverse())?.id).toBe('christmas-2026');
    const newYear = [approved('kwanzaa-2026'), approved('new-year-2027')];
    expect(chooseCalendarEdition(new Date('2027-01-01T12:00:00Z'), calendarConfig, newYear)?.id).toBe('new-year-2027');
    expect(chooseCalendarEdition(new Date('2027-01-04T04:59:59Z'), calendarConfig, newYear)?.id).toBe('new-year-2027');
    expect(chooseCalendarEdition(new Date('2027-01-04T05:00:00Z'), calendarConfig, newYear)).toBeNull();
  });

  it('rejects invalid dates and time zones without throwing or choosing an edition', () => {
    expect(seasonalDateKey(new Date('invalid'))).toBeNull();
    expect(seasonalDateKey(new Date(), 'not-a-time-zone')).toBeNull();
    expect(chooseCalendarEdition(new Date('invalid'), calendarConfig, [approved('christmas-2026')])).toBeNull();
  });

  it('never activates empty, invalid, reversed, or pending display dates even when approval is set accidentally', () => {
    const base = approved('christmas-2026');
    const now = new Date('2026-12-20T12:00:00Z');
    for (const window of [{displayStart: '', displayEnd: ''},
      {displayStart: '2026-12-01', displayEnd: ''},
      {displayStart: '2026-02-30', displayEnd: '2026-12-31'},
      {displayStart: '2026-12-25', displayEnd: '2026-12-13'},
      {displayStart: '2026-12-13', displayEnd: '2026-12-25', dateStatus: 'needs-review' as const}]) {
      expect(chooseCalendarEdition(now, calendarConfig, [{...base, ...window}])).toBeNull();
    }
  });
});
