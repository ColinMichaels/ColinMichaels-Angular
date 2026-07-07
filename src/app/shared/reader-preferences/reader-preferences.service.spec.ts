import {DOCUMENT} from '@angular/common';
import {TestBed} from '@angular/core/testing';

import {ReaderPreferencesService} from './reader-preferences.service';

const READER_STORAGE_KEY = 'colinmichaels-reader-preferences-v1';

describe('ReaderPreferencesService', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.localStorage.removeItem(READER_STORAGE_KEY);
    document.documentElement.classList.remove(
      'reader-font-100',
      'reader-font-112',
      'reader-font-125',
      'reader-font-150',
      'reader-font-175',
      'reader-font-200',
      'reader-spacing-normal',
      'reader-spacing-comfortable',
      'reader-spacing-open',
      'reader-contrast-high',
      'reader-motion-reduce',
    );
    window.matchMedia = jasmine.createSpy('matchMedia').and.returnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: jasmine.createSpy('addEventListener'),
      removeEventListener: jasmine.createSpy('removeEventListener'),
      addListener: jasmine.createSpy('addListener'),
      removeListener: jasmine.createSpy('removeListener'),
      dispatchEvent: jasmine.createSpy('dispatchEvent'),
    });

    TestBed.configureTestingModule({
      providers: [
        ReaderPreferencesService,
        {provide: DOCUMENT, useValue: document},
      ],
    });
  });

  afterEach(() => {
    window.localStorage.removeItem(READER_STORAGE_KEY);
    window.matchMedia = originalMatchMedia;
    TestBed.resetTestingModule();
  });

  it('applies default reader classes on startup', () => {
    const service = TestBed.inject(ReaderPreferencesService);

    expect(service.preferences()).toEqual({
      fontScale: 100,
      spacing: 'normal',
      highContrast: false,
      reduceMotion: false,
    });
    expect(document.documentElement.classList.contains('reader-font-100')).toBeTrue();
    expect(document.documentElement.classList.contains('reader-spacing-normal')).toBeTrue();
  });

  it('persists changed preferences and applies matching root classes', () => {
    const service = TestBed.inject(ReaderPreferencesService);

    service.increaseFontScale();
    service.cycleSpacing();
    service.toggleHighContrast();
    service.toggleReducedMotion();

    expect(service.preferences()).toEqual({
      fontScale: 112,
      spacing: 'comfortable',
      highContrast: true,
      reduceMotion: true,
    });
    expect(document.documentElement.classList.contains('reader-font-112')).toBeTrue();
    expect(document.documentElement.classList.contains('reader-spacing-comfortable')).toBeTrue();
    expect(document.documentElement.classList.contains('reader-contrast-high')).toBeTrue();
    expect(document.documentElement.classList.contains('reader-motion-reduce')).toBeTrue();
    expect(JSON.parse(window.localStorage.getItem(READER_STORAGE_KEY) ?? '{}')).toEqual(service.preferences());
  });

  it('restores saved preferences when available', () => {
    window.localStorage.setItem(READER_STORAGE_KEY, JSON.stringify({
      fontScale: 150,
      spacing: 'open',
      highContrast: true,
      reduceMotion: true,
    }));

    const service = TestBed.inject(ReaderPreferencesService);

    expect(service.preferences().fontScale).toBe(150);
    expect(service.preferences().spacing).toBe('open');
    expect(document.documentElement.classList.contains('reader-font-150')).toBeTrue();
    expect(document.documentElement.classList.contains('reader-spacing-open')).toBeTrue();
  });

  it('clears stored preferences on reset', () => {
    const service = TestBed.inject(ReaderPreferencesService);

    service.increaseFontScale();
    service.toggleHighContrast();
    service.reset();

    expect(service.preferences()).toEqual({
      fontScale: 100,
      spacing: 'normal',
      highContrast: false,
      reduceMotion: false,
    });
    expect(window.localStorage.getItem(READER_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.classList.contains('reader-contrast-high')).toBeFalse();
  });
});
