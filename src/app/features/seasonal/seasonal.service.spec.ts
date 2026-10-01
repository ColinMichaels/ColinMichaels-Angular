import {DOCUMENT} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {User} from 'firebase/auth';
import {BehaviorSubject} from 'rxjs';

import {AuthService, AuthState} from '../../services/auth.service';

import {getSeasonalEdition} from './seasonal.catalog';
import {SEASONAL_CONFIG, SEASONAL_PREFERENCE_STORAGE_KEY, seasonalStorageKey} from './seasonal.config';
import {SeasonalConfig} from './seasonal.models';
import {SEASONAL_CONFIGURATION, SeasonalService} from './seasonal.service';

describe('SeasonalService', () => {
  let values: Map<string, string>;
  let storage: Storage;
  let browserWindow: Window;
  let addListener: jasmine.Spy;
  let removeListener: jasmine.Spy;
  let setInterval: jasmine.Spy;
  let clearInterval: jasmine.Spy;
  let documentAddListener: jasmine.Spy;
  let documentRemoveListener: jasmine.Spy;
  let visibilityState: DocumentVisibilityState;
  let authState: BehaviorSubject<AuthState>;
  const registeredUser = {uid: 'registered-reader', isAnonymous: false} as User;
  const manualConfig: Readonly<SeasonalConfig> = {...SEASONAL_CONFIG, mode: 'manual'};
  const halloweenKey = 'cm.scary-christmas-2026.v1';
  const harvestKey = 'cm.thanksgiving-2026.v1';
  const harvestId = getSeasonalEdition('thanksgiving-2026')!.items[0].id;

  beforeEach(() => {
    values = new Map();
    storage = {
      get length() { return values.size; },
      clear: () => values.clear(), getItem: key => values.get(key) ?? null,
      key: index => [...values.keys()][index] ?? null,
      removeItem: key => { values.delete(key); },
      setItem: (key, value) => { values.set(key, value); },
    };
    addListener = jasmine.createSpy('addEventListener');
    removeListener = jasmine.createSpy('removeEventListener');
    setInterval = jasmine.createSpy('setInterval').and.returnValue(37);
    clearInterval = jasmine.createSpy('clearInterval');
    documentAddListener = jasmine.createSpy('document.addEventListener');
    documentRemoveListener = jasmine.createSpy('document.removeEventListener');
    visibilityState = 'visible';
    authState = new BehaviorSubject<AuthState>({status: 'authenticated', user: registeredUser});
    browserWindow = {localStorage: storage, addEventListener: addListener, removeEventListener: removeListener,
      setInterval, clearInterval} as unknown as Window;
  });

  afterEach(() => { TestBed.resetTestingModule(); jasmine.clock().uninstall(); });

  function createService(config: Readonly<SeasonalConfig> = manualConfig, view: Window | null = browserWindow): SeasonalService {
    TestBed.configureTestingModule({providers: [SeasonalService,
      {provide: DOCUMENT, useValue: {defaultView: view, get visibilityState() { return visibilityState; },
        addEventListener: documentAddListener, removeEventListener: documentRemoveListener}},
      {provide: SEASONAL_CONFIGURATION, useValue: config},
      {provide: AuthService, useValue: {authState$: authState.asObservable()}},
    ]});
    return TestBed.inject(SeasonalService);
  }

  function remoteUpdate(key: string | null, newValue: string | null, area = storage): void {
    const listener = addListener.calls.mostRecent().args[1] as (event: StorageEvent) => void;
    listener({key, newValue, storageArea: area} as StorageEvent);
  }

  it('requires a confirmed non-anonymous Firebase account with a UID before permitting customization', () => {
    const service = createService();
    service.setContext('/archive/seasons/scary-christmas-2026');
    expect(service.canCustomize()).toBeTrue();
    const unregisteredStates: AuthState[] = [
      {status: 'initializing', user: null},
      {status: 'unavailable', user: null},
      {status: 'unauthenticated', user: null},
      {status: 'authenticated', user: {uid: 'firebase-guest', isAnonymous: true} as User},
      {status: 'authenticated', user: {uid: '', isAnonymous: false} as User},
      {status: 'authenticated', user: {uid: 'unknown-account-type'} as User},
    ];
    for (const state of unregisteredStates) {
      authState.next(state);
      expect(service.canCustomize()).withContext(JSON.stringify(state)).toBeFalse();
      expect(service.enabled()).toBeTrue();
      service.openLantern();
      expect(service.panelOpen()).toBeTrue();
      service.closeLantern();
    }
    authState.next({status: 'authenticated', user: registeredUser});
    expect(service.canCustomize()).toBeTrue();
  });

  it('ignores stored global and legacy edition bypass for guests without clearing preferences or progress', () => {
    authState.next({status: 'unauthenticated', user: null});
    values.set(SEASONAL_PREFERENCE_STORAGE_KEY, JSON.stringify({version: 1, editionId: 'thanksgiving-2026', disabled: true}));
    values.set(halloweenKey, JSON.stringify({version: 1, enabled: false, collectedIds: ['ember-toffee']}));
    values.set('account.identity', JSON.stringify({uid: 'pretend-account', isAnonymous: false}));
    const originalPreference = values.get(SEASONAL_PREFERENCE_STORAGE_KEY);
    const originalProgress = values.get(halloweenKey);
    const write = spyOn(storage, 'setItem').and.callThrough();
    const service = createService();
    service.setContext('/');
    expect(service.edition()?.id).toBe('scary-christmas-2026');
    expect(service.canCustomize()).toBeFalse();
    expect(service.visitorDisabled()).toBeFalse();
    expect(service.enabled()).toBeTrue();
    expect(service.count()).toBe(1);
    service.setEnabled(false);
    service.setEnabled(true);
    expect(write).not.toHaveBeenCalled();
    expect(values.get(SEASONAL_PREFERENCE_STORAGE_KEY)).toBe(originalPreference);
    expect(values.get(halloweenKey)).toBe(originalProgress);
    expect(service.collect('moonlit-mint')).toBeTrue();
    expect(JSON.parse(values.get(halloweenKey)!)).toEqual({version: 1, enabled: false,
      collectedIds: ['ember-toffee', 'moonlit-mint']});
    service.setContext('/archive/seasons/scary-christmas-2026');
    expect(service.enabled()).toBeTrue();
    expect(service.count()).toBe(2);
  });

  it('does not write a design preference from initializing, unavailable, signed-out or Firebase-anonymous sessions', () => {
    const write = spyOn(storage, 'setItem').and.callThrough();
    const service = createService();
    service.setContext('/archive/seasons/thanksgiving-2026');
    for (const state of [
      {status: 'initializing', user: null}, {status: 'unavailable', user: null},
      {status: 'unauthenticated', user: null},
      {status: 'authenticated', user: {uid: 'guest', isAnonymous: true} as User},
    ] as AuthState[]) {
      authState.next(state);
      service.setEnabled(false);
      service.setEnabled(true);
      expect(service.enabled()).toBeTrue();
      expect(service.visitorDisabled()).toBeFalse();
    }
    expect(write).not.toHaveBeenCalled();
    expect(values.size).toBe(0);
  });

  it('closes the lantern on account loss, restores the public design, and retains device-local account bypass', () => {
    const service = createService();
    service.setContext('/');
    service.collect('ember-toffee');
    service.openLantern();
    authState.next({status: 'unauthenticated', user: null});
    expect(service.panelOpen()).toBeFalse();
    expect(service.announcement()).toBe('');
    expect(service.count()).toBe(1);
    authState.next({status: 'authenticated', user: registeredUser});
    service.setEnabled(false);
    const storedPreference = values.get(SEASONAL_PREFERENCE_STORAGE_KEY);
    expect(service.visitorDisabled()).toBeTrue();
    authState.next({status: 'unavailable', user: null});
    expect(service.visitorDisabled()).toBeFalse();
    expect(service.enabled()).toBeTrue();
    expect(service.count()).toBe(1);
    expect(values.get(SEASONAL_PREFERENCE_STORAGE_KEY)).toBe(storedPreference);
    authState.next({status: 'authenticated', user: {...registeredUser, uid: 'another-registered-reader'} as User});
    expect(service.visitorDisabled()).toBeTrue();
    expect(service.enabled()).toBeFalse();
    expect(service.count()).toBe(1);
  });

  it('retains cross-tab bypass updates for accounts while guests continue to see the public design', () => {
    authState.next({status: 'unauthenticated', user: null});
    const service = createService();
    service.setContext('/archive/seasons/scary-christmas-2026');
    remoteUpdate(SEASONAL_PREFERENCE_STORAGE_KEY, JSON.stringify({version: 1, editionId: null, disabled: true}));
    remoteUpdate(halloweenKey, JSON.stringify({version: 1, enabled: false, collectedIds: ['ember-toffee']}));
    expect(service.enabled()).toBeTrue();
    expect(service.visitorDisabled()).toBeFalse();
    expect(service.count()).toBe(1);
    authState.next({status: 'authenticated', user: registeredUser});
    expect(service.enabled()).toBeFalse();
    expect(service.visitorDisabled()).toBeTrue();
    service.setEnabled(true);
    expect(service.enabled()).toBeTrue();
    expect(service.count()).toBe(1);
  });

  it('re-evaluates activation on minute ticks and visible return, and releases its timer and listeners', () => {
    const ownerConfig = {...manualConfig};
    const service = createService(ownerConfig);
    service.setContext('/');
    service.collect('ember-toffee');
    service.openLantern();
    const tick = setInterval.calls.mostRecent().args[0] as () => void;
    expect(setInterval.calls.mostRecent().args[1]).toBe(60_000);
    const onVisibility = documentAddListener.calls.mostRecent().args[1] as () => void;
    expect(documentAddListener.calls.mostRecent().args[0]).toBe('visibilitychange');
    ownerConfig.manualEditionId = 'thanksgiving-2026';
    tick();
    expect(service.edition()?.id).toBe('thanksgiving-2026');
    expect(service.panelOpen()).toBeFalse();
    ownerConfig.manualEditionId = 'christmas-2026';
    visibilityState = 'hidden';
    tick();
    onVisibility();
    expect(service.edition()?.id).toBe('thanksgiving-2026');
    visibilityState = 'visible';
    onVisibility();
    expect(service.edition()?.id).toBe('christmas-2026');
    TestBed.resetTestingModule();
    expect(clearInterval).toHaveBeenCalledOnceWith(37);
    expect(documentRemoveListener).toHaveBeenCalledOnceWith('visibilitychange', onVisibility);
  });

  it('restores existing Halloween progress without migrating its key or schema', () => {
    values.set(halloweenKey, JSON.stringify({version: 1, enabled: true, collectedIds: ['ember-toffee', 'moonlit-mint']}));
    const service = createService();
    service.setContext('/');
    expect(service.edition()?.id).toBe('scary-christmas-2026');
    expect(service.count()).toBe(2);
    expect(service.total()).toBe(8);
    expect(service.archiveMode()).toBeFalse();
    service.setContext('/blog');
    service.collect('paper-phantom');
    expect(JSON.parse(values.get(halloweenKey)!)).toEqual({
      version: 1, enabled: true, collectedIds: ['ember-toffee', 'moonlit-mint', 'paper-phantom'],
    });
    expect(values.size).toBe(1);
  });

  it('shares live and archive progress but isolates each edition while switching', () => {
    const service = createService();
    service.setContext('/');
    service.collect('ember-toffee');
    service.openLantern();
    service.setContext('/archive/seasons/thanksgiving-2026');
    expect(service.panelOpen()).toBeFalse();
    expect(service.announcement()).toBe('');
    expect(service.count()).toBe(0);
    expect(service.collect('ember-toffee')).toBeFalse();
    expect(service.collect(harvestId)).toBeFalse();
    remoteUpdate(harvestKey, JSON.stringify({version: 1, enabled: true, collectedIds: [harvestId]}));
    service.setContext('/archive/seasons/scary-christmas-2026');
    expect(service.count()).toBe(1);
    expect(service.isCollected('ember-toffee')).toBeTrue();
    expect(service.collect(harvestId)).toBeFalse();
    service.setContext('/blog');
    expect(service.count()).toBe(1);
    expect(service.archiveMode()).toBeFalse();
    expect(service.count()).toBe(1);
    service.setContext('/archive/seasons/thanksgiving-2026');
    expect(service.collectedIds()).toEqual([harvestId]);
  });

  it('collects only unique known active items and never persists routes, content, or account data', () => {
    const service = createService({...manualConfig, manualEditionId: 'kwanzaa-2026'});
    service.setContext('/');
    expect(service.total()).toBe(7);
    expect(service.collect('unknown')).toBeFalse();
    for (const item of service.items()) {
      service.setContext(item.route);
      expect(service.collect(item.id)).toBeTrue();
      expect(service.collect(item.id)).toBeFalse();
    }
    expect(service.count()).toBe(7);
    expect(service.complete()).toBeTrue();
    expect(service.announcement()).toContain('All 7 tokens found');
    expect(Object.isFrozen(service.collectedIds())).toBeTrue();
    expect(Object.keys(JSON.parse(values.get('cm.kwanzaa-2026.v1')!)).sort()).toEqual(['collectedIds', 'enabled', 'version']);
  });

  it('isolates recurring yearly collections even when principle item identifiers are reused', () => {
    const config = {...manualConfig, manualEditionId: 'kwanzaa-2026'};
    const service = createService(config);
    service.setContext('/');
    const oldItem = service.items()[0].id;
    expect(service.collect(oldItem)).toBeTrue();
    config.manualEditionId = 'kwanzaa-2027';
    service.setContext('/');
    expect(service.count()).toBe(0);
    expect(service.collect(service.items()[0].id)).toBeTrue();
    service.resetHunt();
    expect(service.count()).toBe(0);
    service.setContext('/archive/seasons/kwanzaa-2026');
    expect(service.collectedIds()).toEqual([oldItem]);
    expect(JSON.parse(values.get('cm.kwanzaa-2027.v1')!).collectedIds).toEqual([]);
    expect(JSON.parse(values.get('cm.kwanzaa-2026.v1')!).collectedIds).toEqual([oldItem]);
  });

  it('removes main decorations under each master-off configuration while keeping archives usable', () => {
    for (const config of [{...SEASONAL_CONFIG, enabled: false}, {...SEASONAL_CONFIG, mode: 'off' as const}]) {
      TestBed.resetTestingModule();
      const service = createService(config);
      service.setContext('/');
      expect(service.edition()).toBeNull();
      expect(service.enabled()).toBeFalse();
      expect(service.complete()).toBeFalse();
      expect(service.collect('ember-toffee')).toBeFalse();
      service.setContext('/archive/seasons/thanksgiving-2026');
      expect(service.archiveMode()).toBeTrue();
      expect(service.enabled()).toBeTrue();
      expect(service.collect(harvestId)).toBeFalse();
      expect(service.count()).toBe(0);
      values.clear();
    }
  });

  it('applies normal-design opt-out globally, closes disabled lanterns, and preserves each collection', () => {
    const service = createService();
    service.setContext('/');
    service.collect('ember-toffee');
    service.openLantern();
    service.setEnabled(false);
    service.openLantern();
    expect(service.panelOpen()).toBeFalse();
    expect(service.collect('moonlit-mint')).toBeFalse();
    expect(service.itemsFor('/', 'footer')).toEqual([]);
    service.setContext('/archive/seasons/thanksgiving-2026');
    expect(service.enabled()).toBeFalse();
    expect(service.visitorDisabled()).toBeTrue();
    service.setEnabled(true);
    expect(service.collect(harvestId)).toBeFalse();
    remoteUpdate(harvestKey, JSON.stringify({version: 1, enabled: true, collectedIds: [harvestId]}));
    service.setEnabled(false);
    service.setContext('/archive/seasons/scary-christmas-2026');
    expect(service.enabled()).toBeFalse();
    expect(service.count()).toBe(1);
    service.setEnabled(true);
    expect(service.enabled()).toBeTrue();
    service.setContext('/archive/seasons/thanksgiving-2026');
    expect(service.collectedIds()).toEqual([harvestId]);
    expect(JSON.parse(values.get(halloweenKey)!).enabled).toBeTrue();
    expect(JSON.parse(values.get(SEASONAL_PREFERENCE_STORAGE_KEY)!)).toEqual({version: 1, editionId: null, disabled: false});
  });

  it('keeps the calendar inactive outside its window and ignores a legacy visitor edition without touching progress', () => {
    jasmine.clock().install().mockDate(new Date('2026-09-30T12:00:00Z'));
    values.set(SEASONAL_PREFERENCE_STORAGE_KEY, JSON.stringify({version: 1, editionId: 'thanksgiving-2026', disabled: false}));
    values.set(harvestKey, JSON.stringify({version: 1, enabled: true, collectedIds: [harvestId]}));
    const originalProgress = values.get(harvestKey);
    const service = createService(SEASONAL_CONFIG);
    for (const url of ['/', '/blog', '/topics/gadgets-toys', '/authors']) {
      service.setContext(url);
      expect(service.edition()).withContext(url).toBeNull();
      expect(service.enabled()).toBeFalse();
      expect(service.collect(harvestId)).toBeFalse();
    }
    expect(values.get(harvestKey)).toBe(originalProgress);
    service.setContext('/archive/seasons/thanksgiving-2026');
    expect(service.edition()?.id).toBe('thanksgiving-2026');
    expect(service.count()).toBe(1);
    expect(service.enabled()).toBeTrue();
  });

  it('retains legacy global bypass while discarding its edition selection and preserving independent archives', () => {
    values.set(SEASONAL_PREFERENCE_STORAGE_KEY, JSON.stringify({version: 1, editionId: 'thanksgiving-2026', disabled: true}));
    values.set(harvestKey, JSON.stringify({version: 1, enabled: true, collectedIds: [harvestId]}));
    values.set(halloweenKey, JSON.stringify({version: 1, enabled: true, collectedIds: ['ember-toffee']}));
    const service = createService();
    service.setContext('/');
    expect(service.edition()?.id).toBe('scary-christmas-2026');
    expect(service.count()).toBe(1);
    expect(service.enabled()).toBeFalse();
    expect(service.visitorDisabled()).toBeTrue();
    service.setContext('/archive/seasons/thanksgiving-2026');
    expect(service.count()).toBe(1);
    expect(service.enabled()).toBeFalse();
    service.setEnabled(true);
    expect(JSON.parse(values.get(SEASONAL_PREFERENCE_STORAGE_KEY)!)).toEqual({version: 1, editionId: null, disabled: false});
    service.setContext('/topics/gadgets-toys');
    expect(service.edition()?.id).toBe('scary-christmas-2026');
    expect(service.count()).toBe(1);
    expect(service.enabled()).toBeTrue();
  });

  it('normal-design restoration cannot create a main edition when the configured calendar is inactive', () => {
    jasmine.clock().install().mockDate(new Date('2026-09-30T12:00:00Z'));
    values.set(SEASONAL_PREFERENCE_STORAGE_KEY, JSON.stringify({version: 1, editionId: 'christmas-2026', disabled: true}));
    const service = createService(SEASONAL_CONFIG);
    service.setContext('/blog');
    expect(service.visitorDisabled()).toBeTrue();
    service.setEnabled(true);
    expect(service.visitorDisabled()).toBeFalse();
    expect(service.edition()).toBeNull();
    expect(service.enabled()).toBeFalse();
    expect(JSON.parse(values.get(SEASONAL_PREFERENCE_STORAGE_KEY)!)).toEqual({version: 1, editionId: null, disabled: false});
  });

  it('allows global normal-design choice from the archive index and retains it on later reading routes', () => {
    const service = createService();
    service.setContext('/archive/seasons/?from=footer#top');
    expect(service.edition()).toBeNull();
    service.setEnabled(false);
    expect(service.visitorDisabled()).toBeTrue();
    expect(JSON.parse(values.get(SEASONAL_PREFERENCE_STORAGE_KEY)!).disabled).toBeTrue();
    service.setContext('/blog');
    expect(service.edition()?.id).toBe('scary-christmas-2026');
    expect(service.enabled()).toBeFalse();
    service.setContext('/archive/seasons');
    service.setEnabled(true);
    expect(service.visitorDisabled()).toBeFalse();
    service.setContext('/blog');
    expect(service.enabled()).toBeTrue();
  });

  it('keeps archive URLs authoritative and master-off main routes unavailable despite legacy visitor preferences', () => {
    for (const config of [{...manualConfig, enabled: false}, {...manualConfig, mode: 'off' as const}]) {
      TestBed.resetTestingModule();
      values.set(SEASONAL_PREFERENCE_STORAGE_KEY, JSON.stringify({version: 1, editionId: 'thanksgiving-2026', disabled: false}));
      const service = createService(config);
      service.setContext('/');
      service.setEnabled(true);
      expect(service.edition()).toBeNull();
      expect(service.enabled()).toBeFalse();
      service.setContext('/archive/seasons/hanukkah-2026');
      expect(service.edition()?.id).toBe('hanukkah-2026');
      expect(service.enabled()).toBeTrue();
      service.setEnabled(false);
      expect(service.enabled()).toBeFalse();
      expect(JSON.parse(values.get(SEASONAL_PREFERENCE_STORAGE_KEY)!)).toEqual({version: 1, editionId: null, disabled: true});
      values.clear();
    }
  });

  it('restores legacy edition opt-outs deliberately without resetting collected items', () => {
    values.set(halloweenKey, JSON.stringify({version: 1, enabled: false, collectedIds: ['ember-toffee']}));
    values.set(harvestKey, JSON.stringify({version: 1, enabled: false, collectedIds: [harvestId]}));
    const service = createService();
    service.setContext('/');
    expect(service.enabled()).toBeFalse();
    service.setEnabled(true);
    expect(service.enabled()).toBeTrue();
    expect(service.count()).toBe(1);
    service.setContext('/archive/seasons/thanksgiving-2026');
    expect(service.enabled()).toBeFalse();
    service.setEnabled(true);
    expect(service.enabled()).toBeTrue();
    expect(service.count()).toBe(1);
    expect(JSON.parse(values.get(harvestKey)!).enabled).toBeTrue();
    expect(JSON.parse(values.get(halloweenKey)!).collectedIds).toEqual(['ember-toffee']);
  });

  it('ignores malformed, unknown, oversized, and incompatible visitor preferences', () => {
    const invalid = ['broken', 'null', '[]', ' '.repeat(513),
      JSON.stringify({version: 2, editionId: null, disabled: true}),
      JSON.stringify({version: 1, editionId: 'unknown', disabled: true}),
      JSON.stringify({version: 1, editionId: 3, disabled: false}),
      JSON.stringify({version: 1, editionId: null, disabled: 'true'}),
      JSON.stringify({version: 1, disabled: true})];
    for (const raw of invalid) {
      TestBed.resetTestingModule();
      values.set(SEASONAL_PREFERENCE_STORAGE_KEY, raw);
      const service = createService();
      service.setContext('/');
      expect(service.visitorDisabled()).toBeFalse();
      expect(service.enabled()).toBeTrue();
      expect(service.edition()?.id).toBe('scary-christmas-2026');
    }
  });

  it('keeps archive progress and global bypass usable in memory when persistence is denied', () => {
    spyOn(storage, 'getItem').and.throwError('Read denied');
    spyOn(storage, 'setItem').and.throwError('Write denied');
    const config = {...manualConfig};
    const service = createService(config);
    service.setContext('/');
    service.collect('ember-toffee');
    config.manualEditionId = 'thanksgiving-2026';
    service.setContext('/');
    expect(service.collect(harvestId)).toBeTrue();
    service.setEnabled(false);
    service.setContext('/archive/seasons/scary-christmas-2026');
    expect(service.count()).toBe(1);
    expect(service.enabled()).toBeFalse();
    service.setEnabled(true);
    service.setContext('/archive/seasons/thanksgiving-2026');
    expect(service.edition()?.id).toBe('thanksgiving-2026');
    expect(service.count()).toBe(1);
    expect(service.enabled()).toBeTrue();
    expect(service.persistenceAvailable()).toBeFalse();
    expect(values.size).toBe(0);
  });

  it('ignores legacy cross-tab edition choices while synchronizing bypass, deletion, and storage clear', () => {
    const service = createService();
    service.setContext('/');
    service.collect('ember-toffee');
    service.openLantern();
    const selected = JSON.stringify({version: 1, editionId: 'thanksgiving-2026', disabled: true});
    remoteUpdate(SEASONAL_PREFERENCE_STORAGE_KEY, selected, {} as Storage);
    expect(service.visitorDisabled()).toBeFalse();
    remoteUpdate(SEASONAL_PREFERENCE_STORAGE_KEY, selected);
    expect(service.edition()?.id).toBe('scary-christmas-2026');
    expect(service.visitorDisabled()).toBeTrue();
    expect(service.enabled()).toBeFalse();
    expect(service.panelOpen()).toBeFalse();
    remoteUpdate(SEASONAL_PREFERENCE_STORAGE_KEY, 'malformed');
    expect(service.visitorDisabled()).toBeTrue();
    remoteUpdate(SEASONAL_PREFERENCE_STORAGE_KEY, null);
    expect(service.visitorDisabled()).toBeFalse();
    expect(service.edition()?.id).toBe('scary-christmas-2026');
    expect(service.count()).toBe(1);
    service.setContext('/archive/seasons/thanksgiving-2026');
    remoteUpdate(harvestKey, JSON.stringify({version: 1, enabled: true, collectedIds: [harvestId]}));
    expect(service.count()).toBe(1);
    service.openLantern();
    values.clear();
    remoteUpdate(null, null);
    expect(service.edition()?.id).toBe('thanksgiving-2026');
    expect(service.visitorDisabled()).toBeFalse();
    expect(service.count()).toBe(0);
    expect(service.panelOpen()).toBeFalse();
  });

  it('offers exact public placements and no collectible actions on archive pages', () => {
    const service = createService();
    service.setContext('/');
    expect(service.itemsFor('/?campaign=october#top', 'banner').map(item => item.id)).toEqual(['ember-toffee']);
    expect(service.itemsFor('/blog/', 'footer').map(item => item.id)).toEqual(['midnight-caramel']);
    expect(service.itemsFor('/admin', 'footer')).toEqual([]);
    expect(service.itemsFor('/blog/preview/token', 'trail')).toEqual([]);
    service.setContext('/archive/seasons/thanksgiving-2026');
    expect(service.itemsFor('/archive/seasons/thanksgiving-2026/#find-thanksgiving-1', 'trail')).toEqual([]);
    expect(service.itemsFor('/archive/seasons/thanksgiving-2026', 'banner')).toEqual([]);
    expect(service.itemsFor('/archive/seasons/christmas-2026', 'trail')).toEqual([]);
    expect(service.itemsFor('/', 'banner')).toEqual([]);
    expect(service.collect(harvestId)).toBeFalse();
    expect(service.itemsFor('/archive/seasons/thanksgiving-2026', 'footer')).toEqual([]);
  });

  it('rejects archive and wrong-route collection requests without writing progress or announcements', () => {
    const service = createService();
    const write = spyOn(storage, 'setItem').and.callThrough();
    service.setContext('/');
    expect(service.collect('paper-phantom')).toBeFalse();
    expect(service.count()).toBe(0);
    expect(service.announcement()).toBe('');
    expect(write).not.toHaveBeenCalled();
    expect(service.collect('ember-toffee')).toBeTrue();
    const stored = values.get(halloweenKey);
    write.calls.reset();
    for (const url of ['/archive/seasons/scary-christmas-2026', '/archive/seasons/scary-christmas-2026/?from=footer#seasonal-item-moonlit-mint']) {
      service.setContext(url);
      for (const item of service.items()) expect(service.collect(item.id)).toBeFalse();
      expect(service.count()).toBe(1);
      expect(service.announcement()).toBe('');
      expect(values.get(halloweenKey)).toBe(stored);
    }
    expect(write).not.toHaveBeenCalled();
    service.setContext('/blog');
    expect(service.collect('paper-phantom')).toBeTrue();
    expect(service.collectedIds()).toEqual(['ember-toffee', 'paper-phantom']);
  });

  it('never selects a fallback or writes a key on index, unknown archive, or private routes', () => {
    const service = createService();
    for (const url of ['/archive/seasons', '/archive/seasons/unknown', '/admin', '/login', '/profile', '/os', '/blog/preview/token']) {
      service.setContext(url);
      service.setEnabled(true);
      expect(service.edition()).withContext(url).toBeNull();
      expect(service.enabled()).toBeFalse();
      expect(service.collect('ember-toffee')).toBeFalse();
      expect(service.complete()).toBeFalse();
    }
    expect(values.size).toBe(0);
  });

  it('resets only the current edition and retains other editions and unrelated preferences', () => {
    values.set('unrelated.preference', 'keep');
    const service = createService();
    service.setContext('/');
    service.collect('ember-toffee');
    service.setContext('/archive/seasons/thanksgiving-2026');
    remoteUpdate(harvestKey, JSON.stringify({version: 1, enabled: true, collectedIds: [harvestId]}));
    service.setEnabled(false);
    service.resetHunt();
    expect(service.count()).toBe(0);
    expect(service.enabled()).toBeFalse();
    expect(service.announcement()).toBe('');
    service.setContext('/');
    expect(service.count()).toBe(1);
    expect(values.get('unrelated.preference')).toBe('keep');
  });

  it('deduplicates stored IDs and rejects unknown or foreign-edition IDs with a strict cap', () => {
    const ids = getSeasonalEdition('thanksgiving-2026')!.items.map(item => item.id);
    values.set(harvestKey, JSON.stringify({version: 1, enabled: false,
      collectedIds: ['unknown', 'ember-toffee', 42, null, ...ids, ...ids], privateUrl: '/private',
    }));
    const service = createService();
    service.setContext('/archive/seasons/thanksgiving-2026');
    expect(service.collectedIds()).toEqual(ids);
    expect(service.count()).toBe(8);
    expect(service.enabled()).toBeFalse();
    service.setEnabled(true);
    expect(JSON.parse(values.get(harvestKey)!)).toEqual({version: 1, enabled: true, collectedIds: ids});
  });

  it('ignores malformed, oversized, or incompatible stored states', () => {
    for (const raw of ['broken', 'null', '[]', JSON.stringify({version: 2, enabled: false, collectedIds: []}),
      JSON.stringify({version: 1, enabled: 'false', collectedIds: []}),
      JSON.stringify({version: 1, enabled: false, collectedIds: {id: 'ember-toffee'}}), ' '.repeat(4097)]) {
      TestBed.resetTestingModule();
      values.set(halloweenKey, raw);
      const service = createService();
      service.setContext('/');
      expect(service.count()).toBe(0);
      expect(service.enabled()).toBeTrue();
      expect(service.persistenceAvailable()).toBeTrue();
    }
  });

  it('keeps all edition progress in memory when the storage getter is denied', () => {
    Object.defineProperty(browserWindow, 'localStorage', {get: () => { throw new Error('Denied'); }});
    const config = {...manualConfig};
    const service = createService(config);
    service.setContext('/');
    service.collect('ember-toffee');
    config.manualEditionId = 'thanksgiving-2026';
    service.setContext('/');
    service.collect(harvestId);
    config.manualEditionId = 'scary-christmas-2026';
    service.setContext('/');
    expect(service.count()).toBe(1);
    expect(service.persistenceAvailable()).toBeFalse();
  });

  it('survives denied reads, failed writes, and server-side rendering', () => {
    spyOn(storage, 'getItem').and.throwError('Read denied');
    spyOn(storage, 'setItem').and.throwError('Quota exceeded');
    const service = createService();
    service.setContext('/');
    expect(service.persistenceAvailable()).toBeFalse();
    expect(service.collect('ember-toffee')).toBeTrue();
    expect(service.count()).toBe(1);
    service.resetHunt();
    expect(service.count()).toBe(0);
    TestBed.resetTestingModule();
    const serverService = createService(SEASONAL_CONFIG, null);
    serverService.setContext('/archive/seasons/new-year-2027');
    expect(serverService.collect(serverService.items()[0].id)).toBeFalse();
    expect(serverService.count()).toBe(0);
    expect(serverService.persistenceAvailable()).toBeFalse();
  });

  it('synchronizes known edition keys, including inactive editions, and cleans up its listener', () => {
    const service = createService();
    service.setContext('/');
    service.collect('ember-toffee');
    remoteUpdate(harvestKey, JSON.stringify({version: 1, enabled: false, collectedIds: [harvestId]}));
    expect(service.collectedIds()).toEqual(['ember-toffee']);
    service.setContext('/archive/seasons/thanksgiving-2026');
    expect(service.collectedIds()).toEqual([harvestId]);
    expect(service.enabled()).toBeFalse();
    remoteUpdate(harvestKey, 'malformed');
    remoteUpdate('cm.unknown.v1', JSON.stringify({version: 1, enabled: true, collectedIds: []}));
    expect(service.count()).toBe(1);
    remoteUpdate(harvestKey, null);
    expect(service.count()).toBe(0);
    expect(service.enabled()).toBeTrue();
    service.setContext('/');
    expect(service.count()).toBe(1);
    remoteUpdate(null, null);
    expect(service.count()).toBe(0);
    const listener = addListener.calls.mostRecent().args[1];
    TestBed.resetTestingModule();
    expect(removeListener).toHaveBeenCalledOnceWith('storage', listener);
  });

  it('ignores another storage area and honors active cross-tab opt-outs', () => {
    const service = createService();
    service.setContext('/');
    service.openLantern();
    const remote = JSON.stringify({version: 1, enabled: false, collectedIds: ['ember-toffee']});
    remoteUpdate(halloweenKey, remote, {} as Storage);
    expect(service.enabled()).toBeTrue();
    remoteUpdate(seasonalStorageKey('scary-christmas-2026'), remote);
    expect(service.enabled()).toBeFalse();
    expect(service.panelOpen()).toBeFalse();
    expect(service.count()).toBe(1);
  });
});
