import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';

import {
  MediaLibraryFolder,
  MediaLibraryFolderView,
  MediaLibraryTagSummary,
  MediaQuickFilter,
  MediaType,
} from '../models/media-library.models';
import {labelize} from '../utils/media-library.utils';

interface QuickFilterItem {
  id: MediaQuickFilter;
  label: string;
  icon: string;
}

interface MediaTypeItem {
  id: MediaType;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-media-library-sidebar',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="flex h-full w-[260px] flex-col border-r border-gray-200 bg-white text-gray-900">
      <header class="border-b border-gray-200 p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold">Media Library</h2>
            <p class="text-xs text-gray-500">Asset Organizer</p>
          </div>
          <button
            type="button"
            class="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 lg:hidden"
            aria-label="Close sidebar"
            (click)="closeRequested.emit()"
          >
            Close
          </button>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            class="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
            (click)="uploadRequested.emit()"
          >
            Upload
          </button>
          <button
            type="button"
            class="rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            (click)="newFolderRequested.emit(null)"
          >
            New Folder
          </button>
          <button
            type="button"
            class="rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            (click)="refreshRequested.emit()"
          >
            Refresh
          </button>
          @if (selectedCount > 0) {
            <button
              type="button"
              class="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
              (click)="batchProcessRequested.emit()"
            >
              Batch
            </button>
          }
        </div>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto p-3">
        <section class="space-y-1">
          <h3 class="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Quick Filters</h3>
          @for (filter of quickFilters; track filter.id) {
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition"
              [class.bg-blue-600]="activeQuickFilter === filter.id"
              [class.text-white]="activeQuickFilter === filter.id"
              [class.text-gray-700]="activeQuickFilter !== filter.id"
              (click)="quickFilterChange.emit(filter.id)"
            >
              <span class="flex items-center gap-2"><span aria-hidden="true">{{ filter.icon }}</span>{{ filter.label }}</span>
            </button>
          }
        </section>

        <section class="mt-5 space-y-1">
          <h3 class="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Media Types</h3>
          @for (type of mediaTypes; track type.id) {
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition"
              [class.bg-blue-50]="activeMediaType === type.id"
              [class.text-blue-700]="activeMediaType === type.id"
              [class.text-gray-700]="activeMediaType !== type.id"
              (click)="mediaTypeChange.emit(activeMediaType === type.id ? null : type.id)"
            >
              <span class="flex items-center gap-2"><span aria-hidden="true">{{ type.icon }}</span>{{ type.label }}</span>
              <span class="text-xs text-gray-400">{{ typeCounts[type.id] || 0 }}</span>
            </button>
          }
        </section>

        <section class="mt-5 space-y-1">
          <div class="flex items-center justify-between px-2">
            <h3 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Folders</h3>
            <button
              type="button"
              class="rounded px-1.5 py-1 text-xs text-gray-500 hover:bg-blue-50 hover:text-blue-700"
              aria-label="Create folder"
              (click)="newFolderRequested.emit(null)"
            >
              +
            </button>
          </div>

          <button
            type="button"
            class="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition"
            [class.bg-blue-600]="selectedFolderId === null"
            [class.text-white]="selectedFolderId === null"
            [class.text-gray-700]="selectedFolderId !== null"
            (click)="folderChange.emit(null)"
          >
            <span class="flex items-center gap-2"><span aria-hidden="true">/</span>All Files</span>
            <span class="text-xs opacity-75">{{ totalCount }}</span>
          </button>

          @for (folder of folders; track folder.id) {
            <button
              type="button"
              class="group flex w-full items-center justify-between rounded-md py-2 pr-2 text-left text-sm transition"
              [style.padding-left.px]="12 + folder.depth * 14"
              [class.bg-blue-600]="selectedFolderId === folder.id"
              [class.text-white]="selectedFolderId === folder.id"
              [class.text-gray-700]="selectedFolderId !== folder.id"
              (click)="folderChange.emit(folder.id)"
            >
              <span class="min-w-0 truncate"><span aria-hidden="true">▸</span> {{ folder.name }}</span>
              <span class="text-xs opacity-75">{{ folder.itemCount || 0 }}</span>
            </button>
          } @empty {
            <p class="px-2 py-2 text-xs text-gray-500">No folders yet.</p>
          }
        </section>

        <section class="mt-5 space-y-1">
          <h3 class="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Tags</h3>
          @for (tag of tags; track tag.name) {
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition"
              [class.bg-blue-50]="activeTag === tag.name"
              [class.text-blue-700]="activeTag === tag.name"
              [class.text-gray-700]="activeTag !== tag.name"
              (click)="tagChange.emit(activeTag === tag.name ? null : tag.name)"
            >
              <span class="truncate">#{{ tag.name }}</span>
              <span class="text-xs text-gray-400">{{ tag.count }}</span>
            </button>
          } @empty {
            <p class="px-2 py-2 text-xs text-gray-500">Tags appear after media is tagged.</p>
          }
        </section>

        <section class="mt-5 space-y-1 pb-4">
          <h3 class="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Collections</h3>
          @for (collection of smartCollections; track collection.id) {
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              (click)="quickFilterChange.emit(collection.id)"
            >
              <span aria-hidden="true">{{ collection.icon }}</span>
              {{ collection.label }}
            </button>
          }
        </section>
      </div>
    </aside>
  `,
})
export class MediaLibrarySidebarComponent {
  @Input() activeQuickFilter: MediaQuickFilter = 'all';
  @Input() activeMediaType: MediaType | null = null;
  @Input() selectedFolderId: string | null = null;
  @Input() activeTag: string | null = null;
  @Input() folders: readonly MediaLibraryFolderView[] = [];
  @Input() tags: readonly MediaLibraryTagSummary[] = [];
  @Input() selectedCount = 0;
  @Input() totalCount = 0;
  @Input() typeCounts: Readonly<Record<MediaType, number>> = {
    image: 0,
    video: 0,
    audio: 0,
    document: 0,
    archive: 0,
    other: 0,
  };

  @Output() quickFilterChange = new EventEmitter<MediaQuickFilter>();
  @Output() mediaTypeChange = new EventEmitter<MediaType | null>();
  @Output() folderChange = new EventEmitter<string | null>();
  @Output() tagChange = new EventEmitter<string | null>();
  @Output() uploadRequested = new EventEmitter<void>();
  @Output() newFolderRequested = new EventEmitter<MediaLibraryFolder | null>();
  @Output() refreshRequested = new EventEmitter<void>();
  @Output() batchProcessRequested = new EventEmitter<void>();
  @Output() closeRequested = new EventEmitter<void>();

  protected readonly quickFilters: readonly QuickFilterItem[] = [
    {id: 'all', label: 'All Files', icon: '□'},
    {id: 'recent', label: 'Recent Uploads', icon: '↻'},
    {id: 'favorites', label: 'Favorites', icon: '★'},
    {id: 'uncategorized', label: 'Uncategorized', icon: '◇'},
    {id: 'processing', label: 'Processing', icon: '◌'},
    {id: 'failed', label: 'Failed Processing', icon: '!'},
    {id: 'archived', label: 'Archived', icon: '▣'},
    {id: 'deleted', label: 'Deleted', icon: '⌫'},
  ];

  protected readonly mediaTypes: readonly MediaTypeItem[] = [
    {id: 'image', label: 'Images', icon: '▧'},
    {id: 'video', label: 'Videos', icon: '▻'},
    {id: 'document', label: 'Documents', icon: '≡'},
    {id: 'audio', label: 'Audio', icon: '♪'},
    {id: 'archive', label: 'Archives', icon: '▣'},
    {id: 'other', label: 'Other', icon: '○'},
  ];

  protected readonly smartCollections: readonly QuickFilterItem[] = [
    {id: 'untagged', label: 'Untagged Assets', icon: '#'},
    {id: 'large', label: 'Large Files', icon: '↗'},
    {id: 'recent', label: 'Recently Edited', icon: '✎'},
  ];

  protected labelize(value: string): string {
    return labelize(value);
  }
}
