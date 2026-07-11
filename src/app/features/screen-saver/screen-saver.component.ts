import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import {DEFAULT_HOMEPAGE_HERO_SETTINGS} from '../homepage/homepage-hero.defaults';
import {HomepageHeroRepositoryService} from '../homepage/services/homepage-hero-repository.service';
import {getPublishedHomepageHeroSlides} from '../homepage/utils/homepage-hero-validation.util';
import {ScreenSaverControlsComponent} from './screen-saver-controls.component';
import {ScreenSaverLocalMediaService} from './screen-saver-local-media.service';
import {
  SCREEN_SAVER_KEN_BURNS_DURATION_SECONDS,
  ScreenSaverDisplaySlide,
  ScreenSaverModuleId,
} from './screen-saver.model';
import {ScreenSaverPreferencesService} from './screen-saver-preferences.service';

const MINIMUM_SCREEN_SAVER_TRANSITION_MS = 1200;
export const SCREEN_SAVER_WAKE_ARM_DELAY_MS = 1500;

@Component({
  selector: 'app-screen-saver',
  imports: [ScreenSaverControlsComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="screen-saver"
      [class.is-active]="isActive()"
      [attr.aria-hidden]="isActive() ? null : 'true'"
      [attr.inert]="isActive() ? null : ''"
      role="dialog"
      aria-modal="true"
      aria-label="Full-screen hero image viewer"
      aria-keyshortcuts="S Escape"
    >
      @if (hasOpened()) {
        <div class="screen-saver-stage" aria-hidden="true">
          @for (slide of slides(); track slide.id; let slideIndex = $index) {
            <img
              [src]="slide.imageUrl"
              alt=""
              class="screen-saver-image"
              [class.is-active]="slideIndex === activeSlideIndex()"
              [class.has-ken-burns]="kenBurnsEnabled()"
              [style.object-position]="slideObjectPosition(slide)"
              [style.transform-origin]="slideObjectPosition(slide)"
              [style.--screen-saver-transition-duration]="transitionDuration()"
              [style.--screen-saver-drift-duration]="driftDuration()"
              decoding="async"
            >
          }
        </div>
      }

      <div class="screen-saver-chrome">
        <div class="screen-saver-status" aria-hidden="true">
          <span class="screen-saver-status-mark"></span>
          <span>Screen saver</span>
          @if (slides().length > 1) {
            <span class="screen-saver-counter">
              {{ displaySlideNumber() }} / {{ slides().length.toString().padStart(2, '0') }}
            </span>
          }
        </div>

        <button
          type="button"
          class="screen-saver-close"
          aria-label="Close screen saver"
          title="Close screen saver (S)"
          (click)="close()"
        >
          <span class="screen-saver-key" aria-hidden="true">S</span>
          <span>Exit</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6 6 18"></path>
          </svg>
        </button>
      </div>

      <app-screen-saver-controls
        class="screen-saver-toolbar"
        [moduleId]="moduleId()"
        [localImageCount]="localImages().length"
        [kenBurnsEnabled]="kenBurnsEnabled()"
        [kenBurnsSpeed]="kenBurnsSpeed()"
        [slideshowIntervalSeconds]="slideshowIntervalSeconds()"
        [localStorageSupported]="localStorageSupported()"
        [localStorageBusy]="localStorageBusy()"
        [localStorageError]="localStorageError()"
        (moduleSelected)="selectModule($event)"
        (kenBurnsToggled)="setKenBurnsEnabled($event)"
        (kenBurnsSpeedChanged)="setKenBurnsSpeed($event)"
        (slideshowIntervalChanged)="setSlideshowInterval($event)"
        (filesSelected)="addLocalImages($event)"
      />
    </section>
  `,
  styles: [`
    :host {
      display: contents;
    }

    .screen-saver {
      position: fixed;
      inset: 0;
      z-index: 2147483000;
      overflow: hidden;
      background: #020204;
      color: #fff;
      opacity: 0;
      pointer-events: none;
      visibility: hidden;
      transition:
        opacity 520ms cubic-bezier(0.22, 1, 0.36, 1),
        visibility 0s linear 520ms;
    }

    .screen-saver.is-active {
      opacity: 1;
      pointer-events: auto;
      visibility: visible;
      transition-delay: 0s;
    }

    .screen-saver-stage,
    .screen-saver-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    .screen-saver-stage {
      overflow: hidden;
      background: #020204;
    }

    .screen-saver-image {
      object-fit: cover;
      opacity: 0;
      transform: scale(1) translate3d(0, 0, 0);
      transition:
        opacity var(--screen-saver-transition-duration, 1200ms) cubic-bezier(0.4, 0, 0.2, 1),
        transform var(--screen-saver-drift-duration, 8000ms) linear;
      will-change: opacity, transform;
    }

    .screen-saver-image.is-active {
      z-index: 1;
      opacity: 1;
    }

    .screen-saver-image.has-ken-burns {
      transform: scale(1.025) translate3d(0, 0, 0);
    }

    .screen-saver-image.is-active.has-ken-burns {
      transform: scale(1.085) translate3d(0, 0, 0);
    }

    .screen-saver-chrome {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right))
        max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
      pointer-events: none;
    }

    .screen-saver-toolbar {
      position: absolute;
      left: 50%;
      bottom: max(1.5rem, env(safe-area-inset-bottom));
      z-index: 3;
      transform: translateX(-50%);
    }

    .screen-saver-status,
    .screen-saver-close {
      min-height: 2.75rem;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 999px;
      background: rgba(4, 5, 9, 0.58);
      box-shadow: 0 12px 34px rgba(0, 0, 0, 0.22);
      color: rgba(255, 255, 255, 0.92);
      font: 600 0.75rem/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      backdrop-filter: blur(16px) saturate(1.2);
      -webkit-backdrop-filter: blur(16px) saturate(1.2);
    }

    .screen-saver-status {
      display: inline-flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.5rem 0.9rem;
    }

    .screen-saver-status-mark {
      width: 0.45rem;
      height: 0.45rem;
      border-radius: 50%;
      background: #67e8f9;
      box-shadow: 0 0 0.8rem rgba(103, 232, 249, 0.72);
    }

    .screen-saver-counter {
      padding-left: 0.65rem;
      border-left: 1px solid rgba(255, 255, 255, 0.18);
      color: rgba(255, 255, 255, 0.6);
      font-variant-numeric: tabular-nums;
    }

    .screen-saver-close {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.4rem 0.55rem 0.4rem 0.5rem;
      cursor: pointer;
      pointer-events: auto;
      transition:
        border-color 180ms ease,
        background 180ms ease,
        transform 180ms ease;
    }

    .screen-saver-close:hover,
    .screen-saver-close:focus-visible {
      border-color: rgba(255, 255, 255, 0.42);
      background: rgba(4, 5, 9, 0.78);
      transform: translateY(-1px);
    }

    .screen-saver-close:focus-visible {
      outline: 2px solid #67e8f9;
      outline-offset: 3px;
    }

    .screen-saver-key {
      display: grid;
      width: 1.8rem;
      height: 1.8rem;
      place-items: center;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      font-size: 0.68rem;
    }

    .screen-saver-close svg {
      width: 1.15rem;
      height: 1.15rem;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-width: 1.7;
    }

    @media (max-width: 640px) {
      .screen-saver-status > span:not(.screen-saver-status-mark) {
        display: none;
      }

      .screen-saver-status {
        width: 2.75rem;
        justify-content: center;
        padding-inline: 0;
      }

      .screen-saver-close > span:not(.screen-saver-key) {
        display: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .screen-saver,
      .screen-saver-image,
      .screen-saver-close {
        transition: none;
      }

      .screen-saver-image,
      .screen-saver-image.is-active,
      .screen-saver-image.has-ken-burns,
      .screen-saver-image.is-active.has-ken-burns {
        transform: none;
      }
    }
  `],
})
export class ScreenSaverComponent {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly homepageHeroRepository = inject(HomepageHeroRepositoryService);
  private readonly localMedia = inject(ScreenSaverLocalMediaService);
  private readonly preferences = inject(ScreenSaverPreferencesService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly pageVisible = signal(true);
  private readonly reducedMotion = signal(false);
  private focusBeforeOpen: HTMLElement | null = null;
  private mouseWakeArmedAt = Number.POSITIVE_INFINITY;

  protected readonly isActive = signal(false);
  protected readonly hasOpened = signal(false);
  protected readonly activeSlideIndex = signal(0);
  protected readonly localImages = this.localMedia.images;
  protected readonly moduleId = computed<ScreenSaverModuleId>(() => {
    return this.preferences.moduleId() === 'local' && this.localImages().length > 0 ? 'local' : 'hero';
  });
  protected readonly kenBurnsEnabled = this.preferences.kenBurnsEnabled;
  protected readonly kenBurnsSpeed = this.preferences.kenBurnsSpeed;
  protected readonly slideshowIntervalSeconds = this.preferences.slideshowIntervalSeconds;
  protected readonly localStorageSupported = this.localMedia.supported;
  protected readonly localStorageBusy = this.localMedia.busy;
  protected readonly localStorageError = this.localMedia.error;
  protected readonly settings = computed(() => {
    const settings = this.homepageHeroRepository.settings();

    return settings.status === 'published' ? settings : DEFAULT_HOMEPAGE_HERO_SETTINGS;
  });
  private readonly heroSlides = computed<readonly ScreenSaverDisplaySlide[]>(() => {
    const slides = getPublishedHomepageHeroSlides(this.settings());
    const resolvedSlides = slides.length > 0
      ? slides
      : getPublishedHomepageHeroSlides(DEFAULT_HOMEPAGE_HERO_SETTINGS);

    return resolvedSlides.map(slide => ({
      id: slide.id,
      imageUrl: slide.imageUrl,
      focalPointX: slide.focalPointX,
      focalPointY: slide.focalPointY,
    }));
  });
  protected readonly slides = computed<readonly ScreenSaverDisplaySlide[]>(() => {
    const localImages = this.localImages();

    if (this.moduleId() === 'local' && localImages.length > 0) {
      return localImages.map(image => ({
        id: image.id,
        imageUrl: image.imageUrl,
        focalPointX: 50,
        focalPointY: 50,
      }));
    }

    return this.heroSlides();
  });
  protected readonly transitionMs = computed(() => {
    return Math.max(this.settings().transitionMs, MINIMUM_SCREEN_SAVER_TRANSITION_MS);
  });
  protected readonly transitionDuration = computed(() => `${this.transitionMs()}ms`);
  protected readonly driftDuration = computed(() => {
    return `${SCREEN_SAVER_KEN_BURNS_DURATION_SECONDS[this.kenBurnsSpeed()] ?? 16}s`;
  });
  protected readonly displaySlideNumber = computed(() => {
    return (this.activeSlideIndex() + 1).toString().padStart(2, '0');
  });
  private readonly shouldRotate = computed(() => {
    return this.isActive()
      && this.slides().length > 1
      && this.pageVisible()
      && !this.reducedMotion();
  });

  constructor() {
    this.initializeBrowserState();
    this.keepActiveSlideInBounds();
    this.startSlideRotation();
    this.lockPageScrollWhileActive();
  }

  @HostListener('document:keydown', ['$event'])
  protected handleKeyboardShortcut(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (event.key.toLowerCase() === 's' && !this.isTypingTarget(event.target)) {
      event.preventDefault();
      this.toggle();
      return;
    }

    if (event.key === 'Escape' && this.isActive()) {
      event.preventDefault();
      this.close();
    }
  }

  @HostListener('document:mousemove', ['$event'])
  protected handleMouseMove(event: MouseEvent): void {
    if (this.isStudioToolbarTarget(event.target)
      || !this.isActive()
      || Date.now() < this.mouseWakeArmedAt) {
      return;
    }

    this.close();
  }

  public activate(): void {
    if (!this.isActive()) {
      this.open();
    }
  }

  protected close(): void {
    if (!this.isActive()) {
      return;
    }

    this.isActive.set(false);
    this.mouseWakeArmedAt = Number.POSITIVE_INFINITY;
    this.restoreFocus();
  }

  protected slideObjectPosition(slide: ScreenSaverDisplaySlide): string {
    return `${slide.focalPointX}% ${slide.focalPointY}%`;
  }

  protected selectModule(moduleId: ScreenSaverModuleId): void {
    if (moduleId === 'local' && this.localImages().length === 0) {
      return;
    }

    this.preferences.setModule(moduleId);
    this.activeSlideIndex.set(0);
  }

  protected setKenBurnsEnabled(enabled: boolean): void {
    this.preferences.setKenBurnsEnabled(enabled);
  }

  protected setKenBurnsSpeed(speed: number): void {
    this.preferences.setKenBurnsSpeed(speed);
  }

  protected setSlideshowInterval(seconds: number): void {
    this.preferences.setSlideshowIntervalSeconds(seconds);
  }

  protected async addLocalImages(files: readonly File[]): Promise<void> {
    const addedCount = await this.localMedia.addFiles(files);

    if (addedCount > 0) {
      this.preferences.setModule('local');
      this.activeSlideIndex.set(0);
    }
  }

  private toggle(): void {
    if (this.isActive()) {
      this.close();
      return;
    }

    this.open();
  }

  private open(): void {
    if (!this.isBrowser) {
      return;
    }

    this.focusBeforeOpen = this.document.activeElement instanceof HTMLElement
      ? this.document.activeElement
      : null;
    this.hasOpened.set(true);
    this.activeSlideIndex.set(0);
    this.mouseWakeArmedAt = Date.now() + SCREEN_SAVER_WAKE_ARM_DELAY_MS;
    this.isActive.set(true);

    window.requestAnimationFrame(() => {
      this.document.querySelector<HTMLButtonElement>('.screen-saver-close')?.focus({preventScroll: true});
    });
  }

  private restoreFocus(): void {
    if (!this.isBrowser || !this.focusBeforeOpen?.isConnected) {
      this.focusBeforeOpen = null;
      return;
    }

    this.focusBeforeOpen.focus({preventScroll: true});
    this.focusBeforeOpen = null;
  }

  private initializeBrowserState(): void {
    if (!this.isBrowser) {
      return;
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => this.reducedMotion.set(motionQuery.matches);
    const updatePageVisibility = () => this.pageVisible.set(this.document.visibilityState !== 'hidden');

    updateMotionPreference();
    updatePageVisibility();
    motionQuery.addEventListener('change', updateMotionPreference);
    this.document.addEventListener('visibilitychange', updatePageVisibility);
    this.destroyRef.onDestroy(() => {
      motionQuery.removeEventListener('change', updateMotionPreference);
      this.document.removeEventListener('visibilitychange', updatePageVisibility);
    });
  }

  private keepActiveSlideInBounds(): void {
    effect(() => {
      const slideCount = this.slides().length;

      if (slideCount === 0 || this.activeSlideIndex() >= slideCount) {
        this.activeSlideIndex.set(0);
      }
    });
  }

  private startSlideRotation(): void {
    effect(onCleanup => {
      if (!this.isBrowser || !this.shouldRotate()) {
        return;
      }

      const intervalId = window.setInterval(() => {
        this.activeSlideIndex.update(index => (index + 1) % this.slides().length);
      }, this.slideshowIntervalSeconds() * 1000);

      onCleanup(() => window.clearInterval(intervalId));
    });
  }

  private lockPageScrollWhileActive(): void {
    effect(onCleanup => {
      if (!this.isBrowser || !this.isActive()) {
        return;
      }

      const previousOverflow = this.document.body.style.overflow;
      this.document.body.style.overflow = 'hidden';
      onCleanup(() => {
        this.document.body.style.overflow = previousOverflow;
      });
    });
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;

    if (!element) {
      return false;
    }

    return element.tagName === 'INPUT'
      || element.tagName === 'TEXTAREA'
      || element.tagName === 'SELECT'
      || element.isContentEditable;
  }

  private isStudioToolbarTarget(target: EventTarget | null): boolean {
    return target instanceof Element && Boolean(target.closest('.screen-saver-toolbar'));
  }
}
