import {ChangeDetectionStrategy, Component, effect, inject, untracked} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';

import {
  TOPIC_HUB_ICONS,
  TOPIC_HUB_STATUSES,
  resolveTopicHubHeroImage,
  resolveTopicHubPageCopy,
  TopicHub,
  TopicHubIcon,
  TopicHubStatus,
} from '../../../../features/topics/topic-hubs.data';
import {TopicHubRepositoryService} from '../../../../features/topics/services/topic-hub-repository.service';
import {
  isTopicHubIcon,
  isTopicHubStatus,
} from '../../../../features/topics/utils/topic-hub-validation.util';
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
  selector: 'app-cms-topic-manager',
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
          title="Topics"
          description="Manage topic landing pages, homepage topic cards, search visibility, and the current floating field styling."
        >
          <div adminPageHeaderActions class="contents">
            <button
              type="button"
              class="inline-flex justify-center border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950"
              (click)="createTopic()"
            >
              New Topic
            </button>
            <button
              type="button"
              class="inline-flex justify-center border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
              [disabled]="refreshInProgress"
              (click)="refreshTopicsFromFirestore()"
            >
              {{ refreshInProgress ? 'Refreshing...' : 'Refresh Firestore' }}
            </button>
            <button
              type="button"
              class="inline-flex justify-center border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
              [disabled]="seedInProgress"
              (click)="seedDefaultTopics()"
            >
              {{ seedInProgress ? 'Seeding...' : 'Seed Missing Defaults' }}
            </button>
          </div>
        </app-admin-page-header>

        <section class="grid gap-4 sm:grid-cols-4">
          <app-admin-stat-card label="Total Topics" [value]="stats().total"></app-admin-stat-card>
          <app-admin-stat-card label="Published" [value]="stats().published"></app-admin-stat-card>
          <app-admin-stat-card label="Drafts" [value]="stats().drafts"></app-admin-stat-card>
          <app-admin-stat-card label="Archived" [value]="stats().archived"></app-admin-stat-card>
        </section>

        @if (loadError(); as error) {
          <app-admin-alert [message]="error"></app-admin-alert>
        }

        <section class="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside class="space-y-4 border border-zinc-800 bg-zinc-900/70 p-4">
            <app-admin-search-field
              label="Search topics"
              placeholder="Search title, slug, terms..."
              [value]="searchTerm"
              (valueChange)="searchTerm = $event"
            ></app-admin-search-field>

            <div class="space-y-2" aria-label="Topic list">
              @for (topic of filteredTopics(); track topic.id) {
                <button
                  type="button"
                  class="grid w-full gap-2 border p-3 text-left transition hover:border-cyan-400 hover:bg-zinc-800/80"
                  [class.border-cyan-400]="topic.id === selectedTopicId"
                  [class.bg-zinc-800]="topic.id === selectedTopicId"
                  [class.border-zinc-800]="topic.id !== selectedTopicId"
                  (click)="selectTopic(topic)"
                >
                  <span class="flex items-center justify-between gap-3">
                    <span class="min-w-0 truncate text-sm font-semibold text-zinc-100">{{ topic.title }}</span>
                    <span class="shrink-0 text-xs uppercase tracking-wide text-zinc-500">{{ topic.status }}</span>
                  </span>
                  <span class="text-xs text-zinc-500">/{{ topic.slug }} / order {{ topic.displayOrder }}</span>
                  <span class="h-1.5 w-full" [style.background]="topic.theme.accent"></span>
                </button>
              } @empty {
                <app-admin-empty-state
                  message="No topics found. Seed the current defaults or create a new draft topic."
                ></app-admin-empty-state>
              }
            </div>
          </aside>

          <form
            class="space-y-6 border border-zinc-800 bg-zinc-900/70 p-5"
            [formGroup]="topicForm"
            (ngSubmit)="saveTopic()"
          >
            <section class="grid gap-4 md:grid-cols-[1fr_180px_160px]">
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
                  @for (status of topicStatuses; track status) {
                    <option [value]="status">{{ status }}</option>
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

            <section class="grid gap-4 md:grid-cols-2">
              <label class="space-y-2">
                <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Slug</span>
                <input
                  type="text"
                  formControlName="slug"
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                >
              </label>
              <label class="space-y-2">
                <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Eyebrow</span>
                <input
                  type="text"
                  formControlName="eyebrow"
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                >
              </label>
            </section>

            <section class="grid gap-4">
              <label class="space-y-2">
                <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Homepage/topic card description</span>
                <textarea
                  rows="3"
                  formControlName="description"
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                ></textarea>
              </label>
              <label class="space-y-2">
                <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Topic page summary</span>
                <textarea
                  rows="3"
                  formControlName="summary"
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                ></textarea>
              </label>
              <label class="space-y-2">
                <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Search terms / matching terms</span>
                <textarea
                  rows="4"
                  formControlName="termsText"
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                  placeholder="One term per line"
                ></textarea>
              </label>
            </section>

            <section class="space-y-4 border-t border-zinc-800 pt-5" formGroupName="theme">
              <div>
                <h2 class="text-lg font-semibold text-zinc-50">Visual Theme</h2>
                <p class="mt-1 text-sm text-zinc-500">These fields drive the homepage floating field and topic page accent system.</p>
              </div>

              <div class="grid gap-4 md:grid-cols-4">
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Short label</span>
                  <input
                    type="text"
                    formControlName="shortLabel"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                  >
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Icon</span>
                  <select
                    formControlName="icon"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                  >
                    @for (icon of topicIcons; track icon) {
                      <option [value]="icon">{{ icon }}</option>
                    }
                  </select>
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Accent</span>
                  <input
                    type="color"
                    formControlName="accent"
                    class="h-10 w-full border border-zinc-700 bg-zinc-950 p-1"
                  >
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Strong accent</span>
                  <input
                    type="color"
                    formControlName="accentStrong"
                    class="h-10 w-full border border-zinc-700 bg-zinc-950 p-1"
                  >
                </label>
              </div>

              <div class="grid gap-4 md:grid-cols-5" formGroupName="mapPlacement">
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">X%</span>
                  <input type="number" formControlName="xPercent" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Y%</span>
                  <input type="number" formControlName="yPercent" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Depth</span>
                  <input type="number" formControlName="depth" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Scale</span>
                  <input type="number" step="0.01" formControlName="scale" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Float delay ms</span>
                  <input type="number" formControlName="floatDelayMs" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                </label>
              </div>

              <label class="space-y-2">
                <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Hero motifs</span>
                <textarea
                  rows="3"
                  formControlName="heroMotifsText"
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                  placeholder="One motif per line"
                ></textarea>
              </label>
            </section>

            <section class="grid gap-6 border-t border-zinc-800 pt-5 xl:grid-cols-2">
              <div class="space-y-4" formGroupName="heroImage">
                <div>
                  <h2 class="text-lg font-semibold text-zinc-50">Topic artwork</h2>
                  <p class="mt-1 text-sm text-zinc-500">Use a text-free editorial image with a stable crop and meaningful alt text.</p>
                </div>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Image path or URL</span>
                  <input
                    type="text"
                    formControlName="src"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                    placeholder="/assets/images/topics/topic-name.webp"
                  >
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Alt text</span>
                  <textarea
                    rows="2"
                    formControlName="alt"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                  ></textarea>
                </label>
                <div class="grid gap-4 sm:grid-cols-3">
                  <label class="space-y-2">
                    <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Width</span>
                    <input type="number" min="1" formControlName="width" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                  </label>
                  <label class="space-y-2">
                    <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Height</span>
                    <input type="number" min="1" formControlName="height" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                  </label>
                  <label class="space-y-2">
                    <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Object position</span>
                    <input type="text" formControlName="objectPosition" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300" placeholder="center">
                  </label>
                </div>
              </div>

              <div class="space-y-4" formGroupName="pageCopy">
                <div>
                  <h2 class="text-lg font-semibold text-zinc-50">Post section language</h2>
                  <p class="mt-1 text-sm text-zinc-500">Give each topic page its own useful introduction to the writing.</p>
                </div>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Featured heading</span>
                  <input type="text" formControlName="featuredHeading" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Featured description</span>
                  <textarea rows="2" formControlName="featuredDescription" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"></textarea>
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Archive heading</span>
                  <input type="text" formControlName="archiveHeading" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Archive description</span>
                  <textarea rows="2" formControlName="archiveDescription" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"></textarea>
                </label>
              </div>
            </section>

            <section class="grid gap-4 border-t border-zinc-800 pt-5 md:grid-cols-2" formGroupName="asset">
              <div class="space-y-4">
                <h2 class="text-lg font-semibold text-zinc-50">Start Here Asset</h2>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Title</span>
                  <input type="text" formControlName="title" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Intro</span>
                  <textarea rows="4" formControlName="intro" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"></textarea>
                </label>
              </div>
              <label class="space-y-2">
                <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Checklist items</span>
                <textarea
                  rows="10"
                  formControlName="itemsText"
                  class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                  placeholder="Label | Description"
                ></textarea>
              </label>
            </section>

            <section class="grid gap-4 border-t border-zinc-800 pt-5 md:grid-cols-2">
              <div class="space-y-4" formGroupName="featuredProject">
                <h2 class="text-lg font-semibold text-zinc-50">Featured Project</h2>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Label</span>
                  <input type="text" formControlName="label" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Title</span>
                  <input type="text" formControlName="title" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Description</span>
                  <textarea rows="3" formControlName="description" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"></textarea>
                </label>
                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="space-y-2">
                    <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Href</span>
                    <input type="text" formControlName="href" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                  </label>
                  <label class="space-y-2">
                    <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">CTA label</span>
                    <input type="text" formControlName="ctaLabel" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                  </label>
                </div>
              </div>

              <div class="space-y-4">
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Learning path</span>
                  <textarea
                    rows="8"
                    formControlName="learningPathText"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                    placeholder="Label | Title | Description"
                  ></textarea>
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Quick reference checklist</span>
                  <textarea
                    rows="5"
                    formControlName="checklistText"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                    placeholder="One item per line"
                  ></textarea>
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Resources</span>
                  <textarea
                    rows="5"
                    formControlName="resourcesText"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                    placeholder="Label | Description | Href"
                  ></textarea>
                </label>
              </div>
            </section>

            <app-admin-editor-action-bar [status]="editorActionStatus" [busy]="saveInProgress">
              <div adminEditorActions class="contents">
                <button
                  type="button"
                  class="inline-flex justify-center border border-red-500/60 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
                  [disabled]="!selectedTopicId || saveInProgress"
                  (click)="deleteSelectedTopic()"
                >
                  Delete
                </button>
                <button
                  type="submit"
                  class="inline-flex justify-center border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
                  [disabled]="topicForm.invalid || saveInProgress"
                >
                  {{ saveInProgress ? 'Saving...' : 'Save Topic' }}
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
export class CmsTopicManagerComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly topicHubRepository = inject(TopicHubRepositoryService);
  private readonly toast = inject(CmsToastService);

  protected readonly topicStatuses = TOPIC_HUB_STATUSES;
  protected readonly topicIcons = TOPIC_HUB_ICONS;
  protected readonly topics = toSignal(
    this.topicHubRepository.getAdminTopicHubs$(),
    {initialValue: this.topicHubRepository.getAdminTopicHubs()}
  );
  protected readonly stats = toSignal(
    this.topicHubRepository.getAdminStats$(),
    {initialValue: this.topicHubRepository.getAdminStats()}
  );
  protected readonly loadError = toSignal(this.topicHubRepository.error$, {initialValue: null});
  protected readonly topicForm = this.formBuilder.nonNullable.group({
    id: [''],
    slug: ['', Validators.required],
    eyebrow: [''],
    title: ['', Validators.required],
    description: [''],
    summary: [''],
    status: ['draft' as TopicHubStatus, Validators.required],
    displayOrder: [0, Validators.required],
    termsText: [''],
    theme: this.formBuilder.nonNullable.group({
      shortLabel: [''],
      accent: ['#22d3ee'],
      accentStrong: ['#67e8f9'],
      icon: ['spark' as TopicHubIcon],
      heroMotifsText: [''],
      mapPlacement: this.formBuilder.nonNullable.group({
        xPercent: [50],
        yPercent: [50],
        depth: [1],
        scale: [1],
        floatDelayMs: [0],
      }),
    }),
    heroImage: this.formBuilder.nonNullable.group({
      src: [''],
      alt: [''],
      width: [1600],
      height: [900],
      objectPosition: ['center'],
    }),
    pageCopy: this.formBuilder.nonNullable.group({
      featuredHeading: [''],
      featuredDescription: [''],
      archiveHeading: [''],
      archiveDescription: [''],
    }),
    asset: this.formBuilder.nonNullable.group({
      title: [''],
      intro: [''],
      itemsText: [''],
    }),
    featuredProject: this.formBuilder.nonNullable.group({
      label: ['Featured project'],
      title: [''],
      description: [''],
      href: [''],
      ctaLabel: ['Open project'],
    }),
    learningPathText: [''],
    checklistText: [''],
    resourcesText: [''],
    createdAt: [''],
  });

  protected searchTerm = '';
  protected selectedTopicId: string | null = null;
  protected saveInProgress = false;
  protected refreshInProgress = false;
  protected seedInProgress = false;

  constructor() {
    effect(() => {
      const topics = this.topics();
      const selectedTopicStillExists = topics.some(topic => topic.id === this.selectedTopicId);

      if (topics.length > 0 && (!this.selectedTopicId || !selectedTopicStillExists)) {
        untracked(() => this.selectTopic(topics[0]));
      }
    });
  }

  protected filteredTopics(): readonly TopicHub[] {
    const normalizedSearchTerm = normalizeSearchValue(this.searchTerm);

    if (!normalizedSearchTerm) {
      return this.topics();
    }

    return this.topics().filter(topic => normalizeSearchValue([
      topic.title,
      topic.slug,
      topic.eyebrow,
      topic.description,
      topic.summary,
      topic.status,
      ...topic.terms,
    ].join(' ')).includes(normalizedSearchTerm));
  }

  protected selectTopic(topic: TopicHub): void {
    this.selectedTopicId = topic.id;
    this.patchTopicForm(topic);
  }

  protected createTopic(): void {
    const topic = this.topicHubRepository.createNewTopicTemplate();
    this.selectTopic(topic);
  }

  protected async saveTopic(): Promise<void> {
    if (this.topicForm.invalid) {
      this.topicForm.markAllAsTouched();
      return;
    }

    this.saveInProgress = true;

    try {
      const savedTopic = await this.topicHubRepository.saveTopicHub(this.createTopicFromForm());
      this.selectedTopicId = savedTopic.id;
      this.patchTopicForm(savedTopic);
      this.toast.success(`Saved "${savedTopic.title}".`);
    } catch (error) {
      this.toast.error(`Unable to save topic: ${getErrorMessage(error)}`);
    } finally {
      this.saveInProgress = false;
    }
  }

  protected async deleteSelectedTopic(): Promise<void> {
    const topic = this.createTopicFromForm();
    const confirmed = window.confirm(`Delete "${topic.title}" from Firestore?`);

    if (!confirmed) {
      return;
    }

    this.saveInProgress = true;

    try {
      const result = await this.topicHubRepository.deleteTopicHub(topic.id);

      if (result === 'not-found') {
        this.toast.error(`Could not delete "${topic.title}" because it was not found.`);
      } else {
        this.toast.success(`Deleted "${topic.title}".`);
      }

      this.selectedTopicId = null;
      this.topicForm.reset(this.createTopicFormValue(this.topicHubRepository.createNewTopicTemplate()));
    } catch (error) {
      this.toast.error(`Unable to delete topic: ${getErrorMessage(error)}`);
    } finally {
      this.saveInProgress = false;
    }
  }

  protected async refreshTopicsFromFirestore(): Promise<void> {
    this.refreshInProgress = true;

    try {
      const topics = await this.topicHubRepository.loadTopicHubsFromFirestore();
      this.toast.success(`Refreshed ${topics.length} topic${topics.length === 1 ? '' : 's'} from Firestore.`);
    } catch (error) {
      this.toast.error(`Unable to refresh topics: ${getErrorMessage(error)}`);
    } finally {
      this.refreshInProgress = false;
    }
  }

  protected async seedDefaultTopics(): Promise<void> {
    const confirmed = window.confirm('Seed code-defined topics that are missing from Firestore? Existing topics will not be changed.');

    if (!confirmed) {
      return;
    }

    this.seedInProgress = true;

    try {
      const topicCount = await this.topicHubRepository.seedDefaultTopicHubs();
      await this.topicHubRepository.loadTopicHubsFromFirestore();
      this.toast.success(topicCount === 0
        ? 'All default topics already exist in Firestore.'
        : `Seeded ${topicCount} missing default topic${topicCount === 1 ? '' : 's'} into Firestore.`);
    } catch (error) {
      this.toast.error(`Unable to seed topics: ${getErrorMessage(error)}`);
    } finally {
      this.seedInProgress = false;
    }
  }

  protected get editorActionStatus(): string {
    if (this.saveInProgress) {
      return 'Saving topic...';
    }

    if (this.topicForm.dirty) {
      return this.selectedTopicId
        ? `Unsaved changes for ${this.selectedTopicId}.`
        : 'Unsaved changes for a new topic.';
    }

    return this.selectedTopicId
      ? `Editing ${this.selectedTopicId}`
      : 'Create or select a topic to begin.';
  }

  private patchTopicForm(topic: TopicHub): void {
    this.topicForm.reset(this.createTopicFormValue(topic));
  }

  private createTopicFormValue(topic: TopicHub) {
    const heroImage = resolveTopicHubHeroImage(topic);
    const pageCopy = resolveTopicHubPageCopy(topic);

    return {
      id: topic.id,
      slug: topic.slug,
      eyebrow: topic.eyebrow,
      title: topic.title,
      description: topic.description,
      summary: topic.summary,
      status: topic.status,
      displayOrder: topic.displayOrder,
      termsText: this.formatStringList(topic.terms),
      theme: {
        shortLabel: topic.theme.shortLabel,
        accent: topic.theme.accent,
        accentStrong: topic.theme.accentStrong,
        icon: topic.theme.icon,
        heroMotifsText: this.formatStringList(topic.theme.heroMotifs),
        mapPlacement: {
          xPercent: topic.theme.mapPlacement.xPercent,
          yPercent: topic.theme.mapPlacement.yPercent,
          depth: topic.theme.mapPlacement.depth,
          scale: topic.theme.mapPlacement.scale,
          floatDelayMs: topic.theme.mapPlacement.floatDelayMs,
        },
      },
      heroImage: {
        src: heroImage?.src ?? '',
        alt: heroImage?.alt ?? '',
        width: heroImage?.width ?? 1600,
        height: heroImage?.height ?? 900,
        objectPosition: heroImage?.objectPosition ?? 'center',
      },
      pageCopy: {
        featuredHeading: pageCopy.featuredHeading,
        featuredDescription: pageCopy.featuredDescription,
        archiveHeading: pageCopy.archiveHeading,
        archiveDescription: pageCopy.archiveDescription,
      },
      asset: {
        title: topic.asset.title,
        intro: topic.asset.intro,
        itemsText: topic.asset.items
          .map(item => this.formatPipeRow([item.label, item.description]))
          .join('\n'),
      },
      featuredProject: {
        label: topic.featuredProject.label,
        title: topic.featuredProject.title,
        description: topic.featuredProject.description,
        href: topic.featuredProject.href,
        ctaLabel: topic.featuredProject.ctaLabel,
      },
      learningPathText: topic.learningPath
        .map(step => this.formatPipeRow([step.label, step.title, step.description]))
        .join('\n'),
      checklistText: this.formatStringList(topic.checklist),
      resourcesText: topic.resources
        .map(resource => this.formatPipeRow([resource.label, resource.description, resource.href]))
        .join('\n'),
      createdAt: topic.createdAt,
    };
  }

  private createTopicFromForm(): TopicHub {
    const raw = this.topicForm.getRawValue();
    const status: TopicHubStatus = isTopicHubStatus(raw.status) ? raw.status : 'draft';
    const icon: TopicHubIcon = isTopicHubIcon(raw.theme.icon) ? raw.theme.icon : 'spark';
    const now = new Date().toISOString();
    const heroImage = raw.heroImage.src.trim()
      ? {
          src: raw.heroImage.src,
          alt: raw.heroImage.alt,
          width: Number(raw.heroImage.width),
          height: Number(raw.heroImage.height),
          objectPosition: raw.heroImage.objectPosition,
        }
      : undefined;
    const pageCopy = Object.values(raw.pageCopy).some(value => value.trim())
      ? {
          featuredHeading: raw.pageCopy.featuredHeading,
          featuredDescription: raw.pageCopy.featuredDescription,
          archiveHeading: raw.pageCopy.archiveHeading,
          archiveDescription: raw.pageCopy.archiveDescription,
        }
      : undefined;

    return {
      id: raw.id || this.topicHubRepository.createNewTopicTemplate().id,
      slug: raw.slug,
      eyebrow: raw.eyebrow,
      title: raw.title,
      description: raw.description,
      summary: raw.summary,
      status,
      displayOrder: Number(raw.displayOrder),
      terms: this.parseStringList(raw.termsText),
      theme: {
        shortLabel: raw.theme.shortLabel,
        accent: raw.theme.accent,
        accentStrong: raw.theme.accentStrong,
        accentRgb: '',
        icon,
        heroMotifs: this.parseStringList(raw.theme.heroMotifsText),
        mapPlacement: {
          xPercent: Number(raw.theme.mapPlacement.xPercent),
          yPercent: Number(raw.theme.mapPlacement.yPercent),
          depth: Number(raw.theme.mapPlacement.depth),
          scale: Number(raw.theme.mapPlacement.scale),
          floatDelayMs: Number(raw.theme.mapPlacement.floatDelayMs),
        },
      },
      heroImage,
      pageCopy,
      asset: {
        title: raw.asset.title,
        intro: raw.asset.intro,
        items: this.parsePipeRows(raw.asset.itemsText)
          .map(parts => ({
            label: parts[0] ?? '',
            description: parts[1] ?? '',
          }))
          .filter(item => item.label || item.description),
      },
      featuredProject: {
        label: raw.featuredProject.label,
        title: raw.featuredProject.title,
        description: raw.featuredProject.description,
        href: raw.featuredProject.href,
        ctaLabel: raw.featuredProject.ctaLabel,
      },
      learningPath: this.parsePipeRows(raw.learningPathText)
        .map(parts => ({
          label: parts[0] ?? '',
          title: parts[1] ?? '',
          description: parts[2] ?? '',
        }))
        .filter(step => step.label || step.title || step.description),
      checklist: this.parseStringList(raw.checklistText),
      resources: this.parsePipeRows(raw.resourcesText)
        .map(parts => ({
          label: parts[0] ?? '',
          description: parts[1] ?? '',
          href: parts[2] ?? '',
        }))
        .filter(resource => resource.label || resource.description || resource.href),
      createdAt: raw.createdAt || now,
      updatedAt: now,
    };
  }

  private parseStringList(value: string): readonly string[] {
    return value
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  private parsePipeRows(value: string): readonly string[][] {
    return value
      .split(/\r?\n/)
      .map(line => line.split('|').map(item => item.trim()))
      .filter(parts => parts.some(Boolean));
  }

  private formatStringList(values: readonly string[]): string {
    return values.join('\n');
  }

  private formatPipeRow(values: readonly string[]): string {
    return values.join(' | ');
  }
}
