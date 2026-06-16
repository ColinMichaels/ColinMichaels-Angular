import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';

import {AdminManagedUser} from './models/user-management.models';
import {UserManagementService} from './services/user-management.service';

const suggestedRoles = ['admin', 'cmsAdmin', 'contentEditor', 'mediaManager', 'viewer'] as const;
const roleNamePattern = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

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
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-6xl space-y-8">
        <nav class="flex items-center justify-between text-sm text-zinc-400">
          <a routerLink="/admin" class="hover:text-zinc-100">Admin</a>
          <div class="flex items-center gap-3">
            <a routerLink="/blog" class="hover:text-zinc-100">Blog</a>
          </div>
        </nav>

        <header class="grid gap-5 border-b border-zinc-800 pb-8 md:grid-cols-[1fr_auto] md:items-end">
          <div class="space-y-3">
            <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">Admin</p>
            <h1 class="text-4xl font-semibold text-zinc-50">User Management</h1>
            <p class="max-w-2xl text-zinc-400">Review Firebase Auth accounts and manage custom claim roles from a protected admin-only tool.</p>
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
          <p class="border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">{{ statusMessage() }}</p>
        }

        @if (errorMessage()) {
          <p class="border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-100">{{ errorMessage() }}</p>
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
                        <button
                          type="button"
                          class="border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
                          (click)="openEditor(user)"
                        >
                          Manage Roles
                        </button>
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
      </section>
    </main>
  `,
})
export class UserManagementPageComponent {
  private readonly userManagement = inject(UserManagementService);

  protected readonly suggestedRoles = suggestedRoles;
  protected readonly users = signal<readonly AdminManagedUser[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly statusMessage = signal<string | null>(null);
  protected readonly nextPageToken = signal<string | null>(null);
  protected readonly currentPageToken = signal<string | null>(null);
  protected readonly pageTokenStack = signal<string[]>([]);
  protected readonly selectedUser = signal<AdminManagedUser | null>(null);
  protected readonly draftRoles = signal<readonly string[]>([]);
  protected readonly newRoleName = signal('');
  protected readonly roleInputError = signal<string | null>(null);

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
