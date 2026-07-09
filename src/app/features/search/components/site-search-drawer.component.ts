import {DatePipe} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {Router, RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../app-route-paths';
import {
  getFeaturedSearchItems,
  normalizeSearchValue,
  searchSiteItems,
  SiteSearchResult,
  SiteSearchService,
} from '../services/site-search.service';

@Component({
  selector: 'app-site-search-drawer',
  imports: [
    DatePipe,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen) {
      <section
        class="fixed inset-0 z-[70]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-search-drawer-title"
      >
        <button
          type="button"
          class="absolute inset-0 cursor-default bg-slate-950/30 backdrop-blur-sm dark:bg-black/50"
          aria-label="Close search"
          (click)="requestClose()"
        ></button>

        <aside
          class="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white text-slate-950 shadow-2xl shadow-slate-950/20 dark:border-white/10 dark:bg-neutral-950 dark:text-zinc-100"
        >
          <header class="border-b border-slate-200 p-5 dark:border-zinc-800">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="site-meta">Site search</p>
                <h2 id="site-search-drawer-title" class="mt-2 heading-subsection">Find posts and pages</h2>
              </div>
              <button
                type="button"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-cyan-300 dark:hover:text-cyan-200"
                aria-label="Close search"
                (click)="requestClose()"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M6 6l12 12M18 6 6 18"></path>
                </svg>
              </button>
            </div>

            <form class="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" (submit)="openFullSearch(searchInput.value)">
              <label for="site-search-drawer-query" class="sr-only">Search query</label>
              <input
                #searchInput
                id="site-search-drawer-query"
                type="search"
                [value]="query()"
                (input)="updateQuery(searchInput.value)"
                placeholder="Search blog posts, tags, and pages"
                class="site-input min-h-12 text-base"
              >
              <button type="submit" class="blog-action-primary min-h-12 justify-center px-4">
                Search
              </button>
            </form>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto p-5">
            @if (loadError(); as error) {
              <div class="site-error-panel">
                <p class="font-medium">Search content could not load.</p>
                <p class="mt-2">{{ error }}</p>
              </div>
            } @else if (isLoading()) {
              <div class="grid gap-3">
                <div class="site-skeleton-card h-24"></div>
                <div class="site-skeleton-card h-24"></div>
                <div class="site-skeleton-card h-24"></div>
              </div>
            } @else {
              <div class="mb-3 flex items-center justify-between gap-3">
                <p class="site-meta">{{ resultLabel() }}</p>
                <a
                  [routerLink]="['/', pathNames.SEARCH]"
                  [queryParams]="advancedSearchQueryParams()"
                  class="site-inline-link text-sm"
                  (click)="requestClose()"
                >
                  Advanced search
                </a>
              </div>

              <div class="grid gap-3">
                @for (result of quickResults(); track trackResult($index, result)) {
                  <a
                    [routerLink]="result.path"
                    class="site-card-interactive grid gap-3 p-4"
                    (click)="requestClose()"
                  >
                    <div class="site-meta-row">
                      <span>{{ result.type === 'blog' ? 'Blog post' : 'Page' }}</span>
                      @if (result.date) {
                        <span aria-hidden="true">/</span>
                        <span>{{ result.date | date: 'MMM d, y' }}</span>
                      }
                    </div>
                    <div>
                      <h3 class="text-base font-semibold leading-6 text-slate-950 dark:text-zinc-50">
                        {{ result.title }}
                      </h3>
                      <p class="mt-1 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">
                        {{ result.excerpt }}
                      </p>
                    </div>
                    @if (result.matchedFields.length > 0) {
                      <p class="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-500">
                        Matched {{ result.matchedFields.join(', ') }}
                      </p>
                    }
                  </a>
                } @empty {
                  <div class="blog-state-panel border-t border-slate-200 pt-5 dark:border-zinc-800">
                    <p class="blog-state-title">No quick results.</p>
                    <p class="mt-2 text-sm">Open the full search page to try broader filters.</p>
                  </div>
                }
              </div>
            }
          </div>

          <footer class="border-t border-slate-200 p-5 dark:border-zinc-800">
            <a
              [routerLink]="['/', pathNames.SEARCH]"
              [queryParams]="advancedSearchQueryParams()"
              class="blog-action-primary w-full justify-center"
              (click)="requestClose()"
            >
              Open full search
            </a>
          </footer>
        </aside>
      </section>
    }
  `,
})
export class SiteSearchDrawerComponent {
  @Input() isOpen = false;
  @Output() closeSearch = new EventEmitter<void>();

  private readonly router = inject(Router);
  private readonly search = inject(SiteSearchService);

  protected readonly pathNames = PATH_NAMES;
  protected readonly query = signal('');
  protected readonly items = toSignal(this.search.getSearchItems$(), {initialValue: []});
  protected readonly isLoading = toSignal(this.search.loading$, {initialValue: true});
  protected readonly loadError = toSignal(this.search.error$, {initialValue: null});
  protected readonly normalizedQuery = computed(() => normalizeSearchValue(this.query()));
  protected readonly quickResults = computed(() => {
    if (!this.normalizedQuery()) {
      return getFeaturedSearchItems(this.items(), 5);
    }

    return searchSiteItems(this.items(), {
      query: this.query(),
      type: 'all',
      category: '',
      tag: '',
      sort: 'relevance',
    }, 6);
  });
  protected readonly resultLabel = computed(() => (
    this.normalizedQuery() ? 'Quick results' : 'Recent posts and pages'
  ));

  @HostListener('document:keydown.escape')
  protected handleEscapeKey(): void {
    if (this.isOpen) {
      this.requestClose();
    }
  }

  protected updateQuery(value: string): void {
    this.query.set(value);
  }

  protected advancedSearchQueryParams(): { q?: string } {
    const query = this.query().trim();

    return query ? {q: query} : {};
  }

  protected openFullSearch(value: string): false {
    const query = value.trim();
    this.query.set(query);
    this.requestClose();
    void this.router.navigate(['/', PATH_NAMES.SEARCH], {
      queryParams: query ? {q: query} : {},
    });

    return false;
  }

  protected requestClose(): void {
    this.closeSearch.emit();
  }

  protected trackResult(index: number, result: SiteSearchResult): string {
    return `${result.type}-${result.id}-${index}`;
  }
}
