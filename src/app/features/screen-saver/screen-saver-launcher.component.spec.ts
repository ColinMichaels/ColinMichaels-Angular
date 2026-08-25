import {signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {DEFAULT_HOMEPAGE_HERO_SETTINGS} from '../homepage/homepage-hero.defaults';
import {HomepageHeroRepositoryService} from '../homepage/services/homepage-hero-repository.service';
import {ScreenSaverLauncherComponent} from './screen-saver-launcher.component';
import {ScreenSaverLocalMediaService} from './screen-saver-local-media.service';
import {ScreenSaverModuleId} from './screen-saver.model';
import {ScreenSaverPreferencesService} from './screen-saver-preferences.service';

async function waitForScreenSaver(fixture: ComponentFixture<ScreenSaverLauncherComponent>): Promise<HTMLElement> {
  const deadline = Date.now() + 2_000;

  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 10));
    fixture.detectChanges();

    const screenSaver = document.querySelector<HTMLElement>('.screen-saver');
    if (screenSaver) {
      return screenSaver;
    }
  }

  throw new Error('The lazy screen saver did not mount');
}

describe('ScreenSaverLauncherComponent', () => {
  let fixture: ComponentFixture<ScreenSaverLauncherComponent>;
  let moduleId: ReturnType<typeof signal<ScreenSaverModuleId>>;

  beforeEach(async () => {
    moduleId = signal<ScreenSaverModuleId>('hero');

    await TestBed.configureTestingModule({
      imports: [ScreenSaverLauncherComponent],
      providers: [
        {
          provide: HomepageHeroRepositoryService,
          useValue: {settings: signal(DEFAULT_HOMEPAGE_HERO_SETTINGS)},
        },
        {
          provide: ScreenSaverPreferencesService,
          useValue: {
            moduleId,
            kenBurnsEnabled: signal(true),
            kenBurnsSpeed: signal(1),
            slideshowIntervalSeconds: signal(8),
            setModule: (value: ScreenSaverModuleId) => moduleId.set(value),
            setKenBurnsEnabled: jasmine.createSpy('setKenBurnsEnabled'),
            setKenBurnsSpeed: jasmine.createSpy('setKenBurnsSpeed'),
            setSlideshowIntervalSeconds: jasmine.createSpy('setSlideshowIntervalSeconds'),
          },
        },
        {
          provide: ScreenSaverLocalMediaService,
          useValue: {
            images: signal([]),
            activeImages: signal([]),
            supported: signal(true),
            busy: signal(false),
            error: signal<string | null>(null),
            addFiles: jasmine.createSpy('addFiles').and.resolveTo(0),
            setActiveWindow: jasmine.createSpy('setActiveWindow').and.resolveTo(),
            releaseActiveImages: jasmine.createSpy('releaseActiveImages'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScreenSaverLauncherComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    document.body.style.overflow = '';
  });

  it('does not mount the viewer until the first S shortcut', async () => {
    expect(document.querySelector('app-screen-saver')).toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', bubbles: true}));
    const screenSaver = await waitForScreenSaver(fixture);

    expect(screenSaver.classList.contains('is-active')).toBeTrue();
    expect(document.querySelectorAll('app-screen-saver').length).toBe(1);

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', bubbles: true}));
    fixture.detectChanges();

    expect(screenSaver.classList.contains('is-active')).toBeFalse();
    expect(document.querySelectorAll('app-screen-saver').length).toBe(1);
  });

  it('does not load the viewer for S typed into a form control', async () => {
    const input = document.createElement('input');
    fixture.nativeElement.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 's', bubbles: true}));
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(document.querySelector('app-screen-saver')).toBeNull();
  });
});
