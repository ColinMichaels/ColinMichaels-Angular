import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';
import {catchError, firstValueFrom, of, shareReplay, switchMap, tap} from 'rxjs';

import {PATH_NAMES} from '../../app-route-paths';
import {ArticleLibraryControlComponent} from '../../features/blog/components/article-library-control/article-library-control.component';
import {OfflineArticlesControlComponent} from '../../features/blog/components/offline-articles-control/offline-articles-control.component';
import {AuthService, getAuthProviderLabel} from '../../services/auth.service';
import {PwaNativeControlsComponent} from '../pwa/pwa-native-controls.component';
import {
  ADMIN_CONSOLE_ROLES,
  BASE_USER_ROLE,
  CAT_CORNER_ADDICT_ROLE,
  isRecord,
  UserAccountProfile,
  UserPointEvent,
  USER_ROLE_DEFINITIONS,
} from '../user-account/user-account.model';
import {UserAccountService} from '../user-account/user-account.service';
import {writeAuthDebug} from '../debug/auth-debug';
import {
  CommunicationPreferencesComponent
} from '../user-account/communication-preferences.component';

function getDisplayName(profile: UserAccountProfile): string {
  return profile.displayName || profile.email || 'User';
}

interface AssignedRoleView {
  id: string;
  label: string;
  description: string;
}

interface LinkedProviderView {
  id: string;
  label: string;
}

@Component({
  selector: 'app-user-profile',
  imports: [
    RouterLink,
    ArticleLibraryControlComponent,
    OfflineArticlesControlComponent,
    PwaNativeControlsComponent,
    CommunicationPreferencesComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="dark min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <div class="mx-auto max-w-6xl space-y-8">
        <nav class="flex items-center justify-between text-sm text-zinc-400">
          <a routerLink="/" class="hover:text-zinc-100">Home</a>
          <a routerLink="/logout" class="hover:text-rose-200">Sign Out</a>
        </nav>

        @if (profile(); as account) {
          <div class="grid gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start">
            <aside class="space-y-4 lg:sticky lg:top-8" aria-label="Profile summary">
              <header class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
                <div
                  class="mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-950 text-3xl font-semibold text-cyan-100">
                  @if (account.photoURL) {
                    <img [src]="account.photoURL" [alt]="displayName() + ' avatar'" class="h-full w-full object-cover"
                         loading="lazy">
                  } @else {
                    {{ initials() }}
                  }
                </div>
                <p class="mt-4 text-xs uppercase tracking-[0.3em] text-cyan-300">Profile</p>
                <h1 class="mt-2 break-words text-2xl font-semibold text-zinc-50">{{ displayName() }}</h1>
                <p class="mt-1 break-all text-sm text-zinc-400">{{ account.email || 'Signed in account' }}</p>
              </header>

              <section class="grid grid-cols-2 gap-3" aria-label="Account overview">
                <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <p class="text-xs uppercase tracking-wide text-zinc-500">Account</p>
                  <p class="mt-2 text-lg font-semibold">{{ account.emailVerified ? 'Verified' : 'Unverified' }}</p>
                </div>
                <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <p class="text-xs uppercase tracking-wide text-zinc-500">Providers</p>
                  <p class="mt-2 text-lg font-semibold">{{ linkedProviderIds().length || 0 }}</p>
                </div>
                <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <p class="text-xs uppercase tracking-wide text-zinc-500">Roles</p>
                  <p class="mt-2 text-lg font-semibold">{{ assignedRoleViews().length }}</p>
                </div>
                <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <p class="text-xs uppercase tracking-wide text-zinc-500">Points</p>
                  <p class="mt-2 text-lg font-semibold">{{ accountDocument()?.points?.total ?? 0 }}</p>
                </div>
              </section>

              @if (canEnterAdmin()) {
                <a routerLink="/admin"
                   class="block rounded-xl border border-cyan-400/60 px-4 py-3 text-center text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950">
                  Open Admin
                </a>
              }
            </aside>

            <div class="min-w-0 space-y-8">
          @if (linkStatusMessage()) {
            <p
              class="border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">{{ linkStatusMessage() }}</p>
          }

          @if (linkErrorMessage()) {
            <p
              class="border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-100">{{ linkErrorMessage() }}</p>
          }

          <section class="grid gap-6 lg:grid-cols-2" aria-label="Personal reading and app settings">
            <section class="space-y-5 border border-zinc-800 bg-zinc-900 p-5" aria-label="Reading library settings">
              <header class="space-y-2">
                <p class="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Reading library</p>
                <p class="text-sm leading-6 text-zinc-400">
                  Manage this device's favorites, read-later list, reading progress, and offline articles.
                </p>
              </header>
              <app-article-library-control surface="profile"/>
              <app-offline-articles-control surface="profile"/>
            </section>

            <section class="space-y-5 border border-zinc-800 bg-zinc-900 p-5" aria-label="App and device settings">
              <header class="space-y-2">
                <p class="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">App & device</p>
                <p class="text-sm leading-6 text-zinc-400">
                  Control supported mobile features, notifications, fullscreen reading, and offline storage protection.
                </p>
              </header>
              <app-pwa-native-controls surface="profile"/>
            </section>
          </section>

          <section class="border border-zinc-800 bg-zinc-900 p-5">
            <app-communication-preferences
              [uid]="account.uid"
              [preferences]="accountDocument()?.communicationPreferences ?? null"
              [disabled]="!!userView()"
            />
          </section>

          <section class="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <section class="space-y-4 border border-zinc-800 bg-zinc-900 p-5">
              <h2 class="text-xl font-semibold text-zinc-50">Account Information</h2>
              <dl class="grid gap-4 text-sm">
                <div>
                  <dt class="text-zinc-500">Email</dt>
                  <dd class="mt-1 break-all text-zinc-200">{{ account.email || 'No email on account' }}</dd>
                </div>
                <div>
                  <dt class="text-zinc-500">Display Name</dt>
                  <dd class="mt-1 text-zinc-200">{{ account.displayName || 'Not set' }}</dd>
                </div>
                <div>
                  <dt class="text-zinc-500">Sign-in Providers</dt>
                  <dd class="mt-2 flex flex-wrap gap-2">
                    @for (provider of linkedProviderViews(); track provider.id) {
                      <span class="border border-zinc-700 px-2 py-1 text-xs text-zinc-200">{{ provider.label }}</span>
                    } @empty {
                      <span class="text-zinc-500">No provider data</span>
                    }
                  </dd>
                </div>
                <div>
                  <dt class="text-zinc-500">Provider Actions</dt>
                  <dd class="mt-2">
                    @if (userView()) {
                      <span class="border border-amber-400/40 bg-amber-950/30 px-2 py-1 text-xs text-amber-100">Unavailable during View as preview</span>
                    } @else if (hasLinkedProvider('facebook.com')) {
                      <span class="border border-emerald-400/40 bg-emerald-950/30 px-2 py-1 text-xs text-emerald-100">Facebook connected</span>
                    } @else {
                      <button
                        type="button"
                        class="border border-cyan-400 px-3 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600 disabled:hover:bg-transparent"
                        [disabled]="isLinkingFacebook()"
                        (click)="connectFacebook()"
                      >
                        {{ isLinkingFacebook() ? 'Connecting Facebook...' : 'Connect Facebook' }}
                      </button>
                    }
                  </dd>
                </div>
                <div>
                  <dt class="text-zinc-500">Comment Trust</dt>
                  <dd class="mt-1 text-zinc-200">{{ trustStatusLabel() }}</dd>
                </div>
              </dl>
            </section>

            <section class="space-y-4 border border-zinc-800 bg-zinc-900 p-5">
              <h2 class="text-xl font-semibold text-zinc-50">Roles And Permissions</h2>

              <div class="grid gap-3">
                @for (role of assignedRoleViews(); track role.id) {
                  <article class="border border-zinc-800 bg-zinc-950 p-4">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <h3 class="font-semibold text-zinc-100">{{ role.label }}</h3>
                      @if (role.id === catCornerRole) {
                        <span
                          class="inline-flex items-center gap-1.5 border border-emerald-300/40 bg-emerald-950/40 px-2 py-1 text-xs font-semibold text-emerald-100"
                          aria-label="Cat Corner Addict badge"
                        >
                          <svg aria-hidden="true" viewBox="0 0 32 32" class="h-4 w-4 fill-current">
                            <ellipse cx="16" cy="21.5" rx="7.6" ry="6.2"></ellipse>
                            <ellipse cx="7.7" cy="13.1" rx="3.1" ry="4.2" transform="rotate(-25 7.7 13.1)"></ellipse>
                            <ellipse cx="14" cy="9" rx="3.1" ry="4.3" transform="rotate(-7 14 9)"></ellipse>
                            <ellipse cx="24.3" cy="13.1" rx="3.1" ry="4.2" transform="rotate(25 24.3 13.1)"></ellipse>
                            <ellipse cx="20" cy="9" rx="3.1" ry="4.3" transform="rotate(7 20 9)"></ellipse>
                          </svg>
                          Badge
                        </span>
                      } @else {
                        <span class="border border-emerald-400/40 bg-emerald-950/30 px-2 py-1 text-xs text-emerald-100">Assigned</span>
                      }
                    </div>
                    <p class="mt-2 text-sm leading-6 text-zinc-400">{{ role.description }}</p>
                  </article>
                } @empty {
                  <p class="border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">No roles assigned yet.</p>
                }
              </div>
            </section>
          </section>

          <section class="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <section class="space-y-4 border border-zinc-800 bg-zinc-900 p-5">
              <h2 class="text-xl font-semibold text-zinc-50">Points Summary</h2>
              <dl class="grid gap-4 text-sm">
                <div>
                  <dt class="text-zinc-500">Total</dt>
                  <dd class="mt-1 text-3xl font-semibold text-cyan-100">{{ accountDocument()?.points?.total ?? 0 }}</dd>
                </div>
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <dt class="text-zinc-500">Reads</dt>
                    <dd class="mt-1 text-zinc-200">{{ accountDocument()?.points?.postReads ?? 0 }}</dd>
                  </div>
                  <div>
                    <dt class="text-zinc-500">Shares</dt>
                    <dd class="mt-1 text-zinc-200">{{ accountDocument()?.points?.shares ?? 0 }}</dd>
                  </div>
                  <div>
                    <dt class="text-zinc-500">Approved Comments</dt>
                    <dd class="mt-1 text-zinc-200">{{ accountDocument()?.points?.approvedComments ?? 0 }}</dd>
                  </div>
                  <div>
                    <dt class="text-zinc-500">Daily Discovery</dt>
                    <dd class="mt-1 text-zinc-200">{{ accountDocument()?.points?.dailyDiscoveries ?? 0 }} points</dd>
                  </div>
                  <div>
                    <dt class="text-zinc-500">Manual adjustments</dt>
                    <dd class="mt-1 text-zinc-200">{{ accountDocument()?.points?.manualAdjustments ?? 0 }} points</dd>
                  </div>
                  <div>
                    <dt class="text-zinc-500">Discovery Streak</dt>
                    <dd class="mt-1 text-zinc-200">{{ accountDocument()?.dailyDiscovery?.currentStreak ?? 0 }} days</dd>
                  </div>
                </div>
              </dl>
            </section>

            <section class="space-y-4 border border-zinc-800 bg-zinc-900 p-5">
              <h2 class="text-xl font-semibold text-zinc-50">Recent Activity</h2>
              <div class="grid gap-3">
                @for (event of pointEvents(); track event.id) {
                  <article class="grid gap-1 border border-zinc-800 bg-zinc-950 p-3 text-sm">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="font-medium text-zinc-100">{{ pointEventLabel(event) }}</p>
                      <span [class.text-cyan-100]="event.points >= 0" [class.text-rose-200]="event.points < 0">{{ event.points > 0 ? '+' : '' }}{{ event.points }}</span>
                    </div>
                    <p class="text-xs text-zinc-500">{{ event.createdAt }}</p>
                  </article>
                } @empty {
                  <p class="text-sm text-zinc-500">No point activity yet.</p>
                }
              </div>
            </section>
          </section>
            </div>
          </div>
        } @else {
          <section class="space-y-5 border border-amber-500/40 bg-amber-950/20 p-6">
            <p class="text-sm uppercase tracking-[0.3em] text-amber-200">Signed Out</p>
            <h1 class="text-3xl font-semibold text-zinc-50">No active user session</h1>
            <p class="text-zinc-300">Sign in to view profile and role information.</p>
            <a
              [routerLink]="['/', pathNames.OS_LOGIN]"
              [queryParams]="{redirectUrl: '/' + pathNames.PROFILE}"
              class="inline-flex border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950"
            >
              Login
            </a>
          </section>
        }
      </div>
    </main>
  `,
})
export class UserProfileComponent {
  private readonly authService = inject(AuthService);
  private readonly userAccountService = inject(UserAccountService);

  protected readonly pathNames = PATH_NAMES;
  protected readonly catCornerRole = CAT_CORNER_ADDICT_ROLE;
  protected readonly isLinkingFacebook = signal(false);
  protected readonly linkStatusMessage = signal<string | null>(null);
  protected readonly linkErrorMessage = signal<string | null>(null);
  private readonly linkedProviderIdsOverride = signal<readonly string[] | null>(null);
  private readonly profile$ = this.authService.getCurrentUserProfile(true).pipe(
      tap(profile => this.debugProfile('profile resolved', {
        signedIn: !!profile,
        profile: profile ? this.createProfileDebugSummary(profile) : null,
      })),
    shareReplay({bufferSize: 1, refCount: true})
  );
  protected readonly profile = toSignal(
    this.profile$,
    {initialValue: null}
  );
  protected readonly userView = toSignal(this.authService.userView$, {initialValue: null});
  protected readonly displayName = computed(() => {
    const profile = this.profile();
    return profile ? getDisplayName(profile) : 'User';
  });
  protected readonly initials = computed(() => this.displayName()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'U');
  protected readonly canEnterAdmin = computed(() => {
    const roles = this.profile()?.roles ?? [];
    return ADMIN_CONSOLE_ROLES.some(role => roles.includes(role));
  });
  protected readonly accountDocument = toSignal(
    this.profile$.pipe(
      switchMap(profile => profile ? this.userAccountService.listenToUserAccount(profile.uid) : of(null)),
      catchError(error => {
        this.debugProfile('account document listener failed', this.createErrorDebugSummary(error));
        return of(null);
      })
    ),
    {initialValue: null}
  );
  protected readonly pointEvents = toSignal(
    this.profile$.pipe(
      switchMap(profile => profile ? this.userAccountService.listenToPointEvents(profile.uid) : of([])),
      catchError(error => {
        this.debugProfile('point events listener failed', this.createErrorDebugSummary(error));
        return of([]);
      })
    ),
    {initialValue: []}
  );
  protected readonly trustStatusLabel = computed(() => {
    const status = this.accountDocument()?.commentTrustStatus ?? 'new';

    switch (status) {
      case 'trusted':
        return 'Trusted commenter';
      case 'blocked':
        return 'Commenting blocked';
      default:
        return 'First comment requires review';
    }
  });
  protected readonly linkedProviderIds = computed(() => {
    const providers = new Set<string>();
    const profileProviderIds = this.profile()?.providerIds ?? [];
    const accountProviderIds = this.accountDocument()?.providerIds ?? [];
    const overrideProviderIds = this.linkedProviderIdsOverride();

    for (const providerId of [...profileProviderIds, ...accountProviderIds, ...(overrideProviderIds ?? [])]) {
      if (providerId) {
        providers.add(providerId);
      }
    }

    return [...providers].sort((left, right) => {
      const orderDifference = this.getProviderSortOrder(left) - this.getProviderSortOrder(right);

      return orderDifference || getAuthProviderLabel(left).localeCompare(getAuthProviderLabel(right));
    });
  });
  protected readonly linkedProviderViews = computed<LinkedProviderView[]>(() => this.linkedProviderIds().map(providerId => ({
    id: providerId,
    label: getAuthProviderLabel(providerId),
  })));

  protected readonly assignedRoleIds = computed(() => {
    const roles = new Set<string>([BASE_USER_ROLE]);
    const accountRoles = this.accountDocument()?.roles ?? [];
    const profileRoles = this.profile()?.roles ?? [];

    for (const role of [...accountRoles, ...profileRoles]) {
      if (role) {
        roles.add(role);
      }
    }

    return [...roles].sort((a, b) => {
      if (a === BASE_USER_ROLE) {
        return -1;
      }

      if (b === BASE_USER_ROLE) {
        return 1;
      }

      return a.localeCompare(b);
    });
  });
  protected readonly assignedRoleViews = computed<AssignedRoleView[]>(() => {
    const roleDefinitions = new Map<string, AssignedRoleView>(USER_ROLE_DEFINITIONS.map(role => [role.id, role]));

    return this.assignedRoleIds().map(role => {
      const definition = roleDefinitions.get(role);

      return {
        id: role,
        label: definition?.label ?? this.formatCustomRole(role),
        description: definition?.description ?? 'Custom account role assigned by an administrator.',
      };
    });
  });

  protected pointEventLabel(event: UserPointEvent): string {
    switch (event.type) {
      case 'post_read':
        return `Read ${event.postSlug ? `/blog/${event.postSlug}` : 'a post'}`;
      case 'post_share':
        return `Shared ${event.postSlug ? `/blog/${event.postSlug}` : 'a post'}${event.provider ? ` via ${event.provider}` : ''}`;
      case 'site_share':
        return `Shared ColinMichaels.com${event.provider ? ` via ${event.provider}` : ''}`;
      case 'comment_approved':
        return `Approved comment${event.postSlug ? ` on /blog/${event.postSlug}` : ''}`;
      case 'daily_discovery':
        return `Solved Daily Discovery${event.challengeDate ? ` for ${event.challengeDate}` : ''}`;
      case 'admin_adjustment':
        return `Points adjustment${event.reason ? `: ${event.reason}` : ''}`;
      default:
        return 'Point activity';
    }
  }

  protected hasLinkedProvider(providerId: string): boolean {
    return this.linkedProviderIds().includes(providerId);
  }

  protected async connectFacebook(): Promise<void> {
    if (this.isLinkingFacebook() || this.userView()) {
      return;
    }

    this.isLinkingFacebook.set(true);
    this.linkStatusMessage.set(null);
    this.linkErrorMessage.set(null);

    try {
      const result = await firstValueFrom(this.authService.linkFacebookProvider());
      this.linkedProviderIdsOverride.set(result.user.providerData.map(provider => provider.providerId));
      this.linkStatusMessage.set('Facebook is now connected to this profile.');
      this.debugProfile('facebook provider linked', {
        providerIds: result.user.providerData.map(provider => provider.providerId),
      });
    } catch (error) {
      this.linkErrorMessage.set(this.getAccountLinkErrorMessage(error));
      this.debugProfile('facebook provider link failed', {
        error: this.createErrorDebugSummary(error),
        displayedMessage: this.linkErrorMessage(),
      });
    } finally {
      this.isLinkingFacebook.set(false);
    }
  }

  private createProfileDebugSummary(profile: UserAccountProfile): Record<string, unknown> {
    return {
      uid: profile.uid,
      email: profile.email,
      displayName: profile.displayName,
      emailVerified: profile.emailVerified,
      isAnonymous: profile.isAnonymous,
      providerIds: profile.providerIds,
      roles: profile.roles,
      claimKeys: Object.keys(profile.claims).sort((a, b) => a.localeCompare(b)),
      canEnterAdmin: ADMIN_CONSOLE_ROLES.some(role => profile.roles.includes(role)),
    };
  }

  private debugProfile(event: string, details?: unknown): void {
    writeAuthDebug('ProfileDebug', event, details);
  }

  private getAccountLinkErrorMessage(error: unknown): string {
    switch (this.getErrorCode(error)) {
      case 'auth/provider-already-linked':
        return 'Facebook is already connected to this profile.';
      case 'auth/credential-already-in-use':
        return 'That Facebook login is already connected to another account.';
      case 'auth/account-exists-with-different-credential':
        return 'That Facebook login belongs to another account. Sign in with that account first.';
      case 'auth/popup-blocked':
        return 'The Facebook connection popup was blocked. Allow popups, then try again.';
      case 'auth/popup-closed-by-user':
        return 'Facebook connection was canceled before it finished.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized for Firebase sign-in.';
      default:
        return 'Unable to connect Facebook right now.';
    }
  }

  private getErrorCode(error: unknown): string {
    return isRecord(error) && typeof error['code'] === 'string' ? error['code'] : '';
  }

  private createErrorDebugSummary(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        code: this.getErrorCode(error),
      };
    }

    return {
      message: String(error),
    };
  }

  private getProviderSortOrder(providerId: string): number {
    switch (providerId) {
      case 'password':
        return 0;
      case 'google.com':
        return 1;
      case 'facebook.com':
        return 2;
      default:
        return 10;
    }
  }

  private formatCustomRole(role: string): string {
    return role
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim()
      .replace(/\b\w/g, character => character.toUpperCase()) || role;
  }
}
