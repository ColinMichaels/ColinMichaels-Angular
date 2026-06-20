import {CommonModule} from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  forwardRef,
  inject,
  ChangeDetectionStrategy
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {Subscription} from 'rxjs';

import {
  BlogMediaAssetRole,
  BlogMediaOptimizationOutputType,
  BlogMediaUploadResult,
} from '../../services/blog-media-upload.service';
import {MediaLibraryItem, MediaUploadEvent} from '../../../media-library/models/media-library.models';
import {MediaLibraryService, MediaLibraryUploadOptions} from '../../../media-library/services/media-library.service';

@Component({
  selector: 'app-blog-media-uploader',
  imports: [
    CommonModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BlogMediaUploaderComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section
      class="space-y-3 border border-zinc-800 bg-zinc-950/70 p-4"
      [ngClass]="{
        'border-cyan-500': isDragging,
        'bg-cyan-950/20': isDragging
      }"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="space-y-1">
          <p class="text-sm font-medium text-zinc-100">
            {{ label }}
            @if (required) {
              <span class="text-cyan-300">*</span>
            }
          </p>
          @if (description) {
            <p class="text-xs leading-5 text-zinc-500">{{ description }}</p>
          }
        </div>

        <button
          type="button"
          class="shrink-0 border border-cyan-400 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600"
          [disabled]="isDisabled || isUploading"
          (click)="openPicker()"
        >
          {{ isUploading ? 'Uploading' : buttonLabel }}
        </button>
      </div>

      <label class="block space-y-2">
        <span class="text-xs uppercase tracking-[0.2em] text-zinc-500">Media URL</span>
        <input
          type="text"
          class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          [value]="value"
          [placeholder]="placeholder"
          [disabled]="isDisabled"
          (input)="onUrlInput($event)"
          (blur)="markAsTouched()"
        >
      </label>

      @if (isUploading) {
        <div class="space-y-2">
          <div class="h-2 overflow-hidden bg-zinc-800">
            <div class="h-full bg-cyan-300 transition-all" [style.width.%]="uploadProgress"></div>
          </div>
          <p class="text-xs text-zinc-500">{{ uploadProgress | number: '1.0-0' }}% uploaded</p>
        </div>
      }

      @if (errorMessage) {
        <p class="border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{{ errorMessage }}</p>
      }

      @if (successMessage || optimizationMessage) {
        <div class="space-y-1 border border-emerald-500/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          @if (successMessage) {
            <p>{{ successMessage }}</p>
          }
          @if (optimizationMessage) {
            <p class="text-xs text-emerald-100/80">{{ optimizationMessage }}</p>
          }
        </div>
      }

      @if (value) {
        <figure class="overflow-hidden border border-zinc-800 bg-zinc-900">
          <button
            type="button"
            class="group relative block w-full text-left"
            [attr.aria-label]="'Preview ' + label"
            (click)="openLightbox()"
          >
            <img
              class="max-h-56 w-full object-cover"
              [src]="value"
              [alt]="previewAlt"
              loading="lazy"
            >
            <span class="absolute inset-x-0 bottom-0 bg-zinc-950/80 px-3 py-2 text-xs uppercase tracking-[0.2em] text-zinc-200 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              Preview image
            </span>
          </button>
        </figure>
      }
    </section>

    @if (isLightboxOpen && value) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="label + ' preview'"
      >
        <button
          type="button"
          class="absolute inset-0 bg-black/85"
          aria-label="Close image preview"
          (click)="closeLightbox()"
        ></button>

        <section class="relative z-10 max-h-[92vh] w-full max-w-5xl overflow-hidden border border-zinc-700 bg-zinc-950 shadow-2xl">
          <header class="flex items-center justify-between gap-4 border-b border-zinc-800 px-4 py-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-zinc-100">{{ label }}</p>
              <p class="truncate text-xs text-zinc-500">{{ value }}</p>
            </div>

            <button
              type="button"
              class="shrink-0 border border-zinc-700 px-3 py-2 text-xs uppercase tracking-[0.18em] text-zinc-300 hover:border-cyan-300 hover:text-cyan-200"
              (click)="closeLightbox()"
            >
              Close
            </button>
          </header>

          <div class="flex max-h-[78vh] items-center justify-center bg-black p-3">
            <img
              class="max-h-[74vh] max-w-full object-contain"
              [src]="value"
              [alt]="previewAlt"
            >
          </div>

          <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
            <span>Press Escape or click outside to close.</span>
            <a
              class="text-cyan-300 hover:text-cyan-200"
              [href]="value"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open original
            </a>
          </footer>
        </section>
      </div>
    }

    @if (isPickerOpen) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'Choose media for ' + label"
      >
        <button
          type="button"
          class="absolute inset-0 bg-black/80"
          aria-label="Close media picker"
          (click)="closePicker()"
        ></button>

        <section class="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden border border-zinc-700 bg-zinc-950 shadow-2xl">
          <header class="flex flex-col gap-4 border-b border-zinc-800 px-4 py-4 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0 space-y-1">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Media Library</p>
              <h2 class="text-xl font-semibold text-zinc-50">Choose {{ label }}</h2>
              <p class="text-sm leading-6 text-zinc-400">Select an existing image or upload a new media item.</p>
            </div>
            <button
              type="button"
              class="shrink-0 border border-zinc-700 px-3 py-2 text-xs uppercase tracking-[0.18em] text-zinc-300 hover:border-cyan-300 hover:text-cyan-200"
              (click)="closePicker()"
            >
              Close
            </button>
          </header>

          <div class="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_18rem]">
            <section class="flex min-h-0 flex-col border-b border-zinc-800 md:border-b-0 md:border-r">
              <div class="flex flex-col gap-3 border-b border-zinc-800 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div class="inline-flex w-fit border border-zinc-700 bg-zinc-900 p-1">
                  <button
                    type="button"
                    class="px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition"
                    [class.bg-cyan-300]="pickerMode === 'library'"
                    [class.text-zinc-950]="pickerMode === 'library'"
                    [class.text-zinc-400]="pickerMode !== 'library'"
                    (click)="pickerMode = 'library'"
                  >
                    Existing
                  </button>
                  <button
                    type="button"
                    class="px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition"
                    [class.bg-cyan-300]="pickerMode === 'upload'"
                    [class.text-zinc-950]="pickerMode === 'upload'"
                    [class.text-zinc-400]="pickerMode !== 'upload'"
                    (click)="pickerMode = 'upload'"
                  >
                    Upload
                  </button>
                </div>

                @if (pickerMode === 'library') {
                  <label class="min-w-0 flex-1 lg:max-w-sm">
                    <span class="sr-only">Search media library</span>
                    <input
                      type="search"
                      class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300"
                      placeholder="Search images, folders, tags..."
                      [value]="pickerSearch"
                      (input)="onPickerSearchInput($event)"
                    >
                  </label>
                }
              </div>

              <div class="min-h-0 flex-1 overflow-auto p-4">
                @if (pickerMode === 'library') {
                  @if (libraryErrorMessage) {
                    <div class="border border-red-500/50 bg-red-950/40 p-4 text-sm text-red-200">
                      {{ libraryErrorMessage }}
                    </div>
                  } @else if (filteredLibraryItems.length === 0) {
                    <div class="flex min-h-[320px] items-center justify-center border border-dashed border-zinc-800 bg-zinc-900/40 p-8 text-center">
                      <div class="max-w-sm space-y-3">
                        <p class="text-base font-medium text-zinc-100">No matching images</p>
                        <p class="text-sm leading-6 text-zinc-500">Upload a new image or adjust the search to find an existing media item.</p>
                        <button
                          type="button"
                          class="border border-cyan-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950"
                          (click)="pickerMode = 'upload'"
                        >
                          Upload Image
                        </button>
                      </div>
                    </div>
                  } @else {
                    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      @for (item of filteredLibraryItems; track item.id) {
                        <button
                          type="button"
                          class="group overflow-hidden border bg-zinc-900 text-left transition hover:border-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                          [class.border-cyan-300]="selectedLibraryItem?.id === item.id"
                          [class.border-zinc-800]="selectedLibraryItem?.id !== item.id"
                          (click)="selectLibraryItem(item)"
                          (dblclick)="applyMediaItem(item)"
                        >
                          <span class="block aspect-[16/10] overflow-hidden bg-black">
                            <img
                              class="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                              [src]="getMediaItemThumbnailUrl(item)"
                              [alt]="item.altText || item.displayName"
                              loading="lazy"
                            >
                          </span>
                          <span class="block space-y-1 p-3">
                            <span class="block truncate text-sm font-semibold text-zinc-100">{{ item.displayName }}</span>
                            <span class="block truncate text-xs text-zinc-500">{{ item.folderPath || 'Uncategorized' }}</span>
                            <span class="flex flex-wrap gap-1 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                              @if (item.width && item.height) {
                                <span>{{ item.width }}x{{ item.height }}</span>
                              }
                              @if (item.extension) {
                                <span>{{ item.extension }}</span>
                              }
                            </span>
                          </span>
                        </button>
                      }
                    </div>
                  }
                } @else {
                  <input
                    #pickerFileInput
                    type="file"
                    class="hidden"
                    [accept]="accept"
                    [disabled]="isDisabled || isUploading"
                    (change)="onFileSelected($event)"
                  >
                  <section
                    class="grid min-h-[360px] place-items-center border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center"
                    [class.border-cyan-400]="isDragging"
                    [class.bg-cyan-950]="isDragging"
                    (dragover)="onDragOver($event)"
                    (dragleave)="onDragLeave($event)"
                    (drop)="onDrop($event)"
                  >
                    <div class="max-w-md space-y-4">
                      <div class="mx-auto grid h-14 w-14 place-items-center border border-zinc-700 bg-zinc-950 text-2xl text-cyan-200">▧</div>
                      <div class="space-y-2">
                        <p class="text-lg font-semibold text-zinc-100">Upload a new media item</p>
                        <p class="text-sm leading-6 text-zinc-500">Images are uploaded into the media library and applied to this field when complete.</p>
                      </div>
                      <button
                        type="button"
                        class="border border-cyan-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600"
                        [disabled]="isDisabled || isUploading"
                        (click)="pickerFileInput.click()"
                      >
                        {{ isUploading ? 'Uploading' : 'Upload Image' }}
                      </button>
                      @if (uploadFileName) {
                        <p class="text-xs text-zinc-500">{{ uploadFileName }}</p>
                      }
                    </div>
                  </section>
                }
              </div>
            </section>

            <aside class="min-h-0 space-y-4 overflow-auto p-4">
              <div class="space-y-2">
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Selected</p>
                @if (selectedLibraryItem; as selected) {
                  <figure class="overflow-hidden border border-zinc-800 bg-zinc-900">
                    <img
                      class="aspect-[16/10] w-full object-cover"
                      [src]="getMediaItemThumbnailUrl(selected)"
                      [alt]="selected.altText || selected.displayName"
                    >
                    <figcaption class="space-y-1 p-3">
                      <p class="truncate text-sm font-semibold text-zinc-100">{{ selected.displayName }}</p>
                      <p class="break-all text-xs leading-5 text-zinc-500">{{ getMediaItemUrl(selected) }}</p>
                    </figcaption>
                  </figure>
                } @else {
                  <div class="border border-dashed border-zinc-800 p-4 text-sm leading-6 text-zinc-500">
                    Choose an image from the library to apply it to this field.
                  </div>
                }
              </div>

              @if (isUploading) {
                <div class="space-y-2 border border-cyan-500/40 bg-cyan-950/20 p-3">
                  <div class="h-2 overflow-hidden bg-zinc-800">
                    <div class="h-full bg-cyan-300 transition-all" [style.width.%]="uploadProgress"></div>
                  </div>
                  <p class="text-xs text-cyan-100">{{ uploadProgress | number: '1.0-0' }}% uploaded</p>
                </div>
              }

              @if (errorMessage) {
                <p class="border border-red-500/50 bg-red-950/40 p-3 text-sm text-red-200">{{ errorMessage }}</p>
              }

              <div class="flex flex-col gap-2">
                <button
                  type="button"
                  class="border border-cyan-400 bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-transparent disabled:text-zinc-600"
                  [disabled]="!selectedLibraryItem || isUploading"
                  (click)="applySelectedLibraryItem()"
                >
                  Use Selected Image
                </button>
                <button
                  type="button"
                  class="border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
                  (click)="closePicker()"
                >
                  Cancel
                </button>
              </div>
            </aside>
          </div>
        </section>
      </div>
    }
  `,
})
export class BlogMediaUploaderComponent implements ControlValueAccessor {
  @Input() label = 'Media Image';
  @Input() description = '';
  @Input() buttonLabel = 'Upload';
  @Input() placeholder = 'Upload an image or paste a URL';
  @Input() previewAlt = 'Uploaded media preview';
  @Input() postSlug = 'untitled-post';
  @Input() assetRole: BlogMediaAssetRole | string = 'inline-image';
  @Input() accept = 'image/*';
  @Input() maxSizeBytes = 8 * 1024 * 1024;
  @Input() required = false;
  @Input() optimizeImages = true;
  @Input() optimizationMaxWidth = 1920;
  @Input() optimizationMaxHeight = 1920;
  @Input() optimizationQuality = 0.82;
  @Input() optimizationOutputType: BlogMediaOptimizationOutputType = 'image/webp';
  @Input() forceOptimizationOutputType = false;

  @Output() mediaUploaded = new EventEmitter<BlogMediaUploadResult>();

  protected value = '';
  protected isDisabled = false;
  protected isUploading = false;
  protected isDragging = false;
  protected uploadProgress = 0;
  protected errorMessage = '';
  protected successMessage = '';
  protected optimizationMessage = '';
  protected isLightboxOpen = false;
  protected isPickerOpen = false;
  protected pickerMode: 'library' | 'upload' = 'library';
  protected pickerSearch = '';
  protected libraryItems: readonly MediaLibraryItem[] = [];
  protected selectedLibraryItem: MediaLibraryItem | null = null;
  protected libraryErrorMessage = '';
  protected uploadFileName = '';

  private readonly mediaLibrary = inject(MediaLibraryService);
  private readonly destroyRef = inject(DestroyRef);
  private uploadSubscription: Subscription | null = null;
  private librarySubscription: Subscription | null = null;
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    this.librarySubscription = this.mediaLibrary.listenToMediaItems().subscribe({
      next: items => {
        this.libraryItems = items;
        this.libraryErrorMessage = '';
      },
      error: error => {
        this.libraryErrorMessage = error instanceof Error ? error.message : 'Unable to load media library items.';
      },
    });
    this.destroyRef.onDestroy(() => {
      this.uploadSubscription?.unsubscribe();
      this.librarySubscription?.unsubscribe();
    });
  }

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  protected get filteredLibraryItems(): readonly MediaLibraryItem[] {
    const search = this.pickerSearch.trim().toLowerCase();
    const imageItems = this.libraryItems
      .filter(item => item.mediaType === 'image' && item.status === 'ready' && this.getMediaItemUrl(item))
      .sort((left, right) => (right.uploadedAt ?? '').localeCompare(left.uploadedAt ?? ''));

    if (!search) {
      return imageItems;
    }

    return imageItems.filter(item => [
      item.displayName,
      item.originalFileName,
      item.fileName,
      item.folderPath,
      item.altText,
      item.description,
      ...item.tags,
    ].some(value => (value ?? '').toLowerCase().includes(search)));
  }

  protected openPicker(): void {
    if (this.isDisabled) {
      return;
    }

    this.selectedLibraryItem = this.findSelectedLibraryItem();
    this.pickerMode = 'library';
    this.isPickerOpen = true;
    this.onTouched();
  }

  protected closePicker(): void {
    this.isPickerOpen = false;
    this.isDragging = false;
    this.uploadFileName = '';
  }

  protected onPickerSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.pickerSearch = input?.value ?? '';
  }

  protected selectLibraryItem(item: MediaLibraryItem): void {
    this.selectedLibraryItem = item;
  }

  protected applySelectedLibraryItem(): void {
    if (!this.selectedLibraryItem) {
      return;
    }

    this.applyMediaItem(this.selectedLibraryItem);
  }

  protected applyMediaItem(item: MediaLibraryItem): void {
    const url = this.getMediaItemUrl(item);

    if (!url) {
      this.errorMessage = 'This media item does not have a usable URL.';
      return;
    }

    this.updateValue(url);
    this.successMessage = `Selected ${item.displayName} from the media library.`;
    this.closePicker();
  }

  protected getMediaItemThumbnailUrl(item: MediaLibraryItem): string {
    return item.thumbnailUrl ?? item.previewUrl ?? item.downloadUrl ?? item.originalUrl ?? '';
  }

  protected getMediaItemUrl(item: MediaLibraryItem): string {
    return item.originalUrl ?? item.downloadUrl ?? item.previewUrl ?? item.thumbnailUrl ?? '';
  }

  protected onUrlInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;

    if (!input) {
      return;
    }

    this.updateValue(input.value);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (input) {
      input.value = '';
    }

    if (file) {
      this.uploadFile(file);
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();

    if (!this.isDisabled && !this.isUploading) {
      this.isDragging = true;
    }
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;

    if (this.isDisabled || this.isUploading) {
      return;
    }

    const file = event.dataTransfer?.files?.[0];

    if (file) {
      this.uploadFile(file);
    }
  }

  protected markAsTouched(): void {
    this.onTouched();
  }

  protected openLightbox(): void {
    if (this.value) {
      this.isLightboxOpen = true;
    }
  }

  protected closeLightbox(): void {
    this.isLightboxOpen = false;
  }

  @HostListener('document:keydown.escape')
  protected closeLightboxFromEscape(): void {
    this.closePicker();
    this.closeLightbox();
  }

  private uploadFile(file: File): void {
    this.uploadSubscription?.unsubscribe();
    this.isUploading = true;
    this.uploadProgress = 0;
    this.uploadFileName = file.name;
    this.errorMessage = '';
    this.successMessage = '';
    this.optimizationMessage = '';
    this.onTouched();

    this.uploadSubscription = this.mediaLibrary.uploadFiles([file], null, this.createUploadOptions()).subscribe({
      next: event => this.handleUploadProgress(event),
      error: error => this.handleUploadError(error),
      complete: () => {
        this.isUploading = false;
      },
    });
  }

  private handleUploadProgress(event: MediaUploadEvent): void {
    this.uploadProgress = event.progress;

    if (event.status === 'failed') {
      this.handleUploadError(event.error ?? 'Unable to upload image.');
      return;
    }

    if (event.status !== 'complete' || !event.item) {
      return;
    }

    const result = this.createUploadResult(event.item, event.fileName);
    this.updateValue(result.downloadUrl);
    this.selectedLibraryItem = event.item;
    this.successMessage = `Uploaded ${result.originalName} to the media library.`;
    this.optimizationMessage = this.getUploadMetadataMessage(event.item);
    this.mediaUploaded.emit(result);
    this.closePicker();
  }

  private handleUploadError(error: unknown): void {
    this.isUploading = false;
    this.errorMessage = error instanceof Error
      ? error.message
      : typeof error === 'string' ? error : 'Unable to upload image.';
    this.optimizationMessage = '';
  }

  private updateValue(value: string): void {
    this.value = value;
    this.errorMessage = '';
    this.successMessage = '';
    this.optimizationMessage = '';
    this.onChange(value);
  }

  private createUploadOptions(): MediaLibraryUploadOptions {
    return {
      slug: this.postSlug,
      role: this.assetRole,
      maxSizeBytes: this.maxSizeBytes,
      optimization: {
        enabled: this.optimizeImages,
        maxWidth: this.optimizationMaxWidth,
        maxHeight: this.optimizationMaxHeight,
        quality: this.optimizationQuality,
        outputType: this.optimizationOutputType,
        forceOutputType: this.forceOptimizationOutputType,
      },
    };
  }

  private createUploadResult(item: MediaLibraryItem, fileName: string): BlogMediaUploadResult {
    const size = item.sizeBytes ?? 0;

    return {
      downloadUrl: this.getMediaItemUrl(item),
      storagePath: item.storagePath ?? '',
      originalName: (item.originalFileName ?? item.fileName ?? item.displayName) || fileName,
      contentType: item.mimeType ?? 'image/*',
      size,
      originalSize: size,
      optimized: false,
      optimizationSavings: 0,
      optimizationSavingsPercent: 0,
      width: item.width,
      height: item.height,
    };
  }

  private getUploadMetadataMessage(item: MediaLibraryItem): string {
    const dimensions = item.width && item.height ? ` at ${item.width}x${item.height}` : '';
    const size = item.sizeBytes ? ` (${this.formatBytes(item.sizeBytes)})` : '';

    return `Saved as a media library item${dimensions}${size}.`;
  }

  private findSelectedLibraryItem(): MediaLibraryItem | null {
    if (!this.value) {
      return null;
    }

    return this.libraryItems.find(item => this.getMediaItemUrl(item) === this.value) ?? null;
  }

  private formatBytes(value: number): string {
    if (value < 1024 * 1024) {
      return `${Math.max(1, Math.round(value / 1024))} KB`;
    }

    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }
}
