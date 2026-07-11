import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {BlogPostListingComponent} from '../../features/blog/components/post-listing/blog-post-listing.component';
import {TopicHubRepositoryService} from '../../features/topics/services/topic-hub-repository.service';
import {HomeBlogPostFeedService} from './home-blog-post-feed.service';
import {postMatchesTerms} from './home-blog-section.utils';

const WEEKLY_UPDATES_TERMS = [
  'weekly update',
  'weekly updates'
] as const;

const MEDICAL_INFORMATION_TERMS = [
  'medical information',
  'medical info',
  'medical notes',
  'health and recovery'
] as const;

@Component({
  selector: 'app-home-recovery-blog-sections',
  imports: [
    BlogPostListingComponent,
    RouterLink,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="health-recovery" class="site-section-band site-section-theme-soft topic-theme-recovery">
      <div class="site-section-inner">
        <div class="site-section-header">
          <div>
            <p class="eyebrow eyebrow-topic">Health & Recovery</p>
            <h2 class="mt-3 heading-section">Weekly Updates</h2>
            <p class="site-section-copy">
              Weekly recovery notes, personal updates, and patient-perspective posts about the recent open heart
              surgery process.
            </p>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-zinc-400">
              Health-related posts are personal experience and organization notes only, not medical advice.
            </p>
          </div>
          <a [routerLink]="['/', pathNames.TOPICS, 'recovery-planning']" class="btn-link">
            Recovery planning hub
          </a>
        </div>

        <app-blog-post-listing
          class="mt-8"
          [posts]="healthRecoveryPosts()"
          layout="list"
          [headingLevel]="3"
          [loading]="!blogIsReady()"
          [error]="blogLoadError()"
          errorTitle="Unable to load health and recovery posts"
          [appearance]="recoveryAppearance()"
          [showTags]="false"
          emptyTitle="No published health and recovery posts yet"
          emptyMessage="Posts about recovery, weekly updates, open-heart surgery, and cardiac recovery will appear here."
          regionLabel="Weekly recovery updates"
        ></app-blog-post-listing>
      </div>
    </section>

    <section id="medical-information"
             class="site-section-band site-section-theme-soft topic-theme-hospital home-medical-section">
      <div class="site-section-inner">
      <div class="site-section-header">
        <div>
          <p class="eyebrow eyebrow-topic">Things I learned in the Hospital</p>
          <h2 class="mt-3 heading-section">Hospital lessons from a patient</h2>
          <p class="site-section-copy">
            Personal resource notes from the hospital experience: questions to ask, details to organize, and
            practical things I wish I had known sooner.
          </p>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-zinc-400">
            Always confirm care decisions, medications, symptoms, and insurance questions with qualified professionals.
          </p>
        </div>
        <a [routerLink]="['/', pathNames.TOPICS, 'recovery-planning']" class="btn-link">
          View resources
        </a>
      </div>

      <app-blog-post-listing
        class="mt-8"
        [posts]="medicalInfoPosts()"
        layout="list"
        [headingLevel]="3"
        [loading]="!blogIsReady()"
        [error]="blogLoadError()"
        [appearance]="recoveryAppearance()"
        [showTags]="false"
        emptyTitle="No published hospital resource posts yet"
        emptyMessage="Posts about medical information, procedures, medications, cardiology, and surgery care will appear here."
        regionLabel="Hospital lessons from a patient"
      ></app-blog-post-listing>
      </div>
    </section>
  `,
})
export class HomeRecoveryBlogSectionsComponent {
  private readonly blogPostFeed = inject(HomeBlogPostFeedService);
  private readonly topicHubRepository = inject(TopicHubRepositoryService);

  protected readonly allPublishedPosts = this.blogPostFeed.publishedPosts;
  protected readonly topicHubs = toSignal(
    this.topicHubRepository.getPublishedTopicHubs$(),
    {initialValue: this.topicHubRepository.getPublishedTopicHubs()}
  );
  protected readonly healthRecoveryPosts = computed(() => (
    this.allPublishedPosts().filter(post => postMatchesTerms(post, WEEKLY_UPDATES_TERMS))
  ));
  protected readonly medicalInfoPosts = computed(() => (
    this.allPublishedPosts().filter(post => postMatchesTerms(post, MEDICAL_INFORMATION_TERMS))
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
  protected readonly pathNames = PATH_NAMES;
}
