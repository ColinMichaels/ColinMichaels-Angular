import {DatePipe} from '@angular/common';
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

function normalizeSearchValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function postMatchesTerms(post: BlogPostSummary, terms: readonly string[]): boolean {
  const searchableText = normalizeSearchValue([
    post.title,
    post.excerpt,
    post.slug,
    ...post.categories,
    ...(post.subcategories ?? []),
    ...post.tags,
  ].join(' '));

  return terms.some(term => searchableText.includes(normalizeSearchValue(term)));
}

@Component({
  selector: 'app-home-blog-sections',
  imports: [
    BlogPostCardComponent,
    BlogPostCardSkeletonComponent,
    DatePipe,
    RouterLink,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section id="blog" class="site-section">
      <div class="site-section-header">
        <div>
          <h2 class="mt-3 heading-section">Latest writing</h2>
        </div>
        <a [routerLink]="['/', pathNames.BLOG]" class="btn-link">
          View all posts
        </a>
      </div>

      @if (blogLoadError(); as error) {
        <div class="site-error-panel mt-8">
          <p class="font-medium text-rose-950 dark:text-red-100">Unable to load latest posts.</p>
          <p class="mt-2 text-sm">{{ error }}</p>
        </div>
      } @else {
        @defer (when !blogIsLoading()) {
          <div class="site-card-grid">
            @for (post of publishedPosts(); track post.id) {
              <article class="site-card flex h-full flex-col overflow-hidden">
                <a [routerLink]="['/', pathNames.BLOG, post.slug]" class="site-media-link group">
                  <img [src]="post.coverImage" [alt]="post.title + ' cover image'"
                       class="site-media-image aspect-[16/10]"
                       loading="lazy">
                </a>
                <div class="site-card-body flex flex-1 flex-col">
                  <p class="site-meta">
                    {{ (post.publishedAt || post.updatedAt) | date: 'MMM d, y':'UTC' }}
                  </p>
                  <h3 class="mt-3 heading-card">
                    <a [routerLink]="['/', pathNames.BLOG, post.slug]" class="hover:text-cyan-300">{{ post.title }}</a>
                  </h3>
                  <p class="mt-3 text-body">{{ post.excerpt }}</p>
                  <div class="mt-auto pt-5">
                    <a
                      [routerLink]="['/', pathNames.BLOG, post.slug]"
                      class="btn-secondary"
                    >
                      Read more
                    </a>
                  </div>
                </div>
              </article>
            } @empty {
              <p class="site-empty-panel">No published posts yet.</p>
            }
          </div>
        } @placeholder (minimum 300ms) {
          <div class="site-card-grid">
            @for (i of [1, 2, 3]; track i) {
              <article class="site-skeleton-card" aria-hidden="true">
                <div class="site-skeleton-block aspect-[16/10] w-full"></div>
                <div class="flex flex-1 flex-col gap-3 p-5">
                  <div class="site-skeleton-block h-3 w-24"></div>
                  <div class="site-skeleton-block h-6 w-3/4"></div>
                  <div class="space-y-2">
                    <div class="site-skeleton-block h-3 w-full"></div>
                    <div class="site-skeleton-block h-3 w-4/5"></div>
                  </div>
                </div>
              </article>
            }
          </div>
        }
      }
    </section>

    <section id="health-recovery" class="site-section-band">
      <div class="site-section-inner">
        <div class="site-section-header">
          <div>
            <p class="eyebrow eyebrow-emerald">Health & Recovery</p>
            <h2 class="mt-3 heading-section">Weekly Updates</h2>
            <p class="site-section-copy">
              Weekly recovery notes, personal updates, and posts about the recent open heart surgery process.
            </p>
          </div>
          <a [routerLink]="['/', pathNames.BLOG]" class="btn-link">
            Browse the blog
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
                <app-blog-post-card [post]="post" [showTags]="false"></app-blog-post-card>
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

    <section id="medical-information" class="site-section">
      <div class="site-section-header">
        <div>
          <p class="eyebrow eyebrow-rose">Things I learned in the Hospital</p>
          <h2 class="mt-3 heading-section">Medical advice from a friend</h2>
          <p class="site-section-copy">
            Sharing some of the things I learned while in the hospital that I wish someone told me.
          </p>
        </div>
        <a [routerLink]="['/', pathNames.BLOG]" class="btn-link">
          View all writing
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
              <app-blog-post-card [post]="post" [showTags]="false"></app-blog-post-card>
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
export class HomeBlogSectionsComponent {
  private readonly blogRepository = inject(BlogRepositoryService);

  protected readonly allPublishedPosts = toSignal(
    this.blogRepository.getPublishedPosts$(),
    {initialValue: []}
  );
  protected readonly publishedPosts = computed(() => this.allPublishedPosts().slice(0, 3));
  protected readonly healthRecoveryPosts = computed(() => (
    this.allPublishedPosts().filter(post => postMatchesTerms(post, WEEKLY_UPDATES_TERMS))
  ));
  protected readonly medicalInfoPosts = computed(() => (
    this.allPublishedPosts().filter(post => postMatchesTerms(post, MEDICAL_INFORMATION_TERMS))
  ));
  protected readonly blogIsLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly blogLoadError = toSignal(this.blogRepository.error$, {initialValue: null});
  protected readonly pathNames = PATH_NAMES;
}
