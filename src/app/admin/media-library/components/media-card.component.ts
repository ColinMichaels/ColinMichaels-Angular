import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';

import {MediaLibraryItem, MediaViewMode} from '../models/media-library.models';
import {formatBytes, formatDate, labelize} from '../utils/media-library.utils';

export interface MediaCardSelectionEvent {
  item: MediaLibraryItem;
  index: number;
  mouseEvent?: MouseEvent;
  keyboardEvent?: KeyboardEvent;
}

@Component({
  selector: 'app-media-card',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="group relative cursor-default rounded-xl border bg-white transition hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
      [class.border-blue-500]="selected"
      [class.bg-blue-50]="selected"
      [class.shadow-md]="selected"
      [class.border-gray-200]="!selected"
      [class.opacity-60]="item.status === 'archived'"
      [class.media-list-card]="viewMode === 'list'"
      [class.media-compact-card]="viewMode === 'compact'"
      tabindex="0"
      role="option"
      [attr.aria-selected]="selected"
      [attr.aria-label]="item.displayName"
      (click)="select($event)"
      (dblclick)="preview.emit(item)"
      (keydown)="onKeydown($event)"
      (contextmenu)="openContextMenu($event)"
    >
      @if (viewMode === 'list') {
        <div class="grid min-h-[72px] grid-cols-[40px_72px_minmax(160px,1fr)_110px_110px_120px_96px] items-center gap-3 px-3 py-2 text-sm">
          <label class="flex items-center justify-center">
            <span class="sr-only">Select {{ item.displayName }}</span>
            <input type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" [checked]="selected" (click)="stopEvent($event)" (change)="toggleCheckbox($event)">
          </label>
          <button type="button" class="h-14 overflow-hidden rounded-lg bg-gray-100" [attr.aria-label]="'Preview ' + item.displayName" (click)="preview.emit(item); $event.stopPropagation()">
            <ng-container [ngTemplateOutlet]="thumbnailTemplate"></ng-container>
          </button>
          <div class="min-w-0">
            <p class="truncate font-medium text-gray-900">{{ item.displayName }}</p>
            <p class="truncate text-xs text-gray-500">{{ item.folderPath || 'Uncategorized' }}</p>
          </div>
          <span class="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">{{ labelize(item.mediaType) }}</span>
          <span class="text-gray-600">{{ formatBytes(item.sizeBytes) }}</span>
          <span class="text-gray-600">{{ dimensions }}</span>
          @if (item.status === 'deleted') {
            <button
              type="button"
              class="rounded-md border border-cyan-500 bg-cyan-950 px-2 py-1.5 text-xs font-semibold text-cyan-50 hover:bg-cyan-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700"
              (click)="restore.emit(item); $event.stopPropagation()"
            >
              <span class="block text-[10px] uppercase tracking-wide text-cyan-200">Deleted</span>
              <span class="block">Restore</span>
            </button>
          } @else {
            <span class="text-gray-500">{{ formatDate(item.uploadedAt) }}</span>
          }
        </div>
      } @else {
        <div class="relative overflow-hidden rounded-t-xl bg-gray-100" [style.height.px]="viewMode === 'compact' ? 92 : thumbnailSize">
          <ng-container [ngTemplateOutlet]="thumbnailTemplate"></ng-container>

          <div class="absolute left-2 top-2 flex items-center gap-2">
            <label
              class="flex h-7 w-7 items-center justify-center rounded-md border border-white/70 bg-white/90 shadow-sm transition group-hover:opacity-100"
              [class.opacity-100]="selected"
              [class.opacity-0]="!selected"
            >
              <span class="sr-only">Select {{ item.displayName }}</span>
              <input type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" [checked]="selected" (click)="stopEvent($event)" (change)="toggleCheckbox($event)">
            </label>
          </div>

          @if (item.status !== 'deleted') {
            <button
              type="button"
              class="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md border border-white/70 bg-white/90 text-sm text-gray-500 shadow-sm hover:text-amber-500"
              [class.text-amber-500]="item.favorite"
              [attr.aria-label]="item.favorite ? 'Remove favorite' : 'Favorite media'"
              (click)="favorite.emit(item); $event.stopPropagation()"
            >
              {{ item.favorite ? '★' : '☆' }}
            </button>
          }

          @if (item.status === 'processing' || item.status === 'uploading') {
            <div class="absolute inset-0 flex items-center justify-center bg-white/75 text-sm font-medium text-blue-700">
              <span class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"></span>
              Processing...
            </div>
          }

          @if (item.status === 'failed') {
            <div class="absolute inset-x-2 bottom-2 rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white" [title]="item.processingError || 'Processing failed'">
              Failed
            </div>
          }

          @if (item.status === 'archived') {
            <div class="absolute inset-x-2 bottom-2 rounded-md bg-gray-800/85 px-2 py-1 text-xs font-medium text-white">
              Archived
            </div>
          }

          @if (item.status === 'deleted') {
            <div
              class="absolute inset-x-2 bottom-2 rounded-md bg-red-950/90 px-2 py-1 text-xs font-medium text-red-100">
              Deleted
            </div>
          }
        </div>

        <div class="space-y-2 p-3" [class.p-2]="viewMode === 'compact'">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-gray-900" [title]="item.displayName">{{ item.displayName }}</p>
            <p class="truncate text-xs text-gray-500">{{ item.folderPath || 'Uncategorized' }}</p>
          </div>

          <div class="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
            <span class="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">{{ item.extension || item.mediaType }}</span>
            @if (dimensions !== '-') {
              <span>{{ dimensions }}</span>
            }
            <span>{{ formatBytes(item.sizeBytes) }}</span>
          </div>

          @if (viewMode !== 'compact' && item.tags.length > 0) {
            <div class="flex flex-wrap gap-1">
              @for (tag of item.tags.slice(0, 3); track tag) {
                <span class="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">#{{ tag }}</span>
              }
              @if (item.tags.length > 3) {
                <span class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">+{{ item.tags.length - 3 }}</span>
              }
            </div>
          }

          @if (item.status === 'deleted') {
            <button
              type="button"
              class="w-full rounded-md border border-cyan-500 bg-cyan-950 px-2 py-1.5 text-xs font-semibold text-cyan-50 hover:bg-cyan-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700"
              (click)="restore.emit(item); $event.stopPropagation()"
            >
              Restore
            </button>
          }
        </div>
      }
    </article>

    <ng-template #thumbnailTemplate>
      @if (thumbnailUrl) {
        @if (item.mediaType === 'video') {
          <video class="h-full w-full object-cover" [src]="thumbnailUrl" muted preload="metadata"></video>
        } @else {
          <img class="h-full w-full object-cover" [src]="thumbnailUrl" [alt]="item.altText || item.displayName" loading="lazy">
        }
      } @else {
        <div class="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-50 to-gray-200 text-gray-500">
          <span class="text-3xl" aria-hidden="true">{{ fileIcon }}</span>
          <span class="max-w-[80%] truncate text-xs font-medium uppercase tracking-wide">{{ item.extension || item.mediaType }}</span>
        </div>
      }
    </ng-template>
  `,
  styles: [`
    .media-list-card {
      border-radius: 0.75rem;
    }

    .media-compact-card {
      border-radius: 0.75rem;
    }
  `],
})
export class MediaCardComponent {
  @Input({required: true}) item!: MediaLibraryItem;
  @Input() selected = false;
  @Input() index = 0;
  @Input() viewMode: MediaViewMode = 'grid';
  @Input() thumbnailSize = 180;

  @Output() selection = new EventEmitter<MediaCardSelectionEvent>();
  @Output() preview = new EventEmitter<MediaLibraryItem>();
  @Output() favorite = new EventEmitter<MediaLibraryItem>();
  @Output() restore = new EventEmitter<MediaLibraryItem>();
  @Output() contextMenu = new EventEmitter<{ item: MediaLibraryItem; event: MouseEvent }>();

  protected get thumbnailUrl(): string | undefined {
    return this.item.thumbnailUrl ?? this.item.previewUrl ?? this.item.downloadUrl;
  }

  protected get dimensions(): string {
    return this.item.width && this.item.height ? `${this.item.width}x${this.item.height}` : '-';
  }

  protected get fileIcon(): string {
    switch (this.item.mediaType) {
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

  protected select(mouseEvent: MouseEvent): void {
    this.selection.emit({item: this.item, index: this.index, mouseEvent});
  }

  protected toggleCheckbox(event: Event): void {
    event.stopPropagation();
    this.selection.emit({item: this.item, index: this.index});
  }

  protected stopEvent(event: Event): void {
    event.stopPropagation();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.preview.emit(this.item);
      return;
    }

    if (event.key === ' ') {
      event.preventDefault();
      this.selection.emit({item: this.item, index: this.index, keyboardEvent: event});
    }
  }

  protected openContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.contextMenu.emit({item: this.item, event});
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
