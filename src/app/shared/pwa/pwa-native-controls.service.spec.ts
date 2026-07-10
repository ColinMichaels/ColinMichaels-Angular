import {TestBed} from '@angular/core/testing';

import {PwaNativeControlsService} from './pwa-native-controls.service';

describe('PwaNativeControlsService', () => {
  const originalShareDescriptor = Object.getOwnPropertyDescriptor(navigator, 'share');
  const originalWakeLockDescriptor = Object.getOwnPropertyDescriptor(navigator, 'wakeLock');

  afterEach(() => {
    TestBed.resetTestingModule();
    restoreNavigatorProperty('share', originalShareDescriptor);
    restoreNavigatorProperty('wakeLock', originalWakeLockDescriptor);
  });

  it('shares the current page through the operating system share sheet', async () => {
    const share = jasmine.createSpy('share').and.resolveTo();
    Object.defineProperty(navigator, 'share', {configurable: true, value: share});

    const service = TestBed.inject(PwaNativeControlsService);

    expect(service.shareSupported()).toBeTrue();
    await expectAsync(service.shareCurrentPage()).toBeResolvedTo('shared');
    expect(share).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      title: document.title,
      url: jasmine.any(String),
    }));
  });

  it('treats closing the system share sheet as a normal dismissal', async () => {
    const share = jasmine.createSpy('share').and.rejectWith(new DOMException('Dismissed', 'AbortError'));
    Object.defineProperty(navigator, 'share', {configurable: true, value: share});

    const service = TestBed.inject(PwaNativeControlsService);

    await expectAsync(service.shareCurrentPage()).toBeResolvedTo('dismissed');
    expect(service.error()).toBeNull();
  });

  it('acquires and releases a screen wake lock from a user toggle', async () => {
    let released = false;
    const sentinel = new EventTarget() as WakeLockSentinel;
    const release = jasmine.createSpy('release').and.callFake(async () => {
      released = true;
      sentinel.dispatchEvent(new Event('release'));
    });
    Object.defineProperties(sentinel, {
      released: {configurable: true, get: () => released},
      release: {configurable: true, value: release},
    });
    const request = jasmine.createSpy('request').and.resolveTo(sentinel);
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {request},
    });

    const service = TestBed.inject(PwaNativeControlsService);

    await expectAsync(service.toggleWakeLock()).toBeResolvedTo(true);
    expect(request).toHaveBeenCalledOnceWith('screen');
    expect(service.keepAwakeRequested()).toBeTrue();
    expect(service.wakeLockActive()).toBeTrue();

    await expectAsync(service.toggleWakeLock()).toBeResolvedTo(true);
    expect(release).toHaveBeenCalledTimes(1);
    expect(service.keepAwakeRequested()).toBeFalse();
    expect(service.wakeLockActive()).toBeFalse();
  });

  function restoreNavigatorProperty(
    property: 'share' | 'wakeLock',
    descriptor: PropertyDescriptor | undefined
  ): void {
    if (descriptor) {
      Object.defineProperty(navigator, property, descriptor);
    } else {
      Reflect.deleteProperty(navigator, property);
    }
  }
});
