import {DatePipe, DOCUMENT, isPlatformBrowser, NgOptimizedImage, NgStyle} from '@angular/common';
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
const DEFAULT_TOPIC_ACCENT = '#22d3ee';
const DEFAULT_TOPIC_ACCENT_STRONG = '#67e8f9';
const DEFAULT_TOPIC_ACCENT_RGB = '34 211 238';

@Component({
  selector: 'app-home-article-hero',
  imports: [
    DatePipe,
    NgOptimizedImage,
    NgStyle,
    RouterLink,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      id="home-article-hero"
      class="home-article-hero"
      aria-labelledby="home-article-hero-heading"
    >
      <div class="home-hero-slideshow" aria-hidden="true">
        @for (slide of heroSlides(); track slide.id; let slideIndex = $index; let first = $first) {
          <img
            [ngSrc]="slide.imageUrl"
            fill
            sizes="100vw"
            priority
            alt=""
            class="home-hero-background-image"
            [class.is-active]="slideIndex === activeSlideIndex()"
            [class.has-ken-burns]="slideHasKenBurns(slide)"
            [style.object-position]="slideObjectPosition(slide)"
            [style.transform-origin]="slideObjectPosition(slide)"
            [style.--home-hero-transition-duration]="heroTransitionDuration()"
            [style.--home-hero-ken-burns-duration]="heroKenBurnsDuration()"
            [style.--home-hero-ken-burns-delay]="slideKenBurnsDelay(slideIndex)"
            [style.--home-hero-ken-burns-x]="slideKenBurnsOffset(slide, 'x')"
            [style.--home-hero-ken-burns-y]="slideKenBurnsOffset(slide, 'y')"
            [attr.data-site-preload-image]="first ? '' : null"
            (error)="handleHeroBackgroundError(slide.imageUrl)"
          >
        }
      </div>
      <div class="home-hero-background-lines" aria-hidden="true"></div>

      <div class="home-hero-shell">
        <div class="home-hero-copy">
          <h1 id="home-article-hero-heading" class="home-hero-title">
            @for (line of heroHeadlineLines(); track line) {
              <span>{{ line }}</span>
            }
          </h1>
          <p class="home-hero-summary">
            {{ heroSettings().summary }}
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
          } @else if (activeHeroPost(); as post) {
            <div
              class="home-hero-posts"
              role="group"
              aria-label="Featured and recent posts"
            >
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

                    <h2 class="home-hero-post-title">{{ post.title }}</h2>
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
            </div>

            @if (hasPreviousHeroPost() || hasNextHeroPost()) {
              <div
                class="home-hero-post-controls"
                role="group"
                aria-label="Featured and recent post navigation"
              >
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
              </div>
            }
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

    .home-hero-slideshow {
      position: absolute;
      inset: 0;
      z-index: 0;
      overflow: hidden;
      pointer-events: none;
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
      opacity: 0;
      pointer-events: none;
      transform: scale(1.025) translate3d(0, 0, 0);
      transition: opacity var(--home-hero-transition-duration, 1200ms) cubic-bezier(0.4, 0, 0.2, 1);
      will-change: opacity, transform;
    }

    .home-hero-background-image.is-active {
      z-index: 1;
      opacity: 1;
    }

    .home-hero-background-image.has-ken-burns {
      animation: home-hero-ken-burns var(--home-hero-ken-burns-duration, 11000ms) ease-in-out
      var(--home-hero-ken-burns-delay, 0ms) infinite alternate both;
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
    .home-hero-read-more svg,
    .home-hero-post-control svg {
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

    .home-hero-post-controls {
      display: grid;
      grid-template-columns: 2.75rem minmax(5rem, auto) 2.75rem;
      gap: 0.75rem;
      align-items: center;
      justify-content: center;
      margin-top: 1rem;
    }

    .home-hero-post-control {
      display: inline-flex;
      width: 2.75rem;
      height: 2.75rem;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(103, 232, 249, 0.52);
      background: rgba(2, 6, 23, 0.68);
      color: #cffafe;
      cursor: pointer;
      backdrop-filter: blur(12px);
      transition: border-color 180ms ease,
      background 180ms ease,
      color 180ms ease,
      transform 180ms ease;
    }

    .home-hero-post-control:hover {
      border-color: #67e8f9;
      background: #67e8f9;
      color: #082f49;
      transform: translateY(-1px);
    }

    .home-hero-post-control:focus-visible {
      outline: 2px solid #67e8f9;
      outline-offset: 3px;
    }

    .home-hero-post-control svg {
      width: 1.2rem;
      height: 1.2rem;
    }

    .home-hero-post-control-previous {
      grid-column: 1;
    }

    .home-hero-post-position {
      grid-column: 2;
      color: rgba(248, 250, 252, 0.82);
      font-family: var(--font-accent);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-align: center;
    }

    .home-hero-post-control-next {
      grid-column: 3;
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
      aspect-ratio: 16 / 9;
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
      display: -webkit-box;
      margin: 0 0 0.55rem;
      overflow: hidden;
      color: #ffffff;
      font-family: var(--font-heading);
      font-size: clamp(1.15rem, 2vw, 1.45rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.2;
      text-wrap: balance;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .home-hero-post-excerpt {
      display: -webkit-box;
      margin-top: 0;
      overflow: hidden;
      color: #ffffff;
      font-size: 0.95rem;
      line-height: 1.45;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
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

    @keyframes home-hero-ken-burns {
      0% {
        transform: scale(1.022) translate3d(0, 0, 0);
      }
      100% {
        transform: scale(1.055) translate3d(
          var(--home-hero-ken-burns-x, 0.45%),
          var(--home-hero-ken-burns-y, -0.45%),
          0
        );
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
        padding-block: 1rem 2rem;
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
        grid-auto-flow: row;
        grid-template-columns: minmax(0, 1fr);
        gap: 1rem;
        overflow: visible;
        padding: 0.25rem 0 0;
        scroll-snap-type: none;
        transform: none;
      }

      .home-hero-panel {
        min-height: 29rem;
        scroll-snap-align: none;
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
      .home-hero-background-image,
      .home-hero-panel,
      .home-hero-panel-image,
      .home-hero-post-control,
      .home-hero-read-more,
      .home-hero-panel-skeleton {
        animation: none;
        transition: none;
      }

      .home-hero-background-image {
        transform: none;
      }
    }
  `],
})
export class HomeArticleHeroComponent {
  private readonly blogPostFeed = inject(HomeBlogPostFeedService);
  private readonly homepageHeroRepository = inject(HomepageHeroRepositoryService);
  private readonly topicHubRepository = inject(TopicHubRepositoryService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly allPublishedPosts = this.blogPostFeed.publishedPosts;
  protected readonly heroSettings = computed(() => {
    const settings = this.homepageHeroRepository.settings();

    return settings.status === 'published' ? settings : DEFAULT_HOMEPAGE_HERO_SETTINGS;
  });
  protected readonly heroHeadlineLines = computed(() => this.heroSettings().headlineLines);
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
  // Keep the backdrop tied to the resolved lead, not the card being browsed.
  private readonly postBackgroundImageUrl = computed(() => {
    if (!this.heroSettings().useFeaturedPostBackground) {
      return '';
    }

    return this.heroPost()?.backgroundImage?.trim() ?? '';
  });
  private readonly postBackgroundCandidateKey = computed(() => {
    const post = this.heroPost();
    const imageUrl = this.postBackgroundImageUrl();

    return post && imageUrl ? `${post.id}:${imageUrl}` : '';
  });
  private readonly failedPostBackgroundCandidateKey = signal('');
  private activePostBackgroundCandidateKey = '';
  private activeHeroLeadPostId = '';
  // Endpoint navigation removes the clicked arrow, so focus moves to the remaining control.
  private readonly pendingHeroPostControlFocus = signal<'previous' | 'next' | null>(null);
  private readonly previousHeroPostControl = viewChild<ElementRef<HTMLButtonElement>>('previousHeroPostControl');
  private readonly nextHeroPostControl = viewChild<ElementRef<HTMLButtonElement>>('nextHeroPostControl');
  protected readonly heroSlides = computed(() => {
    const post = this.heroPost();
    const backgroundImageUrl = this.postBackgroundImageUrl();
    const candidateKey = this.postBackgroundCandidateKey();

    if (post && backgroundImageUrl && candidateKey !== this.failedPostBackgroundCandidateKey()) {
      // Project the post background into the existing slide renderer without persisting it as CMS slideshow media.
      return [createPostBackgroundSlide(post, backgroundImageUrl)];
    }

    const slides = getPublishedHomepageHeroSlides(this.heroSettings());

    return slides.length > 0 ? slides : getPublishedHomepageHeroSlides(DEFAULT_HOMEPAGE_HERO_SETTINGS);
  });
  protected readonly heroTransitionMs = computed(() => {
    const transitionMs = this.heroSettings().transitionMs;
    const hasKenBurnsSlides = this.heroSlides().some(slide => slide.kenBurnsEnabled);

    return hasKenBurnsSlides ? Math.max(transitionMs, 1400) : transitionMs;
  });
  protected readonly heroTransitionDuration = computed(() => `${this.heroTransitionMs()}ms`);
  protected readonly heroKenBurnsDuration = computed(() => {
    const settings = this.heroSettings();

    return `${Math.max(11000, settings.intervalMs + this.heroTransitionMs() + 2500)}ms`;
  });
  protected readonly activeSlideIndex = signal(0);
  private readonly pageVisible = signal(true);
  private readonly reducedMotion = signal(false);
  private readonly shouldRotateSlides = computed(() => {
    const settings = this.heroSettings();

    return settings.slideshowEnabled
      && this.heroSlides().length > 1
      && this.pageVisible()
      && !this.reducedMotion();
  });
  protected readonly topicHubs = toSignal(
    this.topicHubRepository.getPublishedTopicHubs$(),
    {initialValue: this.topicHubRepository.getPublishedTopicHubs()}
  );
  protected readonly blogIsLoading = this.blogPostFeed.isLoading;
  protected readonly blogLoadError = this.blogPostFeed.loadError;
  protected readonly pathNames = PATH_NAMES;

  constructor() {
    this.initializeMotionState();
    this.resetFailedBackgroundWhenCandidateChanges();
    this.keepActiveHeroPostInBounds();
    this.keepHeroPostNavigationFocus();
    this.keepActiveSlideInBounds();
    this.startSlideRotation();
  }

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

  protected slideObjectPosition(slide: HomepageHeroSlide): string {
    return `${slide.focalPointX}% ${slide.focalPointY}%`;
  }

  protected slideHasKenBurns(slide: HomepageHeroSlide): boolean {
    return slide.kenBurnsEnabled && this.pageVisible() && !this.reducedMotion();
  }

  protected slideKenBurnsDelay(slideIndex: number): string {
    return `-${slideIndex * 1300}ms`;
  }

  protected slideKenBurnsOffset(slide: HomepageHeroSlide, axis: 'x' | 'y'): string {
    const focalPoint = axis === 'x' ? slide.focalPointX : slide.focalPointY;
    const centeredOffset = axis === 'x' ? 0.45 : -0.45;

    if (focalPoint < 45) {
      return axis === 'x' ? '0.65%' : '0.45%';
    }

    if (focalPoint > 55) {
      return axis === 'x' ? '-0.65%' : '-0.55%';
    }

    return `${centeredOffset}%`;
  }

  protected handleHeroBackgroundError(imageUrl: string): void {
    if (imageUrl === this.postBackgroundImageUrl()) {
      this.failedPostBackgroundCandidateKey.set(this.postBackgroundCandidateKey());
    }
  }

  private postTopic(post: BlogPost): TopicHub | null {
    return this.topicHubs().find(topicHub => postMatchesHubTerms(post, topicHub.terms)) ?? null;
  }

  private resetFailedBackgroundWhenCandidateChanges(): void {
    effect(() => {
      const candidateKey = this.postBackgroundCandidateKey();

      if (candidateKey === this.activePostBackgroundCandidateKey) {
        return;
      }

      this.activePostBackgroundCandidateKey = candidateKey;
      this.failedPostBackgroundCandidateKey.set('');
    });
  }

  private keepActiveHeroPostInBounds(): void {
    effect(() => {
      const posts = this.heroPostCandidates();
      const leadPostId = posts[0]?.id ?? '';
      const lastPostIndex = Math.max(0, posts.length - 1);
      const activeIndex = this.activeHeroPostIndex();
      const activePostId = this.activeHeroPostId();

      // Preserve the viewed post by ID across reorders, but reset when editorial lead selection changes.
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

  private initializeMotionState(): void {
    if (!this.isBrowser) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateReducedMotion = () => this.reducedMotion.set(mediaQuery.matches);
    const updatePageVisibility = () => this.pageVisible.set(this.document.visibilityState !== 'hidden');

    updateReducedMotion();
    updatePageVisibility();

    mediaQuery.addEventListener('change', updateReducedMotion);
    this.document.addEventListener('visibilitychange', updatePageVisibility);
    this.destroyRef.onDestroy(() => {
      mediaQuery.removeEventListener('change', updateReducedMotion);
      this.document.removeEventListener('visibilitychange', updatePageVisibility);
    });
  }

  private keepActiveSlideInBounds(): void {
    effect(() => {
      const slideCount = this.heroSlides().length;
      const activeIndex = this.activeSlideIndex();

      if (slideCount === 0 || activeIndex >= slideCount) {
        this.activeSlideIndex.set(0);
      }
    });
  }

  private startSlideRotation(): void {
    effect(onCleanup => {
      if (!this.isBrowser || !this.shouldRotateSlides()) {
        return;
      }

      const intervalId = window.setInterval(() => this.goToNextSlide(), this.heroSettings().intervalMs);

      onCleanup(() => window.clearInterval(intervalId));
    });
  }

  private goToNextSlide(): void {
    const slideCount = this.heroSlides().length;

    if (slideCount <= 1) {
      return;
    }

    this.activeSlideIndex.update(index => (index + 1) % slideCount);
  }
}

function createPostBackgroundSlide(post: BlogPost, imageUrl: string): HomepageHeroSlide {
  return {
    id: `featured-post-background-${post.id}`,
    imageUrl,
    altText: '',
    focalPointX: 50,
    focalPointY: 50,
    kenBurnsEnabled: false,
    sortOrder: 0,
    status: 'published',
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
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
