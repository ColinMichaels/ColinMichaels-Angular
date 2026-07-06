import {DatePipe, NgStyle, NgTemplateOutlet} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, effect, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {map} from 'rxjs';

import {PATH_NAMES} from '../../app-route-paths';
import {SeoService} from '../../shared/seo/seo.service';
import {BlogPostSummary} from '../blog/models/blog-post.model';
import {BlogRepositoryService} from '../blog/services/blog-repository.service';
import {getBlogTaxonomyTerms} from '../blog/utils/blog-category-url.util';
import {TopicHubRepositoryService} from './services/topic-hub-repository.service';
import {createTopicHubSeoMetadata, TopicHub} from './topic-hubs.data';

function normalizeSearchValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

@Component({
  selector: 'app-topic-hub',
  imports: [
    DatePipe,
    NgStyle,
    NgTemplateOutlet,
    RouterLink,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="topic-hub-page" [ngStyle]="topicThemeStyle(hub())">
      <section class="topic-hub-shell">
        <header class="topic-hub-hero">
          <nav class="topic-hub-breadcrumb" aria-label="Topic navigation">
            <a routerLink="/">Home</a>
            <span aria-hidden="true">/</span>
            <a [routerLink]="['/', pathNames.BLOG]">Blog</a>
          </nav>

          <div class="topic-hub-hero-grid">
            <div class="topic-hub-hero-copy">
              <h1>{{ hub().title }}</h1>
              <p>{{ hub().summary }}</p>
              <div class="topic-hub-actions">
                <a
                  [attr.href]="topicSectionHref('topic-start-here')"
                  class="topic-hub-action-primary"
                  (click)="handleTopicSectionClick($event, 'topic-start-here')"
                >
                  Start here
                  <span class="topic-hub-link-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path d="M12 5v14"></path>
                      <path d="M7 14l5 5 5-5"></path>
                    </svg>
                  </span>
                </a>
                <a
                  [attr.href]="topicSectionHref('topic-latest')"
                  class="topic-hub-action-secondary"
                  (click)="handleTopicSectionClick($event, 'topic-latest')"
                >
                  Latest articles
                  <span class="topic-hub-link-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path d="M6 6h12"></path>
                      <path d="M6 12h12"></path>
                      <path d="M6 18h8"></path>
                    </svg>
                  </span>
                </a>
              </div>

              <section class="topic-hub-intro" aria-labelledby="topic-introduction-heading">
                <h2 id="topic-introduction-heading">Introduction</h2>
                <p>{{ hub().description }}</p>
              </section>
            </div>

            <aside class="topic-hub-illustration" [attr.aria-label]="hub().theme.shortLabel + ' topic map'">
              <div class="topic-hub-frame-label">{{ hub().theme.shortLabel }} field guide</div>
              <svg viewBox="0 0 720 405" aria-hidden="true" focusable="false">
                <path class="topic-hub-frame-path" d="M86 126h182v92H86z"></path>
                <path class="topic-hub-frame-path" d="M452 80h154v70H452z"></path>
                <path class="topic-hub-frame-path" d="M430 238h190v82H430z"></path>
                <path class="topic-hub-frame-line" d="M268 172h72c38 0 38-42 76-42h36"></path>
                <path class="topic-hub-frame-line" d="M268 190h80c40 0 40 86 82 86"></path>
                <circle class="topic-hub-frame-node" cx="177" cy="172" r="30"></circle>
                <circle class="topic-hub-frame-node" cx="360" cy="182" r="18"></circle>
                <circle class="topic-hub-frame-node" cx="430" cy="276" r="18"></circle>
              </svg>
              <div class="topic-hub-motif-list">
                @for (motif of hub().theme.heroMotifs; track motif) {
                  <span>{{ motif }}</span>
                }
              </div>
            </aside>
          </div>
        </header>

        <section id="topic-start-here" class="topic-hub-section" aria-labelledby="topic-start-heading">
          <div class="topic-hub-section-heading">
            <span>Start here</span>
            <h2 id="topic-start-heading">{{ hub().asset.title }}</h2>
            <p>{{ hub().asset.intro }}</p>
          </div>
          <ol class="topic-hub-step-grid">
            @for (item of hub().asset.items; track item.label; let index = $index) {
              <li>
                <span class="topic-hub-step-index">{{ index + 1 }}</span>
                <h3>{{ item.label }}</h3>
                <p>{{ item.description }}</p>
              </li>
            }
          </ol>
        </section>

        <section class="topic-hub-featured" aria-labelledby="topic-featured-heading">
          <div>
            <span>{{ hub().featuredProject.label }}</span>
            <h2 id="topic-featured-heading">{{ hub().featuredProject.title }}</h2>
            <p>{{ hub().featuredProject.description }}</p>
            <a
              [attr.href]="hub().featuredProject.href"
              class="topic-hub-featured-cta"
              (click)="handleInternalHrefClick($event, hub().featuredProject.href)"
            >
              {{ hub().featuredProject.ctaLabel }}
              <span class="topic-hub-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M7 17L17 7"></path>
                  <path d="M9 7h8v8"></path>
                </svg>
              </span>
            </a>
          </div>
          <div class="topic-hub-featured-map">
            <nav class="topic-hub-featured-tree" aria-label="Topic guide shortcuts">
              <a
                [attr.href]="topicSectionHref('topic-start-here')"
                (click)="handleTopicSectionClick($event, 'topic-start-here')"
              >
                <span>01</span>
                <strong>Start checklist</strong>
              </a>
              <a
                [attr.href]="topicBlogHref()"
                (click)="handleInternalHrefClick($event, topicBlogHref())"
              >
                <span>02</span>
                <strong>Filtered posts</strong>
              </a>
              <a
                [attr.href]="topicSectionHref('topic-learning')"
                (click)="handleTopicSectionClick($event, 'topic-learning')"
              >
                <span>03</span>
                <strong>Learning path</strong>
              </a>
              <a
                [attr.href]="topicSectionHref('topic-reference')"
                (click)="handleTopicSectionClick($event, 'topic-reference')"
              >
                <span>04</span>
                <strong>Reference links</strong>
              </a>
            </nav>
            <div class="topic-hub-featured-icon">
              <ng-container [ngTemplateOutlet]="topicGlyph" [ngTemplateOutletContext]="{$implicit: hub()}"></ng-container>
            </div>
          </div>
        </section>

        <section id="topic-latest" class="topic-hub-section" aria-labelledby="topic-latest-heading">
          <div class="topic-hub-section-heading topic-hub-section-heading-row">
            <div>
              <span>Latest articles</span>
              <h2 id="topic-latest-heading">{{ hub().theme.shortLabel }} Posts</h2>
            </div>
            <a
              [routerLink]="['/', pathNames.BLOG]"
              [queryParams]="{topic: hub().slug}"
              class="topic-hub-action-secondary"
            >
              View all articles
              <span class="topic-hub-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M6 6h12"></path>
                  <path d="M6 12h12"></path>
                  <path d="M6 18h8"></path>
                </svg>
              </span>
            </a>
          </div>

          @if (loadError(); as error) {
            <div class="topic-hub-state-panel">
              <h3>Unable to load topic posts.</h3>
              <p>{{ error }}</p>
            </div>
          } @else if (isLoading()) {
            <div class="topic-hub-article-list" aria-hidden="true">
              @for (i of [1, 2, 3]; track i) {
                <div class="topic-hub-article-skeleton"></div>
              }
            </div>
          } @else {
            <div class="topic-hub-article-list">
              @for (post of topicPosts(); track post.id) {
                <a [routerLink]="['/', pathNames.BLOG, post.slug]" class="topic-hub-article-row">
                  <span class="topic-hub-article-media" aria-hidden="true">
                    <img
                      [src]="postImage(post)"
                      alt=""
                      loading="lazy"
                    >
                  </span>
                  <span class="topic-hub-article-body">
                    <span class="topic-hub-article-title">{{ post.title }}</span>
                    <span class="topic-hub-article-excerpt">{{ post.excerpt }}</span>
                    <span class="topic-hub-article-meta">
                      {{ (post.publishedAt || post.updatedAt) | date: 'MMM d, y':'UTC' }}
                      <span aria-hidden="true">/</span>
                      {{ primaryPostCategory(post) }}
                    </span>
                  </span>
                </a>
              } @empty {
                <div class="topic-hub-state-panel">
                  <h3>No matching published posts yet.</h3>
                  <p>This hub is ready for future posts in the series.</p>
                </div>
              }
            </div>
          }
        </section>

        <section id="topic-learning" class="topic-hub-section" aria-labelledby="topic-learning-heading">
          <div class="topic-hub-section-heading">
            <span>Learning path</span>
            <h2 id="topic-learning-heading">A practical order for the topic</h2>
          </div>
          <ol class="topic-hub-learning-path">
            @for (step of hub().learningPath; track step.label) {
              <li>
                <span>{{ step.label }}</span>
                <h3>{{ step.title }}</h3>
                <p>{{ step.description }}</p>
              </li>
            }
          </ol>
        </section>

        <section class="topic-hub-section" aria-labelledby="topic-related-heading">
          <div class="topic-hub-section-heading">
            <span>Related topics</span>
            <h2 id="topic-related-heading">Continue through the map</h2>
          </div>
          <div class="topic-hub-related-grid">
            @for (relatedHub of relatedHubs(); track relatedHub.slug) {
              <a
                [routerLink]="['/', pathNames.TOPICS, relatedHub.slug]"
                class="topic-hub-related-card"
                [ngStyle]="topicThemeStyle(relatedHub)"
              >
                <span class="topic-hub-related-icon" aria-hidden="true">
                  <ng-container [ngTemplateOutlet]="topicGlyph" [ngTemplateOutletContext]="{$implicit: relatedHub}"></ng-container>
                </span>
                <span>
                  <span class="topic-hub-related-title">{{ relatedHub.theme.shortLabel }}</span>
                  <span class="topic-hub-related-copy">{{ relatedHub.description }}</span>
                </span>
                <span class="topic-hub-related-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M9 5l7 7-7 7"></path>
                  </svg>
                </span>
              </a>
            }
          </div>
        </section>

        <aside id="topic-reference" class="topic-hub-reference" aria-labelledby="topic-reference-heading">
          <div>
            <span>Quick reference</span>
            <h2 id="topic-reference-heading">Checklist</h2>
          </div>
          <ul>
            @for (item of hub().checklist; track item) {
              <li>{{ item }}</li>
            }
          </ul>
          <div class="topic-hub-resource-grid">
            @for (resource of hub().resources; track resource.href) {
              <a
                [attr.href]="resource.href"
                (click)="handleInternalHrefClick($event, resource.href)"
              >
                <span class="topic-hub-resource-copy">
                  <strong>{{ resource.label }}</strong>
                  <span class="topic-hub-resource-description">{{ resource.description }}</span>
                </span>
                <span class="topic-hub-related-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M9 5l7 7-7 7"></path>
                  </svg>
                </span>
              </a>
            }
          </div>
          @if (hub().slug === 'recovery-planning') {
            <p class="topic-hub-disclaimer">
              Health-related writing here is personal experience and organization help only, not medical advice.
            </p>
          }
        </aside>
      </section>

      <ng-template #topicGlyph let-topic>
        @switch (topic.theme.icon) {
          @case ('spark') {
            <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
              <path d="M24 5l5.2 13.8L43 24l-13.8 5.2L24 43l-5.2-13.8L5 24l13.8-5.2L24 5z"></path>
            </svg>
          }
          @case ('heart') {
            <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
              <path d="M7 24h7l4-8 7 17 5-9h11"></path>
              <path d="M24 40C14 32 8 26 8 18c0-5 4-9 9-9 3 0 5.6 1.4 7 3.7C25.4 10.4 28 9 31 9c5 0 9 4 9 9 0 8-6 14-16 22z"></path>
            </svg>
          }
          @case ('cube') {
            <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
              <path d="M24 5l17 9.5v19L24 43 7 33.5v-19L24 5z"></path>
              <path d="M7 14.5L24 24l17-9.5"></path>
              <path d="M24 24v19"></path>
            </svg>
          }
          @case ('flask') {
            <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
              <path d="M18 6h12"></path>
              <path d="M21 6v12L10 38c-1.5 2.7.4 6 3.5 6h21c3.1 0 5-3.3 3.5-6L27 18V6"></path>
              <path d="M16 34h16"></path>
              <path d="M20 28h8"></path>
            </svg>
          }
        }
      </ng-template>
    </main>
  `,
  styles: [`
    :host {
      display: block;
    }

    .topic-hub-page {
      min-height: 100vh;
      background:
        radial-gradient(circle at 80% 8%, rgb(var(--topic-accent-rgb) / 0.12), transparent 26rem),
        radial-gradient(circle at 20% 18%, rgba(14, 165, 233, 0.1), transparent 22rem),
        linear-gradient(180deg, #061017 0%, #07131c 44%, #05080d 100%);
      color: #e5edf4;
      padding-block: 4.5rem;
    }

    .topic-hub-page::before {
      content: '';
      position: fixed;
      inset: 0;
      pointer-events: none;
      background-image:
        linear-gradient(rgba(148, 163, 184, 0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(148, 163, 184, 0.07) 1px, transparent 1px),
        linear-gradient(rgba(148, 163, 184, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(148, 163, 184, 0.03) 1px, transparent 1px);
      background-size: 104px 104px, 104px 104px, 26px 26px, 26px 26px;
      opacity: 0.78;
    }

    .topic-hub-shell {
      position: relative;
      z-index: 1;
      margin-inline: auto;
      max-width: 76rem;
      padding-inline: 1rem;
    }

    .topic-hub-hero {
      border-bottom: 1px solid rgba(148, 163, 184, 0.18);
      padding-bottom: 2.2rem;
    }

    .topic-hub-breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      color: rgba(226, 232, 240, 0.72);
      font-family: var(--font-accent);
      font-size: 0.92rem;
    }

    .topic-hub-breadcrumb a {
      color: #a5f3fc;
      font-weight: 600;
      text-decoration: none;
    }

    .topic-hub-hero-grid {
      display: grid;
      gap: 2rem;
      margin-top: 2rem;
    }

    .topic-hub-hero-copy h1 {
      max-width: 42rem;
      color: #f8fafc;
      font-family: var(--font-heading);
      font-size: clamp(2.8rem, 6vw, 5rem);
      font-weight: 650;
      letter-spacing: 0;
      line-height: 0.98;
    }

    .topic-hub-hero-copy > p {
      margin-top: 1.3rem;
      max-width: 40rem;
      color: rgba(226, 232, 240, 0.82);
      font-size: 1.1rem;
      line-height: 1.72;
    }

    .topic-hub-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.85rem;
      margin-top: 1.6rem;
    }

    .topic-hub-actions a,
    .topic-hub-featured-cta,
    .topic-hub-section-heading-row a {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      border: 1px solid rgb(var(--topic-accent-rgb) / 0.5);
      color: #e0f2fe;
      font-family: var(--font-accent);
      font-size: 0.95rem;
      font-weight: 700;
      padding: 0.78rem 1rem;
      text-decoration: none;
      transition: border-color 180ms ease, background-color 180ms ease, color 180ms ease;
    }

    .topic-hub-action-primary {
      background: var(--topic-accent);
      color: #03131d !important;
    }

    .topic-hub-action-secondary,
    .topic-hub-featured-cta,
    .topic-hub-section-heading-row a {
      background: rgba(2, 6, 23, 0.38);
    }

    .topic-hub-actions a:hover,
    .topic-hub-actions a:focus-visible,
    .topic-hub-featured-cta:hover,
    .topic-hub-featured-cta:focus-visible,
    .topic-hub-section-heading-row a:hover,
    .topic-hub-section-heading-row a:focus-visible {
      border-color: var(--topic-accent-strong);
      background: rgb(var(--topic-accent-rgb) / 0.16);
      color: #f8fafc !important;
    }

    .topic-hub-link-icon {
      display: inline-grid;
      width: 1.05rem;
      height: 1.05rem;
      flex: 0 0 auto;
      place-items: center;
    }

    .topic-hub-link-icon svg,
    .topic-hub-related-arrow svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2.15;
    }

    .topic-hub-intro {
      position: relative;
      margin-top: 2.2rem;
      max-width: 37rem;
      border-left: 2px solid var(--topic-accent);
      padding-left: 1rem;
    }

    .topic-hub-intro h2,
    .topic-hub-section-heading h2,
    .topic-hub-featured h2,
    .topic-hub-reference h2 {
      color: #f8fafc;
      font-family: var(--font-subheading);
      font-size: clamp(1.4rem, 2.4vw, 2rem);
      font-weight: 600;
      line-height: 1.2;
    }

    .topic-hub-intro p,
    .topic-hub-section-heading p,
    .topic-hub-featured p,
    .topic-hub-step-grid p,
    .topic-hub-learning-path p {
      color: rgba(226, 232, 240, 0.72);
      line-height: 1.65;
    }

    .topic-hub-intro p {
      margin-top: 0.7rem;
    }

    .topic-hub-illustration {
      position: relative;
      aspect-ratio: 16 / 9;
      overflow: hidden;
      border: 1px solid rgba(226, 232, 240, 0.32);
      background:
        linear-gradient(135deg, rgb(var(--topic-accent-rgb) / 0.12), transparent 38%),
        rgba(2, 6, 23, 0.48);
      box-shadow: inset 0 0 0 1px rgb(var(--topic-accent-rgb) / 0.08);
    }

    .topic-hub-frame-label {
      position: absolute;
      left: 1rem;
      top: 0.85rem;
      color: var(--topic-accent-strong);
      font-family: var(--font-accent);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .topic-hub-illustration svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    .topic-hub-frame-path,
    .topic-hub-frame-line,
    .topic-hub-frame-node {
      fill: none;
      stroke: rgb(var(--topic-accent-rgb) / 0.7);
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }

    .topic-hub-frame-line {
      stroke-dasharray: 6 9;
      animation: topic-dash 9s linear infinite;
    }

    .topic-hub-motif-list {
      position: absolute;
      inset-inline: 1rem;
      bottom: 1rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .topic-hub-motif-list span,
    .topic-hub-section-heading span,
    .topic-hub-featured span:first-child,
    .topic-hub-reference > div > span {
      color: var(--topic-accent);
      font-family: var(--font-accent);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .topic-hub-motif-list span {
      border: 1px solid rgb(var(--topic-accent-rgb) / 0.28);
      background: rgba(2, 6, 23, 0.58);
      padding: 0.42rem 0.55rem;
    }

    .topic-hub-section,
    .topic-hub-featured,
    .topic-hub-reference {
      border-bottom: 1px solid rgba(148, 163, 184, 0.18);
      padding-block: 2.4rem;
    }

    .topic-hub-section[id] {
      scroll-margin-top: 5.5rem;
    }

    .topic-hub-section-heading {
      display: grid;
      gap: 0.65rem;
      max-width: 46rem;
    }

    .topic-hub-section-heading-row {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 1rem;
      max-width: none;
    }

    .topic-hub-step-grid,
    .topic-hub-learning-path,
    .topic-hub-related-grid,
    .topic-hub-resource-grid {
      display: grid;
      gap: 1rem;
      margin-top: 1.4rem;
    }

    .topic-hub-step-grid {
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
      list-style: none;
      padding: 0;
    }

    .topic-hub-step-grid li,
    .topic-hub-learning-path li,
    .topic-hub-related-card,
    .topic-hub-reference,
    .topic-hub-state-panel {
      border: 1px solid rgba(148, 163, 184, 0.24);
      background: rgba(2, 6, 23, 0.38);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }

    .topic-hub-step-grid li {
      padding: 1rem;
    }

    .topic-hub-step-index {
      display: grid;
      width: 2.2rem;
      height: 2.2rem;
      place-items: center;
      border: 1px solid var(--topic-accent);
      border-radius: 999px;
      color: var(--topic-accent-strong);
      font-family: var(--font-accent);
      font-weight: 700;
    }

    .topic-hub-step-grid h3,
    .topic-hub-learning-path h3,
    .topic-hub-state-panel h3 {
      margin-top: 0.85rem;
      color: #f8fafc;
      font-family: var(--font-subheading);
      font-size: 1.05rem;
      font-weight: 600;
      line-height: 1.3;
    }

    .topic-hub-step-grid p,
    .topic-hub-learning-path p {
      margin-top: 0.5rem;
      font-size: 0.94rem;
    }

    .topic-hub-featured {
      display: grid;
      gap: 1.5rem;
      align-items: center;
    }

    .topic-hub-featured p {
      margin-top: 0.85rem;
      max-width: 36rem;
    }

    .topic-hub-featured-cta {
      width: fit-content;
      margin-top: 1.2rem;
    }

    .topic-hub-featured-map {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 1rem;
      align-items: stretch;
    }

    .topic-hub-featured-tree,
    .topic-hub-featured-icon {
      border: 1px solid rgb(var(--topic-accent-rgb) / 0.28);
      background: rgba(2, 6, 23, 0.42);
      padding: 1rem;
    }

    .topic-hub-featured-tree {
      display: grid;
      gap: 0.45rem;
      color: rgba(226, 232, 240, 0.72);
      font-family: var(--font-accent);
    }

    .topic-hub-featured-tree a {
      color: inherit;
      text-decoration: none;
    }

    .topic-hub-featured-icon {
      display: grid;
      min-width: 9rem;
      place-items: center;
    }

    .topic-hub-featured-icon svg,
    .topic-hub-related-icon svg {
      width: 3.6rem;
      height: 3.6rem;
      fill: none;
      stroke: var(--topic-accent);
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2.2;
    }

    .topic-hub-article-list {
      display: grid;
      margin-top: 1.4rem;
      border-top: 1px solid rgba(148, 163, 184, 0.2);
    }

    .topic-hub-article-row {
      display: grid;
      grid-template-columns: clamp(10rem, 18vw, 13rem) minmax(0, 1fr);
      gap: 1.1rem;
      align-items: start;
      border-bottom: 1px solid rgba(148, 163, 184, 0.16);
      color: inherit;
      padding-block: 1rem;
      text-decoration: none;
    }

    .topic-hub-article-row:hover .topic-hub-article-title,
    .topic-hub-article-row:focus-visible .topic-hub-article-title {
      color: var(--topic-accent-strong);
    }

    .topic-hub-article-row:focus-visible,
    .topic-hub-featured-tree a:focus-visible,
    .topic-hub-related-card:focus-visible,
    .topic-hub-resource-grid a:focus-visible {
      outline: 2px solid var(--topic-accent-strong);
      outline-offset: 0.2rem;
    }

    .topic-hub-article-media {
      aspect-ratio: 16 / 10;
      overflow: hidden;
      border: 1px solid rgb(var(--topic-accent-rgb) / 0.32);
      background: linear-gradient(135deg, rgb(var(--topic-accent-rgb) / 0.12), rgba(2, 6, 23, 0.68));
    }

    .topic-hub-article-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.82;
      transition: transform 220ms ease;
    }

    .topic-hub-article-row:hover .topic-hub-article-media img {
      transform: scale(1.035);
    }

    .topic-hub-article-body {
      display: grid;
      gap: 0.45rem;
      min-width: 0;
    }

    .topic-hub-article-title {
      color: #f8fafc;
      font-family: var(--font-subheading);
      font-size: 1.08rem;
      font-weight: 600;
      line-height: 1.3;
      transition: color 180ms ease;
    }

    .topic-hub-article-excerpt,
    .topic-hub-article-meta {
      color: rgba(226, 232, 240, 0.62);
      font-size: 0.9rem;
      line-height: 1.45;
    }

    .topic-hub-article-meta {
      font-family: var(--font-accent);
    }

    .topic-hub-article-skeleton {
      height: 8rem;
      border-bottom: 1px solid rgba(148, 163, 184, 0.14);
      background: linear-gradient(90deg, rgba(148, 163, 184, 0.05), rgb(var(--topic-accent-rgb) / 0.12), rgba(148, 163, 184, 0.05));
      background-size: 220% 100%;
      animation: topic-skeleton 1.4s ease-in-out infinite;
    }

    .topic-hub-learning-path {
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      list-style: none;
      padding: 0;
    }

    .topic-hub-learning-path li {
      position: relative;
      padding: 1rem;
    }

    .topic-hub-learning-path li > span {
      display: inline-grid;
      width: 2rem;
      height: 2rem;
      place-items: center;
      border: 1px solid var(--topic-accent);
      border-radius: 999px;
      color: var(--topic-accent-strong);
      font-family: var(--font-accent);
      font-size: 0.78rem;
      font-weight: 700;
    }

    .topic-hub-related-grid {
      grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    }

    .topic-hub-related-card {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 0.85rem;
      align-items: center;
      color: inherit;
      padding: 1rem;
      text-decoration: none;
      transition: border-color 180ms ease, transform 180ms ease;
    }

    .topic-hub-related-card:hover,
    .topic-hub-related-card:focus-visible {
      border-color: var(--topic-accent);
      transform: translateY(-0.12rem);
    }

    .topic-hub-related-icon {
      display: grid;
      width: 2.8rem;
      height: 2.8rem;
      place-items: center;
      border: 1px solid rgb(var(--topic-accent-rgb) / 0.48);
      border-radius: 999px;
    }

    .topic-hub-related-icon svg {
      width: 1.65rem;
      height: 1.65rem;
    }

    .topic-hub-related-title {
      display: block;
      color: var(--topic-accent-strong);
      font-family: var(--font-subheading);
      font-weight: 600;
    }

    .topic-hub-related-copy {
      display: block;
      margin-top: 0.2rem;
      color: rgba(226, 232, 240, 0.62);
      font-size: 0.86rem;
      line-height: 1.45;
    }

    .topic-hub-related-arrow {
      display: grid;
      width: 1.3rem;
      height: 1.3rem;
      place-items: center;
      color: var(--topic-accent);
    }

    .topic-hub-reference {
      margin-top: 2.4rem;
      padding: 1.2rem;
    }

    .topic-hub-reference ul {
      display: grid;
      gap: 0.65rem;
      margin: 1rem 0 0;
      padding: 0;
      list-style: none;
    }

    .topic-hub-reference li {
      border-left: 2px solid var(--topic-accent);
      color: rgba(226, 232, 240, 0.75);
      line-height: 1.55;
      padding-left: 0.75rem;
    }

    .topic-hub-resource-grid {
      grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
      margin-top: 1.2rem;
    }

    .topic-hub-resource-grid a {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.8rem;
      align-items: center;
      border: 1px solid rgba(148, 163, 184, 0.2);
      color: inherit;
      padding: 0.9rem;
      text-decoration: none;
    }

    .topic-hub-resource-grid a:hover,
    .topic-hub-resource-grid a:focus-visible {
      border-color: var(--topic-accent);
    }

    .topic-hub-resource-description {
      display: block;
    }

    .topic-hub-resource-description {
      margin-top: 0.3rem;
      color: rgba(226, 232, 240, 0.62);
      font-size: 0.9rem;
      line-height: 1.45;
    }

    .topic-hub-disclaimer {
      margin-top: 1rem;
      border-left: 2px solid #fb7185;
      color: rgba(226, 232, 240, 0.7);
      line-height: 1.6;
      padding-left: 0.75rem;
    }

    .topic-hub-state-panel {
      margin-top: 1.4rem;
      padding: 1rem;
    }

    .topic-hub-state-panel p {
      margin-top: 0.45rem;
      color: rgba(226, 232, 240, 0.66);
    }

    :host-context(.light) .topic-hub-page {
      background:
        radial-gradient(circle at 80% 8%, rgb(var(--topic-accent-rgb) / 0.12), transparent 25rem),
        radial-gradient(circle at 20% 18%, rgba(14, 165, 233, 0.1), transparent 22rem),
        linear-gradient(180deg, #f8fafc 0%, #eef7fb 42%, #f8fafc 100%);
      color: #0f172a;
    }

    :host-context(.light) .topic-hub-page::before {
      background-image:
        linear-gradient(rgba(14, 116, 144, 0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(14, 116, 144, 0.08) 1px, transparent 1px),
        linear-gradient(rgba(15, 23, 42, 0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(15, 23, 42, 0.035) 1px, transparent 1px);
      opacity: 0.82;
    }

    :host-context(.light) .topic-hub-hero,
    :host-context(.light) .topic-hub-section,
    :host-context(.light) .topic-hub-featured,
    :host-context(.light) .topic-hub-reference {
      border-bottom-color: rgba(15, 23, 42, 0.12);
    }

    :host-context(.light) .topic-hub-breadcrumb {
      color: rgba(51, 65, 85, 0.78);
    }

    :host-context(.light) .topic-hub-breadcrumb a {
      color: #0e7490;
    }

    :host-context(.light) .topic-hub-hero-copy h1,
    :host-context(.light) .topic-hub-intro h2,
    :host-context(.light) .topic-hub-section-heading h2,
    :host-context(.light) .topic-hub-featured h2,
    :host-context(.light) .topic-hub-reference h2,
    :host-context(.light) .topic-hub-step-grid h3,
    :host-context(.light) .topic-hub-learning-path h3,
    :host-context(.light) .topic-hub-state-panel h3,
    :host-context(.light) .topic-hub-article-title {
      color: #0f172a;
    }

    :host-context(.light) .topic-hub-hero-copy > p,
    :host-context(.light) .topic-hub-intro p,
    :host-context(.light) .topic-hub-section-heading p,
    :host-context(.light) .topic-hub-featured p,
    :host-context(.light) .topic-hub-step-grid p,
    :host-context(.light) .topic-hub-learning-path p,
    :host-context(.light) .topic-hub-article-excerpt,
    :host-context(.light) .topic-hub-article-meta,
    :host-context(.light) .topic-hub-related-copy,
    :host-context(.light) .topic-hub-reference li,
    :host-context(.light) .topic-hub-resource-description,
    :host-context(.light) .topic-hub-disclaimer,
    :host-context(.light) .topic-hub-state-panel p {
      color: rgba(51, 65, 85, 0.78);
    }

    :host-context(.light) .topic-hub-actions a,
    :host-context(.light) .topic-hub-featured-cta,
    :host-context(.light) .topic-hub-section-heading-row a {
      color: #0f172a;
    }

    :host-context(.light) .topic-hub-action-primary {
      color: #03131d !important;
    }

    :host-context(.light) .topic-hub-action-secondary,
    :host-context(.light) .topic-hub-featured-cta,
    :host-context(.light) .topic-hub-section-heading-row a {
      background: rgba(255, 255, 255, 0.72);
    }

    :host-context(.light) .topic-hub-actions a:hover,
    :host-context(.light) .topic-hub-actions a:focus-visible,
    :host-context(.light) .topic-hub-featured-cta:hover,
    :host-context(.light) .topic-hub-featured-cta:focus-visible,
    :host-context(.light) .topic-hub-section-heading-row a:hover,
    :host-context(.light) .topic-hub-section-heading-row a:focus-visible {
      background: rgb(var(--topic-accent-rgb) / 0.14);
      color: #0f172a !important;
    }

    :host-context(.light) .topic-hub-illustration {
      border-color: rgba(15, 23, 42, 0.18);
      background:
        linear-gradient(135deg, rgb(var(--topic-accent-rgb) / 0.12), transparent 38%),
        rgba(255, 255, 255, 0.78);
      box-shadow: inset 0 0 0 1px rgb(var(--topic-accent-rgb) / 0.06), 0 18px 45px rgba(15, 23, 42, 0.08);
    }

    :host-context(.light) .topic-hub-motif-list span {
      background: rgba(255, 255, 255, 0.78);
    }

    :host-context(.light) .topic-hub-step-grid li,
    :host-context(.light) .topic-hub-learning-path li,
    :host-context(.light) .topic-hub-related-card,
    :host-context(.light) .topic-hub-reference,
    :host-context(.light) .topic-hub-state-panel,
    :host-context(.light) .topic-hub-featured-tree,
    :host-context(.light) .topic-hub-featured-icon,
    :host-context(.light) .topic-hub-resource-grid a {
      border-color: rgba(15, 23, 42, 0.14);
      background: rgba(255, 255, 255, 0.74);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86), 0 12px 32px rgba(15, 23, 42, 0.06);
    }

    :host-context(.light) .topic-hub-featured-tree {
      color: rgba(51, 65, 85, 0.74);
    }

    :host-context(.light) .topic-hub-article-list {
      border-top-color: rgba(15, 23, 42, 0.12);
    }

    :host-context(.light) .topic-hub-article-row {
      border-bottom-color: rgba(15, 23, 42, 0.1);
    }

    :host-context(.light) .topic-hub-article-media {
      border-color: rgb(var(--topic-accent-rgb) / 0.28);
      background: linear-gradient(135deg, rgb(var(--topic-accent-rgb) / 0.1), rgba(255, 255, 255, 0.78));
    }

    :host-context(.light) .topic-hub-article-skeleton {
      border-bottom-color: rgba(15, 23, 42, 0.08);
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.3), rgb(var(--topic-accent-rgb) / 0.12), rgba(255, 255, 255, 0.3));
      background-size: 220% 100%;
    }

    :host-context(.light) .topic-hub-related-card:hover,
    :host-context(.light) .topic-hub-related-card:focus-visible {
      border-color: var(--topic-accent);
    }

    @media (min-width: 900px) {
      .topic-hub-shell {
        padding-inline: 1.5rem;
      }

      .topic-hub-hero-grid {
        grid-template-columns: minmax(0, 0.85fr) minmax(25rem, 1.15fr);
        align-items: center;
      }

      .topic-hub-featured {
        grid-template-columns: minmax(0, 0.9fr) minmax(22rem, 1.1fr);
      }
    }

    @media (max-width: 760px) {
      .topic-hub-page {
        padding-block: 3rem;
      }

      .topic-hub-section-heading-row {
        align-items: start;
        flex-direction: column;
      }

      .topic-hub-featured-map {
        grid-template-columns: 1fr;
      }

      .topic-hub-article-row {
        grid-template-columns: minmax(6.75rem, 8.25rem) minmax(0, 1fr);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .topic-hub-frame-line,
      .topic-hub-article-skeleton {
        animation: none;
      }

      .topic-hub-actions a,
      .topic-hub-featured-cta,
      .topic-hub-related-card,
      .topic-hub-resource-grid a,
      .topic-hub-article-title,
      .topic-hub-article-media img {
        transition: none;
      }
    }

    @keyframes topic-dash {
      to {
        stroke-dashoffset: -72;
      }
    }

    @keyframes topic-skeleton {
      0% {
        background-position: 120% 0;
      }

      100% {
        background-position: -120% 0;
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
  protected readonly hub = computed(() => {
    const selectedHub = this.topicHubs().find(topicHub => topicHub.slug === this.topicSlug());

    return selectedHub ?? this.topicHubs()[0] ?? this.topicHubRepository.getPublishedTopicHubs()[0];
  });
  private readonly applyTopicSeo = effect(() => {
    this.seo.apply(createTopicHubSeoMetadata(this.hub()));
  });
  private readonly redirectMissingTopic = effect(() => {
    const slug = this.topicSlug();
    const topicExists = this.topicHubs().some(topicHub => topicHub.slug === slug);

    if (!this.topicsLoading() && slug && !topicExists) {
      void this.router.navigateByUrl('/404', {replaceUrl: true});
    }
  });
  protected readonly topicPosts = computed(() => (
    this.posts()
      .filter(post => this.postMatchesHub(post))
      .slice(0, 8)
  ));
  protected readonly relatedHubs = computed(() => (
    this.topicHubs().filter(topicHub => topicHub.slug !== this.hub().slug)
  ));

  protected topicThemeStyle(topicHub: TopicHub): Record<string, string> {
    return {
      '--topic-accent': topicHub.theme.accent,
      '--topic-accent-strong': topicHub.theme.accentStrong,
      '--topic-accent-rgb': topicHub.theme.accentRgb,
    };
  }

  protected primaryPostCategory(post: BlogPostSummary): string {
    return post.categories[0] ?? post.subcategories?.[0] ?? 'Article';
  }

  protected postImage(post: BlogPostSummary): string {
    return post.thumbnailImage?.trim() || post.coverImage;
  }

  protected topicSectionHref(fragment: string): string {
    return `/${this.pathNames.TOPICS}/${this.hub().slug}#${fragment}`;
  }

  protected topicBlogHref(): string {
    return `/${this.pathNames.BLOG}?topic=${this.hub().slug}`;
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

  protected handleInternalHrefClick(event: MouseEvent, href: string): void {
    const routerHref = this.toInternalRouterHref(href);

    if (!this.isPrimaryNavigationClick(event) || !routerHref) {
      return;
    }

    event.preventDefault();

    void this.router.navigateByUrl(routerHref).then(() => this.scrollToFragmentFromHref(routerHref));
  }

  private postMatchesHub(post: BlogPostSummary): boolean {
    const searchableText = normalizeSearchValue([
      post.title,
      post.excerpt,
      post.slug,
      ...getBlogTaxonomyTerms(post),
      ...post.tags,
    ].join(' '));
    const searchableTokens = searchableText.split(' ');

    return this.hub().terms.some(term => {
      const normalizedTerm = normalizeSearchValue(term);

      return normalizedTerm.includes(' ')
        ? searchableText.includes(normalizedTerm)
        : searchableTokens.includes(normalizedTerm);
    });
  }

  private isPrimaryNavigationClick(event: MouseEvent): boolean {
    return event.button === 0
      && !event.metaKey
      && !event.ctrlKey
      && !event.shiftKey
      && !event.altKey;
  }

  private scrollToFragmentFromHref(href: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    const fragment = new URL(href, window.location.origin).hash.slice(1);

    if (fragment) {
      this.scrollToTopicSection(fragment);
    }
  }

  private toInternalRouterHref(href: string): string | null {
    if (href.startsWith('/')) {
      return href;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    let url: URL;

    try {
      url = new URL(href, window.location.origin);
    } catch {
      return null;
    }

    const hostname = url.hostname.replace(/^www\./, '');

    if (url.origin === window.location.origin || hostname === 'colinmichaels.com') {
      return `${url.pathname}${url.search}${url.hash}`;
    }

    return null;
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
