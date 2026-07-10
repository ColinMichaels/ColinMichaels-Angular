import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, HostListener, inject} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {BehaviorSubject, Observable, combineLatest, of} from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap
} from 'rxjs/operators';

import {
  MediaFilterChip,
  MediaFilterState,
  MediaLibraryFolder,
  MediaLibraryFolderView,
  MediaLibraryItem,
  MediaLibraryStats,
  MediaQuickFilter,
  MediaSortMode,
  MediaType,
  MediaViewMode,
  ResizeMediaRequest,
  ResizeMediaResult,
  RenamePreviewRow,
} from './models/media-library.models';
import {MediaLibraryService} from './services/media-library.service';
import {MediaProcessingService} from './services/media-processing.service';
import {
  createDefaultFilterState,
  createFilterChips,
  ensureExtension,
  filterMediaItems,
  flattenFolders,
  getExtensions,
  getFolderItemCounts,
  isValidDisplayName,
  sortMediaItems,
  summarizeTags,
} from './utils/media-library.utils';
import {BatchRenameDialogComponent} from './components/batch-rename-dialog.component';
import {MediaCardSelectionEvent} from './components/media-card.component';
import {MediaFilterPanelComponent} from './components/media-filter-panel.component';
import {MediaGridComponent} from './components/media-grid.component';
import {MediaInspectorComponent} from './components/media-inspector.component';
import {MediaLibrarySidebarComponent} from './components/media-library-sidebar.component';
import {MediaLibraryToolbarComponent} from './components/media-library-toolbar.component';
import {MediaPreviewDialogComponent} from './components/media-preview-dialog.component';
import {MediaStatusBarComponent} from './components/media-status-bar.component';
import {ResizeMediaDialogComponent} from './components/resize-media-dialog.component';
import {TagEditorComponent} from './components/tag-editor.component';

interface BreadcrumbItem {
  id: string | null;
  label: string;
}

interface MediaLibraryViewModel {
  allItems: readonly MediaLibraryItem[];
  filteredItems: readonly MediaLibraryItem[];
  visibleItems: readonly MediaLibraryItem[];
  selectedItems: readonly MediaLibraryItem[];
  selectedIds: ReadonlySet<string>;
  folders: readonly MediaLibraryFolder[];
  folderViews: readonly MediaLibraryFolderView[];
  breadcrumbs: readonly BreadcrumbItem[];
  tags: readonly { name: string; count: number }[];
  availableTags: readonly string[];
  availableExtensions: readonly string[];
  typeCounts: Readonly<Record<MediaType, number>>;
  activeFilterChips: readonly MediaFilterChip[];
  stats: MediaLibraryStats;
  sortMode: MediaSortMode;
  viewMode: MediaViewMode;
  thumbnailSize: number;
  filters: MediaFilterState;
  quickFilter: MediaQuickFilter;
  activeMediaType: MediaType | null;
  activeTag: string | null;
  selectedFolderId: string | null;
  inspectorOpen: boolean;
  searchEntireLibrary: boolean;
  loading: boolean;
  errorMessage: string;
  canLoadMore: boolean;
}

const PAGE_SIZE = 96;
const SORT_STORAGE_KEY = 'media-library-sort-mode';
const allowedSortModes: readonly MediaSortMode[] = [
  'name-asc',
  'name-desc',
  'uploaded-desc',
  'uploaded-asc',
  'updated-desc',
  'updated-asc',
  'size-desc',
  'size-asc',
  'type-asc',
  'extension-asc',
  'width-desc',
  'height-desc',
  'aspect-ratio-desc',
  'rating-desc',
  'favorite-desc',
];

@Component({
  selector: 'app-media-library-page',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    BatchRenameDialogComponent,
    MediaFilterPanelComponent,
    MediaGridComponent,
    MediaInspectorComponent,
    MediaLibrarySidebarComponent,
    MediaLibraryToolbarComponent,
    MediaPreviewDialogComponent,
    MediaStatusBarComponent,
    ResizeMediaDialogComponent,
    TagEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (vm$ | async; as vm) {
      <main class="cms-media-library min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
        <section class="mx-auto max-w-7xl space-y-8">
          <header class="grid gap-5 border-b border-zinc-800 pb-8 md:grid-cols-[1fr_auto] md:items-end">
            <div class="space-y-3">
              <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">CMS</p>
              <h1 class="text-4xl font-semibold text-zinc-50">Media Library</h1>
              <p class="max-w-2xl text-zinc-400">Browse, organize, rename, resize, tag, and preview Firebase-backed CMS media assets.</p>
            </div>
          </header>

          <section class="overflow-hidden border border-zinc-800 bg-zinc-950/80 shadow-2xl">
            <app-media-library-toolbar
              [searchControl]="searchControl"
              [breadcrumbs]="vm.breadcrumbs"
              [sortMode]="vm.sortMode"
              [viewMode]="vm.viewMode"
              [thumbnailSize]="vm.thumbnailSize"
              [activeFilterCount]="vm.activeFilterChips.length"
              [searchEntireLibrary]="vm.searchEntireLibrary"
              (sortModeChange)="setSortMode($event)"
              (viewModeChange)="viewModeSubject.next($event)"
              (thumbnailSizeChange)="thumbnailSizeSubject.next($event)"
              (filterToggle)="filterPanelOpen = true"
              (filesSelected)="uploadFiles($event)"
              (refreshRequested)="refresh()"
              (sidebarToggle)="sidebarDrawerOpen = true"
              (searchEntireLibraryChange)="searchEntireLibrarySubject.next($event)"
              (breadcrumbSelected)="selectFolder($event)"
              (backRequested)="navigateBack()"
              (forwardRequested)="showToast('Forward navigation is reserved for folder history.')"
              (upFolderRequested)="navigateUp(vm.folders, vm.selectedFolderId)"
            />

            <input #pageFileInput type="file" class="hidden" multiple (change)="onPageFilesSelected($event, pageFileInput)">

            <div class="flex h-[calc(100vh-300px)] min-h-[620px] min-w-0">
          <div class="hidden lg:block">
            <app-media-library-sidebar
              [activeQuickFilter]="vm.quickFilter"
              [activeMediaType]="vm.activeMediaType"
              [selectedFolderId]="vm.selectedFolderId"
              [activeTag]="vm.activeTag"
              [folders]="vm.folderViews"
              [tags]="vm.tags"
              [selectedCount]="vm.selectedItems.length"
              [totalCount]="vm.allItems.length"
              [typeCounts]="vm.typeCounts"
              (quickFilterChange)="quickFilterSubject.next($event); resetVisibleLimit()"
              (mediaTypeChange)="activeMediaTypeSubject.next($event); resetVisibleLimit()"
              (folderChange)="selectFolder($event)"
              (tagChange)="activeTagSubject.next($event); resetVisibleLimit()"
              (uploadRequested)="pageFileInput.click()"
              (newFolderRequested)="createFolder(vm.folders, $event)"
              (refreshRequested)="refresh()"
              (batchProcessRequested)="openResizeDialog(vm.selectedItems)"
            />
          </div>

          <section class="flex min-w-0 flex-1 flex-col">
            @if (vm.activeFilterChips.length > 0) {
              <div class="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
                @for (chip of vm.activeFilterChips; track chip.id) {
                  <button
                    type="button"
                    class="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    [attr.aria-label]="'Remove filter ' + chip.label"
                    (click)="removeFilterChip(chip.id)"
                  >
                    {{ chip.label }} x
                  </button>
                }
                <button type="button" class="text-xs font-semibold text-gray-500 hover:text-blue-700" (click)="clearFilters()">Clear all filters</button>
              </div>
            }

            @if (vm.selectedItems.length > 0) {
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-4 py-2 text-sm">
                <div class="font-semibold text-blue-900">{{ vm.selectedItems.length }} selected</div>
                <div class="flex flex-wrap items-center gap-2">
                  <button type="button" class="batch-button" (click)="openRenameDialog(vm.selectedItems)">{{ vm.selectedItems.length === 1 ? 'Rename' : 'Batch Rename' }}</button>
                  <button type="button" class="batch-button" (click)="openResizeDialog(vm.selectedItems)">Resize</button>
                  <button type="button" class="batch-button" (click)="openTagDialog(vm.selectedItems, 'add')">Add Tags</button>
                  <button type="button" class="batch-button" (click)="openTagDialog(vm.selectedItems, 'remove')">Remove Tags</button>
                  <select class="rounded-md border border-blue-200 bg-white px-2 py-1.5 text-sm text-blue-900" (change)="moveSelectedItems($event, vm.selectedItems, vm.folders)">
                    <option value="">Move to...</option>
                    <option value="__uncategorized">Uncategorized</option>
                    @for (folder of vm.folders; track folder.id) {
                      <option [value]="folder.id">{{ folder.path }}</option>
                    }
                  </select>
                  <button type="button" class="batch-button" (click)="setFavorite(vm.selectedItems, true)">Favorite</button>
                  <button type="button" class="batch-button" (click)="setFavorite(vm.selectedItems, false)">Unfavorite</button>
                  <button type="button" class="batch-button" (click)="archiveItems(vm.selectedItems)">Archive</button>
                  <button type="button" class="danger-batch-button" (click)="deleteItems(vm.selectedItems)">Delete</button>
                  <button type="button" class="batch-button" (click)="clearSelection()">Clear</button>
                </div>
              </div>
            }

            <app-media-grid
              [items]="vm.visibleItems"
              [selectedIds]="vm.selectedIds"
              [viewMode]="vm.viewMode"
              [thumbnailSize]="vm.thumbnailSize"
              [loading]="vm.loading"
              [errorMessage]="vm.errorMessage"
              [hasActiveFilters]="vm.activeFilterChips.length > 0"
              [canLoadMore]="vm.canLoadMore"
              [totalFilteredCount]="vm.filteredItems.length"
              [isDragging]="draggingOverGrid"
              (selection)="handleSelection($event)"
              (preview)="openPreview($event)"
              (favorite)="toggleFavorite($event)"
              (contextMenu)="openPreview($event.item)"
              (uploadRequested)="pageFileInput.click()"
              (filesDropped)="uploadFiles($event)"
              (dragEnter)="draggingOverGrid = true"
              (dragLeave)="draggingOverGrid = false"
              (refreshRequested)="refresh()"
              (clearFiltersRequested)="clearFilters()"
              (loadMoreRequested)="loadMore()"
            />
          </section>

          @if (vm.inspectorOpen) {
            <div class="hidden xl:block">
              <app-media-inspector
                [selectedItems]="vm.selectedItems"
                [folders]="vm.folders"
                [availableTags]="vm.availableTags"
                (metadataSave)="saveMetadata($event.item, $event.patch)"
                (renameRequested)="openSingleRename($event)"
                (batchRenameRequested)="openRenameDialog($event)"
                (resizeRequested)="openResizeDialog($event)"
                (previewRequested)="openPreview($event)"
                (batchTagRequested)="openTagDialog($event, 'add')"
                (favoriteRequested)="setFavorite($event.items, $event.favorite)"
                (archiveRequested)="archiveItems($event)"
                (deleteRequested)="deleteItems($event)"
                (copyUrlRequested)="copyUrl($event)"
                (closeRequested)="inspectorOpenSubject.next(false)"
              />
            </div>
          }
            </div>

            <app-media-status-bar
              [totalCount]="vm.stats.total"
              [visibleCount]="vm.stats.visible"
              [selectedCount]="vm.stats.selected"
              [uploadingCount]="vm.stats.uploading"
              [processingCount]="vm.stats.processing"
              [failedCount]="vm.stats.failed"
            />
          </section>

        @if (sidebarDrawerOpen) {
          <div class="fixed inset-0 z-40 lg:hidden">
            <button type="button" class="absolute inset-0 bg-gray-950/40" aria-label="Close folders" (click)="sidebarDrawerOpen = false"></button>
            <div class="relative z-10 h-full">
              <app-media-library-sidebar
                [activeQuickFilter]="vm.quickFilter"
                [activeMediaType]="vm.activeMediaType"
                [selectedFolderId]="vm.selectedFolderId"
                [activeTag]="vm.activeTag"
                [folders]="vm.folderViews"
                [tags]="vm.tags"
                [selectedCount]="vm.selectedItems.length"
                [totalCount]="vm.allItems.length"
                [typeCounts]="vm.typeCounts"
                (quickFilterChange)="quickFilterSubject.next($event); sidebarDrawerOpen = false; resetVisibleLimit()"
                (mediaTypeChange)="activeMediaTypeSubject.next($event); resetVisibleLimit()"
                (folderChange)="selectFolder($event); sidebarDrawerOpen = false"
                (tagChange)="activeTagSubject.next($event); resetVisibleLimit()"
                (uploadRequested)="pageFileInput.click()"
                (newFolderRequested)="createFolder(vm.folders, $event)"
                (refreshRequested)="refresh()"
                (batchProcessRequested)="openResizeDialog(vm.selectedItems)"
                (closeRequested)="sidebarDrawerOpen = false"
              />
            </div>
          </div>
        }

        @if (filterPanelOpen) {
          <app-media-filter-panel
            [filters]="vm.filters"
            [availableTags]="vm.availableTags"
            [availableExtensions]="vm.availableExtensions"
            [folders]="vm.folders"
            (filtersApplied)="applyFilters($event)"
            (filtersCleared)="clearFilters()"
            (closeRequested)="filterPanelOpen = false"
          />
        }

        @if (batchRenameItems.length > 0) {
          <app-batch-rename-dialog
            [items]="batchRenameItems"
            [allItems]="vm.allItems"
            (renameApplied)="applyBatchRename($event)"
            (closeRequested)="batchRenameItems = []"
          />
        }

        @if (resizeItems.length > 0) {
          <app-resize-media-dialog
            [items]="resizeItems"
            [folders]="vm.folders"
            (submitRequest)="submitResize($event)"
            (closeRequested)="resizeItems = []"
          />
        }

        @if (previewItemId) {
          <app-media-preview-dialog
            [items]="vm.filteredItems"
            [currentItemId]="previewItemId"
            (closeRequested)="previewItemId = null"
            (favoriteToggled)="toggleFavorite($event)"
            (urlCopyRequested)="copyUrl($event)"
            (resizeRequested)="openResizeDialog($event)"
            (renameRequested)="openSingleRename($event)"
          />
        }

        @if (tagDialogItems.length > 0) {
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Batch tag media">
            <button type="button" class="absolute inset-0 bg-gray-950/50" aria-label="Close tag editor" (click)="closeTagDialog()"></button>
            <section class="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
              <header class="flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-lg font-semibold text-gray-900">{{ batchTagMode === 'add' ? 'Add Tags' : 'Remove Tags' }}</h2>
                  <p class="text-sm text-gray-500">Apply tag changes to {{ tagDialogItems.length }} selected item{{ tagDialogItems.length === 1 ? '' : 's' }}.</p>
                </div>
                <button type="button" class="rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-600" (click)="closeTagDialog()">Close</button>
              </header>
              <div class="mt-5">
                <app-tag-editor [tags]="batchTags" [availableTags]="vm.availableTags" (tagsChange)="batchTags = $event" />
              </div>
              <footer class="mt-5 flex justify-end gap-2">
                <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700" (click)="closeTagDialog()">Cancel</button>
                <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300" [disabled]="batchTags.length === 0" (click)="applyBatchTags()">Apply</button>
              </footer>
            </section>
          </div>
        }

        @if (singleRenameItem) {
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Rename media">
            <button type="button" class="absolute inset-0 bg-gray-950/50" aria-label="Close rename" (click)="closeSingleRename()"></button>
            <form class="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl" (ngSubmit)="applySingleRename()">
              <h2 class="text-lg font-semibold text-gray-900">Rename Media</h2>
              <p class="mt-1 text-sm text-gray-500">The extension is preserved by default. Storage object paths are not changed.</p>
              <label class="mt-5 block space-y-1">
                <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Display name</span>
                <input class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" name="singleRenameValue" [(ngModel)]="singleRenameValue" required>
              </label>
              <footer class="mt-5 flex justify-end gap-2">
                <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700" (click)="closeSingleRename()">Cancel</button>
                <button type="submit" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Rename</button>
              </footer>
            </form>
          </div>
        }

        @if (toastMessage) {
          <div class="fixed bottom-12 left-1/2 z-50 max-w-lg -translate-x-1/2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-xl">
            {{ toastMessage }}
          </div>
        }
        </section>
      </main>
    }
  `,
  styles: [`
    .batch-button,
    .danger-batch-button {
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 0.4rem 0.7rem;
    }

    .batch-button {
      background: #18181b;
      border: 1px solid rgb(34 211 238 / 0.45);
      color: #a5f3fc;
    }

    .batch-button:hover {
      background: #22d3ee;
      color: #09090b;
    }

    .danger-batch-button {
      background: #18181b;
      border: 1px solid rgb(248 113 113 / 0.45);
      color: #fca5a5;
    }

    .danger-batch-button:hover {
      background: rgb(127 29 29 / 0.5);
    }

    :host ::ng-deep .cms-media-library .bg-white,
    :host ::ng-deep .cms-media-library .bg-gray-50 {
      background-color: #18181b !important;
    }

    :host ::ng-deep .cms-media-library .bg-gray-100,
    :host ::ng-deep .cms-media-library .bg-gray-200 {
      background-color: #27272a !important;
    }

    :host ::ng-deep .cms-media-library .bg-\\[\\#f8f9fb\\] {
      background-color: #09090b !important;
    }

    :host ::ng-deep .cms-media-library .border-gray-100,
    :host ::ng-deep .cms-media-library .border-gray-200,
    :host ::ng-deep .cms-media-library .border-gray-300 {
      border-color: #27272a !important;
    }

    :host ::ng-deep .cms-media-library .text-gray-900,
    :host ::ng-deep .cms-media-library .text-gray-800,
    :host ::ng-deep .cms-media-library .text-gray-700 {
      color: #f4f4f5 !important;
    }

    :host ::ng-deep .cms-media-library .text-gray-600,
    :host ::ng-deep .cms-media-library .text-gray-500,
    :host ::ng-deep .cms-media-library .text-gray-400 {
      color: #a1a1aa !important;
    }

    :host ::ng-deep .cms-media-library .bg-blue-50 {
      background-color: rgb(8 145 178 / 0.16) !important;
    }

    :host ::ng-deep .cms-media-library .bg-blue-100 {
      background-color: rgb(8 145 178 / 0.26) !important;
    }

    :host ::ng-deep .cms-media-library .border-blue-100,
    :host ::ng-deep .cms-media-library .border-blue-200,
    :host ::ng-deep .cms-media-library .border-blue-300 {
      border-color: rgb(34 211 238 / 0.45) !important;
    }

    :host ::ng-deep .cms-media-library .text-blue-900,
    :host ::ng-deep .cms-media-library .text-blue-800,
    :host ::ng-deep .cms-media-library .text-blue-700,
    :host ::ng-deep .cms-media-library .text-blue-600,
    :host ::ng-deep .cms-media-library .text-blue-500 {
      color: #a5f3fc !important;
    }

    :host ::ng-deep .cms-media-library .bg-blue-600 {
      background-color: #22d3ee !important;
      color: #09090b !important;
    }

    :host ::ng-deep .cms-media-library .hover\\:bg-blue-700:hover,
    :host ::ng-deep .cms-media-library .hover\\:bg-blue-100:hover,
    :host ::ng-deep .cms-media-library .hover\\:bg-blue-50:hover {
      background-color: #67e8f9 !important;
      color: #09090b !important;
    }

    :host ::ng-deep .cms-media-library .hover\\:text-blue-700:hover,
    :host ::ng-deep .cms-media-library .hover\\:text-blue-900:hover {
      color: #67e8f9 !important;
    }

    :host ::ng-deep .cms-media-library input:not([type='range']):not([type='checkbox']),
    :host ::ng-deep .cms-media-library select,
    :host ::ng-deep .cms-media-library textarea,
    :host ::ng-deep .cms-media-library .field-input {
      background-color: #09090b !important;
      border-color: #3f3f46 !important;
      color: #f4f4f5 !important;
      color-scheme: dark;
    }

    :host ::ng-deep .cms-media-library input::placeholder,
    :host ::ng-deep .cms-media-library textarea::placeholder {
      color: #71717a !important;
    }

    :host ::ng-deep .cms-media-library option {
      background: #09090b;
      color: #f4f4f5;
    }

    :host ::ng-deep .cms-media-library app-media-library-toolbar header,
    :host ::ng-deep .cms-media-library app-media-status-bar footer,
    :host ::ng-deep .cms-media-library app-media-library-sidebar aside,
    :host ::ng-deep .cms-media-library app-media-inspector aside {
      background-color: #18181b !important;
      border-color: #27272a !important;
      color: #f4f4f5 !important;
      box-shadow: none !important;
    }

    :host ::ng-deep .cms-media-library app-media-grid > section {
      background-color: #09090b !important;
    }

    :host ::ng-deep .cms-media-library app-media-card article {
      background-color: #18181b !important;
      border-color: #27272a !important;
    }

    :host ::ng-deep .cms-media-library app-media-card article:hover {
      border-color: rgb(34 211 238 / 0.45) !important;
      box-shadow: 0 16px 36px rgb(0 0 0 / 0.28) !important;
    }

    :host ::ng-deep .cms-media-library app-media-card article[aria-selected='true'] {
      background-color: rgb(8 145 178 / 0.16) !important;
      border-color: #22d3ee !important;
    }

    :host ::ng-deep .cms-media-library .primary-action {
      background: #22d3ee !important;
      color: #09090b !important;
    }

    :host ::ng-deep .cms-media-library .secondary-action {
      background: #18181b !important;
      border-color: #3f3f46 !important;
      color: #e4e4e7 !important;
    }

    :host ::ng-deep .cms-media-library .secondary-action:hover:not(:disabled) {
      background: #27272a !important;
      border-color: rgb(34 211 238 / 0.45) !important;
      color: #a5f3fc !important;
    }

    :host ::ng-deep .cms-media-library .danger-action {
      background: #18181b !important;
      border-color: rgb(248 113 113 / 0.45) !important;
      color: #fca5a5 !important;
    }
  `],
})
export class MediaLibraryPageComponent {
  private readonly mediaLibrary = inject(MediaLibraryService);
  private readonly mediaProcessing = inject(MediaProcessingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);

  protected readonly searchControl = new FormControl('', {nonNullable: true});
  protected readonly sortModeSubject = new BehaviorSubject<MediaSortMode>(this.getInitialSortMode());
  protected readonly viewModeSubject = new BehaviorSubject<MediaViewMode>('grid');
  protected readonly thumbnailSizeSubject = new BehaviorSubject<number>(180);
  protected readonly filtersSubject = new BehaviorSubject<MediaFilterState>(createDefaultFilterState());
  protected readonly quickFilterSubject = new BehaviorSubject<MediaQuickFilter>('all');
  protected readonly selectedFolderIdSubject = new BehaviorSubject<string | null>(null);
  protected readonly activeMediaTypeSubject = new BehaviorSubject<MediaType | null>(null);
  protected readonly activeTagSubject = new BehaviorSubject<string | null>(null);
  protected readonly selectedIdsSubject = new BehaviorSubject<ReadonlySet<string>>(new Set<string>());
  protected readonly inspectorOpenSubject = new BehaviorSubject<boolean>(true);
  protected readonly searchEntireLibrarySubject = new BehaviorSubject<boolean>(true);

  private readonly refreshSubject = new BehaviorSubject<number>(0);
  private readonly loadingSubject = new BehaviorSubject<boolean>(true);
  private readonly errorSubject = new BehaviorSubject<string>('');
  private readonly visibleLimitSubject = new BehaviorSubject<number>(PAGE_SIZE);
  private readonly uploadingCountSubject = new BehaviorSubject<number>(0);

  protected filterPanelOpen = false;
  protected sidebarDrawerOpen = false;
  protected draggingOverGrid = false;
  protected previewItemId: string | null = null;
  protected batchRenameItems: readonly MediaLibraryItem[] = [];
  protected resizeItems: readonly MediaLibraryItem[] = [];
  protected tagDialogItems: readonly MediaLibraryItem[] = [];
  protected batchTagMode: 'add' | 'remove' = 'add';
  protected batchTags: readonly string[] = [];
  protected singleRenameItem: MediaLibraryItem | null = null;
  protected singleRenameValue = '';
  protected toastMessage = '';

  private allItemsSnapshot: readonly MediaLibraryItem[] = [];
  private visibleItemsSnapshot: readonly MediaLibraryItem[] = [];
  private selectedItemsSnapshot: readonly MediaLibraryItem[] = [];
  private foldersSnapshot: readonly MediaLibraryFolder[] = [];
  private lastSelectedIndex: number | null = null;
  private folderHistory: (string | null)[] = [null];

  private readonly mediaItems$ = this.refreshSubject.pipe(
    tap(() => {
      this.loadingSubject.next(true);
      this.errorSubject.next('');
    }),
    switchMap(() => this.mediaLibrary.listenToMediaItems().pipe(
      tap(() => this.loadingSubject.next(false)),
      catchError(error => {
        this.loadingSubject.next(false);
        this.errorSubject.next(this.getErrorMessage(error));
        return of([] as readonly MediaLibraryItem[]);
      })
    )),
    shareReplay({bufferSize: 1, refCount: true})
  );

  private readonly folders$ = this.refreshSubject.pipe(
    switchMap(() => this.mediaLibrary.listenToFolders().pipe(
      catchError(() => of([] as readonly MediaLibraryFolder[]))
    )),
    shareReplay({bufferSize: 1, refCount: true})
  );

  private readonly searchText$ = this.searchControl.valueChanges.pipe(
    startWith(this.searchControl.value),
    debounceTime(250),
    distinctUntilChanged(),
    tap(() => this.resetVisibleLimit())
  );

  protected readonly vm$: Observable<MediaLibraryViewModel> = combineLatest([
    this.mediaItems$,
    this.folders$,
    this.searchText$,
    this.sortModeSubject,
    this.viewModeSubject,
    this.thumbnailSizeSubject,
    this.filtersSubject,
    this.quickFilterSubject,
    this.selectedFolderIdSubject,
    this.activeMediaTypeSubject,
    this.activeTagSubject,
    this.selectedIdsSubject,
    this.inspectorOpenSubject,
    this.searchEntireLibrarySubject,
    this.loadingSubject,
    this.errorSubject,
    this.visibleLimitSubject,
    this.uploadingCountSubject,
  ]).pipe(
    map(([
           allItems,
           folders,
           searchText,
           sortMode,
           viewMode,
           thumbnailSize,
           filters,
           quickFilter,
           selectedFolderId,
           activeMediaType,
           activeTag,
           selectedIds,
           inspectorOpen,
           searchEntireLibrary,
           loading,
           errorMessage,
           visibleLimit,
           uploadingCount,
         ]) => {
      const effectiveFolderId = searchText.trim() && searchEntireLibrary ? null : selectedFolderId;
      const filteredItems = sortMediaItems(
        filterMediaItems(allItems, searchText, filters, quickFilter, effectiveFolderId, activeMediaType, activeTag),
        sortMode
      );
      const visibleItems = filteredItems.slice(0, visibleLimit);
      const selectedItems = allItems.filter(item => selectedIds.has(item.id));
      const tagSummaries = summarizeTags(allItems);
      const availableTags = tagSummaries.map(tag => tag.name);
      const availableExtensions = getExtensions(allItems);
      const folderViews = flattenFolders(folders, getFolderItemCounts(allItems));
      const activeFilterChips = createFilterChips(searchText, filters, quickFilter, selectedFolderId, activeMediaType, activeTag, folders);
      const typeCounts = this.getTypeCounts(allItems);
      const stats: MediaLibraryStats = {
        total: allItems.length,
        visible: filteredItems.length,
        selected: selectedItems.length,
        processing: allItems.filter(item => item.status === 'processing' || item.status === 'uploading').length,
        failed: allItems.filter(item => item.status === 'failed').length,
        uploading: uploadingCount,
      };

      this.allItemsSnapshot = allItems;
      this.visibleItemsSnapshot = visibleItems;
      this.selectedItemsSnapshot = selectedItems;
      this.foldersSnapshot = folders;

      return {
        allItems,
        filteredItems,
        visibleItems,
        selectedItems,
        selectedIds,
        folders,
        folderViews,
        breadcrumbs: this.getBreadcrumbs(folders, selectedFolderId),
        tags: tagSummaries,
        availableTags,
        availableExtensions,
        typeCounts,
        activeFilterChips,
        stats,
        sortMode,
        viewMode,
        thumbnailSize,
        filters,
        quickFilter,
        activeMediaType,
        activeTag,
        selectedFolderId,
        inspectorOpen,
        searchEntireLibrary,
        loading,
        errorMessage,
        canLoadMore: filteredItems.length > visibleItems.length,
      };
    }),
    shareReplay({bufferSize: 1, refCount: true})
  );

  @HostListener('document:keydown', ['$event'])
  protected handleKeyboardShortcut(event: KeyboardEvent): void {
    if (this.isTypingTarget(event.target)) {
      return;
    }

    const modifier = event.metaKey || event.ctrlKey;

    if (modifier && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      document.getElementById('media-library-search')?.focus();
      return;
    }

    if (modifier && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      this.selectAllVisible();
      return;
    }

    if (modifier && event.key.toLowerCase() === 'r') {
      event.preventDefault();
      if (this.selectedItemsSnapshot.length === 1 && this.selectedItemsSnapshot[0]) {
        this.openSingleRename(this.selectedItemsSnapshot[0]);
      }
      return;
    }

    if (modifier && event.key.toLowerCase() === 'i') {
      event.preventDefault();
      this.inspectorOpenSubject.next(!this.inspectorOpenSubject.value);
      return;
    }

    if (event.key === 'Escape') {
      this.clearTransientUi();
      return;
    }

    if (event.key === 'Enter' && this.selectedItemsSnapshot[0]) {
      event.preventDefault();
      this.openPreview(this.selectedItemsSnapshot[0]);
      return;
    }

    if (event.key === 'Delete' && this.selectedItemsSnapshot.length > 0) {
      event.preventDefault();
      if (event.shiftKey) {
        this.deleteItems(this.selectedItemsSnapshot);
      } else {
        this.archiveItems(this.selectedItemsSnapshot);
      }
      return;
    }

    if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      this.navigateGridSelection(event);
    }
  }

  protected setSortMode(sortMode: MediaSortMode): void {
    this.sortModeSubject.next(sortMode);
    this.resetVisibleLimit();

    try {
      localStorage.setItem(SORT_STORAGE_KEY, sortMode);
    } catch {
      // Local storage may be unavailable; sorting still works in component state.
    }
  }

  protected refresh(): void {
    this.refreshSubject.next(Date.now());
  }

  protected resetVisibleLimit(): void {
    this.visibleLimitSubject.next(PAGE_SIZE);
  }

  protected loadMore(): void {
    this.visibleLimitSubject.next(this.visibleLimitSubject.value + PAGE_SIZE);
  }

  protected applyFilters(filters: MediaFilterState): void {
    this.filtersSubject.next(filters);
    this.filterPanelOpen = false;
    this.resetVisibleLimit();
  }

  protected clearFilters(): void {
    this.searchControl.setValue('');
    this.filtersSubject.next(createDefaultFilterState());
    this.quickFilterSubject.next('all');
    this.activeMediaTypeSubject.next(null);
    this.activeTagSubject.next(null);
    this.resetVisibleLimit();
  }

  protected removeFilterChip(chipId: string): void {
    const filters = this.filtersSubject.value;

    if (chipId === 'search') {
      this.searchControl.setValue('');
    } else if (chipId === 'quick') {
      this.quickFilterSubject.next('all');
    } else if (chipId === 'selected-folder') {
      this.selectFolder(null);
    } else if (chipId === 'active-type') {
      this.activeMediaTypeSubject.next(null);
    } else if (chipId === 'active-tag') {
      this.activeTagSubject.next(null);
    } else if (chipId.startsWith('type:')) {
      this.filtersSubject.next({...filters, mediaTypes: filters.mediaTypes.filter(type => `type:${type}` !== chipId)});
    } else if (chipId.startsWith('extension:')) {
      this.filtersSubject.next({
        ...filters,
        extensions: filters.extensions.filter(extension => `extension:${extension}` !== chipId)
      });
    } else if (chipId.startsWith('status:')) {
      this.filtersSubject.next({
        ...filters,
        statuses: filters.statuses.filter(status => `status:${status}` !== chipId)
      });
    } else if (chipId.startsWith('tag:')) {
      this.filtersSubject.next({...filters, includeTags: filters.includeTags.filter(tag => `tag:${tag}` !== chipId)});
    } else if (chipId.startsWith('exclude-tag:')) {
      this.filtersSubject.next({
        ...filters,
        excludeTags: filters.excludeTags.filter(tag => `exclude-tag:${tag}` !== chipId)
      });
    } else {
      this.filtersSubject.next(this.clearKnownFilterChip(filters, chipId));
    }

    this.resetVisibleLimit();
  }

  protected selectFolder(folderId: string | null): void {
    this.selectedFolderIdSubject.next(folderId);
    this.folderHistory.push(folderId);
    this.resetVisibleLimit();
  }

  protected navigateBack(): void {
    if (this.folderHistory.length <= 1) {
      return;
    }

    this.folderHistory.pop();
    this.selectedFolderIdSubject.next(this.folderHistory[this.folderHistory.length - 1] ?? null);
    this.resetVisibleLimit();
  }

  protected navigateUp(folders: readonly MediaLibraryFolder[], selectedFolderId: string | null): void {
    if (!selectedFolderId) {
      return;
    }

    const folder = folders.find(candidate => candidate.id === selectedFolderId);
    this.selectFolder(folder?.parentId ?? null);
  }

  protected handleSelection(selection: MediaCardSelectionEvent): void {
    const currentSelection = new Set(this.selectedIdsSubject.value);
    const mouseEvent = selection.mouseEvent;
    const isToggle = mouseEvent?.metaKey || mouseEvent?.ctrlKey || selection.keyboardEvent;
    const isRange = mouseEvent?.shiftKey && this.lastSelectedIndex !== null;

    if (isRange) {
      const start = Math.min(this.lastSelectedIndex ?? selection.index, selection.index);
      const end = Math.max(this.lastSelectedIndex ?? selection.index, selection.index);

      for (const item of this.visibleItemsSnapshot.slice(start, end + 1)) {
        currentSelection.add(item.id);
      }
    } else if (isToggle) {
      if (currentSelection.has(selection.item.id)) {
        currentSelection.delete(selection.item.id);
      } else {
        currentSelection.add(selection.item.id);
      }
      this.lastSelectedIndex = selection.index;
    } else {
      currentSelection.clear();
      currentSelection.add(selection.item.id);
      this.lastSelectedIndex = selection.index;
    }

    this.selectedIdsSubject.next(currentSelection);
  }

  protected selectAllVisible(): void {
    this.selectedIdsSubject.next(new Set(this.visibleItemsSnapshot.map(item => item.id)));
  }

  protected clearSelection(): void {
    this.selectedIdsSubject.next(new Set<string>());
    this.lastSelectedIndex = null;
  }

  protected openPreview(item: MediaLibraryItem): void {
    this.previewItemId = item.id;
    this.changeDetector.markForCheck();
  }

  protected openSingleRename(item: MediaLibraryItem): void {
    this.singleRenameItem = item;
    this.singleRenameValue = item.displayName;
    this.changeDetector.markForCheck();
  }

  protected closeSingleRename(): void {
    this.singleRenameItem = null;
    this.singleRenameValue = '';
  }

  protected applySingleRename(): void {
    const item = this.singleRenameItem;

    if (!item) {
      return;
    }

    const nextName = ensureExtension(this.singleRenameValue.trim(), item.extension);

    if (!isValidDisplayName(nextName)) {
      this.showToast('Use a non-empty name without \\ / : * ? " < > | characters.');
      return;
    }

    this.runOperation(
      this.mediaLibrary.renameMedia(item.id, nextName),
      'Media renamed.'
    );
    this.closeSingleRename();
  }

  protected openRenameDialog(items: readonly MediaLibraryItem[]): void {
    if (items.length === 1 && items[0]) {
      this.openSingleRename(items[0]);
      return;
    }

    this.batchRenameItems = items;
    this.changeDetector.markForCheck();
  }

  protected applyBatchRename(rows: readonly RenamePreviewRow[]): void {
    this.runOperation(this.mediaLibrary.batchRenameMedia(rows), 'Batch rename applied.');
    this.batchRenameItems = [];
  }

  protected openResizeDialog(items: readonly MediaLibraryItem[]): void {
    const imageItems = items.filter(item => item.mediaType === 'image');

    if (imageItems.length === 0) {
      this.showToast('Select one or more images to resize.');
      return;
    }

    this.resizeItems = imageItems;
    this.changeDetector.markForCheck();
  }

  protected submitResize(request: ResizeMediaRequest): void {
    this.mediaProcessing.resizeMedia(request).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: result => this.handleResizeResult(result),
      error: error => this.showToast(this.getErrorMessage(error)),
    });
    this.resizeItems = [];
  }

  protected openTagDialog(items: readonly MediaLibraryItem[], mode: 'add' | 'remove'): void {
    this.tagDialogItems = items;
    this.batchTagMode = mode;
    this.batchTags = [];
    this.changeDetector.markForCheck();
  }

  protected closeTagDialog(): void {
    this.tagDialogItems = [];
    this.batchTags = [];
  }

  protected applyBatchTags(): void {
    this.runOperation(
      this.mediaLibrary.updateMediaTags(this.tagDialogItems, this.batchTags, this.batchTagMode),
      this.batchTagMode === 'add' ? 'Tags added.' : 'Tags removed.'
    );
    this.closeTagDialog();
  }

  protected saveMetadata(item: MediaLibraryItem, patch: Parameters<MediaLibraryService['updateMediaMetadata']>[1]): void {
    this.runOperation(this.mediaLibrary.updateMediaMetadata(item.id, patch), 'Metadata saved.');
  }

  protected toggleFavorite(item: MediaLibraryItem): void {
    this.setFavorite([item], !item.favorite);
  }

  protected setFavorite(items: readonly MediaLibraryItem[], favorite: boolean): void {
    this.runOperation(
      this.mediaLibrary.setFavorite(items.map(item => item.id), favorite),
      favorite ? 'Marked as favorite.' : 'Removed from favorites.'
    );
  }

  protected archiveItems(items: readonly MediaLibraryItem[]): void {
    if (items.length === 0) {
      return;
    }

    this.runOperation(this.mediaLibrary.archiveMedia(items.map(item => item.id)), 'Media archived.');
    this.clearSelection();
  }

  protected deleteItems(items: readonly MediaLibraryItem[]): void {
    if (items.length === 0) {
      return;
    }

    const confirmed = window.confirm(`Delete ${items.length} media item${items.length === 1 ? '' : 's'}? This marks metadata as deleted unless the backing service supports physical deletion.`);

    if (!confirmed) {
      return;
    }

    this.runOperation(this.mediaLibrary.deleteMedia(items.map(item => item.id)), 'Media deleted.');
    this.clearSelection();
  }

  protected moveSelectedItems(event: Event, items: readonly MediaLibraryItem[], folders: readonly MediaLibraryFolder[]): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    select.value = '';

    if (!value || items.length === 0) {
      return;
    }

    const folder = value === '__uncategorized' ? null : folders.find(candidate => candidate.id === value) ?? null;
    this.runOperation(this.mediaLibrary.moveMedia(items.map(item => item.id), folder), 'Media moved.');
  }

  protected copyUrl(item: MediaLibraryItem): void {
    this.mediaLibrary.copyMediaUrl(item)
      .then(() => this.showToast('Media URL copied.'))
      .catch(error => this.showToast(this.getErrorMessage(error)));
  }

  protected createFolder(folders: readonly MediaLibraryFolder[], parentFolder: MediaLibraryFolder | null): void {
    const name = window.prompt('Folder name');

    if (!name) {
      return;
    }

    const selectedFolder = parentFolder ?? folders.find(folder => folder.id === this.selectedFolderIdSubject.value) ?? null;
    this.runOperation(this.mediaLibrary.createFolder(name, selectedFolder), 'Folder created.');
  }

  protected onPageFilesSelected(event: Event, input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.uploadFiles(files);
  }

  protected uploadFiles(files: readonly File[]): void {
    if (files.length === 0) {
      return;
    }

    const folder = this.foldersSnapshot.find(candidate => candidate.id === this.selectedFolderIdSubject.value) ?? null;
    this.uploadingCountSubject.next(this.uploadingCountSubject.value + files.length);

    this.mediaLibrary.uploadFiles(files, folder).pipe(
      finalize(() => {
        this.uploadingCountSubject.next(Math.max(0, this.uploadingCountSubject.value - files.length));
        this.changeDetector.markForCheck();
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: event => {
        if (event.status === 'complete') {
          this.showToast(`${event.fileName} uploaded.`);
        } else if (event.status === 'failed') {
          this.showToast(`${event.fileName}: ${event.error ?? 'Upload failed.'}`);
        }
      },
      error: error => this.showToast(this.getErrorMessage(error)),
    });
  }

  protected showToast(message: string): void {
    this.toastMessage = message;
    this.changeDetector.markForCheck();

    window.setTimeout(() => {
      if (this.toastMessage === message) {
        this.toastMessage = '';
        this.changeDetector.markForCheck();
      }
    }, 3200);
  }

  private clearTransientUi(): void {
    if (this.previewItemId) {
      this.previewItemId = null;
      return;
    }

    if (this.filterPanelOpen || this.sidebarDrawerOpen || this.batchRenameItems.length > 0 || this.resizeItems.length > 0 || this.tagDialogItems.length > 0 || this.singleRenameItem) {
      this.filterPanelOpen = false;
      this.sidebarDrawerOpen = false;
      this.batchRenameItems = [];
      this.resizeItems = [];
      this.closeTagDialog();
      this.closeSingleRename();
      this.changeDetector.markForCheck();
      return;
    }

    this.clearSelection();
  }

  private navigateGridSelection(event: KeyboardEvent): void {
    if (this.visibleItemsSnapshot.length === 0) {
      return;
    }

    event.preventDefault();
    const selectedId = this.selectedItemsSnapshot[0]?.id;
    const currentIndex = selectedId ? this.visibleItemsSnapshot.findIndex(item => item.id === selectedId) : -1;
    const columnDelta = this.viewModeSubject.value === 'list' ? 1 : 4;
    const delta = event.key === 'ArrowRight'
      ? 1
      : event.key === 'ArrowLeft'
        ? -1
        : event.key === 'ArrowDown'
          ? columnDelta
          : -columnDelta;
    const nextIndex = Math.min(this.visibleItemsSnapshot.length - 1, Math.max(0, (currentIndex >= 0 ? currentIndex : 0) + delta));
    const item = this.visibleItemsSnapshot[nextIndex];

    if (item) {
      this.selectedIdsSubject.next(new Set([item.id]));
      this.lastSelectedIndex = nextIndex;
    }
  }

  private runOperation<T>(operation: Observable<T>, successMessage: string): void {
    operation.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => this.showToast(successMessage),
      error: error => this.showToast(this.getErrorMessage(error)),
    });
  }

  private handleResizeResult(result: ResizeMediaResult): void {
    const summary = result.message
      ?? `Resize submitted: ${result.succeeded || result.submitted} succeeded, ${result.failed} failed${result.jobId ? `, job ${result.jobId}` : ''}.`;

    this.showToast(summary);
    this.refresh();
  }

  private getBreadcrumbs(folders: readonly MediaLibraryFolder[], selectedFolderId: string | null): readonly BreadcrumbItem[] {
    const breadcrumbs: BreadcrumbItem[] = [{id: null, label: 'Home'}];

    if (!selectedFolderId) {
      return breadcrumbs;
    }

    const folderById = new Map(folders.map(folder => [folder.id, folder]));
    const chain: MediaLibraryFolder[] = [];
    let cursor = folderById.get(selectedFolderId) ?? null;

    while (cursor) {
      chain.unshift(cursor);
      cursor = cursor.parentId ? folderById.get(cursor.parentId) ?? null : null;
    }

    return [...breadcrumbs, ...chain.map(folder => ({id: folder.id, label: folder.name}))];
  }

  private getTypeCounts(items: readonly MediaLibraryItem[]): Readonly<Record<MediaType, number>> {
    return {
      image: items.filter(item => item.mediaType === 'image').length,
      video: items.filter(item => item.mediaType === 'video').length,
      audio: items.filter(item => item.mediaType === 'audio').length,
      document: items.filter(item => item.mediaType === 'document').length,
      archive: items.filter(item => item.mediaType === 'archive').length,
      other: items.filter(item => item.mediaType === 'other').length,
    };
  }

  private clearKnownFilterChip(filters: MediaFilterState, chipId: string): MediaFilterState {
    switch (chipId) {
      case 'untagged':
        return {...filters, untagged: false};
      case 'folder':
        return {...filters, folderId: null};
      case 'favorites':
        return {...filters, favorites: 'all'};
      case 'rating-min':
        return {...filters, ratingMin: null};
      case 'rating-exact':
        return {...filters, ratingExact: null};
      case 'uploaded-date':
        return {...filters, uploadedFrom: null, uploadedTo: null};
      case 'updated-date':
        return {...filters, updatedFrom: null, updatedTo: null};
      case 'size':
        return {...filters, sizeMinBytes: null, sizeMaxBytes: null};
      case 'dimensions':
        return {...filters, widthMin: null, widthMax: null, heightMin: null, heightMax: null};
      case 'orientation':
        return {...filters, orientation: 'all'};
      case 'missing-dimensions':
        return {...filters, missingDimensions: false};
      case 'missing-thumbnail':
        return {...filters, missingThumbnail: false};
      default:
        return filters;
    }
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;

    if (!element) {
      return false;
    }

    return element.tagName === 'INPUT'
      || element.tagName === 'TEXTAREA'
      || element.tagName === 'SELECT'
      || element.isContentEditable;
  }

  private getInitialSortMode(): MediaSortMode {
    try {
      const storedMode = localStorage.getItem(SORT_STORAGE_KEY);

      if (storedMode && allowedSortModes.includes(storedMode as MediaSortMode)) {
        return storedMode as MediaSortMode;
      }
    } catch {
      return 'uploaded-desc';
    }

    return 'uploaded-desc';
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error && error.message ? error.message : 'The media library operation failed.';
  }

}
