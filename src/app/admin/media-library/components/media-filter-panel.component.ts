import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {
  FavoriteFilter,
  MediaFilterState,
  MediaLibraryFolder,
  MediaOrientationFilter,
  MediaStatus,
  MediaType,
} from '../models/media-library.models';
import {createDefaultFilterState, labelize} from '../utils/media-library.utils';

@Component({
  selector: 'app-media-filter-panel',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Advanced media filters">
      <button type="button" class="absolute inset-0 bg-gray-950/25" aria-label="Close filters" (click)="closeRequested.emit()"></button>

      <section class="relative z-10 flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl">
        <header class="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 class="text-base font-semibold text-gray-900">Advanced Filters</h2>
            <p class="text-sm text-gray-500">Narrow the visible media set.</p>
          </div>
          <button type="button" class="rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-600 hover:bg-gray-50" (click)="closeRequested.emit()">Close</button>
        </header>

        <div class="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
          <section class="filter-section">
            <h3>Media Type</h3>
            <div class="grid grid-cols-2 gap-2">
              @for (type of mediaTypes; track type) {
                <label class="filter-check">
                  <input type="checkbox" [checked]="draft.mediaTypes.includes(type)" (change)="toggleMediaType(type)">
                  <span>{{ labelize(type) }}</span>
                </label>
              }
            </div>
          </section>

          <section class="filter-section">
            <h3>Extension</h3>
            <div class="flex flex-wrap gap-2">
              @for (extension of availableExtensions; track extension) {
                <button
                  type="button"
                  class="rounded-full border px-2.5 py-1 text-xs font-medium"
                  [class.border-blue-300]="draft.extensions.includes(extension)"
                  [class.bg-blue-50]="draft.extensions.includes(extension)"
                  [class.text-blue-700]="draft.extensions.includes(extension)"
                  [class.border-gray-200]="!draft.extensions.includes(extension)"
                  [class.text-gray-600]="!draft.extensions.includes(extension)"
                  (click)="toggleExtension(extension)"
                >
                  {{ extension }}
                </button>
              } @empty {
                <p class="text-sm text-gray-500">Extensions appear when media is loaded.</p>
              }
            </div>
          </section>

          <section class="filter-section">
            <h3>Status</h3>
            <div class="grid grid-cols-2 gap-2">
              @for (status of statuses; track status) {
                <label class="filter-check">
                  <input type="checkbox" [checked]="draft.statuses.includes(status)" (change)="toggleStatus(status)">
                  <span>{{ labelize(status) }}</span>
                </label>
              }
            </div>
          </section>

          <section class="filter-section">
            <h3>Tags</h3>
            <label class="filter-check">
              <input type="checkbox" [checked]="draft.untagged" (change)="setBoolean('untagged', $event)">
              <span>Untagged only</span>
            </label>
            <div class="mt-3 space-y-2">
              @for (tag of availableTags; track tag) {
                <div class="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <span class="truncate">#{{ tag }}</span>
                  <label class="flex items-center gap-1 text-xs text-gray-500">
                    <input type="checkbox" [checked]="draft.includeTags.includes(tag)" (change)="toggleIncludeTag(tag)"> Include
                  </label>
                  <label class="flex items-center gap-1 text-xs text-gray-500">
                    <input type="checkbox" [checked]="draft.excludeTags.includes(tag)" (change)="toggleExcludeTag(tag)"> Exclude
                  </label>
                </div>
              } @empty {
                <p class="text-sm text-gray-500">Tags appear after media is tagged.</p>
              }
            </div>
          </section>

          <section class="filter-section">
            <h3>Folder</h3>
            <select class="field-input" [ngModel]="draft.folderId" (ngModelChange)="setNullableString('folderId', $event)">
              <option value="">Entire library</option>
              @for (folder of folders; track folder.id) {
                <option [value]="folder.id">{{ folder.path }}</option>
              }
            </select>
            <label class="filter-check mt-2">
              <input type="checkbox" [checked]="draft.includeSubfolders" (change)="setBoolean('includeSubfolders', $event)">
              <span>Include subfolders</span>
            </label>
          </section>

          <section class="filter-section">
            <h3>Favorites And Rating</h3>
            <label class="field-label" for="favorite-filter">Favorites</label>
            <select id="favorite-filter" class="field-input" [ngModel]="draft.favorites" (ngModelChange)="setFavorites($event)">
              <option value="all">All media</option>
              <option value="favorites">Favorites only</option>
              <option value="not-favorites">Non-favorites only</option>
            </select>
            <div class="mt-3 grid grid-cols-2 gap-3">
              <label class="block">
                <span class="field-label">Minimum rating</span>
                <input type="number" min="1" max="5" class="field-input" [ngModel]="draft.ratingMin" (ngModelChange)="setNumber('ratingMin', $event)">
              </label>
              <label class="block">
                <span class="field-label">Exact rating</span>
                <input type="number" min="1" max="5" class="field-input" [ngModel]="draft.ratingExact" (ngModelChange)="setNumber('ratingExact', $event)">
              </label>
            </div>
          </section>

          <section class="filter-section">
            <h3>Date Range</h3>
            <div class="grid grid-cols-2 gap-3">
              <label class="block">
                <span class="field-label">Uploaded from</span>
                <input type="date" class="field-input" [ngModel]="draft.uploadedFrom" (ngModelChange)="setNullableString('uploadedFrom', $event)">
              </label>
              <label class="block">
                <span class="field-label">Uploaded to</span>
                <input type="date" class="field-input" [ngModel]="draft.uploadedTo" (ngModelChange)="setNullableString('uploadedTo', $event)">
              </label>
              <label class="block">
                <span class="field-label">Updated from</span>
                <input type="date" class="field-input" [ngModel]="draft.updatedFrom" (ngModelChange)="setNullableString('updatedFrom', $event)">
              </label>
              <label class="block">
                <span class="field-label">Updated to</span>
                <input type="date" class="field-input" [ngModel]="draft.updatedTo" (ngModelChange)="setNullableString('updatedTo', $event)">
              </label>
            </div>
          </section>

          <section class="filter-section">
            <h3>File Size</h3>
            <div class="mb-3 flex flex-wrap gap-2">
              <button type="button" class="pill-button" (click)="setSizePreset(0, 1024 * 1024)">Small</button>
              <button type="button" class="pill-button" (click)="setSizePreset(1024 * 1024, 10 * 1024 * 1024)">Medium</button>
              <button type="button" class="pill-button" (click)="setSizePreset(10 * 1024 * 1024, null)">Large</button>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <label class="block">
                <span class="field-label">Min bytes</span>
                <input type="number" min="0" class="field-input" [ngModel]="draft.sizeMinBytes" (ngModelChange)="setNumber('sizeMinBytes', $event)">
              </label>
              <label class="block">
                <span class="field-label">Max bytes</span>
                <input type="number" min="0" class="field-input" [ngModel]="draft.sizeMaxBytes" (ngModelChange)="setNumber('sizeMaxBytes', $event)">
              </label>
            </div>
          </section>

          <section class="filter-section">
            <h3>Dimensions</h3>
            <div class="grid grid-cols-2 gap-3">
              <label class="block"><span class="field-label">Min width</span><input type="number" min="0" class="field-input" [ngModel]="draft.widthMin" (ngModelChange)="setNumber('widthMin', $event)"></label>
              <label class="block"><span class="field-label">Max width</span><input type="number" min="0" class="field-input" [ngModel]="draft.widthMax" (ngModelChange)="setNumber('widthMax', $event)"></label>
              <label class="block"><span class="field-label">Min height</span><input type="number" min="0" class="field-input" [ngModel]="draft.heightMin" (ngModelChange)="setNumber('heightMin', $event)"></label>
              <label class="block"><span class="field-label">Max height</span><input type="number" min="0" class="field-input" [ngModel]="draft.heightMax" (ngModelChange)="setNumber('heightMax', $event)"></label>
            </div>

            <label class="field-label mt-3 block" for="orientation-filter">Orientation</label>
            <select id="orientation-filter" class="field-input" [ngModel]="draft.orientation" (ngModelChange)="setOrientation($event)">
              <option value="all">All</option>
              <option value="square">Square</option>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>

            <div class="mt-3 space-y-2">
              <label class="filter-check"><input type="checkbox" [checked]="draft.missingDimensions" (change)="setBoolean('missingDimensions', $event)"><span>Missing dimensions</span></label>
              <label class="filter-check"><input type="checkbox" [checked]="draft.missingThumbnail" (change)="setBoolean('missingThumbnail', $event)"><span>Missing thumbnail</span></label>
            </div>
          </section>
        </div>

        <footer class="flex items-center justify-between gap-3 border-t border-gray-200 px-5 py-4">
          <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" (click)="filtersCleared.emit()">Clear all filters</button>
          <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" (click)="filtersApplied.emit(draft)">Apply Filters</button>
        </footer>
      </section>
    </div>
  `,
  styles: [`
    .filter-section {
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 1.25rem;
    }

    .filter-section h3 {
      color: #111827;
      font-size: 0.875rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
    }

    .filter-check {
      align-items: center;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      color: #374151;
    }

    .field-label {
      color: #6b7280;
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .field-input {
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      color: #111827;
      font-size: 0.875rem;
      padding: 0.5rem 0.75rem;
      width: 100%;
    }

    .field-input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 2px #dbeafe;
      outline: none;
    }

    .pill-button {
      border: 1px solid #d1d5db;
      border-radius: 999px;
      color: #374151;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.35rem 0.65rem;
    }

    .pill-button:hover {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #1d4ed8;
    }
  `],
})
export class MediaFilterPanelComponent implements OnChanges {
  @Input() filters: MediaFilterState = createDefaultFilterState();
  @Input() availableTags: readonly string[] = [];
  @Input() availableExtensions: readonly string[] = [];
  @Input() folders: readonly MediaLibraryFolder[] = [];

  @Output() filtersApplied = new EventEmitter<MediaFilterState>();
  @Output() filtersCleared = new EventEmitter<void>();
  @Output() closeRequested = new EventEmitter<void>();

  protected draft: MediaFilterState = createDefaultFilterState();
  protected readonly mediaTypes: readonly MediaType[] = ['image', 'video', 'audio', 'document', 'archive', 'other'];
  protected readonly statuses: readonly MediaStatus[] = ['ready', 'uploading', 'processing', 'failed', 'archived'];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.draft = this.cloneFilters(this.filters);
    }
  }

  protected toggleMediaType(type: MediaType): void {
    this.draft = {...this.draft, mediaTypes: this.toggleValue(this.draft.mediaTypes, type)};
  }

  protected toggleExtension(extension: string): void {
    this.draft = {...this.draft, extensions: this.toggleValue(this.draft.extensions, extension)};
  }

  protected toggleStatus(status: MediaStatus): void {
    this.draft = {...this.draft, statuses: this.toggleValue(this.draft.statuses, status)};
  }

  protected toggleIncludeTag(tag: string): void {
    this.draft = {
      ...this.draft,
      includeTags: this.toggleValue(this.draft.includeTags, tag),
      excludeTags: this.draft.excludeTags.filter(existingTag => existingTag !== tag),
    };
  }

  protected toggleExcludeTag(tag: string): void {
    this.draft = {
      ...this.draft,
      excludeTags: this.toggleValue(this.draft.excludeTags, tag),
      includeTags: this.draft.includeTags.filter(existingTag => existingTag !== tag),
    };
  }

  protected setFavorites(value: string): void {
    this.draft = {...this.draft, favorites: value as FavoriteFilter};
  }

  protected setOrientation(value: string): void {
    this.draft = {...this.draft, orientation: value as MediaOrientationFilter};
  }

  protected setNumber(key: keyof Pick<MediaFilterState, 'ratingMin' | 'ratingExact' | 'sizeMinBytes' | 'sizeMaxBytes' | 'widthMin' | 'widthMax' | 'heightMin' | 'heightMax'>, value: string | number | null): void {
    const numericValue = value === '' || value === null ? null : Number(value);
    this.draft = {
      ...this.draft,
      [key]: Number.isFinite(numericValue) ? numericValue : null,
    };
  }

  protected setBoolean(key: keyof Pick<MediaFilterState, 'untagged' | 'includeSubfolders' | 'missingDimensions' | 'missingThumbnail'>, event: Event): void {
    this.draft = {
      ...this.draft,
      [key]: this.getChecked(event),
    };
  }

  protected setNullableString(key: keyof Pick<MediaFilterState, 'folderId' | 'uploadedFrom' | 'uploadedTo' | 'updatedFrom' | 'updatedTo'>, value: string): void {
    this.draft = {
      ...this.draft,
      [key]: this.emptyToNull(value),
    };
  }

  protected setSizePreset(min: number | null, max: number | null): void {
    this.draft = {...this.draft, sizeMinBytes: min, sizeMaxBytes: max};
  }

  protected getChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected emptyToNull(value: string): string | null {
    return value || null;
  }

  protected labelize(value: string): string {
    return labelize(value);
  }

  private toggleValue<T>(values: readonly T[], value: T): readonly T[] {
    return values.includes(value) ? values.filter(item => item !== value) : [...values, value];
  }

  private cloneFilters(filters: MediaFilterState): MediaFilterState {
    return {
      ...filters,
      mediaTypes: [...filters.mediaTypes],
      extensions: [...filters.extensions],
      statuses: [...filters.statuses],
      includeTags: [...filters.includeTags],
      excludeTags: [...filters.excludeTags],
    };
  }
}
