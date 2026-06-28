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
    <section id="blog" class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div
        class="blog-section-rule flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 class="mt-3 heading-section">Latest writing</h2>
        </div>
        <a [routerLink]="['/', pathNames.BLOG]" class="btn-link">
          View all posts
        </a>
      </div>

      @if (blogLoadError(); as error) {
        <div class="mt-8 border border-white/10 bg-zinc-900 p-5 text-zinc-400">
          <p class="font-medium text-zinc-100">Unable to load latest posts.</p>
          <p class="mt-2 text-sm">{{ error }}</p>
        </div>
      } @else {
        @defer (when !blogIsLoading()) {
          <div class="mt-8 grid gap-5 lg:grid-cols-3">
            @for (post of publishedPosts(); track post.id) {
              <article class="flex h-full flex-col overflow-hidden border border-white/10 bg-zinc-900">
                <a [routerLink]="['/', pathNames.BLOG, post.slug]" class="group block overflow-hidden">
                  <img [src]="post.coverImage" [alt]="post.title + ' cover image'"
                       class="aspect-[16/10] w-full object-cover transition duration-300 ease-in-out group-hover:scale-105 group-hover:brightness-110"
                       loading="lazy">
                </a>
                <div class="flex flex-1 flex-col p-5">
                  <p class="eyebrow-sm eyebrow-muted">
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
              <p class="border border-white/10 p-5 text-zinc-400">No published posts yet.</p>
            }
          </div>
        } @placeholder (minimum 300ms) {
          <div class="mt-8 grid gap-5 lg:grid-cols-3">
            @for (i of [1, 2, 3]; track i) {
              <article
                class="flex h-full flex-col overflow-hidden border border-zinc-200 bg-zinc-100 dark:border-white/10 dark:bg-zinc-900"
                aria-hidden="true">
                <div class="aspect-[16/10] w-full animate-pulse bg-zinc-200 dark:bg-zinc-800"></div>
                <div class="flex flex-1 flex-col gap-3 p-5">
                  <div class="h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                  <div class="h-6 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                  <div class="space-y-2">
                    <div class="h-3 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                    <div class="h-3 w-4/5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                  </div>
                </div>
              </article>
            }
          </div>
        }
      }
    </section>

    <section id="health-recovery" class="border-y border-white/10 bg-neutral-900/10 py-12">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          class="blog-section-rule flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="eyebrow eyebrow-emerald">Health & Recovery</p>
            <h2 class="mt-3 heading-section">Weekly Updates</h2>
            <p class="mt-4 max-w-3xl text-body">
              Weekly recovery notes, personal updates, and posts about the recent open heart surgery process.
            </p>
          </div>
          <a [routerLink]="['/', pathNames.BLOG]" class="btn-link">
            Browse the blog
          </a>
        </div>

        @if (blogLoadError(); as error) {
          <div class="mt-8 border border-white/10 bg-zinc-950 p-5 text-zinc-400">
            <p class="font-medium text-zinc-100">Unable to load health and recovery posts.</p>
            <p class="mt-2 text-sm">{{ error }}</p>
          </div>
        } @else {
          @defer (when !blogIsLoading()) {
            <div class="mt-8 divide-y divide-zinc-800">
              @for (post of healthRecoveryPosts(); track post.id) {
                <app-blog-post-card [post]="post" [showTags]="false"></app-blog-post-card>
              } @empty {
                <p class="border border-white/10 bg-zinc-950 p-5 text-sm leading-6 text-zinc-400">
                  No published health and recovery posts yet. Posts tagged or categorized with recovery, weekly updates,
                  open heart surgery, or cardiac recovery will appear here.
                </p>
              }
            </div>
          } @placeholder (minimum 300ms) {
            <div class="mt-8 divide-y divide-zinc-800">
              <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
              <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
            </div>
          }
        }
      </div>
    </section>

    <section id="medical-information" class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div
        class="blog-section-rule flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="eyebrow eyebrow-rose">Things I learned in the Hospital</p>
          <h2 class="mt-3 heading-section">Medical advice from a friend</h2>
          <p class="mt-4 max-w-3xl text-body">
            Sharing some of the things I learned while in the hospital that I wish someone told me.
          </p>
        </div>
        <a [routerLink]="['/', pathNames.BLOG]" class="btn-link">
          View all writing
        </a>
      </div>

      @if (blogLoadError(); as error) {
        <div class="mt-8 border border-white/10 bg-zinc-900 p-5 text-zinc-400">
          <p class="font-medium text-zinc-100">Unable to load posts.</p>
          <p class="mt-2 text-sm">{{ error }}</p>
        </div>
      } @else {
        @defer (when !blogIsLoading()) {
          <div class="mt-8 divide-y divide-zinc-800">
            @for (post of medicalInfoPosts(); track post.id) {
              <app-blog-post-card [post]="post" [showTags]="false"></app-blog-post-card>
            } @empty {
              <p class="border border-white/10 bg-zinc-900 p-5 text-sm leading-6 text-zinc-400">
                No published medical information posts yet. Posts tagged or categorized with medical information,
                procedures, medications, cardiology, or related surgery-care terms will appear here.
              </p>
            }
          </div>
        } @placeholder (minimum 300ms) {
          <div class="mt-8 divide-y divide-zinc-800">
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
