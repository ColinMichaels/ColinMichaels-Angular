import {signal} from '@angular/core';
import {ComponentFixture, TestBed, fakeAsync, tick} from '@angular/core/testing';

import {DEFAULT_HOMEPAGE_HERO_SETTINGS} from '../homepage/homepage-hero.defaults';
import {HomepageHeroSettings} from '../homepage/models/homepage-hero.model';
import {HomepageHeroRepositoryService} from '../homepage/services/homepage-hero-repository.service';
import {ScreenSaverLocalMediaService} from './screen-saver-local-media.service';
import {
  ScreenSaverActiveLocalImage,
  ScreenSaverLocalImage,
  ScreenSaverModuleId,
} from './screen-saver.model';
import {ScreenSaverPreferencesService} from './screen-saver-preferences.service';
import {
  SCREEN_SAVER_CONTROLS_IDLE_MS,
  ScreenSaverComponent,
} from './screen-saver.component';

function createSettings(): HomepageHeroSettings {
  return {
    ...DEFAULT_HOMEPAGE_HERO_SETTINGS,
    intervalMs: 3500,
    transitionMs: 900,
    slides: [
      {
        ...DEFAULT_HOMEPAGE_HERO_SETTINGS.slides[0],
        id: 'hero-one',
        imageUrl: '/assets/images/backgrounds/colinmichaels-hero-background.webp',
        sortOrder: 10,
      },
      {
        ...DEFAULT_HOMEPAGE_HERO_SETTINGS.slides[0],
        id: 'hero-two',
        imageUrl: '/assets/images/backgrounds/colinmichaels-hero-background.webp',
        sortOrder: 20,
      },
    ],
  };
}

describe('ScreenSaverComponent', () => {
  const originalMatchMedia = window.matchMedia;
  let fixture: ComponentFixture<ScreenSaverComponent>;
  let moduleId: ReturnType<typeof signal<ScreenSaverModuleId>>;
  let kenBurnsEnabled: ReturnType<typeof signal<boolean>>;
  let kenBurnsSpeed: ReturnType<typeof signal<number>>;
  let slideshowIntervalSeconds: ReturnType<typeof signal<number>>;
  let localImages: ReturnType<typeof signal<readonly ScreenSaverLocalImage[]>>;
  let activeLocalImages: ReturnType<typeof signal<readonly ScreenSaverActiveLocalImage[]>>;
  let addFiles: jasmine.Spy;
  let setActiveWindow: jasmine.Spy;
  let releaseActiveImages: jasmine.Spy;

  beforeEach(async () => {
    spyOnProperty(document, 'visibilityState', 'get').and.returnValue('visible');
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
    moduleId = signal<ScreenSaverModuleId>('hero');
    kenBurnsEnabled = signal(true);
    kenBurnsSpeed = signal(2);
    slideshowIntervalSeconds = signal(8);
    localImages = signal<readonly ScreenSaverLocalImage[]>([]);
    activeLocalImages = signal<readonly ScreenSaverActiveLocalImage[]>([]);
    addFiles = jasmine.createSpy('addFiles').and.resolveTo(0);
    setActiveWindow = jasmine.createSpy('setActiveWindow').and.resolveTo();
    releaseActiveImages = jasmine.createSpy('releaseActiveImages').and.callFake(() => {
      activeLocalImages.set([]);
    });

    await TestBed.configureTestingModule({
      imports: [ScreenSaverComponent],
      providers: [
        {
          provide: HomepageHeroRepositoryService,
          useValue: {settings: signal(createSettings())},
        },
        {
          provide: ScreenSaverPreferencesService,
          useValue: {
            moduleId,
            kenBurnsEnabled,
            kenBurnsSpeed,
            slideshowIntervalSeconds,
            setModule: (value: ScreenSaverModuleId) => moduleId.set(value),
            setKenBurnsEnabled: (value: boolean) => kenBurnsEnabled.set(value),
            setKenBurnsSpeed: (value: number) => kenBurnsSpeed.set(value),
            setSlideshowIntervalSeconds: (value: number) => slideshowIntervalSeconds.set(value),
          },
        },
        {
          provide: ScreenSaverLocalMediaService,
          useValue: {
            images: localImages,
            activeImages: activeLocalImages,
            supported: signal(true),
            busy: signal(false),
            error: signal<string | null>(null),
            addFiles,
            setActiveWindow,
            releaseActiveImages,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScreenSaverComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    document.body.style.overflow = '';
    window.matchMedia = originalMatchMedia;
  });

  it('toggles the full-screen viewer with the S key', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', bubbles: true}));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const overlay = element.querySelector<HTMLElement>('.screen-saver');
    expect(overlay?.classList.contains('is-active')).toBeTrue();
    expect(document.body.style.overflow).toBe('hidden');
    expect(fixture.nativeElement.querySelectorAll('.screen-saver-image').length).toBe(2);
    releaseActiveImages.calls.reset();

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'S', bubbles: true}));
    fixture.detectChanges();

    expect(overlay?.classList.contains('is-active')).toBeFalse();
    expect(document.body.style.overflow).toBe('');
    expect(fixture.nativeElement.querySelectorAll('.screen-saver-image').length).toBe(0);
    expect(releaseActiveImages).toHaveBeenCalled();
  });

  it('does not intercept S while the user is typing', () => {
    const input = document.createElement('input');
    fixture.nativeElement.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 's', bubbles: true}));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.screen-saver')?.classList.contains('is-active')).toBeFalse();
  });

  it('cycles through the published hero images while active', fakeAsync(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', bubbles: true}));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const images = element.querySelectorAll<HTMLImageElement>('.screen-saver-image');
    expect(images[0].classList.contains('is-active')).toBeTrue();

    tick(8000);
    fixture.detectChanges();

    expect(images[0].classList.contains('is-active')).toBeFalse();
    expect(images[1].classList.contains('is-active')).toBeTrue();
  }));

  it('closes an active viewer with Escape', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', bubbles: true}));
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.screen-saver')?.classList.contains('is-active')).toBeFalse();
  });

  it('closes from the visible Exit control', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', bubbles: true}));
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.screen-saver-close')?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.screen-saver')?.classList.contains('is-active')).toBeFalse();
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps the viewer active and hides controls after two seconds of mouse inactivity', fakeAsync(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', bubbles: true}));
    fixture.detectChanges();
    tick(16);

    const element = fixture.nativeElement as HTMLElement;
    const screenSaver = element.querySelector<HTMLElement>('.screen-saver');
    const exitHint = element.querySelector<HTMLElement>('.screen-saver-exit-hint');
    expect(screenSaver?.classList.contains('is-ui-visible')).toBeTrue();

    document.dispatchEvent(new MouseEvent('mousemove', {bubbles: true}));
    fixture.detectChanges();
    expect(screenSaver?.classList.contains('is-active')).toBeTrue();
    expect(screenSaver?.classList.contains('is-ui-visible')).toBeTrue();
    expect(exitHint?.classList.contains('is-visible')).toBeTrue();

    tick(SCREEN_SAVER_CONTROLS_IDLE_MS - 1);
    fixture.detectChanges();
    expect(screenSaver?.classList.contains('is-ui-visible')).toBeTrue();

    tick(1);
    fixture.detectChanges();
    expect(screenSaver?.classList.contains('is-active')).toBeTrue();
    expect(screenSaver?.classList.contains('is-ui-visible')).toBeFalse();
    expect(exitHint?.classList.contains('is-visible')).toBeFalse();
    expect(document.body.style.overflow).toBe('hidden');
  }));

  it('suppresses the exit hint while the pointer moves over controls', fakeAsync(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', bubbles: true}));
    fixture.detectChanges();
    tick(16);

    document.dispatchEvent(new MouseEvent('mousemove', {bubbles: true}));
    fixture.detectChanges();
    const exitHint = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('.screen-saver-exit-hint');
    expect(exitHint?.classList.contains('is-visible')).toBeTrue();

    const toolbar = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.screen-saver-toolbar');
    toolbar?.dispatchEvent(new MouseEvent('mousemove', {bubbles: true}));
    fixture.detectChanges();

    expect(exitHint?.classList.contains('is-visible')).toBeFalse();
    expect(fixture.nativeElement.querySelector('.screen-saver')?.classList.contains('is-active')).toBeTrue();
    tick(SCREEN_SAVER_CONTROLS_IDLE_MS);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.screen-saver')?.classList.contains('is-ui-visible')).toBeFalse();
    expect(fixture.nativeElement.querySelector('.screen-saver')?.classList.contains('is-active')).toBeTrue();
  }));

  it('recognizes the toolbar position while controls are hidden', fakeAsync(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', bubbles: true}));
    fixture.detectChanges();
    tick(16 + SCREEN_SAVER_CONTROLS_IDLE_MS);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const toolbar = element.querySelector<HTMLElement>('.screen-saver-toolbar');
    if (!toolbar) {
      throw new Error('Expected the screen saver toolbar to render.');
    }

    spyOn(toolbar, 'getBoundingClientRect').and.returnValue({
      bottom: 200,
      height: 100,
      left: 100,
      right: 300,
      top: 100,
      width: 200,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    });

    document.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 200,
      clientY: 150,
    }));
    fixture.detectChanges();

    expect(element.querySelector('.screen-saver')?.classList.contains('is-ui-visible')).toBeTrue();
    expect(element.querySelector('.screen-saver-exit-hint')?.classList.contains('is-visible')).toBeFalse();
  }));

  it('applies live Ken Burns and slideshow speed preferences', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', bubbles: true}));
    fixture.detectChanges();

    const ranges = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('input[type="range"]');
    ranges[0].value = '5';
    ranges[0].dispatchEvent(new Event('input', {bubbles: true}));
    ranges[1].value = '12';
    ranges[1].dispatchEvent(new Event('input', {bubbles: true}));
    fixture.detectChanges();

    const activeImage = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('.screen-saver-image.is-active');
    expect(kenBurnsSpeed()).toBe(5);
    expect(slideshowIntervalSeconds()).toBe(12);
    expect(activeImage?.style.getPropertyValue('--screen-saver-drift-duration')).toBe('10s');
    expect(activeImage?.classList.contains('has-ken-burns')).toBeTrue();
    expect(activeImage?.getAttribute('data-motion-path')).toBe('drift-east');
    expect((fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLElement>('.screen-saver-image')[1]
      .getAttribute('data-motion-path')).toBe('drift-west');
  });

  it('stops pan and zoom while the viewer is closed', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', bubbles: true}));
    fixture.detectChanges();

    const activeImage = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('.screen-saver-image.is-active');
    expect(activeImage?.classList.contains('has-ken-burns')).toBeTrue();

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', bubbles: true}));
    fixture.detectChanges();

    expect(activeImage?.isConnected).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.screen-saver-image').length).toBe(0);
  });

  it('renders only the current and adjacent slides for a larger hero set', () => {
    const settings = createSettings();
    const heroRepository = TestBed.inject(HomepageHeroRepositoryService);
    const heroSettings = heroRepository.settings as ReturnType<typeof signal<HomepageHeroSettings>>;
    heroSettings.set({
      ...settings,
      slides: Array.from({length: 8}, (_, index) => ({
        ...settings.slides[0],
        id: `hero-${index}`,
        sortOrder: index,
      })),
    });

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', bubbles: true}));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.screen-saver-image').length).toBe(3);
  });

  it('switches to My Images after a successful local upload', async () => {
    const localImage: ScreenSaverLocalImage = {
      id: 'local-trail',
      name: 'trail.png',
      addedAt: '2026-07-10T00:00:00.000Z',
      size: 4,
    };
    addFiles.and.callFake(async () => {
      localImages.set([localImage]);
      activeLocalImages.set([{...localImage, imageUrl: 'blob:local-trail', sourceIndex: 0}]);
      return 1;
    });
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', bubbles: true}));
    fixture.detectChanges();

    const fileInput = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('.file-input');

    if (!fileInput) {
      throw new Error('Expected the local image file input to render.');
    }

    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array([137, 80, 78, 71])], 'trail.png', {type: 'image/png'}));
    Object.defineProperty(fileInput, 'files', {value: transfer.files});
    fileInput.dispatchEvent(new Event('change', {bubbles: true}));
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(addFiles).toHaveBeenCalled();
    expect(moduleId()).toBe('local');
    expect(fixture.nativeElement.querySelector('.module-button.is-selected')?.textContent).toContain('My Images');
    expect(fixture.nativeElement.querySelector('.screen-saver-image.is-active')?.getAttribute('src'))
      .toBe('blob:local-trail');
  });
});
