import {NgTemplateOutlet} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';

import {BlogPost, BlogPostStatus} from '../../../../features/blog/models/blog-post.model';
import {BlogRepositoryService} from '../../../../features/blog/services/blog-repository.service';
import {
  CmsContentOperationWorkingItem,
  ContentOperationAuditFilter,
  ContentOperationPostAudit,
  ContentOperationStatusFilter,
} from '../../content-operations/content-operations.models';
import {
  createCmsWorkingItem,
  createContentOperationPreviewItem,
  diffCmsPostArtifacts,
} from '../../content-operations/cms-post-artifact.adapter';
import {createContentOperationPostAudit} from '../../content-operations/content-operations-audit';
import {
  applyOptimizationRecommendation,
  matchOptimizationManifest,
  parsePostOptimizationManifest,
  PostOptimizationManifest,
  PostOptimizationRecommendation,
} from '../../content-operations/post-optimization-manifest.adapter';

interface ContentOperationPostRow {
  audit: ContentOperationPostAudit;
  post: BlogPost;
  recommendation: PostOptimizationRecommendation | null;
}

interface FilterOption<T extends string> {
  label: string;
  value: T;
}

const statusOptions: readonly FilterOption<ContentOperationStatusFilter>[] = [
  {value: 'all', label: 'All statuses'},
  {value: 'published', label: 'Published'},
  {value: 'draft', label: 'Draft'},
  {value: 'scheduled', label: 'Scheduled'},
  {value: 'archived', label: 'Archived'},
];
const auditOptions: readonly FilterOption<ContentOperationAuditFilter>[] = [
  {value: 'all', label: 'All audit states'},
  {value: 'any-issue', label: 'Any SEO issue'},
  {value: 'missing-title', label: 'SEO title issue'},
  {value: 'missing-description', label: 'Description issue'},
  {value: 'missing-alt', label: 'Missing image alt'},
];
const statusValues = new Set<ContentOperationStatusFilter>(statusOptions.map(option => option.value));
const auditValues = new Set<ContentOperationAuditFilter>(auditOptions.map(option => option.value));
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function splitTerms(value: string): readonly string[] {
  return [...new Set(value.split(',').map(term => term.trim()).filter(Boolean))];
}

function valueFromInput(event: Event): string {
  return event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
    ? event.target.value
    : '';
}

function valueFromSelect(event: Event): string {
  return event.target instanceof HTMLSelectElement ? event.target.value : '';
}

@Component({
  selector: 'app-content-operations-page',
  standalone: true,
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-[calc(100vh-4rem)] bg-zinc-950 px-3 py-4 text-zinc-100 sm:px-5 lg:px-6">
      <section class="mx-auto max-w-[96rem] space-y-4">
        <header class="grid gap-4 border-b border-zinc-800 pb-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">Bulk Post Editor</h1>
              <span class="inline-flex min-h-8 items-center border border-amber-400/70 px-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
                Dry run only
              </span>
            </div>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Prepare reviewable changes without writing to live posts.
            </p>
          </div>

          <div class="grid gap-2 sm:grid-cols-2">
            <input
              #manifestInput
              type="file"
              class="hidden"
              accept=".json,application/json"
              (change)="importManifest($event)"
            >
            <button
              type="button"
              class="min-h-11 border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              (click)="manifestInput.click()"
            >
              Import recommendations
            </button>
            <button
              type="button"
              class="min-h-11 border border-cyan-300 bg-cyan-300 px-4 text-sm font-bold text-zinc-950 transition hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600"
              [disabled]="selectedCount() === 0"
              (click)="createReviewDraft()"
            >
              Create review draft
            </button>
          </div>
        </header>

        @if (feedback(); as message) {
          <div
            class="border px-3 py-2.5 text-sm"
            [class.border-rose-500]="feedbackIsError()"
            [class.bg-rose-500/10]="feedbackIsError()"
            [class.text-rose-200]="feedbackIsError()"
            [class.border-cyan-400/40]="!feedbackIsError()"
            [class.bg-cyan-400/5]="!feedbackIsError()"
            [class.text-cyan-100]="!feedbackIsError()"
            role="status"
          >
            {{ message }}
          </div>
        }

        @if (manifest(); as loadedManifest) {
          <section class="flex flex-wrap items-center justify-between gap-3 border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-xs text-zinc-400" aria-label="Recommendation source">
            <p>
              <span class="font-semibold text-zinc-200">{{ manifestFileName() }}</span>
              <span class="mx-2 text-zinc-700">/</span>
              {{ loadedManifest.posts.length }} recommendations
              <span class="mx-2 text-zinc-700">/</span>
              {{ manifestMatchResult()?.matches?.length ?? 0 }} slug matches
              @if (manifestMatchResult()?.unmatchedRecommendations?.length) {
                <span class="ml-2 text-amber-300">{{ manifestMatchResult()?.unmatchedRecommendations?.length }} unmatched</span>
              }
            </p>
            <button
              type="button"
              class="min-h-9 border border-zinc-700 px-3 font-semibold text-zinc-200 hover:border-cyan-300 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              (click)="selectManifestMatches()"
            >
              Select safe matches
            </button>
          </section>
        }

        <section class="grid gap-3 border border-zinc-800 bg-zinc-900/45 p-3 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1.4fr)_minmax(10rem,.65fr)_minmax(10rem,.8fr)_minmax(12rem,.9fr)_auto] xl:items-end" aria-label="Content operations scope">
          <label class="grid gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
            Search posts
            <input
              type="search"
              class="min-h-11 w-full border border-zinc-700 bg-zinc-950 px-3 text-sm normal-case tracking-normal text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
              placeholder="Title, slug, category, or tag"
              [value]="searchTerm()"
              (input)="searchTerm.set(valueFromInput($event))"
            >
          </label>

          <label class="grid gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
            Status
            <select
              class="min-h-11 border border-zinc-700 bg-zinc-950 px-3 text-sm normal-case tracking-normal text-zinc-100 outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
              [value]="statusFilter()"
              (change)="updateStatusFilter($event)"
            >
              @for (option of statusOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>

          <label class="grid gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
            Category
            <select
              class="min-h-11 border border-zinc-700 bg-zinc-950 px-3 text-sm normal-case tracking-normal text-zinc-100 outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
              [value]="categoryFilter()"
              (change)="categoryFilter.set(valueFromSelect($event))"
            >
              <option value="all">All categories</option>
              @for (category of categories(); track category) {
                <option [value]="category">{{ category }}</option>
              }
            </select>
          </label>

          <label class="grid gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
            Audit filter
            <select
              class="min-h-11 border border-zinc-700 bg-zinc-950 px-3 text-sm normal-case tracking-normal text-zinc-100 outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
              [value]="auditFilter()"
              (change)="updateAuditFilter($event)"
            >
              @for (option of auditOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>

          <div class="flex min-h-11 items-center justify-between gap-3 border border-zinc-800 px-3 text-sm text-zinc-400 md:col-span-2 xl:col-span-1">
            <span>{{ filteredRows().length }} posts</span>
            <span class="font-semibold text-cyan-300">{{ selectedCount() }} selected</span>
          </div>
        </section>

        <section class="grid min-h-[34rem] gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(22rem,.9fr)]">
          <section class="min-w-0 overflow-hidden border border-zinc-800 bg-zinc-950" aria-label="Content operation post selection">
            <div class="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/70 px-3">
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Post scope</p>
              <div class="flex items-center gap-2 text-xs">
                <button type="button" class="min-h-9 px-2.5 text-zinc-300 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" (click)="selectFilteredRows()">
                  Select filtered
                </button>
                <button type="button" class="min-h-9 px-2.5 text-zinc-500 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" (click)="clearSelection()">
                  Clear
                </button>
              </div>
            </div>

            <div class="hidden overflow-x-auto lg:block">
              <table class="w-full min-w-[48rem] border-collapse text-left text-xs">
                <thead class="bg-zinc-900/55 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                  <tr>
                    <th class="w-12 px-3 py-2.5">
                      <input
                        type="checkbox"
                        class="h-4 w-4 accent-cyan-300"
                        aria-label="Select all filtered posts"
                        [checked]="allFilteredSelected()"
                        (change)="toggleFilteredRows($event)"
                      >
                    </th>
                    <th class="px-2 py-2.5">Post</th>
                    <th class="px-2 py-2.5">Status</th>
                    <th class="px-2 py-2.5">SEO</th>
                    <th class="px-2 py-2.5">Taxonomy</th>
                    <th class="px-3 py-2.5">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of filteredRows(); track row.post.id) {
                    <tr
                      class="border-t border-zinc-800 transition"
                      [class.bg-cyan-400/10]="activePostId() === row.post.id"
                      [attr.data-post-id]="row.post.id"
                    >
                      <td class="px-3 py-2.5 align-top">
                        <input
                          type="checkbox"
                          class="h-4 w-4 accent-cyan-300"
                          [attr.aria-label]="'Select ' + row.post.title"
                          [checked]="isSelected(row.post.id)"
                          (change)="togglePostSelection(row.post.id, $event)"
                        >
                      </td>
                      <td class="min-w-64 px-2 py-2.5 align-top">
                        <button
                          type="button"
                          class="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                          (click)="openCandidate(row.post.id)"
                        >
                          <span class="block font-semibold leading-5 text-zinc-100">{{ row.post.title }}</span>
                          <span class="mt-0.5 block truncate text-zinc-600">/{{ row.post.slug }}</span>
                        </button>
                      </td>
                      <td class="px-2 py-2.5 align-top">
                        <span [class]="statusClass(row.post.status)">{{ statusLabel(row.post.status) }}</span>
                      </td>
                      <td class="px-2 py-2.5 align-top">
                        <span [class]="auditClass(row.audit)">
                          {{ row.audit.issueCount === 0 ? 'SEO OK' : row.audit.issueCount + ' issue' + (row.audit.issueCount === 1 ? '' : 's') }}
                        </span>
                        @if (row.recommendation) {
                          <span class="mt-1 block text-[10px] uppercase tracking-[0.12em]" [class.text-rose-300]="row.recommendation.redirectRequired" [class.text-cyan-400]="!row.recommendation.redirectRequired">
                            {{ row.recommendation.redirectRequired ? 'Redirect blocked' : 'Recommendation' }}
                          </span>
                        }
                      </td>
                      <td class="max-w-52 px-2 py-2.5 align-top leading-5 text-zinc-400">{{ row.post.categories.join(', ') || 'Uncategorized' }}</td>
                      <td class="whitespace-nowrap px-3 py-2.5 align-top text-zinc-500">{{ formatDate(row.post.updatedAt) }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="6" class="px-4 py-10 text-center text-sm text-zinc-500">No posts match the current scope.</td></tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="divide-y divide-zinc-800 lg:hidden">
              @for (row of filteredRows(); track row.post.id) {
                <article [attr.data-post-id]="row.post.id" [class.bg-cyan-400/10]="activePostId() === row.post.id">
                  <div class="grid min-h-16 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5">
                    <input
                      type="checkbox"
                      class="h-5 w-5 accent-cyan-300"
                      [attr.aria-label]="'Select ' + row.post.title"
                      [checked]="isSelected(row.post.id)"
                      (change)="togglePostSelection(row.post.id, $event)"
                    >
                    <button type="button" class="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" (click)="openCandidate(row.post.id)">
                      <span class="block text-sm font-semibold leading-5 text-zinc-100">{{ row.post.title }}</span>
                      <span class="block truncate text-xs text-zinc-600">/{{ row.post.slug }}</span>
                    </button>
                    <span class="text-right text-xs" [class.text-emerald-300]="row.audit.issueCount === 0" [class.text-amber-300]="row.audit.issueCount > 0">
                      {{ row.audit.issueCount === 0 ? 'SEO OK' : row.audit.issueCount + ' issue' + (row.audit.issueCount === 1 ? '' : 's') }}
                    </span>
                  </div>
                  @if (activePostId() === row.post.id && activeWorkingItem()) {
                    <div class="border-t border-cyan-400/30 bg-zinc-900/55 p-2">
                      <ng-container [ngTemplateOutlet]="candidateEditor"></ng-container>
                    </div>
                  }
                </article>
              } @empty {
                <p class="px-4 py-10 text-center text-sm text-zinc-500">No posts match the current scope.</p>
              }
            </div>
          </section>

          <aside class="hidden xl:block">
            <div class="sticky top-20">
              <ng-container [ngTemplateOutlet]="candidateEditor"></ng-container>
            </div>
          </aside>
        </section>

        <div class="hidden lg:block xl:hidden">
          <ng-container [ngTemplateOutlet]="candidateEditor"></ng-container>
        </div>

        <footer class="sticky bottom-0 z-20 grid gap-2 border border-zinc-800 bg-zinc-950/95 px-3 py-2.5 shadow-2xl shadow-black/40 backdrop-blur md:grid-cols-[auto_auto_minmax(0,1fr)_auto] md:items-center">
          <p class="text-sm"><span class="font-semibold text-cyan-300">{{ selectedCount() }}</span> <span class="text-zinc-400">selected</span></p>
          <p class="border-zinc-800 text-sm text-zinc-400 md:border-l md:pl-4"><span class="font-semibold text-zinc-100">0</span> canonical writes</p>
          <p class="text-xs text-amber-300 md:text-center">Apply and publish remain locked until the revision API and approval boundary are implemented.</p>
          <button type="button" class="min-h-10 border border-zinc-800 px-4 text-sm text-zinc-600" disabled>Apply changes</button>
        </footer>
      </section>

      <ng-template #candidateEditor>
        <section class="border border-zinc-800 bg-zinc-900/65" aria-label="Content operation review results">
          @if (activeWorkingItem(); as item) {
            <header class="border-b border-zinc-800 px-3 py-3">
              <div class="flex items-center justify-between gap-3">
                <p class="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Candidate changes</p>
                <span class="text-xs text-cyan-300">{{ activeDiffs().length }} fields changed</span>
              </div>
              <h2 class="mt-2 text-lg font-semibold leading-6 text-zinc-50">{{ item.baseDocument.title }}</h2>
            </header>

            <div class="space-y-3 p-3">
              <div class="grid gap-2 text-xs sm:grid-cols-2">
                <div class="border border-zinc-800 bg-zinc-950/60 px-2.5 py-2">
                  <span class="block uppercase tracking-[0.12em] text-zinc-600">Post ID / locked</span>
                  <span class="mt-1 block truncate font-mono text-zinc-300">{{ item.baseDocument.id }}</span>
                </div>
                <div class="border border-zinc-800 bg-zinc-950/60 px-2.5 py-2">
                  <span class="block uppercase tracking-[0.12em] text-zinc-600">Slug / locked</span>
                  <span class="mt-1 block truncate font-mono text-zinc-300">{{ item.baseDocument.slug }}</span>
                </div>
              </div>

              @if (item.redirectRequired) {
                <p class="border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-xs leading-5 text-rose-200">
                  This recommendation requires a permanent redirect and remains blocked from the metadata-only review.
                </p>
              }

              <label class="grid gap-1.5 text-xs font-semibold text-zinc-300">
                SEO title
                <span class="border-l-2 border-zinc-700 bg-zinc-950/50 px-2 py-1.5 font-normal text-zinc-500">Before: {{ item.baseDocument.seo.title || 'Empty' }}</span>
                <input
                  type="text"
                  class="min-h-11 border border-zinc-700 bg-zinc-950 px-3 text-sm font-normal text-zinc-100 outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
                  [value]="item.candidateDocument.seo.title"
                  (input)="updateActiveSeoTitle(valueFromInput($event))"
                >
                <span class="text-right font-normal" [class.text-amber-300]="item.candidateDocument.seo.title.length > 60" [class.text-zinc-600]="item.candidateDocument.seo.title.length <= 60">{{ item.candidateDocument.seo.title.length }} / 60</span>
              </label>

              <label class="grid gap-1.5 text-xs font-semibold text-zinc-300">
                Meta description
                <span class="border-l-2 border-zinc-700 bg-zinc-950/50 px-2 py-1.5 font-normal leading-5 text-zinc-500">Before: {{ item.baseDocument.seo.description || 'Empty' }}</span>
                <textarea
                  rows="4"
                  class="border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-normal leading-5 text-zinc-100 outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
                  [value]="item.candidateDocument.seo.description"
                  (input)="updateActiveSeoDescription(valueFromInput($event))"
                ></textarea>
                <span class="text-right font-normal" [class.text-amber-300]="item.candidateDocument.seo.description.length > 160" [class.text-zinc-600]="item.candidateDocument.seo.description.length <= 160">{{ item.candidateDocument.seo.description.length }} / 160</span>
              </label>

              <label class="grid gap-1.5 text-xs font-semibold text-zinc-300">
                Categories
                <span class="font-normal text-zinc-600">Before: {{ item.baseDocument.categories.join(', ') || 'None' }}</span>
                <input
                  type="text"
                  class="min-h-11 border border-zinc-700 bg-zinc-950 px-3 text-sm font-normal text-zinc-100 outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
                  [value]="item.candidateDocument.categories.join(', ')"
                  placeholder="Comma-separated categories"
                  (input)="updateActiveCategories(valueFromInput($event))"
                >
              </label>

              <label class="grid gap-1.5 text-xs font-semibold text-zinc-300">
                Tags
                <span class="font-normal text-zinc-600">Before: {{ item.baseDocument.tags.join(', ') || 'None' }}</span>
                <input
                  type="text"
                  class="min-h-11 border border-zinc-700 bg-zinc-950 px-3 text-sm font-normal text-zinc-100 outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
                  [value]="item.candidateDocument.tags.join(', ')"
                  placeholder="Comma-separated tags"
                  (input)="updateActiveTags(valueFromInput($event))"
                >
              </label>

              @if (item.preview; as preview) {
                @if (preview.validation.errors.length > 0) {
                  <div class="border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-xs leading-5 text-rose-200">
                    @for (error of preview.validation.errors; track error) { <p>{{ error }}</p> }
                  </div>
                }
                @if (preview.validation.warnings.length > 0) {
                  <div class="border border-amber-400/40 bg-amber-400/5 px-3 py-2 text-xs leading-5 text-amber-200">
                    @for (warning of preview.validation.warnings; track warning) { <p>{{ warning }}</p> }
                  </div>
                }
              }

              <div class="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 pt-3">
                <p class="text-xs font-semibold text-emerald-300">
                  {{ item.preview?.validation?.protectedFieldsUnchanged === false ? 'Protected field conflict' : 'Protected fields unchanged' }}
                </p>
                <div class="flex flex-wrap gap-2">
                  <button type="button" class="min-h-10 border border-zinc-700 px-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" (click)="resetActiveCandidate()">Reset candidate</button>
                  <button type="button" class="min-h-10 border border-cyan-300 bg-cyan-300 px-3 text-xs font-bold text-zinc-950 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600" [disabled]="validatingDraft()" (click)="validateDraft()">
                    {{ validatingDraft() ? 'Validating...' : 'Validate draft' }}
                  </button>
                </div>
              </div>
            </div>
          } @else {
            <div class="grid min-h-72 place-items-center px-6 py-10 text-center">
              <div>
                <p class="text-sm font-semibold text-zinc-200">No review draft selected</p>
                <p class="mt-2 max-w-xs text-xs leading-5 text-zinc-500">Select one or more posts, then create a review draft to edit safe candidate fields.</p>
              </div>
            </div>
          }
        </section>
      </ng-template>
    </main>
  `,
})
export class ContentOperationsPageComponent {
  private readonly blogRepository = inject(BlogRepositoryService);

  protected readonly statusOptions = statusOptions;
  protected readonly auditOptions = auditOptions;
  protected readonly valueFromInput = valueFromInput;
  protected readonly valueFromSelect = valueFromSelect;
  protected readonly posts = toSignal(this.blogRepository.getAdminPosts$(), {initialValue: []});
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<ContentOperationStatusFilter>('all');
  protected readonly categoryFilter = signal('all');
  protected readonly auditFilter = signal<ContentOperationAuditFilter>('all');
  protected readonly selectedPostIds = signal<ReadonlySet<string>>(new Set());
  protected readonly manifest = signal<PostOptimizationManifest | null>(null);
  protected readonly manifestFileName = signal('');
  protected readonly workingItems = signal<readonly CmsContentOperationWorkingItem[]>([]);
  protected readonly activePostId = signal<string | null>(null);
  protected readonly validatingDraft = signal(false);
  protected readonly feedback = signal('');
  protected readonly feedbackIsError = signal(false);

  protected readonly manifestMatchResult = computed(() => {
    const manifest = this.manifest();
    return manifest ? matchOptimizationManifest(manifest, this.posts()) : null;
  });
  private readonly recommendationBySlug = computed(() => new Map(
    (this.manifestMatchResult()?.matches ?? []).map(match => [match.post.slug, match.recommendation])
  ));
  protected readonly categories = computed(() => [...new Set(
    this.posts().flatMap(post => post.categories)
  )].sort((left, right) => left.localeCompare(right)));
  protected readonly rows = computed<readonly ContentOperationPostRow[]>(() => this.posts().map(post => ({
    post,
    audit: createContentOperationPostAudit(post),
    recommendation: this.recommendationBySlug().get(post.slug) ?? null,
  })));
  protected readonly filteredRows = computed(() => {
    const searchTerm = normalizeSearch(this.searchTerm());
    const status = this.statusFilter();
    const category = this.categoryFilter();
    const audit = this.auditFilter();

    return this.rows().filter(row => {
      if (status !== 'all' && row.post.status !== status) {
        return false;
      }
      if (category !== 'all' && !row.post.categories.includes(category)) {
        return false;
      }
      if (!this.matchesAuditFilter(row.audit, audit)) {
        return false;
      }
      if (!searchTerm) {
        return true;
      }

      return normalizeSearch([
        row.post.title,
        row.post.slug,
        row.post.status,
        row.post.categories.join(' '),
        row.post.tags.join(' '),
      ].join(' ')).includes(searchTerm);
    });
  });
  protected readonly selectedCount = computed(() => this.posts().filter(post => this.selectedPostIds().has(post.id)).length);
  protected readonly allFilteredSelected = computed(() => this.filteredRows().length > 0
    && this.filteredRows().every(row => this.selectedPostIds().has(row.post.id)));
  protected readonly activeWorkingItem = computed(() => this.workingItems().find(item => item.baseDocument.id === this.activePostId()) ?? null);
  protected readonly activeDiffs = computed(() => {
    const item = this.activeWorkingItem();
    return item ? diffCmsPostArtifacts(item.baseDocument, item.candidateDocument) : [];
  });

  protected updateStatusFilter(event: Event): void {
    const value = valueFromSelect(event) as ContentOperationStatusFilter;
    if (statusValues.has(value)) {
      this.statusFilter.set(value);
    }
  }

  protected updateAuditFilter(event: Event): void {
    const value = valueFromSelect(event) as ContentOperationAuditFilter;
    if (auditValues.has(value)) {
      this.auditFilter.set(value);
    }
  }

  protected isSelected(postId: string): boolean {
    return this.selectedPostIds().has(postId);
  }

  protected togglePostSelection(postId: string, event: Event): void {
    const checked = event.target instanceof HTMLInputElement && event.target.checked;
    this.updateSelection(postId, checked);
  }

  protected toggleFilteredRows(event: Event): void {
    const checked = event.target instanceof HTMLInputElement && event.target.checked;
    const next = new Set(this.selectedPostIds());
    for (const row of this.filteredRows()) {
      if (checked) {
        next.add(row.post.id);
      } else {
        next.delete(row.post.id);
      }
    }
    this.selectedPostIds.set(next);
    this.reconcileWorkingItems(next);
  }

  protected selectFilteredRows(): void {
    const next = new Set(this.selectedPostIds());
    for (const row of this.filteredRows()) {
      next.add(row.post.id);
    }
    this.selectedPostIds.set(next);
  }

  protected clearSelection(): void {
    this.selectedPostIds.set(new Set());
    this.workingItems.set([]);
    this.activePostId.set(null);
  }

  protected selectManifestMatches(): void {
    const result = this.manifestMatchResult();
    if (!result) {
      return;
    }

    const safeMatches = result.matches.filter(match => !match.recommendation.redirectRequired);
    this.selectedPostIds.set(new Set(safeMatches.map(match => match.post.id)));
    this.workingItems.set([]);
    this.activePostId.set(null);
    const blockedCount = result.matches.length - safeMatches.length;
    this.setFeedback(`Selected ${safeMatches.length} slug-matched recommendations.${blockedCount ? ` ${blockedCount} redirect-required item remains excluded.` : ''}`);
  }

  protected async importManifest(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (input) {
      input.value = '';
    }
    if (!file) {
      return;
    }

    try {
      const manifest = parsePostOptimizationManifest(JSON.parse(await file.text()) as unknown);
      this.manifest.set(manifest);
      this.manifestFileName.set(file.name);
      this.workingItems.set([]);
      this.activePostId.set(null);
      const result = matchOptimizationManifest(manifest, this.posts());
      this.setFeedback(`Loaded ${manifest.posts.length} recommendations. ${result.matches.length} matched current posts by stable slug; no canonical posts were changed.`);
    } catch (error) {
      this.setFeedback(error instanceof Error ? error.message : 'Unable to parse the optimization manifest.', true);
    }
  }

  protected createReviewDraft(): void {
    const selectedIds = this.selectedPostIds();
    const selectedPosts = this.posts().filter(post => selectedIds.has(post.id));
    if (selectedPosts.length === 0) {
      this.setFeedback('Select at least one post before creating a review draft.', true);
      return;
    }

    const recommendations = this.recommendationBySlug();
    const workingItems = selectedPosts.map(post => {
      const recommendation = recommendations.get(post.slug);
      return createCmsWorkingItem(
        post,
        recommendation ? applyOptimizationRecommendation(post, recommendation) : post,
        {
          source: recommendation ? 'optimization-manifest' : 'manual',
          redirectRequired: recommendation?.redirectRequired ?? false,
        }
      );
    });

    this.workingItems.set(workingItems);
    this.activePostId.set(workingItems[0]?.baseDocument.id ?? null);
    this.setFeedback(`Prepared a local review draft for ${workingItems.length} post${workingItems.length === 1 ? '' : 's'}. Nothing was written to Firestore.`);
  }

  protected openCandidate(postId: string): void {
    if (!this.selectedPostIds().has(postId)) {
      this.updateSelection(postId, true);
    }

    const existing = this.workingItems().find(item => item.baseDocument.id === postId);
    if (!existing) {
      this.setFeedback('Create a review draft to edit this candidate.');
      return;
    }

    this.activePostId.set(postId);
  }

  protected updateActiveSeoTitle(value: string): void {
    this.updateActiveCandidate(post => ({...post, seo: {...post.seo, title: value}}));
  }

  protected updateActiveSeoDescription(value: string): void {
    this.updateActiveCandidate(post => ({...post, seo: {...post.seo, description: value}}));
  }

  protected updateActiveCategories(value: string): void {
    this.updateActiveCandidate(post => ({...post, categories: splitTerms(value)}));
  }

  protected updateActiveTags(value: string): void {
    this.updateActiveCandidate(post => ({...post, tags: splitTerms(value)}));
  }

  protected resetActiveCandidate(): void {
    this.updateActiveWorkingItem(item => ({
      ...item,
      candidateDocument: JSON.parse(JSON.stringify(item.baseDocument)) as BlogPost,
      preview: null,
    }));
  }

  protected async validateDraft(): Promise<void> {
    const workingItems = this.workingItems();
    if (workingItems.length === 0) {
      return;
    }

    this.validatingDraft.set(true);
    try {
      const previews = await Promise.all(workingItems.map(item => createContentOperationPreviewItem(item)));
      const nextItems = workingItems.map((item, index) => ({...item, preview: previews[index] ?? null}));
      const blockedCount = previews.filter(preview => preview.status === 'blocked').length;
      this.workingItems.set(nextItems);
      this.setFeedback(blockedCount > 0
        ? `Validation blocked ${blockedCount} candidate${blockedCount === 1 ? '' : 's'}. Review the protected-field and redirect warnings.`
        : `Validated ${previews.length} candidate artifact${previews.length === 1 ? '' : 's'} with protected fields unchanged.`
      );
    } catch (error) {
      this.setFeedback(error instanceof Error ? error.message : 'Unable to validate the review draft.', true);
    } finally {
      this.validatingDraft.set(false);
    }
  }

  protected formatDate(value: string): string {
    return dateFormatter.format(new Date(value));
  }

  protected statusLabel(status: BlogPostStatus): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  protected statusClass(status: BlogPostStatus): string {
    const base = 'inline-flex border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]';
    switch (status) {
      case 'published': return `${base} border-emerald-500/40 bg-emerald-500/10 text-emerald-300`;
      case 'scheduled': return `${base} border-cyan-500/40 bg-cyan-500/10 text-cyan-300`;
      case 'draft': return `${base} border-amber-500/40 bg-amber-500/10 text-amber-300`;
      case 'archived': return `${base} border-zinc-700 text-zinc-500`;
    }
  }

  protected auditClass(audit: ContentOperationPostAudit): string {
    return audit.status === 'ok' ? 'font-semibold text-emerald-300' : 'font-semibold text-amber-300';
  }

  private updateSelection(postId: string, selected: boolean): void {
    const next = new Set(this.selectedPostIds());
    if (selected) {
      next.add(postId);
    } else {
      next.delete(postId);
    }
    this.selectedPostIds.set(next);
    this.reconcileWorkingItems(next);
  }

  private reconcileWorkingItems(selectedPostIds: ReadonlySet<string>): void {
    const remainingItems = this.workingItems().filter(item => selectedPostIds.has(item.baseDocument.id));
    if (remainingItems.length === this.workingItems().length) {
      return;
    }

    this.workingItems.set(remainingItems);
    if (!remainingItems.some(item => item.baseDocument.id === this.activePostId())) {
      this.activePostId.set(remainingItems[0]?.baseDocument.id ?? null);
    }
  }

  private updateActiveCandidate(transform: (post: BlogPost) => BlogPost): void {
    this.updateActiveWorkingItem(item => ({
      ...item,
      candidateDocument: transform(item.candidateDocument),
      preview: null,
    }));
  }

  private updateActiveWorkingItem(transform: (item: CmsContentOperationWorkingItem) => CmsContentOperationWorkingItem): void {
    const activePostId = this.activePostId();
    if (!activePostId) {
      return;
    }

    this.workingItems.update(items => items.map(item => item.baseDocument.id === activePostId ? transform(item) : item));
  }

  private matchesAuditFilter(audit: ContentOperationPostAudit, filter: ContentOperationAuditFilter): boolean {
    switch (filter) {
      case 'all': return true;
      case 'any-issue': return audit.issueCount > 0;
      case 'missing-title': return audit.issueIds.includes('title');
      case 'missing-description': return audit.issueIds.includes('description');
      case 'missing-alt': return audit.issueIds.includes('image-alt');
    }
  }

  private setFeedback(message: string, isError = false): void {
    this.feedback.set(message);
    this.feedbackIsError.set(isError);
  }
}
