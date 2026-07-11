import {TestBed} from '@angular/core/testing';

import {
  SCREEN_SAVER_PREFERENCES_STORAGE_KEY,
  ScreenSaverPreferencesService,
} from './screen-saver-preferences.service';

describe('ScreenSaverPreferencesService', () => {
  beforeEach(() => {
    window.localStorage.removeItem(SCREEN_SAVER_PREFERENCES_STORAGE_KEY);
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    window.localStorage.removeItem(SCREEN_SAVER_PREFERENCES_STORAGE_KEY);
  });

  it('persists module and tuning choices locally', () => {
    const service = TestBed.inject(ScreenSaverPreferencesService);

    service.setModule('local');
    service.setKenBurnsEnabled(false);
    service.setKenBurnsSpeed(5);
    service.setSlideshowIntervalSeconds(12);

    expect(JSON.parse(window.localStorage.getItem(SCREEN_SAVER_PREFERENCES_STORAGE_KEY) ?? '{}')).toEqual({
      moduleId: 'local',
      kenBurnsEnabled: false,
      kenBurnsSpeed: 5,
      slideshowIntervalSeconds: 12,
    });
  });

  it('clamps stored tuning values to supported ranges', () => {
    const service = TestBed.inject(ScreenSaverPreferencesService);

    service.setKenBurnsSpeed(99);
    service.setSlideshowIntervalSeconds(1);

    expect(service.kenBurnsSpeed()).toBe(5);
    expect(service.slideshowIntervalSeconds()).toBe(4);
  });
});
