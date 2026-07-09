import {NgClass, NgTemplateOutlet} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {
  faArrowUpRightFromSquare,
  faArrowRightFromBracket,
  faAnglesLeft,
  faAnglesRight,
  faBars,
  faChevronRight,
  faPlus,
  faUser,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import {NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {filter, map, startWith} from 'rxjs';

import {AuthService} from '../services/auth.service';
import {
  CMS_ACCESS_ROLES,
  MEDIA_LIBRARY_ACCESS_ROLES,
  USER_MANAGEMENT_ACCESS_ROLES,
} from '../shared/user-account/user-account.model';
import {
  ADMIN_NAVIGATION_GROUPS,
  AdminNavigationAccess,
  getAdminPageTitle,
} from './admin-navigation.config';
import {AdminEnvironmentBadgeComponent} from './shared/admin-environment-badge.component';

const ADMIN_NAVIGATION_COLLAPSED_STORAGE_KEY = 'admin.navigation.collapsed';

@Component({
  selector: 'app-admin-shell',
  imports: [
    AdminEnvironmentBadgeComponent,
    FaIconComponent,
    NgClass,
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="min-h-screen bg-zinc-950 text-zinc-100"
      [style.--admin-sidebar-width]="desktopNavigationCollapsed() ? '4.5rem' : '14rem'"
    >
      <aside
        class="fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-zinc-800 bg-zinc-950 transition-[width] duration-200 lg:flex"
        [ngClass]="desktopNavigationCollapsed() ? 'w-[4.5rem]' : 'w-56'"
      >
        <ng-container
          [ngTemplateOutlet]="adminNavigation"
          [ngTemplateOutletContext]="{collapsed: desktopNavigationCollapsed(), desktop: true}"
        ></ng-container>
      </aside>

      @if (mobileNavigationOpen()) {
        <button
          type="button"
          class="fixed inset-0 z-[60] bg-black/70 lg:hidden"
          aria-label="Close admin navigation"
          (click)="closeMobileNavigation()"
        ></button>
        <aside class="fixed inset-y-0 left-0 z-[70] flex w-[min(19rem,88vw)] flex-col border-r border-zinc-700 bg-zinc-950 shadow-2xl shadow-black lg:hidden">
          <ng-container
            [ngTemplateOutlet]="adminNavigation"
            [ngTemplateOutletContext]="{collapsed: false, desktop: false}"
          ></ng-container>
        </aside>
      }

      <div
        class="min-h-screen transition-[padding] duration-200"
        [ngClass]="desktopNavigationCollapsed() ? 'lg:pl-[4.5rem]' : 'lg:pl-56'"
      >
        <header class="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-950/95 px-4 backdrop-blur sm:px-6">
          <div class="flex min-w-0 items-center gap-3">
            <button
              type="button"
              class="grid h-9 w-9 shrink-0 place-items-center border border-zinc-700 text-zinc-300 hover:border-cyan-400 hover:text-cyan-200 lg:hidden"
              aria-label="Open admin navigation"
              [attr.aria-expanded]="mobileNavigationOpen()"
              (click)="openMobileNavigation()"
            >
              <fa-icon [icon]="faBars" aria-hidden="true"></fa-icon>
            </button>
            <div class="flex min-w-0 items-center gap-2 text-sm">
              <a routerLink="/admin" class="hidden font-medium text-zinc-500 hover:text-zinc-200 sm:inline">Admin</a>
              <fa-icon [icon]="faChevronRight" class="hidden text-[10px] text-zinc-700 sm:inline" aria-hidden="true"></fa-icon>
              <span class="truncate font-semibold text-zinc-100">{{ pageTitle() }}</span>
            </div>
          </div>

          <nav class="flex shrink-0 items-center gap-1.5" aria-label="Admin utilities">
            <a
              routerLink="/"
              class="hidden h-9 items-center gap-2 border border-transparent px-2.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-100 sm:inline-flex"
            >
              View site
              <fa-icon [icon]="faArrowUpRightFromSquare" class="text-[10px]" aria-hidden="true"></fa-icon>
            </a>
            <a
              routerLink="/blog"
              class="hidden h-9 items-center border border-transparent px-2.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-100 md:inline-flex"
            >
              Blog
            </a>
            <a
              routerLink="/profile"
              class="grid h-9 w-9 place-items-center border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
              aria-label="Open account"
            >
              <fa-icon [icon]="faUser" aria-hidden="true"></fa-icon>
            </a>
            @if (canManageCms()) {
              <a
                routerLink="/admin/cms/new"
                class="inline-flex h-9 items-center gap-2 border border-cyan-400 bg-cyan-400 px-3 text-xs font-semibold text-zinc-950 hover:bg-cyan-300"
              >
                <fa-icon [icon]="faPlus" aria-hidden="true"></fa-icon>
                <span class="hidden sm:inline">New Post</span>
                <span class="sm:hidden">New</span>
              </a>
            }
          </nav>
        </header>

        <router-outlet></router-outlet>
      </div>
    </div>

    <ng-template #adminNavigation let-collapsed="collapsed" let-desktop="desktop">
      <div
        class="flex h-16 shrink-0 items-center gap-3 border-b border-zinc-800"
        [class.justify-center]="collapsed"
        [class.justify-between]="!collapsed"
        [class.px-2]="collapsed"
        [class.px-4]="!collapsed"
      >
        @if (!collapsed) {
          <a routerLink="/admin" class="min-w-0" aria-label="Admin overview" (click)="closeMobileNavigation()">
            <span class="block truncate text-xs font-semibold tracking-[0.16em] text-zinc-50">COLIN MICHAELS</span>
            <span class="mt-1 block text-[9px] font-semibold uppercase tracking-[0.24em] text-cyan-300">Admin Console</span>
          </a>
        }
        @if (desktop) {
          <button
            type="button"
            class="grid h-8 w-8 shrink-0 place-items-center border border-zinc-700 text-zinc-400 hover:border-cyan-400 hover:text-cyan-200 focus-visible:border-cyan-400 focus-visible:text-cyan-200"
            [attr.aria-label]="collapsed ? 'Expand admin navigation' : 'Collapse admin navigation'"
            [attr.aria-pressed]="collapsed"
            [attr.title]="collapsed ? 'Expand navigation' : 'Collapse navigation'"
            (click)="toggleDesktopNavigation()"
          >
            <fa-icon [icon]="collapsed ? faAnglesRight : faAnglesLeft" aria-hidden="true"></fa-icon>
          </button>
        } @else {
          <button
            type="button"
            class="grid h-8 w-8 shrink-0 place-items-center border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
            aria-label="Close admin navigation"
            (click)="closeMobileNavigation()"
          >
            <fa-icon [icon]="faXmark" aria-hidden="true"></fa-icon>
          </button>
        }
      </div>

      <nav
        class="min-h-0 flex-1 py-5"
        [class.overflow-visible]="collapsed"
        [class.overflow-y-auto]="!collapsed"
        [class.px-2]="collapsed"
        [class.px-3]="!collapsed"
        aria-label="Admin sections"
      >
        @for (group of visibleNavigationGroups(); track group.label) {
          <section
            class="last:mb-0 first:border-t-0 first:pt-0"
            [class.mb-3]="collapsed"
            [class.mb-6]="!collapsed"
            [class.border-t]="collapsed"
            [class.border-zinc-800]="collapsed"
            [class.pt-3]="collapsed"
          >
            @if (collapsed) {
              <h2 class="sr-only">{{ group.label }}</h2>
            } @else {
              <h2 class="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">{{ group.label }}</h2>
            }
            <div class="grid gap-1" [class.mt-2]="!collapsed">
              @for (item of group.items; track item.route) {
                <a
                  [routerLink]="item.route"
                  routerLinkActive="border-cyan-400 bg-cyan-400/10 text-cyan-200"
                  [routerLinkActiveOptions]="{exact: item.exact}"
                  #navLinkActive="routerLinkActive"
                  ariaCurrentWhenActive="page"
                  [attr.aria-label]="collapsed ? item.label : null"
                  [attr.title]="collapsed ? item.label : null"
                  class="group relative flex min-h-10 items-center border-l-2 border-transparent py-2 text-sm font-medium text-zinc-400 transition hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-100 focus-visible:border-cyan-400 focus-visible:bg-zinc-900 focus-visible:text-zinc-100"
                  [class.gap-3]="!collapsed"
                  [class.justify-center]="collapsed"
                  [class.px-2]="collapsed"
                  [class.px-3]="!collapsed"
                  (click)="closeMobileNavigation()"
                >
                  <span
                    class="grid w-5 shrink-0 place-items-center text-sm group-hover:text-zinc-200"
                    [class.text-cyan-200]="navLinkActive.isActive"
                    [class.text-zinc-500]="!navLinkActive.isActive"
                  >
                    <fa-icon [icon]="item.icon" aria-hidden="true"></fa-icon>
                  </span>
                  @if (!collapsed) {
                    <span>{{ item.label }}</span>
                  } @else {
                    <span
                      role="tooltip"
                      class="pointer-events-none absolute left-full top-1/2 z-[90] ml-3 -translate-y-1/2 whitespace-nowrap border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-zinc-100 opacity-0 shadow-lg shadow-black/40 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      {{ item.label }}
                    </span>
                  }
                </a>
              }
            </div>
          </section>
        }
      </nav>

      <div
        class="shrink-0 border-t border-zinc-800"
        [class.p-2]="collapsed"
        [class.p-3]="!collapsed"
        [class.space-y-2]="collapsed"
        [class.space-y-3]="!collapsed"
      >
        <app-admin-environment-badge
          class="block"
          [class.mx-auto]="collapsed"
          [compact]="true"
          [iconOnly]="collapsed"
        ></app-admin-environment-badge>
        <div
          class="grid gap-2 text-center text-[11px] font-medium"
          [class.grid-cols-1]="collapsed"
          [class.grid-cols-2]="!collapsed"
        >
          <a
            routerLink="/profile"
            class="group relative grid min-h-9 place-items-center border border-zinc-800 px-2 py-2 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200 focus-visible:border-cyan-400 focus-visible:text-cyan-200"
            [attr.aria-label]="collapsed ? 'Account' : null"
            [attr.title]="collapsed ? 'Account' : null"
            (click)="closeMobileNavigation()"
          >
            @if (collapsed) {
              <fa-icon [icon]="faUser" aria-hidden="true"></fa-icon>
              <span role="tooltip" class="pointer-events-none absolute left-full top-1/2 z-[90] ml-3 -translate-y-1/2 whitespace-nowrap border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-zinc-100 opacity-0 shadow-lg shadow-black/40 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Account</span>
            } @else {
              Account
            }
          </a>
          <a
            routerLink="/logout"
            class="group relative grid min-h-9 place-items-center border border-zinc-800 px-2 py-2 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200 focus-visible:border-cyan-400 focus-visible:text-cyan-200"
            [attr.aria-label]="collapsed ? 'Sign out' : null"
            [attr.title]="collapsed ? 'Sign out' : null"
            (click)="closeMobileNavigation()"
          >
            @if (collapsed) {
              <fa-icon [icon]="faArrowRightFromBracket" aria-hidden="true"></fa-icon>
              <span role="tooltip" class="pointer-events-none absolute left-full top-1/2 z-[90] ml-3 -translate-y-1/2 whitespace-nowrap border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-zinc-100 opacity-0 shadow-lg shadow-black/40 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Sign out</span>
            } @else {
              Sign out
            }
          </a>
        </div>
      </div>
    </ng-template>
  `,
})
export class AdminShellComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected readonly faArrowUpRightFromSquare = faArrowUpRightFromSquare;
  protected readonly faArrowRightFromBracket = faArrowRightFromBracket;
  protected readonly faAnglesLeft = faAnglesLeft;
  protected readonly faAnglesRight = faAnglesRight;
  protected readonly faBars = faBars;
  protected readonly faChevronRight = faChevronRight;
  protected readonly faPlus = faPlus;
  protected readonly faUser = faUser;
  protected readonly faXmark = faXmark;
  protected readonly desktopNavigationCollapsed = signal(this.readDesktopNavigationPreference());
  protected readonly mobileNavigationOpen = signal(false);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects),
      startWith(this.router.url)
    ),
    {initialValue: this.router.url}
  );
  protected readonly pageTitle = computed(() => getAdminPageTitle(this.currentUrl()));
  protected readonly canManageCms = toSignal(
    this.authService.getRoleAuthorization(CMS_ACCESS_ROLES).pipe(map(authorization => authorization.isAuthorized)),
    {initialValue: false}
  );
  protected readonly canManageMedia = toSignal(
    this.authService.getRoleAuthorization(MEDIA_LIBRARY_ACCESS_ROLES).pipe(map(authorization => authorization.isAuthorized)),
    {initialValue: false}
  );
  protected readonly canManageUsers = toSignal(
    this.authService.getRoleAuthorization(USER_MANAGEMENT_ACCESS_ROLES).pipe(map(authorization => authorization.isAuthorized)),
    {initialValue: false}
  );
  protected readonly visibleNavigationGroups = computed(() => ADMIN_NAVIGATION_GROUPS
    .map(group => ({
      ...group,
      items: group.items.filter(item => this.canAccess(item.access)),
    }))
    .filter(group => group.items.length > 0));

  protected openMobileNavigation(): void {
    this.mobileNavigationOpen.set(true);
  }

  protected closeMobileNavigation(): void {
    this.mobileNavigationOpen.set(false);
  }

  protected toggleDesktopNavigation(): void {
    const collapsed = !this.desktopNavigationCollapsed();
    this.desktopNavigationCollapsed.set(collapsed);
    this.writeDesktopNavigationPreference(collapsed);
  }

  private readDesktopNavigationPreference(): boolean {
    try {
      return globalThis.localStorage?.getItem(ADMIN_NAVIGATION_COLLAPSED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private writeDesktopNavigationPreference(collapsed: boolean): void {
    try {
      globalThis.localStorage?.setItem(ADMIN_NAVIGATION_COLLAPSED_STORAGE_KEY, String(collapsed));
    } catch {
      // Keep the current session state when storage is unavailable.
    }
  }

  private canAccess(access: AdminNavigationAccess): boolean {
    switch (access) {
      case 'all':
        return true;
      case 'cms':
        return this.canManageCms();
      case 'media':
        return this.canManageMedia();
      case 'users':
        return this.canManageUsers();
    }
  }
}
