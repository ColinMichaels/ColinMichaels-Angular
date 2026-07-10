import {TestBed} from '@angular/core/testing';

import {PwaInstallService} from './pwa-install.service';

describe('PwaInstallService', () => {
  let service: PwaInstallService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PwaInstallService);
  });

  it('captures and uses the browser install prompt', async () => {
    const prompt = jasmine.createSpy('prompt').and.resolveTo();
    const installEvent = new Event('beforeinstallprompt', {cancelable: true});

    Object.defineProperties(installEvent, {
      prompt: {value: prompt},
      userChoice: {value: Promise.resolve({outcome: 'accepted', platform: 'web'})},
    });

    window.dispatchEvent(installEvent);

    expect(service.canPrompt()).toBeTrue();
    await expectAsync(service.install()).toBeResolvedTo('accepted');
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(service.canPrompt()).toBeFalse();
  });

  it('shows manual guidance when the browser has no programmatic prompt', async () => {
    expect(service.manualInstructionsVisible()).toBeFalse();

    await expectAsync(service.install()).toBeResolvedTo('manual');

    expect(service.manualInstructionsVisible()).toBeTrue();
    service.dismissManualInstructions();
    expect(service.manualInstructionsVisible()).toBeFalse();
  });

  it('stops offering installation after appinstalled fires', () => {
    window.dispatchEvent(new Event('appinstalled'));

    expect(service.isStandalone()).toBeTrue();
    expect(service.shouldOfferInstall()).toBeFalse();
  });
});
