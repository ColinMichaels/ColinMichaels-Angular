import {Component, inject, ChangeDetectionStrategy} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {
  faArrowRight,
  faComments,
  faImages,
  faLink,
  faNewspaper,
  faPenToSquare,
  faTags,
  faUserGear,
} from '@fortawesome/free-solid-svg-icons';
import {RouterLink} from '@angular/router';
import {map, tap} from 'rxjs';

import {PATH_NAMES} from '../../../app-route-paths';
import {BlogRepositoryService} from '../../../features/blog/services/blog-repository.service';
import {AdminAuthorization, AuthService} from '../../../services/auth.service';
import {
  CMS_ACCESS_ROLES,
  MEDIA_LIBRARY_ACCESS_ROLES,
  USER_MANAGEMENT_ACCESS_ROLES,
} from '../../../shared/user-account/user-account.model';
import {writeAuthDebug} from '../../../shared/debug/auth-debug';

interface AdminWorkflowLink {
  eyebrow: string;
  title: string;
  description: string;
  route: string;
  actionLabel: string;
  icon: typeof faArrowRight;
  iconClass: string;
}

const adminRoute = `/${PATH_NAMES.ADMIN}`;
const cmsRoute = `${adminRoute}/${PATH_NAMES.ADMIN_CMS}`;
const userManagementRoute = `${adminRoute}/${PATH_NAMES.ADMIN_USERS}`;
const mediaLibraryRoute = `${cmsRoute}/${PATH_NAMES.ADMIN_MEDIA_LIBRARY}`;
const topicsRoute = `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_TOPICS}`;
const recommendedLinksRoute = `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_RECOMMENDED_LINKS}`;
const commentsRoute = `${adminRoute}/${PATH_NAMES.ADMIN_COMMENTS}`;

@Component({
  selector: 'app-admin-overview',
  imports: [
    FaIconComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-7xl space-y-9">
        <nav class="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
          <div class="flex items-center gap-4">
            <a routerLink="/" class="hover:text-zinc-100">Home</a>
            <a routerLink="/blog" class="hover:text-zinc-100">Blog</a>
            @if (canManageCms()) {
              <a [routerLink]="recommendedLinksRoute" class="text-cyan-200 hover:text-cyan-100">Links</a>
            }
          </div>
          <div class="flex items-center gap-3">
            @if (canManageUsers()) {
              <a [routerLink]="userManagementRoute" class="text-cyan-200 hover:text-cyan-100">User Management</a>
            }
          </div>
        </nav>

        <header class="grid gap-6 border-b border-zinc-800 pb-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div class="space-y-3">
            <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">Admin</p>
            <h1 class="text-4xl font-semibold text-zinc-50 sm:text-5xl">Publishing Console</h1>
            <p class="max-w-3xl text-base leading-8 text-zinc-400">
              Manage the public site surfaces from one protected workspace: posts, topics, homepage links, media, and
              access controls.
            </p>
          </div>

          <aside class="border border-cyan-400/30 bg-cyan-400/10 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Homepage Curation</p>
            <h2 class="mt-3 text-xl font-semibold text-zinc-50">Feature exactly three recommended links.</h2>
            <p class="mt-3 text-sm leading-6 text-zinc-300">
              Use the Links manager to rotate the cards that appear below the author bio.
            </p>
            @if (canManageCms()) {
              <a [routerLink]="recommendedLinksRoute"
                 class="mt-5 inline-flex items-center gap-2 border border-cyan-300 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300 hover:text-zinc-950">
                Open Links
                <fa-icon [icon]="faArrowRight" aria-hidden="true"></fa-icon>
              </a>
            }
          </aside>
        </header>

        <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Publishing statistics">
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

        <section class="grid gap-8 border-t border-zinc-800 pt-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          @if (canManageCms()) {
            <section class="space-y-4">
              <div class="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Content</p>
                  <h2 class="mt-2 text-2xl font-semibold text-zinc-50">Publishing Workflows</h2>
                </div>
                <a [routerLink]="cmsRoute"
                   class="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-cyan-100">
                  Open post table
                  <fa-icon [icon]="faArrowRight" aria-hidden="true"></fa-icon>
                </a>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                @for (workflow of cmsWorkflows; track workflow.route) {
                  <a
                    [routerLink]="workflow.route"
                    class="group grid min-h-48 content-between border border-zinc-800 bg-zinc-900/70 p-5 transition hover:border-cyan-400 hover:bg-zinc-900"
                  >
                    <div>
                      <span [class]="workflow.iconClass">
                        <fa-icon [icon]="workflow.icon" aria-hidden="true"></fa-icon>
                      </span>
                      <p
                        class="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">{{ workflow.eyebrow }}</p>
                      <h3 class="mt-2 text-2xl font-semibold text-zinc-50">{{ workflow.title }}</h3>
                      <p class="mt-3 text-sm leading-6 text-zinc-400">{{ workflow.description }}</p>
                    </div>
                    <span
                      class="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 group-hover:text-cyan-100">
                      {{ workflow.actionLabel }}
                      <fa-icon [icon]="faArrowRight" aria-hidden="true"></fa-icon>
                    </span>
                  </a>
                }
              </div>
            </section>
          } @else {
            <section class="border border-zinc-800 bg-zinc-900/60 p-5">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Content</p>
              <h2 class="mt-3 text-2xl font-semibold text-zinc-50">Publishing tools are restricted.</h2>
              <p class="mt-3 text-sm leading-6 text-zinc-400">CMS controls appear here for users with content editor
                access.</p>
            </section>
          }

          <section class="space-y-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Operations</p>
              <h2 class="mt-2 text-2xl font-semibold text-zinc-50">Library And Access</h2>
            </div>

            <div class="grid gap-4">
              @if (canManageMedia()) {
                <a
                  [routerLink]="mediaWorkflow.route"
                  class="group border border-zinc-800 bg-zinc-900/70 p-5 transition hover:border-emerald-400 hover:bg-zinc-900"
                >
                  <span [class]="mediaWorkflow.iconClass">
                    <fa-icon [icon]="mediaWorkflow.icon" aria-hidden="true"></fa-icon>
                  </span>
                  <p
                    class="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">{{ mediaWorkflow.eyebrow }}</p>
                  <h3 class="mt-2 text-xl font-semibold text-zinc-50">{{ mediaWorkflow.title }}</h3>
                  <p class="mt-3 text-sm leading-6 text-zinc-400">{{ mediaWorkflow.description }}</p>
                  <span
                    class="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-200 group-hover:text-emerald-100">
                    {{ mediaWorkflow.actionLabel }}
                    <fa-icon [icon]="faArrowRight" aria-hidden="true"></fa-icon>
                  </span>
                </a>
              } @else {
                <article class="border border-zinc-800 bg-zinc-900/40 p-5 text-zinc-500" aria-disabled="true">
                  <span [class]="mediaWorkflow.iconClass">
                    <fa-icon [icon]="mediaWorkflow.icon" aria-hidden="true"></fa-icon>
                  </span>
                  <h3 class="mt-5 text-xl font-semibold text-zinc-400">Media Library</h3>
                  <p class="mt-3 text-sm leading-6">Requires media manager access.</p>
                </article>
              }

              @if (canManageUsers()) {
                <a
                  [routerLink]="userWorkflow.route"
                  class="group border border-zinc-800 bg-zinc-900/70 p-5 transition hover:border-violet-400 hover:bg-zinc-900"
                >
                  <span [class]="userWorkflow.iconClass">
                    <fa-icon [icon]="userWorkflow.icon" aria-hidden="true"></fa-icon>
                  </span>
                  <p
                    class="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">{{ userWorkflow.eyebrow }}</p>
                  <h3 class="mt-2 text-xl font-semibold text-zinc-50">{{ userWorkflow.title }}</h3>
                  <p class="mt-3 text-sm leading-6 text-zinc-400">{{ userWorkflow.description }}</p>
                  <span
                    class="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-violet-200 group-hover:text-violet-100">
                    {{ userWorkflow.actionLabel }}
                    <fa-icon [icon]="faArrowRight" aria-hidden="true"></fa-icon>
                  </span>
                </a>
              } @else {
                <article class="border border-zinc-800 bg-zinc-900/40 p-5 text-zinc-500" aria-disabled="true">
                  <span [class]="userWorkflow.iconClass">
                    <fa-icon [icon]="userWorkflow.icon" aria-hidden="true"></fa-icon>
                  </span>
                  <h3 class="mt-5 text-xl font-semibold text-zinc-400">User Management</h3>
                  <p class="mt-3 text-sm leading-6">Requires the admin custom claim.</p>
                </article>
              }
            </div>
          </section>
        </section>
      </section>
    </main>
  `,
})
export class AdminOverviewComponent {
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly authService = inject(AuthService);

  protected readonly cmsRoute = cmsRoute;
  protected readonly recommendedLinksRoute = recommendedLinksRoute;
  protected readonly userManagementRoute = userManagementRoute;
  protected readonly faArrowRight = faArrowRight;
  protected readonly cmsWorkflows: readonly AdminWorkflowLink[] = [
    {
      eyebrow: 'Posts',
      title: 'CMS',
      description: 'Review published posts, drafts, scheduled entries, and archive status in the main content table.',
      route: cmsRoute,
      actionLabel: 'Manage posts',
      icon: faNewspaper,
      iconClass: 'inline-flex h-10 w-10 items-center justify-center border border-cyan-400/50 bg-cyan-400/10 text-cyan-200',
    },
    {
      eyebrow: 'Drafting',
      title: 'New Post',
      description: 'Start a new Editor.js blog draft with metadata, categories, tags, media, and SEO controls.',
      route: `${cmsRoute}/new`,
      actionLabel: 'Create draft',
      icon: faPenToSquare,
      iconClass: 'inline-flex h-10 w-10 items-center justify-center border border-sky-400/50 bg-sky-400/10 text-sky-200',
    },
    {
      eyebrow: 'Navigation',
      title: 'Topics',
      description: 'Manage topic hubs that organize public blog sections and search entry points.',
      route: topicsRoute,
      actionLabel: 'Edit topics',
      icon: faTags,
      iconClass: 'inline-flex h-10 w-10 items-center justify-center border border-amber-400/50 bg-amber-400/10 text-amber-200',
    },
    {
      eyebrow: 'Homepage',
      title: 'Links',
      description: 'Maintain the recommended-site pool and rotate which three links are featured under the author bio.',
      route: recommendedLinksRoute,
      actionLabel: 'Curate links',
      icon: faLink,
      iconClass: 'inline-flex h-10 w-10 items-center justify-center border border-fuchsia-400/50 bg-fuchsia-400/10 text-fuchsia-200',
    },
    {
      eyebrow: 'Community',
      title: 'Comments',
      description: 'Review first-time reader comments, approve trusted voices, and moderate published discussion.',
      route: commentsRoute,
      actionLabel: 'Moderate comments',
      icon: faComments,
      iconClass: 'inline-flex h-10 w-10 items-center justify-center border border-lime-400/50 bg-lime-400/10 text-lime-200',
    },
  ];
  protected readonly mediaWorkflow: AdminWorkflowLink = {
    eyebrow: 'Assets',
    title: 'Media Library',
    description: 'Upload, organize, inspect, and reuse images and supporting content assets.',
    route: mediaLibraryRoute,
    actionLabel: 'Open library',
    icon: faImages,
    iconClass: 'inline-flex h-10 w-10 items-center justify-center border border-emerald-400/50 bg-emerald-400/10 text-emerald-200',
  };
  protected readonly userWorkflow: AdminWorkflowLink = {
    eyebrow: 'Security',
    title: 'User Management',
    description: 'Review authorized users and adjust admin, CMS, editor, media, and viewer roles.',
    route: userManagementRoute,
    actionLabel: 'Manage users',
    icon: faUserGear,
    iconClass: 'inline-flex h-10 w-10 items-center justify-center border border-violet-400/50 bg-violet-400/10 text-violet-200',
  };
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
