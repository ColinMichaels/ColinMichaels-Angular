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
const SCREEN_SAVER_MOTION_PATHS = ['drift-east', 'drift-west', 'rise', 'fall'] as const;
export const SCREEN_SAVER_CONTROLS_IDLE_MS = 2000;

@Component({
  selector: 'app-screen-saver',
  imports: [ScreenSaverControlsComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="screen-saver"
      [class.is-active]="isActive()"
      [class.is-ui-visible]="controlsVisible()"
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
              [class.has-ken-burns]="isActive() && kenBurnsEnabled()"
              [attr.data-motion-path]="motionPath(slideIndex)"
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

      <div
        class="screen-saver-exit-hint"
        [class.is-visible]="controlsVisible() && showPointerHint()"
        aria-hidden="true"
      >
        <span>Press</span>
        <kbd>S</kbd>
        <span>or</span>
        <kbd>Esc</kbd>
        <span>to exit</span>
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
      --screen-saver-pan-start-x: 0%;
      --screen-saver-pan-start-y: 0%;
      --screen-saver-pan-end-x: 0%;
      --screen-saver-pan-end-y: 0%;
      --screen-saver-zoom-start: 1.07;
      --screen-saver-zoom-end: 1.17;
      object-fit: cover;
      opacity: 0;
      transform: scale(1) translate3d(0, 0, 0);
      transition:
        opacity var(--screen-saver-transition-duration, 1200ms) cubic-bezier(0.4, 0, 0.2, 1),
        transform 480ms cubic-bezier(0.22, 1, 0.36, 1);
      will-change: opacity;
    }

    .screen-saver-image.is-active {
      z-index: 1;
      opacity: 1;
    }

    .screen-saver.is-active .screen-saver-image {
      will-change: opacity, transform;
    }

    .screen-saver-image.is-active.has-ken-burns {
      animation: screen-saver-pan-and-zoom var(--screen-saver-drift-duration, 16s)
        cubic-bezier(0.37, 0, 0.2, 1) both;
    }

    .screen-saver-image[data-motion-path="drift-east"] {
      --screen-saver-pan-start-x: -1.2%;
      --screen-saver-pan-start-y: 0.7%;
      --screen-saver-pan-end-x: 1.4%;
      --screen-saver-pan-end-y: -0.8%;
      --screen-saver-zoom-start: 1.07;
      --screen-saver-zoom-end: 1.17;
    }

    .screen-saver-image[data-motion-path="drift-west"] {
      --screen-saver-pan-start-x: 1.4%;
      --screen-saver-pan-start-y: -0.5%;
      --screen-saver-pan-end-x: -1.2%;
      --screen-saver-pan-end-y: 0.8%;
      --screen-saver-zoom-start: 1.18;
      --screen-saver-zoom-end: 1.07;
    }

    .screen-saver-image[data-motion-path="rise"] {
      --screen-saver-pan-start-x: 0.5%;
      --screen-saver-pan-start-y: 1.4%;
      --screen-saver-pan-end-x: -0.7%;
      --screen-saver-pan-end-y: -1.3%;
      --screen-saver-zoom-start: 1.08;
      --screen-saver-zoom-end: 1.18;
    }

    .screen-saver-image[data-motion-path="fall"] {
      --screen-saver-pan-start-x: -0.8%;
      --screen-saver-pan-start-y: -1.1%;
      --screen-saver-pan-end-x: 0.9%;
      --screen-saver-pan-end-y: 1.2%;
      --screen-saver-zoom-start: 1.17;
      --screen-saver-zoom-end: 1.08;
    }

    @keyframes screen-saver-pan-and-zoom {
      from {
        transform:
          scale(var(--screen-saver-zoom-start))
          translate3d(var(--screen-saver-pan-start-x), var(--screen-saver-pan-start-y), 0);
      }

      to {
        transform:
          scale(var(--screen-saver-zoom-end))
          translate3d(var(--screen-saver-pan-end-x), var(--screen-saver-pan-end-y), 0);
      }
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
      transition:
        opacity 260ms ease,
        transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .screen-saver-toolbar {
      position: absolute;
      left: 50%;
      bottom: max(1.5rem, env(safe-area-inset-bottom));
      z-index: 3;
      transform: translateX(-50%);
      transition:
        opacity 260ms ease,
        transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .screen-saver:not(.is-ui-visible) .screen-saver-chrome {
      opacity: 0;
      transform: translateY(-0.75rem);
    }

    .screen-saver:not(.is-ui-visible) .screen-saver-close,
    .screen-saver:not(.is-ui-visible) .screen-saver-toolbar {
      pointer-events: none;
    }

    .screen-saver:not(.is-ui-visible) .screen-saver-toolbar {
      opacity: 0;
      transform: translate(-50%, 1rem);
    }

    .screen-saver-exit-hint {
      position: absolute;
      left: 50%;
      bottom: calc(max(1.5rem, env(safe-area-inset-bottom)) + 7.25rem);
      z-index: 4;
      display: flex;
      align-items: center;
      gap: 0.42rem;
      padding: 0.55rem 0.8rem;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 999px;
      background: rgba(4, 5, 9, 0.64);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.24);
      color: rgba(255, 255, 255, 0.78);
      font: 600 0.7rem/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0.045em;
      opacity: 0;
      pointer-events: none;
      transform: translate(-50%, 0.5rem);
      transition:
        opacity 200ms ease,
        transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
      white-space: nowrap;
      backdrop-filter: blur(16px) saturate(1.2);
      -webkit-backdrop-filter: blur(16px) saturate(1.2);
    }

    .screen-saver-exit-hint.is-visible {
      opacity: 1;
      transform: translate(-50%, 0);
    }

    .screen-saver-exit-hint kbd {
      display: grid;
      min-width: 1.45rem;
      height: 1.45rem;
      place-items: center;
      padding-inline: 0.35rem;
      border: 1px solid rgba(255, 255, 255, 0.26);
      border-radius: 0.42rem;
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.94);
      font: inherit;
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
      .screen-saver-exit-hint {
        bottom: calc(max(1.5rem, env(safe-area-inset-bottom)) + 14.5rem);
      }

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
      .screen-saver-close,
      .screen-saver-chrome,
      .screen-saver-toolbar,
      .screen-saver-exit-hint {
        transition: none;
      }

      .screen-saver-image,
      .screen-saver-image.is-active,
      .screen-saver-image.has-ken-burns,
      .screen-saver-image.is-active.has-ken-burns {
        animation: none;
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
  private controlsHideTimeoutId: number | null = null;

  protected readonly isActive = signal(false);
  protected readonly controlsVisible = signal(false);
  protected readonly showPointerHint = signal(false);
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
    this.destroyRef.onDestroy(() => this.cancelControlsHide());
  }

  @HostListener('document:keydown', ['$event'])
  protected handleKeyboardShortcut(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (event.key === 'Tab' && this.isActive()) {
      this.revealControls(false);
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
    if (!this.isActive()) {
      return;
    }

    this.revealControls(!this.isScreenSaverControlPointer(event));
  }

  @HostListener('document:focusin', ['$event'])
  protected handleFocusIn(event: FocusEvent): void {
    if (this.isActive() && this.isScreenSaverControlTarget(event.target)) {
      this.revealControls(false);
    }
  }

  public activate(): void {
    if (!this.isActive()) {
      this.open();
    }
  }

  protected close(): void {
    this.cancelControlsHide();

    if (!this.isActive()) {
      return;
    }

    this.isActive.set(false);
    this.controlsVisible.set(false);
    this.showPointerHint.set(false);
    this.restoreFocus();
  }

  protected slideObjectPosition(slide: ScreenSaverDisplaySlide): string {
    return `${slide.focalPointX}% ${slide.focalPointY}%`;
  }

  protected motionPath(slideIndex: number): (typeof SCREEN_SAVER_MOTION_PATHS)[number] {
    return SCREEN_SAVER_MOTION_PATHS[slideIndex % SCREEN_SAVER_MOTION_PATHS.length];
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

    this.cancelControlsHide();
    this.focusBeforeOpen = this.document.activeElement instanceof HTMLElement
      ? this.document.activeElement
      : null;
    this.hasOpened.set(true);
    this.activeSlideIndex.set(0);
    this.controlsVisible.set(true);
    this.showPointerHint.set(false);
    this.isActive.set(true);
    this.scheduleControlsHide();

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

  private isScreenSaverControlTarget(target: EventTarget | null): boolean {
    return target instanceof Element
      && Boolean(target.closest('.screen-saver-toolbar, .screen-saver-close'));
  }

  private isScreenSaverControlPointer(event: MouseEvent): boolean {
    if (this.isScreenSaverControlTarget(event.target)) {
      return true;
    }

    return Array.from(this.document.querySelectorAll<HTMLElement>(
      '.screen-saver-toolbar, .screen-saver-close'
    )).some(element => {
      const rect = element.getBoundingClientRect();
      return event.clientX >= rect.left
        && event.clientX <= rect.right
        && event.clientY >= rect.top
        && event.clientY <= rect.bottom;
    });
  }

  private revealControls(showPointerHint: boolean): void {
    this.controlsVisible.set(true);
    this.showPointerHint.set(showPointerHint);
    this.scheduleControlsHide();
  }

  private scheduleControlsHide(): void {
    this.cancelControlsHide();
    this.controlsHideTimeoutId = window.setTimeout(() => {
      this.controlsHideTimeoutId = null;
      this.controlsVisible.set(false);
      this.showPointerHint.set(false);
    }, SCREEN_SAVER_CONTROLS_IDLE_MS);
  }

  private cancelControlsHide(): void {
    if (this.controlsHideTimeoutId === null) {
      return;
    }

    window.clearTimeout(this.controlsHideTimeoutId);
    this.controlsHideTimeoutId = null;
  }
}
