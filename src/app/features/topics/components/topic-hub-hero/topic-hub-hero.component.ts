import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import {PATH_NAMES} from '../../../../app-route-paths';
import {TopicHub, resolveTopicHubHeroImages} from '../../topic-hubs.data';

const TOPIC_HERO_ROTATION_INTERVAL_MS = 8_000;

export interface TopicHubSectionNavigation {
  event: MouseEvent;
  fragment: 'topic-posts' | 'topic-guide';
}

@Component({
  selector: 'app-topic-hub-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="topic-hub-hero" aria-labelledby="topic-hub-heading">
      @if (activeSlide(); as currentSlide) {
        <figure
          class="topic-hub-hero-media"
          role="img"
          [attr.aria-label]="currentSlide.alt"
        >
          @for (slide of slides(); track slide.src; let slideIndex = $index) {
            <img
              [src]="slide.src"
              alt=""
              [attr.width]="slide.width"
              [attr.height]="slide.height"
              [attr.fetchpriority]="slideIndex === 0 ? 'high' : null"
              [attr.loading]="slideIndex === 0 ? 'eager' : 'lazy'"
              [class.topic-hub-hero-image-active]="slideIndex === activeSlideIndex()"
              [style.object-position]="slide.objectPosition || 'center'"
              decoding="async"
              aria-hidden="true"
            >
          }
        </figure>
      }

      <div class="topic-hub-hero-veil" aria-hidden="true"></div>

      <div class="topic-hub-hero-shell">
        <nav class="topic-hub-breadcrumb" aria-label="Topic navigation">
          <a href="/">Home</a>
          <span aria-hidden="true">/</span>
          <span>Topics</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{{ hub().theme.shortLabel }}</span>
        </nav>

        <div
          class="topic-hub-hero-copy"
          [class.topic-hub-hero-copy-long-title]="hub().title.length > 34"
        >
          <h1 id="topic-hub-heading">{{ hub().title }}</h1>
          <p>{{ hub().summary }}</p>

          <div class="topic-hub-actions">
            <a
              [attr.href]="sectionHref('topic-posts')"
              class="topic-hub-action topic-hub-action-primary"
              (click)="navigateToSection($event, 'topic-posts')"
            >
              Browse {{ hub().theme.shortLabel }} posts
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M5 12h14"></path>
                <path d="m14 6 6 6-6 6"></path>
              </svg>
            </a>
            <a
              [attr.href]="sectionHref('topic-guide')"
              class="topic-hub-action topic-hub-action-secondary"
              (click)="navigateToSection($event, 'topic-guide')"
            >
              About this topic
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M12 11v5"></path>
                <path d="M12 8h.01"></path>
              </svg>
            </a>
          </div>
        </div>

        @if (hasMultipleSlides()) {
          <div
            class="topic-hub-scene-controls"
            [class.topic-hub-scene-controls-paused]="rotationPaused()"
            role="group"
            aria-label="Topic background scenes"
          >
            <span class="topic-hub-scene-number" aria-hidden="true">
              {{ sceneNumber(0) }}
            </span>

            <div class="topic-hub-scene-tracks">
              @for (slide of slides(); track slide.src; let slideIndex = $index) {
                <button
                  type="button"
                  class="topic-hub-scene-button"
                  [attr.aria-label]="'Show topic scene ' + (slideIndex + 1) + ' of ' + slides().length"
                  [attr.aria-current]="slideIndex === activeSlideIndex() ? 'true' : null"
                  (click)="showSlide(slideIndex)"
                ></button>
              }
            </div>

            <span class="topic-hub-scene-number topic-hub-scene-total" aria-hidden="true">
              {{ sceneNumber(slides().length - 1) }}
            </span>

            @if (!prefersReducedMotion()) {
              <button
                type="button"
                class="topic-hub-rotation-control"
                [attr.aria-label]="manualRotationPaused()
                  ? 'Resume automatic topic scene rotation'
                  : 'Pause automatic topic scene rotation'"
                [attr.aria-pressed]="manualRotationPaused()"
                (click)="toggleRotation()"
              >
                @if (manualRotationPaused()) {
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="m8 6 10 6-10 6Z"></path>
                  </svg>
                } @else {
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M8.5 6.5v11"></path>
                    <path d="M15.5 6.5v11"></path>
                  </svg>
                }
              </button>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .topic-hub-hero {
      position: relative;
      min-height: clamp(38rem, 72svh, 45rem);
      overflow: hidden;
      isolation: isolate;
      background: #02060d;
      color: #f8fafc;
    }

    .topic-hub-hero-media,
    .topic-hub-hero-media img,
    .topic-hub-hero-veil {
      position: absolute;
      inset: 0;
    }

    .topic-hub-hero-media {
      z-index: -2;
      margin: 0;
      overflow: hidden;
      background: #02060d;
    }

    .topic-hub-hero-media img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      filter: saturate(0.96) contrast(1.03);
      transform: scale(1.025);
      transition: opacity 1.2s ease;
      will-change: opacity, transform;
    }

    .topic-hub-hero-media .topic-hub-hero-image-active {
      z-index: 1;
      opacity: 1;
      animation: topic-hub-hero-drift 8s ease-out both;
    }

    .topic-hub-hero-veil {
      z-index: -1;
      background:
        linear-gradient(
          90deg,
          rgba(2, 6, 13, 0.98) 0%,
          rgba(2, 6, 13, 0.9) 26%,
          rgba(2, 6, 13, 0.68) 43%,
          rgba(2, 6, 13, 0.18) 68%,
          rgba(2, 6, 13, 0.08) 100%
        ),
        linear-gradient(180deg, rgba(2, 6, 13, 0.18) 0%, transparent 50%, var(--site-bg) 100%);
      pointer-events: none;
    }

    .topic-hub-hero-shell {
      display: grid;
      grid-template-rows: auto 1fr auto;
      width: min(100% - 2rem, 80rem);
      min-height: inherit;
      margin-inline: auto;
      padding-block: clamp(2.4rem, 5vw, 4rem) clamp(2rem, 4vw, 3rem);
    }

    .topic-hub-breadcrumb {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.65rem;
      color: #94a3b8;
      font-family: var(--font-accent);
      font-size: 0.88rem;
    }

    .topic-hub-breadcrumb a {
      color: #e2e8f0;
      text-decoration: none;
    }

    .topic-hub-breadcrumb a:hover,
    .topic-hub-breadcrumb a:focus-visible,
    .topic-hub-breadcrumb [aria-current='page'] {
      color: var(--topic-accent-strong);
    }

    .topic-hub-breadcrumb a:focus-visible,
    .topic-hub-action:focus-visible,
    .topic-hub-scene-button:focus-visible,
    .topic-hub-rotation-control:focus-visible {
      outline: 2px solid var(--topic-accent-strong);
      outline-offset: 0.22rem;
    }

    .topic-hub-hero-copy {
      align-self: center;
      max-width: 43rem;
      padding-block: clamp(2.75rem, 7vw, 5.5rem) 2rem;
    }

    .topic-hub-hero-copy h1 {
      max-width: 14ch;
      margin: 0;
      color: #ffffff;
      font-family: var(--font-heading);
      font-size: clamp(3.2rem, 5.3vw, 4.8rem);
      font-weight: 650;
      hyphens: none;
      letter-spacing: -0.05em;
      line-height: 0.98;
      overflow-wrap: normal;
      text-wrap: balance;
      text-shadow: 0 0.14rem 1.6rem rgba(0, 0, 0, 0.86);
      word-break: normal;
    }

    .topic-hub-hero-copy-long-title h1 {
      max-width: 17ch;
      font-size: clamp(2.8rem, 4.45vw, 4.15rem);
      line-height: 1.02;
    }

    .topic-hub-hero-copy > p {
      max-width: 39rem;
      margin: 1.5rem 0 0;
      color: #cbd5e1;
      font-size: clamp(1.04rem, 1.45vw, 1.22rem);
      line-height: 1.68;
      text-shadow: 0 0.1rem 1rem rgba(0, 0, 0, 0.9);
      text-wrap: pretty;
    }

    .topic-hub-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.9rem;
      margin-top: 2rem;
    }

    .topic-hub-action {
      display: inline-flex;
      min-height: 3.25rem;
      align-items: center;
      justify-content: center;
      gap: 0.78rem;
      border: 1px solid rgb(var(--topic-accent-rgb) / 0.72);
      padding: 0.8rem 1.05rem;
      font-family: var(--font-accent);
      font-size: 0.94rem;
      font-weight: 650;
      text-decoration: none;
      transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease, transform 180ms ease;
    }

    .topic-hub-action-primary {
      background: var(--topic-accent-strong);
      color: #03131d;
    }

    .topic-hub-action-secondary {
      background: rgba(2, 8, 17, 0.42);
      color: #f8fafc;
      backdrop-filter: blur(0.5rem);
    }

    .topic-hub-action:hover,
    .topic-hub-action:focus-visible {
      border-color: #cffafe;
      transform: translateY(-0.1rem);
    }

    .topic-hub-action-primary:hover,
    .topic-hub-action-primary:focus-visible {
      background: #cffafe;
      color: #03131d;
    }

    .topic-hub-action-secondary:hover,
    .topic-hub-action-secondary:focus-visible {
      background: rgb(var(--topic-accent-rgb) / 0.15);
      color: #ffffff;
    }

    .topic-hub-action svg,
    .topic-hub-rotation-control svg {
      width: 1.15rem;
      height: 1.15rem;
      flex: 0 0 auto;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .topic-hub-scene-controls {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 0.7rem;
      color: #94a3b8;
    }

    .topic-hub-scene-number {
      min-width: 1.45rem;
      color: var(--topic-accent-strong);
      font-family: var(--font-accent);
      font-size: 0.72rem;
      font-weight: 750;
      letter-spacing: 0.12em;
    }

    .topic-hub-scene-total {
      color: #94a3b8;
    }

    .topic-hub-scene-tracks {
      display: flex;
      min-width: 0;
      gap: 0.45rem;
    }

    .topic-hub-scene-button {
      position: relative;
      width: clamp(2.5rem, 4vw, 4rem);
      min-height: 2.75rem;
      overflow: hidden;
      border: 0;
      background: transparent;
      cursor: pointer;
    }

    .topic-hub-scene-button::before,
    .topic-hub-scene-button::after {
      position: absolute;
      right: 0;
      left: 0;
      top: 50%;
      height: 2px;
      content: '';
      transform: translateY(-50%);
    }

    .topic-hub-scene-button::before {
      background: rgba(148, 163, 184, 0.42);
    }

    .topic-hub-scene-button::after {
      background: var(--topic-accent-strong);
      transform: translateY(-50%) scaleX(0);
      transform-origin: left center;
    }

    .topic-hub-scene-button[aria-current='true']::after {
      animation: topic-hub-scene-progress 8s linear both;
    }

    .topic-hub-scene-controls-paused .topic-hub-scene-button[aria-current='true']::after {
      animation: none;
      transform: translateY(-50%) scaleX(1);
    }

    .topic-hub-rotation-control {
      display: inline-flex;
      width: 2.75rem;
      height: 2.75rem;
      align-items: center;
      justify-content: center;
      margin-left: 0.25rem;
      border: 1px solid rgba(148, 163, 184, 0.38);
      background: rgba(2, 8, 17, 0.35);
      color: #cbd5e1;
      cursor: pointer;
      transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease;
    }

    .topic-hub-rotation-control:hover,
    .topic-hub-rotation-control:focus-visible {
      border-color: var(--topic-accent-strong);
      background: rgb(var(--topic-accent-rgb) / 0.12);
      color: var(--topic-accent-strong);
    }

    @keyframes topic-hub-hero-drift {
      from {
        transform: scale(1.025) translate3d(0, 0, 0);
      }

      to {
        transform: scale(1.075) translate3d(-0.45%, -0.25%, 0);
      }
    }

    @keyframes topic-hub-scene-progress {
      from {
        transform: translateY(-50%) scaleX(0);
      }

      to {
        transform: translateY(-50%) scaleX(1);
      }
    }

    @media (min-width: 920px) {
      .topic-hub-hero-shell {
        width: min(100% - 3rem, 80rem);
      }
    }

    @media (max-width: 680px) {
      .topic-hub-hero {
        min-height: 42rem;
      }

      .topic-hub-hero-media img {
        object-position: 66% center !important;
      }

      .topic-hub-hero-veil {
        background:
          linear-gradient(180deg, rgba(2, 6, 13, 0.66) 0%, rgba(2, 6, 13, 0.36) 28%, rgba(2, 6, 13, 0.7) 54%, rgba(2, 6, 13, 0.94) 74%, var(--site-bg) 100%),
          linear-gradient(90deg, rgba(2, 6, 13, 0.66), rgba(2, 6, 13, 0.15));
      }

      .topic-hub-hero-shell {
        padding-top: 2rem;
      }

      .topic-hub-hero-copy {
        align-self: end;
        padding-block: 6rem 1.25rem;
      }

      .topic-hub-hero-copy h1,
      .topic-hub-hero-copy-long-title h1 {
        max-width: 18ch;
        font-size: clamp(2.55rem, 11vw, 3.45rem);
        line-height: 1;
      }

      .topic-hub-hero-copy > p {
        font-size: 1rem;
        line-height: 1.6;
      }

      .topic-hub-actions {
        display: grid;
        gap: 0;
        margin-top: 1.5rem;
      }

      .topic-hub-action {
        justify-content: space-between;
        border-width: 0 0 1px;
        background: transparent;
        color: var(--topic-accent-strong);
        padding-inline: 0;
        backdrop-filter: none;
      }

      .topic-hub-action-primary:hover,
      .topic-hub-action-primary:focus-visible,
      .topic-hub-action-secondary:hover,
      .topic-hub-action-secondary:focus-visible {
        background: transparent;
        color: #ffffff;
      }

      .topic-hub-scene-controls {
        gap: 0.45rem;
      }

      .topic-hub-scene-button {
        width: clamp(2.25rem, 12vw, 3.75rem);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .topic-hub-hero-media img,
      .topic-hub-action,
      .topic-hub-rotation-control {
        animation: none;
        transition: none;
      }

      .topic-hub-hero-media .topic-hub-hero-image-active {
        transform: scale(1.025);
      }

      .topic-hub-scene-button[aria-current='true']::after {
        animation: none;
        transform: translateY(-50%) scaleX(1);
      }
    }
  `],
})
export class TopicHubHeroComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly hub = input.required<TopicHub>();
  readonly sectionNavigate = output<TopicHubSectionNavigation>();

  protected readonly slides = computed(() => resolveTopicHubHeroImages(this.hub()));
  protected readonly activeSlideIndex = signal(0);
  protected readonly activeSlide = computed(() => (
    this.slides()[this.activeSlideIndex()] ?? this.slides()[0]
  ));
  protected readonly hasMultipleSlides = computed(() => this.slides().length > 1);
  protected readonly manualRotationPaused = signal(false);
  protected readonly prefersReducedMotion = signal(false);
  private readonly pageVisible = signal(true);
  protected readonly rotationPaused = computed(() => (
    this.manualRotationPaused() || this.prefersReducedMotion() || !this.pageVisible()
  ));
  private lastTopicSlug = '';

  private readonly resetForTopic = effect(() => {
    this.resetTopicState(this.hub().slug);
  });

  private readonly rotateSlides = effect(onCleanup => {
    const slideCount = this.slides().length;

    if (!this.isBrowser || slideCount < 2 || this.rotationPaused()) {
      return;
    }

    // The effect owns exactly one timer and rebuilds it whenever pause state or slide count changes.
    const intervalId = this.document.defaultView?.setInterval(() => {
      this.activeSlideIndex.update(index => (index + 1) % slideCount);
    }, TOPIC_HERO_ROTATION_INTERVAL_MS);

    onCleanup(() => {
      if (intervalId !== undefined) {
        this.document.defaultView?.clearInterval(intervalId);
      }
    });
  });

  constructor() {
    this.initializeBrowserMotionState();
  }

  protected sectionHref(fragment: TopicHubSectionNavigation['fragment']): string {
    return `/${PATH_NAMES.TOPICS}/${this.hub().slug}#${fragment}`;
  }

  protected navigateToSection(
    event: MouseEvent,
    fragment: TopicHubSectionNavigation['fragment']
  ): void {
    this.sectionNavigate.emit({event, fragment});
  }

  protected showSlide(index: number): void {
    // Direct selection pauses rotation so the chosen scene is not replaced before it can be read.
    this.activeSlideIndex.set(index);
    this.manualRotationPaused.set(true);
  }

  protected toggleRotation(): void {
    this.manualRotationPaused.update(paused => !paused);
  }

  protected sceneNumber(index: number): string {
    return `${index + 1}`.padStart(2, '0');
  }

  private resetTopicState(topicSlug: string): void {
    if (topicSlug === this.lastTopicSlug) {
      return;
    }

    this.lastTopicSlug = topicSlug;
    this.activeSlideIndex.set(0);
    this.manualRotationPaused.set(false);
  }

  private initializeBrowserMotionState(): void {
    const browserWindow = this.document.defaultView;

    if (!this.isBrowser || !browserWindow) {
      return;
    }

    const motionQuery = browserWindow.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => this.prefersReducedMotion.set(motionQuery.matches);
    const updateVisibility = () => this.pageVisible.set(this.document.visibilityState !== 'hidden');

    updateMotionPreference();
    updateVisibility();
    motionQuery.addEventListener('change', updateMotionPreference);
    this.document.addEventListener('visibilitychange', updateVisibility);

    this.destroyRef.onDestroy(() => {
      motionQuery.removeEventListener('change', updateMotionPreference);
      this.document.removeEventListener('visibilitychange', updateVisibility);
    });
  }
}
