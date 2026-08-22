import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {Router} from '@angular/router';

import {AuthService} from '../../services/auth.service';
import {AdjustAdminUserPointsResponse, AdminManagedUser} from './models/user-management.models';
import {UserManagementService} from './services/user-management.service';
import {CAT_CORNER_ADDICT_ROLE} from '../../shared/user-account/user-account.model';
import {AdminAlertComponent} from '../shared/admin-alert.component';
import {AdminEmptyStateComponent} from '../shared/admin-empty-state.component';
import {AdminPageHeaderComponent} from '../shared/admin-page-header.component';
import {AdminSearchFieldComponent} from '../shared/admin-search-field.component';
import {AdminStatCardComponent} from '../shared/admin-stat-card.component';
import {DialogFocusDirective} from '../shared/dialog-focus.directive';
import {UserPointsEditorComponent} from './components/user-points-editor.component';

const suggestedRoles = [
  'admin',
  'cmsAdmin',
  'contentEditor',
  'mediaManager',
  'viewer',
  'trustedCommenter',
  CAT_CORNER_ADDICT_ROLE,
] as const;
const roleNamePattern = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const pointNumberFormatter = new Intl.NumberFormat('en-US');
type UserAccessAction = 'disable' | 'enable' | 'delete';
type UserManagementView = 'users' | 'points';
type UserSortDirection = 'asc' | 'desc';
type UserSortKey =
  | 'user'
  | 'total'
  | 'postReads'
  | 'shares'
  | 'approvedComments'
  | 'dailyDiscoveries'
  | 'manualAdjustments';

const userSortLabels: Record<UserSortKey, string> = {
  user: 'User name',
  total: 'Total points',
  postReads: 'Reading points',
  shares: 'Share points',
  approvedComments: 'Comment points',
  dailyDiscoveries: 'Daily Discovery points',
  manualAdjustments: 'Manual adjustments',
};

interface PendingUserAccessAction {
  action: UserAccessAction;
  user: AdminManagedUser;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function formatAccountDate(value: string | null): string {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function getUserLabel(user: AdminManagedUser): string {
  return user.displayName || user.email || user.uid;
}

@Component({
  selector: 'app-user-management-page',
  imports: [
    AdminAlertComponent,
    AdminEmptyStateComponent,
    AdminPageHeaderComponent,
    AdminSearchFieldComponent,
    AdminStatCardComponent,
    DialogFocusDirective,
    UserPointsEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-6xl space-y-8">
        <app-admin-page-header
          eyebrow="Admin"
          title="User Management"
          description="Review Firebase Auth accounts, disable suspicious sign-ins, remove Auth records, test the application with another user's role view, and manage custom claim roles from a protected admin-only tool."
        >
          <button
            adminPageHeaderActions
            type="button"
            class="inline-flex justify-center border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
            [disabled]="isActiveViewLoading()"
            (click)="refreshActiveView()"
          >
            Refresh
          </button>
        </app-admin-page-header>

        <div class="grid gap-2 border border-zinc-800 bg-zinc-900 p-2 sm:grid-cols-2" role="tablist" aria-label="User management views">
          <button
            id="user-management-tab"
            type="button"
            role="tab"
            class="border px-4 py-3 text-left text-sm font-semibold transition-colors"
            [class.border-cyan-400]="activeView() === 'users'"
            [class.bg-cyan-400]="activeView() === 'users'"
            [class.text-zinc-950]="activeView() === 'users'"
            [class.border-transparent]="activeView() !== 'users'"
            [class.text-zinc-300]="activeView() !== 'users'"
            [attr.aria-selected]="activeView() === 'users'"
            [attr.tabindex]="activeView() === 'users' ? 0 : -1"
            aria-controls="user-management-panel"
            (click)="showView('users')"
            (keydown)="handleTabKeydown($event)"
          >
            <span class="block">User management</span>
            <span class="mt-1 block text-xs font-normal opacity-75">Accounts, roles, access, and deletion</span>
          </button>
          <button
            id="user-points-tab"
            type="button"
            role="tab"
            class="border px-4 py-3 text-left text-sm font-semibold transition-colors"
            [class.border-violet-400]="activeView() === 'points'"
            [class.bg-violet-400]="activeView() === 'points'"
            [class.text-zinc-950]="activeView() === 'points'"
            [class.border-transparent]="activeView() !== 'points'"
            [class.text-zinc-300]="activeView() !== 'points'"
            [attr.aria-selected]="activeView() === 'points'"
            [attr.tabindex]="activeView() === 'points' ? 0 : -1"
            aria-controls="user-points-panel"
            (click)="showView('points')"
            (keydown)="handleTabKeydown($event)"
          >
            <span class="block">Points leaderboard</span>
            <span class="mt-1 block text-xs font-normal opacity-75">Balances, ranking, and adjustments</span>
          </button>
        </div>

        @if (activeView() === 'users') {
          <section id="user-management-panel" class="space-y-8" role="tabpanel" aria-labelledby="user-management-tab">
            <section class="grid gap-4 sm:grid-cols-3">
              <app-admin-stat-card label="Loaded Users" [value]="users().length" />
              <app-admin-stat-card label="Admins" [value]="adminCount()" />
              <app-admin-stat-card label="Disabled" [value]="disabledCount()" />
            </section>

            <section class="grid gap-4 border border-zinc-800 bg-zinc-900 p-4 md:grid-cols-[1fr_auto] md:items-end">
              <app-admin-search-field
                label="Search users"
                placeholder="Email, display name, uid, or role"
                [value]="searchTerm()"
                (valueChange)="searchTerm.set($event)"
              />
              <div class="flex flex-wrap gap-3">
                <button
                  type="button"
                  class="border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
                  [disabled]="pageTokenStack().length === 0 || isLoading()"
                  (click)="loadPreviousPage()"
                >
                  Previous
                </button>
                <button
                  type="button"
                  class="border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600 disabled:hover:bg-transparent"
                  [disabled]="!nextPageToken() || isLoading()"
                  (click)="loadNextPage()"
                >
                  Next
                </button>
              </div>
            </section>
          </section>
        } @else {
          <section id="user-points-panel" class="space-y-8" role="tabpanel" aria-labelledby="user-points-tab">
            <section class="grid gap-4 sm:grid-cols-2">
              <app-admin-stat-card label="Leaderboard Users" [value]="leaderboardUsers().length" />
              <app-admin-stat-card label="Current Points" [value]="formatPoints(totalPoints())" />
            </section>

            <section class="border border-zinc-800 bg-zinc-900 p-4">
              <app-admin-search-field
                label="Search points leaderboard"
                placeholder="Email, display name, uid, or role"
                [value]="pointsSearchTerm()"
                (valueChange)="pointsSearchTerm.set($event)"
              />
            </section>
          </section>
        }

        @if (statusMessage()) {
          <p class="border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100" role="status" aria-live="polite">{{ statusMessage() }}</p>
        }

        @if (errorMessage() && !pendingAccessAction()) {
          <app-admin-alert [message]="errorMessage()!" />
        }

        @if (activeView() === 'users') {
          <section class="overflow-hidden border border-zinc-800" aria-label="Firebase Auth users">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-zinc-800 text-left text-sm">
                <caption class="sr-only">Firebase Auth users with roles, account status, last sign-in, and management actions.</caption>
                <thead class="bg-zinc-900 text-xs uppercase tracking-[0.18em] text-zinc-500">
                  <tr>
                    <th scope="col" class="px-4 py-3 font-medium">User</th>
                    <th scope="col" class="px-4 py-3 font-medium">Roles</th>
                    <th scope="col" class="px-4 py-3 font-medium">Status</th>
                    <th scope="col" class="px-4 py-3 font-medium">Last Sign-In</th>
                    <th scope="col" class="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800 bg-zinc-950">
                  @if (isLoading()) {
                    <tr>
                      <td colspan="5" class="px-4 py-10 text-center text-zinc-400">Loading users...</td>
                    </tr>
                  } @else {
                    @for (user of filteredUsers(); track user.uid) {
                      <tr class="align-top">
                        <td class="px-4 py-4">
                          <div class="font-medium text-zinc-100">{{ user.displayName || user.email || user.uid }}</div>
                          <div class="mt-1 text-xs text-zinc-500">{{ user.email || 'No email' }}</div>
                          <div class="mt-1 max-w-72 break-all text-xs text-zinc-600">{{ user.uid }}</div>
                        </td>
                        <td class="px-4 py-4">
                          <div class="flex max-w-sm flex-wrap gap-2">
                            @if (user.roles.length > 0) {
                              @for (role of user.roles; track role) {
                                <span class="border border-cyan-400/30 bg-cyan-950/30 px-2 py-1 text-xs text-cyan-100">{{ role }}</span>
                              }
                            } @else {
                              <span class="text-zinc-500">No roles</span>
                            }
                          </div>
                        </td>
                        <td class="px-4 py-4">
                          <div class="grid gap-2 text-xs">
                            <span [class.text-red-200]="user.disabled" [class.text-emerald-200]="!user.disabled">
                              {{ user.disabled ? 'Disabled' : 'Active' }}
                            </span>
                            <span [class.text-zinc-500]="!user.emailVerified" [class.text-emerald-200]="user.emailVerified">
                              {{ user.emailVerified ? 'Email verified' : 'Email unverified' }}
                            </span>
                          </div>
                        </td>
                        <td class="px-4 py-4 text-zinc-300">{{ formatDate(user.lastSignInAt) }}</td>
                        <td class="px-4 py-4">
                          <div class="flex min-w-40 flex-col gap-2">
                            <button
                              type="button"
                              class="border border-amber-400/70 px-3 py-2 text-sm font-medium text-amber-100 hover:bg-amber-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600 disabled:hover:bg-transparent"
                              [disabled]="user.uid === currentUser()?.uid || isStartingUserView()"
                              [attr.title]="user.uid === currentUser()?.uid ? 'You are already signed in as this user' : null"
                              (click)="openUserViewConfirmation(user, $event)"
                            >
                              View as User
                            </button>
                            <button
                              type="button"
                              class="border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
                              (click)="openEditor(user, $event)"
                            >
                              Manage Roles
                            </button>
                            <button
                              type="button"
                              class="border border-orange-400/70 px-3 py-2 text-sm font-medium text-orange-100 hover:bg-orange-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600 disabled:hover:bg-transparent"
                              [disabled]="user.uid === currentUser()?.uid || isMutatingAccess()"
                              [attr.title]="user.uid === currentUser()?.uid ? 'You cannot change sign-in access for your own admin account' : null"
                              (click)="openAccessConfirmation(user, user.disabled ? 'enable' : 'disable', $event)"
                            >
                              {{ user.disabled ? 'Restore Sign-In' : 'Disable Sign-In' }}
                            </button>
                            <button
                              type="button"
                              class="border border-red-500/70 px-3 py-2 text-sm font-medium text-red-100 hover:bg-red-500 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600 disabled:hover:bg-transparent"
                              [disabled]="user.uid === currentUser()?.uid || isMutatingAccess()"
                              [attr.title]="user.uid === currentUser()?.uid ? 'You cannot delete your own admin account' : null"
                              (click)="openAccessConfirmation(user, 'delete', $event)"
                            >
                              Delete Auth User
                            </button>
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="5" class="px-4 py-6">
                          <app-admin-empty-state message="No users match this search." />
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          </section>
        } @else {
          <section class="overflow-hidden border border-zinc-800" aria-labelledby="points-leaderboard-title">
          <header class="border-b border-zinc-800 bg-zinc-900 px-4 py-4 sm:flex sm:items-end sm:justify-between sm:gap-6">
            <div>
              <h2 id="points-leaderboard-title" class="text-xl font-semibold text-zinc-50">Points leaderboard</h2>
              <p class="mt-1 max-w-3xl text-sm leading-6 text-zinc-400">Current balances from reading posts, shares, approved comments, Daily Discovery, and audited manual adjustments. Rank follows the active sort.</p>
              <p class="mt-2 text-xs text-zinc-500 sm:hidden">Swipe the table horizontally to compare every point source and reach point controls.</p>
            </div>
            <p class="mt-3 shrink-0 text-xs uppercase tracking-[0.18em] text-zinc-500 sm:mt-0" aria-live="polite">
              {{ sortSummary() }}
            </p>
          </header>
          <div class="overflow-x-auto">
            <table class="min-w-[960px] divide-y divide-zinc-800 text-left text-sm">
              <caption class="sr-only">Sortable leaderboard of Firebase Auth users and their current reader point balances.</caption>
              <thead class="bg-zinc-900 text-xs uppercase tracking-[0.18em] text-zinc-500">
                <tr>
                  <th scope="col" class="w-16 px-4 py-3 font-medium">Rank</th>
                  <th scope="col" class="min-w-60 px-4 py-3 font-medium" [attr.aria-sort]="sortAria('user')">
                    <button type="button" class="inline-flex items-center gap-2 hover:text-zinc-200" (click)="sortUsersBy('user')">
                      User
                      @if (isSortedBy('user')) {
                        <svg class="h-3.5 w-3.5 transition-transform" [class.rotate-180]="sortDirection() === 'asc'" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      }
                    </button>
                  </th>
                  <th scope="col" class="px-4 py-3 text-right font-medium" [attr.aria-sort]="sortAria('total')">
                    <button type="button" class="ml-auto inline-flex items-center gap-2 hover:text-zinc-200" (click)="sortUsersBy('total')">
                      Total
                      @if (isSortedBy('total')) {
                        <svg class="h-3.5 w-3.5 transition-transform" [class.rotate-180]="sortDirection() === 'asc'" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      }
                    </button>
                  </th>
                  <th scope="col" class="px-4 py-3 text-right font-medium" [attr.aria-sort]="sortAria('postReads')">
                    <button type="button" class="ml-auto inline-flex items-center gap-2 hover:text-zinc-200" (click)="sortUsersBy('postReads')">
                      Reading
                      @if (isSortedBy('postReads')) {
                        <svg class="h-3.5 w-3.5 transition-transform" [class.rotate-180]="sortDirection() === 'asc'" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      }
                    </button>
                  </th>
                  <th scope="col" class="px-4 py-3 text-right font-medium" [attr.aria-sort]="sortAria('shares')">
                    <button type="button" class="ml-auto inline-flex items-center gap-2 hover:text-zinc-200" (click)="sortUsersBy('shares')">
                      Shares
                      @if (isSortedBy('shares')) {
                        <svg class="h-3.5 w-3.5 transition-transform" [class.rotate-180]="sortDirection() === 'asc'" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      }
                    </button>
                  </th>
                  <th scope="col" class="px-4 py-3 text-right font-medium" [attr.aria-sort]="sortAria('approvedComments')">
                    <button type="button" class="ml-auto inline-flex items-center gap-2 hover:text-zinc-200" (click)="sortUsersBy('approvedComments')">
                      Comments
                      @if (isSortedBy('approvedComments')) {
                        <svg class="h-3.5 w-3.5 transition-transform" [class.rotate-180]="sortDirection() === 'asc'" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      }
                    </button>
                  </th>
                  <th scope="col" class="px-4 py-3 text-right font-medium" [attr.aria-sort]="sortAria('dailyDiscoveries')">
                    <button type="button" class="ml-auto inline-flex items-center gap-2 hover:text-zinc-200" (click)="sortUsersBy('dailyDiscoveries')">
                      Daily
                      @if (isSortedBy('dailyDiscoveries')) {
                        <svg class="h-3.5 w-3.5 transition-transform" [class.rotate-180]="sortDirection() === 'asc'" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      }
                    </button>
                  </th>
                  <th scope="col" class="px-4 py-3 text-right font-medium" [attr.aria-sort]="sortAria('manualAdjustments')">
                    <button type="button" class="ml-auto inline-flex items-center gap-2 hover:text-zinc-200" (click)="sortUsersBy('manualAdjustments')">
                      Manual
                      @if (isSortedBy('manualAdjustments')) {
                        <svg class="h-3.5 w-3.5 transition-transform" [class.rotate-180]="sortDirection() === 'asc'" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      }
                    </button>
                  </th>
                  <th scope="col" class="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-800 bg-zinc-950">
                @if (isPointsLoading()) {
                  <tr>
                    <td colspan="9" class="px-4 py-10 text-center text-zinc-400">Loading the full leaderboard...</td>
                  </tr>
                } @else {
                  @for (user of rankedUsers(); track user.uid; let rank = $index) {
                    <tr class="align-top">
                      <td class="px-4 py-4 text-lg font-semibold text-zinc-500" [class.text-cyan-300]="rank === 0">#{{ rank + 1 }}</td>
                      <td class="px-4 py-4">
                        <div class="font-medium text-zinc-100">{{ user.displayName || user.email || user.uid }}</div>
                        <div class="mt-1 text-xs text-zinc-500">{{ user.email || 'No email' }}</div>
                        <div class="mt-1 max-w-72 break-all text-xs text-zinc-600">{{ user.uid }}</div>
                        <div class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span [class.text-red-200]="user.disabled" [class.text-emerald-200]="!user.disabled">
                            {{ user.disabled ? 'Disabled' : 'Active' }}
                          </span>
                          <span class="text-zinc-700" aria-hidden="true">/</span>
                          <span [class.text-zinc-500]="!user.emailVerified" [class.text-emerald-200]="user.emailVerified">
                            {{ user.emailVerified ? 'Email verified' : 'Email unverified' }}
                          </span>
                          <span class="text-zinc-700" aria-hidden="true">/</span>
                          <span class="text-zinc-500">Last sign-in {{ formatDate(user.lastSignInAt) }}</span>
                        </div>
                        <div class="mt-2 flex max-w-sm flex-wrap gap-1.5">
                          @if (user.roles.length > 0) {
                            @for (role of user.roles; track role) {
                              <span class="border border-cyan-400/30 bg-cyan-950/30 px-2 py-1 text-xs text-cyan-100">{{ role }}</span>
                            }
                          } @else {
                            <span class="text-xs text-zinc-600">No roles</span>
                          }
                        </div>
                      </td>
                      <td class="px-4 py-4 text-right text-xl font-semibold text-violet-100">{{ formatPoints(user.points.total) }}</td>
                      <td class="px-4 py-4 text-right text-zinc-300">{{ formatPoints(user.points.postReads) }}</td>
                      <td class="px-4 py-4 text-right text-zinc-300">{{ formatPoints(user.points.shares) }}</td>
                      <td class="px-4 py-4 text-right text-zinc-300">{{ formatPoints(user.points.approvedComments) }}</td>
                      <td class="px-4 py-4 text-right text-zinc-300">{{ formatPoints(user.points.dailyDiscoveries) }}</td>
                      <td class="px-4 py-4 text-right" [class.text-rose-200]="user.points.manualAdjustments < 0" [class.text-zinc-300]="user.points.manualAdjustments >= 0">
                        {{ user.points.manualAdjustments > 0 ? '+' : '' }}{{ formatPoints(user.points.manualAdjustments) }}
                      </td>
                      <td class="px-4 py-4">
                        <div class="min-w-32">
                          <button
                            type="button"
                            class="w-full border border-violet-400/70 px-3 py-2 text-sm font-medium text-violet-100 hover:bg-violet-400 hover:text-zinc-950"
                            (click)="openPointsEditor(user, $event)"
                          >
                            Manage Points
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="9" class="px-4 py-6">
                        <app-admin-empty-state message="No users match this search." />
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
          </section>
        }

        @if (selectedUser(); as user) {
          <section
            class="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-role-editor-title"
            [appDialogFocus]="dialogLaunchControl()"
            (appDialogEscape)="closeEditor()"
          >
            <div class="w-full max-w-2xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl shadow-black">
              <header class="flex items-start justify-between gap-4 border-b border-zinc-800 pb-4">
                <div class="min-w-0">
                  <p class="text-sm uppercase tracking-[0.24em] text-cyan-300">Roles</p>
                  <h2 id="user-role-editor-title" class="mt-2 truncate text-2xl font-semibold text-zinc-50" tabindex="-1" data-dialog-initial-focus>{{ user.displayName || user.email || user.uid }}</h2>
                  <p class="mt-1 break-all text-xs text-zinc-500">{{ user.uid }}</p>
                </div>
                <button
                  type="button"
                  class="border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:cursor-wait disabled:text-zinc-600 disabled:hover:bg-transparent"
                  [disabled]="isSaving()"
                  (click)="closeEditor()"
                >
                  Close
                </button>
              </header>

              <div class="space-y-5 py-5">
                <section class="space-y-3">
                  <p class="text-sm font-medium text-zinc-300">Suggested roles</p>
                  <div class="flex flex-wrap gap-2">
                    @for (role of suggestedRoles; track role) {
                      <button
                        type="button"
                        class="border px-3 py-2 text-sm font-medium"
                        [class.border-cyan-300]="hasDraftRole(role)"
                        [class.bg-cyan-400]="hasDraftRole(role)"
                        [class.text-zinc-950]="hasDraftRole(role)"
                        [class.border-zinc-700]="!hasDraftRole(role)"
                        [class.text-zinc-200]="!hasDraftRole(role)"
                        [attr.aria-pressed]="hasDraftRole(role)"
                        [disabled]="isSaving()"
                        (click)="toggleDraftRole(role)"
                      >
                        {{ role }}
                      </button>
                    }
                  </div>
                </section>

                <section class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <label class="grid gap-2 text-sm text-zinc-300">
                    Add custom role
                    <input
                      type="text"
                      class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                      placeholder="roleName"
                      [value]="newRoleName()"
                      [disabled]="isSaving()"
                      (input)="updateNewRole($event)"
                      (keydown.enter)="addCustomRole()"
                    >
                  </label>
                  <button
                    type="button"
                    class="border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-wait disabled:text-zinc-600 disabled:hover:bg-transparent"
                    [disabled]="isSaving()"
                    (click)="addCustomRole()"
                  >
                    Add Role
                  </button>
                </section>

                @if (roleInputError()) {
                  <p class="text-sm text-red-200">{{ roleInputError() }}</p>
                }

                <section class="space-y-3">
                  <p class="text-sm font-medium text-zinc-300">Assigned roles</p>
                  <div class="flex min-h-12 flex-wrap gap-2 border border-zinc-800 bg-zinc-900 p-3">
                    @for (role of draftRoles(); track role) {
                      <button
                        type="button"
                        class="border border-cyan-400/40 bg-cyan-950/40 px-3 py-2 text-sm text-cyan-100 hover:border-red-300 hover:text-red-100"
                        [attr.aria-label]="'Remove role ' + role"
                        [disabled]="isSaving()"
                        (click)="removeDraftRole(role)"
                      >
                        {{ role }} <span aria-hidden="true">×</span>
                      </button>
                    } @empty {
                      <span class="text-sm text-zinc-500">No roles assigned.</span>
                    }
                  </div>
                </section>
              </div>

              <footer class="flex flex-wrap justify-end gap-3 border-t border-zinc-800 pt-4">
                <button
                  type="button"
                  class="border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-wait disabled:text-zinc-600 disabled:hover:bg-transparent"
                  [disabled]="isSaving()"
                  (click)="closeEditor()"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600 disabled:hover:bg-transparent"
                  [disabled]="isSaving() || !hasRoleChanges()"
                  (click)="saveRoles(user)"
                >
                  {{ isSaving() ? 'Saving...' : 'Save Roles' }}
                </button>
              </footer>
            </div>
          </section>
        }

        @if (selectedPointsUser(); as user) {
          <app-user-points-editor
            [user]="user"
            [returnFocusTo]="dialogLaunchControl()"
            (dismissed)="closePointsEditor()"
            (pointsAdjusted)="handlePointsAdjusted($event)"
          />
        }

        @if (pendingAccessAction(); as pending) {
          <section
            class="fixed inset-0 z-[90] grid place-items-center bg-black/75 px-4 py-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-access-confirmation-title"
            [appDialogFocus]="dialogLaunchControl()"
            (appDialogEscape)="closeAccessConfirmation()"
          >
            <div class="w-full max-w-xl border bg-zinc-950 p-5 shadow-2xl shadow-black" [class.border-red-500]="pending.action === 'delete'" [class.border-orange-400]="pending.action !== 'delete'">
              <header class="border-b border-zinc-800 pb-4">
                <p class="text-sm uppercase tracking-[0.24em]" [class.text-red-300]="pending.action === 'delete'" [class.text-orange-300]="pending.action !== 'delete'">Firebase Auth access</p>
                <h2 id="user-access-confirmation-title" class="mt-2 text-2xl font-semibold text-zinc-50" tabindex="-1" data-dialog-initial-focus>
                  @switch (pending.action) {
                    @case ('disable') { Disable sign-in? }
                    @case ('enable') { Restore sign-in? }
                    @case ('delete') { Delete this Auth user? }
                  }
                </h2>
                <p class="mt-2 break-all text-sm text-zinc-400">{{ pending.user.email || pending.user.uid }}</p>
              </header>

              <div class="space-y-4 py-5 text-sm leading-6 text-zinc-300">
                @switch (pending.action) {
                  @case ('disable') {
                    <p>Firebase Auth will reject future sign-ins and token refreshes for this account. Existing ID tokens can remain usable until they expire.</p>
                    <p class="border border-orange-500/30 bg-orange-950/20 p-3 text-orange-100">The account and its email stay registered, which prevents the same address from simply signing up again. Roles and stored site data are preserved.</p>
                  }
                  @case ('enable') {
                    <p>This account will be allowed to sign in again with its existing providers and roles.</p>
                  }
                  @case ('delete') {
                    <p>Only the Firebase Auth record will be deleted. Existing profile data, comments, points, and authored content are intentionally preserved.</p>
                    <p class="border border-red-500/40 bg-red-950/30 p-3 text-red-100">Deletion does not block this email from registering again. Disable the account instead when the goal is to deny access.</p>
                    <label class="grid gap-2 text-zinc-200">
                      Type <strong class="break-all text-zinc-50">{{ pending.user.email || pending.user.uid }}</strong> to confirm
                      <input
                        type="text"
                        class="w-full border border-red-500/50 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-red-300"
                        autocomplete="off"
                        [value]="accessConfirmation()"
                        (input)="updateAccessConfirmation($event)"
                      >
                    </label>
                  }
                }
              </div>

              @if (errorMessage()) {
                <app-admin-alert class="mb-5" [message]="errorMessage()!" />
              }

              <footer class="flex flex-wrap justify-end gap-3 border-t border-zinc-800 pt-4">
                <button
                  type="button"
                  class="border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
                  [disabled]="isMutatingAccess()"
                  (click)="closeAccessConfirmation()"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="border px-4 py-2 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-transparent disabled:text-zinc-600"
                  [class.border-red-500]="pending.action === 'delete'"
                  [class.bg-red-500]="pending.action === 'delete'"
                  [class.border-orange-400]="pending.action !== 'delete'"
                  [class.bg-orange-400]="pending.action !== 'delete'"
                  [disabled]="isMutatingAccess() || !canConfirmAccessAction()"
                  (click)="confirmAccessAction()"
                >
                  @if (isMutatingAccess()) {
                    Updating...
                  } @else {
                    @switch (pending.action) {
                      @case ('disable') { Disable Sign-In }
                      @case ('enable') { Restore Sign-In }
                      @case ('delete') { Delete Auth User }
                    }
                  }
                </button>
              </footer>
            </div>
          </section>
        }

        @if (pendingUserView(); as user) {
          <section
            class="fixed inset-0 z-[80] grid place-items-center bg-black/75 px-4 py-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-view-confirmation-title"
            [appDialogFocus]="dialogLaunchControl()"
            (appDialogEscape)="closeUserViewConfirmation()"
          >
            <div class="w-full max-w-xl border border-amber-400/50 bg-zinc-950 p-5 shadow-2xl shadow-black">
              <header class="border-b border-zinc-800 pb-4">
                <p class="text-sm uppercase tracking-[0.24em] text-amber-300">Admin preview</p>
                <h2 id="user-view-confirmation-title" class="mt-2 text-2xl font-semibold text-zinc-50" tabindex="-1" data-dialog-initial-focus>View the application as {{ user.displayName || user.email || user.uid }}?</h2>
              </header>

              <div class="space-y-4 py-5 text-sm leading-6 text-zinc-300">
                <p>The application will use this user's profile and roles for navigation, badges, and route checks until you exit the preview.</p>
                <p class="border border-amber-500/30 bg-amber-950/20 p-3 text-amber-100">
                  This is a read-oriented role preview. Firebase still authenticates requests as your admin account, so do not use it to verify backend denials or perform user actions.
                </p>
                @if (user.disabled) {
                  <p class="border border-red-500/40 bg-red-950/30 p-3 text-red-100">This account is disabled. The preview can show its stored roles, but a disabled user cannot sign in.</p>
                }
                <dl class="grid gap-2 border border-zinc-800 bg-zinc-900 p-3">
                  <div class="grid gap-1 sm:grid-cols-[7rem_1fr]">
                    <dt class="text-zinc-500">User</dt>
                    <dd class="break-all text-zinc-200">{{ user.email || user.uid }}</dd>
                  </div>
                  <div class="grid gap-1 sm:grid-cols-[7rem_1fr]">
                    <dt class="text-zinc-500">Roles</dt>
                    <dd class="text-zinc-200">{{ user.roles.length ? user.roles.join(', ') : 'Base user only' }}</dd>
                  </div>
                </dl>
              </div>

              <footer class="flex flex-wrap justify-end gap-3 border-t border-zinc-800 pt-4">
                <button
                  type="button"
                  class="border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
                  [disabled]="isStartingUserView()"
                  (click)="closeUserViewConfirmation()"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="border border-amber-400 bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-transparent disabled:text-zinc-600"
                  [disabled]="isStartingUserView()"
                  (click)="startUserView(user)"
                >
                  {{ isStartingUserView() ? 'Starting...' : 'Start View' }}
                </button>
              </footer>
            </div>
          </section>
        }
      </section>
    </main>
  `,
})
export class UserManagementPageComponent {
  private readonly userManagement = inject(UserManagementService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly suggestedRoles = suggestedRoles;
  protected readonly activeView = signal<UserManagementView>('users');
  protected readonly users = signal<readonly AdminManagedUser[]>([]);
  protected readonly leaderboardUsers = signal<readonly AdminManagedUser[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly pointsSearchTerm = signal('');
  protected readonly isLoading = signal(false);
  protected readonly isPointsLoading = signal(false);
  protected readonly hasLoadedPoints = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isStartingUserView = signal(false);
  protected readonly isMutatingAccess = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly statusMessage = signal<string | null>(null);
  protected readonly sortKey = signal<UserSortKey>('total');
  protected readonly sortDirection = signal<UserSortDirection>('desc');
  protected readonly nextPageToken = signal<string | null>(null);
  protected readonly currentPageToken = signal<string | null>(null);
  protected readonly pageTokenStack = signal<string[]>([]);
  protected readonly selectedUser = signal<AdminManagedUser | null>(null);
  protected readonly selectedPointsUser = signal<AdminManagedUser | null>(null);
  protected readonly pendingUserView = signal<AdminManagedUser | null>(null);
  protected readonly pendingAccessAction = signal<PendingUserAccessAction | null>(null);
  protected readonly accessConfirmation = signal('');
  protected readonly draftRoles = signal<readonly string[]>([]);
  protected readonly newRoleName = signal('');
  protected readonly roleInputError = signal<string | null>(null);
  protected readonly dialogLaunchControl = signal<HTMLElement | null>(null);
  protected readonly currentUser = toSignal(this.authService.user$, {initialValue: null});

  protected readonly filteredUsers = computed(() => {
    const term = normalizeSearch(this.searchTerm());

    if (!term) {
      return this.users();
    }

    return this.users().filter(user => [
      user.uid,
      user.email ?? '',
      user.displayName ?? '',
      ...user.roles,
    ].some(value => value.toLowerCase().includes(term)));
  });
  protected readonly filteredLeaderboardUsers = computed(() => {
    const term = normalizeSearch(this.pointsSearchTerm());

    if (!term) {
      return this.leaderboardUsers();
    }

    return this.leaderboardUsers().filter(user => [
      user.uid,
      user.email ?? '',
      user.displayName ?? '',
      ...user.roles,
    ].some(value => value.toLowerCase().includes(term)));
  });
  protected readonly rankedUsers = computed(() => {
    const key = this.sortKey();
    const direction = this.sortDirection();

    return [...this.filteredLeaderboardUsers()].sort((first, second) => {
      const comparison = key === 'user'
        ? getUserLabel(first).localeCompare(getUserLabel(second), undefined, {sensitivity: 'base'})
        : first.points[key] - second.points[key];

      if (comparison === 0) {
        return getUserLabel(first).localeCompare(getUserLabel(second), undefined, {sensitivity: 'base'});
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  });
  protected readonly totalPoints = computed(() => this.leaderboardUsers().reduce((total, user) => total + user.points.total, 0));
  protected readonly adminCount = computed(() => this.users().filter(user => user.roles.includes('admin')).length);
  protected readonly disabledCount = computed(() => this.users().filter(user => user.disabled).length);
  protected readonly isActiveViewLoading = computed(() => this.activeView() === 'users'
    ? this.isLoading()
    : this.isPointsLoading());
  protected readonly sortSummary = computed(() => {
    const key = this.sortKey();
    const direction = this.sortDirection();
    const order = key === 'user'
      ? (direction === 'asc' ? 'A to Z' : 'Z to A')
      : (direction === 'asc' ? 'low to high' : 'high to low');

    return `${userSortLabels[key]}: ${order}`;
  });

  constructor() {
    void this.loadUsers();
  }

  protected refreshActiveView(): void {
    if (this.activeView() === 'points') {
      void this.loadPointsUsers();
      return;
    }

    this.refreshUsers();
  }

  protected showView(view: UserManagementView): void {
    this.activeView.set(view);
    this.errorMessage.set(null);
    this.statusMessage.set(null);

    if (view === 'points' && !this.hasLoadedPoints() && !this.isPointsLoading()) {
      void this.loadPointsUsers();
    }
  }

  protected handleTabKeydown(event: KeyboardEvent): void {
    const tabs = Array.from(
      (event.currentTarget as HTMLElement | null)?.closest('[role="tablist"]')
        ?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
    );
    const currentIndex = tabs.indexOf(event.currentTarget as HTMLButtonElement);
    let nextIndex: number;

    switch (event.key) {
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    if (nextIndex < 0 || !tabs[nextIndex]) {
      return;
    }

    event.preventDefault();
    const view: UserManagementView = tabs[nextIndex].id === 'user-points-tab' ? 'points' : 'users';
    this.showView(view);
    tabs[nextIndex].focus();
  }

  protected refreshUsers(): void {
    this.pageTokenStack.set([]);
    this.currentPageToken.set(null);
    void this.loadUsers();
  }

  protected loadNextPage(): void {
    const token = this.nextPageToken();

    if (!token) {
      return;
    }

    const currentToken = this.currentPageToken();
    this.pageTokenStack.update(tokens => currentToken ? [...tokens, currentToken] : [...tokens, '']);
    this.currentPageToken.set(token);
    void this.loadUsers(token);
  }

  protected loadPreviousPage(): void {
    const tokens = this.pageTokenStack();
    const previousToken = tokens.at(-1);

    if (typeof previousToken === 'undefined') {
      return;
    }

    this.pageTokenStack.set(tokens.slice(0, -1));
    this.currentPageToken.set(previousToken || null);
    void this.loadUsers(previousToken || undefined);
  }

  protected sortUsersBy(key: UserSortKey): void {
    if (this.sortKey() === key) {
      this.sortDirection.update(direction => direction === 'asc' ? 'desc' : 'asc');
      return;
    }

    this.sortKey.set(key);
    this.sortDirection.set(key === 'user' ? 'asc' : 'desc');
  }

  protected sortAria(key: UserSortKey): 'ascending' | 'descending' | null {
    if (!this.isSortedBy(key)) {
      return null;
    }

    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  protected isSortedBy(key: UserSortKey): boolean {
    return this.sortKey() === key;
  }

  protected openEditor(user: AdminManagedUser, event: Event): void {
    this.rememberDialogLaunchControl(event);
    this.selectedUser.set(user);
    this.draftRoles.set([...user.roles].sort((a, b) => a.localeCompare(b)));
    this.newRoleName.set('');
    this.roleInputError.set(null);
    this.statusMessage.set(null);
  }

  protected openPointsEditor(user: AdminManagedUser, event: Event): void {
    this.rememberDialogLaunchControl(event);
    this.selectedPointsUser.set(user);
    this.errorMessage.set(null);
    this.statusMessage.set(null);
  }

  protected closePointsEditor(): void {
    this.selectedPointsUser.set(null);
  }

  protected handlePointsAdjusted(result: AdjustAdminUserPointsResponse): void {
    this.replaceUser(result.user);
    this.selectedPointsUser.set(null);
    const accountLabel = result.user.email ?? result.user.uid;
    const action = result.adjustment.delta > 0 ? 'Added' : 'Removed';
    this.statusMessage.set(`${action} ${Math.abs(result.adjustment.delta)} points ${result.adjustment.delta > 0 ? 'to' : 'from'} ${accountLabel}. New balance: ${result.adjustment.newTotal}.`);
  }

  protected openAccessConfirmation(user: AdminManagedUser, action: UserAccessAction, event: Event): void {
    if (user.uid === this.currentUser()?.uid) {
      return;
    }

    this.rememberDialogLaunchControl(event);
    this.pendingAccessAction.set({action, user});
    this.accessConfirmation.set('');
    this.errorMessage.set(null);
    this.statusMessage.set(null);
  }

  protected closeAccessConfirmation(): void {
    if (!this.isMutatingAccess()) {
      this.pendingAccessAction.set(null);
      this.accessConfirmation.set('');
    }
  }

  protected updateAccessConfirmation(event: Event): void {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    this.accessConfirmation.set(input?.value ?? '');
  }

  protected canConfirmAccessAction(): boolean {
    const pending = this.pendingAccessAction();

    if (!pending || pending.user.uid === this.currentUser()?.uid) {
      return false;
    }

    if (pending.action !== 'delete') {
      return true;
    }

    const confirmation = this.accessConfirmation().trim();
    return confirmation === pending.user.uid
      || (!!pending.user.email && confirmation.toLowerCase() === pending.user.email.toLowerCase());
  }

  protected async confirmAccessAction(): Promise<void> {
    const pending = this.pendingAccessAction();

    if (!pending || !this.canConfirmAccessAction() || this.isMutatingAccess()) {
      return;
    }

    this.isMutatingAccess.set(true);
    this.errorMessage.set(null);
    this.statusMessage.set(null);

    try {
      const accountLabel = pending.user.email ?? pending.user.uid;

      if (pending.action === 'delete') {
        const result = await this.userManagement.deleteUser({
          uid: pending.user.uid,
          confirmation: this.accessConfirmation().trim(),
        });
        this.removeUser(result.uid);
        this.statusMessage.set(`Deleted the Firebase Auth record for ${accountLabel}. Stored site data was preserved.`);
      } else {
        const result = await this.userManagement.setUserDisabled({
          uid: pending.user.uid,
          disabled: pending.action === 'disable',
        });
        this.replaceUser(result.user);
        this.statusMessage.set(result.user.disabled
          ? `Disabled Firebase Auth sign-in for ${accountLabel}.`
          : `Restored Firebase Auth sign-in for ${accountLabel}.`);
      }

      this.pendingAccessAction.set(null);
      this.accessConfirmation.set('');
    } catch (error) {
      this.errorMessage.set(getErrorMessage(error));
    } finally {
      this.isMutatingAccess.set(false);
    }
  }

  protected openUserViewConfirmation(user: AdminManagedUser, event: Event): void {
    this.rememberDialogLaunchControl(event);
    this.pendingUserView.set(user);
    this.errorMessage.set(null);
    this.statusMessage.set(null);
  }

  protected closeUserViewConfirmation(): void {
    if (!this.isStartingUserView()) {
      this.pendingUserView.set(null);
    }
  }

  protected async startUserView(user: AdminManagedUser): Promise<void> {
    if (this.isStartingUserView()) {
      return;
    }

    this.isStartingUserView.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.startViewingAsUser(user);
      this.pendingUserView.set(null);
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.errorMessage.set(getErrorMessage(error));
    } finally {
      this.isStartingUserView.set(false);
    }
  }

  protected closeEditor(): void {
    if (this.isSaving()) {
      return;
    }

    this.selectedUser.set(null);
    this.draftRoles.set([]);
    this.newRoleName.set('');
    this.roleInputError.set(null);
  }

  protected updateNewRole(event: Event): void {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    this.newRoleName.set(input?.value ?? '');
    this.roleInputError.set(null);
  }

  protected hasDraftRole(role: string): boolean {
    return this.draftRoles().includes(role);
  }

  protected toggleDraftRole(role: string): void {
    if (this.hasDraftRole(role)) {
      this.removeDraftRole(role);
      return;
    }

    this.addRole(role);
  }

  protected addCustomRole(): void {
    const role = this.newRoleName().trim();

    if (!role) {
      this.roleInputError.set('Enter a role name.');
      return;
    }

    if (!roleNamePattern.test(role)) {
      this.roleInputError.set('Use letters, numbers, underscores, or hyphens, starting with a letter.');
      return;
    }

    this.addRole(role);
    this.newRoleName.set('');
    this.roleInputError.set(null);
  }

  protected removeDraftRole(role: string): void {
    this.draftRoles.update(roles => roles.filter(existingRole => existingRole !== role));
  }

  protected hasRoleChanges(): boolean {
    const user = this.selectedUser();

    if (!user) {
      return false;
    }

    return this.serializeRoles(user.roles) !== this.serializeRoles(this.draftRoles());
  }

  protected async saveRoles(user: AdminManagedUser): Promise<void> {
    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    const roles = [...this.draftRoles()];

    try {
      const result = await this.userManagement.updateUserRoles({
        uid: user.uid,
        roles,
      });

      this.replaceUser(result.user);
      this.selectedUser.set(result.user);
      this.draftRoles.set([...result.user.roles]);
      this.statusMessage.set(`Updated roles for ${result.user.email ?? result.user.uid}. The user must refresh their session for new claims to apply.`);
    } catch (error) {
      this.errorMessage.set(getErrorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected formatDate(value: string | null): string {
    return formatAccountDate(value);
  }

  protected formatPoints(value: number): string {
    return pointNumberFormatter.format(value);
  }

  private async loadUsers(pageToken?: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.statusMessage.set(null);

    try {
      const result = await this.userManagement.listUsers(pageToken);
      this.users.set(result.users);
      this.nextPageToken.set(result.nextPageToken);
    } catch (error) {
      this.errorMessage.set(getErrorMessage(error));
      this.users.set([]);
      this.nextPageToken.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadPointsUsers(): Promise<void> {
    this.isPointsLoading.set(true);
    this.errorMessage.set(null);
    this.statusMessage.set(null);

    try {
      const result = await this.userManagement.listAllUsers();
      this.leaderboardUsers.set(result.users);
      this.hasLoadedPoints.set(true);
    } catch (error) {
      this.errorMessage.set(getErrorMessage(error));
      this.leaderboardUsers.set([]);
      this.hasLoadedPoints.set(false);
    } finally {
      this.isPointsLoading.set(false);
    }
  }

  private replaceUser(updatedUser: AdminManagedUser): void {
    this.users.update(users => users.map(user => user.uid === updatedUser.uid ? updatedUser : user));
    this.leaderboardUsers.update(users => users.map(user => user.uid === updatedUser.uid ? updatedUser : user));
  }

  private removeUser(uid: string): void {
    this.users.update(users => users.filter(user => user.uid !== uid));
    this.leaderboardUsers.update(users => users.filter(user => user.uid !== uid));
  }

  private addRole(role: string): void {
    this.draftRoles.update(roles => [...new Set([...roles, role])].sort((a, b) => a.localeCompare(b)));
  }

  private serializeRoles(roles: readonly string[]): string {
    return [...roles].sort((a, b) => a.localeCompare(b)).join('\n');
  }

  private rememberDialogLaunchControl(event: Event): void {
    const launchControl = event.currentTarget;
    this.dialogLaunchControl.set(launchControl instanceof HTMLElement ? launchControl : null);
  }
}
