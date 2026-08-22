import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {MediaLibraryFolder, MediaLibraryItem, MediaMetadataPatch} from '../models/media-library.models';
import {formatBytes, formatDate, labelize} from '../utils/media-library.utils';
import {TagEditorComponent} from './tag-editor.component';

interface InspectorDraft {
  displayName: string;
  folderId: string;
  tags: readonly string[];
  favorite: boolean;
  rating: number | null;
  colorLabel: string | null;
  notes: string;
  altText: string;
  description: string;
}

@Component({
  selector: 'app-media-inspector',
  imports: [CommonModule, FormsModule, TagEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="flex h-full w-[320px] flex-col border-l border-gray-200 bg-white text-gray-900">
      <header class="flex h-[52px] items-center justify-between border-b border-gray-200 px-4">
        <div>
          <h2 class="text-sm font-semibold">Inspector</h2>
          <p class="text-xs text-gray-500">Metadata and actions</p>
        </div>
        <button type="button" class="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50" (click)="closeRequested.emit()">Close</button>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto p-4">
        @if (selectedItems.length === 0) {
          <div class="flex h-full min-h-[320px] items-center justify-center text-center">
            <div>
              <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-xl text-gray-500">i</div>
              <h3 class="mt-4 text-sm font-semibold text-gray-900">Select media to view details.</h3>
              <p class="mt-2 text-sm text-gray-500">Metadata, tags, preview actions, and batch tools appear here.</p>
            </div>
          </div>
        } @else if (selectedItems.length === 1 && singleItem) {
          <section class="space-y-5">
            <figure class="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
              @if (singleItem.thumbnailUrl || singleItem.previewUrl || singleItem.downloadUrl) {
                <img class="max-h-56 w-full object-contain" loading="lazy" [src]="singleItem.thumbnailUrl || singleItem.previewUrl || singleItem.downloadUrl" [alt]="singleItem.altText || singleItem.displayName">
              } @else {
                <div class="flex h-44 items-center justify-center text-3xl text-gray-400">{{ fileIcon(singleItem) }}</div>
              }
            </figure>

            <div class="grid grid-cols-2 gap-2">
              <button type="button" class="primary-action" (click)="previewRequested.emit(singleItem)">Preview</button>
              <button type="button" class="secondary-action" (click)="copyUrlRequested.emit(singleItem)">Copy URL</button>
              @if (singleItem.status !== 'deleted') {
                <button type="button" class="secondary-action" (click)="renameRequested.emit(singleItem)">Rename</button>
                <button type="button" class="secondary-action" [disabled]="singleItem.mediaType !== 'image'" (click)="resizeRequested.emit([singleItem])">Resize</button>
              }
            </div>

            @if (singleItem.status !== 'deleted') {
              <form class="space-y-4" (ngSubmit)="saveSingleItem()">
              <label class="block space-y-1">
                <span class="field-label">Display name</span>
                <input class="field-input" name="displayName" [(ngModel)]="draft.displayName" required>
              </label>

              <label class="block space-y-1">
                <span class="field-label">Folder</span>
                <select class="field-input" name="folderId" [(ngModel)]="draft.folderId">
                  <option value="">Uncategorized</option>
                  @for (folder of folders; track folder.id) {
                    <option [value]="folder.id">{{ folder.path }}</option>
                  }
                </select>
              </label>

              <label class="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <span class="font-medium text-gray-700">Favorite</span>
                <input type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" name="favorite" [(ngModel)]="draft.favorite">
              </label>

              <label class="block space-y-1">
                <span class="field-label">Rating</span>
                <select class="field-input" name="rating" [(ngModel)]="draft.rating">
                  <option [ngValue]="null">No rating</option>
                  @for (rating of ratings; track rating) {
                    <option [ngValue]="rating">{{ rating }}</option>
                  }
                </select>
              </label>

              <label class="block space-y-1">
                <span class="field-label">Color label</span>
                <input class="field-input" name="colorLabel" [(ngModel)]="draft.colorLabel" placeholder="blue, green, needs-review">
              </label>

              <div class="space-y-2">
                <span class="field-label">Tags</span>
                <app-tag-editor [tags]="draft.tags" [availableTags]="availableTags" (tagsChange)="draft.tags = $event" />
              </div>

              <label class="block space-y-1">
                <span class="field-label">Alt text</span>
                <input class="field-input" name="altText" [(ngModel)]="draft.altText">
              </label>

              <label class="block space-y-1">
                <span class="field-label">Description</span>
                <textarea class="field-input min-h-20 resize-y" name="description" [(ngModel)]="draft.description"></textarea>
              </label>

              <label class="block space-y-1">
                <span class="field-label">Notes</span>
                <textarea class="field-input min-h-20 resize-y" name="notes" [(ngModel)]="draft.notes"></textarea>
              </label>

                <button type="submit" class="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Save Metadata</button>
              </form>
            } @else {
              <p class="rounded-lg border border-cyan-700 bg-cyan-950/60 p-3 text-sm text-cyan-50" role="status">
                Restore this retained record before editing its metadata or lifecycle state.
              </p>
            }

            <section class="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
              <h3 class="font-semibold text-gray-900">Details</h3>
              <dl class="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <dt class="text-gray-500">Original</dt><dd class="truncate text-gray-800" [title]="singleItem.originalFileName">{{ singleItem.originalFileName || '-' }}</dd>
                <dt class="text-gray-500">Type</dt><dd class="text-gray-800">{{ labelize(singleItem.mediaType) }}</dd>
                <dt class="text-gray-500">Extension</dt><dd class="text-gray-800">{{ singleItem.extension || '-' }}</dd>
                <dt class="text-gray-500">MIME</dt><dd class="truncate text-gray-800" [title]="singleItem.mimeType">{{ singleItem.mimeType || '-' }}</dd>
                <dt class="text-gray-500">Size</dt><dd class="text-gray-800">{{ formatBytes(singleItem.sizeBytes) }}</dd>
                <dt class="text-gray-500">Width</dt><dd class="text-gray-800">{{ singleItem.width || '-' }}</dd>
                <dt class="text-gray-500">Height</dt><dd class="text-gray-800">{{ singleItem.height || '-' }}</dd>
                <dt class="text-gray-500">Aspect</dt><dd class="text-gray-800">{{ singleItem.aspectRatio ? singleItem.aspectRatio.toFixed(2) : '-' }}</dd>
                <dt class="text-gray-500">Uploaded</dt><dd class="text-gray-800">{{ formatDate(singleItem.uploadedAt) }}</dd>
                <dt class="text-gray-500">Updated</dt><dd class="text-gray-800">{{ formatDate(singleItem.updatedAt) }}</dd>
                <dt class="text-gray-500">Status</dt><dd class="text-gray-800">{{ labelize(singleItem.status) }}</dd>
              </dl>
              @if (singleItem.processingError) {
                <p class="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{{ singleItem.processingError }}</p>
              }
            </section>

            <section class="grid grid-cols-2 gap-2 border-t border-gray-200 pt-4">
              @if (singleItem.status === 'deleted') {
                <button type="button" class="primary-action col-span-2" (click)="restoreRequested.emit([singleItem])">Restore</button>
              } @else {
                <button type="button" class="secondary-action" (click)="favoriteRequested.emit({items: [singleItem], favorite: !singleItem.favorite})">
                  {{ singleItem.favorite ? 'Unfavorite' : 'Favorite' }}
                </button>
                <button type="button" class="secondary-action" (click)="archiveRequested.emit([singleItem])">Archive</button>
                <button type="button" class="danger-action col-span-2" (click)="deleteRequested.emit([singleItem])">Delete</button>
              }
            </section>
          </section>
        } @else {
          <section class="space-y-5">
            <div class="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
              <p class="text-sm font-semibold">{{ selectedItems.length }} items selected</p>
              <p class="mt-1 text-xs text-blue-700">{{ formatBytes(totalSelectedSize) }} total</p>
            </div>

            <section class="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
              <h3 class="font-semibold text-gray-900">Selection Summary</h3>
              <dl class="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <dt class="text-gray-500">Types</dt><dd class="text-gray-800">{{ typeSummary }}</dd>
                <dt class="text-gray-500">Shared folder</dt><dd class="truncate text-gray-800">{{ sharedFolder }}</dd>
                <dt class="text-gray-500">Common tags</dt><dd class="text-gray-800">{{ commonTags.length ? commonTags.join(', ') : '-' }}</dd>
              </dl>
            </section>

            <section class="space-y-3">
              <h3 class="text-sm font-semibold text-gray-900">Batch Actions</h3>
              <div class="grid grid-cols-2 gap-2">
                @if (deletedItems.length > 0) {
                  <button type="button" class="primary-action col-span-2" (click)="restoreRequested.emit(deletedItems)">Restore Deleted ({{ deletedItems.length }})</button>
                } @else {
                  <button type="button" class="primary-action" (click)="batchRenameRequested.emit(selectedItems)">Batch Rename</button>
                  <button type="button" class="secondary-action" (click)="resizeRequested.emit(imageItems)" [disabled]="imageItems.length === 0">Batch Resize</button>
                  <button type="button" class="secondary-action" (click)="batchTagRequested.emit(selectedItems)">Add Tags</button>
                  <button type="button" class="secondary-action" (click)="favoriteRequested.emit({items: selectedItems, favorite: true})">Favorite</button>
                  <button type="button" class="secondary-action" (click)="favoriteRequested.emit({items: selectedItems, favorite: false})">Unfavorite</button>
                  <button type="button" class="secondary-action" (click)="archiveRequested.emit(selectedItems)">Archive</button>
                  <button type="button" class="danger-action col-span-2" (click)="deleteRequested.emit(selectedItems)">Delete</button>
                }
              </div>
            </section>
          </section>
        }
      </div>
    </aside>
  `,
  styles: [`
    .field-label {
      color: #6b7280;
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
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

    .primary-action,
    .secondary-action,
    .danger-action {
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 0.5rem 0.75rem;
    }

    .primary-action {
      background: #2563eb;
      color: white;
    }

    .primary-action:hover {
      background: #1d4ed8;
    }

    .secondary-action {
      border: 1px solid #d1d5db;
      color: #374151;
    }

    .secondary-action:hover:not(:disabled) {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #1d4ed8;
    }

    .secondary-action:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    .danger-action {
      border: 1px solid #fecaca;
      color: #b91c1c;
    }

    .danger-action:hover {
      background: #fef2f2;
    }
  `],
})
export class MediaInspectorComponent implements OnChanges {
  @Input() selectedItems: readonly MediaLibraryItem[] = [];
  @Input() folders: readonly MediaLibraryFolder[] = [];
  @Input() availableTags: readonly string[] = [];

  @Output() metadataSave = new EventEmitter<{ item: MediaLibraryItem; patch: MediaMetadataPatch }>();
  @Output() renameRequested = new EventEmitter<MediaLibraryItem>();
  @Output() batchRenameRequested = new EventEmitter<readonly MediaLibraryItem[]>();
  @Output() resizeRequested = new EventEmitter<readonly MediaLibraryItem[]>();
  @Output() previewRequested = new EventEmitter<MediaLibraryItem>();
  @Output() batchTagRequested = new EventEmitter<readonly MediaLibraryItem[]>();
  @Output() favoriteRequested = new EventEmitter<{ items: readonly MediaLibraryItem[]; favorite: boolean }>();
  @Output() archiveRequested = new EventEmitter<readonly MediaLibraryItem[]>();
  @Output() deleteRequested = new EventEmitter<readonly MediaLibraryItem[]>();
  @Output() restoreRequested = new EventEmitter<readonly MediaLibraryItem[]>();
  @Output() copyUrlRequested = new EventEmitter<MediaLibraryItem>();
  @Output() closeRequested = new EventEmitter<void>();

  protected readonly ratings = [1, 2, 3, 4, 5];
  protected draft: InspectorDraft = this.createEmptyDraft();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedItems']) {
      this.draft = this.selectedItems.length === 1 && this.selectedItems[0]
        ? this.createDraft(this.selectedItems[0])
        : this.createEmptyDraft();
    }
  }

  protected get singleItem(): MediaLibraryItem | null {
    return this.selectedItems.length === 1 ? this.selectedItems[0] ?? null : null;
  }

  protected get imageItems(): readonly MediaLibraryItem[] {
    return this.selectedItems.filter(item => item.mediaType === 'image');
  }

  protected get deletedItems(): readonly MediaLibraryItem[] {
    return this.selectedItems.filter(item => item.status === 'deleted');
  }

  protected get totalSelectedSize(): number {
    return this.selectedItems.reduce((total, item) => total + (item.sizeBytes ?? 0), 0);
  }

  protected get typeSummary(): string {
    const counts = new Map<string, number>();

    for (const item of this.selectedItems) {
      counts.set(item.mediaType, (counts.get(item.mediaType) ?? 0) + 1);
    }

    return [...counts.entries()].map(([type, count]) => `${labelize(type)} ${count}`).join(', ');
  }

  protected get sharedFolder(): string {
    const folders = new Set(this.selectedItems.map(item => item.folderPath || 'Uncategorized'));

    return folders.size === 1 ? [...folders][0] ?? 'Uncategorized' : 'Mixed';
  }

  protected get commonTags(): readonly string[] {
    if (this.selectedItems.length === 0) {
      return [];
    }

    const [firstItem, ...restItems] = this.selectedItems;

    return firstItem.tags.filter(tag => restItems.every(item => item.tags.includes(tag)));
  }

  protected saveSingleItem(): void {
    const item = this.singleItem;

    if (!item) {
      return;
    }

    const folder = this.folders.find(candidate => candidate.id === this.draft.folderId) ?? null;
    this.metadataSave.emit({
      item,
      patch: {
        displayName: this.draft.displayName.trim(),
        folderId: folder?.id ?? null,
        folderPath: folder?.path ?? '',
        tags: this.draft.tags,
        favorite: this.draft.favorite,
        rating: this.draft.rating,
        colorLabel: this.draft.colorLabel,
        notes: this.draft.notes.trim() || null,
        altText: this.draft.altText.trim() || null,
        description: this.draft.description.trim() || null,
      },
    });
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

  private createDraft(item: MediaLibraryItem): InspectorDraft {
    return {
      displayName: item.displayName,
      folderId: item.folderId ?? '',
      tags: [...item.tags],
      favorite: item.favorite,
      rating: item.rating ?? null,
      colorLabel: item.colorLabel ?? null,
      notes: item.notes ?? '',
      altText: item.altText ?? '',
      description: item.description ?? '',
    };
  }

  private createEmptyDraft(): InspectorDraft {
    return {
      displayName: '',
      folderId: '',
      tags: [],
      favorite: false,
      rating: null,
      colorLabel: null,
      notes: '',
      altText: '',
      description: '',
    };
  }
}
