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
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {Subscription} from 'rxjs';

import {
  BlogMediaAssetRole,
  BlogMediaOptimizationOutputType,
  BlogMediaUploadProgress,
  BlogMediaUploadResult,
  BlogMediaUploadService,
} from '../../services/blog-media-upload.service';

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
          (click)="fileInput.click()"
        >
          {{ isUploading ? 'Uploading' : buttonLabel }}
        </button>
      </div>

      <input
        #fileInput
        type="file"
        class="hidden"
        [accept]="accept"
        [disabled]="isDisabled || isUploading"
        (change)="onFileSelected($event)"
      >

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

  private readonly mediaUpload = inject(BlogMediaUploadService);
  private readonly destroyRef = inject(DestroyRef);
  private uploadSubscription: Subscription | null = null;
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    this.destroyRef.onDestroy(() => this.uploadSubscription?.unsubscribe());
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
    this.closeLightbox();
  }

  private uploadFile(file: File): void {
    this.uploadSubscription?.unsubscribe();
    this.isUploading = true;
    this.uploadProgress = 0;
    this.errorMessage = '';
    this.successMessage = '';
    this.optimizationMessage = '';
    this.onTouched();

    this.uploadSubscription = this.mediaUpload.uploadImage(file, {
      slug: this.postSlug,
      role: this.assetRole,
      maxSizeBytes: this.maxSizeBytes,
      optimization: {
        enabled: this.optimizeImages,
        maxWidth: this.optimizationMaxWidth,
        maxHeight: this.optimizationMaxHeight,
        quality: this.optimizationQuality,
        outputType: this.optimizationOutputType,
      },
    }).subscribe({
      next: event => this.handleUploadProgress(event),
      error: error => this.handleUploadError(error),
      complete: () => {
        this.isUploading = false;
      },
    });
  }

  private handleUploadProgress(event: BlogMediaUploadProgress): void {
    this.uploadProgress = event.progress;

    if (!event.downloadUrl) {
      return;
    }

    const result: BlogMediaUploadResult = {
      downloadUrl: event.downloadUrl,
      storagePath: event.storagePath,
      originalName: event.originalName,
      contentType: event.contentType,
      size: event.size,
      originalSize: event.originalSize,
      optimized: event.optimized,
      optimizationSavings: event.optimizationSavings,
      optimizationSavingsPercent: event.optimizationSavingsPercent,
      width: event.width,
      height: event.height,
    };

    this.updateValue(result.downloadUrl);
    this.successMessage = 'Uploaded image to Firebase Storage.';
    this.optimizationMessage = this.getOptimizationMessage(result);
    this.mediaUploaded.emit(result);
  }

  private handleUploadError(error: unknown): void {
    this.isUploading = false;
    this.errorMessage = error instanceof Error ? error.message : 'Unable to upload image.';
    this.optimizationMessage = '';
  }

  private updateValue(value: string): void {
    this.value = value;
    this.errorMessage = '';
    this.successMessage = '';
    this.optimizationMessage = '';
    this.onChange(value);
  }

  private getOptimizationMessage(result: BlogMediaUploadResult): string {
    if (!result.optimized) {
      return `Uploaded original file (${this.formatBytes(result.size)}). No smaller optimized version was available.`;
    }

    const dimensions = result.width && result.height ? ` at ${result.width}x${result.height}` : '';

    return `Optimized ${this.formatBytes(result.originalSize)} to ${this.formatBytes(result.size)}${dimensions} (${result.optimizationSavingsPercent.toFixed(0)}% smaller).`;
  }

  private formatBytes(value: number): string {
    if (value < 1024 * 1024) {
      return `${Math.max(1, Math.round(value / 1024))} KB`;
    }

    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }
}
