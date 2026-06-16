import {Component, inject, ChangeDetectionStrategy} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';
import {map, tap} from 'rxjs';

import {BlogRepositoryService} from '../../../features/blog/services/blog-repository.service';
import {AdminAuthorization, AuthService} from '../../../services/auth.service';
import {
  CMS_ACCESS_ROLES,
  MEDIA_LIBRARY_ACCESS_ROLES,
  USER_MANAGEMENT_ACCESS_ROLES,
} from '../../../shared/user-account/user-account.model';
import {writeAuthDebug} from '../../../shared/debug/auth-debug';

@Component({
  selector: 'app-admin-overview',
  imports: [
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-5xl space-y-8">
        <nav class="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
          <div class="flex items-center gap-4">
            <a routerLink="/" class="hover:text-zinc-100">Home</a>
            <a routerLink="/blog" class="hover:text-zinc-100">Blog</a>
          </div>
          <div class="flex items-center gap-3">
            @if (canManageUsers()) {
              <a routerLink="/admin/users" class="text-cyan-200 hover:text-cyan-100">User Management</a>
            }
          </div>
        </nav>

        <header class="space-y-3 border-b border-zinc-800 pb-8">
          <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">Admin</p>
          <h1 class="text-4xl font-semibold text-zinc-50">Publishing Console</h1>
          <p class="max-w-2xl text-zinc-400">Manage posts, drafts, and future media workflows from one protected area.</p>
        </header>

        <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-sm text-zinc-500">Total Posts</p>
            <p class="mt-2 text-3xl font-semibold">{{ stats.total }}</p>
          </div>
          <div class="border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-sm text-zinc-500">Published</p>
            <p class="mt-2 text-3xl font-semibold">{{ stats.published }}</p>
          </div>
          <div class="border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-sm text-zinc-500">Drafts</p>
            <p class="mt-2 text-3xl font-semibold">{{ stats.drafts }}</p>
          </div>
          <div class="border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-sm text-zinc-500">Scheduled</p>
            <p class="mt-2 text-3xl font-semibold">{{ stats.scheduled }}</p>
          </div>
        </section>

        <section class="flex flex-wrap gap-3 border-t border-zinc-800 pt-6">
          @if (canManageCms()) {
            <a routerLink="/admin/cms" class="inline-flex border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950">
              Open CMS
            </a>
            <a routerLink="/admin/cms/new" class="inline-flex border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800">
              New Post
            </a>
          }
          @if (canManageMedia()) {
            <a routerLink="/admin/cms/media-library" class="inline-flex border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800">
              Media Library
            </a>
          }
          @if (canManageUsers()) {
            <a routerLink="/admin/users" class="inline-flex border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800">
              User Management
            </a>
          } @else {
            <span class="inline-flex border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-500" title="Requires the admin custom claim, not only cmsAdmin or editor roles.">
              User Management requires admin
            </span>
          }
        </section>
      </section>
    </main>
  `,
})
export class AdminOverviewComponent {
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly authService = inject(AuthService);

  protected readonly stats = this.blogRepository.getAdminStats();
  protected readonly canManageCms = toSignal(
    this.authService.getRoleAuthorization(CMS_ACCESS_ROLES, true).pipe(
      tap(authorization => this.debugAdmin('CMS button authorization resolved', {
        shouldShowCmsButtons: authorization.isAuthorized,
        authorization: this.createAuthorizationDebugSummary(authorization),
      })),
      map(authorization => authorization.isAuthorized)
    ),
    {initialValue: false}
  );
  protected readonly canManageMedia = toSignal(
    this.authService.getRoleAuthorization(MEDIA_LIBRARY_ACCESS_ROLES, true).pipe(
      tap(authorization => this.debugAdmin('media button authorization resolved', {
        shouldShowMediaButton: authorization.isAuthorized,
        authorization: this.createAuthorizationDebugSummary(authorization),
      })),
      map(authorization => authorization.isAuthorized)
    ),
    {initialValue: false}
  );
  protected readonly canManageUsers = toSignal(
    this.authService.getRoleAuthorization(USER_MANAGEMENT_ACCESS_ROLES, true).pipe(
      tap(authorization => this.debugAdmin('user management button authorization resolved', {
        shouldShowUserManagementButton: authorization.isAuthorized,
        authorization: this.createAuthorizationDebugSummary(authorization),
      })),
      map(authorization => authorization.isAuthorized)
    ),
    {initialValue: false}
  );

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

  private debugAdmin(event: string, details?: unknown): void {
    writeAuthDebug('AdminDebug', event, details);
  }
}
