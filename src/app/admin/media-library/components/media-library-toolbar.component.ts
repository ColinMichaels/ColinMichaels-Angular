import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';

import {MediaSortMode, MediaViewMode} from '../models/media-library.models';

interface SortOption {
  value: MediaSortMode;
  label: string;
}

@Component({
  selector: 'app-media-library-toolbar',
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex min-h-[52px] flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-sm lg:flex-nowrap">
      <div class="flex items-center gap-1">
        <button type="button" class="toolbar-icon lg:hidden" aria-label="Open folders" (click)="sidebarToggle.emit()">☰</button>
        <button type="button" class="toolbar-icon" aria-label="Back" (click)="backRequested.emit()">‹</button>
        <button type="button" class="toolbar-icon" aria-label="Forward" (click)="forwardRequested.emit()">›</button>
        <button type="button" class="toolbar-icon" aria-label="Up folder" (click)="upFolderRequested.emit()">⌃</button>
        <button type="button" class="toolbar-icon" aria-label="Refresh media" (click)="refreshRequested.emit()">↻</button>
      </div>

      <nav class="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-sm text-gray-500" aria-label="Breadcrumbs">
        @for (crumb of breadcrumbs; track crumb.id) {
          @if (!$first) {
            <span class="text-gray-300">/</span>
          }
          <button
            type="button"
            class="truncate rounded px-1.5 py-1 hover:bg-blue-50 hover:text-blue-700"
            [class.font-semibold]="$last"
            [class.text-gray-900]="$last"
            (click)="breadcrumbSelected.emit(crumb.id)"
          >
            {{ crumb.label }}
          </button>
        }
      </nav>

      <div class="relative order-last min-w-[220px] flex-1 lg:order-none lg:max-w-md">
        <label class="sr-only" for="media-library-search">Search media</label>
        <input
          id="media-library-search"
          data-media-search
          type="search"
          class="h-9 w-full rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          placeholder="Search media by name, tag, type, folder..."
          [formControl]="searchControl"
        >
        <span class="pointer-events-none absolute left-3 top-2 text-gray-400" aria-hidden="true">⌕</span>
        @if (searchControl.value) {
          <button
            type="button"
            class="absolute right-2 top-1.5 rounded px-1.5 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Clear search"
            (click)="searchControl.setValue('')"
          >
            x
          </button>
        }
      </div>

      <label class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          [checked]="searchEntireLibrary"
          (change)="searchEntireLibraryChange.emit(getCheckboxChecked($event))"
        >
        Entire library
      </label>

      <label class="sr-only" for="media-sort-mode">Sort media</label>
      <select
        id="media-sort-mode"
        class="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        [value]="sortMode"
        (change)="sortModeChange.emit(getSortValue($event))"
      >
        @for (option of sortOptions; track option.value) {
          <option [value]="option.value">{{ option.label }}</option>
        }
      </select>

      <button
        type="button"
        class="relative h-9 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        (click)="filterToggle.emit()"
      >
        Filters
        @if (activeFilterCount > 0) {
          <span class="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">{{ activeFilterCount }}</span>
        }
      </button>

      <div class="flex items-center rounded-lg border border-gray-300 bg-white p-0.5" aria-label="View mode">
        @for (mode of viewModes; track mode.value) {
          <button
            type="button"
            class="rounded-md px-2 py-1.5 text-xs font-medium"
            [class.bg-blue-600]="viewMode === mode.value"
            [class.text-white]="viewMode === mode.value"
            [class.text-gray-600]="viewMode !== mode.value"
            [attr.aria-pressed]="viewMode === mode.value"
            (click)="viewModeChange.emit(mode.value)"
          >
            {{ mode.label }}
          </button>
        }
      </div>

      <label class="hidden items-center gap-2 text-xs text-gray-500 xl:flex">
        Size
        <input
          type="range"
          min="140"
          max="260"
          step="20"
          [value]="thumbnailSize"
          (input)="thumbnailSizeChange.emit(getNumberValue($event))"
        >
      </label>

      <button
        type="button"
        class="h-9 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        (click)="fileInput.click()"
      >
        Upload
      </button>
      <input
        #fileInput
        type="file"
        class="hidden"
        multiple
        (change)="onFilesSelected($event, fileInput)"
      >
    </header>
  `,
  styles: [`
    .toolbar-icon {
      align-items: center;
      border-radius: 0.5rem;
      color: #4b5563;
      display: inline-flex;
      font-size: 1rem;
      height: 2.25rem;
      justify-content: center;
      width: 2.25rem;
    }

    .toolbar-icon:hover {
      background: #eff6ff;
      color: #2563eb;
    }
  `],
})
export class MediaLibraryToolbarComponent {
  @Input({required: true}) searchControl!: FormControl<string>;
  @Input() breadcrumbs: readonly { id: string | null; label: string }[] = [{id: null, label: 'Home'}];
  @Input() sortMode: MediaSortMode = 'uploaded-desc';
  @Input() viewMode: MediaViewMode = 'grid';
  @Input() thumbnailSize = 180;
  @Input() activeFilterCount = 0;
  @Input() searchEntireLibrary = true;

  @Output() sortModeChange = new EventEmitter<MediaSortMode>();
  @Output() viewModeChange = new EventEmitter<MediaViewMode>();
  @Output() thumbnailSizeChange = new EventEmitter<number>();
  @Output() filterToggle = new EventEmitter<void>();
  @Output() filesSelected = new EventEmitter<readonly File[]>();
  @Output() refreshRequested = new EventEmitter<void>();
  @Output() sidebarToggle = new EventEmitter<void>();
  @Output() searchEntireLibraryChange = new EventEmitter<boolean>();
  @Output() breadcrumbSelected = new EventEmitter<string | null>();
  @Output() backRequested = new EventEmitter<void>();
  @Output() forwardRequested = new EventEmitter<void>();
  @Output() upFolderRequested = new EventEmitter<void>();

  protected readonly sortOptions: readonly SortOption[] = [
    {value: 'name-asc', label: 'Name A-Z'},
    {value: 'name-desc', label: 'Name Z-A'},
    {value: 'uploaded-desc', label: 'Newest uploaded'},
    {value: 'uploaded-asc', label: 'Oldest uploaded'},
    {value: 'updated-desc', label: 'Recently updated'},
    {value: 'updated-asc', label: 'Oldest updated'},
    {value: 'size-desc', label: 'Largest file'},
    {value: 'size-asc', label: 'Smallest file'},
    {value: 'type-asc', label: 'File type'},
    {value: 'extension-asc', label: 'Extension'},
    {value: 'width-desc', label: 'Width'},
    {value: 'height-desc', label: 'Height'},
    {value: 'aspect-ratio-desc', label: 'Aspect ratio'},
    {value: 'rating-desc', label: 'Rating'},
    {value: 'favorite-desc', label: 'Favorites first'},
  ];

  protected readonly viewModes: readonly { value: MediaViewMode; label: string }[] = [
    {value: 'grid', label: 'Grid'},
    {value: 'list', label: 'List'},
    {value: 'compact', label: 'Compact'},
  ];

  protected onFilesSelected(event: Event, input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []);
    input.value = '';

    if (files.length > 0) {
      this.filesSelected.emit(files);
    }
  }

  protected getSortValue(event: Event): MediaSortMode {
    return (event.target as HTMLSelectElement).value as MediaSortMode;
  }

  protected getNumberValue(event: Event): number {
    return Number((event.target as HTMLInputElement).value);
  }

  protected getCheckboxChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }
}
