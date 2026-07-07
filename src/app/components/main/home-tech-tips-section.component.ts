import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {BlogPostSummary} from '../../features/blog/models/blog-post.model';
import {createBlogCategorySlug} from '../../features/blog/utils/blog-category-url.util';
import {resolveBlogPostImage} from '../../features/blog/utils/blog-image-url.util';
import {HomeBlogPostFeedService} from './home-blog-post-feed.service';
import {postHasTaxonomyTerm} from './home-blog-section.utils';

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

@Component({
  selector: 'app-home-tech-tips-section',
  imports: [
    DatePipe,
    RouterLink,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section id="tech-tips" class="site-section-band-dark site-section-theme-soft topic-theme-ai">
      <div class="site-section-inner">
        <div class="site-section-header">
          <div>
            <p class="eyebrow eyebrow-topic">AI & Tech</p>
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
          @defer (when blogIsReady()) {
            <div class="mt-4 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-stretch">
              <article class="site-card overflow-hidden bg-zinc-950 text-zinc-50 dark:bg-black">
                <a
                  [routerLink]="['/', pathNames.BLOG, 'category', techTipsCategorySlug]"
                  class="site-media-link blog-post-image-frame group aspect-[16/9] bg-zinc-950"
                  aria-label="Browse Tech Tips posts"
                >
                  <img
                    [src]="techTipsSeriesImage()"
                    alt="AI and Tech Tips series graphic"
                    class="blog-post-image-fill opacity-35 saturate-125"
                    loading="lazy"
                  >
                  <div class="home-tech-feature-overlay absolute inset-0"></div>
                  <div class="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <p class="eyebrow-sm home-topic-light-label">Tech Tips Series</p>
                      <span
                        class="home-topic-count-label">
                        {{ techTipsPosts().length }} post{{ techTipsPosts().length === 1 ? '' : 's' }}
                      </span>
                    </div>

                    <div class="max-w-xl">
                      <p class="home-topic-feature-kicker">AI & Tech</p>
                      <h3 class="mt-3 text-4xl font-bold leading-none text-white sm:text-5xl">Tech Tips</h3>
                      <p class="mt-4 max-w-md text-sm leading-6 text-zinc-200 sm:text-base">
                        Practical guides for using AI, building better workflows, and making new tools feel useful.
                      </p>
                    </div>
                  </div>
                </a>
              </article>

              <aside class="site-card site-card-body flex flex-col gap-6">
                <nav aria-label="Tech Tips subcategories" class="grid gap-3">
                  @for (link of techTipsQuickLinks(); track link.category) {
                    <a
                      [routerLink]="['/', pathNames.BLOG, 'category', link.slug]"
                      class="home-topic-quick-link group flex items-start justify-between gap-4 border p-4 transition"
                    >
                      <span class="min-w-0">
                        <span
                          class="block text-sm font-semibold text-slate-950 dark:text-zinc-50">
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
                          class="home-topic-text-link mt-2 block text-sm font-semibold leading-6">
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
                <div class="site-skeleton-block aspect-[16/9] w-full"></div>
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
  `,
  styles: [`
    .home-tech-feature-overlay {
      background:
        radial-gradient(circle at 20% 18%, rgb(var(--site-accent-rgb) / 0.36), transparent 18rem),
        radial-gradient(circle at 86% 92%, rgb(var(--topic-architecture-rgb) / 0.24), transparent 22rem),
        linear-gradient(135deg, rgba(8, 47, 73, 0.95), rgba(9, 9, 11, 0.9) 52%, rgba(20, 83, 45, 0.78));
    }

    .home-topic-light-label,
    .home-topic-feature-kicker {
      color: color-mix(in srgb, var(--site-accent) 34%, #ffffff);
    }

    .home-topic-count-label {
      border: 1px solid rgb(var(--site-accent-rgb) / 0.42);
      color: color-mix(in srgb, var(--site-accent) 28%, #ffffff);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.18em;
      padding: 0.25rem 0.75rem;
      text-transform: uppercase;
    }

    .home-topic-feature-kicker {
      font-size: 0.875rem;
      font-weight: 700;
      letter-spacing: 0.26em;
      text-transform: uppercase;
    }

    .home-topic-quick-link {
      border-color: rgba(203, 213, 225, 0.95);
      background: rgba(255, 255, 255, 0.68);
    }

    .home-topic-quick-link:hover {
      border-color: var(--site-accent);
      background: rgb(var(--site-accent-rgb) / 0.08);
    }

    .home-topic-quick-link:hover span:first-child > span:first-child {
      color: var(--site-accent-strong);
    }

    .home-topic-text-link {
      color: var(--site-heading);
    }

    .home-topic-text-link:hover {
      color: var(--site-accent-strong);
    }

    :host-context(.dark) .home-topic-quick-link {
      border-color: rgba(255, 255, 255, 0.1);
      background: rgba(24, 24, 27, 0.58);
    }

    :host-context(.dark) .home-topic-quick-link:hover {
      border-color: var(--site-accent);
      background: rgb(var(--site-accent-rgb) / 0.12);
    }
  `],
})
export class HomeTechTipsSectionComponent {
  private readonly blogPostFeed = inject(HomeBlogPostFeedService);

  protected readonly allPublishedPosts = this.blogPostFeed.publishedPosts;
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
  protected readonly blogIsReady = this.blogPostFeed.isReady;
  protected readonly blogLoadError = this.blogPostFeed.loadError;
  protected readonly pathNames = PATH_NAMES;
  protected readonly techTipsCategorySlug = createBlogCategorySlug(TECH_TIPS_CATEGORY);

  private postImage(post: BlogPostSummary): string {
    return resolveBlogPostImage(post);
  }
}
