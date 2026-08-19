import {NgStyle} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, effect, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {map} from 'rxjs';

import {PATH_NAMES} from '../../app-route-paths';
import {SeoService} from '../../shared/seo/seo.service';
import {BlogPostListingComponent} from '../blog/components/post-listing/blog-post-listing.component';
import {BlogRepositoryService} from '../blog/services/blog-repository.service';
import {YouTubeLatestVideosComponent} from '../youtube/components/latest-videos/youtube-latest-videos.component';
import {TopicGuideComponent} from './components/topic-guide/topic-guide.component';
import {TopicHubRepositoryService} from './services/topic-hub-repository.service';
import {
  createTopicHubSeoMetadata,
  findTopicHubBySlug,
  resolveTopicHubHeroImage,
  resolveTopicHubPageCopy,
  TOPIC_HUBS,
  TopicHub,
} from './topic-hubs.data';
import {postMatchesTopicHub} from './utils/topic-post-matching.util';

@Component({
  selector: 'app-topic-hub',
  imports: [
    NgStyle,
    RouterLink,
    BlogPostListingComponent,
    TopicGuideComponent,
    YouTubeLatestVideosComponent,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="topic-hub-page" [ngStyle]="topicThemeStyle(hub())">
      <div class="topic-hub-grid" aria-hidden="true"></div>

      <section class="topic-hub-shell">
        <nav class="topic-hub-breadcrumb" aria-label="Topic navigation">
          <a routerLink="/">Home</a>
          <span aria-hidden="true">/</span>
          <span>Topics</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{{ hub().theme.shortLabel }}</span>
        </nav>

        <header class="topic-hub-hero">
          <div class="topic-hub-hero-copy">
            <h1>{{ hub().title }}</h1>
            <p>{{ hub().summary }}</p>

            <div class="topic-hub-actions">
              <a
                [attr.href]="topicSectionHref('topic-posts')"
                class="topic-hub-action topic-hub-action-primary"
                (click)="handleTopicSectionClick($event, 'topic-posts')"
              >
                Browse {{ hub().theme.shortLabel }} posts
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M5 12h14"></path>
                  <path d="m14 6 6 6-6 6"></path>
                </svg>
              </a>
              <a
                [attr.href]="topicSectionHref('topic-guide')"
                class="topic-hub-action topic-hub-action-secondary"
                (click)="handleTopicSectionClick($event, 'topic-guide')"
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

          @if (heroImage(); as image) {
            <figure class="topic-hub-artwork">
              <img
                [src]="image.src"
                [alt]="image.alt"
                [attr.width]="image.width"
                [attr.height]="image.height"
                [style.object-position]="image.objectPosition || 'center'"
                fetchpriority="high"
              >
            </figure>
          }
        </header>

        <section id="topic-posts" class="topic-hub-section topic-hub-featured" aria-labelledby="topic-featured-heading">
          <header class="topic-hub-section-heading topic-hub-section-heading-row">
            <div>
              <h2 id="topic-featured-heading">{{ pageCopy().featuredHeading }}</h2>
              <p>{{ pageCopy().featuredDescription }}</p>
            </div>
            <a
              [routerLink]="['/', pathNames.BLOG]"
              [queryParams]="{topic: hub().slug}"
              class="topic-hub-text-link"
            >
              View all posts
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M5 12h14"></path>
                <path d="m14 6 6 6-6 6"></path>
              </svg>
            </a>
          </header>

          <app-blog-post-listing
            [posts]="featuredPosts()"
            layout="fan"
            [loading]="isLoading()"
            [error]="loadError()"
            [headingLevel]="3"
            [showTags]="false"
            [appearance]="topicAppearance()"
            [regionLabel]="pageCopy().featuredHeading"
            [emptyTitle]="'No ' + hub().theme.shortLabel + ' posts yet'"
            emptyMessage="The topic page is ready for the next published article."
          ></app-blog-post-listing>
        </section>

        @if (!isLoading() && !loadError() && additionalPosts().length > 0) {
          <section class="topic-hub-section topic-hub-archive" aria-labelledby="topic-archive-heading">
            <header class="topic-hub-section-heading">
              <h2 id="topic-archive-heading">{{ pageCopy().archiveHeading }}</h2>
              <p>{{ pageCopy().archiveDescription }}</p>
            </header>

            <app-blog-post-listing
              [posts]="additionalPosts()"
              layout="list"
              [headingLevel]="3"
              [showTags]="false"
              [appearance]="topicAppearance()"
              [regionLabel]="pageCopy().archiveHeading"
            ></app-blog-post-listing>
          </section>
        }

        @if (hub().slug === 'drones-fpv') {
          <app-youtube-latest-videos
            class="topic-hub-youtube"
            channel="captain-colin"
            [maxResults]="3"
            sectionId="topic-drones-youtube"
            eyebrow="Captain Colin on YouTube"
            heading="Watch the flights behind the field notes."
            description="See the newest FPV flights, Florida locations, and drone experiments, then subscribe for the next pack."
            analyticsSourceComponent="topic_drones_youtube"
          ></app-youtube-latest-videos>
        }

        <section id="topic-guide" class="topic-hub-section topic-hub-guide-section" aria-label="About this topic">
          <app-topic-guide [hub]="hub()"></app-topic-guide>
        </section>

        <section class="topic-hub-section topic-hub-related" aria-labelledby="topic-related-heading">
          <header class="topic-hub-section-heading topic-hub-section-heading-row">
            <div>
              <h2 id="topic-related-heading">Keep exploring</h2>
              <p>The same reading patterns and visual language carry across every topic.</p>
            </div>
          </header>

          <nav class="topic-hub-related-grid" aria-label="Related topics">
            @for (relatedHub of relatedHubs(); track relatedHub.slug) {
              <a
                [routerLink]="['/', pathNames.TOPICS, relatedHub.slug]"
                class="topic-hub-related-card"
                [ngStyle]="topicThemeStyle(relatedHub)"
              >
                @if (relatedHeroImage(relatedHub); as image) {
                  <span class="topic-hub-related-media" aria-hidden="true">
                    <img
                      [src]="image.src"
                      alt=""
                      [attr.width]="image.width"
                      [attr.height]="image.height"
                      [style.object-position]="image.objectPosition || 'center'"
                      loading="lazy"
                    >
                  </span>
                }
                <span class="topic-hub-related-copy">
                  <strong>{{ relatedHub.title }}</strong>
                  <span>{{ relatedHub.description }}</span>
                </span>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M5 12h14"></path>
                  <path d="m14 6 6 6-6 6"></path>
                </svg>
              </a>
            }
          </nav>
        </section>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
    }

    .topic-hub-page {
      --topic-accent-readable: var(--topic-accent-strong);
      position: relative;
      min-height: 100vh;
      overflow: hidden;
      isolation: isolate;
      background: var(--site-bg);
      color: var(--site-text);
      padding-block: clamp(2.5rem, 6vw, 5.5rem);
    }

    .topic-hub-page::before {
      content: '';
      position: absolute;
      z-index: -2;
      top: 0;
      left: 50%;
      width: min(92rem, 100%);
      height: 34rem;
      transform: translateX(-50%);
      background: radial-gradient(circle at 72% 28%, rgb(var(--topic-accent-rgb) / 0.1), transparent 32rem);
      pointer-events: none;
    }

    .topic-hub-grid {
      position: absolute;
      z-index: -1;
      inset: 0;
      background-image:
        linear-gradient(rgb(var(--topic-accent-rgb) / 0.055) 1px, transparent 1px),
        linear-gradient(90deg, rgb(var(--topic-accent-rgb) / 0.055) 1px, transparent 1px);
      background-size: 6.5rem 6.5rem;
      mask-image: linear-gradient(to bottom, black, transparent 42rem);
      pointer-events: none;
    }

    .topic-hub-shell {
      width: min(100% - 2rem, 80rem);
      margin-inline: auto;
    }

    .topic-hub-breadcrumb {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.6rem;
      color: var(--site-muted);
      font-family: var(--font-accent);
      font-size: 0.92rem;
    }

    .topic-hub-breadcrumb a {
      color: var(--site-text);
      text-decoration: none;
    }

    .topic-hub-breadcrumb a:hover,
    .topic-hub-breadcrumb a:focus-visible {
      color: var(--topic-accent-readable);
    }

    .topic-hub-breadcrumb [aria-current='page'] {
      color: var(--topic-accent-readable);
    }

    .topic-hub-hero {
      display: grid;
      gap: clamp(2rem, 5vw, 4.5rem);
      align-items: center;
      padding-block: clamp(2.25rem, 6vw, 5.75rem);
    }

    .topic-hub-hero-copy {
      min-width: 0;
    }

    .topic-hub-hero-copy h1 {
      max-width: 46rem;
      color: var(--site-heading);
      font-family: var(--font-heading);
      font-size: clamp(2.65rem, 4.2vw, 3.9rem);
      font-weight: 650;
      hyphens: none;
      letter-spacing: -0.045em;
      line-height: 0.98;
      overflow-wrap: normal;
      word-break: normal;
    }

    .topic-hub-hero-copy > p {
      max-width: 42rem;
      margin-top: 1.45rem;
      color: var(--site-muted);
      font-size: clamp(1.05rem, 2vw, 1.28rem);
      line-height: 1.7;
    }

    .topic-hub-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.9rem;
      margin-top: 1.8rem;
    }

    .topic-hub-action,
    .topic-hub-text-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.7rem;
      min-height: 3.15rem;
      font-family: var(--font-accent);
      font-size: 0.96rem;
      font-weight: 600;
      text-decoration: none;
      transition: border-color 180ms ease, background-color 180ms ease, color 180ms ease, transform 180ms ease;
    }

    .topic-hub-action {
      border: 1px solid rgb(var(--topic-accent-rgb) / 0.58);
      padding: 0.78rem 1rem;
    }

    .topic-hub-action-primary {
      background: var(--topic-accent);
      color: #03131d;
    }

    .topic-hub-action-secondary {
      background: color-mix(in srgb, var(--site-panel) 74%, transparent);
      color: var(--site-text);
    }

    .topic-hub-action:hover,
    .topic-hub-action:focus-visible,
    .topic-hub-text-link:hover,
    .topic-hub-text-link:focus-visible {
      color: var(--topic-accent-readable);
      transform: translateY(-0.1rem);
    }

    .topic-hub-action-primary:hover,
    .topic-hub-action-primary:focus-visible {
      background: var(--topic-accent-strong);
      color: #03131d;
    }

    .topic-hub-action:focus-visible,
    .topic-hub-text-link:focus-visible,
    .topic-hub-related-card:focus-visible {
      outline: 2px solid var(--topic-accent-readable);
      outline-offset: 0.24rem;
    }

    .topic-hub-action svg,
    .topic-hub-text-link svg,
    .topic-hub-related-card > svg {
      width: 1.15rem;
      height: 1.15rem;
      flex: 0 0 auto;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .topic-hub-artwork {
      position: relative;
      aspect-ratio: 16 / 9;
      overflow: hidden;
      border: 1px solid rgb(var(--topic-accent-rgb) / 0.48);
      background: var(--site-panel);
      box-shadow: 0 2rem 5rem rgb(var(--topic-accent-rgb) / 0.08);
    }

    .topic-hub-artwork img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .topic-hub-section {
      scroll-margin-top: calc(var(--site-header-sticky-height) + 1.5rem);
      border-top: 1px solid var(--site-border);
      padding-block: clamp(3rem, 7vw, 5.75rem);
    }

    .topic-hub-section-heading {
      max-width: 48rem;
      margin-bottom: clamp(1.6rem, 4vw, 2.5rem);
    }

    .topic-hub-section-heading-row {
      display: flex;
      max-width: none;
      align-items: end;
      justify-content: space-between;
      gap: 1.5rem;
    }

    .topic-hub-section-heading h2 {
      color: var(--site-heading);
      font-family: var(--font-heading);
      font-size: clamp(2rem, 4vw, 3.2rem);
      font-weight: 620;
      letter-spacing: -0.035em;
      line-height: 1.05;
    }

    .topic-hub-section-heading p {
      max-width: 44rem;
      margin-top: 0.8rem;
      color: var(--site-muted);
      font-size: 1.04rem;
      line-height: 1.65;
    }

    .topic-hub-text-link {
      flex: 0 0 auto;
      min-height: auto;
      border-bottom: 1px solid rgb(var(--topic-accent-rgb) / 0.65);
      color: var(--topic-accent-readable);
      padding-block: 0.4rem;
    }

    .topic-hub-archive {
      padding-top: clamp(2.75rem, 6vw, 4.75rem);
    }

    .topic-hub-youtube {
      display: block;
      border-top: 1px solid var(--site-border);
    }

    .topic-hub-guide-section {
      background: color-mix(in srgb, var(--site-section) 48%, transparent);
      margin-inline: calc((100vw - min(100vw - 2rem, 80rem)) / -2);
      padding-inline: max(1rem, calc((100vw - 80rem) / 2));
    }

    .topic-hub-related-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr));
      gap: 1rem;
    }

    .topic-hub-related-card {
      display: grid;
      grid-template-rows: auto 1fr auto;
      min-width: 0;
      border: 1px solid var(--site-border);
      background: var(--site-panel-soft);
      color: var(--site-text);
      text-decoration: none;
      transition: border-color 180ms ease, transform 180ms ease;
    }

    .topic-hub-related-card:hover,
    .topic-hub-related-card:focus-visible {
      border-color: rgb(var(--topic-accent-rgb) / 0.72);
      transform: translateY(-0.18rem);
    }

    .topic-hub-related-media {
      display: block;
      aspect-ratio: 16 / 9;
      overflow: hidden;
      border-bottom: 1px solid var(--site-border);
      background: var(--site-section);
    }

    .topic-hub-related-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 260ms ease;
    }

    .topic-hub-related-card:hover .topic-hub-related-media img {
      transform: scale(1.025);
    }

    .topic-hub-related-copy {
      display: grid;
      gap: 0.55rem;
      padding: 1rem 1rem 0;
    }

    .topic-hub-related-copy strong {
      color: var(--site-heading);
      font-family: var(--font-subheading);
      font-size: 1.08rem;
      font-weight: 600;
      line-height: 1.3;
    }

    .topic-hub-related-copy > span {
      color: var(--site-muted);
      font-size: 0.94rem;
      line-height: 1.5;
    }

    .topic-hub-related-card > svg {
      justify-self: end;
      margin: 1rem;
      color: var(--topic-accent-readable);
    }

    :host-context(.light) .topic-hub-page {
      --topic-accent-readable: color-mix(in srgb, var(--topic-accent) 52%, #0f172a);
    }

    :host-context(.light) .topic-hub-artwork {
      box-shadow: 0 2rem 4rem rgba(15, 23, 42, 0.11);
    }

    @media (min-width: 920px) {
      .topic-hub-shell {
        width: min(100% - 3rem, 80rem);
      }

      .topic-hub-hero {
        grid-template-columns: minmax(0, 0.88fr) minmax(28rem, 1.12fr);
      }
    }

    @media (max-width: 680px) {
      .topic-hub-page {
        padding-top: 2rem;
      }

      .topic-hub-grid {
        background-size: 4.5rem 4.5rem;
      }

      .topic-hub-actions {
        display: grid;
        gap: 0;
      }

      .topic-hub-action {
        justify-content: space-between;
        border-width: 0 0 1px;
        background: transparent;
        color: var(--topic-accent-readable);
        padding: 0.95rem 0;
      }

      .topic-hub-action-primary:hover,
      .topic-hub-action-primary:focus-visible {
        background: transparent;
        color: var(--topic-accent-readable);
      }

      .topic-hub-section-heading-row {
        align-items: start;
        flex-direction: column;
      }

      .topic-hub-guide-section {
        margin-inline: -1rem;
        padding-inline: 1rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .topic-hub-action,
      .topic-hub-text-link,
      .topic-hub-related-card,
      .topic-hub-related-media img {
        transition: none;
      }
    }
  `],
})
export class TopicHubComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly topicHubRepository = inject(TopicHubRepositoryService);
  private readonly seo = inject(SeoService);

  protected readonly pathNames = PATH_NAMES;
  protected readonly posts = toSignal(this.blogRepository.getPublishedPosts$(), {initialValue: []});
  protected readonly isLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly loadError = toSignal(this.blogRepository.error$, {initialValue: null});
  private readonly topicsLoading = toSignal(this.topicHubRepository.loading$, {initialValue: true});
  protected readonly topicHubs = toSignal(
    this.topicHubRepository.getPublishedTopicHubs$(),
    {initialValue: this.topicHubRepository.getPublishedTopicHubs()}
  );
  protected readonly topicSlug = toSignal(
    this.route.paramMap.pipe(map(params => params.get('slug') ?? '')),
    {initialValue: this.route.snapshot.paramMap.get('slug') ?? ''}
  );
  protected readonly hub = computed<TopicHub>(() => (
    findTopicHubBySlug(this.topicSlug(), this.topicHubs())
      ?? this.topicHubs()[0]
      ?? this.topicHubRepository.getPublishedTopicHubs()[0]
      ?? TOPIC_HUBS[0]
  ));
  protected readonly heroImage = computed(() => resolveTopicHubHeroImage(this.hub()));
  protected readonly pageCopy = computed(() => resolveTopicHubPageCopy(this.hub()));
  protected readonly topicAppearance = computed(() => ({
    label: this.hub().theme.shortLabel,
    accent: this.hub().theme.accent,
    accentStrong: this.hub().theme.accentStrong,
    accentRgb: this.hub().theme.accentRgb,
  }));
  protected readonly topicPosts = computed(() => {
    const matchingPosts = this.posts().filter(post => postMatchesTopicHub(post, this.hub()));
    const featuredPosts = matchingPosts.filter(post => post.featured);
    const remainingPosts = matchingPosts.filter(post => !post.featured);

    return [...featuredPosts, ...remainingPosts].slice(0, 12);
  });
  protected readonly featuredPosts = computed(() => this.topicPosts().slice(0, 3));
  protected readonly additionalPosts = computed(() => this.topicPosts().slice(3));
  protected readonly relatedHubs = computed(() => (
    this.topicHubs().filter(topicHub => topicHub.slug !== this.hub().slug)
  ));

  private readonly applyTopicSeo = effect(() => {
    this.seo.apply(createTopicHubSeoMetadata(this.hub()));
  });
  private readonly redirectMissingTopic = effect(() => {
    const slug = this.topicSlug();
    const resolvedTopic = findTopicHubBySlug(slug, this.topicHubs());

    if (!this.topicsLoading() && slug && !resolvedTopic) {
      void this.router.navigateByUrl('/404', {replaceUrl: true});
      return;
    }

    if (!this.topicsLoading() && resolvedTopic && resolvedTopic.slug !== slug) {
      void this.router.navigate(
        ['/', this.pathNames.TOPICS, resolvedTopic.slug],
        {replaceUrl: true}
      );
    }
  });

  protected topicThemeStyle(topicHub: TopicHub): Record<string, string> {
    return {
      '--topic-accent': topicHub.theme.accent,
      '--topic-accent-strong': topicHub.theme.accentStrong,
      '--topic-accent-rgb': topicHub.theme.accentRgb,
      '--site-accent': topicHub.theme.accent,
      '--site-accent-strong': topicHub.theme.accentStrong,
      '--site-accent-rgb': topicHub.theme.accentRgb,
    };
  }

  protected relatedHeroImage(topicHub: TopicHub) {
    return resolveTopicHubHeroImage(topicHub);
  }

  protected topicSectionHref(fragment: string): string {
    return `/${this.pathNames.TOPICS}/${this.hub().slug}#${fragment}`;
  }

  protected handleTopicSectionClick(event: MouseEvent, fragment: string): void {
    if (!this.isPrimaryNavigationClick(event)) {
      return;
    }

    event.preventDefault();

    void this.router.navigate(
      ['/', this.pathNames.TOPICS, this.hub().slug],
      {fragment}
    ).then(() => this.scrollToTopicSection(fragment));
  }

  private isPrimaryNavigationClick(event: MouseEvent): boolean {
    return event.button === 0
      && !event.metaKey
      && !event.ctrlKey
      && !event.shiftKey
      && !event.altKey;
  }

  private scrollToTopicSection(fragment: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    window.setTimeout(() => {
      const target = document.getElementById(fragment);

      if (!target) {
        return;
      }

      target.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  }
}
