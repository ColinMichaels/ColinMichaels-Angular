import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {
  faArrowRight,
  faComments,
  faHouse,
  faImages,
  faLink,
  faTags,
  faUserGear,
} from '@fortawesome/free-solid-svg-icons';
import {RouterLink} from '@angular/router';
import {map} from 'rxjs';

import {PATH_NAMES} from '../../../app-route-paths';
import {BlogPost} from '../../../features/blog/models/blog-post.model';
import {BlogRepositoryService} from '../../../features/blog/services/blog-repository.service';
import {AuthService} from '../../../services/auth.service';
import {
  CMS_ACCESS_ROLES,
  MEDIA_LIBRARY_ACCESS_ROLES,
  USER_MANAGEMENT_ACCESS_ROLES,
} from '../../../shared/user-account/user-account.model';

type DashboardLinkAccess = 'cms' | 'media' | 'users';

interface DashboardLink {
  access: DashboardLinkAccess;
  description: string;
  icon: IconDefinition;
  label: string;
  route: string;
}

const adminRoute = `/${PATH_NAMES.ADMIN}`;
const cmsRoute = `${adminRoute}/${PATH_NAMES.ADMIN_CMS}`;
const calendarRoute = `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_CALENDAR}`;
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

@Component({
  selector: 'app-admin-overview',
  imports: [
    FaIconComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-[calc(100vh-4rem)] bg-zinc-950 px-5 py-8 text-zinc-100 sm:px-8 lg:px-10 xl:px-12">
      <section class="mx-auto max-w-7xl space-y-8">
        <header class="border-b border-zinc-800 pb-7">
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">Publishing Console</h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Keep the next release moving, return to active drafts, and manage the surfaces behind the public site.
            </p>
          </div>
        </header>

        <section class="grid border-y border-zinc-800 sm:grid-cols-2 xl:grid-cols-4" aria-label="Publishing status">
          <div class="border-b border-zinc-800 px-4 py-4 sm:border-r xl:border-b-0">
            <p class="text-xs font-medium uppercase tracking-[0.14em] text-zinc-600">All posts</p>
            <p class="mt-2 text-2xl font-semibold text-zinc-100">{{ stats().total }}</p>
          </div>
          <div class="border-b border-zinc-800 px-4 py-4 xl:border-b-0 xl:border-r">
            <p class="text-xs font-medium uppercase tracking-[0.14em] text-zinc-600">Published</p>
            <p class="mt-2 text-2xl font-semibold text-emerald-300">{{ stats().published }}</p>
          </div>
          <div class="border-b border-zinc-800 px-4 py-4 sm:border-b-0 sm:border-r">
            <p class="text-xs font-medium uppercase tracking-[0.14em] text-zinc-600">Drafts</p>
            <p class="mt-2 text-2xl font-semibold text-amber-300">{{ stats().drafts }}</p>
          </div>
          <div class="px-4 py-4">
            <p class="text-xs font-medium uppercase tracking-[0.14em] text-zinc-600">Scheduled</p>
            <p class="mt-2 text-2xl font-semibold text-cyan-300">{{ stats().scheduled }}</p>
          </div>
        </section>

        <div class="grid gap-8 xl:grid-cols-[minmax(0,1fr)_350px]">
          <div class="space-y-8">
            @if (canManageCms()) {
              <section aria-labelledby="next-scheduled-heading">
                <div class="flex items-end justify-between gap-3">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">Up next</p>
                    <h2 id="next-scheduled-heading" class="mt-2 text-xl font-semibold text-zinc-50">Publishing schedule</h2>
                  </div>
                  <a [routerLink]="calendarRoute" class="text-xs font-semibold text-cyan-300 hover:text-cyan-200">View calendar</a>
                </div>

                @if (nextScheduledPost(); as post) {
                  <article class="mt-4 grid gap-5 border border-cyan-400/35 bg-cyan-400/5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-3 text-xs">
                        <span class="border border-cyan-500/50 px-2 py-1 font-semibold uppercase tracking-wide text-cyan-300">Scheduled</span>
                        <span class="text-zinc-500">{{ formatDateTime(post.publishedAt) }}</span>
                        @if (isOverdue(post)) {
                          <span class="text-amber-300">Awaiting publisher</span>
                        }
                      </div>
                      <h3 class="mt-3 truncate text-2xl font-semibold text-zinc-50">{{ post.title }}</h3>
                      <p class="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-zinc-400">{{ post.excerpt }}</p>
                    </div>
                    <a
                      [routerLink]="[cmsRoute, post.slug, 'edit']"
                      class="inline-flex h-10 items-center justify-center gap-2 border border-cyan-400 px-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950"
                    >
                      Edit schedule
                      <fa-icon [icon]="faArrowRight" aria-hidden="true"></fa-icon>
                    </a>
                  </article>
                } @else {
                  <div class="mt-4 border border-dashed border-zinc-800 px-5 py-8">
                    <p class="text-sm font-medium text-zinc-300">Nothing is scheduled.</p>
                    <p class="mt-2 text-sm text-zinc-500">Choose a future publish time on a draft when the next article is ready.</p>
                  </div>
                }
              </section>

              <section aria-labelledby="drafts-heading">
                <div class="flex items-end justify-between gap-3">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">Continue working</p>
                    <h2 id="drafts-heading" class="mt-2 text-xl font-semibold text-zinc-50">Drafts in progress</h2>
                  </div>
                  <a [routerLink]="cmsRoute" class="text-xs font-semibold text-cyan-300 hover:text-cyan-200">All posts</a>
                </div>

                <div class="mt-4 divide-y divide-zinc-800 border-y border-zinc-800">
                  @for (post of recentDrafts(); track post.id) {
                    <a
                      [routerLink]="[cmsRoute, post.slug, 'edit']"
                      class="group grid gap-3 px-1 py-4 hover:bg-zinc-900/60 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-3"
                    >
                      <span class="min-w-0">
                        <span class="block truncate text-sm font-semibold text-zinc-200 group-hover:text-cyan-200">{{ post.title }}</span>
                        <span class="mt-1 block truncate text-xs text-zinc-500">{{ post.excerpt || 'No excerpt yet.' }}</span>
                      </span>
                      <span class="flex items-center gap-3 text-xs text-zinc-500">
                        Updated {{ formatDate(post.updatedAt) }}
                        <fa-icon [icon]="faArrowRight" class="text-zinc-700 group-hover:text-cyan-300" aria-hidden="true"></fa-icon>
                      </span>
                    </a>
                  } @empty {
                    <div class="px-3 py-8 text-sm text-zinc-500">No drafts are in progress.</div>
                  }
                </div>
              </section>
            } @else {
              <section class="border border-zinc-800 p-6">
                <h2 class="text-xl font-semibold text-zinc-50">Publishing access is restricted</h2>
                <p class="mt-2 text-sm leading-6 text-zinc-400">Your current role can use the tools shown in the sidebar.</p>
              </section>
            }
          </div>

          <aside class="space-y-8">
            @if (canManageCms()) {
              <section aria-labelledby="recent-heading">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">Live site</p>
                <h2 id="recent-heading" class="mt-2 text-xl font-semibold text-zinc-50">Recently published</h2>
                <div class="mt-4 divide-y divide-zinc-800 border-y border-zinc-800">
                  @for (post of recentlyPublished(); track post.id) {
                    <a [routerLink]="['/blog', post.slug]" class="group block py-3" target="_blank" rel="noopener noreferrer">
                      <span class="block line-clamp-2 text-sm font-medium leading-5 text-zinc-300 group-hover:text-cyan-200">{{ post.title }}</span>
                      <span class="mt-1 block text-xs text-zinc-600">{{ formatDate(post.publishedAt) }}</span>
                    </a>
                  } @empty {
                    <p class="py-6 text-sm text-zinc-500">No published posts are available yet.</p>
                  }
                </div>
              </section>
            }

            <section aria-labelledby="manage-site-heading">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">Workspace</p>
              <h2 id="manage-site-heading" class="mt-2 text-xl font-semibold text-zinc-50">Manage site</h2>
              <div class="mt-4 divide-y divide-zinc-800 border-y border-zinc-800">
                @for (link of visibleDashboardLinks(); track link.route) {
                  <a [routerLink]="link.route" class="group flex items-center gap-3 py-3">
                    <span class="grid h-8 w-8 shrink-0 place-items-center border border-zinc-800 text-zinc-500 group-hover:border-cyan-500/60 group-hover:text-cyan-200">
                      <fa-icon [icon]="link.icon" aria-hidden="true"></fa-icon>
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block text-sm font-semibold text-zinc-300 group-hover:text-cyan-200">{{ link.label }}</span>
                      <span class="mt-0.5 block truncate text-xs text-zinc-600">{{ link.description }}</span>
                    </span>
                    <fa-icon [icon]="faArrowRight" class="text-xs text-zinc-700 group-hover:text-cyan-300" aria-hidden="true"></fa-icon>
                  </a>
                }
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  `,
})
export class AdminOverviewComponent {
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly authService = inject(AuthService);

  protected readonly cmsRoute = cmsRoute;
  protected readonly calendarRoute = calendarRoute;
  protected readonly faArrowRight = faArrowRight;
  protected readonly posts = toSignal(this.blogRepository.getAdminPosts$(), {initialValue: []});
  protected readonly stats = computed(() => {
    const posts = this.posts();
    return {
      total: posts.length,
      published: posts.filter(post => post.status === 'published').length,
      drafts: posts.filter(post => post.status === 'draft').length,
      scheduled: posts.filter(post => post.status === 'scheduled').length,
    };
  });
  protected readonly nextScheduledPost = computed(() => this.posts()
    .filter(post => post.status === 'scheduled' && Boolean(post.publishedAt))
    .sort((left, right) => (left.publishedAt ?? '').localeCompare(right.publishedAt ?? ''))[0]);
  protected readonly recentDrafts = computed(() => this.posts()
    .filter(post => post.status === 'draft')
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 4));
  protected readonly recentlyPublished = computed(() => this.posts()
    .filter(post => post.status === 'published')
    .sort((left, right) => (right.publishedAt ?? right.updatedAt).localeCompare(left.publishedAt ?? left.updatedAt))
    .slice(0, 5));
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
  private readonly dashboardLinks: readonly DashboardLink[] = [
    {
      access: 'cms',
      description: 'Hero copy, slides, and featured article',
      icon: faHouse,
      label: 'Homepage',
      route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_HOMEPAGE}`,
    },
    {
      access: 'cms',
      description: 'Topic hubs and discovery paths',
      icon: faTags,
      label: 'Topics',
      route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_TOPICS}`,
    },
    {
      access: 'cms',
      description: 'Homepage recommendation rotation',
      icon: faLink,
      label: 'Recommended Links',
      route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_RECOMMENDED_LINKS}`,
    },
    {
      access: 'cms',
      description: 'Reader discussion and approvals',
      icon: faComments,
      label: 'Comments',
      route: `${adminRoute}/${PATH_NAMES.ADMIN_COMMENTS}`,
    },
    {
      access: 'media',
      description: 'Images and supporting content assets',
      icon: faImages,
      label: 'Media Library',
      route: `${cmsRoute}/${PATH_NAMES.ADMIN_MEDIA_LIBRARY}`,
    },
    {
      access: 'users',
      description: 'Accounts and role permissions',
      icon: faUserGear,
      label: 'Users',
      route: `${adminRoute}/${PATH_NAMES.ADMIN_USERS}`,
    },
  ];
  protected readonly visibleDashboardLinks = computed(() => this.dashboardLinks.filter(link => {
    switch (link.access) {
      case 'cms':
        return this.canManageCms();
      case 'media':
        return this.canManageMedia();
      case 'users':
        return this.canManageUsers();
    }
  }));

  protected formatDate(value: string | null): string {
    return value ? dateFormatter.format(new Date(value)) : 'Not set';
  }

  protected formatDateTime(value: string | null): string {
    return value ? dateTimeFormatter.format(new Date(value)) : 'No publish time';
  }

  protected isOverdue(post: BlogPost): boolean {
    return Boolean(post.publishedAt) && new Date(post.publishedAt as string).getTime() <= Date.now();
  }
}
