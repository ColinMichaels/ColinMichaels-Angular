import {DOCUMENT, DatePipe, NgStyle, isPlatformBrowser} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {BlogPost} from '../../features/blog/models/blog-post.model';
import {createBlogReadingStats} from '../../features/blog/utils/blog-reading.util';
import {DailyDiscoveryRailComponent} from '../../features/daily-discovery/components/daily-discovery-rail.component';
import {DEFAULT_HOMEPAGE_HERO_SETTINGS} from '../../features/homepage/homepage-hero.defaults';
import {HomepageHeroSlide} from '../../features/homepage/models/homepage-hero.model';
import {HomepageHeroRepositoryService} from '../../features/homepage/services/homepage-hero-repository.service';
import {getPublishedHomepageHeroSlides} from '../../features/homepage/utils/homepage-hero-validation.util';
import {selectHomepageHeroPosts} from '../../features/homepage/utils/homepage-post-selection.util';
import {TopicHubRepositoryService} from '../../features/topics/services/topic-hub-repository.service';
import type {TopicHub} from '../../features/topics/topic-hubs.data';
import {HomeBlogPostFeedService} from './home-blog-post-feed.service';
import {postImage, postMatchesHubTerms} from './home-blog-section.utils';

const HERO_POST_EXCERPT_MAX_LENGTH = 318;
const HERO_POST_ROTATION_INTERVAL_MS = 30_000;
const DEFAULT_TOPIC_ACCENT = '#22d3ee';
const DEFAULT_TOPIC_ACCENT_STRONG = '#67e8f9';
const DEFAULT_TOPIC_ACCENT_RGB = '34 211 238';

type EditorialMediaSource = 'background' | 'post' | 'slide';

interface EditorialMedia {
  alt: string;
  objectPosition: string;
  source: EditorialMediaSource;
  url: string;
}

interface EditorialMediaSet {
  background: EditorialMedia | null;
  post: EditorialMedia | null;
  slides: readonly EditorialMedia[];
}

@Component({
  selector: 'app-home-article-hero',
  imports: [
    DatePipe,
    NgStyle,
    RouterLink,
    DailyDiscoveryRailComponent,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      id="home-article-hero"
      class="home-article-hero"
      aria-labelledby="home-article-hero-heading"
      (focusin)="setHeroFocusWithin(true)"
      (focusout)="handleHeroFocusOut($event)"
    >
      @if (heroBackdropMedia(); as backdrop) {
        <div
          class="home-hero-backdrop"
          [class.home-hero-backdrop--blurred]="backdrop.source === 'post'"
          aria-hidden="true"
        >
          <img
            [src]="backdrop.url"
            alt=""
            class="home-hero-backdrop-image"
            [style.object-position]="backdrop.objectPosition"
            decoding="async"
            loading="eager"
            fetchpriority="high"
            data-site-preload-image
            width="1920"
            height="1080"
            (error)="handleHeroMediaError(backdrop.url)"
          >
        </div>
      }

      <div class="home-hero-shell">
        @if (blogLoadError(); as error) {
          <div class="home-hero-message" role="status">{{ error }}</div>
        } @else if (activeHeroPost(); as post) {
          <article class="home-hero-story" [ngStyle]="postThemeStyle(post)">
            <div class="home-hero-copy">
              <h1 id="home-article-hero-heading" class="home-hero-post-title">{{ post.title }}</h1>
              <p class="home-hero-post-excerpt">{{ postExcerpt(post) }}</p>

              <div class="home-hero-meta-row">
                <span class="home-hero-meta">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M7 3.5v3"></path>
                    <path d="M17 3.5v3"></path>
                    <path d="M4.75 8.5h14.5"></path>
                    <rect x="4.75" y="5.5" width="14.5" height="14" rx="2"></rect>
                  </svg>
                  {{ (post.publishedAt || post.updatedAt) | date: 'MMM d, y':'UTC' }}
                </span>
                <span class="home-hero-meta-separator" aria-hidden="true"></span>
                <span class="home-hero-meta">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="8"></circle>
                    <path d="M12 7.75V12l3 2.25"></path>
                  </svg>
                  {{ readingMinutes(post) }} min read
                </span>
              </div>

              <div class="home-hero-actions">
                <a
                  [routerLink]="['/', pathNames.BLOG, post.slug]"
                  class="home-hero-read-more"
                  [attr.aria-label]="'Read the story: ' + post.title"
                >
                  Read the story
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M5 12h13"></path>
                    <path d="m13 6 6 6-6 6"></path>
                  </svg>
                </a>

                @if (hasPreviousHeroPost() || hasNextHeroPost()) {
                  <div class="home-hero-post-controls" role="group" aria-label="Featured story navigation">
                    @if (previousHeroPost(); as previousPost) {
                      <button
                        #previousHeroPostControl
                        type="button"
                        class="home-hero-post-control home-hero-post-control-previous"
                        [attr.aria-label]="'Show previous post: ' + previousPost.title"
                        (click)="showPreviousHeroPost()"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path d="m14.5 5-7 7 7 7"></path>
                        </svg>
                      </button>
                    }

                    <span class="home-hero-post-position" aria-live="polite" aria-atomic="true">
                      <span class="sr-only">Showing {{ post.title }}. </span>
                      <span aria-hidden="true">{{ activeHeroPostIndex() + 1 }} / {{ heroPostCandidates().length }}</span>
                    </span>

                    @if (nextHeroPost(); as nextPost) {
                      <button
                        #nextHeroPostControl
                        type="button"
                        class="home-hero-post-control home-hero-post-control-next"
                        [attr.aria-label]="'Show next post: ' + nextPost.title"
                        (click)="showNextHeroPost()"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path d="m9.5 5 7 7-7 7"></path>
                        </svg>
                      </button>
                    }

                    <button
                      type="button"
                      class="home-hero-post-control home-hero-rotation-control"
                      [attr.aria-label]="heroPostRotationPaused()
                        ? 'Resume automatic featured story rotation'
                        : 'Pause automatic featured story rotation'"
                      [attr.aria-pressed]="heroPostRotationPaused()"
                      [attr.title]="heroPostRotationPaused()
                        ? 'Resume automatic story rotation'
                        : 'Pause automatic story rotation'"
                      (click)="toggleHeroPostRotation()"
                    >
                      @if (heroPostRotationPaused()) {
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path d="m8.5 6 9 6-9 6Z"></path>
                        </svg>
                      } @else {
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path d="M8.5 6.5v11"></path>
                          <path d="M15.5 6.5v11"></path>
                        </svg>
                      }
                    </button>
                  </div>
                }
              </div>
            </div>

            <a
              [routerLink]="['/', pathNames.BLOG, post.slug]"
              class="home-hero-panel"
              [attr.aria-label]="'Read more: ' + post.title"
            >
              @if (heroPanelMedia(); as media) {
                <img
                  [src]="media.url"
                  [alt]="media.alt"
                  class="home-hero-panel-image"
                  [style.object-position]="media.objectPosition"
                  decoding="async"
                  loading="eager"
                  fetchpriority="high"
                  width="1600"
                  height="900"
                  (error)="handleHeroMediaError(media.url)"
                >
              }
            </a>
          </article>

          <app-daily-discovery-rail/>
        } @else if (blogIsLoading()) {
          <div class="home-hero-loading" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
        } @else {
          <div class="home-hero-message" role="status">No published posts yet.</div>
        }
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .home-article-hero {
      position: relative;
      isolation: isolate;
      overflow: hidden;
      border-bottom: 1px solid rgba(148, 163, 184, 0.18);
      background:
        radial-gradient(circle at 52% 25%, rgba(14, 116, 144, 0.12), transparent 34rem),
        linear-gradient(180deg, #020811 0%, #030b14 65%, #02070d 100%);
      color: #f8fafc;
    }

    .home-hero-backdrop {
      position: absolute;
      z-index: 0;
      inset: -2rem;
      overflow: hidden;
      pointer-events: none;
    }

    .home-hero-backdrop::after {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(2, 8, 17, 0.93) 0%, rgba(2, 8, 17, 0.82) 34%, rgba(2, 8, 17, 0.34) 69%, rgba(2, 8, 17, 0.52) 100%),
        linear-gradient(180deg, rgba(2, 8, 17, 0.24) 0%, rgba(2, 8, 17, 0.64) 100%);
      content: '';
    }

    .home-hero-backdrop-image {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: brightness(0.78) saturate(0.9) contrast(1.04);
      transform: scale(1.025);
    }

    .home-hero-backdrop--blurred .home-hero-backdrop-image {
      filter: blur(1.35rem) brightness(0.52) saturate(0.72);
      transform: scale(1.12);
    }

    .home-hero-shell {
      position: relative;
      z-index: 1;
      width: min(100%, 92rem);
      margin-inline: auto;
      padding: clamp(2rem, 4vw, 3.25rem) clamp(1rem, 4vw, 3rem) clamp(1.25rem, 2.5vw, 2rem);
    }

    .home-hero-story {
      --home-hero-topic-accent: #22d3ee;
      --home-hero-topic-accent-strong: #67e8f9;
      --home-hero-topic-rgb: 34 211 238;
      display: grid;
      gap: clamp(2rem, 4vw, 4.25rem);
      align-items: center;
    }

    .home-hero-copy {
      min-width: 0;
      padding-block: clamp(0.5rem, 2vw, 1.5rem);
    }

    .home-hero-post-title {
      margin: 0;
      max-width: 13ch;
      color: #ffffff;
      font-family: var(--font-editorial, Georgia, 'Times New Roman', serif);
      font-size: clamp(2.65rem, 4.8vw, 5.35rem);
      font-weight: 500;
      letter-spacing: -0.045em;
      line-height: 0.99;
      overflow-wrap: break-word;
      text-wrap: balance;
      text-shadow: 0 0.12rem 1.2rem rgba(0, 0, 0, 0.72);
    }

    .home-hero-post-excerpt {
      display: -webkit-box;
      max-width: 40rem;
      margin: clamp(1.15rem, 2vw, 1.65rem) 0 0;
      overflow: hidden;
      color: #dbe4ed;
      font-size: clamp(1rem, 1.25vw, 1.18rem);
      line-height: 1.58;
      text-wrap: pretty;
      text-shadow: 0 0.1rem 0.9rem rgba(0, 0, 0, 0.78);
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 4;
    }

    .home-hero-meta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.65rem 0.9rem;
      margin-top: clamp(1.25rem, 2vw, 1.75rem);
      color: #e2e8f0;
      font-family: var(--font-accent);
      font-size: 0.78rem;
      font-weight: 650;
      letter-spacing: 0.055em;
      text-transform: uppercase;
    }

    .home-hero-meta {
      display: inline-flex;
      align-items: center;
      gap: 0.48rem;
    }

    .home-hero-meta svg,
    .home-hero-read-more svg,
    .home-hero-post-control svg {
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .home-hero-meta svg {
      width: 1.05rem;
      height: 1.05rem;
    }

    .home-hero-meta-separator {
      width: 1px;
      height: 1.1rem;
      background: rgba(148, 163, 184, 0.45);
    }

    .home-hero-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
      margin-top: clamp(1.35rem, 2.4vw, 2rem);
    }

    .home-hero-read-more {
      display: inline-flex;
      min-height: 3.35rem;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      border: 1px solid var(--home-hero-topic-accent-strong);
      background: var(--home-hero-topic-accent-strong);
      padding: 0.78rem 1.45rem;
      color: #082f49;
      font-family: var(--font-accent);
      font-size: 0.98rem;
      font-weight: 650;
      text-decoration: none;
      transition: background 180ms ease, border-color 180ms ease, transform 180ms ease;
    }

    .home-hero-read-more:hover {
      border-color: #cffafe;
      background: #cffafe;
      transform: translateY(-1px);
    }

    .home-hero-read-more svg {
      width: 1.2rem;
      height: 1.2rem;
    }

    .home-hero-post-controls {
      display: grid;
      grid-template-columns: 2.75rem minmax(3.5rem, auto) 2.75rem 2.75rem;
      align-items: center;
      gap: 0.55rem;
    }

    .home-hero-post-control {
      display: inline-flex;
      width: 2.75rem;
      height: 2.75rem;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(103, 232, 249, 0.42);
      background: transparent;
      color: #cffafe;
      cursor: pointer;
      transition: border-color 180ms ease, background 180ms ease, color 180ms ease;
    }

    .home-hero-post-control:hover {
      border-color: #67e8f9;
      background: rgba(103, 232, 249, 0.12);
    }

    .home-hero-post-control svg {
      width: 1.15rem;
      height: 1.15rem;
    }

    .home-hero-post-control-previous {
      grid-column: 1;
    }

    .home-hero-post-position {
      grid-column: 2;
      color: #94a3b8;
      font-family: var(--font-accent);
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-align: center;
    }

    .home-hero-post-control-next {
      grid-column: 3;
    }

    .home-hero-rotation-control {
      grid-column: 4;
    }

    .home-hero-panel {
      position: relative;
      display: block;
      min-width: 0;
      overflow: hidden;
      border: 1px solid rgb(var(--home-hero-topic-rgb) / 0.27);
      background: #020617;
      aspect-ratio: 16 / 10;
      text-decoration: none;
    }

    .home-hero-panel::after {
      position: absolute;
      inset: 0;
      border: 1px solid rgba(255, 255, 255, 0.035);
      content: '';
      pointer-events: none;
    }

    .home-hero-panel-image {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: saturate(0.98) contrast(1.03);
      transition: filter 240ms ease, transform 360ms ease;
    }

    .home-hero-panel:hover .home-hero-panel-image,
    .home-hero-panel:focus-visible .home-hero-panel-image {
      filter: saturate(1.04) contrast(1.04);
      transform: scale(1.018);
    }

    app-daily-discovery-rail {
      display: block;
      margin-top: clamp(1.5rem, 3vw, 2.25rem);
    }

    .home-hero-message,
    .home-hero-loading {
      min-height: clamp(22rem, 58svh, 38rem);
      border: 1px solid rgba(148, 163, 184, 0.18);
      background: rgba(2, 6, 23, 0.72);
      padding: clamp(1.5rem, 4vw, 3rem);
      color: #cbd5e1;
    }

    .home-hero-loading {
      display: grid;
      align-content: center;
      gap: 1rem;
    }

    .home-hero-loading span {
      display: block;
      height: 1rem;
      background: rgba(148, 163, 184, 0.15);
    }

    .home-hero-loading span:first-child {
      width: 56%;
      height: 3.5rem;
    }

    .home-hero-loading span:nth-child(2) {
      width: 42%;
    }

    .home-hero-loading span:last-child {
      width: 28%;
    }

    @media (min-width: 64rem) {
      .home-hero-story {
        grid-template-columns: minmax(25rem, 0.82fr) minmax(33rem, 1.18fr);
      }
    }

    @media (max-width: 63.99rem) {
      .home-hero-backdrop::after {
        background:
          linear-gradient(180deg, rgba(2, 8, 17, 0.38) 0%, rgba(2, 8, 17, 0.72) 48%, rgba(2, 8, 17, 0.9) 100%),
          linear-gradient(90deg, rgba(2, 8, 17, 0.68), rgba(2, 8, 17, 0.46));
      }

      .home-hero-copy {
        order: 2;
      }

      .home-hero-panel {
        order: 1;
      }

      .home-hero-post-title {
        max-width: 16ch;
      }
    }

    @media (max-width: 39.99rem) {
      .home-hero-shell {
        padding-top: 1rem;
      }

      .home-hero-story {
        gap: 1.35rem;
      }

      .home-hero-panel {
        width: calc(100% + 2rem);
        margin-inline: -1rem;
        border-inline: 0;
        aspect-ratio: 4 / 3;
      }

      .home-hero-post-title {
        font-size: clamp(2.35rem, 12vw, 3.55rem);
      }

      .home-hero-post-excerpt {
        -webkit-line-clamp: 5;
      }

      .home-hero-actions {
        align-items: stretch;
      }

      .home-hero-read-more {
        flex: 1 1 12rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .home-hero-read-more,
      .home-hero-post-control,
      .home-hero-panel-image {
        transition: none;
      }

      .home-hero-read-more:hover,
      .home-hero-panel:hover .home-hero-panel-image,
      .home-hero-panel:focus-visible .home-hero-panel-image {
        transform: none;
      }
    }
  `],
})
export class HomeArticleHeroComponent {
  private readonly blogPostFeed = inject(HomeBlogPostFeedService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly homepageHeroRepository = inject(HomepageHeroRepositoryService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly topicHubRepository = inject(TopicHubRepositoryService);

  protected readonly allPublishedPosts = this.blogPostFeed.publishedPosts;
  protected readonly heroSettings = computed(() => {
    const settings = this.homepageHeroRepository.settings();

    return settings.status === 'published' ? settings : DEFAULT_HOMEPAGE_HERO_SETTINGS;
  });
  protected readonly heroPostCandidates = computed(() => (
    selectHomepageHeroPosts(this.allPublishedPosts(), this.heroSettings())
  ));
  protected readonly heroPost = computed(() => this.heroPostCandidates()[0] ?? null);
  protected readonly activeHeroPostIndex = signal(0);
  private readonly activeHeroPostId = signal('');
  protected readonly activeHeroPost = computed(() => {
    const posts = this.heroPostCandidates();
    const activePostId = this.activeHeroPostId();

    return posts.find(post => post.id === activePostId)
      ?? posts[this.activeHeroPostIndex()]
      ?? this.heroPost();
  });
  protected readonly previousHeroPost = computed(() => (
    this.heroPostCandidates()[this.activeHeroPostIndex() - 1] ?? null
  ));
  protected readonly nextHeroPost = computed(() => (
    this.heroPostCandidates()[this.activeHeroPostIndex() + 1] ?? null
  ));
  protected readonly hasPreviousHeroPost = computed(() => this.previousHeroPost() !== null);
  protected readonly hasNextHeroPost = computed(() => this.nextHeroPost() !== null);
  protected readonly heroPostRotationPaused = signal(false);
  private readonly heroFocusWithin = signal(false);
  private readonly pageVisible = signal(true);
  private readonly failedMediaUrls = signal<ReadonlySet<string>>(new Set<string>());
  // Keep backdrop and panel roles independent so a text-heavy cover is blurred only behind the semantic hero copy.
  private readonly heroMediaSet = computed<EditorialMediaSet>(() => {
    const post = this.activeHeroPost();
    const settings = this.heroSettings();
    const slides = getPublishedHomepageHeroSlides(settings);
    const fallbackSlides = slides.length > 0
      ? slides
      : getPublishedHomepageHeroSlides(DEFAULT_HOMEPAGE_HERO_SETTINGS);
    const postBackground = post?.backgroundImage?.trim() ?? '';
    const postCover = post ? postImage(post).trim() : '';
    const orderedSlides = this.orderFallbackSlides(fallbackSlides, post);
    const background: EditorialMedia | null = postBackground
      ? {
        url: postBackground,
        alt: '',
        objectPosition: '50% 50%',
        source: 'background',
      }
      : null;
    const postMedia: EditorialMedia | null = postCover
      ? {
        url: postCover,
        alt: post ? `${post.title} cover image` : '',
        objectPosition: '50% 50%',
        source: 'post',
      }
      : null;
    const slideMedia = orderedSlides.map<EditorialMedia>(slide => ({
      url: slide.imageUrl.trim(),
      alt: '',
      objectPosition: this.slideObjectPosition(slide),
      source: 'slide',
    }));

    return {background, post: postMedia, slides: slideMedia};
  });
  protected readonly heroBackdropMedia = computed<EditorialMedia | null>(() => {
    if (!this.activeHeroPost()) {
      return null;
    }

    const media = this.heroMediaSet();

    return this.firstWorkingMedia([
      media.background,
      media.post,
      ...media.slides,
    ]);
  });
  protected readonly heroPanelMedia = computed<EditorialMedia | null>(() => {
    const media = this.heroMediaSet();

    return this.firstWorkingMedia([
      media.post,
      media.background,
      ...media.slides,
    ]);
  });
  private activeHeroLeadPostId = '';
  private readonly pendingHeroPostControlFocus = signal<'previous' | 'next' | null>(null);
  private readonly previousHeroPostControl = viewChild<ElementRef<HTMLButtonElement>>('previousHeroPostControl');
  private readonly nextHeroPostControl = viewChild<ElementRef<HTMLButtonElement>>('nextHeroPostControl');
  protected readonly topicHubs = toSignal(
    this.topicHubRepository.getPublishedTopicHubs$(),
    {initialValue: this.topicHubRepository.getPublishedTopicHubs()}
  );
  protected readonly blogIsLoading = this.blogPostFeed.isLoading;
  protected readonly blogLoadError = this.blogPostFeed.loadError;
  protected readonly pathNames = PATH_NAMES;

  constructor() {
    this.initializeHeroPostRotationEnvironment();
    this.keepActiveHeroPostInBounds();
    this.keepHeroPostNavigationFocus();
    this.resetFailedMediaWhenPostChanges();
    this.startHeroPostRotation();
  }

  protected postLabel(post: BlogPost): string {
    return post.subcategories?.[0] ?? post.categories[0] ?? post.tags[0] ?? 'Article';
  }

  protected postTopicLabel(post: BlogPost): string {
    return this.postTopic(post)?.theme.shortLabel ?? this.postLabel(post);
  }

  protected postThemeStyle(post: BlogPost): Record<string, string> {
    const topic = this.postTopic(post);

    return {
      '--home-hero-topic-accent': topic?.theme.accent ?? DEFAULT_TOPIC_ACCENT,
      '--home-hero-topic-accent-strong': topic?.theme.accentStrong ?? DEFAULT_TOPIC_ACCENT_STRONG,
      '--home-hero-topic-rgb': topic?.theme.accentRgb ?? DEFAULT_TOPIC_ACCENT_RGB,
    };
  }

  protected postExcerpt(post: BlogPost): string {
    return truncateText(post.excerpt, HERO_POST_EXCERPT_MAX_LENGTH);
  }

  protected readingMinutes(post: BlogPost): number {
    return createBlogReadingStats(post).readingMinutes;
  }

  protected showPreviousHeroPost(): void {
    const targetIndex = Math.max(0, this.activeHeroPostIndex() - 1);

    this.setActiveHeroPost(targetIndex);

    if (targetIndex === 0) {
      this.pendingHeroPostControlFocus.set('next');
    }
  }

  protected showNextHeroPost(): void {
    const lastPostIndex = Math.max(0, this.heroPostCandidates().length - 1);
    const targetIndex = Math.min(lastPostIndex, this.activeHeroPostIndex() + 1);

    this.setActiveHeroPost(targetIndex);

    if (targetIndex === lastPostIndex) {
      this.pendingHeroPostControlFocus.set('previous');
    }
  }

  protected toggleHeroPostRotation(): void {
    this.heroPostRotationPaused.update(paused => !paused);
  }

  protected setHeroFocusWithin(hasFocus: boolean): void {
    this.heroFocusWithin.set(hasFocus);
  }

  protected handleHeroFocusOut(event: FocusEvent): void {
    const section = event.currentTarget as HTMLElement | null;
    const nextTarget = event.relatedTarget;

    if (section && nextTarget instanceof Node && section.contains(nextTarget)) {
      return;
    }

    this.heroFocusWithin.set(false);
  }

  protected handleHeroMediaError(imageUrl: string): void {
    this.failedMediaUrls.update(urls => new Set([...urls, imageUrl]));
  }

  private firstWorkingMedia(candidates: readonly (EditorialMedia | null)[]): EditorialMedia | null {
    const failedUrls = this.failedMediaUrls();
    const visitedUrls = new Set<string>();

    for (const candidate of candidates) {
      if (!candidate?.url || visitedUrls.has(candidate.url) || failedUrls.has(candidate.url)) {
        continue;
      }

      visitedUrls.add(candidate.url);
      return candidate;
    }

    return null;
  }

  private slideObjectPosition(slide: HomepageHeroSlide): string {
    return `${slide.focalPointX}% ${slide.focalPointY}%`;
  }

  private orderFallbackSlides(
    slides: readonly HomepageHeroSlide[],
    post: BlogPost | null
  ): readonly HomepageHeroSlide[] {
    if (slides.length < 2) {
      return slides;
    }

    // A stable per-post offset supplies variety without making the fallback change between visits.
    const seed = post?.id.trim() || post?.slug.trim() || post?.title.trim() || 'homepage-feature';
    const startIndex = stableStringHash(seed) % slides.length;

    return [
      ...slides.slice(startIndex),
      ...slides.slice(0, startIndex),
    ];
  }

  private postTopic(post: BlogPost): TopicHub | null {
    return this.topicHubs().find(topicHub => postMatchesHubTerms(post, topicHub.terms)) ?? null;
  }

  private initializeHeroPostRotationEnvironment(): void {
    if (!this.isBrowser) {
      return;
    }

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePageVisibility = () => this.pageVisible.set(this.document.visibilityState !== 'hidden');
    const pauseForReducedMotion = () => {
      if (reducedMotionQuery.matches) {
        this.heroPostRotationPaused.set(true);
      }
    };

    updatePageVisibility();
    pauseForReducedMotion();
    this.document.addEventListener('visibilitychange', updatePageVisibility);
    reducedMotionQuery.addEventListener('change', pauseForReducedMotion);
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('visibilitychange', updatePageVisibility);
      reducedMotionQuery.removeEventListener('change', pauseForReducedMotion);
    });
  }

  private startHeroPostRotation(): void {
    effect(onCleanup => {
      const postCount = this.heroPostCandidates().length;
      const activeIndex = this.activeHeroPostIndex();
      const shouldRotate = this.isBrowser
        && postCount > 1
        && this.pageVisible()
        && !this.heroPostRotationPaused()
        && !this.heroFocusWithin();

      if (!shouldRotate) {
        return;
      }

      // A one-shot timer restarts whenever the active index or a pause condition changes.
      const timeoutId = window.setTimeout(() => {
        this.setActiveHeroPost((activeIndex + 1) % postCount);
      }, HERO_POST_ROTATION_INTERVAL_MS);

      onCleanup(() => window.clearTimeout(timeoutId));
    });
  }

  private resetFailedMediaWhenPostChanges(): void {
    let activePostId = '';

    effect(() => {
      const nextPostId = this.activeHeroPost()?.id ?? '';

      if (nextPostId === activePostId) {
        return;
      }

      activePostId = nextPostId;
      this.failedMediaUrls.set(new Set<string>());
    });
  }

  private keepActiveHeroPostInBounds(): void {
    effect(() => {
      const posts = this.heroPostCandidates();
      const leadPostId = posts[0]?.id ?? '';
      const lastPostIndex = Math.max(0, posts.length - 1);
      const activeIndex = this.activeHeroPostIndex();
      const activePostId = this.activeHeroPostId();

      if (leadPostId !== this.activeHeroLeadPostId) {
        this.activeHeroLeadPostId = leadPostId;

        if (activeIndex !== 0) {
          this.activeHeroPostIndex.set(0);
        }

        if (activePostId !== leadPostId) {
          this.activeHeroPostId.set(leadPostId);
        }

        return;
      }

      const reconciledIndex = posts.findIndex(post => post.id === activePostId);

      if (reconciledIndex >= 0) {
        if (activeIndex !== reconciledIndex) {
          this.activeHeroPostIndex.set(reconciledIndex);
        }

        return;
      }

      const fallbackIndex = Math.min(activeIndex, lastPostIndex);
      const fallbackPostId = posts[fallbackIndex]?.id ?? '';

      if (activeIndex !== fallbackIndex) {
        this.activeHeroPostIndex.set(fallbackIndex);
      }

      if (activePostId !== fallbackPostId) {
        this.activeHeroPostId.set(fallbackPostId);
      }
    });
  }

  private keepHeroPostNavigationFocus(): void {
    effect(() => {
      const pendingFocus = this.pendingHeroPostControlFocus();
      const control = pendingFocus === 'previous'
        ? this.previousHeroPostControl()
        : pendingFocus === 'next'
          ? this.nextHeroPostControl()
          : undefined;

      if (!control) {
        return;
      }

      control.nativeElement.focus({preventScroll: true});
      this.pendingHeroPostControlFocus.set(null);
    });
  }

  private setActiveHeroPost(index: number): void {
    const post = this.heroPostCandidates()[index];

    if (!post) {
      return;
    }

    this.activeHeroPostIndex.set(index);
    this.activeHeroPostId.set(post.id);
  }
}

function truncateText(value: string, maximumLength: number): string {
  const normalizedValue = value.replace(/\s+/g, ' ').trim();

  if (normalizedValue.length <= maximumLength) {
    return normalizedValue;
  }

  const truncatedLength = Math.max(0, maximumLength - 3);
  const truncatedValue = normalizedValue.slice(0, truncatedLength + 1);
  const lastSpaceIndex = truncatedValue.lastIndexOf(' ');
  const shouldTrimToWord = lastSpaceIndex > truncatedLength * 0.62;
  const visibleValue = (shouldTrimToWord
      ? truncatedValue.slice(0, lastSpaceIndex)
      : normalizedValue.slice(0, truncatedLength)
  ).trimEnd();

  return `${visibleValue}...`;
}

function stableStringHash(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
