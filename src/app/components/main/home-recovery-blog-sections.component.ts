import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {
  BlogPostCardSkeletonComponent
} from '../../features/blog/components/post-card/blog-post-card-skeleton.component';
import {BlogPostCardComponent} from '../../features/blog/components/post-card/post-card.component';
import {BlogPostSummary} from '../../features/blog/models/blog-post.model';
import {BlogRepositoryService} from '../../features/blog/services/blog-repository.service';
import {TopicHubRepositoryService} from '../../features/topics/services/topic-hub-repository.service';
import type {TopicHub} from '../../features/topics/topic-hubs.data';
import {postMatchesHubTerms, postMatchesTerms} from './home-blog-section.utils';

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
    BlogPostCardComponent,
    BlogPostCardSkeletonComponent,
    RouterLink,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
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

        @if (blogLoadError(); as error) {
          <div class="site-error-panel mt-8">
            <p class="font-medium text-rose-950 dark:text-red-100">Unable to load health and recovery posts.</p>
            <p class="mt-2 text-sm">{{ error }}</p>
          </div>
        } @else {
          @defer (when !blogIsLoading()) {
            <div class="site-divided-list">
              @for (post of healthRecoveryPosts(); track post.id) {
                <app-blog-post-card
                  [post]="post"
                  [showTags]="false"
                  [topicLabel]="postTopic(post)?.theme?.shortLabel ?? null"
                  [topicAccent]="postTopic(post)?.theme?.accent ?? null"
                  [topicAccentStrong]="postTopic(post)?.theme?.accentStrong ?? null"
                  [topicAccentRgb]="postTopic(post)?.theme?.accentRgb ?? null"
                ></app-blog-post-card>
              } @empty {
                <p class="site-empty-panel">
                  No published health and recovery posts yet. Posts tagged or categorized with recovery, weekly updates,
                  open heart surgery, or cardiac recovery will appear here.
                </p>
              }
            </div>
          } @placeholder (minimum 300ms) {
            <div class="site-divided-list">
              <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
              <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
            </div>
          }
        }
      </div>
    </section>

    <section id="medical-information" class="site-section site-section-theme-soft topic-theme-recovery home-medical-section">
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

      @if (blogLoadError(); as error) {
        <div class="site-error-panel mt-8">
          <p class="font-medium text-rose-950 dark:text-red-100">Unable to load posts.</p>
          <p class="mt-2 text-sm">{{ error }}</p>
        </div>
      } @else {
        @defer (when !blogIsLoading()) {
          <div class="site-divided-list">
            @for (post of medicalInfoPosts(); track post.id) {
              <app-blog-post-card
                [post]="post"
                [showTags]="false"
                [topicLabel]="postTopic(post)?.theme?.shortLabel ?? null"
                [topicAccent]="postTopic(post)?.theme?.accent ?? null"
                [topicAccentStrong]="postTopic(post)?.theme?.accentStrong ?? null"
                [topicAccentRgb]="postTopic(post)?.theme?.accentRgb ?? null"
              ></app-blog-post-card>
            } @empty {
              <p class="site-empty-panel">
                No published medical information posts yet. Posts tagged or categorized with medical information,
                procedures, medications, cardiology, or related surgery-care terms will appear here.
              </p>
            }
          </div>
        } @placeholder (minimum 300ms) {
          <div class="site-divided-list">
            <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
            <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
          </div>
        }
      }
    </section>
  `,
})
export class HomeRecoveryBlogSectionsComponent {
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly topicHubRepository = inject(TopicHubRepositoryService);

  protected readonly allPublishedPosts = toSignal(
    this.blogRepository.getPublishedPosts$(),
    {initialValue: []}
  );
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
  protected readonly topicByPostId = computed(() => {
    const topics = this.topicHubs();

    return new Map(
      this.allPublishedPosts().map(post => [
        post.id,
        topics.find(topic => postMatchesHubTerms(post, topic.terms)) ?? null,
      ])
    );
  });
  protected readonly blogIsLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly blogLoadError = toSignal(this.blogRepository.error$, {initialValue: null});
  protected readonly pathNames = PATH_NAMES;

  protected postTopic(post: BlogPostSummary): TopicHub | null {
    return this.topicByPostId().get(post.id) ?? null;
  }
}
