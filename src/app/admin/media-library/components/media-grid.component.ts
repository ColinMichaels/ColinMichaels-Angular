import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';

import {MediaLibraryItem, MediaViewMode} from '../models/media-library.models';
import {MediaCardComponent, MediaCardSelectionEvent} from './media-card.component';

@Component({
  selector: 'app-media-grid',
  imports: [CommonModule, MediaCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f8f9fb]"
      (dragover)="onDragOver($event)"
      (dragleave)="dragLeave.emit()"
      (drop)="onDrop($event)"
    >
      @if (isDragging) {
        <div class="m-3 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
          Drop files to upload them to the selected folder.
        </div>
      }

      @if (errorMessage) {
        <div class="m-4 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
          <p class="font-semibold">Unable to load media. Try refreshing.</p>
          <p class="mt-1 text-sm text-red-700">{{ errorMessage }}</p>
          <button type="button" class="mt-3 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700" (click)="refreshRequested.emit()">Refresh</button>
        </div>
      } @else if (loading) {
        <div class="grid gap-4 p-4" [style.grid-template-columns]="gridTemplateColumns">
          @for (card of skeletonCards; track card) {
            <div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div class="h-40 animate-pulse bg-gray-200"></div>
              <div class="space-y-2 p-3">
                <div class="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
                <div class="h-3 w-1/2 animate-pulse rounded bg-gray-100"></div>
                <div class="h-6 w-2/3 animate-pulse rounded-full bg-gray-100"></div>
              </div>
            </div>
          }
        </div>
      } @else if (items.length === 0) {
        <div class="flex min-h-[420px] flex-1 items-center justify-center p-8">
          <div class="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">▧</div>
            <h3 class="mt-4 text-lg font-semibold text-gray-900">{{ hasActiveFilters ? 'No media matches your search or filters.' : 'Upload media to start organizing your library.' }}</h3>
            <p class="mt-2 text-sm text-gray-500">
              {{ hasActiveFilters ? 'Adjust the active filters or clear them to show more files.' : 'Images, videos, documents, mockups, and design assets will appear here.' }}
            </p>
            <div class="mt-5 flex justify-center gap-2">
              @if (hasActiveFilters) {
                <button type="button" class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" (click)="clearFiltersRequested.emit()">Clear Filters</button>
              }
              <button type="button" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" (click)="uploadRequested.emit()">Upload Media</button>
            </div>
          </div>
        </div>
      } @else {
        <div class="min-h-0 flex-1 overflow-auto p-4" [class.p-3]="viewMode === 'list'">
          @if (viewMode === 'list') {
            <div class="mb-2 hidden grid-cols-[40px_72px_minmax(160px,1fr)_110px_110px_120px_96px] gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 xl:grid">
              <span></span>
              <span>Preview</span>
              <span>Name</span>
              <span>Type</span>
              <span>Size</span>
              <span>Dimensions</span>
              <span>Uploaded</span>
            </div>
            <div class="space-y-2">
              @for (item of items; track trackByMediaId($index, item)) {
                <app-media-card
                  [item]="item"
                  [index]="$index"
                  [selected]="isSelected(item.id)"
                  [viewMode]="viewMode"
                  [thumbnailSize]="thumbnailSize"
                  (selection)="selection.emit($event)"
                  (preview)="preview.emit($event)"
                  (favorite)="favorite.emit($event)"
                  (restore)="restore.emit($event)"
                  (contextMenu)="contextMenu.emit($event)"
                />
              }
            </div>
          } @else {
            <div class="grid gap-4" [class.gap-3]="viewMode === 'compact'" [style.grid-template-columns]="gridTemplateColumns">
              @for (item of items; track trackByMediaId($index, item)) {
                <app-media-card
                  [item]="item"
                  [index]="$index"
                  [selected]="isSelected(item.id)"
                  [viewMode]="viewMode"
                  [thumbnailSize]="thumbnailSize"
                  (selection)="selection.emit($event)"
                  (preview)="preview.emit($event)"
                  (favorite)="favorite.emit($event)"
                  (restore)="restore.emit($event)"
                  (contextMenu)="contextMenu.emit($event)"
                />
              }
            </div>
          }

          @if (canLoadMore) {
            <div class="flex justify-center py-6">
              <button type="button" class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700" (click)="loadMoreRequested.emit()">
                Load more ({{ totalFilteredCount - items.length }} remaining)
              </button>
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class MediaGridComponent {
  @Input() items: readonly MediaLibraryItem[] = [];
  @Input() selectedIds: ReadonlySet<string> = new Set<string>();
  @Input() viewMode: MediaViewMode = 'grid';
  @Input() thumbnailSize = 180;
  @Input() loading = false;
  @Input() errorMessage = '';
  @Input() hasActiveFilters = false;
  @Input() canLoadMore = false;
  @Input() totalFilteredCount = 0;
  @Input() isDragging = false;

  @Output() selection = new EventEmitter<MediaCardSelectionEvent>();
  @Output() preview = new EventEmitter<MediaLibraryItem>();
  @Output() favorite = new EventEmitter<MediaLibraryItem>();
  @Output() restore = new EventEmitter<MediaLibraryItem>();
  @Output() contextMenu = new EventEmitter<{ item: MediaLibraryItem; event: MouseEvent }>();
  @Output() uploadRequested = new EventEmitter<void>();
  @Output() filesDropped = new EventEmitter<readonly File[]>();
  @Output() dragEnter = new EventEmitter<void>();
  @Output() dragLeave = new EventEmitter<void>();
  @Output() refreshRequested = new EventEmitter<void>();
  @Output() clearFiltersRequested = new EventEmitter<void>();
  @Output() loadMoreRequested = new EventEmitter<void>();

  protected readonly skeletonCards = Array.from({length: 16}, (_, index) => index);

  protected get gridTemplateColumns(): string {
    if (this.viewMode === 'compact') {
      return 'repeat(auto-fill, minmax(132px, 1fr))';
    }

    return `repeat(auto-fill, minmax(${this.thumbnailSize}px, 1fr))`;
  }

  protected isSelected(itemId: string): boolean {
    return this.selectedIds.has(itemId);
  }

  protected trackByMediaId(_index: number, item: MediaLibraryItem): string {
    return item.id;
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragEnter.emit();
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragLeave.emit();
    const files = Array.from(event.dataTransfer?.files ?? []);

    if (files.length > 0) {
      this.filesDropped.emit(files);
    }
  }
}
