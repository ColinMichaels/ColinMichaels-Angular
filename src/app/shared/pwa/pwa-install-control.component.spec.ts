import {signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {PwaInstallControlComponent} from './pwa-install-control.component';
import {PwaInstallService} from './pwa-install.service';

describe('PwaInstallControlComponent', () => {
  let fixture: ComponentFixture<PwaInstallControlComponent>;
  let manualInstructionsVisible: ReturnType<typeof signal<boolean>>;
  let install: jasmine.Spy;

  beforeEach(async () => {
    manualInstructionsVisible = signal(false);
    install = jasmine.createSpy('install').and.callFake(async () => {
      manualInstructionsVisible.set(true);
      return 'manual' as const;
    });

    await TestBed.configureTestingModule({
      imports: [PwaInstallControlComponent],
      providers: [
        {
          provide: PwaInstallService,
          useValue: {
            shouldOfferInstall: signal(true),
            canPrompt: signal(false),
            manualInstructionsVisible,
            install,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PwaInstallControlComponent);
    fixture.detectChanges();
  });

  it('opens manual installation guidance when no native prompt is available', async () => {
    const element = fixture.nativeElement as HTMLElement;
    const installButton = element.querySelector<HTMLButtonElement>('button');

    expect(installButton?.textContent).toContain('Install app');
    installButton?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(install).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Add to Home Screen');
  });
});
