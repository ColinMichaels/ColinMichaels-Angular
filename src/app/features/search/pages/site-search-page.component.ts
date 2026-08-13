import {DatePipe, NgTemplateOutlet} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../app-route-paths';
import {SiteSearchOverlayService} from '../services/site-search-overlay.service';
import {
  getFeaturedSearchItems,
  getSearchCategories,
  getSearchAuthors,
  getSearchTags,
  searchSiteItems,
  SiteSearchContentType,
  SiteSearchFilters,
  SiteSearchResult,
  SiteSearchService,
  SiteSearchSortMode,
} from '../services/site-search.service';

type SearchTypeFilter = SiteSearchContentType | 'all';

const DEFAULT_TYPE_FILTER: SearchTypeFilter = 'all';
const DEFAULT_SORT: SiteSearchSortMode = 'relevance';

@Component({
  selector: 'app-site-search-page',
  imports: [
    DatePipe,
    NgTemplateOutlet,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="blog-page">
      <section class="site-layout site-layout-wide">
        <header class="blog-section-rule blog-page-header">
          <nav class="blog-breadcrumb" aria-label="Search navigation">
            <a routerLink="/" class="font-medium hover:text-cyan-800 dark:hover:text-cyan-200">Home</a>
            <span aria-hidden="true" class="mx-2">/</span>
            <span class="text-slate-900 dark:text-zinc-200">Search</span>
          </nav>

          <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <div>
              <h1 class="blog-page-title">Search ColinMichaels.com</h1>
              <p class="blog-page-description">
                Search published blog posts, categories, tags, article body text, and key public site sections.
              </p>
            </div>

            <div class="site-card site-card-body text-sm leading-6 text-slate-600 dark:text-zinc-400">
              <p class="site-meta">Indexed content</p>
              <p class="mt-2">
                {{ blogItemCount() }} blog post{{ blogItemCount() === 1 ? '' : 's' }} and
                {{ pageItemCount() }} public page{{ pageItemCount() === 1 ? '' : 's' }}.
              </p>
            </div>
          </div>

          <form class="mt-8 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" (submit)="submitSearch(searchInput.value)">
            <label for="site-search-query" class="sr-only">Search query</label>
            <input
              #searchInput
              id="site-search-query"
              type="search"
              [value]="query()"
              (input)="updateQuery(searchInput.value)"
              placeholder="Search posts, tags, topics, and pages"
              class="site-input min-h-12 text-base"
            >
            <button type="submit" class="blog-action-primary min-h-12 justify-center px-5">
              Search
            </button>
          </form>

          <section class="mt-5 grid gap-3 border-t border-slate-200 pt-5 dark:border-zinc-800 sm:grid-cols-2 lg:grid-cols-5" aria-label="Advanced search filters">
            <label class="grid gap-2">
              <span class="site-meta">Content</span>
              <select class="site-input" [value]="typeFilter()" (change)="setTypeFilter($any($event.target).value)">
                <option value="all">All content</option>
                <option value="blog">Blog posts</option>
                <option value="page">Pages</option>
              </select>
            </label>

            <label class="grid gap-2">
              <span class="site-meta">Category</span>
              <select class="site-input" [value]="categoryFilter()" (change)="setCategoryFilter($any($event.target).value)">
                <option value="">All categories</option>
                @for (category of categories(); track category) {
                  <option [value]="category">{{ category }}</option>
                }
              </select>
            </label>

            <label class="grid gap-2">
              <span class="site-meta">Tag</span>
              <select class="site-input" [value]="tagFilter()" (change)="setTagFilter($any($event.target).value)">
                <option value="">All tags</option>
                @for (tag of tags(); track tag) {
                  <option [value]="tag">{{ tag }}</option>
                }
              </select>
            </label>

            <label class="grid gap-2">
              <span class="site-meta">Author</span>
              <select class="site-input" [value]="authorFilter()" (change)="setAuthorFilter($any($event.target).value)">
                <option value="">All authors</option>
                @for (author of authors(); track author.slug) {
                  <option [value]="author.slug">{{ author.name }}</option>
                }
              </select>
            </label>

            <label class="grid gap-2">
              <span class="site-meta">Sort</span>
              <select class="site-input" [value]="sortMode()" (change)="setSortMode($any($event.target).value)">
                <option value="relevance">Relevance</option>
                <option value="newest">Newest</option>
              </select>
            </label>
          </section>

          @if (hasActiveSearch()) {
            <div class="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" class="btn-ghost min-h-10 px-3 py-2" (click)="clearSearch()">
                Clear search
              </button>
              <p class="text-sm text-slate-600 dark:text-zinc-500">
                {{ results().length }} result{{ results().length === 1 ? '' : 's' }}
                @if (normalizedQuery().length > 0) {
                  for <span class="font-medium text-cyan-700 dark:text-cyan-300">{{ query().trim() }}</span>
                }
              </p>
            </div>
          }
        </header>

        @if (loadError(); as error) {
          <div class="blog-section-rule blog-state-panel">
            <p class="blog-state-title">Unable to load searchable content from Firestore.</p>
            <p class="mt-2 text-sm">{{ error }}</p>
          </div>
        } @else {
          @if (isLoading()) {
            <div class="grid gap-4">
              <div class="site-skeleton-card h-32"></div>
              <div class="site-skeleton-card h-32"></div>
              <div class="site-skeleton-card h-32"></div>
            </div>
          } @else {
            @if (!hasActiveSearch()) {
              <section class="blog-section-rule">
                <div class="mb-5">
                  <h2 class="heading-subsection">Recent posts and key pages</h2>
                  <p class="mt-2 text-body">Start typing to search deeper across published article body text.</p>
                </div>
                <div class="grid gap-4">
                  @for (result of featuredResults(); track trackResult($index, result)) {
                    <ng-container [ngTemplateOutlet]="resultTemplate" [ngTemplateOutletContext]="{$implicit: result}"></ng-container>
                  }
                </div>
              </section>
            } @else {
              <section class="grid gap-4" aria-label="Search results">
                @for (result of results(); track trackResult($index, result)) {
                  <ng-container [ngTemplateOutlet]="resultTemplate" [ngTemplateOutletContext]="{$implicit: result}"></ng-container>
                } @empty {
                  <div class="blog-section-rule blog-state-panel">
                    <p class="blog-state-title">No matching results.</p>
                    <p class="mt-2 text-sm">Try a broader term, remove filters, or search by category and tag.</p>
                    <button type="button" class="blog-action-primary mt-5" (click)="clearSearch()">
                      Reset search
                    </button>
                  </div>
                }
              </section>
            }
          }
        }
      </section>
    </main>

    <ng-template #resultTemplate let-result>
      <article class="site-card-interactive grid gap-4 p-4 md:grid-cols-[9rem_minmax(0,1fr)]">
        @if (result.image) {
          <a
            [routerLink]="result.path"
            [queryParams]="resultSearchQueryParams()"
            class="blog-media-frame blog-post-image-frame group aspect-[16/9]"
          >
            <img
              [src]="result.image"
              [alt]="result.title + ' preview image'"
              class="blog-post-image-fill"
              loading="lazy"
            >
          </a>
        } @else {
          <a
            [routerLink]="result.path"
            [queryParams]="resultSearchQueryParams()"
            class="blog-media-frame grid aspect-[16/9] place-items-center bg-slate-100 text-slate-500 transition hover:border-cyan-600 hover:text-cyan-700 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:border-cyan-300 dark:hover:text-cyan-200"
            aria-label="Open {{ result.title }}"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-8 w-8" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3h6.8L19 7.7v10.8a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18.5v-13Z"></path>
              <path d="M14 3v5h5M8.5 12h7M8.5 15.5h5"></path>
            </svg>
          </a>
        }

        <div class="min-w-0">
          <div class="site-meta-row">
            <span>{{ result.type === 'blog' ? 'Blog post' : 'Page' }}</span>
            @if (result.date) {
              <span aria-hidden="true">/</span>
              <span>{{ result.date | date: 'MMM d, y' }}</span>
            }
          </div>

          <h2 class="mt-2 heading-subsection">
            <a
              [routerLink]="result.path"
              [queryParams]="resultSearchQueryParams()"
              class="hover:text-cyan-700 dark:hover:text-cyan-300"
            >
              {{ result.title }}
            </a>
          </h2>
          <p class="mt-2 max-w-3xl text-body">{{ result.excerpt }}</p>

          @if (result.authorName) {
            <a [routerLink]="['/', pathNames.AUTHORS, result.authorSlug]" class="mt-3 inline-flex text-sm font-medium text-cyan-700 hover:text-cyan-600 dark:text-cyan-300">
              By {{ result.authorName }}
            </a>
          }

          <div class="mt-4 flex flex-wrap gap-2">
            @for (category of result.categories; track category) {
              <span class="blog-category-badge">{{ category }}</span>
            }
            @for (tag of result.tags.slice(0, 4); track tag) {
              <span class="blog-tag-chip">{{ tag }}</span>
            }
          </div>

          @if (result.matchedFields.length > 0) {
            <p class="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-500">
              Matched {{ result.matchedFields.join(', ') }}
            </p>
          }
        </div>
      </article>
    </ng-template>
  `,
})
export class SiteSearchPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly search = inject(SiteSearchService);
  private readonly searchOverlay = inject(SiteSearchOverlayService);

  protected readonly pathNames = PATH_NAMES;
  protected readonly query = signal('');
  protected readonly typeFilter = signal<SearchTypeFilter>(DEFAULT_TYPE_FILTER);
  protected readonly categoryFilter = signal('');
  protected readonly tagFilter = signal('');
  protected readonly authorFilter = signal('');
  protected readonly sortMode = signal<SiteSearchSortMode>(DEFAULT_SORT);
  protected readonly items = toSignal(this.search.getSearchItems$(), {initialValue: []});
  protected readonly isLoading = toSignal(this.search.loading$, {initialValue: true});
  protected readonly loadError = toSignal(this.search.error$, {initialValue: null});
  protected readonly normalizedQuery = computed(() => this.query().trim());
  protected readonly categories = computed(() => getSearchCategories(this.items()));
  protected readonly tags = computed(() => getSearchTags(this.items()));
  protected readonly authors = computed(() => getSearchAuthors(this.items()));
  protected readonly blogItemCount = computed(() => this.items().filter(item => item.type === 'blog').length);
  protected readonly pageItemCount = computed(() => this.items().filter(item => item.type === 'page').length);
  protected readonly hasActiveSearch = computed(() => (
    this.normalizedQuery().length > 0
    || this.typeFilter() !== DEFAULT_TYPE_FILTER
    || this.categoryFilter().length > 0
    || this.tagFilter().length > 0
    || this.authorFilter().length > 0
  ));
  protected readonly filters = computed<SiteSearchFilters>(() => ({
    query: this.query(),
    type: this.typeFilter(),
    category: this.categoryFilter(),
    tag: this.tagFilter(),
    author: this.authorFilter(),
    sort: this.sortMode(),
  }));
  protected readonly results = computed(() => searchSiteItems(this.items(), this.filters(), 60));
  protected readonly featuredResults = computed(() => getFeaturedSearchItems(this.items(), 8));

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.query.set(params.get('q') ?? '');
      this.searchOverlay.setQuery(this.query());
      this.typeFilter.set(parseTypeFilter(params.get('type')));
      this.categoryFilter.set(params.get('category') ?? '');
      this.tagFilter.set(params.get('tag') ?? '');
      this.authorFilter.set(params.get('author') ?? '');
      this.sortMode.set(parseSortMode(params.get('sort')));
    });
  }

  protected updateQuery(value: string): void {
    this.query.set(value);
    this.searchOverlay.setQuery(value);
  }

  protected submitSearch(value: string): false {
    this.query.set(value.trim());
    this.searchOverlay.setQuery(this.query());
    this.syncQueryParams();

    return false;
  }

  protected setTypeFilter(value: string): void {
    this.typeFilter.set(parseTypeFilter(value));
    this.syncQueryParams();
  }

  protected setCategoryFilter(value: string): void {
    this.categoryFilter.set(value);
    this.syncQueryParams();
  }

  protected setTagFilter(value: string): void {
    this.tagFilter.set(value);
    this.syncQueryParams();
  }

  protected setAuthorFilter(value: string): void {
    this.authorFilter.set(value);
    this.syncQueryParams();
  }

  protected setSortMode(value: string): void {
    this.sortMode.set(parseSortMode(value));
    this.syncQueryParams();
  }

  protected clearSearch(): void {
    this.query.set('');
    this.searchOverlay.setQuery('');
    this.typeFilter.set(DEFAULT_TYPE_FILTER);
    this.categoryFilter.set('');
    this.tagFilter.set('');
    this.authorFilter.set('');
    this.sortMode.set(DEFAULT_SORT);
    this.syncQueryParams();
  }

  protected trackResult(index: number, result: SiteSearchResult): string {
    return `${result.type}-${result.id}-${index}`;
  }

  protected resultSearchQueryParams(): {q?: string} {
    const query = this.query().trim();
    return query ? {q: query} : {};
  }

  private syncQueryParams(): void {
    void this.router.navigate(['/', PATH_NAMES.SEARCH], {
      queryParams: {
        q: this.query().trim() || null,
        type: this.typeFilter() === DEFAULT_TYPE_FILTER ? null : this.typeFilter(),
        category: this.categoryFilter() || null,
        tag: this.tagFilter() || null,
        author: this.authorFilter() || null,
        sort: this.sortMode() === DEFAULT_SORT ? null : this.sortMode(),
      },
      replaceUrl: true,
    });
  }
}

function parseTypeFilter(value: string | null): SearchTypeFilter {
  return value === 'blog' || value === 'page' ? value : DEFAULT_TYPE_FILTER;
}

function parseSortMode(value: string | null): SiteSearchSortMode {
  return value === 'newest' ? 'newest' : DEFAULT_SORT;
}
