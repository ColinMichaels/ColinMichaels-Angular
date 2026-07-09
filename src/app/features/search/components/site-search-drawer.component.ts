import {DatePipe, NgStyle} from '@angular/common';
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
    NgStyle,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen) {
      <section
        class="fixed inset-0 z-[100] isolate"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-search-drawer-title"
      >
        <button
          type="button"
          class="absolute inset-0 cursor-default bg-slate-950/55 backdrop-blur-sm dark:bg-black/70"
          aria-label="Close search"
          (click)="requestClose()"
        ></button>

        <aside
          class="absolute right-0 top-0 z-10 flex h-dvh w-full max-w-xl flex-col border-l border-slate-200 bg-white text-slate-950 shadow-2xl shadow-slate-950/30 dark:border-white/10 dark:bg-neutral-950 dark:text-zinc-100 dark:shadow-black/50"
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
                    class="site-card-interactive site-search-quick-result grid grid-cols-[4.25rem_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[5.25rem_minmax(0,1fr)] sm:p-4"
                    [class.site-search-quick-result-topic]="!!result.topic"
                    [ngStyle]="resultTopicStyle(result)"
                    (click)="requestClose()"
                  >
                    <span class="site-search-result-media" aria-hidden="true">
                      @if (result.image) {
                        <img
                          [src]="result.image"
                          alt=""
                          class="site-search-result-image"
                          loading="lazy"
                        >
                      } @else {
                        <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="1.7">
                          <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3h6.8L19 7.7v10.8a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18.5v-13Z"></path>
                          <path d="M14 3v5h5M8.5 12h7M8.5 15.5h5"></path>
                        </svg>
                      }
                    </span>

                    <span class="min-w-0">
                      <span class="site-meta-row">
                        @if (result.topic; as topic) {
                          <span class="site-search-topic-label">{{ topic.label }}</span>
                          <span aria-hidden="true">/</span>
                        }
                        <span>{{ result.type === 'blog' ? 'Blog post' : 'Page' }}</span>
                        @if (result.date) {
                          <span aria-hidden="true">/</span>
                          <span>{{ result.date | date: 'MMM d, y' }}</span>
                        }
                      </span>

                      <span class="mt-2 block">
                        <span class="block text-base font-semibold leading-6 text-slate-950 dark:text-zinc-50">
                          {{ result.title }}
                        </span>
                        <span class="mt-1 line-clamp-2 block text-sm leading-6 text-slate-600 dark:text-zinc-400">
                          {{ result.excerpt }}
                        </span>
                      </span>

                      @if (result.matchedFields.length > 0) {
                        <span class="mt-3 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-500">
                          Matched {{ result.matchedFields.join(', ') }}
                        </span>
                      }
                    </span>
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
  styles: [`
    .site-search-quick-result {
      --search-result-topic-accent: #22d3ee;
      --search-result-topic-accent-strong: #67e8f9;
      --search-result-topic-accent-rgb: 34 211 238;

      position: relative;
      overflow: hidden;
    }

    .site-search-quick-result-topic {
      border-color: rgb(var(--search-result-topic-accent-rgb) / 0.34);
      background:
        linear-gradient(135deg, rgb(var(--search-result-topic-accent-rgb) / 0.1), transparent 42%),
        #ffffff;
    }

    .site-search-quick-result-topic:is(:hover, :focus-visible) {
      border-color: rgb(var(--search-result-topic-accent-rgb) / 0.7);
      background:
        linear-gradient(135deg, rgb(var(--search-result-topic-accent-rgb) / 0.16), rgb(var(--search-result-topic-accent-rgb) / 0.04) 48%),
        #f8fafc;
    }

    .site-search-result-media {
      display: grid;
      aspect-ratio: 1;
      min-height: 4.25rem;
      place-items: center;
      overflow: hidden;
      border: 1px solid rgb(var(--search-result-topic-accent-rgb) / 0.24);
      background:
        linear-gradient(135deg, rgb(var(--search-result-topic-accent-rgb) / 0.12), rgba(248, 250, 252, 0.9)),
        #f1f5f9;
      color: color-mix(in srgb, var(--search-result-topic-accent) 62%, #475569);
    }

    .site-search-result-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      filter: saturate(0.95) contrast(1.04) brightness(0.94);
      transition: filter 180ms ease, transform 180ms ease;
    }

    .site-search-quick-result:is(:hover, :focus-visible) .site-search-result-image {
      filter: saturate(1.05) contrast(1.06) brightness(1);
      transform: scale(1.04);
    }

    .site-search-topic-label {
      border: 1px solid rgb(var(--search-result-topic-accent-rgb) / 0.32);
      background: rgb(var(--search-result-topic-accent-rgb) / 0.1);
      color: color-mix(in srgb, var(--search-result-topic-accent) 62%, #0f172a);
      font-weight: 700;
      letter-spacing: 0.16em;
      line-height: 1;
      padding: 0.28rem 0.42rem;
    }

    :host-context(.dark) .site-search-quick-result-topic {
      background:
        linear-gradient(135deg, rgb(var(--search-result-topic-accent-rgb) / 0.13), rgba(24, 24, 27, 0.74) 48%),
        rgba(24, 24, 27, 0.72);
    }

    :host-context(.dark) .site-search-quick-result-topic:is(:hover, :focus-visible) {
      border-color: rgb(var(--search-result-topic-accent-rgb) / 0.74);
      background:
        linear-gradient(135deg, rgb(var(--search-result-topic-accent-rgb) / 0.18), rgba(24, 24, 27, 0.82) 48%),
        #18181b;
    }

    :host-context(.dark) .site-search-result-media {
      border-color: rgb(var(--search-result-topic-accent-rgb) / 0.3);
      background:
        linear-gradient(135deg, rgb(var(--search-result-topic-accent-rgb) / 0.16), rgba(9, 9, 11, 0.88)),
        #09090b;
      color: var(--search-result-topic-accent-strong);
      box-shadow: 0 16px 34px rgb(var(--search-result-topic-accent-rgb) / 0.08);
    }

    :host-context(.dark) .site-search-topic-label {
      border-color: rgb(var(--search-result-topic-accent-rgb) / 0.36);
      background: rgb(var(--search-result-topic-accent-rgb) / 0.14);
      color: var(--search-result-topic-accent-strong);
    }
  `],
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

  protected resultTopicStyle(result: SiteSearchResult): Record<string, string> | null {
    if (!result.topic) {
      return null;
    }

    return {
      '--search-result-topic-accent': result.topic.accent,
      '--search-result-topic-accent-strong': result.topic.accentStrong,
      '--search-result-topic-accent-rgb': result.topic.accentRgb,
    };
  }
}
