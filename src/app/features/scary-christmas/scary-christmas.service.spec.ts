import {DOCUMENT} from '@angular/common';
import {TestBed} from '@angular/core/testing';

import {
  isScaryChristmasRoute,
  SCARY_CHRISTMAS_CANDIES,
  SCARY_CHRISTMAS_STORAGE_KEY,
} from './scary-christmas.config';
import {ScaryChristmasService} from './scary-christmas.service';

describe('ScaryChristmasService', () => {
  let values: Map<string, string>;
  let storage: Storage;
  let browserWindow: Window;
  let addListener: jasmine.Spy;
  let removeListener: jasmine.Spy;

  beforeEach(() => {
    values = new Map();
    storage = {
      get length() { return values.size; },
      clear: () => values.clear(),
      getItem: key => values.get(key) ?? null,
      key: index => [...values.keys()][index] ?? null,
      removeItem: key => { values.delete(key); },
      setItem: (key, value) => { values.set(key, value); },
    };
    addListener = jasmine.createSpy('addEventListener');
    removeListener = jasmine.createSpy('removeEventListener');
    browserWindow = {
      localStorage: storage,
      addEventListener: addListener,
      removeEventListener: removeListener,
    } as unknown as Window;
  });

  afterEach(() => TestBed.resetTestingModule());

  function createService(view: Window | null = browserWindow): ScaryChristmasService {
    TestBed.configureTestingModule({
      providers: [
        ScaryChristmasService,
        {provide: DOCUMENT, useValue: {defaultView: view}},
      ],
    });
    return TestBed.inject(ScaryChristmasService);
  }

  function updateFromAnotherTab(key: string | null, newValue: string | null): void {
    const listener = addListener.calls.mostRecent().args[1] as (event: StorageEvent) => void;
    listener({key, newValue, storageArea: storage} as StorageEvent);
  }

  it('collects each known candy once and persists only bounded seasonal data', () => {
    const service = createService();
    const firstId = service.candies[0].id;

    expect(service.collect('unknown-candy')).toBeFalse();
    expect(service.collect(firstId)).toBeTrue();
    expect(service.collect(firstId)).toBeFalse();
    expect(service.count()).toBe(1);
    expect(service.complete()).toBeFalse();
    expect(service.announcement()).toContain('1 of 8');
    expect(JSON.parse(values.get(SCARY_CHRISTMAS_STORAGE_KEY)!)).toEqual({
      version: 1,
      enabled: true,
      collectedIds: [firstId],
    });

    service.candies.slice(1).forEach(candy => service.collect(candy.id));
    expect(service.count()).toBe(8);
    expect(service.complete()).toBeTrue();
    expect(service.announcement()).toBe('Your lantern is full. All 8 sweets found.');
    expect(Object.isFrozen(service.collectedIds())).toBeTrue();
  });

  it('restores valid progress while discarding duplicates, unknown ids, and non-string values', () => {
    const ids = SCARY_CHRISTMAS_CANDIES.map(candy => candy.id);
    values.set(SCARY_CHRISTMAS_STORAGE_KEY, JSON.stringify({
      version: 1,
      enabled: false,
      collectedIds: ['unknown', null, 42, ...ids, ...ids],
      url: '/private-page-that-must-never-be-rewritten',
    }));
    const service = createService();

    expect(service.enabled()).toBeFalse();
    expect(service.collectedIds()).toEqual(ids);
    expect(service.count()).toBe(8);
    expect(service.complete()).toBeTrue();
    service.setEnabled(true);
    expect(JSON.parse(values.get(SCARY_CHRISTMAS_STORAGE_KEY)!)).toEqual({
      version: 1,
      enabled: true,
      collectedIds: ids,
    });
  });

  it('ignores malformed, oversized, and incompatible stored payloads', () => {
    const malformed = [
      'broken-json',
      'null',
      '[]',
      JSON.stringify({version: 2, enabled: false, collectedIds: ['ember-toffee']}),
      JSON.stringify({version: 1, enabled: 'false', collectedIds: ['ember-toffee']}),
      JSON.stringify({version: 1, enabled: false, collectedIds: {id: 'ember-toffee'}}),
      JSON.stringify({version: 1, enabled: false, collectedIds: ['ember-toffee']}) + ' '.repeat(4096),
    ];

    for (const payload of malformed) {
      TestBed.resetTestingModule();
      values.set(SCARY_CHRISTMAS_STORAGE_KEY, payload);
      const service = createService();
      expect(service.enabled()).withContext(payload.slice(0, 80)).toBeTrue();
      expect(service.count()).toBe(0);
      expect(service.persistenceAvailable()).toBeTrue();
    }
  });

  it('hides collection controls and closes the lantern while disabled, preserving progress', () => {
    const service = createService();
    service.collect('ember-toffee');
    service.openLantern();
    expect(service.panelOpen()).toBeTrue();

    service.setEnabled(false);
    service.openLantern();
    expect(service.panelOpen()).toBeFalse();
    expect(service.announcement()).toBe('');
    expect(service.collect('moonlit-mint')).toBeFalse();
    expect(service.candiesFor('/', 'footer')).toEqual([]);
    expect(service.count()).toBe(1);

    service.setEnabled(true);
    expect(service.count()).toBe(1);
    expect(service.collect('moonlit-mint')).toBeTrue();
    service.openLantern();
    service.closeLantern();
    expect(service.panelOpen()).toBeFalse();
  });

  it('resets the hunt without altering unrelated storage or the enabled preference', () => {
    values.set('unrelated.preference', 'preserve-me');
    const service = createService();
    service.candies.forEach(candy => service.collect(candy.id));
    service.setEnabled(false);
    service.resetHunt();

    expect(service.count()).toBe(0);
    expect(service.complete()).toBeFalse();
    expect(service.announcement()).toBe('');
    expect(service.enabled()).toBeFalse();
    expect(values.get('unrelated.preference')).toBe('preserve-me');
    expect(JSON.parse(values.get(SCARY_CHRISTMAS_STORAGE_KEY)!)).toEqual({
      version: 1,
      enabled: false,
      collectedIds: [],
    });
  });

  it('offers only uncollected candies at their exact registered route and placement', () => {
    const service = createService();

    expect(service.candiesFor('/?campaign=october#hello', 'banner').map(candy => candy.id))
      .toEqual(['ember-toffee']);
    expect(service.candiesFor('/blog/', 'footer').map(candy => candy.id))
      .toEqual(['midnight-caramel']);
    expect(service.candiesFor('/blog/an-article', 'footer')).toEqual([]);
    expect(service.candiesFor('/blog/preview/token', 'footer')).toEqual([]);
    expect(service.candiesFor('/admin', 'footer')).toEqual([]);
    expect(service.candiesFor('/authors', 'banner')).toEqual([]);

    service.collect('ember-toffee');
    expect(service.candiesFor('/', 'banner')).toEqual([]);
  });

  it('keeps the hunt playable when the localStorage getter is denied', () => {
    Object.defineProperty(browserWindow, 'localStorage', {
      get: () => { throw new Error('Storage is denied'); },
    });
    const service = createService();

    expect(service.persistenceAvailable()).toBeFalse();
    expect(service.collect('ember-toffee')).toBeTrue();
    expect(service.count()).toBe(1);
    expect(() => service.resetHunt()).not.toThrow();
    expect(service.count()).toBe(0);
  });

  it('keeps current-session progress when reads or writes are denied', () => {
    spyOn(storage, 'getItem').and.throwError('Read denied');
    const write = spyOn(storage, 'setItem').and.throwError('Quota exceeded');
    const service = createService();

    expect(service.persistenceAvailable()).toBeFalse();
    expect(service.collect('ember-toffee')).toBeTrue();
    expect(service.count()).toBe(1);
    expect(service.persistenceAvailable()).toBeFalse();
    expect(write).toHaveBeenCalledTimes(1);

    write.and.callThrough();
    service.collect('moonlit-mint');
    expect(service.count()).toBe(2);
    expect(service.persistenceAvailable()).toBeTrue();
  });

  it('works without a browser window for server-side rendering', () => {
    const service = createService(null);

    expect(service.persistenceAvailable()).toBeFalse();
    expect(service.collect('ember-toffee')).toBeTrue();
    expect(service.count()).toBe(1);
    expect(addListener).not.toHaveBeenCalled();
  });

  it('synchronizes only its seasonal storage updates and cleans up its listener', () => {
    const service = createService();
    service.collect('ember-toffee');
    updateFromAnotherTab('unrelated.preference', JSON.stringify({
      version: 1, enabled: true, collectedIds: ['moonlit-mint'],
    }));
    expect(service.collectedIds()).toEqual(['ember-toffee']);

    updateFromAnotherTab(SCARY_CHRISTMAS_STORAGE_KEY, 'malformed');
    expect(service.collectedIds()).toEqual(['ember-toffee']);
    updateFromAnotherTab(SCARY_CHRISTMAS_STORAGE_KEY, JSON.stringify({
      version: 1, enabled: false, collectedIds: ['moonlit-mint', 'unknown', 'moonlit-mint'],
    }));
    expect(service.enabled()).toBeFalse();
    expect(service.collectedIds()).toEqual(['moonlit-mint']);
    updateFromAnotherTab(SCARY_CHRISTMAS_STORAGE_KEY, null);
    expect(service.enabled()).toBeTrue();
    expect(service.count()).toBe(0);

    const listener = addListener.calls.mostRecent().args[1];
    TestBed.resetTestingModule();
    expect(removeListener).toHaveBeenCalledOnceWith('storage', listener);
  });
});

describe('Scary Christmas public route boundary', () => {
  it('permits only supported public reading route shapes', () => {
    [
      '/', '/?source=october#top', '/blog', '/blog/', '/blog/search',
      '/blog/a-published-article', '/blog/category/gadgets', '/blog/tag/music',
      '/topics/gadgets-toys', '/authors', '/authors/colin-michaels',
    ].forEach(url => expect(isScaryChristmasRoute(url)).withContext(url).toBeTrue());
  });

  it('excludes private, account, form, preview, OS, and unknown nested surfaces', () => {
    [
      '/admin', '/admin/cms', '/auth', '/login', '/logout', '/profile', '/privacy',
      '/os', '/desktop', '/terminal', '/contact', '/submissions', '/not-found',
      '/blog/preview', '/blog/preview/token', '/blog/preview/token/extra',
      '/blog/preview;token=secret', '/blog/%70review/token', '/blog/foo/bar',
      '/topics', '/topics/gadgets-toys/nested', '/authors/colin/posts',
      '/unknown', 'https://colinmichaels.com/blog', '//example.com/blog',
      '/%2fadmin', '/blog%2fpreview', '/blog/%ZZ', '/Blog',
    ].forEach(url => expect(isScaryChristmasRoute(url)).withContext(url).toBeFalse());
  });

  it('keeps one unique candy for each of the eight defined public hiding places', () => {
    expect(SCARY_CHRISTMAS_CANDIES.length).toBe(8);
    expect(new Set(SCARY_CHRISTMAS_CANDIES.map(candy => candy.id)).size).toBe(8);
    expect(SCARY_CHRISTMAS_CANDIES.every(candy => isScaryChristmasRoute(candy.route))).toBeTrue();
    expect(Object.isFrozen(SCARY_CHRISTMAS_CANDIES)).toBeTrue();
  });
});
