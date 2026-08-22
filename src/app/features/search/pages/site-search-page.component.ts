import {DatePipe, NgTemplateOutlet} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../app-route-paths';
import {SiteAnalyticsService} from '../../../shared/analytics/site-analytics.service';
import {PostImageScrubberComponent} from '../../blog/components/post-image-scrubber/post-image-scrubber.component';
import {PostImagePreviewDirective} from '../../blog/directives/post-image-preview.directive';
import {BlogGalleryImage} from '../../blog/models/blog-post.model';
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
    PostImagePreviewDirective,
    PostImageScrubberComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="blog-page search-page">
      <section class="site-layout site-layout-wide">
        <header class="blog-section-rule blog-page-header search-page-header">
          <nav class="blog-breadcrumb" aria-label="Search navigation">
            <a routerLink="/" class="font-medium hover:text-cyan-800 dark:hover:text-cyan-200">Home</a>
            <span aria-hidden="true" class="mx-2">/</span>
            <span class="text-slate-900 dark:text-zinc-200">Search</span>
          </nav>

          <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div class="min-w-0">
              <h1 class="search-page-title">Search</h1>
              <p class="search-page-description">
                Find published posts and pages by keyword, topic, tag, or author.
              </p>
            </div>

            <p class="search-index-count">
              {{ blogItemCount() }} posts <span aria-hidden="true">·</span> {{ pageItemCount() }} pages indexed
            </p>
          </div>

          <form class="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]" (submit)="submitSearch(searchInput.value)">
            <label for="site-search-query" class="sr-only">Search query</label>
            <input
              #searchInput
              id="site-search-query"
              type="search"
              [value]="query()"
              (input)="updateQuery(searchInput.value)"
              placeholder="Search posts, tags, topics, and pages"
              class="site-input min-h-11 text-base"
            >
            <button type="submit" class="blog-action-primary min-h-11 justify-center px-5">
              Search
            </button>
          </form>

          <section class="search-filter-bar" aria-label="Advanced search filters">
            <label class="search-filter-control">
              <span class="site-meta">Content</span>
              <select class="site-input search-filter-select" [value]="typeFilter()" (change)="setTypeFilter($any($event.target).value)">
                <option value="all">All content</option>
                <option value="blog">Blog posts</option>
                <option value="page">Pages</option>
              </select>
            </label>

            <label class="search-filter-control">
              <span class="site-meta">Category</span>
              <select class="site-input search-filter-select" [value]="categoryFilter()" (change)="setCategoryFilter($any($event.target).value)">
                <option value="">All categories</option>
                @for (category of categories(); track category) {
                  <option [value]="category">{{ category }}</option>
                }
              </select>
            </label>

            <label class="search-filter-control">
              <span class="site-meta">Tag</span>
              <select class="site-input search-filter-select" [value]="tagFilter()" (change)="setTagFilter($any($event.target).value)">
                <option value="">All tags</option>
                @for (tag of tags(); track tag) {
                  <option [value]="tag">{{ tag }}</option>
                }
              </select>
            </label>

            <label class="search-filter-control">
              <span class="site-meta">Author</span>
              <select class="site-input search-filter-select" [value]="authorFilter()" (change)="setAuthorFilter($any($event.target).value)">
                <option value="">All authors</option>
                @for (author of authors(); track author.slug) {
                  <option [value]="author.slug">{{ author.name }}</option>
                }
              </select>
            </label>

            <label class="search-filter-control search-filter-sort">
              <span class="site-meta">Sort</span>
              <select class="site-input search-filter-select" [value]="sortMode()" (change)="setSortMode($any($event.target).value)">
                <option value="relevance">Relevance</option>
                <option value="newest">Newest</option>
              </select>
            </label>
          </section>
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
              <section aria-labelledby="search-featured-heading">
                <div class="search-results-heading">
                  <div>
                    <h2 id="search-featured-heading" class="search-results-title">Recent posts and pages</h2>
                    <p class="search-results-summary">{{ featuredResults().length }} suggestions from the full index</p>
                  </div>
                </div>
                <div class="search-results-list">
                  @for (result of featuredResults(); track trackResult($index, result)) {
                    <ng-container [ngTemplateOutlet]="resultTemplate" [ngTemplateOutletContext]="{$implicit: result}"></ng-container>
                  }
                </div>
              </section>
            } @else {
              <section aria-labelledby="search-results-heading">
                <div class="search-results-heading">
                  <div>
                    <h2 id="search-results-heading" class="search-results-title">
                      {{ results().length }} result{{ results().length === 1 ? '' : 's' }}
                    </h2>
                    <p class="search-results-summary" aria-live="polite">
                      @if (normalizedQuery().length > 0) {
                        Matching <span class="font-medium text-cyan-700 dark:text-cyan-300">{{ query().trim() }}</span>
                      } @else {
                        Matching the selected filters
                      }
                    </p>
                  </div>

                  <button type="button" class="btn-ghost min-h-9 px-3 py-1.5" (click)="clearSearch()">
                    Clear
                  </button>
                </div>

                <div class="search-results-list" aria-label="Search results">
                  @for (result of results(); track trackResult($index, result)) {
                    <ng-container [ngTemplateOutlet]="resultTemplate" [ngTemplateOutletContext]="{$implicit: result}"></ng-container>
                  } @empty {
                    <div class="blog-state-panel py-7">
                      <p class="blog-state-title">No matching results.</p>
                      <p class="mt-2 text-sm">Try a broader term, remove filters, or search by category and tag.</p>
                      <button type="button" class="blog-action-primary mt-5" (click)="clearSearch()">
                        Reset search
                      </button>
                    </div>
                  }
                </div>
              </section>
            }
          }
        }
      </section>
    </main>

    <ng-template #resultTemplate let-result>
      <article class="search-result-row">
        @if (result.image) {
          <a
            [routerLink]="result.path"
            [queryParams]="resultSearchQueryParams()"
            class="blog-image-reveal blog-media-frame blog-post-image-frame post-listing__media search-result-media group aspect-video"
            [appPostImagePreview]="result.id"
            [postImagePreviewTitle]="result.title"
            [postImagePreviewImages]="result.previewImages ?? emptyPreviewImages"
            #imagePreview="postImagePreview"
            (click)="selectResult(result)"
          >
            <span class="absolute inset-0 overflow-hidden">
              <img
                [src]="result.image"
                [alt]="result.title + ' preview image'"
                class="blog-post-image-fill post-listing__image"
                [class.post-image-scrubber-cover--active]="imagePreview.active()"
                [class.post-image-scrubber-cover--buffering]="imagePreview.buffering()"
                loading="lazy"
              >
              @if (imagePreview.active()) {
                <app-post-image-scrubber
                  [images]="result.previewImages ?? emptyPreviewImages"
                  [activeIndex]="imagePreview.activeIndex()"
                  [settledUrls]="imagePreview.settledUrls()"
                  [buffering]="imagePreview.buffering()"
                  (imageSettled)="imagePreview.settle($event)"
                ></app-post-image-scrubber>
              }
            </span>
          </a>
          @if (imagePreview.active()) {
            <span
              [id]="imagePreview.statusId()"
              class="sr-only"
              role="status"
              aria-live="polite"
            >
              {{ imagePreview.status() }}
            </span>
          }
        } @else {
          <a
            [routerLink]="result.path"
            [queryParams]="resultSearchQueryParams()"
            class="blog-media-frame grid aspect-video place-items-center bg-slate-100 text-slate-500 transition hover:border-cyan-600 hover:text-cyan-700 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:border-cyan-300 dark:hover:text-cyan-200"
            aria-label="Open {{ result.title }}"
            (click)="selectResult(result)"
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
            @if (result.authorName) {
              <span aria-hidden="true">/</span>
              <a [routerLink]="['/', pathNames.AUTHORS, result.authorSlug]" class="font-medium hover:text-cyan-700 dark:hover:text-cyan-300">
                {{ result.authorName }}
              </a>
            }
          </div>

          <h2 class="search-result-title">
            <a
              [routerLink]="result.path"
              [queryParams]="resultSearchQueryParams()"
              class="hover:text-cyan-700 dark:hover:text-cyan-300"
              (click)="selectResult(result)"
            >
              {{ result.title }}
            </a>
          </h2>
          <p class="search-result-excerpt">{{ result.excerpt }}</p>

          <div class="search-result-taxonomy">
            @for (category of result.categories.slice(0, 2); track category) {
              <span class="blog-category-badge">{{ category }}</span>
            }
            @for (tag of result.tags.slice(0, 2); track tag) {
              <span class="blog-tag-chip">{{ tag }}</span>
            }

            @if (result.matchedFields.length > 0) {
              <span class="search-result-match">Matched {{ result.matchedFields.join(', ') }}</span>
            }
          </div>
        </div>
      </article>
    </ng-template>
  `,
  styles: [`
    .search-page {
      padding-block-start: clamp(1.5rem, 3vw, 2.25rem);
    }

    .search-page-header {
      margin-bottom: 1.5rem;
      padding-bottom: 1.25rem;
    }

    .search-page-header .blog-breadcrumb {
      margin-bottom: 1rem;
    }

    .search-page-title {
      color: var(--site-heading);
      font-family: var(--font-heading);
      font-size: clamp(2rem, 5vw, 2.75rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1;
    }

    .search-page-description {
      max-width: 42rem;
      margin-top: 0.65rem;
      color: var(--site-muted);
      font-size: 0.95rem;
      line-height: 1.55;
    }

    .search-index-count {
      flex: none;
      color: var(--site-muted);
      font-family: var(--font-accent);
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      line-height: 1.4;
      text-transform: uppercase;
    }

    .search-filter-bar {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.65rem;
      margin-top: 0.75rem;
      padding-block: 0.75rem;
      border-block: 1px solid var(--site-border);
    }

    .search-filter-control {
      display: grid;
      min-width: 0;
      gap: 0.35rem;
    }

    .search-filter-select {
      width: 100%;
      min-height: 2.45rem;
      padding-block: 0.35rem;
      padding-inline: 0.7rem 2rem;
      font-family: var(--font-accent);
      font-size: 0.8rem;
      font-weight: 600;
    }

    .search-filter-sort {
      grid-column: 1 / -1;
    }

    .search-results-heading {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }

    .search-results-title {
      color: var(--site-heading);
      font-family: var(--font-subheading);
      font-size: 1.25rem;
      font-weight: 650;
      line-height: 1.25;
    }

    .search-results-summary {
      margin-top: 0.2rem;
      color: var(--site-muted);
      font-size: 0.82rem;
      line-height: 1.45;
    }

    .search-results-list {
      border-top: 1px solid var(--site-border);
    }

    .search-result-row {
      position: relative;
      display: grid;
      grid-template-columns: 8.25rem minmax(0, 1fr);
      gap: 0.85rem;
      margin-inline: -0.65rem;
      padding: 0.85rem 0.65rem;
      border-bottom: 1px solid var(--site-border);
      transition: background-color 160ms ease;
    }

    .search-result-row:hover,
    .search-result-row:focus-within {
      background: var(--site-accent-soft);
    }

    .search-result-row .blog-media-frame {
      align-self: start;
      border-radius: var(--site-radius-control, 0.5rem);
    }

    .search-result-media {
      position: relative;
      display: block;
      overflow: hidden;
      scale: 1;
      transform-origin: left center;
      transition: box-shadow 220ms ease, scale 240ms cubic-bezier(0.2, 0.75, 0.25, 1);
    }

    .search-result-title {
      margin-top: 0.3rem;
      color: var(--site-heading);
      font-family: var(--font-subheading);
      font-size: clamp(1.05rem, 2vw, 1.22rem);
      font-weight: 650;
      line-height: 1.25;
    }

    .search-result-excerpt {
      display: none;
      max-width: 50rem;
      margin-top: 0.35rem;
      overflow: hidden;
      color: var(--site-muted);
      font-size: 0.88rem;
      line-height: 1.45;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .search-result-taxonomy {
      display: none;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem;
      margin-top: 0.55rem;
    }

    .search-result-taxonomy .blog-category-badge,
    .search-result-taxonomy .blog-tag-chip {
      padding: 0.2rem 0.4rem;
      font-size: 0.65rem;
      line-height: 1;
    }

    .search-result-match {
      color: var(--site-muted);
      font-family: var(--font-accent);
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    @media (min-width: 640px) {
      .search-result-excerpt {
        display: -webkit-box;
      }

      .search-result-taxonomy {
        display: flex;
      }
    }

    @media (min-width: 768px) {
      .search-filter-bar {
        grid-template-columns: minmax(7rem, 0.85fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1fr) minmax(7rem, 0.85fr);
      }

      .search-filter-sort {
        grid-column: auto;
      }

      .search-result-row {
        grid-template-columns: 12rem minmax(0, 1fr);
        gap: 1rem;
        padding-block: 0.9rem;
      }
    }

    @media (max-width: 639px) {
      .search-page-title {
        font-size: 2rem;
      }

      .search-index-count {
        font-size: 0.68rem;
      }

      .search-result-row {
        grid-template-columns: 7.5rem minmax(0, 1fr);
      }

      .search-result-row .site-meta-row {
        gap: 0.3rem;
        font-size: 0.64rem;
      }
    }
  `],
})
export class SiteSearchPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly search = inject(SiteSearchService);
  private readonly searchOverlay = inject(SiteSearchOverlayService);
  private readonly analytics = inject(SiteAnalyticsService);

  protected readonly pathNames = PATH_NAMES;
  protected readonly emptyPreviewImages: readonly BlogGalleryImage[] = [];
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
    this.analytics.trackSearch(this.query(), this.results().length, 'search_page');
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

  protected selectResult(result: SiteSearchResult): void {
    this.analytics.trackSearch(this.query(), this.results().length, 'search_page');
    this.analytics.trackContentSelection({
      id: result.id,
      slug: result.path,
      categories: result.categories,
      contentType: result.type === 'blog' ? 'article' : 'page',
    }, 'search_page', this.query());
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
