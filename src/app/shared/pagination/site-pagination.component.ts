import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Params, RouterLink} from '@angular/router';

import {
  clampPaginationPage,
  createPaginationItems,
  DEFAULT_PAGINATION_PAGE_SIZE,
  getPaginationPageCount,
  PaginationItem,
} from './pagination.util';

export type SitePaginationViewIcon = 'list' | 'grid' | 'image-title';

export interface SitePaginationViewOption {
  value: string;
  label: string;
  icon: SitePaginationViewIcon;
}

@Component({
  selector: 'app-site-pagination',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalItems > 0 && (showSummary || (showViewOptions && viewOptions.length))) {
      <div
        class="site-pagination__toolbar"
        [class.site-pagination__toolbar--views-only]="!showSummary && showViewOptions && viewOptions.length"
      >
        @if (showSummary) {
          <p class="site-pagination__summary" aria-live="polite">
            Showing {{ firstItemNumber }}–{{ lastItemNumber }} of {{ totalItems }} {{ resolvedItemLabel }}
          </p>
        }

        @if (showViewOptions && viewOptions.length) {
          <nav
            class="site-pagination__views"
            [class.site-pagination__views--icon-only]="iconOnlyViewOptions"
            [attr.aria-label]="viewAriaLabel"
          >
            @for (option of viewOptions; track option.value) {
              <a
                [routerLink]="routeCommands"
                [queryParams]="viewQueryParams(option.value)"
                queryParamsHandling="merge"
                [fragment]="fragment"
                class="site-pagination__view"
                [class.site-pagination__view--current]="option.value === resolvedActiveView"
                [class.site-pagination__view--icon-only]="iconOnlyViewOptions"
                [attr.aria-current]="option.value === resolvedActiveView ? 'true' : null"
                [attr.aria-label]="'Show ' + itemLabel + ' in ' + option.label.toLowerCase() + ' view'"
                [attr.data-tooltip]="iconOnlyViewOptions ? option.label + ' view' : null"
              >
                @switch (option.icon) {
                  @case ('grid') {
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                    </svg>
                  }
                  @case ('image-title') {
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <rect x="3" y="5" width="7" height="14"></rect>
                      <path d="M13.5 8h7"></path>
                      <path d="M13.5 12h7"></path>
                      <path d="M13.5 16h4.5"></path>
                    </svg>
                  }
                  @default {
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M8 6h13"></path>
                      <path d="M8 12h13"></path>
                      <path d="M8 18h13"></path>
                      <path d="M3 6h.01"></path>
                      <path d="M3 12h.01"></path>
                      <path d="M3 18h.01"></path>
                    </svg>
                  }
                }
                <span [class.site-pagination__view-label--sr-only]="iconOnlyViewOptions">{{ option.label }}</span>
              </a>
            }
          </nav>
        }
      </div>
    }

    @if (showPageNavigation && totalPages > 1) {
      <nav class="site-pagination" [attr.aria-label]="ariaLabel">
        @if (normalizedCurrentPage > 1) {
          <a
            [routerLink]="routeCommands"
            [queryParams]="pageQueryParams(normalizedCurrentPage - 1)"
            queryParamsHandling="merge"
            [fragment]="fragment"
            class="site-pagination__direction"
            [attr.aria-label]="'Go to previous ' + itemLabel + ' page'"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="m15 18-6-6 6-6"></path>
            </svg>
            Previous
          </a>
        }

        <div class="site-pagination__pages">
          @for (item of paginationItems; track $index) {
            @if (item === 'ellipsis') {
              <span class="site-pagination__ellipsis" aria-hidden="true">…</span>
            } @else {
              <a
                [routerLink]="routeCommands"
                [queryParams]="pageQueryParams(item)"
                queryParamsHandling="merge"
                [fragment]="fragment"
                class="site-pagination__page"
                [class.site-pagination__page--current]="item === normalizedCurrentPage"
                [attr.aria-current]="item === normalizedCurrentPage ? 'page' : null"
                [attr.aria-label]="'Go to ' + itemLabel + ' page ' + item"
              >{{ item }}</a>
            }
          }
        </div>

        @if (normalizedCurrentPage < totalPages) {
          <a
            [routerLink]="routeCommands"
            [queryParams]="pageQueryParams(normalizedCurrentPage + 1)"
            queryParamsHandling="merge"
            [fragment]="fragment"
            class="site-pagination__direction"
            [attr.aria-label]="'Go to next ' + itemLabel + ' page'"
          >
            Next
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="m9 18 6-6-6-6"></path>
            </svg>
          </a>
        }
      </nav>
    }
  `,
  styles: [`
    :host {
      display: block;
      --pagination-accent: var(--site-accent-strong);
      --pagination-current-background: var(--site-heading);
      --pagination-current-text: var(--site-panel);
    }

    .site-pagination__toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem 1.25rem;
      margin: 1.5rem 0 0;
    }

    .site-pagination__toolbar--views-only {
      justify-content: flex-end;
      margin: 0;
    }

    .site-pagination__summary {
      margin: 0;
      color: var(--site-muted);
      font-family: var(--font-accent);
      font-size: 0.82rem;
      font-weight: 600;
    }

    .site-pagination__views {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem;
      font-family: var(--font-accent);
    }

    .site-pagination__view {
      position: relative;
      display: inline-flex;
      min-height: 2.35rem;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      padding: 0.45rem 0.65rem;
      border: 1px solid var(--site-border);
      color: var(--site-muted);
      font-size: 0.76rem;
      font-weight: 700;
      line-height: 1;
      text-decoration: none;
      transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
    }

    .site-pagination__view--icon-only {
      width: 2.35rem;
      min-width: 2.35rem;
      padding-inline: 0.45rem;
    }

    .site-pagination__view-label--sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .site-pagination__view svg {
      width: 1rem;
      height: 1rem;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .site-pagination__view:hover,
    .site-pagination__view:focus-visible {
      border-color: var(--pagination-accent);
      color: var(--pagination-accent);
    }

    .site-pagination__view:focus-visible {
      outline: 2px solid var(--pagination-accent);
      outline-offset: 0.18rem;
    }

    .site-pagination__view--icon-only::after {
      position: absolute;
      z-index: 20;
      left: 50%;
      bottom: calc(100% + 0.55rem);
      width: max-content;
      max-width: 12rem;
      padding: 0.38rem 0.55rem;
      border: 1px solid var(--site-border);
      border-radius: 0.35rem;
      background: var(--site-panel-soft);
      box-shadow: 0 0.5rem 1.25rem rgb(0 0 0 / 0.2);
      color: var(--site-text);
      content: attr(data-tooltip);
      font-size: 0.72rem;
      font-weight: 700;
      line-height: 1.2;
      opacity: 0;
      pointer-events: none;
      transform: translate(-50%, 0.2rem);
      transition: opacity 140ms ease, transform 140ms ease, visibility 140ms ease;
      visibility: hidden;
      white-space: nowrap;
    }

    @media (hover: hover) {
      .site-pagination__view--icon-only:hover::after {
        opacity: 1;
        transform: translate(-50%, 0);
        visibility: visible;
      }
    }

    .site-pagination__view--icon-only:focus-visible::after {
      opacity: 1;
      transform: translate(-50%, 0);
      visibility: visible;
    }

    .site-pagination__view--current,
    .site-pagination__view--current:hover,
    .site-pagination__view--current:focus-visible {
      border-color: var(--pagination-current-background);
      background: var(--pagination-current-background);
      color: var(--pagination-current-text);
    }

    .site-pagination {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-top: 1rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--site-border);
      font-family: var(--font-accent);
    }

    .site-pagination__pages {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
    }

    .site-pagination__direction,
    .site-pagination__page {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 2.5rem;
      border: 1px solid var(--site-border);
      color: var(--site-text);
      font-size: 0.84rem;
      font-weight: 700;
      text-decoration: none;
      transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
    }

    .site-pagination__direction {
      gap: 0.35rem;
      padding-inline: 0.8rem;
    }

    .site-pagination__page {
      min-width: 2.5rem;
      padding-inline: 0.55rem;
    }

    .site-pagination__direction svg {
      width: 1rem;
      height: 1rem;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }

    .site-pagination__direction:hover,
    .site-pagination__direction:focus-visible,
    .site-pagination__page:hover,
    .site-pagination__page:focus-visible {
      border-color: var(--pagination-accent);
      color: var(--pagination-accent);
    }

    .site-pagination__direction:focus-visible,
    .site-pagination__page:focus-visible {
      outline: 2px solid var(--pagination-accent);
      outline-offset: 0.18rem;
    }

    .site-pagination__page--current {
      border-color: var(--pagination-current-background);
      background: var(--pagination-current-background);
      color: var(--pagination-current-text);
    }

    .site-pagination__page--current:hover,
    .site-pagination__page--current:focus-visible {
      border-color: var(--pagination-current-background);
      color: var(--pagination-current-text);
    }

    .site-pagination__ellipsis {
      min-width: 1.5rem;
      color: var(--site-muted);
      text-align: center;
    }

    @media (max-width: 30rem) {
      .site-pagination__toolbar,
      .site-pagination {
        justify-content: center;
      }

      .site-pagination__summary {
        width: 100%;
        text-align: center;
      }

      .site-pagination__views {
        width: 100%;
        justify-content: center;
      }

      .site-pagination__pages {
        width: 100%;
        order: -1;
      }
    }
  `],
})
export class SitePaginationComponent {
  @Input() currentPage = 1;
  @Input() totalItems = 0;
  @Input() pageSize = DEFAULT_PAGINATION_PAGE_SIZE;
  @Input() routeCommands: string | readonly (string | number)[] = '.';
  @Input() queryParams: Params = {};
  @Input() queryParamName = 'page';
  @Input() fragment?: string;
  @Input() itemLabel = 'items';
  @Input() itemLabelSingular = 'item';
  @Input() ariaLabel = 'Pagination';
  @Input() showSummary = true;
  @Input() showPageNavigation = true;
  @Input() showViewOptions = true;
  @Input() viewOptions: readonly SitePaginationViewOption[] = [];
  @Input() iconOnlyViewOptions = false;
  @Input() activeView = '';
  @Input() defaultView = '';
  @Input() viewQueryParamName = 'view';
  @Input() viewAriaLabel = 'View options';

  get normalizedPageSize(): number {
    return Math.max(1, Math.floor(this.pageSize));
  }

  get totalPages(): number {
    return getPaginationPageCount(this.totalItems, this.normalizedPageSize);
  }

  get normalizedCurrentPage(): number {
    return clampPaginationPage(this.currentPage, this.totalPages);
  }

  get firstItemNumber(): number {
    return this.totalItems === 0 ? 0 : (this.normalizedCurrentPage - 1) * this.normalizedPageSize + 1;
  }

  get lastItemNumber(): number {
    return Math.min(this.normalizedCurrentPage * this.normalizedPageSize, this.totalItems);
  }

  get resolvedItemLabel(): string {
    return this.totalItems === 1 ? this.itemLabelSingular : this.itemLabel;
  }

  get paginationItems(): readonly PaginationItem[] {
    return createPaginationItems(this.normalizedCurrentPage, this.totalPages);
  }

  get resolvedDefaultView(): string {
    return this.defaultView || this.viewOptions[0]?.value || '';
  }

  get resolvedActiveView(): string {
    return this.activeView || this.resolvedDefaultView;
  }

  pageQueryParams(page: number): Params {
    return {
      ...this.queryParams,
      [this.queryParamName]: page > 1 ? page : null,
    };
  }

  viewQueryParams(view: string): Params {
    return {
      ...this.queryParams,
      [this.queryParamName]: null,
      [this.viewQueryParamName]: view === this.resolvedDefaultView ? null : view,
    };
  }
}
