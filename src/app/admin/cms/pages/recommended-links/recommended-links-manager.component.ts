import {ChangeDetectionStrategy, Component, effect, inject, untracked} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';

import {
  RecommendedLink,
  RecommendedLinkFeaturedSlot,
  RecommendedLinkStatus,
  RECOMMENDED_LINK_FEATURED_SLOTS,
  RECOMMENDED_LINK_STATUSES,
} from '../../../../features/recommended-links/models/recommended-link.model';
import {
  RecommendedLinkRepositoryService
} from '../../../../features/recommended-links/services/recommended-link-repository.service';
import {
  isRecommendedLinkFeaturedSlot,
  isRecommendedLinkStatus,
} from '../../../../features/recommended-links/utils/recommended-link-validation.util';
import {CmsToastContainerComponent} from '../../components/toast/cms-toast.component';
import {CmsToastService} from '../../services/cms-toast.service';
import {AdminAlertComponent} from '../../../shared/admin-alert.component';
import {AdminEditorActionBarComponent} from '../../../shared/admin-editor-action-bar.component';
import {AdminEmptyStateComponent} from '../../../shared/admin-empty-state.component';
import {AdminPageHeaderComponent} from '../../../shared/admin-page-header.component';
import {AdminSearchFieldComponent} from '../../../shared/admin-search-field.component';
import {AdminStatCardComponent} from '../../../shared/admin-stat-card.component';

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

@Component({
  selector: 'app-cms-recommended-links-manager',
  imports: [
    AdminAlertComponent,
    AdminEditorActionBarComponent,
    AdminEmptyStateComponent,
    AdminPageHeaderComponent,
    AdminSearchFieldComponent,
    AdminStatCardComponent,
    ReactiveFormsModule,
    CmsToastContainerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-7xl space-y-8">
        <app-admin-page-header
          title="Recommended Links"
          description="Manage the homepage recommendation pool. Assign a published link to featured slot 1, 2, or 3 to rotate what appears below the author bio."
        >
          <div adminPageHeaderActions class="contents">
            <button
              type="button"
              class="inline-flex justify-center border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950"
              (click)="createRecommendedLink()"
            >
              New Link
            </button>
            <button
              type="button"
              class="inline-flex justify-center border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
              [disabled]="refreshInProgress"
              (click)="refreshRecommendedLinksFromFirestore()"
            >
              {{ refreshInProgress ? 'Refreshing...' : 'Refresh Firestore' }}
            </button>
            <button
              type="button"
              class="inline-flex justify-center border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
              [disabled]="seedInProgress"
              (click)="seedDefaultRecommendedLinks()"
            >
              {{ seedInProgress ? 'Seeding...' : 'Seed Defaults' }}
            </button>
          </div>
        </app-admin-page-header>

        <section class="grid gap-4 sm:grid-cols-5">
          <app-admin-stat-card label="Total Links" [value]="stats().total"></app-admin-stat-card>
          <app-admin-stat-card label="Published" [value]="stats().published"></app-admin-stat-card>
          <app-admin-stat-card label="Featured Slots" [value]="stats().featured + '/3'"></app-admin-stat-card>
          <app-admin-stat-card label="Drafts" [value]="stats().drafts"></app-admin-stat-card>
          <app-admin-stat-card label="Archived" [value]="stats().archived"></app-admin-stat-card>
        </section>

        @if (loadError(); as error) {
          <app-admin-alert [message]="error"></app-admin-alert>
        }

        <section class="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside class="space-y-4 border border-zinc-800 bg-zinc-900/70 p-4">
            <app-admin-search-field
              label="Search links"
              placeholder="Search title, host, tag..."
              [value]="searchTerm"
              (valueChange)="searchTerm = $event"
            ></app-admin-search-field>

            <div class="space-y-2" aria-label="Recommended link list">
              @for (link of filteredRecommendedLinks(); track link.id) {
                <button
                  type="button"
                  class="grid w-full gap-2 border p-3 text-left transition hover:border-cyan-400 hover:bg-zinc-800/80"
                  [class.border-cyan-400]="link.id === selectedRecommendedLinkId"
                  [class.bg-zinc-800]="link.id === selectedRecommendedLinkId"
                  [class.border-zinc-800]="link.id !== selectedRecommendedLinkId"
                  (click)="selectRecommendedLink(link)"
                >
                  <span class="flex items-center justify-between gap-3">
                    <span class="min-w-0 truncate text-sm font-semibold text-zinc-100">{{ link.title }}</span>
                    <span [class]="statusClass(link.status)">{{ link.status }}</span>
                  </span>
                  <span class="text-xs text-zinc-500">{{ link.host || link.href }}</span>
                  <span class="flex items-center justify-between gap-3 text-xs text-zinc-500">
                    <span>{{ link.featuredSlot ? 'Slot ' + link.featuredSlot : 'Not featured' }}</span>
                    <span>order {{ link.displayOrder }}</span>
                  </span>
                </button>
              } @empty {
                <app-admin-empty-state
                  message="No links found. Seed the current defaults or create a new draft link."
                ></app-admin-empty-state>
              }
            </div>
          </aside>

          <form
            class="space-y-6 border border-zinc-800 bg-zinc-900/70 p-5"
            [formGroup]="recommendedLinkForm"
            (ngSubmit)="saveRecommendedLink()"
          >
            <section class="grid gap-4 md:grid-cols-[1fr_170px_170px_150px]">
              <label class="space-y-2">
                <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Title</span>
                <input
                  type="text"
                  formControlName="title"
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                >
              </label>
              <label class="space-y-2">
                <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Status</span>
                <select
                  formControlName="status"
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                >
                  @for (status of recommendedLinkStatuses; track status) {
                    <option [value]="status">{{ status }}</option>
                  }
                </select>
              </label>
              <label class="space-y-2">
                <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Featured slot</span>
                <select
                  formControlName="featuredSlotText"
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                >
                  <option value="">Not featured</option>
                  @for (slot of featuredSlots; track slot) {
                    <option [value]="slot">Slot {{ slot }}</option>
                  }
                </select>
              </label>
              <label class="space-y-2">
                <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Display order</span>
                <input
                  type="number"
                  formControlName="displayOrder"
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                >
              </label>
            </section>

            <section class="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <label class="space-y-2">
                <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Meta label</span>
                <input
                  type="text"
                  formControlName="meta"
                  placeholder="AI tools"
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300"
                >
              </label>
              <label class="space-y-2">
                <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">URL</span>
                <input
                  type="url"
                  formControlName="href"
                  placeholder="https://example.com"
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300"
                >
              </label>
            </section>

            <section class="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
              <label class="space-y-2">
                <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Description</span>
                <textarea
                  rows="4"
                  formControlName="description"
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                ></textarea>
              </label>
              <label class="space-y-2">
                <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Display host</span>
                <input
                  type="text"
                  formControlName="host"
                  placeholder="Leave blank to infer"
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300"
                >
                <span class="block text-xs leading-5 text-zinc-500">Shown in the homepage button. Leave blank to infer from the URL when saving.</span>
              </label>
            </section>

            <section class="grid gap-4 border-t border-zinc-800 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
              <div class="space-y-2">
                <h2 class="text-lg font-semibold text-zinc-50">Featured Rotation</h2>
                <p class="text-sm leading-6 text-zinc-400">
                  The public homepage renders published links assigned to slots 1, 2, and 3. Saving a link into an occupied slot automatically removes that slot from the previous link.
                </p>
              </div>

              <article class="border border-zinc-800 bg-zinc-950 p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">{{ recommendedLinkForm.controls.meta.value || 'Resource' }}</p>
                <h3 class="mt-3 text-2xl font-semibold text-zinc-50">{{ recommendedLinkForm.controls.title.value || 'Untitled Link' }}</h3>
                <p class="mt-3 text-sm leading-6 text-zinc-400">
                  {{ recommendedLinkForm.controls.description.value || 'Add a short description for the homepage card.' }}
                </p>
                <span class="mt-5 inline-flex w-fit items-center border border-cyan-400 px-3 py-2 text-sm font-semibold text-cyan-200">
                  {{ recommendedLinkForm.controls.host.value || 'display-host' }}
                </span>
              </article>
            </section>

            <app-admin-editor-action-bar [status]="editorActionStatus" [busy]="saveInProgress">
              <div adminEditorActions class="contents">
                <button
                  type="button"
                  class="inline-flex justify-center border border-red-500/60 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
                  [disabled]="!selectedRecommendedLinkId || saveInProgress"
                  (click)="deleteSelectedRecommendedLink()"
                >
                  Delete
                </button>
                <button
                  type="submit"
                  class="inline-flex justify-center border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
                  [disabled]="recommendedLinkForm.invalid || saveInProgress"
                >
                  {{ saveInProgress ? 'Saving...' : 'Save Link' }}
                </button>
              </div>
            </app-admin-editor-action-bar>
          </form>
        </section>
      </section>

      <app-cms-toast-container></app-cms-toast-container>
    </main>
  `,
})
export class CmsRecommendedLinksManagerComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly recommendedLinkRepository = inject(RecommendedLinkRepositoryService);
  private readonly toast = inject(CmsToastService);

  protected readonly recommendedLinkStatuses = RECOMMENDED_LINK_STATUSES;
  protected readonly featuredSlots = RECOMMENDED_LINK_FEATURED_SLOTS;
  protected readonly recommendedLinks = toSignal(
    this.recommendedLinkRepository.getAdminRecommendedLinks$(),
    {initialValue: this.recommendedLinkRepository.getAdminRecommendedLinks()}
  );
  protected readonly stats = toSignal(
    this.recommendedLinkRepository.getAdminStats$(),
    {initialValue: this.recommendedLinkRepository.getAdminStats()}
  );
  protected readonly loadError = toSignal(this.recommendedLinkRepository.error$, {initialValue: null});
  protected readonly recommendedLinkForm = this.formBuilder.nonNullable.group({
    id: [''],
    title: ['', Validators.required],
    description: [''],
    meta: ['Resource', Validators.required],
    href: ['', Validators.required],
    host: [''],
    status: ['draft' as RecommendedLinkStatus, Validators.required],
    featuredSlotText: [''],
    displayOrder: [0, Validators.required],
    createdAt: [''],
  });

  protected searchTerm = '';
  protected selectedRecommendedLinkId: string | null = null;
  protected saveInProgress = false;
  protected refreshInProgress = false;
  protected seedInProgress = false;

  constructor() {
    effect(() => {
      const recommendedLinks = this.recommendedLinks();
      const selectedLinkStillExists = recommendedLinks.some(link => link.id === this.selectedRecommendedLinkId);

      if (recommendedLinks.length > 0 && (!this.selectedRecommendedLinkId || !selectedLinkStillExists)) {
        untracked(() => this.selectRecommendedLink(recommendedLinks[0]));
      }
    });
  }

  protected filteredRecommendedLinks(): readonly RecommendedLink[] {
    const normalizedSearchTerm = normalizeSearchValue(this.searchTerm);

    if (!normalizedSearchTerm) {
      return this.recommendedLinks();
    }

    return this.recommendedLinks().filter(link => normalizeSearchValue([
      link.title,
      link.meta,
      link.description,
      link.href,
      link.host,
      link.status,
      link.featuredSlot ? `slot ${link.featuredSlot}` : 'not featured',
    ].join(' ')).includes(normalizedSearchTerm));
  }

  protected selectRecommendedLink(link: RecommendedLink): void {
    this.selectedRecommendedLinkId = link.id;
    this.patchRecommendedLinkForm(link);
  }

  protected createRecommendedLink(): void {
    const link = this.recommendedLinkRepository.createNewRecommendedLinkTemplate();
    this.selectRecommendedLink(link);
  }

  protected async saveRecommendedLink(): Promise<void> {
    if (this.recommendedLinkForm.invalid) {
      this.recommendedLinkForm.markAllAsTouched();
      return;
    }

    this.saveInProgress = true;

    try {
      const savedLink = await this.recommendedLinkRepository.saveRecommendedLink(this.createRecommendedLinkFromForm());
      this.selectedRecommendedLinkId = savedLink.id;
      this.patchRecommendedLinkForm(savedLink);
      this.toast.success(`Saved "${savedLink.title}".`);
    } catch (error) {
      this.toast.error(`Unable to save recommended link: ${getErrorMessage(error)}`);
    } finally {
      this.saveInProgress = false;
    }
  }

  protected async deleteSelectedRecommendedLink(): Promise<void> {
    const link = this.createRecommendedLinkFromForm();
    const confirmed = window.confirm(`Delete "${link.title}" from Firestore?`);

    if (!confirmed) {
      return;
    }

    this.saveInProgress = true;

    try {
      const result = await this.recommendedLinkRepository.deleteRecommendedLink(link.id);

      if (result === 'not-found') {
        this.toast.error(`Could not delete "${link.title}" because it was not found.`);
      } else {
        this.toast.success(`Deleted "${link.title}".`);
      }

      this.selectedRecommendedLinkId = null;
      this.recommendedLinkForm.reset(this.createRecommendedLinkFormValue(this.recommendedLinkRepository.createNewRecommendedLinkTemplate()));
    } catch (error) {
      this.toast.error(`Unable to delete recommended link: ${getErrorMessage(error)}`);
    } finally {
      this.saveInProgress = false;
    }
  }

  protected async refreshRecommendedLinksFromFirestore(): Promise<void> {
    this.refreshInProgress = true;

    try {
      const links = await this.recommendedLinkRepository.loadRecommendedLinksFromFirestore();
      this.toast.success(`Refreshed ${links.length} recommended link${links.length === 1 ? '' : 's'} from Firestore.`);
    } catch (error) {
      this.toast.error(`Unable to refresh recommended links: ${getErrorMessage(error)}`);
    } finally {
      this.refreshInProgress = false;
    }
  }

  protected async seedDefaultRecommendedLinks(): Promise<void> {
    const confirmed = window.confirm('Seed the current default recommended links into Firestore? Existing matching link IDs will be updated.');

    if (!confirmed) {
      return;
    }

    this.seedInProgress = true;

    try {
      const linkCount = await this.recommendedLinkRepository.seedDefaultRecommendedLinks();
      await this.recommendedLinkRepository.loadRecommendedLinksFromFirestore();
      this.toast.success(`Seeded ${linkCount} default recommended link${linkCount === 1 ? '' : 's'} into Firestore.`);
    } catch (error) {
      this.toast.error(`Unable to seed recommended links: ${getErrorMessage(error)}`);
    } finally {
      this.seedInProgress = false;
    }
  }

  protected statusClass(status: RecommendedLinkStatus): string {
    switch (status) {
      case 'published':
        return 'shrink-0 text-xs uppercase tracking-wide text-emerald-300';
      case 'archived':
        return 'shrink-0 text-xs uppercase tracking-wide text-zinc-600';
      default:
        return 'shrink-0 text-xs uppercase tracking-wide text-amber-300';
    }
  }

  protected get editorActionStatus(): string {
    if (this.saveInProgress) {
      return 'Saving recommended link...';
    }

    if (this.recommendedLinkForm.dirty) {
      return this.selectedRecommendedLinkId
        ? `Unsaved changes for ${this.selectedRecommendedLinkId}.`
        : 'Unsaved changes for a new recommended link.';
    }

    return this.selectedRecommendedLinkId
      ? `Editing ${this.selectedRecommendedLinkId}`
      : 'Create or select a recommended link to begin.';
  }

  private patchRecommendedLinkForm(link: RecommendedLink): void {
    this.recommendedLinkForm.reset(this.createRecommendedLinkFormValue(link));
  }

  private createRecommendedLinkFormValue(link: RecommendedLink) {
    return {
      id: link.id,
      title: link.title,
      description: link.description,
      meta: link.meta,
      href: link.href,
      host: link.host,
      status: link.status,
      featuredSlotText: link.featuredSlot?.toString() ?? '',
      displayOrder: link.displayOrder,
      createdAt: link.createdAt,
    };
  }

  private createRecommendedLinkFromForm(): RecommendedLink {
    const raw = this.recommendedLinkForm.getRawValue();
    const status: RecommendedLinkStatus = isRecommendedLinkStatus(raw.status) ? raw.status : 'draft';
    const featuredSlot = this.parseFeaturedSlot(raw.featuredSlotText);
    const now = new Date().toISOString();

    return {
      id: raw.id || this.recommendedLinkRepository.createNewRecommendedLinkTemplate().id,
      title: raw.title,
      description: raw.description,
      meta: raw.meta,
      href: raw.href,
      host: raw.host,
      status,
      featuredSlot,
      displayOrder: Number(raw.displayOrder),
      createdAt: raw.createdAt || now,
      updatedAt: now,
    };
  }

  private parseFeaturedSlot(value: string): RecommendedLinkFeaturedSlot | null {
    const parsedValue = Number(value);
    return isRecommendedLinkFeaturedSlot(parsedValue) ? parsedValue : null;
  }
}
