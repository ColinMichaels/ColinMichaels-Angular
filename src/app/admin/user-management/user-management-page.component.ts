import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {Router} from '@angular/router';

import {AuthService} from '../../services/auth.service';
import {AdminManagedUser} from './models/user-management.models';
import {UserManagementService} from './services/user-management.service';
import {CAT_CORNER_ADDICT_ROLE} from '../../shared/user-account/user-account.model';

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
type UserAccessAction = 'disable' | 'enable' | 'delete';

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

@Component({
  selector: 'app-user-management-page',
  imports: [
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-6xl space-y-8">
        <header class="grid gap-5 border-b border-zinc-800 pb-8 md:grid-cols-[1fr_auto] md:items-end">
          <div class="space-y-3">
            <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">Admin</p>
            <h1 class="text-4xl font-semibold text-zinc-50">User Management</h1>
            <p class="max-w-2xl text-zinc-400">Review Firebase Auth accounts, disable suspicious sign-ins, remove Auth records, test the application with another user's role view, and manage custom claim roles from a protected admin-only tool.</p>
          </div>
          <button
            type="button"
            class="inline-flex justify-center border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
            [disabled]="isLoading()"
            (click)="refreshUsers()"
          >
            Refresh
          </button>
        </header>

        <section class="grid gap-4 sm:grid-cols-3">
          <div class="border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-sm text-zinc-500">Loaded Users</p>
            <p class="mt-2 text-3xl font-semibold">{{ users().length }}</p>
          </div>
          <div class="border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-sm text-zinc-500">Admins</p>
            <p class="mt-2 text-3xl font-semibold">{{ adminCount() }}</p>
          </div>
          <div class="border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-sm text-zinc-500">Disabled</p>
            <p class="mt-2 text-3xl font-semibold">{{ disabledCount() }}</p>
          </div>
        </section>

        <section class="grid gap-4 border border-zinc-800 bg-zinc-900 p-4 md:grid-cols-[1fr_auto] md:items-end">
          <label class="grid gap-2 text-sm text-zinc-300">
            Search users
            <input
              type="search"
              class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
              placeholder="Email, display name, uid, or role"
              [value]="searchTerm()"
              (input)="updateSearch($event)"
            >
          </label>
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

        @if (statusMessage()) {
          <p class="border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100" role="status" aria-live="polite">{{ statusMessage() }}</p>
        }

        @if (errorMessage() && !pendingAccessAction()) {
          <p class="border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-100" role="alert">{{ errorMessage() }}</p>
        }

        <section class="overflow-hidden border border-zinc-800">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-zinc-800 text-left text-sm">
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
                            (click)="openUserViewConfirmation(user)"
                          >
                            View as User
                          </button>
                          <button
                            type="button"
                            class="border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
                            (click)="openEditor(user)"
                          >
                            Manage Roles
                          </button>
                          <button
                            type="button"
                            class="border border-orange-400/70 px-3 py-2 text-sm font-medium text-orange-100 hover:bg-orange-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600 disabled:hover:bg-transparent"
                            [disabled]="user.uid === currentUser()?.uid || isMutatingAccess()"
                            [attr.title]="user.uid === currentUser()?.uid ? 'You cannot change sign-in access for your own admin account' : null"
                            (click)="openAccessConfirmation(user, user.disabled ? 'enable' : 'disable')"
                          >
                            {{ user.disabled ? 'Restore Sign-In' : 'Disable Sign-In' }}
                          </button>
                          <button
                            type="button"
                            class="border border-red-500/70 px-3 py-2 text-sm font-medium text-red-100 hover:bg-red-500 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600 disabled:hover:bg-transparent"
                            [disabled]="user.uid === currentUser()?.uid || isMutatingAccess()"
                            [attr.title]="user.uid === currentUser()?.uid ? 'You cannot delete your own admin account' : null"
                            (click)="openAccessConfirmation(user, 'delete')"
                          >
                            Delete Auth User
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="px-4 py-10 text-center text-zinc-400">No users match this search.</td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </section>

        @if (selectedUser(); as user) {
          <section class="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-8">
            <div class="w-full max-w-2xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl shadow-black">
              <header class="flex items-start justify-between gap-4 border-b border-zinc-800 pb-4">
                <div class="min-w-0">
                  <p class="text-sm uppercase tracking-[0.24em] text-cyan-300">Roles</p>
                  <h2 class="mt-2 truncate text-2xl font-semibold text-zinc-50">{{ user.displayName || user.email || user.uid }}</h2>
                  <p class="mt-1 break-all text-xs text-zinc-500">{{ user.uid }}</p>
                </div>
                <button
                  type="button"
                  class="border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
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
                      (input)="updateNewRole($event)"
                      (keydown.enter)="addCustomRole()"
                    >
                  </label>
                  <button
                    type="button"
                    class="border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
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
                        (click)="removeDraftRole(role)"
                      >
                        {{ role }} x
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
                  class="border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
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

        @if (pendingAccessAction(); as pending) {
          <section class="fixed inset-0 z-[90] grid place-items-center bg-black/75 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="user-access-confirmation-title">
            <div class="w-full max-w-xl border bg-zinc-950 p-5 shadow-2xl shadow-black" [class.border-red-500]="pending.action === 'delete'" [class.border-orange-400]="pending.action !== 'delete'">
              <header class="border-b border-zinc-800 pb-4">
                <p class="text-sm uppercase tracking-[0.24em]" [class.text-red-300]="pending.action === 'delete'" [class.text-orange-300]="pending.action !== 'delete'">Firebase Auth access</p>
                <h2 id="user-access-confirmation-title" class="mt-2 text-2xl font-semibold text-zinc-50">
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
                <p class="mb-5 border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-100" role="alert">{{ errorMessage() }}</p>
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
          <section class="fixed inset-0 z-[80] grid place-items-center bg-black/75 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="user-view-confirmation-title">
            <div class="w-full max-w-xl border border-amber-400/50 bg-zinc-950 p-5 shadow-2xl shadow-black">
              <header class="border-b border-zinc-800 pb-4">
                <p class="text-sm uppercase tracking-[0.24em] text-amber-300">Admin preview</p>
                <h2 id="user-view-confirmation-title" class="mt-2 text-2xl font-semibold text-zinc-50">View the application as {{ user.displayName || user.email || user.uid }}?</h2>
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
  protected readonly users = signal<readonly AdminManagedUser[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isStartingUserView = signal(false);
  protected readonly isMutatingAccess = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly statusMessage = signal<string | null>(null);
  protected readonly nextPageToken = signal<string | null>(null);
  protected readonly currentPageToken = signal<string | null>(null);
  protected readonly pageTokenStack = signal<string[]>([]);
  protected readonly selectedUser = signal<AdminManagedUser | null>(null);
  protected readonly pendingUserView = signal<AdminManagedUser | null>(null);
  protected readonly pendingAccessAction = signal<PendingUserAccessAction | null>(null);
  protected readonly accessConfirmation = signal('');
  protected readonly draftRoles = signal<readonly string[]>([]);
  protected readonly newRoleName = signal('');
  protected readonly roleInputError = signal<string | null>(null);
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
  protected readonly adminCount = computed(() => this.users().filter(user => user.roles.includes('admin')).length);
  protected readonly disabledCount = computed(() => this.users().filter(user => user.disabled).length);

  constructor() {
    void this.loadUsers();
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

  protected updateSearch(event: Event): void {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    this.searchTerm.set(input?.value ?? '');
  }

  protected openEditor(user: AdminManagedUser): void {
    this.selectedUser.set(user);
    this.draftRoles.set([...user.roles].sort((a, b) => a.localeCompare(b)));
    this.newRoleName.set('');
    this.roleInputError.set(null);
    this.statusMessage.set(null);
  }

  protected openAccessConfirmation(user: AdminManagedUser, action: UserAccessAction): void {
    if (user.uid === this.currentUser()?.uid) {
      return;
    }

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
        this.users.update(users => users.filter(user => user.uid !== result.uid));
        this.statusMessage.set(`Deleted the Firebase Auth record for ${accountLabel}. Stored site data was preserved.`);
      } else {
        const result = await this.userManagement.setUserDisabled({
          uid: pending.user.uid,
          disabled: pending.action === 'disable',
        });
        this.users.update(users => users.map(user => user.uid === result.user.uid ? result.user : user));
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

  protected openUserViewConfirmation(user: AdminManagedUser): void {
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
    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.statusMessage.set(null);

    try {
      const result = await this.userManagement.updateUserRoles({
        uid: user.uid,
        roles: this.draftRoles(),
      });

      this.users.update(users => users.map(existingUser => existingUser.uid === result.user.uid ? result.user : existingUser));
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

  private addRole(role: string): void {
    this.draftRoles.update(roles => [...new Set([...roles, role])].sort((a, b) => a.localeCompare(b)));
  }

  private serializeRoles(roles: readonly string[]): string {
    return [...roles].sort((a, b) => a.localeCompare(b)).join('\n');
  }
}
