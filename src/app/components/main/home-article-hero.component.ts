import {DatePipe, NgStyle} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {BlogPost} from '../../features/blog/models/blog-post.model';
import {createBlogReadingStats} from '../../features/blog/utils/blog-reading.util';
import {TopicHubRepositoryService} from '../../features/topics/services/topic-hub-repository.service';
import type {TopicHub} from '../../features/topics/topic-hubs.data';
import {HomeBlogPostFeedService} from './home-blog-post-feed.service';
import {postImage, postMatchesHubTerms} from './home-blog-section.utils';

const HERO_BACKGROUND_IMAGE = '/assets/images/backgrounds/colinmichaels-hero-background.webp';
export const HOME_ARTICLE_HERO_POST_LIMIT = 1;
const HERO_POST_LIMIT = HOME_ARTICLE_HERO_POST_LIMIT;
const HERO_POST_EXCERPT_MAX_LENGTH = 318;
const DEFAULT_TOPIC_ACCENT = '#22d3ee';
const DEFAULT_TOPIC_ACCENT_STRONG = '#67e8f9';
const DEFAULT_TOPIC_ACCENT_RGB = '34 211 238';

@Component({
  selector: 'app-home-article-hero',
  imports: [
    DatePipe,
    NgStyle,
    RouterLink,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section id="home-article-hero" class="home-article-hero" aria-labelledby="home-article-hero-heading">
      <img
        [src]="heroBackgroundImage"
        alt=""
        aria-hidden="true"
        class="home-hero-background-image"
        data-site-preload-image
        decoding="async"
        fetchpriority="high"
        width="1717"
        height="916"
      >
      <div class="home-hero-background-lines" aria-hidden="true"></div>

      <div class="home-hero-shell">
        <div class="home-hero-copy">
          <h1 id="home-article-hero-heading" class="home-hero-title">
            <span>A Life of Curiosity.</span>
            <span>A Journey of Growth.</span>
          </h1>
          <p class="home-hero-summary">
            Exploring the worlds of AI, technology, outdoor adventure, and personal development. Real experiences.
            Honest insights. Practical tools.
          </p>
          <div class="home-hero-actions">
            <a href="#blog" class="home-hero-action home-hero-action-primary">
              <span class="home-hero-action-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M12 4v14"></path>
                  <path d="m6.5 12.5 5.5 5.5 5.5-5.5"></path>
                </svg>
              </span>
              <span>Explore the Journey</span>
            </a>
            <a [routerLink]="['/', pathNames.BLOG]" class="home-hero-action home-hero-action-secondary">
              <span class="home-hero-action-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M6 4.75h12"></path>
                  <path d="M6 9.75h12"></path>
                  <path d="M6 14.75h8"></path>
                  <path d="M6 19.25h5"></path>
                </svg>
              </span>
              <span>See What's New</span>
            </a>
          </div>
        </div>

        <div class="home-hero-post-column">
          <p class="home-hero-posts-label">Latest from the journey</p>

          @if (blogLoadError(); as error) {
            <div class="home-hero-message" role="status">
              {{ error }}
            </div>
          } @else if (heroPosts().length > 0) {
            <div
              class="home-hero-posts"
              aria-label="Latest posts"
            >
              @for (post of heroPosts(); track post.id) {
                <a
                  [routerLink]="['/', pathNames.BLOG, post.slug]"
                  class="home-hero-panel"
                  [ngStyle]="postThemeStyle(post)"
                  [attr.aria-label]="'Read more: ' + post.title"
                >
                  <div class="home-hero-panel-content">
                    <span class="home-hero-panel-thumbnail">
                      <img
                        [src]="postImage(post)"
                        [alt]="post.title + ' thumbnail'"
                        class="home-hero-panel-image"
                        decoding="async"
                        loading="eager"
                      >
                    </span>
                    <div class="home-hero-panel-body">

                      <span class="home-hero-post-title">{{ post.title }}</span>
                      <span class="home-hero-post-excerpt">{{ postExcerpt(post) }}</span>
                      <span class="home-hero-meta-row">
                        <span class="home-hero-meta">
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M7 3.5v3"></path>
                            <path d="M17 3.5v3"></path>
                            <path d="M4.75 8.5h14.5"></path>
                            <rect x="4.75" y="5.5" width="14.5" height="14" rx="2"></rect>
                          </svg>
                          {{ (post.publishedAt || post.updatedAt) | date: 'MMM d, y':'UTC' }}
                        </span>
                        <span class="home-hero-meta">
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <circle cx="12" cy="12" r="8"></circle>
                            <path d="M12 7.75V12l3 2.25"></path>
                          </svg>
                          {{ readingMinutes(post) }} min read
                        </span>
                      </span>
                      <div class="flex justify-between">
                        <span class="home-hero-read-more">
                          Read more
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M5 12h13"></path>
                            <path d="m13 6 6 6-6 6"></path>
                          </svg>
                        </span>
                        <span class="home-hero-category">{{ postTopicLabel(post) }}</span>
                      </div>
                    </div>
                  </div>
                </a>
              }
            </div>
          } @else if (blogIsLoading()) {
            <div class="home-hero-posts" aria-hidden="true">
              <div class="home-hero-panel home-hero-panel-skeleton">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          } @else {
            <div class="home-hero-message" role="status">
              No published posts yet.
            </div>
          }
        </div>
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
      min-height: clamp(40rem, 82svh, 52rem);
      background: #020617;
      color: #f8fafc;
    }

    .home-hero-background-image {
      position: absolute;
      inset: 0;
      z-index: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      filter: saturate(0.95) contrast(1.04) brightness(0.82);
      opacity: 1;
      pointer-events: none;
    }

    .home-hero-background-lines {
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
      background-image: linear-gradient(rgba(148, 163, 184, 0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(148, 163, 184, 0.035) 1px, transparent 1px);
      background-size: 42px 42px, 42px 42px;
      mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0.65), transparent 58%);
      opacity: 0.9;
    }

    .home-hero-shell {
      position: relative;
      z-index: 3;
      display: grid;
      grid-template-columns: minmax(0, 0.92fr) minmax(35rem, 1.28fr);
      gap: clamp(2rem, 4vw, 4.5rem);
      align-items: center;
      width: min(100%, 96rem);
      min-height: clamp(40rem, 82svh, 52rem);
      margin-inline: auto;
      padding: clamp(3rem, 6vw, 5.75rem) clamp(1rem, 4vw, 3rem) clamp(3rem, 5vw, 4.75rem);
    }

    .home-hero-copy {
      max-width: 42rem;
      padding-top: clamp(1rem, 4vw, 3rem);
    }

    .home-hero-title {
      display: grid;
      gap: 0.08em;
      margin: 0;
      font-family: var(--font-heading);
      font-size: clamp(2.25rem, 3.1vw, 4.1rem);
      font-weight: 750;
      letter-spacing: 0;
      line-height: 1.01;
      text-shadow: 0 18px 44px rgba(0, 0, 0, 0.58);
    }

    .home-hero-title span {
      display: block;
    }

    .home-hero-summary {
      margin: clamp(1rem, 1.8vw, 1.45rem) 0 0;
      max-width: 39rem;
      color: rgba(248, 250, 252, 0.9);
      font-size: clamp(1rem, 1.08vw, 1.16rem);
      line-height: 1.62;
      text-wrap: pretty;
    }

    .home-hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-top: clamp(1rem, 1.4vw, 1.35rem);
    }

    .home-hero-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      min-height: 3.1rem;
      border: 1px solid rgba(255, 255, 255, 0.24);
      padding: 0.74rem 1.1rem;
      color: #ffffff;
      font-family: var(--font-accent);
      font-size: 0.86rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      transition: border-color 180ms ease,
      background 180ms ease,
      box-shadow 180ms ease,
      color 180ms ease;
    }

    .home-hero-action-primary {
      border-color: rgba(103, 232, 249, 0.78);
      background: rgba(34, 211, 238, 0.12);
      color: #cffafe;
      box-shadow: 0 18px 40px rgba(8, 145, 178, 0.16);
    }

    .home-hero-action-primary:hover,
    .home-hero-action-primary:focus-visible {
      background: #67e8f9;
      color: #082f49;
      box-shadow: 0 20px 44px rgba(8, 145, 178, 0.26);
    }

    .home-hero-action-secondary {
      background: rgba(2, 6, 23, 0.38);
      color: #f8fafc;
      backdrop-filter: blur(12px);
    }

    .home-hero-action-secondary:hover,
    .home-hero-action-secondary:focus-visible {
      border-color: rgba(103, 232, 249, 0.52);
      background: rgba(8, 47, 73, 0.42);
      color: #cffafe;
    }

    .home-hero-action-icon {
      display: inline-flex;
      width: 1.35rem;
      height: 1.35rem;
      align-items: center;
      justify-content: center;
      color: currentColor;
    }

    .home-hero-action-icon svg,
    .home-hero-meta svg,
    .home-hero-read-more svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.9;
    }

    .home-hero-post-column {
      min-width: 0;
    }

    .home-hero-posts-label {
      margin: 0 0 0.85rem 1rem;
      color: var(--site-text);
      font-family: var(--font-accent);
      font-size: 0.92rem;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .home-hero-posts {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 1rem;
      align-items: stretch;
    }

    .home-hero-panel {
      --home-hero-topic-accent: #22d3ee;
      --home-hero-topic-accent-strong: #67e8f9;
      --home-hero-topic-rgb: 34 211 238;

      position: relative;
      display: flex;
      min-width: 0;
      overflow: hidden;
      border: 1px solid rgb(var(--home-hero-topic-rgb) / 0.34);
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.44), transparent 34%),
      linear-gradient(180deg, rgb(var(--home-hero-topic-rgb) / 0.08), rgba(2, 6, 23, 0.46)),
      rgba(2, 6, 23, 0.72);
      color: #ffffff;
      text-decoration: none;
      transition: border-color 300ms ease;
    }

    .home-hero-panel:is(:hover, :focus-visible) {
      border-color: rgb(var(--home-hero-topic-rgb) / 0.8);
      box-shadow: 0 28px 70px rgb(var(--home-hero-topic-rgb) / 0.18);
    }

    .home-hero-panel-content {
      position: relative;
      z-index: 2;
      display: flex;
      min-height: 100%;
      width: 100%;
      flex: 1;
      flex-direction: column;
      justify-content: flex-start;
      text-shadow: 0 12px 28px rgba(0, 0, 0, 0.72);
    }

    .home-hero-panel-body {
      display: flex;
      flex: 1;
      flex-direction: column;
      padding: 1rem;
    }

    .home-hero-panel-thumbnail {
      position: relative;
      display: block;
      width: 100%;
      margin-bottom: 1rem;
      overflow: hidden;
    }

    .home-hero-panel-image {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      filter: saturate(0.95) contrast(1.04) brightness(0.86);
      transition: filter 300ms ease,
      transform 300ms ease;
    }

    .home-hero-panel:is(:hover, :focus-visible) .home-hero-panel-image {
      filter: saturate(1.05) contrast(1.06) brightness(0.92);
      transform: scale(1.03);
    }

    .home-hero-post-title {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      clip-path: inset(50%);
      white-space: nowrap;
    }

    .home-hero-post-excerpt {
      display: -webkit-box;
      margin-top: 0;
      overflow: hidden;
      color: #ffffff;
      font-size: 0.95rem;
      line-height: 1.45;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 4;
    }

    .home-hero-meta-row {
      display: grid;
      gap: 0.5rem;
      margin: 1rem 0;
      color: #f8fafc;
      font-family: var(--font-accent);
      font-size: 0.58rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .home-hero-meta {
      display: inline-flex;
      align-items: center;
      gap: 0.48rem;
    }

    .home-hero-meta svg {
      width: 1rem;
      height: 1rem;
    }


    .home-hero-category {
      display: inline-flex;
      align-self: flex-end;
      margin-bottom: 0.75rem;
      border-radius: 0.2rem;
      border: 1px solid rgb(var(--home-hero-topic-rgb) / 0.58);
      background: rgb(var(--home-hero-topic-rgb) / 0.18);
      color: var(--home-hero-topic-accent-strong);
      font-family: var(--font-accent);
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      line-height: 1;
      padding: 0.45rem 0.58rem;
      text-transform: uppercase;
      text-shadow: none;
    }

    .home-hero-read-more {
      display: inline-flex;
      width: fit-content;
      align-items: center;
      gap: 0.45rem;
      margin-top: auto;
      border: 1px solid var(--home-hero-topic-accent-strong);
      background: var(--home-hero-topic-accent-strong);
      overflow: hidden;
      padding: 0.62rem 0.78rem;
      color: #020617;
      font-family: var(--font-accent);
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      transition: background 180ms ease,
      color 180ms ease;
    }

    .home-hero-read-more svg {
      width: 1rem;
      height: 1rem;
    }

    .home-hero-panel:is(:hover, :focus-visible) .home-hero-read-more {
      background: var(--home-hero-topic-accent-strong);
      color: #020617;
    }

    .home-hero-message {
      border: 1px solid rgba(255, 255, 255, 0.16);
      background: rgba(2, 6, 23, 0.48);
      padding: 1rem;
      color: rgba(248, 250, 252, 0.86);
      backdrop-filter: blur(12px);
    }

    .home-hero-panel-skeleton {
      display: grid;
      align-content: end;
      gap: 0.8rem;
      padding: 1.4rem;
      background: linear-gradient(110deg, rgba(15, 23, 42, 0.9), rgba(51, 65, 85, 0.45), rgba(15, 23, 42, 0.9));
      background-size: 220% 100%;
      animation: home-hero-shimmer 1.6s ease-in-out infinite;
    }

    .home-hero-panel-skeleton span {
      display: block;
      height: 0.8rem;
      background: rgba(255, 255, 255, 0.18);
    }

    .home-hero-panel-skeleton span:first-child {
      width: 4.5rem;
      margin-bottom: 12rem;
    }

    .home-hero-panel-skeleton span:nth-child(2) {
      width: 80%;
      height: 1.35rem;
    }

    .home-hero-panel-skeleton span:last-child {
      width: 58%;
    }

    @keyframes home-hero-shimmer {
      0% {
        background-position: 0% 50%;
      }
      100% {
        background-position: -220% 50%;
      }
    }

    @media (max-width: 1180px) {
      .home-hero-shell {
        grid-template-columns: minmax(0, 0.9fr) minmax(30rem, 1.25fr);
        gap: 1.75rem;
      }

      .home-hero-post-excerpt {
        -webkit-line-clamp: 3;
      }
    }

    @media (max-width: 980px) {
      .home-article-hero,
      .home-hero-shell {
        min-height: auto;
      }

      .home-hero-shell {
        display: block;
        padding-block: 4rem 3rem;
      }

      .home-hero-copy {
        max-width: 44rem;
        padding-top: 0;
      }

      .home-hero-post-column {
        margin-top: 3rem;
      }

      .home-hero-posts-label {
        margin-left: 0;
      }

      .home-hero-posts {
        grid-auto-columns: min(19rem, 82vw);
        grid-auto-flow: column;
        grid-template-columns: auto;
        gap: 1rem;
        overflow-x: auto;
        overscroll-behavior-x: contain;
        padding: 0.25rem 1rem 1rem 0;
        scroll-snap-type: x mandatory;
        transform: none;
      }

      .home-hero-panel {
        min-height: 29rem;
        scroll-snap-align: start;
      }

      .home-hero-category {
        display: inline-flex;
        margin-bottom: 0.75rem;
      }

      .home-hero-post-excerpt {
        margin-top: 0;
      }

      .home-hero-meta-row {
        margin-top: 1.45rem;
      }

      .home-hero-read-more {
        margin-top: auto;
      }
    }

    @media (max-width: 640px) {
      .home-hero-title {
        font-size: clamp(2rem, 9vw, 3rem);
      }

      .home-hero-summary {
        font-size: 1rem;
        line-height: 1.62;
      }

      .home-hero-actions {
        display: grid;
      }

      .home-hero-action {
        width: 100%;
        justify-content: flex-start;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .home-hero-action,
      .home-hero-panel,
      .home-hero-panel-image,
      .home-hero-read-more,
      .home-hero-panel-skeleton {
        animation: none;
        transition: none;
      }
    }
  `],
})
export class HomeArticleHeroComponent {
  private readonly blogPostFeed = inject(HomeBlogPostFeedService);
  private readonly topicHubRepository = inject(TopicHubRepositoryService);

  protected readonly allPublishedPosts = this.blogPostFeed.publishedPosts;
  protected readonly heroPosts = computed(() => this.allPublishedPosts().slice(0, HERO_POST_LIMIT));
  protected readonly topicHubs = toSignal(
    this.topicHubRepository.getPublishedTopicHubs$(),
    {initialValue: this.topicHubRepository.getPublishedTopicHubs()}
  );
  protected readonly heroBackgroundImage = HERO_BACKGROUND_IMAGE;
  protected readonly blogIsLoading = this.blogPostFeed.isLoading;
  protected readonly blogLoadError = this.blogPostFeed.loadError;
  protected readonly pathNames = PATH_NAMES;

  protected postImage(post: BlogPost): string {
    return postImage(post);
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

  private postTopic(post: BlogPost): TopicHub | null {
    return this.topicHubs().find(topicHub => postMatchesHubTerms(post, topicHub.terms)) ?? null;
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
