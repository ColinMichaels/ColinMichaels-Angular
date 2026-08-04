import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {NavigationEnd, Router, RouterLink} from '@angular/router';
import {filter, map, startWith, tap} from 'rxjs';

import {PATH_NAMES} from '../../app-route-paths';
import {AdminAuthorization, AuthService} from '../../services/auth.service';
import {writeAuthDebug} from '../debug/auth-debug';
import {ADMIN_CONSOLE_ROLES, CAT_CORNER_ACCESS_ROLES, UserAccountProfile} from '../user-account/user-account.model';

type AuthControlsVariant = 'desktop' | 'mobile';

@Component({
  selector: 'app-site-auth-controls',
  imports: [
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: contents;
    }
  `,
  template: `
    @if (variant === 'desktop') {
      <span class="hidden h-10 items-center gap-2 md:inline-flex">
        @if (canViewAdminLinks()) {
          <a
            [routerLink]="['/', pathNames.ADMIN]"
            class="site-icon-control site-icon-control-sm site-icon-control-accent"
            aria-label="Open admin"
            title="Admin"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor"
                 stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3.5 5.5 6v5.5c0 4.1 2.7 7.5 6.5 9 3.8-1.5 6.5-4.9 6.5-9V6L12 3.5Z"></path>
              <path d="m9.5 12 1.7 1.7 3.5-4"></path>
            </svg>
          </a>
          <a
            [routerLink]="['/', pathNames.ADMIN, pathNames.ADMIN_CMS]"
            class="site-icon-control site-icon-control-sm site-icon-control-accent hidden lg:inline-flex"
            aria-label="Open CMS"
            title="CMS"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor"
                 stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V3.5Z"></path>
              <path d="M14 3.5V8h4"></path>
              <path d="M9 12h6M9 15.5h6"></path>
            </svg>
          </a>
        }

        @if (currentUser(); as user) {
          <a
            [routerLink]="['/', pathNames.PROFILE]"
            class="site-icon-control site-icon-control-sm site-icon-control-profile"
            [attr.aria-label]="'Open profile for ' + (user.displayName || user.email || user.uid)"
            title="Profile"
          >
            @if (user.photoURL) {
              <img
                [src]="user.photoURL"
                [alt]="(user.displayName || user.email || 'User') + ' avatar'"
                class="h-full w-full object-cover"
                loading="lazy"
              >
            } @else {
              <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor"
                   stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21a8 8 0 0 0-16 0"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            }
          </a>
          <a
            [routerLink]="['/', pathNames.LOGOUT]"
            class="site-icon-control site-icon-control-sm site-icon-control-danger"
            aria-label="Sign out"
            title="Sign out"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor"
                 stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H10"></path>
              <path d="M15 8l4 4-4 4"></path>
              <path d="M19 12H9"></path>
            </svg>
          </a>
        } @else {
          <a
            [routerLink]="['/', pathNames.OS_LOGIN]"
            [queryParams]="loginQueryParams()"
            class="site-icon-control site-icon-control-sm"
            aria-label="Sign in"
            title="Sign in"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor"
                 stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21a8 8 0 0 0-16 0"></path>
              <circle cx="12" cy="7" r="4"></circle>
              <path d="M16 11h5"></path>
              <path d="m18.5 8.5 2.5 2.5-2.5 2.5"></path>
            </svg>
          </a>
        }
      </span>
    } @else {
      @if (canViewCatCorner()) {
        <a
          [routerLink]="['/', pathNames.CAT_CORNER]"
          class="site-menu-link site-menu-link-success"
          (click)="navigate.emit()"
        >
          <svg aria-hidden="true" viewBox="0 0 32 32" class="h-5 w-5 shrink-0 fill-current">
            <ellipse cx="16" cy="21.5" rx="7.6" ry="6.2"></ellipse>
            <ellipse cx="7.7" cy="13.1" rx="3.1" ry="4.2" transform="rotate(-25 7.7 13.1)"></ellipse>
            <ellipse cx="14" cy="9" rx="3.1" ry="4.3" transform="rotate(-7 14 9)"></ellipse>
            <ellipse cx="24.3" cy="13.1" rx="3.1" ry="4.2" transform="rotate(25 24.3 13.1)"></ellipse>
            <ellipse cx="20" cy="9" rx="3.1" ry="4.3" transform="rotate(7 20 9)"></ellipse>
          </svg>
          <span>Cat Corner</span>
        </a>
      }

      @if (canViewAdminLinks()) {
        <a
          [routerLink]="['/', pathNames.ADMIN]"
          class="site-menu-link site-menu-link-accent"
          (click)="navigate.emit()"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3.5 5.5 6v5.5c0 4.1 2.7 7.5 6.5 9 3.8-1.5 6.5-4.9 6.5-9V6L12 3.5Z"></path>
            <path d="m9.5 12 1.7 1.7 3.5-4"></path>
          </svg>
          <span>Admin</span>
        </a>
        <a
          [routerLink]="['/', pathNames.ADMIN, pathNames.ADMIN_CMS]"
          class="site-menu-link site-menu-link-accent"
          (click)="navigate.emit()"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V3.5Z"></path>
            <path d="M14 3.5V8h4"></path>
            <path d="M9 12h6M9 15.5h6"></path>
          </svg>
          <span>CMS</span>
        </a>
        <a
          [routerLink]="['/', pathNames.ADMIN, pathNames.ADMIN_CMS, pathNames.ADMIN_MEDIA_LIBRARY]"
          class="site-menu-link site-menu-link-accent"
          (click)="navigate.emit()"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 5.5A1.5 1.5 0 0 1 6.5 4h11A1.5 1.5 0 0 1 19 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18.5v-13Z"></path>
            <path d="m8 15 2.4-2.4a1 1 0 0 1 1.4 0L15 16"></path>
            <circle cx="15.5" cy="8.5" r="1.5"></circle>
          </svg>
          <span>Media</span>
        </a>
      }

      @if (isSignedIn()) {
        <a
          [routerLink]="['/', pathNames.PROFILE]"
          class="site-menu-link site-menu-link-accent"
          (click)="navigate.emit()"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21a8 8 0 0 0-16 0"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Profile</span>
        </a>
        <a
          [routerLink]="['/', pathNames.LOGOUT]"
          class="site-menu-link site-menu-link-danger"
          (click)="navigate.emit()"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H10"></path>
            <path d="M15 8l4 4-4 4"></path>
            <path d="M19 12H9"></path>
          </svg>
          <span>Sign Out</span>
        </a>
      } @else {
        <a
          [routerLink]="['/', pathNames.OS_LOGIN]"
          [queryParams]="loginQueryParams()"
          class="site-menu-link site-menu-link-accent"
          (click)="navigate.emit()"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21a8 8 0 0 0-16 0"></path>
            <circle cx="12" cy="7" r="4"></circle>
            <path d="M16 11h5"></path>
            <path d="m18.5 8.5 2.5 2.5-2.5 2.5"></path>
          </svg>
          <span>Sign In</span>
        </a>
      }
    }
  `,
})
export class SiteAuthControlsComponent {
  @Input() variant: AuthControlsVariant = 'desktop';
  @Output() readonly navigate = new EventEmitter<void>();

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly pathNames = PATH_NAMES;
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects),
      startWith(this.router.url)
    ),
    {initialValue: this.router.url}
  );
  protected readonly canViewAdminLinks = toSignal(
    this.authService.getRoleAuthorization(ADMIN_CONSOLE_ROLES, true).pipe(
      tap(authorization => this.debugHeader('admin navigation authorization resolved', {
        authorization: this.createAuthorizationDebugSummary(authorization),
      })),
      map(authorization => authorization.isAuthorized)
    ),
    {initialValue: false}
  );
  protected readonly canViewCatCorner = toSignal(
    this.authService.getRoleAuthorization(CAT_CORNER_ACCESS_ROLES).pipe(
      tap(authorization => this.debugHeader('Cat Corner navigation authorization resolved', {
        authorization: this.createAuthorizationDebugSummary(authorization),
      })),
      map(authorization => authorization.isAuthorized)
    ),
    {initialValue: false}
  );
  protected readonly currentUser = toSignal(
    this.authService.getCurrentUserProfile().pipe(
      tap(profile => this.debugHeader('account controls auth state resolved', {
        signedIn: !!profile,
        user: profile ? this.createUserDebugSummary(profile) : null,
      }))
    ),
    {initialValue: null}
  );
  protected readonly isSignedIn = computed(() => !!this.currentUser());
  protected readonly loginQueryParams = computed(() => ({
    redirectUrl: this.getLoginRedirectUrl(),
  }));

  private getLoginRedirectUrl(): string {
    const currentUrl = this.currentUrl();
    const path = currentUrl.split('?')[0].split('#')[0] || '/';

    if (path === `/${PATH_NAMES.OS_LOGIN}` || path === `/${PATH_NAMES.LOGOUT}`) {
      return '/';
    }

    return currentUrl.startsWith('/') ? currentUrl : '/';
  }

  private createUserDebugSummary(user: UserAccountProfile): Record<string, unknown> {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      isAnonymous: user.isAnonymous,
      providerIds: user.providerIds,
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
