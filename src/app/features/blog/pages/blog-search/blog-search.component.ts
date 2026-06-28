import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogCategoryNavComponent} from '../../components/category-nav/blog-category-nav.component';
import {BlogPostCardComponent} from '../../components/post-card/post-card.component';
import {BlogPostCardSkeletonComponent} from '../../components/post-card/blog-post-card-skeleton.component';
import {BlogOpenGraphService} from '../../services/blog-open-graph.service';
import {BlogRepositoryService} from '../../services/blog-repository.service';
import {BlogPost} from '../../models/blog-post.model';

@Component({
  selector: 'app-blog-search',
  imports: [
    RouterLink,
    BlogCategoryNavComponent,
    BlogPostCardComponent,
    BlogPostCardSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="blog-page">
      <section class="mx-auto max-w-5xl">
        <header class="blog-section-rule mb-10 border-b border-slate-200 pb-8 dark:border-zinc-800">
          <nav class="mb-6 text-sm text-slate-600 dark:text-zinc-400" aria-label="Blog navigation">
            <a [routerLink]="['/', pathNames.BLOG]" class="font-medium hover:text-cyan-800 dark:hover:text-cyan-200">Blog</a>
            <span aria-hidden="true" class="mx-2">/</span>
            <span class="text-slate-900 dark:text-zinc-200">Search</span>
          </nav>
          <h1 class="text-3xl font-semibold text-slate-950 dark:text-zinc-50 sm:text-5xl">Search Blog</h1>
          <form class="mt-6 flex flex-col gap-3 sm:flex-row" (submit)="submitSearch(searchInput.value)">
            <input
              #searchInput
              type="search"
              [value]="searchTerm()"
              (input)="updateSearch(searchInput.value)"
              placeholder="Search posts"
              class="min-h-11 flex-1 border border-slate-300 bg-white px-4 py-2 text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-cyan-300"
            >
            <button
              type="submit"
              class="min-h-11 border border-cyan-700 bg-cyan-50 px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-800 transition hover:bg-cyan-600 hover:text-white dark:border-cyan-400 dark:bg-transparent dark:text-cyan-200 dark:hover:bg-cyan-400 dark:hover:text-zinc-950"
            >
              Search
            </button>
          </form>
          <div class="mt-6">
            <app-blog-category-nav></app-blog-category-nav>
          </div>
        </header>

        <section>
          @if (loadError(); as error) {
            <div class="blog-section-rule py-8">
              <p class="text-lg font-medium text-slate-950 dark:text-zinc-100">Unable to load blog posts from Firestore.</p>
              <p class="mt-2 text-sm text-slate-600 dark:text-zinc-400">{{ error }}</p>
            </div>
          } @else {
            @defer (when !isLoading()) {
              @if (normalizedSearchTerm().length === 0) {
                <div class="blog-section-rule py-8">
                  <p class="text-lg font-medium text-slate-950 dark:text-zinc-100">Enter a search term.</p>
                  <p class="mt-2 text-sm text-slate-600 dark:text-zinc-400">
                    Search covers titles, excerpts, categories, tags, and article body text.
                  </p>
                </div>
              } @else {
                <p class="blog-section-rule py-4 text-sm text-slate-600 dark:text-zinc-500">
                  Showing {{ filteredPosts().length }} result{{ filteredPosts().length === 1 ? '' : 's' }}
                  for <span class="font-medium text-cyan-700 dark:text-cyan-300">{{ searchTerm().trim() }}</span>.
                </p>

                @for (post of filteredPosts(); track post.id) {
                  <app-blog-post-card [post]="post"></app-blog-post-card>
                } @empty {
                  <div class="blog-section-rule py-8">
                    <p class="text-lg font-medium text-slate-950 dark:text-zinc-100">No matching posts.</p>
                    <a [routerLink]="['/', pathNames.BLOG]" class="mt-5 inline-block font-medium text-cyan-700 hover:text-cyan-900 dark:text-cyan-300 dark:hover:text-cyan-200">
                      View all posts
                    </a>
                  </div>
                }
              }
            } @placeholder (minimum 300ms) {
              <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
              <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
              <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
            } @loading (after 150ms; minimum 300ms) {
              <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
              <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
              <app-blog-post-card-skeleton></app-blog-post-card-skeleton>
            }
          }
        </section>
      </section>
    </main>
  `,
})
export class BlogSearchComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly openGraph = inject(BlogOpenGraphService);

  protected readonly pathNames = PATH_NAMES;
  protected readonly searchTerm = signal(this.route.snapshot.queryParamMap.get('q') ?? '');
  protected readonly posts = toSignal(this.blogRepository.getPublishedFullPosts$(), {initialValue: []});
  protected readonly isLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly loadError = toSignal(this.blogRepository.error$, {initialValue: null});
  protected readonly normalizedSearchTerm = computed(() => normalizeSearchValue(this.searchTerm()));
  protected readonly filteredPosts = computed(() => {
    const query = this.normalizedSearchTerm();

    if (!query) {
      return [];
    }

    return this.posts().filter(post => createSearchText(post).includes(query));
  });

  constructor() {
    this.openGraph.applyBlogSearch();
  }

  protected updateSearch(value: string): void {
    this.searchTerm.set(value);
  }

  protected submitSearch(value: string): false {
    const query = value.trim();
    this.searchTerm.set(query);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: query ? {q: query} : {},
      replaceUrl: true,
    });

    return false;
  }
}

function createSearchText(post: BlogPost): string {
  const blockText = post.blocks
    .flatMap(block => [
      block.data.text,
      block.data.caption,
      block.data.attribution,
      block.data.code,
      ...(block.data.items ?? []),
    ])
    .filter((value): value is string => typeof value === 'string')
    .join(' ');

  return normalizeSearchValue([
    post.title,
    post.excerpt,
    post.categories.join(' '),
    (post.subcategories ?? []).join(' '),
    post.tags.join(' '),
    blockText,
  ].join(' '));
}

function normalizeSearchValue(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
