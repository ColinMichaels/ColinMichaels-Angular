import {CommonModule} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';

import {MediaLibraryItem} from '../models/media-library.models';
import {formatBytes, formatDate, labelize} from '../utils/media-library.utils';

@Component({
  selector: 'app-media-preview-dialog',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (currentItem) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" [attr.aria-label]="'Preview ' + currentItem.displayName">
        <button type="button" class="absolute inset-0 bg-gray-950/80" aria-label="Close preview" (click)="closeRequested.emit()"></button>

        <section class="relative z-10 grid h-full max-h-[92vh] w-full max-w-7xl grid-rows-[auto_1fr] overflow-hidden rounded-2xl border border-gray-700 bg-gray-950 shadow-2xl lg:grid-cols-[1fr_320px] lg:grid-rows-[auto_1fr]">
          <header class="flex items-center justify-between gap-3 border-b border-gray-800 px-4 py-3 text-white lg:col-span-2">
            <div class="min-w-0">
              <h2 class="truncate text-sm font-semibold">{{ currentItem.displayName }}</h2>
              <p class="truncate text-xs text-gray-400">{{ currentItem.folderPath || 'Uncategorized' }}</p>
            </div>

            <div class="flex items-center gap-2">
              <button type="button" class="preview-button" aria-label="Previous media" [disabled]="!hasPrevious" (click)="previous()">‹</button>
              <button type="button" class="preview-button" aria-label="Next media" [disabled]="!hasNext" (click)="next()">›</button>
              <button type="button" class="preview-button" aria-label="Zoom out" [disabled]="currentItem.mediaType !== 'image'" (click)="zoomOut()">-</button>
              <button type="button" class="preview-button" aria-label="Fit image" [disabled]="currentItem.mediaType !== 'image'" (click)="zoom = 1">Fit</button>
              <button type="button" class="preview-button" aria-label="Zoom in" [disabled]="currentItem.mediaType !== 'image'" (click)="zoomIn()">+</button>
              <button type="button" class="preview-button" aria-label="Close preview" (click)="closeRequested.emit()">Close</button>
            </div>
          </header>

          <main class="min-h-0 overflow-auto bg-black p-4">
            <div class="flex min-h-full items-center justify-center">
              @if (currentItem.mediaType === 'image' && previewUrl) {
                <img
                  class="max-h-none max-w-none rounded-lg object-contain transition-transform"
                  [style.transform]="'scale(' + zoom + ')'"
                  [style.transform-origin]="'center center'"
                  [src]="previewUrl"
                  [alt]="currentItem.altText || currentItem.displayName"
                >
              } @else if (currentItem.mediaType === 'video' && previewUrl) {
                <video class="max-h-[72vh] max-w-full rounded-lg" [src]="previewUrl" controls [poster]="currentItem.thumbnailUrl"></video>
              } @else if (currentItem.mediaType === 'audio' && previewUrl) {
                <div class="w-full max-w-xl rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center text-white">
                  <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 text-3xl">♪</div>
                  <p class="mt-4 font-semibold">{{ currentItem.displayName }}</p>
                  <audio class="mt-4 w-full" [src]="previewUrl" controls></audio>
                </div>
              } @else {
                <div class="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-white">
                  <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-800 text-4xl">{{ fileIcon(currentItem) }}</div>
                  <h3 class="mt-4 text-lg font-semibold">{{ currentItem.displayName }}</h3>
                  <p class="mt-2 text-sm text-gray-400">Preview is not available for this file type.</p>
                  @if (previewUrl) {
                    <a class="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" [href]="previewUrl" target="_blank" rel="noopener noreferrer">Open URL</a>
                  }
                </div>
              }
            </div>
          </main>

          <aside class="hidden min-h-0 overflow-y-auto border-l border-gray-800 bg-gray-900 p-4 text-gray-100 lg:block">
            <figure class="overflow-hidden rounded-xl border border-gray-800 bg-gray-950">
              @if (currentItem.thumbnailUrl || currentItem.previewUrl) {
                <img class="max-h-44 w-full object-contain" [src]="currentItem.thumbnailUrl || currentItem.previewUrl" [alt]="currentItem.altText || currentItem.displayName">
              } @else {
                <div class="flex h-36 items-center justify-center text-3xl text-gray-500">{{ fileIcon(currentItem) }}</div>
              }
            </figure>

            <div class="mt-4 grid grid-cols-2 gap-2">
              <button type="button" class="sidebar-action" (click)="favoriteToggled.emit(currentItem)">{{ currentItem.favorite ? 'Unfavorite' : 'Favorite' }}</button>
              <button type="button" class="sidebar-action" [disabled]="currentItem.mediaType !== 'image'" (click)="resizeRequested.emit([currentItem])">Resize</button>
              <button type="button" class="sidebar-action" (click)="renameRequested.emit(currentItem)">Rename</button>
              <button type="button" class="sidebar-action" (click)="urlCopyRequested.emit(currentItem)">Copy URL</button>
              @if (previewUrl) {
                <a class="sidebar-action col-span-2 text-center" [href]="previewUrl" target="_blank" rel="noopener noreferrer" download>Download / Open</a>
              }
            </div>

            <section class="mt-5 space-y-3">
              <h3 class="text-sm font-semibold">Metadata</h3>
              <dl class="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <dt class="text-gray-500">Type</dt><dd>{{ labelize(currentItem.mediaType) }}</dd>
                <dt class="text-gray-500">Ext</dt><dd>{{ currentItem.extension || '-' }}</dd>
                <dt class="text-gray-500">Size</dt><dd>{{ formatBytes(currentItem.sizeBytes) }}</dd>
                <dt class="text-gray-500">Dimensions</dt><dd>{{ dimensions(currentItem) }}</dd>
                <dt class="text-gray-500">MIME</dt><dd class="truncate" [title]="currentItem.mimeType">{{ currentItem.mimeType || '-' }}</dd>
                <dt class="text-gray-500">Uploaded</dt><dd>{{ formatDate(currentItem.uploadedAt) }}</dd>
                <dt class="text-gray-500">Updated</dt><dd>{{ formatDate(currentItem.updatedAt) }}</dd>
                <dt class="text-gray-500">Status</dt><dd>{{ labelize(currentItem.status) }}</dd>
              </dl>
            </section>

            @if (currentItem.tags.length > 0) {
              <section class="mt-5 space-y-2">
                <h3 class="text-sm font-semibold">Tags</h3>
                <div class="flex flex-wrap gap-2">
                  @for (tag of currentItem.tags; track tag) {
                    <span class="rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-200">#{{ tag }}</span>
                  }
                </div>
              </section>
            }
          </aside>
        </section>
      </div>
    }
  `,
  styles: [`
    .preview-button {
      border: 1px solid #374151;
      border-radius: 0.5rem;
      color: #f9fafb;
      font-size: 0.875rem;
      font-weight: 600;
      min-height: 2rem;
      padding: 0.35rem 0.6rem;
    }

    .preview-button:hover:not(:disabled) {
      background: #1f2937;
    }

    .preview-button:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }

    .sidebar-action {
      border: 1px solid #374151;
      border-radius: 0.5rem;
      color: #f9fafb;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 0.5rem 0.75rem;
    }

    .sidebar-action:hover:not(:disabled) {
      background: #1f2937;
    }

    .sidebar-action:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }
  `],
})
export class MediaPreviewDialogComponent implements OnChanges {
  @Input() items: readonly MediaLibraryItem[] = [];
  @Input() currentItemId: string | null = null;

  @Output() closeRequested = new EventEmitter<void>();
  @Output() favoriteToggled = new EventEmitter<MediaLibraryItem>();
  @Output() urlCopyRequested = new EventEmitter<MediaLibraryItem>();
  @Output() resizeRequested = new EventEmitter<readonly MediaLibraryItem[]>();
  @Output() renameRequested = new EventEmitter<MediaLibraryItem>();

  protected currentIndex = 0;
  protected zoom = 1;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentItemId'] || changes['items']) {
      const index = this.items.findIndex(item => item.id === this.currentItemId);
      this.currentIndex = index >= 0 ? index : 0;
      this.zoom = 1;
    }
  }

  protected get currentItem(): MediaLibraryItem | null {
    return this.items[this.currentIndex] ?? null;
  }

  protected get previewUrl(): string | undefined {
    const item = this.currentItem;

    return item?.previewUrl ?? item?.originalUrl ?? item?.downloadUrl ?? item?.thumbnailUrl;
  }

  protected get hasPrevious(): boolean {
    return this.currentIndex > 0;
  }

  protected get hasNext(): boolean {
    return this.currentIndex < this.items.length - 1;
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeRequested.emit();
  }

  @HostListener('document:keydown.arrowleft')
  protected onArrowLeft(): void {
    this.previous();
  }

  @HostListener('document:keydown.arrowright')
  protected onArrowRight(): void {
    this.next();
  }

  protected previous(): void {
    if (this.hasPrevious) {
      this.currentIndex -= 1;
      this.zoom = 1;
    }
  }

  protected next(): void {
    if (this.hasNext) {
      this.currentIndex += 1;
      this.zoom = 1;
    }
  }

  protected zoomIn(): void {
    this.zoom = Math.min(3, this.zoom + 0.25);
  }

  protected zoomOut(): void {
    this.zoom = Math.max(0.5, this.zoom - 0.25);
  }

  protected dimensions(item: MediaLibraryItem): string {
    return item.width && item.height ? `${item.width}x${item.height}` : '-';
  }

  protected fileIcon(item: MediaLibraryItem): string {
    switch (item.mediaType) {
      case 'image':
        return '▧';
      case 'video':
        return '▻';
      case 'audio':
        return '♪';
      case 'document':
        return '≡';
      case 'archive':
        return '▣';
      case 'other':
        return '○';
    }
  }

  protected formatBytes(value?: number): string {
    return formatBytes(value);
  }

  protected formatDate(value?: string): string {
    return formatDate(value);
  }

  protected labelize(value: string): string {
    return labelize(value);
  }
}
