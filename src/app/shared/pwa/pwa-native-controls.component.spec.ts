import {WritableSignal, signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {PwaInstallService} from './pwa-install.service';
import {PwaNativeControlsComponent} from './pwa-native-controls.component';
import {PwaNativeControlsService} from './pwa-native-controls.service';
import {PwaPushService} from './pwa-push.service';
import {PwaStorageService} from './pwa-storage.service';

describe('PwaNativeControlsComponent', () => {
  let fixture: ComponentFixture<PwaNativeControlsComponent>;
  let nativeElement: HTMLElement;
  let shareCurrentPage: jasmine.Spy;
  let toggleFullscreen: jasmine.Spy;
  let toggleWakeLock: jasmine.Spy;
  let requestPersistence: jasmine.Spy;
  let toggleSubscription: jasmine.Spy;
  let nativeError: WritableSignal<string | null>;
  let storageStatusMessage: WritableSignal<string | null>;

  beforeEach(async () => {
    shareCurrentPage = jasmine.createSpy('shareCurrentPage').and.resolveTo('shared');
    toggleFullscreen = jasmine.createSpy('toggleFullscreen').and.resolveTo(true);
    toggleWakeLock = jasmine.createSpy('toggleWakeLock').and.resolveTo(true);
    requestPersistence = jasmine.createSpy('requestPersistence').and.resolveTo(true);
    toggleSubscription = jasmine.createSpy('toggleSubscription').and.resolveTo(true);
    nativeError = signal(null);
    storageStatusMessage = signal(null);

    await TestBed.configureTestingModule({
      imports: [PwaNativeControlsComponent],
      providers: [
        {
          provide: PwaInstallService,
          useValue: {isStandalone: signal(true)},
        },
        {
          provide: PwaNativeControlsService,
          useValue: {
            shareSupported: signal(true),
            fullscreenSupported: signal(true),
            wakeLockSupported: signal(true),
            fullscreen: signal(false),
            keepAwakeRequested: signal(false),
            error: nativeError,
            available: signal(true),
            shareCurrentPage,
            toggleFullscreen,
            toggleWakeLock,
          },
        },
        {
          provide: PwaPushService,
          useValue: {
            available: signal(true),
            signedIn: signal(true),
            subscribed: signal(false),
            permission: signal('default'),
            busy: signal(false),
            statusMessage: signal(null),
            toggleSubscription,
          },
        },
        {
          provide: PwaStorageService,
          useValue: {
            available: signal(true),
            persistenceSupported: signal(true),
            persisted: signal(false),
            busy: signal(false),
            usage: signal(12_582_912),
            quota: signal(1_073_741_824),
            statusMessage: storageStatusMessage,
            requestPersistence,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PwaNativeControlsComponent);
    nativeElement = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('renders compact controls only for the available native capabilities', () => {
    expect(nativeElement.textContent).toContain('Installed');
    expect(nativeElement.textContent).toContain('Share page');
    expect(nativeElement.textContent).toContain('Full screen');
    expect(nativeElement.textContent).toContain('Keep awake');
    expect(nativeElement.textContent).toContain('Protect storage');
    expect(nativeElement.textContent).toContain('Enable new-post alerts');
    expect(nativeElement.textContent).toContain('12 MB of 1 GB used');
  });

  it('routes each control through its progressive browser adapter', () => {
    clickButton('Share page');
    clickButton('Full screen');
    clickButton('Keep awake');
    clickButton('Protect storage');
    clickButton('Enable new-post alerts');

    expect(shareCurrentPage).toHaveBeenCalledTimes(1);
    expect(toggleFullscreen).toHaveBeenCalledTimes(1);
    expect(toggleWakeLock).toHaveBeenCalledTimes(1);
    expect(requestPersistence).toHaveBeenCalledTimes(1);
    expect(toggleSubscription).toHaveBeenCalledTimes(1);
  });

  it('shows storage feedback even when another native control has an error', () => {
    nativeError.set('Full screen is unavailable.');
    storageStatusMessage.set('The browser will manage offline storage.');
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain('Full screen is unavailable.');
    expect(nativeElement.textContent).toContain('The browser will manage offline storage.');
  });

  function clickButton(label: string): void {
    const button = Array.from(nativeElement.querySelectorAll('button'))
      .find(candidate => candidate.textContent?.includes(label));
    button?.click();
  }
});
