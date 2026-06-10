import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {
  MediaLibraryFolder,
  MediaLibraryItem,
  ResizeDestinationMode,
  ResizeMediaRequest,
  ResizeMode,
  ResizeOutputFormat,
  ResizeOverwriteMode,
} from '../models/media-library.models';

@Component({
  selector: 'app-resize-media-dialog',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Resize media">
      <button type="button" class="absolute inset-0 bg-gray-950/50" aria-label="Close resize dialog" (click)="closeRequested.emit()"></button>

      <section class="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <header class="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Resize Media</h2>
            <p class="text-sm text-gray-500">Submit selected images to the existing resize function.</p>
          </div>
          <button type="button" class="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50" (click)="closeRequested.emit()">Close</button>
        </header>

        <form class="max-h-[74vh] space-y-5 overflow-y-auto p-5" (ngSubmit)="submitResize()">
          <div class="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <p class="font-semibold">{{ imageItems.length }} image{{ imageItems.length === 1 ? '' : 's' }} selected</p>
            <p class="mt-1 text-xs">Original files are not modified by default. Use variants or new media items for safe output.</p>
          </div>

          @if (imageItems.length === 0) {
            <p class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Resize is available only for image media.</p>
          }

          <div class="grid gap-4 md:grid-cols-2">
            <label class="block space-y-1">
              <span class="field-label">Width</span>
              <input type="number" min="1" class="field-input" name="width" [(ngModel)]="width" placeholder="Auto">
            </label>
            <label class="block space-y-1">
              <span class="field-label">Height</span>
              <input type="number" min="1" class="field-input" name="height" [(ngModel)]="height" placeholder="Auto">
            </label>
          </div>

          <label class="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700">
            <input type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" name="lockAspectRatio" [(ngModel)]="lockAspectRatio">
            Lock aspect ratio
          </label>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="block space-y-1">
              <span class="field-label">Resize mode</span>
              <select class="field-input" name="resizeMode" [(ngModel)]="resizeMode">
                <option value="fit">Fit inside</option>
                <option value="fill">Fill / crop</option>
                <option value="stretch">Stretch</option>
                <option value="pad">Pad / contain</option>
              </select>
            </label>

            <label class="block space-y-1">
              <span class="field-label">Output format</span>
              <select class="field-input" name="outputFormat" [(ngModel)]="outputFormat">
                <option value="same">Same as source</option>
                <option value="jpg">jpg</option>
                <option value="png">png</option>
                <option value="webp">webp</option>
                <option value="avif">avif, if supported</option>
              </select>
            </label>
          </div>

          <label class="block space-y-2">
            <span class="field-label">Quality: {{ quality }}%</span>
            <input type="range" min="10" max="100" step="1" class="w-full" name="quality" [(ngModel)]="quality">
          </label>

          <label class="block space-y-1">
            <span class="field-label">Output name pattern</span>
            <input class="field-input" name="outputNamePattern" [(ngModel)]="outputNamePattern" placeholder="{name}_{width}x{height}">
          </label>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="block space-y-1">
              <span class="field-label">Destination behavior</span>
              <select class="field-input" name="destinationMode" [(ngModel)]="destinationMode">
                <option value="variant">Save as variant</option>
                <option value="new-media">Save as new media item</option>
                <option value="selected-folder">Save to selected folder</option>
              </select>
            </label>

            <label class="block space-y-1">
              <span class="field-label">Destination folder</span>
              <select class="field-input" name="destinationFolderId" [(ngModel)]="destinationFolderId" [disabled]="destinationMode !== 'selected-folder'">
                <option value="">Current folder / default</option>
                @for (folder of folders; track folder.id) {
                  <option [value]="folder.id">{{ folder.path }}</option>
                }
              </select>
            </label>
          </div>

          <label class="block space-y-1">
            <span class="field-label">Overwrite behavior</span>
            <select class="field-input" name="overwriteMode" [(ngModel)]="overwriteMode">
              <option value="skip">Skip existing output</option>
              <option value="replace">Replace if supported</option>
              <option value="auto-rename">Auto rename</option>
            </select>
          </label>

          <section class="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
            <p class="font-semibold text-gray-900">Estimated output behavior</p>
            <p class="mt-1">{{ imageItems.length }} image{{ imageItems.length === 1 ? '' : 's' }} will be resized with {{ resizeModeLabel }} mode at {{ quality }}% quality.</p>
            <p class="mt-1">Output: {{ destinationLabel }}. Originals remain unchanged unless the deployed resize function intentionally supports replacement.</p>
          </section>
        </form>

        <footer class="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4">
          <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" (click)="closeRequested.emit()">Cancel</button>
          <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300" [disabled]="imageItems.length === 0 || !hasDimensions" (click)="submitResize()">Submit Resize</button>
        </footer>
      </section>
    </div>
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
  `],
})
export class ResizeMediaDialogComponent {
  @Input() items: readonly MediaLibraryItem[] = [];
  @Input() folders: readonly MediaLibraryFolder[] = [];
  @Output() submitRequest = new EventEmitter<ResizeMediaRequest>();
  @Output() closeRequested = new EventEmitter<void>();

  protected width: number | null = 1200;
  protected height: number | null = null;
  protected lockAspectRatio = true;
  protected resizeMode: ResizeMode = 'fit';
  protected outputFormat: ResizeOutputFormat = 'webp';
  protected quality = 86;
  protected outputNamePattern = '{name}_{width}x{height}';
  protected destinationMode: ResizeDestinationMode = 'variant';
  protected destinationFolderId = '';
  protected overwriteMode: ResizeOverwriteMode = 'auto-rename';

  protected get imageItems(): readonly MediaLibraryItem[] {
    return this.items.filter(item => item.mediaType === 'image');
  }

  protected get hasDimensions(): boolean {
    return Boolean(this.width || this.height);
  }

  protected get resizeModeLabel(): string {
    switch (this.resizeMode) {
      case 'fit':
        return 'fit inside';
      case 'fill':
        return 'fill/crop';
      case 'stretch':
        return 'stretch';
      case 'pad':
        return 'pad/contain';
    }
  }

  protected get destinationLabel(): string {
    switch (this.destinationMode) {
      case 'variant':
        return 'save as variant';
      case 'new-media':
        return 'save as new media item';
      case 'selected-folder':
        return 'save to selected folder';
    }
  }

  protected submitResize(): void {
    if (this.imageItems.length === 0 || !this.hasDimensions) {
      return;
    }

    this.submitRequest.emit({
      mediaIds: this.imageItems.map(item => item.id),
      width: this.toNullableNumber(this.width),
      height: this.toNullableNumber(this.height),
      lockAspectRatio: this.lockAspectRatio,
      resizeMode: this.resizeMode,
      outputFormat: this.outputFormat,
      quality: this.quality,
      outputNamePattern: this.outputNamePattern.trim() || '{name}_{width}x{height}',
      destinationMode: this.destinationMode,
      destinationFolderId: this.destinationFolderId || null,
      overwriteMode: this.overwriteMode,
    });
  }

  private toNullableNumber(value: number | string | null): number | null {
    if (value === null || value === '') {
      return null;
    }

    const numericValue = Number(value);

    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
  }
}
