import {CdkTrapFocus} from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {SiteSearchDrawerComponent} from '../../features/search/components/site-search-drawer.component';
import {SiteSearchOverlayService} from '../../features/search/services/site-search-overlay.service';
import {SiteAuthControlsComponent} from './site-auth-controls.component';
import {SiteLogoComponent} from './site-logo.component';
import {PwaInstallControlComponent} from '../pwa/pwa-install-control.component';

@Component({
  selector: 'app-site-header',
  imports: [
    RouterLink,
    RouterLinkActive,
    CdkTrapFocus,
    SiteAuthControlsComponent,
    SiteLogoComponent,
    SiteSearchDrawerComponent,
    PwaInstallControlComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 text-slate-950 shadow-sm shadow-slate-950/5 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-neutral-950/95 dark:text-zinc-100"
      [class.site-header-overlay-open]="searchOverlay.isOpen() || isMenuOpen()"
    >
      <div
        class="site-header-row mx-auto grid max-w-site grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6 lg:px-8 xl:grid-cols-[auto_auto_minmax(18rem,1fr)_auto]">
        <a
          routerLink="/"
          class="group inline-flex min-h-11 w-24 min-w-0 items-center min-[400px]:w-28 sm:w-48 lg:w-56"
          aria-label="Go to homepage"
          (click)="closeMenu()"
        >
          <span class="block w-full">
            <app-site-logo/>
          </span>
        </a>

        <nav class="hidden items-center gap-6 xl:flex" aria-label="Primary navigation">
          <a [routerLink]="['/', pathNames.BLOG]" routerLinkActive="site-header-primary-link-active" class="site-header-primary-link">
            Discover
          </a>
          <a routerLink="/" fragment="topic-guides" class="site-header-primary-link">
            Topics
          </a>
          <a routerLink="/" fragment="about" class="site-header-primary-link">
            About
          </a>
        </nav>

        <form
          #searchForm
          class="relative mx-auto w-full min-w-0 max-w-xl"
          [attr.role]="searchOverlay.isOpen() ? 'dialog' : 'search'"
          [attr.aria-modal]="searchOverlay.isOpen() ? 'true' : null"
          [attr.aria-labelledby]="searchOverlay.isOpen() ? 'site-search-drawer-title' : null"
          [cdkTrapFocus]="searchOverlay.isOpen()"
          [cdkTrapFocusAutoCapture]="searchOverlay.isOpen()"
          (submit)="handleSearchSubmit($event)"
        >
          <label for="site-header-search" class="sr-only">Search posts</label>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          >
            <circle cx="11" cy="11" r="6.5"></circle>
            <path d="m16 16 4 4"></path>
          </svg>
          <input
            #headerSearchInput
            id="site-header-search"
            type="search"
            cdkFocusInitial
            placeholder="Search articles and ideas"
            autocomplete="off"
            [value]="searchQuery()"
            class="site-header-search-input"
            [class.site-header-search-attention]="searchAttentionActive()"
            aria-haspopup="dialog"
            aria-controls="site-search-results-panel"
            [attr.aria-expanded]="searchOverlay.isOpen()"
            (focus)="handleSearchFocus()"
            (click)="openSearch()"
            (input)="updateSearchQuery(headerSearchInput.value)"
          >

          @if (searchOverlay.isOpen()) {
            @defer (when searchOverlay.isOpen()) {
              <app-site-search-drawer
                [isOpen]="true"
                [query]="searchQuery()"
                (closeSearch)="closeSearch($event)"
              />
            }
          }
        </form>

        <nav class="flex h-11 shrink-0 items-center justify-end gap-1.5" aria-label="Site utilities">
          <a
            [routerLink]="['/', pathNames.BLOG]"
            routerLinkActive="site-icon-control-active"
            class="site-icon-control hidden min-[400px]:inline-flex"
            aria-label="Browse all posts"
            title="All posts"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M8 6h12M8 12h12M8 18h12"></path>
              <circle cx="4" cy="6" r=".75" fill="currentColor" stroke="none"></circle>
              <circle cx="4" cy="12" r=".75" fill="currentColor" stroke="none"></circle>
              <circle cx="4" cy="18" r=".75" fill="currentColor" stroke="none"></circle>
            </svg>
          </a>

          <button
            type="button"
            class="site-icon-control"
            [attr.aria-expanded]="isMenuOpen()"
            aria-controls="site-utility-menu"
            [attr.aria-label]="isMenuOpen() ? 'Close site menu' : 'Open site menu'"
            (click)="toggleMenu()"
          >
            @if (isMenuOpen()) {
              <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                <path d="M6 6l12 12M18 6 6 18"></path>
              </svg>
            } @else {
              <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="8" r="3.5"></circle>
                <path d="M5.5 20a6.5 6.5 0 0 1 13 0"></path>
              </svg>
            }
          </button>
        </nav>
      </div>

      @if (isMenuOpen()) {
        <nav
          id="site-utility-menu"
          class="absolute right-3 top-full z-[60] mt-2 grid max-h-[calc(100dvh-var(--site-header-sticky-height)-env(safe-area-inset-top)-1rem)] w-[min(20rem,calc(100vw-1.5rem))] gap-1.5 overflow-y-auto overscroll-contain rounded-site-overlay border border-slate-200 bg-white p-2 shadow-site-overlay dark:border-zinc-700 dark:bg-neutral-950 sm:right-6 lg:right-8"
          aria-label="Account and site menu"
        >
          <a
            [routerLink]="['/', pathNames.BLOG]"
            class="site-menu-link"
            (click)="closeMenu()"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M8 6h12M8 12h12M8 18h12"></path>
              <circle cx="4" cy="6" r=".75" fill="currentColor" stroke="none"></circle>
              <circle cx="4" cy="12" r=".75" fill="currentColor" stroke="none"></circle>
              <circle cx="4" cy="18" r=".75" fill="currentColor" stroke="none"></circle>
            </svg>
            <span>All Posts</span>
          </a>
          <a
            [routerLink]="['/', pathNames.WRITE_FOR_US]"
            class="site-menu-link"
            (click)="closeMenu()"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Z"></path>
              <path d="m13.5 6.5 4 4"></path>
            </svg>
            <span>Write for Us</span>
          </a>
          <a
            [routerLink]="['/', pathNames.CONTACT]"
            class="site-menu-link"
            (click)="closeMenu()"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3.5" y="5" width="17" height="14" rx="2"></rect>
              <path d="m5 7 7 5 7-5"></path>
            </svg>
            <span>Contact</span>
          </a>
          <a
            [routerLink]="['/', pathNames.OS_MAIN]"
            class="site-menu-link site-menu-link-success"
            (click)="closeMenu()"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3.5" y="4" width="17" height="16" rx="2"></rect>
              <path d="m7.5 9 2.5 2.5L7.5 14M12.5 14H17"></path>
            </svg>
            <span>Open OS</span>
          </a>
          <app-pwa-install-control/>

          @defer (when isMenuOpen()) {
            <app-site-auth-controls variant="mobile" (navigate)="closeMenu()"/>
          }
        </nav>
      }
    </header>
  `,
  styles: `
    header {
      padding-top: env(safe-area-inset-top);
    }

    .site-header-row {
      height: var(--site-header-sticky-height);
    }

    .site-header-overlay-open {
      z-index: 90;
    }

    .site-header-primary-link {
      display: inline-flex;
      min-height: 2.75rem;
      align-items: center;
      color: var(--site-text);
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
    }

    .site-header-primary-link:hover,
    .site-header-primary-link-active {
      color: var(--site-accent-strong);
    }

    .site-header-search-attention {
      animation: site-header-search-attention 720ms ease-in-out 2;
    }

    @keyframes site-header-search-attention {
      0%, 100% {
        border-color: var(--site-border);
        box-shadow: 0 0 0 0 rgb(var(--site-accent-rgb) / 0);
      }

      50% {
        border-color: var(--site-accent);
        box-shadow: 0 0 0 5px rgb(var(--site-accent-rgb) / 0.28);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .site-header-search-attention {
        border-color: var(--site-accent);
        box-shadow: 0 0 0 3px rgb(var(--site-accent-rgb) / 0.22);
        animation: none;
      }
    }
  `,
})
export class SiteHeaderComponent {
  @ViewChild('headerSearchInput') private headerSearchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('searchForm') private searchForm?: ElementRef<HTMLFormElement>;

  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly searchOverlay = inject(SiteSearchOverlayService);
  protected readonly pathNames = PATH_NAMES;
  protected readonly isMenuOpen = signal(false);
  protected readonly searchQuery = this.searchOverlay.query;
  protected readonly searchAttentionActive = signal(false);
  private lastFocusRequest = 0;
  private lastAttentionRequest = 0;
  // A monotonic request can refocus the one shared search field even when it is already open.
  private readonly externalSearchFocusEffect = effect(() => {
    const request = this.searchOverlay.focusRequest();

    if (request <= this.lastFocusRequest) {
      return;
    }

    this.lastFocusRequest = request;
    setTimeout(() => this.headerSearchInput?.nativeElement.focus(), 0);
  });
  private readonly externalSearchAttentionEffect = effect(onCleanup => {
    const request = this.searchOverlay.attentionRequest();

    if (request <= this.lastAttentionRequest) {
      return;
    }

    this.lastAttentionRequest = request;
    this.searchAttentionActive.set(false);
    const startTimer = setTimeout(() => this.searchAttentionActive.set(true), 0);
    const stopTimer = setTimeout(() => this.searchAttentionActive.set(false), 1600);

    onCleanup(() => {
      clearTimeout(startTimer);
      clearTimeout(stopTimer);
    });
  });

  protected openSearch(): void {
    this.closeMenu();
    this.searchOverlay.open();
  }

  private suppressNextSearchFocusOpen = false;

  protected handleSearchFocus(): void {
    if (this.suppressNextSearchFocusOpen) {
      this.suppressNextSearchFocusOpen = false;
      return;
    }

    this.openSearch();
  }

  protected closeSearch(restoreFocus = true): void {
    this.searchOverlay.close();

    if (!restoreFocus) {
      this.headerSearchInput?.nativeElement.blur();
      return;
    }

    queueMicrotask(() => {
      const searchInput = this.headerSearchInput?.nativeElement;

      if (!searchInput || searchInput.ownerDocument.activeElement === searchInput) {
        this.suppressNextSearchFocusOpen = false;
        return;
      }

      this.suppressNextSearchFocusOpen = true;
      searchInput.focus();
      this.suppressNextSearchFocusOpen = false;
    });
  }

  protected updateSearchQuery(value: string): void {
    this.searchOverlay.setQuery(value);
    this.openSearch();
  }

  protected handleSearchSubmit(event: SubmitEvent): void {
    event.preventDefault();
    this.openSearch();
  }

  protected toggleMenu(): void {
    this.isMenuOpen.update(isOpen => !isOpen);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected handleDocumentClick(event: Event): void {
    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    const searchForm = this.searchForm?.nativeElement;

    if (this.searchOverlay.isOpen() && searchForm && !searchForm.contains(target)) {
      this.closeSearch(false);
    }

    if (this.isMenuOpen() && !this.host.nativeElement.contains(target)) {
      this.closeMenu();
    }
  }

  @HostListener('document:keydown.escape')
  protected handleEscapeKey(): void {
    this.closeMenu();
  }
}
