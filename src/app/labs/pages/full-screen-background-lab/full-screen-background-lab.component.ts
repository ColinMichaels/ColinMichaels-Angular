import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  computed,
  signal,
  ChangeDetectionStrategy
} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {RouterLink} from '@angular/router';

import {
  BackgroundConfig,
  FullScreenBackgroundComponent,
  ParallaxElement,
} from '../../../components/game/system/full-screen-background/full-screen-background.component';
import {MainHeaderComponent} from '../../../components/main/main-header.component';
import {SocialsComponent} from '../../../components/main/socials/socials.component';

interface ScrollScene {
  id: string;
  step: string;
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  accentClass: string;
}

@Component({
  selector: 'app-full-screen-background-lab',
  standalone: true,
  imports: [
    CommonModule,
    FullScreenBackgroundComponent,
    MainHeaderComponent,
    RouterLink,
    SocialsComponent,
  ],
  template: `
    <div class="fixed top-0 z-50 flex w-full justify-center">
      <app-main-header></app-main-header>
    </div>

    <aside
      class="fixed right-4 top-24 z-40 w-[min(26rem,calc(100vw-2rem))] border border-white/15 bg-black/72 px-4 py-3 text-xs text-zinc-200 shadow-2xl backdrop-blur"
      aria-label="Prank progress"
    >
      <div class="flex items-center justify-between gap-4">
        <span class="font-medium">Background lab progress</span>
        <span class="tabular-nums text-cyan-200">{{ scrollProgress() }}% closer to completion</span>
      </div>
      <div class="mt-2 h-1.5 overflow-hidden bg-white/10">
        <div class="h-full bg-cyan-300 transition-all duration-200" [style.width.%]="scrollProgress()"></div>
      </div>
    </aside>

    <main class="min-h-screen bg-black text-zinc-100">
      <app-full-screen-background
        [config]="heroBackgroundConfig"
        [height]="'100vh'"
        [enableParallax]="true"
        [parallaxElements]="heroParallaxElements"
        [parallaxIntensity]="0.55"
      >
        <section class="hero-shell">
          <div id="lab-hero-title" class="hero-copy">
            <p class="text-sm uppercase tracking-[0.28em] text-cyan-200">Background Lab</p>
            <h1 class="mt-5 max-w-5xl text-5xl font-semibold leading-none text-white sm:text-7xl">
              A very serious full-screen background study.
            </h1>
            <p class="mt-6 max-w-2xl text-base leading-7 text-zinc-200 sm:text-lg">
              The prototype is definitely about parallax, video, contrast, and user focus. Nothing else is happening
              at the end.
            </p>
          </div>

          <div id="lab-hero-card" class="hero-actions">
            <button
              type="button"
              class="border border-cyan-200 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-200 hover:text-neutral-950"
              (click)="toggleHeroBackground()"
            >
              {{ heroThemeLabel() }}
            </button>
            <button
              type="button"
              class="border border-white/20 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-amber-200 hover:text-amber-100"
              (click)="scrollToScene('briefing')"
            >
              Continue
            </button>
          </div>

          <div id="lab-hero-ribbon" class="hero-ribbon">
            <span>Parallax</span>
            <span>Overlay</span>
            <span>Completion path</span>
          </div>
        </section>
      </app-full-screen-background>

      <section class="bg-neutral-950 py-16">
        <div class="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:px-8">
          <nav class="hidden lg:block" aria-label="Background lab checkpoints">
            <div class="sticky top-28 border border-white/10 bg-black/45 p-4">
              <p class="text-xs uppercase tracking-[0.22em] text-zinc-500">Checkpoints</p>
              <div class="mt-5 grid gap-2">
                @for (scene of scrollScenes; track scene.id) {
                  <button
                    type="button"
                    class="rail-button"
                    [class.is-active]="activeSceneId() === scene.id"
                    [attr.aria-label]="scene.title"
                    (click)="scrollToScene(scene.id)"
                  >
                    <span>{{ scene.step }}</span>
                    <span>{{ scene.eyebrow }}</span>
                  </button>
                }
              </div>
            </div>
          </nav>

          <div class="grid gap-8">
            @for (scene of scrollScenes; track scene.id) {
              <section
                class="scroll-scene"
                [attr.data-lab-scene]="scene.id"
                [id]="scene.id"
              >
                <img [src]="scene.image" alt="" class="scene-image" loading="lazy">
                <div class="scene-vignette"></div>

                <article class="scene-panel" [class.is-active]="activeSceneId() === scene.id">
                  <p class="text-xs uppercase tracking-[0.24em]" [ngClass]="scene.accentClass">{{ scene.eyebrow }}</p>
                  <h2 class="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
                    {{ scene.title }}
                  </h2>
                  <p class="mt-5 max-w-2xl text-base leading-7 text-zinc-300">
                    {{ scene.body }}
                  </p>

                  <div class="mt-8 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <div>
                      <p class="text-xs uppercase tracking-[0.22em] text-zinc-500">Scroll signal</p>
                      <div class="mt-3 h-2 overflow-hidden bg-white/10">
                        <div
                          class="h-full bg-amber-300 transition-all duration-300"
                          [style.width.%]="scene.id === activeSceneId() ? scrollProgress() : 12"
                        ></div>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="border border-white/15 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-rose-300 hover:text-rose-100"
                      (click)="nudgeSuspicion()"
                    >
                      Suspicion {{ suspicionCount() }}
                    </button>
                  </div>
                </article>
              </section>
            }
          </div>
        </div>
      </section>

      <section class="relative isolate min-h-screen overflow-hidden bg-zinc-950" data-rick-roll-trigger>
        @if (rickRollTriggered()) {
          <app-full-screen-background
            #rickRollBackground
            [config]="rickRollConfig"
            [height]="'100vh'"
            [enableParallax]="false"
          >
            <div class="rick-overlay">
              <p class="text-sm uppercase tracking-[0.28em] text-rose-200">Final checkpoint</p>
              <h2 class="mt-5 max-w-5xl text-5xl font-black leading-none text-white sm:text-7xl">
                You have been Rick Rolled.
              </h2>
              <p class="mt-6 max-w-2xl text-base leading-7 text-zinc-200">
                The lab completed successfully. The methodology was questionable, but the video did play.
              </p>
              <div class="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  class="border border-cyan-200 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-200 hover:text-neutral-950"
                  (click)="restartLab()"
                >
                  Reset
                </button>
                <a
                  routerLink="/"
                  class="border border-white/20 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-amber-200 hover:text-amber-100"
                >
                  Back
                </a>
              </div>
            </div>
          </app-full-screen-background>
        } @else {
          <div class="flex min-h-screen items-center justify-center px-4 text-center">
            <div>
              <p class="text-sm uppercase tracking-[0.28em] text-rose-200">Final checkpoint</p>
              <h2 class="mt-5 max-w-4xl text-5xl font-black leading-none text-white sm:text-7xl">
                Keep scrolling. The payoff is absolutely professional.
              </h2>
              <p class="mx-auto mt-6 max-w-xl text-base leading-7 text-zinc-300">
                Current plausibility: {{ plausibilityScore() }}%. The page is almost out of excuses.
              </p>
            </div>
          </div>
        }
      </section>

      <section class="border-t border-white/10 bg-black px-4 pb-24 pt-12 sm:px-6 lg:px-8">
        <nav
          class="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
          aria-label="Return navigation"
        >
          <div>
            <p class="text-xs uppercase tracking-[0.24em] text-cyan-200">Navigation</p>
            <h2 class="mt-3 text-3xl font-semibold text-white">Return to the main site</h2>
          </div>

          <div class="flex flex-wrap gap-3">
            <a
              routerLink="/"
              class="border border-cyan-200 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-200 hover:text-neutral-950"
            >
              Home
            </a>
            <a
              routerLink="/labs"
              class="border border-white/20 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-amber-200 hover:text-amber-100"
            >
              Labs
            </a>
            <a
              routerLink="/blog"
              class="border border-white/20 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-emerald-200 hover:text-emerald-100"
            >
              Blog
            </a>
          </div>
        </nav>
      </section>
    </main>

    <app-socials></app-socials>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    :host {
      display: block;
      background: #000;
    }

    .hero-shell {
      position: relative;
      z-index: 1;
      display: flex;
      min-height: 100%;
      width: 100%;
      flex-direction: column;
      justify-content: center;
      gap: 2rem;
      padding: 7rem 1.25rem 6rem;
    }

    .hero-copy,
    .hero-actions,
    .hero-ribbon {
      margin-inline: auto;
      width: min(72rem, 100%);
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .hero-ribbon {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      color: rgb(212 212 216);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.18em;
    }

    .hero-ribbon span {
      border: 1px solid rgb(255 255 255 / 14%);
      background: rgb(0 0 0 / 42%);
      padding: 0.625rem 0.75rem;
    }

    .rail-button {
      display: grid;
      grid-template-columns: 2.25rem minmax(0, 1fr);
      align-items: center;
      gap: 0.75rem;
      border: 1px solid rgb(255 255 255 / 10%);
      padding: 0.75rem;
      text-align: left;
      color: rgb(161 161 170);
      transition: border-color 180ms ease, color 180ms ease, background-color 180ms ease;
    }

    .rail-button:hover,
    .rail-button.is-active {
      border-color: rgb(103 232 249 / 70%);
      background: rgb(103 232 249 / 10%);
      color: rgb(236 254 255);
    }

    .rail-button span:first-child {
      color: rgb(253 224 71);
      font-variant-numeric: tabular-nums;
    }

    .scroll-scene {
      position: relative;
      isolation: isolate;
      min-height: 112vh;
      overflow: hidden;
      border: 1px solid rgb(255 255 255 / 10%);
      background: #050505;
    }

    .scene-image,
    .scene-vignette {
      position: absolute;
      inset: 0;
      z-index: -2;
    }

    .scene-image {
      height: 100%;
      width: 100%;
      object-fit: cover;
      opacity: 0.46;
      transform: scale(1.04);
      transition: opacity 500ms ease, transform 700ms ease;
    }

    .scene-vignette {
      z-index: -1;
      background:
        linear-gradient(90deg, rgb(0 0 0 / 88%), rgb(0 0 0 / 45%) 56%, rgb(0 0 0 / 70%)),
        linear-gradient(180deg, rgb(0 0 0 / 42%), rgb(0 0 0 / 82%));
    }

    .scene-panel {
      display: flex;
      min-height: 112vh;
      flex-direction: column;
      justify-content: center;
      padding: 7rem 1.25rem;
      opacity: 0.58;
      transform: translate3d(0, 2rem, 0) scale(0.985);
      transition: opacity 420ms ease, transform 420ms ease;
    }

    .scene-panel.is-active {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }

    .scroll-scene:has(.scene-panel.is-active) .scene-image {
      opacity: 0.64;
      transform: scale(1);
    }

    .rick-overlay {
      display: flex;
      min-height: 100%;
      width: 100%;
      flex-direction: column;
      justify-content: center;
      padding: 7rem 1.25rem 6rem;
      background: linear-gradient(90deg, rgb(0 0 0 / 74%), rgb(0 0 0 / 22%), rgb(0 0 0 / 70%));
    }

    .rick-overlay > * {
      margin-inline: auto;
      width: min(72rem, 100%);
    }

    @media (min-width: 640px) {
      .hero-shell,
      .scene-panel,
      .rick-overlay {
        padding-inline: 2rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .scene-image,
      .scene-panel,
      .rail-button {
        transition: none;
      }
    }
  `],
})
export class FullScreenBackgroundLabComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('rickRollBackground') private rickRollBackground?: FullScreenBackgroundComponent;

  protected readonly scrollScenes: readonly ScrollScene[] = [
    {
      id: 'briefing',
      step: '01',
      eyebrow: 'Briefing',
      title: 'The first stop looks responsible enough.',
      body: 'A full-screen image background, a measured overlay, and a progress meter make this feel like legitimate interface research.',
      image: 'assets/images/backgrounds/day.webp',
      accentClass: 'text-cyan-200',
    },
    {
      id: 'motion',
      step: '02',
      eyebrow: 'Motion',
      title: 'The page starts reacting like it has a plan.',
      body: 'Panels settle in as they enter view, the checkpoint rail follows along, and the global meter quietly admits how far into the bit you are.',
      image: 'assets/images/backgrounds/night.webp',
      accentClass: 'text-amber-200',
    },
    {
      id: 'evidence',
      step: '03',
      eyebrow: 'Evidence',
      title: 'Every section makes the bottom harder to ignore.',
      body: 'This is the part where a normal lab would compare treatments. This one mostly creates plausible deniability.',
      image: 'assets/images/backgrounds/day.jpg',
      accentClass: 'text-emerald-200',
    },
    {
      id: 'trap',
      step: '04',
      eyebrow: 'Conclusion',
      title: 'The final interaction is armed by scrolling.',
      body: 'Once the last viewport is reached, the page swaps the decoy ending for the real video background and asks the player to do the rest.',
      image: 'assets/images/backgrounds/night.jpg',
      accentClass: 'text-rose-200',
    },
  ];

  protected readonly activeSceneId = signal(this.scrollScenes[0].id);
  protected readonly scrollProgress = signal(0);
  protected readonly suspicionCount = signal(0);
  protected readonly rickRollTriggered = signal(false);
  protected readonly heroTheme = signal<'night' | 'day'>('night');

  protected readonly plausibilityScore = computed(() => {
    return Math.max(0, 100 - this.scrollProgress() - this.suspicionCount());
  });

  protected readonly heroThemeLabel = computed(() => {
    return this.heroTheme() === 'night' ? 'Try daylight' : 'Return to night';
  });

  private readonly nightHeroConfig: BackgroundConfig = {
    type: 'image',
    source: 'assets/images/backgrounds/night.webp',
    fallbackImage: 'assets/images/backgrounds/night.webp',
    opacity: 1,
    blur: 1,
    overlay: {
      color: '#020617',
      opacity: 0.58,
    },
  };

  private readonly dayHeroConfig: BackgroundConfig = {
    type: 'image',
    source: 'assets/images/backgrounds/day.webp',
    fallbackImage: 'assets/images/backgrounds/day.webp',
    opacity: 1,
    blur: 1,
    overlay: {
      color: '#0f172a',
      opacity: 0.38,
    },
  };

  protected heroBackgroundConfig: BackgroundConfig = this.nightHeroConfig;

  protected readonly heroParallaxElements: ParallaxElement[] = [
    {
      id: 'lab-hero-title',
      speed: 0.18,
      direction: 'vertical',
      initialOffset: {x: 0, y: 0},
    },
    {
      id: 'lab-hero-card',
      speed: 0.32,
      direction: 'vertical',
      initialOffset: {x: 0, y: 0},
    },
    {
      id: 'lab-hero-ribbon',
      speed: 0.14,
      direction: 'horizontal',
      initialOffset: {x: 0, y: 0},
    },
  ];

  protected readonly rickRollConfig: BackgroundConfig = {
    type: 'video',
    videoProvider: {
      type: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      autoplay: true,
      muted: false,
      loop: false,
      controls: true,
    },
    fallbackImage: 'assets/images/backgrounds/night.webp',
    opacity: 0.96,
    overlay: {
      color: '#000000',
      opacity: 0.14,
    },
  };

  private readonly isBrowser: boolean;
  private sceneObserver?: IntersectionObserver;
  private rickRollObserver?: IntersectionObserver;
  private scrollAnimationFrame?: number;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private readonly host: ElementRef<HTMLElement>,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.resetWindowScroll('auto');
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      return;
    }

    requestAnimationFrame(() => {
      this.resetWindowScroll('auto');
      this.setupScrollObservers();
      this.updateScrollProgress();
    });
  }

  ngOnDestroy(): void {
    this.sceneObserver?.disconnect();
    this.rickRollObserver?.disconnect();

    if (this.scrollAnimationFrame) {
      cancelAnimationFrame(this.scrollAnimationFrame);
    }
  }

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    if (!this.isBrowser || this.scrollAnimationFrame) {
      return;
    }

    this.scrollAnimationFrame = requestAnimationFrame(() => {
      this.scrollAnimationFrame = undefined;
      this.updateScrollProgress();
    });
  }

  protected toggleHeroBackground(): void {
    const nextTheme = this.heroTheme() === 'night' ? 'day' : 'night';
    this.heroTheme.set(nextTheme);
    this.heroBackgroundConfig = nextTheme === 'night' ? this.nightHeroConfig : this.dayHeroConfig;
  }

  protected scrollToScene(sceneId: string): void {
    if (!this.isBrowser) {
      return;
    }

    const target = this.host.nativeElement.querySelector<HTMLElement>(`[data-lab-scene="${sceneId}"]`);
    target?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  protected nudgeSuspicion(): void {
    this.suspicionCount.update(count => count + 1);
  }

  protected restartLab(): void {
    if (!this.isBrowser) {
      return;
    }

    this.rickRollTriggered.set(false);
    this.resetWindowScroll('auto');
    this.activeSceneId.set(this.scrollScenes[0].id);
    this.updateScrollProgress();
  }

  protected triggerRickRoll(): void {
    if (this.rickRollTriggered()) {
      return;
    }

    this.rickRollTriggered.set(true);
    setTimeout(() => this.rickRollBackground?.playVideo(), 1200);
  }

  private setupScrollObservers(): void {
    if (!this.isBrowser || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const sceneSections = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>('[data-lab-scene]'),
    );

    this.sceneObserver = new IntersectionObserver((entries) => {
      const visibleEntry = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      const sceneId = visibleEntry?.target.getAttribute('data-lab-scene');
      if (sceneId) {
        this.activeSceneId.set(sceneId);
      }
    }, {
      rootMargin: '-28% 0px -42% 0px',
      threshold: [0.25, 0.5, 0.75],
    });

    sceneSections.forEach(section => this.sceneObserver?.observe(section));

    const rickRollSection = this.host.nativeElement.querySelector<HTMLElement>('[data-rick-roll-trigger]');
    if (!rickRollSection) {
      return;
    }

    this.rickRollObserver = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        this.triggerRickRoll();
      }
    }, {
      rootMargin: '0px 0px -18% 0px',
      threshold: 0.7,
    });

    this.rickRollObserver.observe(rickRollSection);
  }

  private updateScrollProgress(): void {
    if (!this.isBrowser) {
      return;
    }

    const documentElement = document.documentElement;
    const maxScroll = documentElement.scrollHeight - window.innerHeight;
    const nextProgress = maxScroll > 0
      ? Math.min(100, Math.max(0, Math.round((window.scrollY / maxScroll) * 100)))
      : 0;

    this.scrollProgress.set(nextProgress);

    if (nextProgress >= 98) {
      this.triggerRickRoll();
    }
  }

  private resetWindowScroll(behavior: ScrollBehavior): void {
    if (!this.isBrowser) {
      return;
    }

    window.scrollTo({top: 0, left: 0, behavior});
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }
}
