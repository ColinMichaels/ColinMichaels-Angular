import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  signal,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {Router} from '@angular/router';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogRepositoryService} from '../../services/blog-repository.service';
import {createBlogCategorySlug, getBlogTaxonomyTerms} from '../../utils/blog-category-url.util';

interface CategoryWithCount {
  name: string;
  slug: string;
  count: number;
}

@Component({
  selector: 'app-blog-category-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (categoriesWithCounts().length) {
      <section class="category-filter" aria-label="Filter posts by category">
        <label class="category-filter__label" for="blog-category-search">Filter blog categories</label>
        <div class="category-filter__control">
          <svg class="category-filter__search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="11" cy="11" r="7"></circle>
            <path d="m20 20-4-4"></path>
          </svg>

          <div class="category-filter__selected" aria-label="Selected category filters">
            @for (category of selectedCategories(); track category.slug) {
              <button
                type="button"
                class="category-filter__chip"
                [attr.aria-label]="'Remove ' + category.name + ' filter'"
                (click)="removeCategory(category.slug)"
              >
                <span>{{ category.name }}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="m7 7 10 10"></path>
                  <path d="M17 7 7 17"></path>
                </svg>
              </button>
            }

            <input
              id="blog-category-search"
              type="search"
              class="category-filter__input"
              [placeholder]="selectedCategories().length ? 'Add category' : 'Filter categories'"
              autocomplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-controls="blog-category-search-results"
              [attr.aria-expanded]="searchOpen()"
              [attr.aria-activedescendant]="highlightedCategoryId()"
              [value]="searchQuery()"
              (focus)="openSearch()"
              (input)="updateSearch($event)"
              (keydown)="handleSearchKeydown($event)"
            >
          </div>

          @if (selectedCategories().length) {
            <button type="button" class="category-filter__clear" (click)="clearCategories()">
              Clear filters
            </button>
          }
        </div>

        @if (searchOpen()) {
          <div
            id="blog-category-search-results"
            class="category-filter__results"
            role="listbox"
            aria-label="Matching blog categories"
          >
            @for (category of matchingCategories(); track category.slug; let index = $index) {
              <button
                type="button"
                [id]="categoryOptionId(category.slug)"
                class="category-filter__result"
                [class.category-filter__result--highlighted]="highlightedIndex() === index"
                role="option"
                [attr.aria-selected]="highlightedIndex() === index"
                (pointerenter)="highlightedIndex.set(index)"
                (click)="addCategory(category.slug)"
              >
                <span>{{ category.name }}</span>
                <span class="category-filter__count">{{ category.count }}</span>
              </button>
            } @empty {
              <p class="category-filter__empty" role="status">
                {{ unselectedCategories().length ? 'No matching categories' : 'All categories selected' }}
              </p>
            }
          </div>
        }
      </section>
    }
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }

    .category-filter {
      position: relative;
      z-index: 20;
      width: 100%;
    }

    .category-filter__label {
      position: absolute;
      overflow: hidden;
      width: 1px;
      height: 1px;
      padding: 0;
      border: 0;
      margin: -1px;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }

    .category-filter__control {
      display: flex;
      min-height: 2.75rem;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.35rem 0.25rem 0.75rem;
      border: 1px solid var(--site-border);
      border-radius: 0.25rem;
      background: var(--site-panel);
      transition: border-color 160ms ease, box-shadow 160ms ease;
    }

    .category-filter__control:hover,
    .category-filter__control:focus-within {
      border-color: var(--site-accent-strong);
    }

    .category-filter__control:focus-within {
      box-shadow: 0 0 0 2px var(--site-accent-soft);
    }

    .category-filter__search-icon {
      flex: 0 0 auto;
      width: 1rem;
      height: 1rem;
      fill: none;
      stroke: var(--site-muted);
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .category-filter__selected {
      display: flex;
      overflow-x: auto;
      flex: 1 1 auto;
      min-width: 0;
      align-items: center;
      gap: 0.35rem;
      scrollbar-width: none;
    }

    .category-filter__selected::-webkit-scrollbar {
      display: none;
    }

    .category-filter__chip {
      display: inline-flex;
      flex: 0 0 auto;
      min-height: 2rem;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.45rem 0.35rem 0.6rem;
      border: 1px solid var(--site-accent-strong);
      border-radius: 999px;
      background: var(--site-accent-soft);
      color: var(--site-accent-strong);
      font-family: var(--font-accent);
      font-size: 0.75rem;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
    }

    .category-filter__chip:hover,
    .category-filter__chip:focus-visible {
      background: var(--site-accent-strong);
      color: var(--site-panel);
    }

    .category-filter__chip:focus-visible,
    .category-filter__clear:focus-visible,
    .category-filter__result:focus-visible {
      outline: 2px solid var(--site-accent-strong);
      outline-offset: 0.15rem;
    }

    .category-filter__chip svg {
      width: 0.85rem;
      height: 0.85rem;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-width: 2;
    }

    .category-filter__input {
      flex: 1 0 7rem;
      min-width: 7rem;
      min-height: 2rem;
      padding: 0.25rem;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--site-text);
      font-family: var(--font-accent);
      font-size: 0.82rem;
      font-weight: 600;
      line-height: 1.2;
    }

    .category-filter__input::placeholder {
      color: var(--site-muted);
      opacity: 1;
    }

    .category-filter__input::-webkit-search-cancel-button {
      display: none;
    }

    .category-filter__clear {
      flex: 0 0 auto;
      min-height: 2rem;
      padding: 0.35rem 0.55rem;
      border: 0;
      background: transparent;
      color: var(--site-muted);
      font-family: var(--font-accent);
      font-size: 0.72rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .category-filter__clear:hover,
    .category-filter__clear:focus-visible {
      color: var(--site-accent-strong);
    }

    .category-filter__results {
      position: absolute;
      top: calc(100% + 0.45rem);
      right: 0;
      left: 0;
      overflow-y: auto;
      max-height: 19rem;
      padding: 0.35rem;
      border: 1px solid var(--site-border);
      background: var(--site-panel);
      box-shadow: 0 1rem 2.5rem rgb(0 0 0 / 0.28);
    }

    .category-filter__result {
      display: flex;
      width: 100%;
      min-height: 2.65rem;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.6rem 0.7rem;
      border: 0;
      background: transparent;
      color: var(--site-text);
      font-family: var(--font-accent);
      font-size: 0.82rem;
      font-weight: 600;
      text-align: left;
    }

    .category-filter__result:hover,
    .category-filter__result:focus-visible,
    .category-filter__result--highlighted {
      background: var(--site-accent-soft);
      color: var(--site-accent-strong);
    }

    .category-filter__count {
      display: inline-flex;
      min-width: 1.6rem;
      min-height: 1.6rem;
      align-items: center;
      justify-content: center;
      padding-inline: 0.4rem;
      border-radius: 999px;
      background: var(--site-accent-soft);
      color: var(--site-muted);
      font-size: 0.72rem;
    }

    .category-filter__empty {
      margin: 0;
      padding: 0.85rem 0.7rem;
      color: var(--site-muted);
      font-family: var(--font-accent);
      font-size: 0.82rem;
    }

  `],
})
export class BlogCategoryNavComponent {
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  private readonly posts = toSignal(this.blogRepository.getPublishedPosts$(), {initialValue: []});

  readonly activeSlug = input<string | null>(null);
  readonly selectedSlugs = input<readonly string[]>([]);

  protected readonly searchQuery = signal('');
  protected readonly searchOpen = signal(false);
  protected readonly highlightedIndex = signal(-1);

  protected readonly categoriesWithCounts = computed((): readonly CategoryWithCount[] => {
    const countMap = new Map<string, { name: string; count: number }>();

    for (const post of this.posts()) {
      for (const category of getBlogTaxonomyTerms(post)) {
        const slug = createBlogCategorySlug(category);
        const entry = countMap.get(slug);
        if (entry) {
          entry.count++;
        } else {
          countMap.set(slug, {name: category, count: 1});
        }
      }
    }

    return Array.from(countMap.entries())
      .map(([slug, {name, count}]) => ({name, slug, count}))
      .sort((a, b) => b.count - a.count);
  });

  protected readonly effectiveSelectedSlugs = computed(() => {
    const slugs = [
      ...this.selectedSlugs(),
      ...(this.activeSlug() ? [this.activeSlug() as string] : []),
    ];

    return [...new Set(slugs.map(slug => createBlogCategorySlug(slug)))];
  });

  protected readonly selectedCategories = computed(() => {
    const selected = new Set(this.effectiveSelectedSlugs());
    return this.categoriesWithCounts().filter(category => selected.has(category.slug));
  });

  protected readonly unselectedCategories = computed(() => {
    const selected = new Set(this.effectiveSelectedSlugs());
    return this.categoriesWithCounts().filter(category => !selected.has(category.slug));
  });

  protected readonly matchingCategories = computed((): readonly CategoryWithCount[] => {
    const terms = this.searchQuery().trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);

    if (!terms.length) {
      return this.unselectedCategories();
    }

    return this.unselectedCategories().filter(category => {
      const categoryName = category.name.toLocaleLowerCase();
      return terms.every(term => categoryName.includes(term));
    });
  });

  protected readonly highlightedCategoryId = computed(() => {
    const category = this.matchingCategories()[this.highlightedIndex()];
    return category ? this.categoryOptionId(category.slug) : null;
  });

  protected openSearch(): void {
    this.searchOpen.set(true);
  }

  protected updateSearch(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.searchQuery.set(target.value);
    this.searchOpen.set(true);
    this.highlightedIndex.set(this.matchingCategories().length ? 0 : -1);
  }

  protected handleSearchKeydown(event: KeyboardEvent): void {
    const matches = this.matchingCategories();

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeSearch();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.searchOpen.set(true);
      if (!matches.length) {
        this.highlightedIndex.set(-1);
        return;
      }

      const direction = event.key === 'ArrowDown' ? 1 : -1;
      this.highlightedIndex.update(index => Math.max(0, Math.min(index + direction, matches.length - 1)));
      return;
    }

    if (event.key === 'Enter') {
      const category = matches[this.highlightedIndex()];
      if (!category) {
        return;
      }

      event.preventDefault();
      this.addCategory(category.slug);
    }
  }

  protected addCategory(slug: string): void {
    this.applyCategories([...this.effectiveSelectedSlugs(), slug]);
  }

  protected removeCategory(slug: string): void {
    this.applyCategories(this.effectiveSelectedSlugs().filter(selectedSlug => selectedSlug !== slug));
  }

  protected clearCategories(): void {
    this.applyCategories([]);
  }

  protected categoryOptionId(slug: string): string {
    return `blog-category-option-${slug}`;
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
    this.highlightedIndex.set(-1);
  }

  @HostListener('document:click', ['$event'])
  protected closeSearchFromOutsideClick(event: MouseEvent): void {
    if (event.target instanceof Node && !this.host.nativeElement.contains(event.target)) {
      this.closeSearch();
    }
  }

  private applyCategories(slugs: readonly string[]): void {
    const categories = [...new Set(slugs.map(slug => createBlogCategorySlug(slug)))];

    this.searchQuery.set('');
    this.closeSearch();
    // Multi-category state has one canonical home on the blog index; reset the page while preserving other filters.
    void this.router.navigate(['/', PATH_NAMES.BLOG], {
      queryParams: {
        categories: categories.length ? categories.join(',') : null,
        page: null,
      },
      queryParamsHandling: 'merge',
      fragment: 'blog-post-list',
    });
  }
}
