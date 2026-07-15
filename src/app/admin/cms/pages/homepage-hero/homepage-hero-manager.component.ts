import {ChangeDetectionStrategy, Component, computed, effect, inject, untracked, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {firstValueFrom} from 'rxjs';
import {filter, take} from 'rxjs/operators';

import {BlogRepositoryService} from '../../../../features/blog/services/blog-repository.service';
import {
  DEFAULT_HOMEPAGE_HERO_SETTINGS,
  HOMEPAGE_HERO_SETTINGS_ID,
} from '../../../../features/homepage/homepage-hero.defaults';
import {
  HomepageHeroFeaturedPostMode,
  HomepageHeroSettings,
  HomepageHeroSlide,
  HomepageHeroSlideStatus,
  HomepageHeroStatus,
} from '../../../../features/homepage/models/homepage-hero.model';
import {
  HOMEPAGE_HERO_FEATURED_POST_MODES,
  HOMEPAGE_HERO_SLIDE_STATUSES,
  HOMEPAGE_HERO_STATUSES,
  createHomepageHeroSlide,
  getPublishedHomepageHeroSlides,
  isHomepageHeroFeaturedPostMode,
  isHomepageHeroSlideStatus,
  isHomepageHeroStatus,
  normalizeHomepageHeroSettingsForSave,
  sortSlides,
} from '../../../../features/homepage/utils/homepage-hero-validation.util';
import {
  BlogMediaUploadProgress,
  BlogMediaUploadService,
} from '../../services/blog-media-upload.service';
import {HomepageHeroRepositoryService} from '../../../../features/homepage/services/homepage-hero-repository.service';
import {CmsToastContainerComponent} from '../../components/toast/cms-toast.component';
import {CmsToastService} from '../../services/cms-toast.service';
import {AdminEditorActionBarComponent} from '../../../shared/admin-editor-action-bar.component';
import {AdminPageHeaderComponent} from '../../../shared/admin-page-header.component';
import {AdminStatCardComponent} from '../../../shared/admin-stat-card.component';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function hasDownloadUrl(progress: BlogMediaUploadProgress): progress is BlogMediaUploadProgress & { downloadUrl: string } {
  return typeof progress.downloadUrl === 'string' && progress.downloadUrl.length > 0;
}

@Component({
  selector: 'app-cms-homepage-hero-manager',
  imports: [
    AdminEditorActionBarComponent,
    AdminPageHeaderComponent,
    AdminStatCardComponent,
    ReactiveFormsModule,
    CmsToastContainerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-7xl space-y-8">
        <app-admin-page-header
          title="Homepage Hero"
          description="Manage the first viewport copy, featured article selection, and rotating background image set."
        >
          <div adminPageHeaderActions class="contents">
            <button
              type="button"
              class="inline-flex justify-center border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
              [disabled]="refreshInProgress"
              (click)="refreshHomepageHeroFromFirestore()"
            >
              {{ refreshInProgress ? 'Refreshing...' : 'Refresh Firestore' }}
            </button>
            <button
              type="button"
              class="inline-flex justify-center border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
              (click)="resetToDefaultHero()"
            >
              Load Defaults
            </button>
          </div>
        </app-admin-page-header>

        <section class="grid gap-4 sm:grid-cols-4">
          <app-admin-stat-card
            label="Hero Status"
            [value]="settings().status"
            size="compact"
            [capitalize]="true"
          ></app-admin-stat-card>
          <app-admin-stat-card label="Total Slides" [value]="stats().totalSlides"></app-admin-stat-card>
          <app-admin-stat-card label="Published Slides" [value]="stats().publishedSlides"></app-admin-stat-card>
          <app-admin-stat-card label="Draft Slides" [value]="stats().draftSlides"></app-admin-stat-card>
        </section>

        @if (loadError(); as error) {
          <section class="border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-100">
            {{ error }}
          </section>
        }

        <form class="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(360px,0.58fr)]"
              [formGroup]="heroForm"
              (ngSubmit)="saveHomepageHero()">
          <section class="space-y-6">
            <section class="space-y-5 border border-zinc-800 bg-zinc-900/70 p-5">
              <div>
                <h2 class="text-xl font-semibold text-zinc-50">Hero Copy</h2>
                <p class="mt-1 text-sm text-zinc-500">These fields replace the current hardcoded homepage headline and intro.</p>
              </div>

              <div class="grid gap-4 md:grid-cols-[160px_1fr]">
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Status</span>
                  <select
                    formControlName="status"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                  >
                    @for (status of heroStatuses; track status) {
                      <option [value]="status">{{ status }}</option>
                    }
                  </select>
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Summary</span>
                  <input
                    type="text"
                    formControlName="summary"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                  >
                </label>
              </div>

              <div class="grid gap-4 md:grid-cols-3">
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Headline line 1</span>
                  <input type="text" formControlName="headlineLine1" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Headline line 2</span>
                  <input type="text" formControlName="headlineLine2" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Headline line 3</span>
                  <input type="text" formControlName="headlineLine3" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300">
                </label>
              </div>
            </section>

            <section class="space-y-5 border border-zinc-800 bg-zinc-900/70 p-5">
              <div>
                <h2 class="text-xl font-semibold text-zinc-50">Featured Article Overlay</h2>
                <p class="mt-1 text-sm text-zinc-500">
                  The newest published post marked featured appears automatically. Older posts can remain featured;
                  select a specific post only when you need a manual override.
                </p>
              </div>

              <div class="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Selection mode</span>
                  <select
                    formControlName="featuredPostMode"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                  >
                    @for (mode of featuredPostModes; track mode) {
                      <option [value]="mode">
                        {{ mode === 'featured' ? 'Newest featured post' : 'Selected post override' }}
                      </option>
                    }
                  </select>
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Selected published post</span>
                  <select
                    formControlName="featuredPostId"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300 disabled:cursor-not-allowed disabled:text-zinc-600"
                    [disabled]="heroForm.controls.featuredPostMode.value !== 'selected'"
                  >
                    <option value="">Choose a published post</option>
                    @for (post of publishedPosts(); track post.id) {
                      <option [value]="post.id">{{ post.title }}</option>
                    }
                  </select>
                </label>
                <label class="flex items-center justify-between gap-4 border border-zinc-800 bg-zinc-950 p-3 md:col-span-2">
                  <span>
                    <span class="block text-sm font-medium text-zinc-200">Use featured post background</span>
                    <span class="mt-1 block text-xs leading-5 text-zinc-500">
                      When enabled, the resolved post's Full-screen Post Background replaces the slideshow. When
                      disabled—or when that image is missing or fails—the published homepage slides play normally.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    formControlName="useFeaturedPostBackground"
                    class="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-cyan-300"
                  >
                </label>
              </div>
            </section>

            <section class="space-y-5 border border-zinc-800 bg-zinc-900/70 p-5">
              <div class="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <h2 class="text-xl font-semibold text-zinc-50">Background Slides</h2>
                  <p class="mt-1 text-sm text-zinc-500">
                    Upload, order, and publish the homepage slideshow. It remains active unless the featured-post
                    background option above is enabled and the resolved post has a working background image.
                  </p>
                </div>
                <label class="inline-flex cursor-pointer justify-center border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    class="sr-only"
                    [disabled]="uploadInProgress"
                    (change)="uploadHeroSlides($event)"
                  >
                  {{ uploadInProgress ? 'Uploading...' : 'Upload Images' }}
                </label>
              </div>

              <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
                <label class="space-y-2">
                  <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Add image URL</span>
                  <input
                    type="url"
                    [value]="manualImageUrl"
                    placeholder="https://..."
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300"
                    (input)="updateManualImageUrl($event)"
                  >
                </label>
                <button
                  type="button"
                  class="self-end border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
                  [disabled]="!manualImageUrl.trim()"
                  (click)="addManualHeroSlide()"
                >
                  Add URL
                </button>
              </div>

              @if (uploadStatus()) {
                <p class="text-sm text-cyan-200">{{ uploadStatus() }}</p>
              }

              <div class="space-y-4">
                @for (slide of editableSlides(); track slide.id; let index = $index) {
                  <article class="grid gap-4 border border-zinc-800 bg-zinc-950 p-4 xl:grid-cols-[220px_minmax(0,1fr)]">
                    <div class="space-y-3">
                      <img
                        [src]="slide.imageUrl"
                        [alt]="slide.altText || 'Homepage hero slide preview'"
                        class="aspect-video w-full object-cover"
                        [style.object-position]="slideObjectPosition(slide)"
                        loading="lazy"
                        decoding="async"
                      >
                      <div class="flex flex-wrap gap-2">
                        <button type="button" class="border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:text-zinc-700" [disabled]="index === 0" (click)="moveSlide(slide.id, -1)">Up</button>
                        <button type="button" class="border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:text-zinc-700" [disabled]="index === editableSlides().length - 1" (click)="moveSlide(slide.id, 1)">Down</button>
                        <button type="button" class="border border-red-500/60 px-3 py-1 text-xs text-red-200 hover:bg-red-500 hover:text-zinc-950" (click)="removeSlide(slide.id)">Remove</button>
                      </div>
                    </div>

                    <div class="grid gap-4 md:grid-cols-2">
                      <label class="space-y-2 md:col-span-2">
                        <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Image URL</span>
                        <input type="url" [value]="slide.imageUrl" class="w-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300" (input)="updateSlideImageUrl(slide.id, $event)">
                      </label>
                      <label class="space-y-2 md:col-span-2">
                        <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Alt text</span>
                        <input type="text" [value]="slide.altText" class="w-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300" (input)="updateSlideAltText(slide.id, $event)">
                      </label>
                      <label class="space-y-2">
                        <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Status</span>
                        <select [value]="slide.status" class="w-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300" (change)="updateSlideStatus(slide.id, $event)">
                          @for (status of slideStatuses; track status) {
                            <option [value]="status">{{ status }}</option>
                          }
                        </select>
                      </label>
                      <label class="space-y-2">
                        <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Order</span>
                        <input type="number" [value]="slide.sortOrder" class="w-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300" (input)="updateSlideSortOrder(slide.id, $event)">
                      </label>
                      <label class="space-y-2">
                        <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Focal X%</span>
                        <input type="number" min="0" max="100" [value]="slide.focalPointX" class="w-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300" (input)="updateSlideFocalPoint(slide.id, 'x', $event)">
                      </label>
                      <label class="space-y-2">
                        <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Focal Y%</span>
                        <input type="number" min="0" max="100" [value]="slide.focalPointY" class="w-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300" (input)="updateSlideFocalPoint(slide.id, 'y', $event)">
                      </label>
                      <label class="flex items-center justify-between gap-4 border border-zinc-800 bg-zinc-900 p-3 md:col-span-2">
                        <span class="text-sm font-medium text-zinc-200">Ken Burns motion</span>
                        <input type="checkbox" [checked]="slide.kenBurnsEnabled" class="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-cyan-300" (change)="updateSlideKenBurns(slide.id, $event)">
                      </label>
                    </div>
                  </article>
                } @empty {
                  <div class="border border-dashed border-zinc-700 p-5 text-sm leading-6 text-zinc-400">
                    No slides are configured. Upload at least one image before publishing the homepage hero.
                  </div>
                }
              </div>
            </section>
          </section>

          <aside class="space-y-6">
            <section class="space-y-5 border border-zinc-800 bg-zinc-900/70 p-5">
              <div>
                <h2 class="text-xl font-semibold text-zinc-50">Slideshow Timing</h2>
                <p class="mt-1 text-sm text-zinc-500">The public hero pauses on hover, focus, hidden tabs, and reduced motion.</p>
              </div>
              <label class="flex items-center justify-between gap-4 border border-zinc-800 bg-zinc-950 p-3">
                <span class="text-sm font-medium text-zinc-200">Enable autoplay</span>
                <input type="checkbox" formControlName="slideshowEnabled" class="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-cyan-300">
              </label>
              <label class="space-y-2">
                <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Interval ms</span>
                <input type="number" min="3500" max="20000" formControlName="intervalMs" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300">
              </label>
              <label class="space-y-2">
                <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Fade duration ms</span>
                <input type="number" min="250" max="2500" formControlName="transitionMs" class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300">
              </label>
            </section>

            <section class="space-y-4 border border-zinc-800 bg-zinc-900/70 p-5">
              <h2 class="text-xl font-semibold text-zinc-50">Preview</h2>
              <article class="relative min-h-96 overflow-hidden bg-zinc-950">
                @if (previewSlide(); as slide) {
                  <img
                    [src]="slide.imageUrl"
                    [alt]="slide.altText || 'Homepage hero preview'"
                    class="absolute inset-0 h-full w-full object-cover brightness-75"
                    [style.object-position]="slideObjectPosition(slide)"
                    decoding="async"
                  >
                }
                <div class="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/45 to-zinc-950/20"></div>
                <div class="relative z-10 flex min-h-96 flex-col justify-end p-5">
                  <h3 class="font-[var(--font-heading)] text-3xl font-semibold leading-tight text-white">
                    @for (line of previewHeadlineLines(); track line) {
                      <span class="block">{{ line }}</span>
                    }
                  </h3>
                  <p class="mt-4 text-sm leading-6 text-zinc-200">{{ heroForm.controls.summary.value }}</p>
                </div>
              </article>
              <p class="text-xs leading-5 text-zinc-500">
                Published fallback slide count: {{ publishedSlideCount() }}. This preview shows slideshow imagery. On
                the public homepage, the resolved hero post's optional full-screen background replaces these slides
                only when Use featured post background is enabled; disabling it, or a failed/missing image, restores
                the slideshow or static fallback.
              </p>
            </section>

            <app-admin-editor-action-bar
              [status]="editorActionStatus"
              [busy]="saveInProgress || uploadInProgress"
              [panel]="true"
            >
              <button
                adminEditorActions
                type="submit"
                class="inline-flex justify-center border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
                [disabled]="heroForm.invalid || saveInProgress || uploadInProgress"
              >
                {{ saveInProgress ? 'Saving...' : 'Save Homepage Hero' }}
              </button>
            </app-admin-editor-action-bar>
          </aside>
        </form>
      </section>

      <app-cms-toast-container></app-cms-toast-container>
    </main>
  `,
})
export class CmsHomepageHeroManagerComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly homepageHeroRepository = inject(HomepageHeroRepositoryService);
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly mediaUpload = inject(BlogMediaUploadService);
  private readonly toast = inject(CmsToastService);

  protected readonly heroStatuses = HOMEPAGE_HERO_STATUSES;
  protected readonly slideStatuses = HOMEPAGE_HERO_SLIDE_STATUSES;
  protected readonly featuredPostModes = HOMEPAGE_HERO_FEATURED_POST_MODES;
  protected readonly settings = this.homepageHeroRepository.settings;
  protected readonly loadError = this.homepageHeroRepository.error;
  protected readonly posts = toSignal(
    this.blogRepository.getAdminPosts$(),
    {initialValue: this.blogRepository.getAdminPosts()}
  );
  protected readonly editableSlides = signal<HomepageHeroSlide[]>([]);
  protected readonly uploadStatus = signal('');
  protected readonly stats = computed(() => this.homepageHeroRepository.getAdminStats());
  protected readonly publishedPosts = computed(() => this.posts().filter(post => post.status === 'published'));
  protected readonly publishedSlideCount = computed(() => getPublishedHomepageHeroSlides({
    ...this.createSettingsFromForm(false),
    slides: this.editableSlides(),
  }).length);
  protected readonly previewSlide = computed(() => this.editableSlides().find(slide => slide.imageUrl.trim().length > 0) ?? null);
  protected readonly heroForm = this.formBuilder.nonNullable.group({
    status: ['published' as HomepageHeroStatus, Validators.required],
    headlineLine1: ['', Validators.required],
    headlineLine2: [''],
    headlineLine3: [''],
    summary: ['', Validators.required],
    featuredPostMode: ['featured' as HomepageHeroFeaturedPostMode, Validators.required],
    featuredPostId: [''],
    useFeaturedPostBackground: [false],
    slideshowEnabled: [true],
    intervalMs: [6500, Validators.required],
    transitionMs: [900, Validators.required],
    createdAt: [''],
  });

  protected manualImageUrl = '';
  protected saveInProgress = false;
  protected refreshInProgress = false;
  protected uploadInProgress = false;

  constructor() {
    effect(() => {
      const settings = this.settings();

      if (!this.heroForm.dirty && !this.saveInProgress && !this.uploadInProgress) {
        untracked(() => this.patchHeroForm(settings));
      }
    });
  }

  protected async saveHomepageHero(): Promise<void> {
    if (this.heroForm.invalid) {
      this.heroForm.markAllAsTouched();
      return;
    }

    const settings = this.createSettingsFromForm();

    if (settings.featuredPostMode === 'selected' && !settings.featuredPostId) {
      this.toast.error('Choose a published post or change the featured article mode.');
      return;
    }

    if (settings.status === 'published' && getPublishedHomepageHeroSlides(settings).length === 0) {
      this.toast.error('Publish at least one hero slide before publishing the homepage hero.');
      return;
    }

    this.saveInProgress = true;

    try {
      const savedSettings = await this.homepageHeroRepository.saveHomepageHeroSettings(settings);
      this.patchHeroForm(savedSettings);
      this.toast.success('Saved homepage hero settings.');
    } catch (error) {
      this.toast.error(`Unable to save homepage hero settings: ${getErrorMessage(error)}`);
    } finally {
      this.saveInProgress = false;
    }
  }

  protected async refreshHomepageHeroFromFirestore(): Promise<void> {
    this.refreshInProgress = true;

    try {
      const settings = await this.homepageHeroRepository.loadHomepageHeroSettingsFromFirestore();
      this.patchHeroForm(settings);
      this.toast.success('Refreshed homepage hero settings from Firestore.');
    } catch (error) {
      this.toast.error(`Unable to refresh homepage hero settings: ${getErrorMessage(error)}`);
    } finally {
      this.refreshInProgress = false;
    }
  }

  protected resetToDefaultHero(): void {
    const confirmed = window.confirm('Load the default homepage hero settings into the editor? This will not write to Firestore until you save.');

    if (!confirmed) {
      return;
    }

    this.patchHeroForm(DEFAULT_HOMEPAGE_HERO_SETTINGS);
    this.heroForm.markAsDirty();
  }

  protected async uploadHeroSlides(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const files = Array.from(input?.files ?? []);

    if (files.length === 0) {
      return;
    }

    this.uploadInProgress = true;
    this.uploadStatus.set(`Uploading 0 of ${files.length} images...`);

    try {
      const uploadedSlides: HomepageHeroSlide[] = [];

      for (const [index, file] of files.entries()) {
        this.uploadStatus.set(`Uploading ${index + 1} of ${files.length}: ${file.name}`);
        const progress = await firstValueFrom(
          this.mediaUpload.uploadImage(file, {
            slug: 'homepage',
            role: 'homepage-hero',
            altText: createAltTextFromFileName(file.name),
            optimization: {
              enabled: true,
              maxWidth: 2400,
              maxHeight: 1600,
              quality: 0.86,
              outputType: 'image/webp',
            },
          }).pipe(
            filter(hasDownloadUrl),
            take(1)
          )
        );

        uploadedSlides.push(createHomepageHeroSlide({
          imageUrl: progress.downloadUrl,
          storagePath: progress.storagePath,
          altText: createAltTextFromFileName(file.name),
          width: progress.width,
          height: progress.height,
          sortOrder: this.nextSlideOrder() + uploadedSlides.length * 10,
          status: 'published',
          kenBurnsEnabled: true,
        }));
      }

      this.editableSlides.update(slides => [...slides, ...uploadedSlides].sort(sortSlides));
      this.heroForm.markAsDirty();
      this.toast.success(`Uploaded ${uploadedSlides.length} hero image${uploadedSlides.length === 1 ? '' : 's'}.`);
    } catch (error) {
      this.toast.error(`Unable to upload hero image: ${getErrorMessage(error)}`);
    } finally {
      this.uploadInProgress = false;
      this.uploadStatus.set('');

      if (input) {
        input.value = '';
      }
    }
  }

  protected updateManualImageUrl(event: Event): void {
    this.manualImageUrl = (event.target as HTMLInputElement | null)?.value ?? '';
  }

  protected addManualHeroSlide(): void {
    const imageUrl = this.manualImageUrl.trim();

    if (!imageUrl) {
      return;
    }

    this.editableSlides.update(slides => [
      ...slides,
      createHomepageHeroSlide({
        imageUrl,
        altText: 'Homepage hero image',
        sortOrder: this.nextSlideOrder(),
        status: 'published',
        kenBurnsEnabled: true,
      }),
    ].sort(sortSlides));
    this.manualImageUrl = '';
    this.heroForm.markAsDirty();
  }

  protected updateSlideImageUrl(slideId: string, event: Event): void {
    this.patchSlide(slideId, {imageUrl: (event.target as HTMLInputElement | null)?.value ?? ''});
  }

  protected updateSlideAltText(slideId: string, event: Event): void {
    this.patchSlide(slideId, {altText: (event.target as HTMLInputElement | null)?.value ?? ''});
  }

  protected updateSlideStatus(slideId: string, event: Event): void {
    const statusValue = (event.target as HTMLSelectElement | null)?.value;
    const status: HomepageHeroSlideStatus = isHomepageHeroSlideStatus(statusValue) ? statusValue : 'draft';

    this.patchSlide(slideId, {status});
  }

  protected updateSlideSortOrder(slideId: string, event: Event): void {
    this.patchSlide(slideId, {sortOrder: this.getNumericInputValue(event, 10)});
  }

  protected updateSlideFocalPoint(slideId: string, axis: 'x' | 'y', event: Event): void {
    const value = Math.min(100, Math.max(0, this.getNumericInputValue(event, 50)));

    this.patchSlide(slideId, axis === 'x' ? {focalPointX: value} : {focalPointY: value});
  }

  protected updateSlideKenBurns(slideId: string, event: Event): void {
    this.patchSlide(slideId, {kenBurnsEnabled: (event.target as HTMLInputElement | null)?.checked === true});
  }

  protected moveSlide(slideId: string, direction: -1 | 1): void {
    const slides = [...this.editableSlides()].sort(sortSlides);
    const currentIndex = slides.findIndex(slide => slide.id === slideId);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= slides.length) {
      return;
    }

    const [slide] = slides.splice(currentIndex, 1);
    slides.splice(targetIndex, 0, slide);

    this.editableSlides.set(slides.map((item, index) => ({
      ...item,
      sortOrder: (index + 1) * 10,
      updatedAt: new Date().toISOString(),
    })));
    this.heroForm.markAsDirty();
  }

  protected removeSlide(slideId: string): void {
    this.editableSlides.update(slides => slides.filter(slide => slide.id !== slideId));
    this.heroForm.markAsDirty();
  }

  protected slideObjectPosition(slide: HomepageHeroSlide): string {
    return `${slide.focalPointX}% ${slide.focalPointY}%`;
  }

  protected previewHeadlineLines(): readonly string[] {
    return this.getHeadlineLinesFromForm();
  }

  protected get editorActionStatus(): string {
    if (this.uploadInProgress) {
      return this.uploadStatus() || 'Uploading homepage media...';
    }

    if (this.saveInProgress) {
      return 'Saving homepage hero settings...';
    }

    return this.heroForm.dirty
      ? 'Unsaved homepage hero changes.'
      : 'Homepage hero settings are up to date.';
  }

  private patchHeroForm(settings: HomepageHeroSettings): void {
    const headlineLines = [...settings.headlineLines];

    this.heroForm.reset({
      status: settings.status,
      headlineLine1: headlineLines[0] ?? '',
      headlineLine2: headlineLines[1] ?? '',
      headlineLine3: headlineLines[2] ?? '',
      summary: settings.summary,
      featuredPostMode: settings.featuredPostMode,
      featuredPostId: settings.featuredPostId ?? '',
      useFeaturedPostBackground: settings.useFeaturedPostBackground,
      slideshowEnabled: settings.slideshowEnabled,
      intervalMs: settings.intervalMs,
      transitionMs: settings.transitionMs,
      createdAt: settings.createdAt,
    });
    this.editableSlides.set([...settings.slides].sort(sortSlides));
  }

  private createSettingsFromForm(normalize = true): HomepageHeroSettings {
    const raw = this.heroForm.getRawValue();
    const status: HomepageHeroStatus = isHomepageHeroStatus(raw.status) ? raw.status : 'draft';
    const featuredPostMode: HomepageHeroFeaturedPostMode = isHomepageHeroFeaturedPostMode(raw.featuredPostMode)
      ? raw.featuredPostMode
      : 'featured';
    const settings: HomepageHeroSettings = {
      id: HOMEPAGE_HERO_SETTINGS_ID,
      status,
      headlineLines: this.getHeadlineLinesFromForm(),
      summary: raw.summary,
      featuredPostMode,
      featuredPostId: featuredPostMode === 'selected' && raw.featuredPostId ? raw.featuredPostId : null,
      useFeaturedPostBackground: raw.useFeaturedPostBackground,
      slideshowEnabled: raw.slideshowEnabled,
      intervalMs: Number(raw.intervalMs),
      transitionMs: Number(raw.transitionMs),
      slides: [...this.editableSlides()].sort(sortSlides),
      createdAt: raw.createdAt || this.settings().createdAt,
      updatedAt: new Date().toISOString(),
    };

    return normalize ? normalizeHomepageHeroSettingsForSave(settings) : settings;
  }

  private getHeadlineLinesFromForm(): readonly string[] {
    const raw = this.heroForm.getRawValue();
    const lines = [
      raw.headlineLine1,
      raw.headlineLine2,
      raw.headlineLine3,
    ].map(line => line.trim()).filter(Boolean);

    return lines.length > 0 ? lines : DEFAULT_HOMEPAGE_HERO_SETTINGS.headlineLines;
  }

  private nextSlideOrder(): number {
    return this.editableSlides()
      .reduce((highestOrder, slide) => Math.max(highestOrder, slide.sortOrder), 0) + 10;
  }

  private patchSlide(slideId: string, patch: Partial<HomepageHeroSlide>): void {
    this.editableSlides.update(slides => slides.map(slide => slide.id === slideId
      ? {
        ...slide,
        ...patch,
        updatedAt: new Date().toISOString(),
      }
      : slide
    ).sort(sortSlides));
    this.heroForm.markAsDirty();
  }

  private getNumericInputValue(event: Event, fallback: number): number {
    const value = Number((event.target as HTMLInputElement | null)?.value);

    return Number.isFinite(value) ? value : fallback;
  }
}

function createAltTextFromFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Homepage hero image';
}
