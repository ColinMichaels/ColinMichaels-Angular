import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {BlogPostListingComponent} from '../../features/blog/components/post-listing/blog-post-listing.component';
import {TopicHubRepositoryService} from '../../features/topics/services/topic-hub-repository.service';
import {HomeBlogPostFeedService} from './home-blog-post-feed.service';
import {postHasTaxonomyTerm, postMatchesTerms} from './home-blog-section.utils';

const WEEKLY_UPDATES_TERMS = [
  'weekly updates'
] as const;

const HOSPITAL_LESSON_TERMS = [
  'hospital',
  'hospital lesson',
  'hospital lessons',
  'medical information',
  'medical info',
  'medical lesson',
  'medical lessons',
  'medical notes',
] as const;

const WEEKLY_UPDATE_LIMIT = 3;
const HOSPITAL_LESSON_LIMIT = 1;

@Component({
  selector: 'app-home-recovery-blog-sections',
  imports: [
    BlogPostListingComponent,
    RouterLink,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      id="health-recovery"
      class="site-section-band site-section-theme-soft topic-theme-recovery home-weekly-section"
      aria-labelledby="weekly-updates-heading"
    >
      <div class="site-section-inner">
        <div class="home-weekly-intro">
          <div>
            <p class="eyebrow eyebrow-topic">Health & Recovery</p>
            <h2 id="weekly-updates-heading" class="mt-3 heading-section">Weekly Updates</h2>
            <p class="site-section-copy">
              Notes from recovery, one week at a time. Personal updates on what changed, what helped, and what I’m
              learning along the way.
            </p>
          </div>

          <p class="home-recovery-disclaimer">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M12 3 5 6v5c0 4.6 2.8 8.3 7 10 4.2-1.7 7-5.4 7-10V6l-7-3Z"></path>
              <path d="m9.25 12 1.75 1.75 3.75-4"></path>
            </svg>
            <span>Personal experience only — not medical advice.</span>
          </p>
        </div>

        <div class="home-updates-board">
          <div class="home-updates-board__rail" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <app-blog-post-listing
            class="home-updates-board__listing"
            [posts]="weeklyUpdatePosts()"
            layout="fan"
            [headingLevel]="3"
            [loading]="!blogIsReady()"
            [loadingItemCount]="weeklyUpdateLimit"
            [error]="blogLoadError()"
            errorTitle="Unable to load weekly updates"
            [appearance]="recoveryAppearance()"
            [showTags]="false"
            mediaPresentation="background"
            [titleMaxLength]="72"
            [titleLineClamp]="3"
            [excerptLineClamp]="3"
            readLinkLabel="Read update"
            emptyTitle="No published weekly updates yet"
            emptyMessage="New recovery notes will be pinned here as they become available."
            regionLabel="Latest weekly recovery updates"
          ></app-blog-post-listing>
        </div>

        <a
          [routerLink]="['/', pathNames.BLOG, 'category', 'weekly-updates']"
          class="home-section-route home-weekly-route"
        >
          <span>Read all weekly updates</span>
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M5 12h14"></path>
            <path d="m14 7 5 5-5 5"></path>
          </svg>
        </a>
      </div>
    </section>

    <section
      id="medical-information"
      class="site-section-band-dark topic-theme-recovery home-hospital-section"
      aria-labelledby="hospital-lessons-heading"
    >
      <div class="site-section-inner">
        <div class="home-hospital-layout">
          <div class="home-hospital-intro">
            <p class="eyebrow eyebrow-topic">Things I learned in the Hospital</p>
            <h2 id="hospital-lessons-heading" class="mt-3 heading-section">Hospital lessons from a patient</h2>
            <p class="site-section-copy">
              Practical notes on the questions, details, and small systems that helped me feel more prepared.
            </p>
          </div>

          <div class="home-hospital-feature">
            <app-blog-post-listing
              [posts]="hospitalLessonPosts()"
              layout="list"
              [headingLevel]="3"
              [loading]="!blogIsReady()"
              [loadingItemCount]="hospitalLessonLimit"
              [error]="blogLoadError()"
              errorTitle="Unable to load hospital lessons"
              [appearance]="recoveryAppearance()"
              [showTags]="false"
              [showReadLink]="true"
              [excerptLineClamp]="3"
              readLinkLabel="Read this lesson"
              emptyTitle="No published hospital lessons yet"
              emptyMessage="Patient-perspective hospital notes will appear here as they become available."
              regionLabel="Featured hospital lesson"
            ></app-blog-post-listing>

            <a [routerLink]="['/', pathNames.TOPICS, 'recovery-planning']" class="home-section-route">
              <span>Browse the Recovery Planning topic</span>
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="M5 12h14"></path>
                <path d="m14 7 5 5-5 5"></path>
              </svg>
            </a>
          </div>
        </div>

        <p class="home-hospital-disclaimer">
          Always confirm care decisions, medications, symptoms, and insurance questions with qualified professionals.
        </p>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .home-weekly-section {
      padding-block: clamp(2.75rem, 5vw, 5rem);
    }

    .home-weekly-intro {
      display: grid;
      gap: 1.5rem 3rem;
      align-items: end;
    }

    .home-weekly-intro > div {
      max-width: 46rem;
    }

    .home-recovery-disclaimer {
      display: flex;
      max-width: 30rem;
      align-items: center;
      gap: 0.75rem;
      margin: 0;
      border-left: 1px solid var(--site-accent);
      color: var(--site-muted);
      font-size: 0.9rem;
      line-height: 1.55;
      padding: 0.6rem 0 0.6rem 1rem;
    }

    .home-recovery-disclaimer svg {
      width: 1.35rem;
      height: 1.35rem;
      flex: 0 0 auto;
      fill: none;
      stroke: var(--site-accent-strong);
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.65;
    }

    .home-updates-board {
      position: relative;
      isolation: isolate;
      overflow: hidden;
      margin-top: clamp(2rem, 4vw, 3rem);
      border: 1px solid rgb(var(--site-accent-rgb) / 0.38);
      background:
        linear-gradient(rgb(var(--site-accent-rgb) / 0.045) 1px, transparent 1px),
        linear-gradient(90deg, rgb(var(--site-accent-rgb) / 0.045) 1px, transparent 1px),
        var(--site-panel-soft);
      background-size: 1.5rem 1.5rem;
      box-shadow:
        inset 0 0 0 0.3rem var(--site-bg),
        inset 0 0 0 0.36rem rgb(var(--site-accent-rgb) / 0.2),
        0 1.5rem 4rem rgb(0 0 0 / 0.12);
      padding-top: 1.35rem;
    }

    .home-updates-board__rail {
      position: absolute;
      z-index: 0;
      top: 1.2rem;
      right: clamp(1.25rem, 3vw, 2.5rem);
      left: clamp(1.25rem, 3vw, 2.5rem);
      display: flex;
      height: 0.35rem;
      align-items: center;
      justify-content: space-between;
      border-block: 1px solid rgb(var(--site-accent-rgb) / 0.28);
      background: var(--site-bg);
      pointer-events: none;
    }

    .home-updates-board__rail span {
      width: 0.55rem;
      height: 0.55rem;
      border: 1px solid rgb(var(--site-accent-rgb) / 0.5);
      background: var(--site-panel);
    }

    .home-updates-board__listing {
      position: relative;
      z-index: 1;
    }

    .home-section-route {
      display: inline-flex;
      min-height: 44px;
      width: fit-content;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      border-bottom: 1px solid var(--site-accent);
      color: var(--site-accent-strong);
      font-family: var(--font-accent);
      font-size: 0.95rem;
      font-weight: 600;
      line-height: 1.35;
      padding: 0.45rem 0;
      text-decoration: none;
    }

    .home-section-route svg {
      width: 1.25rem;
      height: 1.25rem;
      flex: 0 0 auto;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
      transition: transform 180ms ease;
    }

    .home-section-route:hover,
    .home-section-route:focus-visible {
      color: var(--site-accent);
    }

    .home-section-route:hover svg,
    .home-section-route:focus-visible svg {
      transform: translateX(0.2rem);
    }

    .home-weekly-route {
      margin-top: 1.25rem;
    }

    .home-hospital-section {
      padding-block: clamp(2.5rem, 4vw, 4rem);
    }

    .home-hospital-layout {
      display: grid;
      gap: clamp(2rem, 5vw, 4.5rem);
      align-items: center;
    }

    .home-hospital-intro {
      position: relative;
      max-width: 34rem;
      border-left: 1px solid var(--site-accent);
      padding-left: clamp(1rem, 2.5vw, 1.6rem);
    }

    .home-hospital-feature {
      min-width: 0;
      border: 1px solid rgb(var(--site-accent-rgb) / 0.42);
      background: var(--site-panel-soft);
      box-shadow: 0 1.25rem 3.5rem rgb(0 0 0 / 0.12);
      padding: clamp(1.1rem, 2.6vw, 1.75rem);
    }

    .home-hospital-feature .home-section-route {
      margin-top: 1rem;
    }

    .home-hospital-disclaimer {
      margin: clamp(2rem, 4vw, 3rem) 0 0;
      border-top: 1px solid var(--site-border);
      color: var(--site-muted);
      font-size: 0.9rem;
      line-height: 1.55;
      padding: 1rem 0 0 1rem;
      position: relative;
    }

    .home-hospital-disclaimer::before {
      position: absolute;
      top: 1rem;
      bottom: 0;
      left: 0;
      width: 1px;
      background: var(--site-accent);
      content: '';
    }

    :host-context(.reader-contrast-high) .home-updates-board,
    :host-context(.reader-contrast-high) .home-hospital-feature {
      background: var(--site-panel);
      box-shadow: none;
    }

    @media (min-width: 64rem) {
      .home-weekly-intro {
        grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 0.65fr);
      }

      .home-recovery-disclaimer {
        justify-self: end;
      }

      .home-hospital-layout {
        grid-template-columns: minmax(19rem, 0.78fr) minmax(0, 1.22fr);
      }
    }

    @media (max-width: 47.99rem) {
      .home-updates-board {
        padding: 2.2rem 1rem 0.5rem;
      }

      .home-updates-board__rail {
        top: 1rem;
        right: 1rem;
        left: 1rem;
      }
    }

    @media (max-width: 39.99rem) {
      .home-hospital-feature {
        padding: 1rem;
      }

      .home-section-route {
        width: 100%;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .home-section-route svg {
        transition: none;
      }

      .home-section-route:hover svg,
      .home-section-route:focus-visible svg {
        transform: none;
      }
    }
  `],
})
export class HomeRecoveryBlogSectionsComponent {
  private readonly blogPostFeed = inject(HomeBlogPostFeedService);
  private readonly topicHubRepository = inject(TopicHubRepositoryService);

  protected readonly allPublishedPosts = this.blogPostFeed.publishedPosts;
  protected readonly topicHubs = toSignal(
    this.topicHubRepository.getPublishedTopicHubs$(),
    {initialValue: this.topicHubRepository.getPublishedTopicHubs()}
  );
  // Use category taxonomy only so the billboard stays in sync with its category archive CTA.
  protected readonly weeklyUpdatePosts = computed(() => (
    this.allPublishedPosts()
      .filter(post => postHasTaxonomyTerm(post, WEEKLY_UPDATES_TERMS))
      .slice(0, WEEKLY_UPDATE_LIMIT)
  ));
  // Keep Weekly Updates from being promoted in both recovery sections.
  protected readonly hospitalLessonPosts = computed(() => (
    this.allPublishedPosts()
      .filter(post => (
        postMatchesTerms(post, HOSPITAL_LESSON_TERMS)
        && !postHasTaxonomyTerm(post, WEEKLY_UPDATES_TERMS)
      ))
      .slice(0, HOSPITAL_LESSON_LIMIT)
  ));
  protected readonly recoveryAppearance = computed(() => {
    const topic = this.topicHubs().find(topicHub => topicHub.slug === 'recovery-planning');

    return topic
      ? {
          label: topic.theme.shortLabel,
          accent: topic.theme.accent,
          accentStrong: topic.theme.accentStrong,
          accentRgb: topic.theme.accentRgb,
        }
      : null;
  });
  protected readonly blogIsReady = this.blogPostFeed.isReady;
  protected readonly blogLoadError = this.blogPostFeed.loadError;
  protected readonly weeklyUpdateLimit = WEEKLY_UPDATE_LIMIT;
  protected readonly hospitalLessonLimit = HOSPITAL_LESSON_LIMIT;
  protected readonly pathNames = PATH_NAMES;
}
