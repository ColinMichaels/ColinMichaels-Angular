import {TestBed} from '@angular/core/testing';

import {PwaStorageService} from './pwa-storage.service';

describe('PwaStorageService', () => {
  const originalStorageDescriptor = Object.getOwnPropertyDescriptor(navigator, 'storage');

  afterEach(() => {
    TestBed.resetTestingModule();

    if (originalStorageDescriptor) {
      Object.defineProperty(navigator, 'storage', originalStorageDescriptor);
    } else {
      Reflect.deleteProperty(navigator, 'storage');
    }
  });

  it('reports origin storage use and persistent-storage state', async () => {
    const storage = {
      estimate: jasmine.createSpy('estimate').and.resolveTo({usage: 12_582_912, quota: 1_073_741_824}),
      persisted: jasmine.createSpy('persisted').and.resolveTo(false),
      persist: jasmine.createSpy('persist').and.resolveTo(false),
    };
    Object.defineProperty(navigator, 'storage', {configurable: true, value: storage});

    const service = TestBed.inject(PwaStorageService);
    await service.refresh();

    expect(service.available()).toBeTrue();
    expect(service.usage()).toBe(12_582_912);
    expect(service.quota()).toBe(1_073_741_824);
    expect(service.persisted()).toBeFalse();
  });

  it('requests protection for offline origin storage from a user action', async () => {
    const storage = {
      estimate: jasmine.createSpy('estimate').and.resolveTo({usage: 1024, quota: 2048}),
      persisted: jasmine.createSpy('persisted').and.resolveTo(true),
      persist: jasmine.createSpy('persist').and.resolveTo(true),
    };
    Object.defineProperty(navigator, 'storage', {configurable: true, value: storage});

    const service = TestBed.inject(PwaStorageService);

    await expectAsync(service.requestPersistence()).toBeResolvedTo(true);
    expect(storage.persist).toHaveBeenCalledTimes(1);
    expect(service.persisted()).toBeTrue();
    expect(service.statusMessage()).toContain('protected');
    expect(service.busy()).toBeFalse();
  });
});
