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
import {
  createBlogCategorySlug,
  getBlogTaxonomyTerms
} from '../../features/blog/utils/blog-category-url.util';

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

const TECH_TIPS_CATEGORY = 'Tech Tips';
const ARTIFICIAL_INTELLIGENCE_SUBCATEGORY = 'Artificial Intelligence';
const TECH_TIPS_SERIES_IMAGE = '/assets/social/colin-michaels-og.jpg';

const TECH_TIPS_QUICK_LINKS = [
  {
    label: 'All Tech Tips',
    description: 'Tool notes, setup walkthroughs, and practical fixes.',
    category: TECH_TIPS_CATEGORY,
  },
  {
    label: ARTIFICIAL_INTELLIGENCE_SUBCATEGORY,
    description: 'How-to posts for using AI in creative and technical work.',
    category: ARTIFICIAL_INTELLIGENCE_SUBCATEGORY,
  },
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

function postHasTaxonomyTerm(post: BlogPostSummary, terms: readonly string[]): boolean {
  const normalizedTerms = new Set(terms.map(term => normalizeSearchValue(term)));

  return getBlogTaxonomyTerms(post)
    .some(term => normalizedTerms.has(normalizeSearchValue(term)));
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
                <a [routerLink]="['/', pathNames.BLOG, post.slug]"
                   class="site-media-link blog-post-image-frame group aspect-[16/10]">
                  <img [src]="postImage(post)" [alt]="post.title + ' cover image'"
                       class="blog-post-image-fill"
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

    <section id="tech-tips" class="site-section-band-dark">
      <div class="site-section-inner">
        <div class="site-section-header">
          <div>
            <p class="eyebrow eyebrow-cyan">AI & Tech</p>
            <h2 class="mt-3 heading-section">Tech Tips</h2>
            <p class="site-section-copy">
              Short, practical posts for newer tools, everyday workflows, and the places technology can remove friction.
            </p>
          </div>
          <a
            [routerLink]="['/', pathNames.BLOG, 'category', techTipsCategorySlug]"
            class="btn-link"
          >
            View Tech Tips
          </a>
        </div>

        @if (blogLoadError(); as error) {
          <div class="site-error-panel mt-8">
            <p class="font-medium text-rose-950 dark:text-red-100">Unable to load tech tips posts.</p>
            <p class="mt-2 text-sm">{{ error }}</p>
          </div>
        } @else {
          @defer (when !blogIsLoading()) {
            <div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-stretch">
              <article class="site-card overflow-hidden bg-zinc-950 text-zinc-50 dark:bg-black">
                <a
                  [routerLink]="['/', pathNames.BLOG, 'category', techTipsCategorySlug]"
                  class="site-media-link blog-post-image-frame group aspect-[16/10] bg-zinc-950"
                  aria-label="Browse Tech Tips posts"
                >
                  <img
                    [src]="techTipsSeriesImage()"
                    alt="AI and Tech Tips series graphic"
                    class="blog-post-image-fill opacity-35 saturate-125"
                    loading="lazy"
                  >
                  <div
                    class="absolute inset-0 bg-gradient-to-br from-cyan-950/95 via-zinc-950/90 to-emerald-950/90"></div>
                  <div class="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <p class="eyebrow-sm text-cyan-100">Tech Tips Series</p>
                      <span
                        class="border border-cyan-200/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-50">
                        {{ techTipsPosts().length }} post{{ techTipsPosts().length === 1 ? '' : 's' }}
                      </span>
                    </div>

                    <div class="max-w-xl">
                      <p class="text-sm font-semibold uppercase tracking-[0.26em] text-emerald-200">AI & Tech</p>
                      <h3 class="mt-3 text-4xl font-bold leading-none text-white sm:text-5xl">Tech Tips</h3>
                      <p class="mt-4 max-w-md text-sm leading-6 text-zinc-200 sm:text-base">
                        Practical guides for using AI, building better workflows, and making new tools feel useful.
                      </p>
                    </div>
                  </div>
                </a>
              </article>

              <aside class="site-card site-card-body flex flex-col gap-6">
                <div>
                  <p class="site-meta">About the series</p>
                  <p class="mt-3 text-body">
                    This will collect clear how-to posts, setup notes, and field-tested ideas for working with modern
                    technology. The first subcategory is Artificial Intelligence, focused on practical ways to use AI
                    in day-to-day projects.
                  </p>
                </div>

                <nav aria-label="Tech Tips subcategories" class="grid gap-3">
                  @for (link of techTipsQuickLinks(); track link.category) {
                    <a
                      [routerLink]="['/', pathNames.BLOG, 'category', link.slug]"
                      class="group flex items-start justify-between gap-4 border border-slate-200 p-4 transition
                      hover:border-cyan-500 hover:bg-cyan-50
                      dark:border-white/10 dark:hover:border-cyan-300 dark:hover:bg-cyan-300/10"
                    >
                      <span class="min-w-0">
                        <span
                          class="block text-sm font-semibold text-slate-950 group-hover:text-cyan-800 dark:text-zinc-50 dark:group-hover:text-cyan-200">
                          {{ link.label }}
                        </span>
                        <span class="mt-1 block text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                          {{ link.description }}
                        </span>
                      </span>
                      <span
                        class="shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
                        {{ link.count }} post{{ link.count === 1 ? '' : 's' }}
                      </span>
                    </a>
                  }
                </nav>

                <div>
                  <p class="site-meta">Latest in Tech Tips</p>
                  <div class="mt-3 divide-y divide-slate-200 dark:divide-zinc-800">
                    @for (post of techTipsFeaturedPosts(); track post.id) {
                      <a
                        [routerLink]="['/', pathNames.BLOG, post.slug]"
                        class="group block py-3 first:pt-0 last:pb-0"
                      >
                        <span class="site-meta">
                          {{ (post.publishedAt || post.updatedAt) | date: 'MMM d, y':'UTC' }}
                        </span>
                        <span
                          class="mt-2 block text-sm font-semibold leading-6 text-slate-950 group-hover:text-cyan-700 dark:text-zinc-50 dark:group-hover:text-cyan-300">
                          {{ post.title }}
                        </span>
                        <span class="mt-1 block text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                          {{ post.excerpt }}
                        </span>
                      </a>
                    } @empty {
                      <p
                        class="border border-dashed border-slate-300 p-4 text-sm leading-6 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                        Posts categorized as Tech Tips will appear here, with Artificial Intelligence as the first
                        focused subcategory.
                      </p>
                    }
                  </div>
                </div>
              </aside>
            </div>
          } @placeholder (minimum 300ms) {
            <div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <article class="site-skeleton-card">
                <div class="site-skeleton-block aspect-[16/10] w-full"></div>
              </article>
              <article class="site-skeleton-card p-5">
                <div class="site-skeleton-block h-3 w-28"></div>
                <div class="mt-4 space-y-3">
                  <div class="site-skeleton-block h-4 w-full"></div>
                  <div class="site-skeleton-block h-4 w-5/6"></div>
                  <div class="site-skeleton-block h-4 w-2/3"></div>
                </div>
                <div class="mt-6 grid gap-3">
                  <div class="site-skeleton-block h-20 w-full"></div>
                  <div class="site-skeleton-block h-20 w-full"></div>
                </div>
              </article>
            </div>
          }
        }
      </div>
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
  protected readonly techTipsPosts = computed(() => (
    this.allPublishedPosts().filter(post => postHasTaxonomyTerm(post, [TECH_TIPS_CATEGORY]))
  ));
  protected readonly techTipsFeaturedPosts = computed(() => this.techTipsPosts().slice(0, 3));
  protected readonly techTipsQuickLinks = computed(() => {
    const techTipsPosts = this.techTipsPosts();

    return TECH_TIPS_QUICK_LINKS.map(link => ({
      ...link,
      slug: createBlogCategorySlug(link.category),
      count: link.category === TECH_TIPS_CATEGORY
        ? techTipsPosts.length
        : techTipsPosts.filter(post => postHasTaxonomyTerm(post, [link.category])).length,
    }));
  });
  protected readonly techTipsSeriesImage = computed(() => {
    const featuredPost = this.techTipsPosts()[0];

    return featuredPost ? this.postImage(featuredPost) : TECH_TIPS_SERIES_IMAGE;
  });
  protected readonly blogIsLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly blogLoadError = toSignal(this.blogRepository.error$, {initialValue: null});
  protected readonly pathNames = PATH_NAMES;
  protected readonly techTipsCategorySlug = createBlogCategorySlug(TECH_TIPS_CATEGORY);

  protected postImage(post: BlogPostSummary): string {
    return post.thumbnailImage?.trim() || post.coverImage;
  }
}
