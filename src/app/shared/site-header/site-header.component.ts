import {ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {SiteSearchDrawerComponent} from '../../features/search/components/site-search-drawer.component';
import {SiteSearchOverlayService} from '../../features/search/services/site-search-overlay.service';
import {SiteAuthControlsComponent} from './site-auth-controls.component';
import {SiteThemeService} from '../theme/site-theme.service';
import {SiteLogoComponent} from './site-logo.component';

@Component({
  selector: 'app-site-header',
  imports: [
    RouterLink,
    RouterLinkActive,
    SiteAuthControlsComponent,
    SiteLogoComponent,
    SiteSearchDrawerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 text-slate-950 shadow-sm shadow-slate-950/5 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-neutral-950/95 dark:text-zinc-100"
      [class.site-header-overlay-open]="searchOverlay.isOpen() || isMenuOpen()"
    >
      <div class="mx-auto grid min-h-16 max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6 lg:px-8">
        <a
          routerLink="/"
          class="group w-24 min-w-0 min-[400px]:w-28 sm:w-48 lg:w-56"
          aria-label="Go to homepage"
          (click)="closeMenu()"
        >
          <h1 class="block w-full">
            <app-site-logo/>
          </h1>
        </a>

        <form
          class="relative mx-auto w-full min-w-0 max-w-xl"
          role="search"
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
            placeholder="Search"
            autocomplete="off"
            [value]="searchQuery()"
            class="h-10 w-full rounded-full border border-slate-300 bg-slate-50/90 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-500 hover:border-cyan-400 focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/25 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-cyan-400 dark:focus:border-cyan-300 dark:focus:bg-zinc-900 dark:focus:ring-cyan-300/20"
            aria-haspopup="dialog"
            aria-controls="site-search-results-panel"
            [attr.aria-expanded]="searchOverlay.isOpen()"
            (focus)="openSearch()"
            (click)="openSearch()"
            (input)="updateSearchQuery(headerSearchInput.value)"
          >

          @if (searchOverlay.isOpen()) {
            @defer (when searchOverlay.isOpen()) {
              <app-site-search-drawer
                [isOpen]="true"
                [query]="searchQuery()"
                (closeSearch)="closeSearch()"
              />
            }
          }
        </form>

        <nav class="flex h-10 shrink-0 items-center justify-end gap-1.5" aria-label="Site utilities">
          <a
            [routerLink]="['/', pathNames.BLOG]"
            routerLinkActive="border-cyan-600 bg-cyan-50 text-cyan-800 dark:border-cyan-300 dark:bg-cyan-400/15 dark:text-cyan-200"
            class="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-cyan-300 dark:hover:text-cyan-200 min-[400px]:inline-flex"
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
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-cyan-300 dark:hover:text-cyan-200"
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
          class="absolute right-3 top-full z-[60] mt-2 grid w-[min(20rem,calc(100vw-1.5rem))] gap-1.5 border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-950/20 dark:border-zinc-700 dark:bg-neutral-950 dark:shadow-black/50 sm:right-6 lg:right-8"
          aria-label="Account and site menu"
        >
          <a
            [routerLink]="['/', pathNames.BLOG]"
            class="inline-flex h-11 items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 dark:text-zinc-200 dark:hover:border-cyan-300/60 dark:hover:bg-zinc-900 dark:hover:text-cyan-200"
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
            [routerLink]="['/', pathNames.OS_MAIN]"
            class="inline-flex h-11 items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 dark:text-zinc-200 dark:hover:border-emerald-400/60 dark:hover:bg-zinc-900 dark:hover:text-emerald-200"
            (click)="closeMenu()"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3.5" y="4" width="17" height="16" rx="2"></rect>
              <path d="m7.5 9 2.5 2.5L7.5 14M12.5 14H17"></path>
            </svg>
            <span>Open OS</span>
          </a>
          <button
            type="button"
            class="inline-flex h-11 items-center gap-3 rounded-lg border border-transparent px-3 text-left text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 dark:text-zinc-200 dark:hover:border-cyan-300/60 dark:hover:bg-zinc-900 dark:hover:text-cyan-200"
            (click)="toggleThemeFromMenu()"
          >
            @if (theme.isDark()) {
              <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8">
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M12 2.8v2.4M12 18.8v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"></path>
              </svg>
              <span>Switch to light mode</span>
            } @else {
              <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M20.2 14.5A7.7 7.7 0 0 1 9.5 3.8 8.7 8.7 0 1 0 20.2 14.5Z"></path>
              </svg>
              <span>Switch to dark mode</span>
            }
          </button>

          @defer (when isMenuOpen()) {
            <app-site-auth-controls variant="mobile" (navigate)="closeMenu()"/>
          }
        </nav>
      }
    </header>
  `,
  styles: `
    .site-header-overlay-open {
      z-index: 90;
    }
  `,
})
export class SiteHeaderComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly theme = inject(SiteThemeService);
  protected readonly searchOverlay = inject(SiteSearchOverlayService);
  protected readonly pathNames = PATH_NAMES;
  protected readonly isMenuOpen = signal(false);
  protected readonly searchQuery = signal('');

  protected openSearch(): void {
    this.closeMenu();
    this.searchOverlay.open();
  }

  protected closeSearch(): void {
    this.searchOverlay.close();
  }

  protected updateSearchQuery(value: string): void {
    this.searchQuery.set(value);
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

  protected toggleThemeFromMenu(): void {
    this.theme.toggleMode();
    this.closeMenu();
  }

  @HostListener('document:click', ['$event'])
  protected handleDocumentClick(event: Event): void {
    if (!this.isMenuOpen()) {
      return;
    }

    const target = event.target;

    if (target instanceof Node && !this.host.nativeElement.contains(target)) {
      this.closeMenu();
    }
  }

  @HostListener('document:keydown.escape')
  protected handleEscapeKey(): void {
    this.closeMenu();
  }
}
