import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {SiteSearchOverlayService} from '../../features/search/services/site-search-overlay.service';
import {SiteAuthControlsComponent} from './site-auth-controls.component';
import {SiteThemeService} from '../theme/site-theme.service';
import {SiteLogoComponent} from './site-logo.component';

interface SiteNavItem {
  label: string;
  route: readonly string[];
  exact: boolean;
}

@Component({
  selector: 'app-site-header',
  imports: [
    RouterLink,
    RouterLinkActive,
    SiteAuthControlsComponent,
    SiteLogoComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 text-slate-950 shadow-sm shadow-slate-950/5 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-neutral-950/95 dark:text-zinc-100"
      [class.site-header-mobile-menu-open]="isMenuOpen()">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a
          routerLink="/"
          class="group min-w-0"
          aria-label="Go to homepage"
          (click)="closeMenu()"
        >
          <h1 class="block w-56 sm:w-72 lg:w-80">
            <app-site-logo/>
          </h1>
        </a>

        <nav class="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          @for (item of navItems; track item.label) {
            <a
              [routerLink]="item.route"
              routerLinkActive="border-cyan-700 bg-cyan-600 text-white shadow-sm shadow-cyan-950/15 dark:border-cyan-300 dark:bg-cyan-400 dark:text-zinc-950"
              [routerLinkActiveOptions]="{exact: item.exact}"
              class="rounded-full border border-transparent px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 dark:text-zinc-300 dark:hover:border-cyan-300/60 dark:hover:bg-transparent dark:hover:text-cyan-200"
            >
              {{ item.label }}
            </a>
          }
          <button
            type="button"
            class="rounded-full border border-transparent px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-zinc-300 dark:hover:border-cyan-300/60 dark:hover:bg-transparent dark:hover:text-cyan-200"
            aria-haspopup="dialog"
            [attr.aria-expanded]="searchOverlay.isOpen()"
            (click)="openSearch()"
          >
            Search
          </button>
        </nav>

        <div class="flex h-10 shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-cyan-300 dark:hover:text-cyan-200"
            [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
            (click)="theme.toggleMode()"
          >
            @if (theme.isDark()) {
              <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor"
                   stroke-width="1.8">
                <circle cx="12" cy="12" r="4"></circle>
                <path
                  d="M12 2.8v2.4M12 18.8v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"></path>
              </svg>
            } @else {
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor"
                 stroke-width="1.8">
              <path d="M20.2 14.5A7.7 7.7 0 0 1 9.5 3.8 8.7 8.7 0 1 0 20.2 14.5Z"></path>
            </svg>
          }
          </button>

          <a
            [routerLink]="['/', pathNames.OS_MAIN]"
            class="hidden h-10 shrink-0 items-center justify-center rounded-full border border-emerald-600/70 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-600 hover:text-white dark:border-emerald-400/70 dark:bg-transparent dark:text-emerald-200 dark:hover:bg-emerald-300 dark:hover:text-neutral-950 sm:inline-flex"
          >
            OS
          </a>

          @defer (on idle) {
            <app-site-auth-controls variant="desktop"/>
          }

          <button
            type="button"
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-cyan-300 dark:hover:text-cyan-200 md:hidden"
            [attr.aria-expanded]="isMenuOpen()"
            aria-controls="site-mobile-menu"
            aria-label="Toggle navigation menu"
            (click)="toggleMenu()"
          >
            @if (isMenuOpen()) {
              <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor"
                   stroke-width="1.8">
                <path d="M6 6l12 12M18 6 6 18"></path>
              </svg>
            } @else {
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor"
                 stroke-width="1.8">
              <path d="M4 7h16M4 12h16M4 17h16"></path>
            </svg>
          }
          </button>
        </div>
      </div>

      @if (isMenuOpen()) {
        <nav id="site-mobile-menu"
             class="relative z-[91] pointer-events-auto border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg shadow-slate-950/5 backdrop-blur-xl dark:border-zinc-800 dark:bg-neutral-950/95 md:hidden"
             aria-label="Mobile navigation">
          <div class="grid gap-2">
            @for (item of navItems; track item.label) {
              <a
                [routerLink]="item.route"
                routerLinkActive="border-cyan-700 bg-cyan-600 text-white dark:border-cyan-300 dark:bg-cyan-400 dark:text-zinc-950"
                [routerLinkActiveOptions]="{exact: item.exact}"
                class="rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 dark:text-zinc-300 dark:hover:border-cyan-300/60 dark:hover:bg-transparent dark:hover:text-cyan-200"
                (click)="closeMenu()"
              >
                {{ item.label }}
              </a>
            }
            <button
              type="button"
              class="rounded-lg border border-transparent px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-zinc-300 dark:hover:border-cyan-300/60 dark:hover:bg-transparent dark:hover:text-cyan-200"
              aria-haspopup="dialog"
              [attr.aria-expanded]="searchOverlay.isOpen()"
              (click)="openSearch()"
            >
              Search
            </button>
            <a
              [routerLink]="['/', pathNames.OS_MAIN]"
              class="rounded-lg border border-emerald-600/70 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-600 hover:text-white dark:border-emerald-400/70 dark:bg-transparent dark:text-emerald-200 dark:hover:bg-emerald-300 dark:hover:text-neutral-950"
              (click)="closeMenu()"
            >
              Launch OS
            </a>
            @defer (when isMenuOpen()) {
              <app-site-auth-controls variant="mobile" (navigate)="closeMenu()"/>
            }
          </div>
        </nav>
      }
    </header>
  `,
  styles: `
    .site-header-mobile-menu-open {
      z-index: 90;
    }
  `,
})
export class SiteHeaderComponent {
  protected readonly theme = inject(SiteThemeService);
  protected readonly searchOverlay = inject(SiteSearchOverlayService);
  protected readonly pathNames = PATH_NAMES;
  protected readonly isMenuOpen = signal(false);
  protected readonly navItems: readonly SiteNavItem[] = [
    {label: 'Home', route: ['/'], exact: true},
    {label: 'Blog', route: ['/', PATH_NAMES.BLOG], exact: false},
    {label: 'Labs', route: ['/', PATH_NAMES.LABS], exact: false},
  ];

  protected toggleMenu(): void {
    this.isMenuOpen.update(isOpen => !isOpen);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  protected openSearch(): void {
    this.isMenuOpen.set(false);
    this.searchOverlay.open();
  }
}
