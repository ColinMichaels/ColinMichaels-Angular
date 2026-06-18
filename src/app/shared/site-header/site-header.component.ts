import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {User} from 'firebase/auth';
import {map, tap} from 'rxjs';

import {PATH_NAMES} from '../../app-route-paths';
import {AdminAuthorization, AuthService} from '../../services/auth.service';
import {SiteThemeService} from '../theme/site-theme.service';
import {ADMIN_CONSOLE_ROLES} from '../user-account/user-account.model';
import {writeAuthDebug} from '../debug/auth-debug';

interface SiteNavItem {
  label: string;
  route: readonly string[];
  exact: boolean;
  requiresAdmin?: boolean;
}

@Component({
  selector: 'app-site-header',
  imports: [
    RouterLink,
    RouterLinkActive,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <header
      class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/92 text-slate-950 shadow-sm shadow-slate-950/5 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-neutral-950/92 dark:text-zinc-100">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <a
          routerLink="/"
          class="group min-w-0"
          aria-label="Go to homepage"
          (click)="closeMenu()"
        >
          <h1
            class="block text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 transition-colors group-hover:text-cyan-700 dark:text-zinc-500 dark:group-hover:text-cyan-300">
            Colin Michaels
          </h1>

        </a>

        <nav class="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          @for (item of visibleNavItems(); track item.label) {
            <a
              [routerLink]="item.route"
              routerLinkActive="border-cyan-500 bg-cyan-50 text-cyan-700 dark:border-cyan-300 dark:bg-cyan-400 dark:text-zinc-950"
              [routerLinkActiveOptions]="{exact: item.exact}"
              class="rounded-full border border-transparent px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-cyan-200 hover:text-cyan-700 dark:text-zinc-300 dark:hover:border-cyan-300/60 dark:hover:text-cyan-200"
            >
              {{ item.label }}
            </a>
          }
        </nav>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-cyan-300 dark:hover:text-cyan-200"
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
            [routerLink]="['/', pathNames.OS_LOGIN]"
            class="hidden rounded-full border border-emerald-500/60 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-500 hover:text-white dark:border-emerald-400/70 dark:text-emerald-200 dark:hover:bg-emerald-300 dark:hover:text-neutral-950 sm:inline-flex"
          >
            OS
          </a>

          @if (currentUser(); as user) {
            <a
              [routerLink]="['/', pathNames.PROFILE]"
              class="inline-grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-cyan-300 dark:hover:text-cyan-200"
              [attr.aria-label]="'Open profile for ' + (user.displayName || user.email || user.uid)"
            >
              @if (user.photoURL) {
                <img [src]="user.photoURL" [alt]="(user.displayName || user.email || 'User') + ' avatar'"
                     class="h-full w-full object-cover" loading="lazy">
              } @else {
                <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor"
                     stroke-width="1.8">
                  <path d="M20 21a8 8 0 0 0-16 0"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              }
            </a>
            <a
              [routerLink]="['/', pathNames.LOGOUT]"
              class="hidden h-10 items-center justify-center rounded-full border border-rose-500/60 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-rose-400/70 dark:text-rose-200 dark:hover:bg-rose-300 dark:hover:text-neutral-950 sm:inline-flex"
            >
              Sign Out
            </a>
          }

          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-cyan-300 dark:hover:text-cyan-200 md:hidden"
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
             class="border-t border-slate-200 bg-white/96 px-4 py-3 shadow-lg shadow-slate-950/5 backdrop-blur-xl dark:border-zinc-800 dark:bg-neutral-950/96 md:hidden"
             aria-label="Mobile navigation">
          <div class="grid gap-2">
            @for (item of visibleNavItems(); track item.label) {
              <a
                [routerLink]="item.route"
                routerLinkActive="border-cyan-500 bg-cyan-50 text-cyan-700 dark:border-cyan-300 dark:bg-cyan-400 dark:text-zinc-950"
                [routerLinkActiveOptions]="{exact: item.exact}"
                class="rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-cyan-200 hover:text-cyan-700 dark:text-zinc-300 dark:hover:border-cyan-300/60 dark:hover:text-cyan-200"
                (click)="closeMenu()"
              >
                {{ item.label }}
              </a>
            }
            <a
              [routerLink]="['/', pathNames.OS_LOGIN]"
              class="rounded-lg border border-emerald-500/50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-500 hover:text-white dark:border-emerald-400/70 dark:text-emerald-200 dark:hover:bg-emerald-300 dark:hover:text-neutral-950"
              (click)="closeMenu()"
            >
              Launch OS
            </a>
            @if (isSignedIn()) {
              <a
                [routerLink]="['/', pathNames.PROFILE]"
                class="rounded-lg border border-cyan-500/50 px-3 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-500 hover:text-white dark:border-cyan-400/70 dark:text-cyan-200 dark:hover:bg-cyan-300 dark:hover:text-neutral-950"
                (click)="closeMenu()"
              >
                Profile
              </a>
              <a
                [routerLink]="['/', pathNames.LOGOUT]"
                class="rounded-lg border border-rose-500/50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-500 hover:text-white dark:border-rose-400/70 dark:text-rose-200 dark:hover:bg-rose-300 dark:hover:text-neutral-950"
                (click)="closeMenu()"
              >
                Sign Out
              </a>
            }
          </div>
        </nav>
      }
    </header>
  `,
})
export class SiteHeaderComponent {
  private readonly authService = inject(AuthService);
  protected readonly theme = inject(SiteThemeService);
  protected readonly pathNames = PATH_NAMES;
  protected readonly isMenuOpen = signal(false);
  protected readonly canViewAdminLinks = toSignal(
    this.authService.getRoleAuthorization(ADMIN_CONSOLE_ROLES, true).pipe(
      tap(authorization => this.debugHeader('admin navigation authorization resolved', {
        authorization: this.createAuthorizationDebugSummary(authorization),
      })),
      map(authorization => authorization.isAuthorized)
    ),
    {initialValue: false}
  );
  protected readonly currentUser = toSignal(
    this.authService.user$.pipe(
      tap(user => this.debugHeader('account controls auth state resolved', {
        signedIn: !!user,
        shouldShowProfileIcon: !!user,
        shouldShowMobileProfileLink: !!user,
        shouldShowMobileLogoutLink: !!user,
        shouldShowLogoutButton: !!user,
        user: user ? this.createUserDebugSummary(user) : null,
      }))
    ),
    {initialValue: null}
  );
  protected readonly isSignedIn = computed(() => !!this.currentUser());
  protected readonly navItems: readonly SiteNavItem[] = [
    {label: 'Home', route: ['/'], exact: true},
    {label: 'Blog', route: ['/', PATH_NAMES.BLOG], exact: false},
    {label: 'Labs', route: ['/', PATH_NAMES.LABS], exact: false},
    {label: 'Admin', route: ['/', PATH_NAMES.ADMIN], exact: false, requiresAdmin: true},
    {label: 'CMS', route: ['/', PATH_NAMES.ADMIN, PATH_NAMES.ADMIN_CMS], exact: false, requiresAdmin: true},
    {
      label: 'Media',
      route: ['/', PATH_NAMES.ADMIN, PATH_NAMES.ADMIN_CMS, PATH_NAMES.ADMIN_MEDIA_LIBRARY],
      exact: false,
      requiresAdmin: true
    },
  ];
  protected readonly visibleNavItems = computed(() => {
    const canViewAdminLinks = this.canViewAdminLinks();

    return this.navItems.filter(item => !item.requiresAdmin || canViewAdminLinks);
  });

  protected toggleMenu(): void {
    this.isMenuOpen.update(isOpen => !isOpen);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  private createUserDebugSummary(user: User): Record<string, unknown> {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      isAnonymous: user.isAnonymous,
      providerIds: user.providerData.map(provider => provider.providerId),
    };
  }

  private createAuthorizationDebugSummary(authorization: AdminAuthorization): Record<string, unknown> {
    return {
      uid: authorization.uid,
      email: authorization.email,
      isAuthenticated: authorization.isAuthenticated,
      isAdmin: authorization.isAdmin,
      isAuthorized: authorization.isAuthorized,
      requiredRoles: authorization.requiredRoles,
      claimKeys: Object.keys(authorization.claims).sort((a, b) => a.localeCompare(b)),
    };
  }

  private debugHeader(event: string, details?: unknown): void {
    writeAuthDebug('HeaderDebug', event, details);
  }
}
