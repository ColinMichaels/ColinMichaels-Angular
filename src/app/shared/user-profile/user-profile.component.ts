import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';
import {tap} from 'rxjs';

import {PATH_NAMES} from '../../app-route-paths';
import {AuthService} from '../../services/auth.service';
import {
  ADMIN_CONSOLE_ROLES,
  UserAccountProfile,
  USER_ROLE_DEFINITIONS,
} from '../user-account/user-account.model';
import {writeAuthDebug} from '../debug/auth-debug';

function getDisplayName(profile: UserAccountProfile): string {
  return profile.displayName || profile.email || profile.uid;
}

@Component({
  selector: 'app-user-profile',
  imports: [
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-5xl space-y-8">
        <nav class="flex items-center justify-between text-sm text-zinc-400">
          <a routerLink="/" class="hover:text-zinc-100">Home</a>
          <a routerLink="/logout" class="hover:text-rose-200">Sign Out</a>
        </nav>

        @if (profile(); as account) {
          <header class="grid gap-5 border-b border-zinc-800 pb-8 sm:grid-cols-[auto_1fr] sm:items-center">
            <div class="grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-900 text-2xl font-semibold text-cyan-100">
              @if (account.photoURL) {
                <img [src]="account.photoURL" [alt]="displayName() + ' avatar'" class="h-full w-full object-cover" loading="lazy">
              } @else {
                {{ initials() }}
              }
            </div>
            <div class="min-w-0 space-y-2">
              <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">Profile</p>
              <h1 class="break-words text-4xl font-semibold text-zinc-50">{{ displayName() }}</h1>
              <p class="break-all text-zinc-400">{{ account.email || account.uid }}</p>
            </div>
          </header>

          <section class="grid gap-4 md:grid-cols-3">
            <div class="border border-zinc-800 bg-zinc-900 p-4">
              <p class="text-sm text-zinc-500">Account</p>
              <p class="mt-2 text-lg font-semibold">{{ account.emailVerified ? 'Verified' : 'Unverified' }}</p>
            </div>
            <div class="border border-zinc-800 bg-zinc-900 p-4">
              <p class="text-sm text-zinc-500">Providers</p>
              <p class="mt-2 text-lg font-semibold">{{ account.providerIds.length || 0 }}</p>
            </div>
            <div class="border border-zinc-800 bg-zinc-900 p-4">
              <p class="text-sm text-zinc-500">Roles</p>
              <p class="mt-2 text-lg font-semibold">{{ account.roles.length || 0 }}</p>
            </div>
          </section>

          <section class="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <section class="space-y-4 border border-zinc-800 bg-zinc-900 p-5">
              <h2 class="text-xl font-semibold text-zinc-50">Account Information</h2>
              <dl class="grid gap-4 text-sm">
                <div>
                  <dt class="text-zinc-500">UID</dt>
                  <dd class="mt-1 break-all text-zinc-200">{{ account.uid }}</dd>
                </div>
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
                    @for (provider of account.providerIds; track provider) {
                      <span class="border border-zinc-700 px-2 py-1 text-xs text-zinc-200">{{ provider }}</span>
                    } @empty {
                      <span class="text-zinc-500">No provider data</span>
                    }
                  </dd>
                </div>
              </dl>
            </section>

            <section class="space-y-4 border border-zinc-800 bg-zinc-900 p-5">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 class="text-xl font-semibold text-zinc-50">Roles And Permissions</h2>
                @if (canEnterAdmin()) {
                  <a routerLink="/admin" class="border border-cyan-400 px-3 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950">
                    Open Admin
                  </a>
                }
              </div>

              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-zinc-800 text-left text-sm">
                  <thead class="text-xs uppercase tracking-[0.18em] text-zinc-500">
                    <tr>
                      <th scope="col" class="py-3 pr-4 font-medium">Role</th>
                      <th scope="col" class="py-3 pr-4 font-medium">Status</th>
                      <th scope="col" class="py-3 font-medium">Capability</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-zinc-800">
                    @for (role of roleDefinitions; track role.id) {
                      <tr>
                        <td class="py-3 pr-4 font-medium text-zinc-100">{{ role.label }}</td>
                        <td class="py-3 pr-4">
                          @if (hasRole(role.id)) {
                            <span class="border border-emerald-400/40 bg-emerald-950/30 px-2 py-1 text-xs text-emerald-100">Assigned</span>
                          } @else {
                            <span class="text-zinc-600">Not assigned</span>
                          }
                        </td>
                        <td class="py-3 text-zinc-400">{{ role.description }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              @if (customRoles().length > 0) {
                <div class="border-t border-zinc-800 pt-4">
                  <p class="text-sm font-medium text-zinc-300">Additional role claims</p>
                  <div class="mt-3 flex flex-wrap gap-2">
                    @for (role of customRoles(); track role) {
                      <span class="border border-zinc-700 px-2 py-1 text-xs text-zinc-200">{{ role }}</span>
                    }
                  </div>
                </div>
              }
            </section>
          </section>
        } @else {
          <section class="space-y-5 border border-amber-500/40 bg-amber-950/20 p-6">
            <p class="text-sm uppercase tracking-[0.3em] text-amber-200">Signed Out</p>
            <h1 class="text-3xl font-semibold text-zinc-50">No active user session</h1>
            <p class="text-zinc-300">Sign in to view profile and role information.</p>
            <a routerLink="/login" class="inline-flex border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950">
              Login
            </a>
          </section>
        }
      </section>
    </main>
  `,
})
export class UserProfileComponent {
  private readonly authService = inject(AuthService);

  protected readonly pathNames = PATH_NAMES;
  protected readonly roleDefinitions = USER_ROLE_DEFINITIONS;
  protected readonly profile = toSignal(
    this.authService.getCurrentUserProfile(true).pipe(
      tap(profile => this.debugProfile('profile resolved', {
        signedIn: !!profile,
        profile: profile ? this.createProfileDebugSummary(profile) : null,
      }))
    ),
    {initialValue: null}
  );
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
  protected readonly customRoles = computed(() => {
    const knownRoles = new Set<string>(this.roleDefinitions.map(role => role.id));
    return (this.profile()?.roles ?? []).filter(role => !knownRoles.has(role));
  });

  protected hasRole(role: string): boolean {
    return this.profile()?.roles.includes(role) === true;
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
}
