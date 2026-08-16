import {Component, computed, inject, ChangeDetectionStrategy} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {BlogPost, BlogPostStatus} from '../../../../features/blog/models/blog-post.model';
import {BlogRepositoryService} from '../../../../features/blog/services/blog-repository.service';
import {resolveBlogPostImage} from '../../../../features/blog/utils/blog-image-url.util';
import {CmsToastContainerComponent} from '../../components/toast/cms-toast.component';
import {CmsToastService} from '../../services/cms-toast.service';
import {
  BlogEvidenceReview,
  BlogEvidenceReviewState,
  createBlogEvidenceReview,
} from '../../utils/blog-evidence-review.util';
import {
  BlogDiscoveryReview,
  BlogDiscoveryReviewState,
  createBlogDiscoveryReview,
} from '../../utils/blog-discovery-review.util';
import {
  BLOG_POST_STATUSES,
  isBlogPost,
  isBlogPostStatus,
  isRecord,
} from '../../../../features/blog/utils/blog-validation.util';

interface AdminPostRow {
  post: BlogPost;
  evidence: BlogEvidenceReview;
  discovery: BlogDiscoveryReview;
  updatedAt: string;
  publishedAt: string;
  postedTimestamp: number;
  updatedTimestamp: number;
  searchableText: string;
}

type AdminPostSortMode =
  | 'discovery-priority'
  | 'posted-desc'
  | 'posted-asc'
  | 'updated-desc'
  | 'updated-asc'
  | 'title-asc'
  | 'title-desc'
  | 'status-asc'
  | 'author-asc'
  | 'category-asc';

interface AdminPostSortOption {
  value: AdminPostSortMode;
  label: string;
}

type AdminEvidenceFilterMode = 'all' | 'published-needs-review' | 'needs-review' | 'reviewed';

interface AdminEvidenceFilterOption {
  value: AdminEvidenceFilterMode;
  label: string;
}

type AdminDiscoveryFilterMode = 'all' | 'published-needs-review' | 'needs-review' | 'ready';

interface AdminDiscoveryFilterOption {
  value: AdminDiscoveryFilterMode;
  label: string;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});
const sortOptions: readonly AdminPostSortOption[] = [
  {value: 'discovery-priority', label: 'Discovery priority'},
  {value: 'posted-desc', label: 'Posted newest'},
  {value: 'posted-asc', label: 'Posted oldest'},
  {value: 'updated-desc', label: 'Updated newest'},
  {value: 'updated-asc', label: 'Updated oldest'},
  {value: 'title-asc', label: 'Title A-Z'},
  {value: 'title-desc', label: 'Title Z-A'},
  {value: 'status-asc', label: 'Status'},
  {value: 'author-asc', label: 'Author A-Z'},
  {value: 'category-asc', label: 'Category'},
];
const sortModes = new Set<AdminPostSortMode>(sortOptions.map(option => option.value));
const evidenceFilterOptions: readonly AdminEvidenceFilterOption[] = [
  {value: 'all', label: 'All evidence states'},
  {value: 'published-needs-review', label: 'Published needs review'},
  {value: 'needs-review', label: 'All needs review'},
  {value: 'reviewed', label: 'Reviewed'},
];
const evidenceFilterModes = new Set<AdminEvidenceFilterMode>(
  evidenceFilterOptions.map(option => option.value)
);
const discoveryFilterOptions: readonly AdminDiscoveryFilterOption[] = [
  {value: 'all', label: 'All discovery states'},
  {value: 'published-needs-review', label: 'Published discovery review'},
  {value: 'needs-review', label: 'All discovery review'},
  {value: 'ready', label: 'Discovery-ready'},
];
const discoveryFilterModes = new Set<AdminDiscoveryFilterMode>(
  discoveryFilterOptions.map(option => option.value)
);
const bulkStatusOptions = BLOG_POST_STATUSES.filter(status => status !== 'scheduled');
const pageSizeOptions: readonly number[] = [5, 10, 25, 50];
function formatDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : 'Not published';
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

function getTimestamp(value: string | null): number {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function createBackupFileName(): string {
  return `cms-blog-posts-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
}

function isAdminPostSortMode(value: string): value is AdminPostSortMode {
  return sortModes.has(value as AdminPostSortMode);
}

function isAdminEvidenceFilterMode(value: string): value is AdminEvidenceFilterMode {
  return evidenceFilterModes.has(value as AdminEvidenceFilterMode);
}

function isAdminDiscoveryFilterMode(value: string): value is AdminDiscoveryFilterMode {
  return discoveryFilterModes.has(value as AdminDiscoveryFilterMode);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

@Component({
  selector: 'app-cms-post-list',
  imports: [
    RouterLink,
    CmsToastContainerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-6xl space-y-8">
        <header class="grid gap-5 border-b border-zinc-800 pb-8 md:grid-cols-[1fr_auto] md:items-end">
          <div class="space-y-3">
            <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">CMS</p>
            <h1 class="text-4xl font-semibold text-zinc-50">Posts</h1>
            <p class="max-w-2xl text-zinc-400">Draft, scheduled, published, and archived entries using the shared blog content model.</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <input
              #bulkJsonImportInput
              type="file"
              class="hidden"
              accept=".json,application/json"
              (change)="importPostsJson($event)"
            >
            <details #maintenanceMenu class="group relative">
              <summary
                class="inline-flex cursor-pointer list-none items-center gap-2 border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-cyan-300"
              >
                Maintenance
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  class="h-4 w-4 transition-transform group-open:rotate-180"
                >
                  <path d="m6 8 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </summary>
              <div
                class="absolute left-0 z-30 mt-2 w-56 border border-zinc-700 bg-zinc-950 p-1 shadow-2xl shadow-black/40 sm:left-auto sm:right-0"
                aria-label="Maintenance actions"
              >
                <button
                  type="button"
                  class="flex w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
                  [disabled]="importInProgress"
                  (click)="closeMaintenanceMenu(maintenanceMenu); bulkJsonImportInput.click()"
                >
                  {{ importInProgress ? 'Importing...' : 'Import JSON' }}
                </button>
                <button
                  type="button"
                  class="flex w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  (click)="closeMaintenanceMenu(maintenanceMenu); exportPosts()"
                >
                  Export JSON
                </button>
                <button
                  type="button"
                  class="flex w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
                  [disabled]="backupInProgress"
                  (click)="closeMaintenanceMenu(maintenanceMenu); refreshPostsFromFirestore()"
                >
                  {{ backupInProgress ? 'Refreshing...' : 'Refresh Firestore' }}
                </button>
              </div>
            </details>
            <a
              routerLink="/admin/cms/new"
              class="inline-flex justify-center border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950"
            >
              New Post
            </a>
          </div>
        </header>

        <section
          class="grid gap-5 border border-cyan-900/70 bg-cyan-950/20 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
          aria-label="Evidence review queue"
        >
          <div class="space-y-4">
            <div>
              <p class="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">Editorial trust</p>
              <h2 class="mt-2 text-xl font-semibold text-zinc-100">Evidence review queue</h2>
              <p class="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                Find legacy or incomplete article evidence without assigning claims in bulk. Open each post to record its actual basis, boundaries, source date, and disclosures.
              </p>
            </div>
            <dl class="grid gap-3 sm:grid-cols-3">
              <div class="border border-zinc-800 bg-zinc-950/70 p-3">
                <dt class="text-xs uppercase tracking-wide text-zinc-500">Published needs review</dt>
                <dd class="mt-1 text-2xl font-semibold text-rose-300">{{ publishedEvidenceReviewCount }}</dd>
              </div>
              <div class="border border-zinc-800 bg-zinc-950/70 p-3">
                <dt class="text-xs uppercase tracking-wide text-zinc-500">Total needs review</dt>
                <dd class="mt-1 text-2xl font-semibold text-amber-300">{{ evidenceReviewCount }}</dd>
              </div>
              <div class="border border-zinc-800 bg-zinc-950/70 p-3">
                <dt class="text-xs uppercase tracking-wide text-zinc-500">Reviewed</dt>
                <dd class="mt-1 text-2xl font-semibold text-emerald-300">{{ reviewedEvidenceCount }}</dd>
              </div>
            </dl>
          </div>
          <button
            type="button"
            class="inline-flex justify-center border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600 disabled:hover:bg-transparent"
            [disabled]="publishedEvidenceReviewCount === 0"
            (click)="showPublishedEvidenceReview()"
          >
            Review published posts
          </button>
        </section>

        <section
          class="grid gap-5 border border-violet-900/70 bg-violet-950/20 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
          aria-label="Discovery and trust review queue"
        >
          <div class="space-y-4">
            <div>
              <p class="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Audience growth</p>
              <h2 class="mt-2 text-xl font-semibold text-zinc-100">Discovery &amp; trust review queue</h2>
              <p class="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                Prioritize published articles that still need usable sources, a genuinely contextual next read, or supporting material. Suggestions remain advisory; open each post and review the actual story before changing it.
              </p>
            </div>
            <dl class="grid gap-3 sm:grid-cols-3">
              <div class="border border-zinc-800 bg-zinc-950/70 p-3">
                <dt class="text-xs uppercase tracking-wide text-zinc-500">Published discovery review</dt>
                <dd class="mt-1 text-2xl font-semibold text-rose-300">{{ publishedDiscoveryReviewCount }}</dd>
              </div>
              <div class="border border-zinc-800 bg-zinc-950/70 p-3">
                <dt class="text-xs uppercase tracking-wide text-zinc-500">Total discovery review</dt>
                <dd class="mt-1 text-2xl font-semibold text-amber-300">{{ discoveryReviewCount }}</dd>
              </div>
              <div class="border border-zinc-800 bg-zinc-950/70 p-3">
                <dt class="text-xs uppercase tracking-wide text-zinc-500">Discovery-ready</dt>
                <dd class="mt-1 text-2xl font-semibold text-emerald-300">{{ discoveryReadyCount }}</dd>
              </div>
            </dl>
          </div>
          <button
            type="button"
            class="inline-flex justify-center border border-violet-400 px-4 py-2 text-sm font-medium text-violet-200 hover:bg-violet-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600 disabled:hover:bg-transparent"
            [disabled]="publishedDiscoveryReviewCount === 0"
            (click)="showPublishedDiscoveryReview()"
          >
            Review published discovery gaps
          </button>
        </section>

        <section class="grid gap-4 border border-zinc-800 bg-zinc-900/70 p-4 xl:grid-cols-[minmax(0,1fr)_200px_210px_200px_140px]">
          <label class="space-y-2">
            <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Search posts</span>
            <input
              type="search"
              [value]="searchTerm"
              placeholder="Search title, slug, status, category, tag..."
              class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300"
              (input)="updateSearch($event)"
            >
          </label>

          <label class="space-y-2">
            <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Discovery &amp; trust</span>
            <select
              aria-label="Discovery and trust filter"
              [value]="discoveryFilterMode"
              class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-300"
              (change)="updateDiscoveryFilter($event)"
            >
              @for (option of discoveryFilterOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>

          <label class="space-y-2">
            <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Evidence</span>
            <select
              aria-label="Evidence filter"
              [value]="evidenceFilterMode"
              class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
              (change)="updateEvidenceFilter($event)"
            >
              @for (option of evidenceFilterOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>

          <label class="space-y-2">
            <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Sort by</span>
            <select
              [value]="sortMode"
              class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
              (change)="updateSortMode($event)"
            >
              @for (option of sortOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>

          <label class="space-y-2">
            <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Rows</span>
            <select
              aria-label="Rows per page"
              [value]="pageSize"
              class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
              (change)="updatePageSize($event)"
            >
              @for (option of pageSizeOptions; track option) {
                <option [value]="option" [selected]="option === pageSize">{{ option }} per page</option>
              }
            </select>
          </label>
        </section>

        <section class="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
          <p>
            Showing {{ pageStart }}-{{ pageEnd }} of {{ filteredRows.length }} posts
            <span class="text-zinc-600">/ {{ rows().length }} total</span>
            @if (selectedCount > 0) {
              <span class="text-cyan-300">/ {{ selectedCount }} selected</span>
            }
          </p>

          @if (searchTerm || evidenceFilterMode !== 'all' || discoveryFilterMode !== 'all') {
            <button type="button" class="text-cyan-300 hover:text-cyan-200" (click)="clearFilters()">
              Clear filters
            </button>
          }
        </section>

        @if (selectedCount > 0) {
          <section
            class="grid gap-3 border border-zinc-800 bg-zinc-900/70 p-3 text-sm text-zinc-300 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto] xl:items-end"
            aria-label="Bulk post actions"
          >
            <div class="space-y-2">
              <p class="font-medium text-cyan-200">
                {{ selectedCount }} selected
                <span class="font-normal text-zinc-500">/ {{ filteredRows.length }} matching current filters</span>
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
                  [disabled]="pagedRows.length === 0 || bulkActionInProgress"
                  (click)="selectPagedRows()"
                >
                  Select visible
                </button>
                <button
                  type="button"
                  class="border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
                  [disabled]="filteredRows.length === 0 || bulkActionInProgress"
                  (click)="selectFilteredRows()"
                >
                  Select filtered
                </button>
                <button
                  type="button"
                  class="border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
                  [disabled]="bulkActionInProgress"
                  (click)="clearSelection()"
                >
                  Clear
                </button>
              </div>
            </div>

            <label class="space-y-2">
              <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Change status to</span>
              <select
                [value]="bulkStatus"
                class="w-full min-w-40 border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                [disabled]="bulkActionInProgress"
                (change)="updateBulkStatus($event)"
              >
                @for (status of bulkStatusOptions; track status) {
                  <option [value]="status">{{ statusLabel(status) }}</option>
                }
              </select>
            </label>

            <button
              type="button"
              class="inline-flex justify-center border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600 disabled:hover:bg-transparent"
              [disabled]="bulkActionInProgress"
              (click)="bulkUpdateSelectedStatus()"
            >
              {{ bulkActionInProgress ? 'Working...' : 'Apply status' }}
            </button>

            <button
              type="button"
              class="inline-flex justify-center border border-red-400 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600 disabled:hover:bg-transparent"
              [disabled]="bulkActionInProgress"
              (click)="bulkDeleteSelectedPosts()"
            >
              Delete selected
            </button>
          </section>
        }

        <section class="overflow-x-auto border border-zinc-800">
          <table class="min-w-full divide-y divide-zinc-800 text-left text-sm">
            <thead class="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th class="w-12 px-4 py-3 font-medium">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-cyan-400 focus:ring-cyan-300"
                    aria-label="Select all posts on this page"
                    [checked]="allPagedRowsSelected"
                    [indeterminate]="somePagedRowsSelected"
                    [disabled]="pagedRows.length === 0 || bulkActionInProgress"
                    (change)="togglePagedRowsSelection($event)"
                  >
                </th>
                <th class="px-4 py-3 font-medium">Image</th>
                <th class="px-4 py-3 font-medium">Title</th>
                <th class="px-4 py-3 font-medium">Author</th>
                <th class="px-4 py-3 font-medium">Status</th>
                <th class="px-4 py-3 font-medium">Evidence</th>
                <th class="px-4 py-3 font-medium">Discovery &amp; trust</th>
                <th class="px-4 py-3 font-medium">Category</th>
                <th class="px-4 py-3 font-medium">Updated</th>
                <th class="px-4 py-3 font-medium">Posted</th>
                <th class="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800">
            @for (row of pagedRows; track row.post.id) {
              <tr class="bg-zinc-950 align-top">
                <td class="px-4 py-4">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-cyan-400 focus:ring-cyan-300"
                    [attr.aria-label]="'Select ' + row.post.title"
                    [checked]="isSelected(row.post.id)"
                    [disabled]="bulkActionInProgress"
                    (change)="togglePostSelection(row.post.id, $event)"
                  >
                </td>
                <td class="px-4 py-4">
                  <span
                    class="grid aspect-[16/9] w-24 place-items-center overflow-hidden rounded border border-zinc-800 bg-zinc-900">
                    <img
                      [src]="postImage(row.post)"
                      [alt]="row.post.title + ' thumbnail'"
                      loading="lazy"
                      class="h-full w-full object-contain"
                    >
                  </span>
                </td>
                  <td class="px-4 py-4">
                    <p class="font-medium text-zinc-50">{{ row.post.title }}</p>
                    <p class="mt-1 text-xs text-zinc-600">/{{ row.post.slug }}</p>
                    <p class="mt-1 max-w-xl text-zinc-500">{{ row.post.excerpt }}</p>
                  </td>
                  <td class="px-4 py-4 text-zinc-300">
                    <p class="font-medium">{{ row.post.author.name }}</p>
                    <p class="mt-1 text-xs text-zinc-600">/{{ row.post.author.slug || row.post.authorId || 'colin-michaels' }}</p>
                  </td>
                  <td class="px-4 py-4">
                    <span [class]="statusClass(row.post.status)">{{ row.post.status }}</span>
                  </td>
                  <td class="min-w-56 px-4 py-4">
                    <span [class]="evidenceClass(row.evidence.state)">{{ row.evidence.label }}</span>
                    @if (row.evidence.publishedPriority) {
                      <p class="mt-2 text-xs font-medium text-rose-300">Published priority</p>
                    }
                    <p class="mt-2 max-w-xs text-xs leading-5 text-zinc-500">{{ row.evidence.detail }}</p>
                  </td>
                  <td class="min-w-64 px-4 py-4">
                    <span [class]="discoveryClass(row.discovery.state)">{{ row.discovery.label }}</span>
                    @if (row.discovery.publishedPriority) {
                      <p class="mt-2 text-xs font-medium text-rose-300">Published priority</p>
                    }
                    <p class="mt-2 max-w-sm text-xs leading-5 text-zinc-500">{{ row.discovery.detail }}</p>
                    @if (row.discovery.requiredIssueCount > 0 || row.discovery.recommendationCount > 0) {
                      <p class="mt-2 text-[11px] text-zinc-600">
                        {{ row.discovery.requiredIssueCount }} required / {{ row.discovery.recommendationCount }} advisory
                      </p>
                    }
                  </td>
                  <td class="px-4 py-4 text-zinc-400">
                    {{ row.post.categories.join(', ') }}
                  </td>
                  <td class="px-4 py-4 text-zinc-400">{{ row.updatedAt }}</td>
                  <td class="px-4 py-4 text-zinc-400">{{ row.publishedAt }}</td>
                <td class="whitespace-nowrap px-4 py-4">
                  <div class="flex gap-4">
                    <a [routerLink]="['/admin/cms', row.post.slug, 'edit']" class="text-cyan-300 hover:text-cyan-200">Edit</a>
                    @if (row.post.status === 'published') {
                      <a [routerLink]="['/blog', row.post.slug]" class="text-cyan-300 hover:text-cyan-200">View</a>
                    } @else if (hasActivePreview(row.post)) {
                      <a
                        [href]="previewUrl(row.post)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-amber-300 hover:text-amber-200"
                      >
                        Preview
                      </a>
                    } @else {
                    <span class="text-zinc-600">Hidden</span>
                  }
                    <button type="button" class="text-red-300 hover:text-red-200" (click)="deletePost(row.post)">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr class="bg-zinc-950">
                <td colspan="11" class="px-4 py-12 text-center">
                  <p class="text-base font-medium text-zinc-200">No posts match these filters.</p>
                  <p class="mt-2 text-sm text-zinc-500">Clear or adjust the search, evidence, and discovery filters.</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>

        <section
          class="flex flex-wrap items-center justify-between gap-3 border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-400">
          <p>Page {{ visiblePage }} of {{ totalPages }}</p>
          <div class="flex gap-2">
            <button
              type="button"
              class="border border-zinc-700 px-3 py-2 text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
              [disabled]="visiblePage <= 1"
              (click)="goToPreviousPage()"
            >
              Previous
            </button>
            <button
              type="button"
              class="border border-zinc-700 px-3 py-2 text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
              [disabled]="visiblePage >= totalPages"
              (click)="goToNextPage()"
            >
              Next
            </button>
          </div>
        </section>

      </section>
    </main>
    <app-cms-toast-container></app-cms-toast-container>
  `,
})
export class CmsPostListComponent {
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly toast = inject(CmsToastService);

  protected readonly sortOptions = sortOptions;
  protected readonly evidenceFilterOptions = evidenceFilterOptions;
  protected readonly discoveryFilterOptions = discoveryFilterOptions;
  protected readonly pageSizeOptions = pageSizeOptions;
  protected readonly bulkStatusOptions = bulkStatusOptions;
  protected readonly posts = toSignal(this.blogRepository.getAdminPosts$(), {initialValue: []});
  protected readonly rows = computed(() => this.createRows(this.posts()));
  protected searchTerm = '';
  protected sortMode: AdminPostSortMode = 'posted-desc';
  protected evidenceFilterMode: AdminEvidenceFilterMode = 'all';
  protected discoveryFilterMode: AdminDiscoveryFilterMode = 'all';
  protected pageSize = 10;
  protected currentPage = 1;
  protected backupInProgress = false;
  protected importInProgress = false;
  protected bulkStatus: BlogPostStatus = 'draft';
  protected bulkActionInProgress = false;
  protected selectedPostIds = new Set<string>();

  protected get filteredRows(): readonly AdminPostRow[] {
    const normalizedSearchTerm = normalizeSearchText(this.searchTerm);
    const evidenceRows = this.rows().filter(row => (
      this.matchesEvidenceFilter(row) && this.matchesDiscoveryFilter(row)
    ));
    const filteredRows = normalizedSearchTerm
      ? evidenceRows.filter(row => row.searchableText.includes(normalizedSearchTerm))
      : evidenceRows;

    return [...filteredRows].sort((left, right) => this.compareRows(left, right));
  }

  protected get publishedEvidenceReviewCount(): number {
    return this.rows().filter(row => row.evidence.publishedPriority).length;
  }

  protected get evidenceReviewCount(): number {
    return this.rows().filter(row => row.evidence.needsReview).length;
  }

  protected get reviewedEvidenceCount(): number {
    return this.rows().filter(row => !row.evidence.needsReview).length;
  }

  protected get publishedDiscoveryReviewCount(): number {
    return this.rows().filter(row => row.discovery.publishedPriority).length;
  }

  protected get discoveryReviewCount(): number {
    return this.rows().filter(row => row.discovery.needsReview).length;
  }

  protected get discoveryReadyCount(): number {
    return this.rows().filter(row => !row.discovery.needsReview).length;
  }

  protected get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
  }

  protected get visiblePage(): number {
    return Math.min(this.currentPage, this.totalPages);
  }

  protected get pagedRows(): readonly AdminPostRow[] {
    const startIndex = (this.visiblePage - 1) * this.pageSize;
    return this.filteredRows.slice(startIndex, startIndex + this.pageSize);
  }

  protected get pageStart(): number {
    if (this.filteredRows.length === 0) {
      return 0;
    }

    return (this.visiblePage - 1) * this.pageSize + 1;
  }

  protected get pageEnd(): number {
    return Math.min(this.visiblePage * this.pageSize, this.filteredRows.length);
  }

  protected get selectedPosts(): readonly BlogPost[] {
    const selectedPostIds = this.selectedPostIds;
    return this.rows()
      .filter(row => selectedPostIds.has(row.post.id))
      .map(row => row.post);
  }

  protected get selectedCount(): number {
    return this.selectedPosts.length;
  }

  protected get allPagedRowsSelected(): boolean {
    return this.pagedRows.length > 0 && this.pagedRows.every(row => this.selectedPostIds.has(row.post.id));
  }

  protected get somePagedRowsSelected(): boolean {
    return !this.allPagedRowsSelected && this.pagedRows.some(row => this.selectedPostIds.has(row.post.id));
  }

  protected statusClass(status: BlogPostStatus): string {
    const baseClass = 'rounded border px-2 py-1 text-xs uppercase tracking-wide';

    switch (status) {
      case 'published':
        return `${baseClass} border-emerald-500/60 text-emerald-300`;
      case 'draft':
        return `${baseClass} border-amber-500/60 text-amber-300`;
      case 'scheduled':
        return `${baseClass} border-cyan-500/60 text-cyan-300`;
      case 'archived':
        return `${baseClass} border-zinc-600 text-zinc-400`;
    }
  }

  protected statusLabel(status: BlogPostStatus): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  protected evidenceClass(state: BlogEvidenceReviewState): string {
    const baseClass = 'inline-flex rounded border px-2 py-1 text-xs font-medium';

    switch (state) {
      case 'unclassified':
        return `${baseClass} border-rose-500/60 text-rose-300`;
      case 'incomplete':
        return `${baseClass} border-amber-500/60 text-amber-300`;
      case 'reviewed':
        return `${baseClass} border-emerald-500/60 text-emerald-300`;
    }
  }

  protected discoveryClass(state: BlogDiscoveryReviewState): string {
    const baseClass = 'inline-flex rounded border px-2 py-1 text-xs font-medium';

    return state === 'ready'
      ? `${baseClass} border-emerald-500/60 text-emerald-300`
      : `${baseClass} border-violet-500/60 text-violet-300`;
  }

  protected hasActivePreview(post: BlogPost): boolean {
    if (!post.preview || post.status !== 'draft') {
      return false;
    }

    const expiresAt = new Date(post.preview.expiresAt).getTime();
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  }

  protected previewUrl(post: BlogPost): string {
    return post.preview ? this.blogRepository.createPreviewUrl(post.preview.token) : '';
  }

  protected postImage(post: BlogPost): string {
    return resolveBlogPostImage(post);
  }

  protected updateSearch(event: Event): void {
    this.searchTerm = event.target instanceof HTMLInputElement ? event.target.value : '';
    this.currentPage = 1;
  }

  protected clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
  }

  protected clearFilters(): void {
    this.searchTerm = '';
    this.evidenceFilterMode = 'all';
    this.discoveryFilterMode = 'all';
    this.currentPage = 1;
  }

  protected showPublishedEvidenceReview(): void {
    this.evidenceFilterMode = 'published-needs-review';
    this.currentPage = 1;
  }

  protected showPublishedDiscoveryReview(): void {
    this.discoveryFilterMode = 'published-needs-review';
    this.sortMode = 'discovery-priority';
    this.currentPage = 1;
  }

  protected updateSortMode(event: Event): void {
    const value = event.target instanceof HTMLSelectElement ? event.target.value : this.sortMode;

    if (!isAdminPostSortMode(value)) {
      return;
    }

    this.sortMode = value;
    this.currentPage = 1;
  }

  protected updateEvidenceFilter(event: Event): void {
    const value = event.target instanceof HTMLSelectElement
      ? event.target.value
      : this.evidenceFilterMode;

    if (!isAdminEvidenceFilterMode(value)) {
      return;
    }

    this.evidenceFilterMode = value;
    this.currentPage = 1;
  }

  protected updateDiscoveryFilter(event: Event): void {
    const value = event.target instanceof HTMLSelectElement
      ? event.target.value
      : this.discoveryFilterMode;

    if (!isAdminDiscoveryFilterMode(value)) {
      return;
    }

    this.discoveryFilterMode = value;
    this.currentPage = 1;
  }

  protected updatePageSize(event: Event): void {
    const value = event.target instanceof HTMLSelectElement ? Number(event.target.value) : this.pageSize;

    if (!pageSizeOptions.includes(value)) {
      return;
    }

    this.pageSize = value;
    this.currentPage = 1;
  }

  protected updateBulkStatus(event: Event): void {
    const value = event.target instanceof HTMLSelectElement ? event.target.value : this.bulkStatus;

    if (isBlogPostStatus(value)) {
      this.bulkStatus = value;
    }
  }

  protected isSelected(postId: string): boolean {
    return this.selectedPostIds.has(postId);
  }

  protected togglePostSelection(postId: string, event: Event): void {
    const checked = event.target instanceof HTMLInputElement && event.target.checked;
    const nextSelection = new Set(this.selectedPostIds);

    if (checked) {
      nextSelection.add(postId);
    } else {
      nextSelection.delete(postId);
    }

    this.selectedPostIds = nextSelection;
  }

  protected togglePagedRowsSelection(event: Event): void {
    const checked = event.target instanceof HTMLInputElement && event.target.checked;
    const nextSelection = new Set(this.selectedPostIds);

    for (const row of this.pagedRows) {
      if (checked) {
        nextSelection.add(row.post.id);
      } else {
        nextSelection.delete(row.post.id);
      }
    }

    this.selectedPostIds = nextSelection;
  }

  protected selectPagedRows(): void {
    const nextSelection = new Set(this.selectedPostIds);

    for (const row of this.pagedRows) {
      nextSelection.add(row.post.id);
    }

    this.selectedPostIds = nextSelection;
  }

  protected selectFilteredRows(): void {
    const nextSelection = new Set(this.selectedPostIds);

    for (const row of this.filteredRows) {
      nextSelection.add(row.post.id);
    }

    this.selectedPostIds = nextSelection;
  }

  protected clearSelection(): void {
    this.selectedPostIds = new Set<string>();
  }

  protected goToPreviousPage(): void {
    this.currentPage = Math.max(1, this.visiblePage - 1);
  }

  protected goToNextPage(): void {
    this.currentPage = Math.min(this.totalPages, this.visiblePage + 1);
  }

  protected closeMaintenanceMenu(menu: HTMLDetailsElement): void {
    menu.open = false;
  }

  protected exportPosts(): void {
    const exportDocument = this.blogRepository.createExportDocument();
    const blob = new Blob([JSON.stringify(exportDocument, null, 2)], {type: 'application/json'});
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = objectUrl;
    anchor.download = createBackupFileName();
    anchor.click();
    URL.revokeObjectURL(objectUrl);

    this.toast.success(`Exported ${exportDocument.totalPosts} blog posts as JSON.`);
  }

  protected async importPostsJson(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (input) {
      input.value = '';
    }

    if (!file) {
      return;
    }

    this.importInProgress = true;

    try {
      const parsedJson: unknown = JSON.parse(await file.text());
      const posts = this.extractImportPosts(parsedJson);
      const confirmed = window.confirm(
        `Import ${posts.length} blog post${posts.length === 1 ? '' : 's'} into Firestore? Existing matching post IDs will be updated.`
      );

      if (!confirmed) {
        return;
      }

      const importedCount = await this.blogRepository.backupPostsToFirestore(posts);
      await this.blogRepository.loadPostsFromFirestore();
      const publiclyReadablePosts = await this.blogRepository.loadPublishedPostsFromFirestore();
      const publicPostIds = new Set(publiclyReadablePosts.map(post => post.id));
      const importedPublishedCount = posts.filter(post => post.status === 'published').length;
      const importedPublicCount = posts.filter(post => post.status === 'published' && publicPostIds.has(post.id)).length;
      const publicVisibilityMessage = importedPublishedCount === importedPublicCount
        ? `Public published query can read ${importedPublicCount} imported published post${importedPublicCount === 1 ? '' : 's'}.`
        : `Public published query can only read ${importedPublicCount} of ${importedPublishedCount} imported published posts; check deployed Firestore rules and Firebase project config.`;

      this.toast.success([
        `Imported ${importedCount} blog post${importedCount === 1 ? '' : 's'} from ${file.name}.`,
        publicVisibilityMessage,
      ].join(' '), 8000);
    } catch (error) {
      this.toast.error(`Unable to import JSON: ${getErrorMessage(error)}`);
    } finally {
      this.importInProgress = false;
    }
  }

  protected async refreshPostsFromFirestore(): Promise<void> {
    this.backupInProgress = true;

    try {
      const posts = await this.blogRepository.loadPostsFromFirestore();
      this.toast.success(`Refreshed ${posts.length} blog posts from Firestore.`);
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Unable to refresh blog posts from Firestore.');
    } finally {
      this.backupInProgress = false;
    }
  }

  protected async deletePost(post: BlogPost): Promise<void> {
    const confirmed = window.confirm(`Delete "${post.title}" from Firestore?`);

    if (!confirmed) {
      return;
    }

    try {
      const result = await this.blogRepository.deletePost(post.id);
      this.removeSelectedPostIds([post.id]);
      this.currentPage = Math.min(this.currentPage, this.totalPages);

      if (result === 'not-found') {
        this.toast.error(`Could not delete "${post.title}" because it was not found.`);
      } else {
        this.toast.success(`Deleted "${post.title}" from Firestore.`);
      }
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : `Unable to delete "${post.title}".`);
    }
  }

  protected async bulkUpdateSelectedStatus(): Promise<void> {
    const postsToUpdate = this.selectedPosts.filter(post => post.status !== this.bulkStatus);

    if (postsToUpdate.length === 0) {
      this.toast.success(`Selected posts are already ${this.bulkStatus}.`);
      return;
    }

    const confirmed = window.confirm(
      `Change ${postsToUpdate.length} selected post${postsToUpdate.length === 1 ? '' : 's'} to ${this.bulkStatus}?`
    );

    if (!confirmed) {
      return;
    }

    this.bulkActionInProgress = true;

    try {
      const result = await this.blogRepository.updatePostStatuses(
        postsToUpdate.map(post => post.id),
        this.bulkStatus
      );

      this.removeSelectedPostIds(postsToUpdate.map(post => post.id));
      this.currentPage = Math.min(this.currentPage, this.totalPages);
      this.toast.success(this.createBulkActionMessage(
        `Updated ${result.affectedCount} post${result.affectedCount === 1 ? '' : 's'} to ${this.bulkStatus}.`,
        result.notFoundIds.length
      ));
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Unable to update selected posts.');
    } finally {
      this.bulkActionInProgress = false;
    }
  }

  protected async bulkDeleteSelectedPosts(): Promise<void> {
    const postsToDelete = this.selectedPosts;
    const firstPost = postsToDelete[0];

    if (postsToDelete.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      postsToDelete.length === 1 && firstPost
        ? `Delete "${firstPost.title}" from Firestore? This cannot be undone.`
        : `Delete ${postsToDelete.length} selected posts from Firestore? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    this.bulkActionInProgress = true;

    try {
      const result = await this.blogRepository.deletePosts(postsToDelete.map(post => post.id));

      this.removeSelectedPostIds(postsToDelete.map(post => post.id));
      this.currentPage = Math.min(this.currentPage, this.totalPages);
      this.toast.success(this.createBulkActionMessage(
        `Deleted ${result.affectedCount} post${result.affectedCount === 1 ? '' : 's'} from Firestore.`,
        result.notFoundIds.length
      ));
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Unable to delete selected posts.');
    } finally {
      this.bulkActionInProgress = false;
    }
  }

  private createRows(posts: readonly BlogPost[]): readonly AdminPostRow[] {
    return posts.map(post => {
      const evidence = createBlogEvidenceReview(post);
      const discovery = createBlogDiscoveryReview(post);

      return {
        post,
        evidence,
        discovery,
        updatedAt: formatDate(post.updatedAt),
        publishedAt: formatDate(post.publishedAt),
        postedTimestamp: getTimestamp(post.publishedAt ?? post.updatedAt),
        updatedTimestamp: getTimestamp(post.updatedAt),
        searchableText: normalizeSearchText([
          post.title,
          post.slug,
          post.excerpt,
          post.status,
          post.categories.join(' '),
          post.tags.join(' '),
          post.author.name,
          post.author.slug ?? '',
          post.authorId ?? '',
          evidence.label,
          evidence.detail,
          discovery.label,
          discovery.detail,
          post.editorial?.evidenceBasis ?? '',
          post.editorial?.sourceReviewedAt ?? '',
        ].join(' ')),
      };
    });
  }

  private matchesEvidenceFilter(row: AdminPostRow): boolean {
    switch (this.evidenceFilterMode) {
      case 'all':
        return true;
      case 'published-needs-review':
        return row.evidence.publishedPriority;
      case 'needs-review':
        return row.evidence.needsReview;
      case 'reviewed':
        return !row.evidence.needsReview;
    }
  }

  private matchesDiscoveryFilter(row: AdminPostRow): boolean {
    switch (this.discoveryFilterMode) {
      case 'all':
        return true;
      case 'published-needs-review':
        return row.discovery.publishedPriority;
      case 'needs-review':
        return row.discovery.needsReview;
      case 'ready':
        return !row.discovery.needsReview;
    }
  }

  private extractImportPosts(value: unknown): readonly BlogPost[] {
    if (isBlogPost(value)) {
      return [value];
    }

    const nestedPost = isRecord(value) ? value['post'] : null;

    if (isBlogPost(nestedPost)) {
      return [nestedPost];
    }

    const maybePosts = isRecord(value) && Array.isArray(value['posts'])
      ? value['posts']
      : Array.isArray(value)
        ? value
        : null;

    if (!maybePosts) {
      throw new Error('Expected a CMS export with posts[], an array of posts, or a single blog post JSON object.');
    }

    if (maybePosts.length === 0) {
      throw new Error('The JSON file does not contain any posts to import.');
    }

    const invalidIndex = maybePosts.findIndex(post => !isBlogPost(post));

    if (invalidIndex >= 0) {
      throw new Error(`Post at index ${invalidIndex + 1} is missing required CMS blog fields.`);
    }

    return maybePosts as readonly BlogPost[];
  }

  private compareRows(left: AdminPostRow, right: AdminPostRow): number {
    switch (this.sortMode) {
      case 'discovery-priority':
        return right.discovery.priorityScore - left.discovery.priorityScore
          || right.postedTimestamp - left.postedTimestamp
          || this.compareTitles(left, right);
      case 'posted-desc':
        return right.postedTimestamp - left.postedTimestamp || this.compareTitles(left, right);
      case 'posted-asc':
        return left.postedTimestamp - right.postedTimestamp || this.compareTitles(left, right);
      case 'updated-desc':
        return right.updatedTimestamp - left.updatedTimestamp || this.compareTitles(left, right);
      case 'updated-asc':
        return left.updatedTimestamp - right.updatedTimestamp || this.compareTitles(left, right);
      case 'title-asc':
        return this.compareTitles(left, right);
      case 'title-desc':
        return this.compareTitles(right, left);
      case 'status-asc':
        return left.post.status.localeCompare(right.post.status) || this.compareTitles(left, right);
      case 'author-asc':
        return left.post.author.name.localeCompare(right.post.author.name)
          || this.compareTitles(left, right);
      case 'category-asc':
        return left.post.categories.join(', ').localeCompare(right.post.categories.join(', '))
          || this.compareTitles(left, right);
    }
  }

  private compareTitles(left: AdminPostRow, right: AdminPostRow): number {
    return left.post.title.localeCompare(right.post.title, undefined, {numeric: true, sensitivity: 'base'});
  }

  private removeSelectedPostIds(postIds: readonly string[]): void {
    const nextSelection = new Set(this.selectedPostIds);

    for (const postId of postIds) {
      nextSelection.delete(postId);
    }

    this.selectedPostIds = nextSelection;
  }

  private createBulkActionMessage(message: string, notFoundCount: number): string {
    return notFoundCount > 0
      ? `${message} ${notFoundCount} selected post${notFoundCount === 1 ? ' was' : 's were'} not found.`
      : message;
  }

}
