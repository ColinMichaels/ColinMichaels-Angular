import {Injectable, inject} from '@angular/core';
import {Observable, defer, from, throwError} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {FirestoreService} from '../../../services/firebase/firestore.service';

export type BlogMediaAssetRole = 'cover' | 'open-graph' | 'editor-image' | 'thumbnail' | 'inline-image';
export type BlogMediaOptimizationOutputType = 'image/webp' | 'image/jpeg' | 'image/png';

export interface BlogMediaOptimizationOptions {
  enabled?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputType?: BlogMediaOptimizationOutputType;
  minSavingsPercent?: number;
}

export interface BlogMediaUploadOptions {
  slug: string;
  role: BlogMediaAssetRole | string;
  altText?: string;
  maxSizeBytes?: number;
  optimization?: BlogMediaOptimizationOptions;
}

export interface BlogMediaUploadProgress {
  progress: number;
  storagePath: string;
  originalName: string;
  contentType: string;
  size: number;
  originalSize: number;
  optimized: boolean;
  optimizationSavings: number;
  optimizationSavingsPercent: number;
  width?: number;
  height?: number;
  downloadUrl?: string;
}

export interface BlogMediaUploadResult {
  downloadUrl: string;
  storagePath: string;
  originalName: string;
  contentType: string;
  size: number;
  originalSize: number;
  optimized: boolean;
  optimizationSavings: number;
  optimizationSavingsPercent: number;
  width?: number;
  height?: number;
}

interface UploadMetadata {
  contentType: string;
  customMetadata: Record<string, string>;
}

interface ResolvedOptimizationOptions {
  enabled: boolean;
  maxWidth: number;
  maxHeight: number;
  quality: number;
  outputType: BlogMediaOptimizationOutputType;
  minSavingsPercent: number;
}

interface PreparedUploadFile {
  file: File;
  originalName: string;
  originalSize: number;
  optimized: boolean;
  optimizationSavings: number;
  optimizationSavingsPercent: number;
  width?: number;
  height?: number;
}

const DEFAULT_MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const DEFAULT_SLUG = 'untitled-post';
const DEFAULT_OPTIMIZATION: ResolvedOptimizationOptions = {
  enabled: true,
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.82,
  outputType: 'image/webp',
  minSavingsPercent: 3,
};
const OPTIMIZABLE_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable({
  providedIn: 'root',
})
export class BlogMediaUploadService {
  private readonly firestore = inject(FirestoreService);

  uploadImage(file: File, options: BlogMediaUploadOptions): Observable<BlogMediaUploadProgress> {
    const validationError = this.getImageTypeValidationError(file);

    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    return defer(() => from(this.prepareUploadFile(file, options))).pipe(
      switchMap(preparedFile => {
        const maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_IMAGE_SIZE_BYTES;
        const sizeValidationError = this.getSizeValidationError(preparedFile.file, maxSizeBytes);

        if (sizeValidationError) {
          return throwError(() => new Error(sizeValidationError));
        }

        const storagePath = this.createStoragePath(preparedFile.file, options);
        const metadata: UploadMetadata = {
          contentType: preparedFile.file.type,
          customMetadata: {
            originalName: preparedFile.originalName,
            role: options.role,
            altText: options.altText ?? '',
            optimized: String(preparedFile.optimized),
            originalSize: String(preparedFile.originalSize),
            uploadedSize: String(preparedFile.file.size),
          },
        };

        return this.firestore.uploadFileWithProgress(storagePath, preparedFile.file, metadata).pipe(
          map(event => ({
            progress: event.progress,
            storagePath,
            originalName: preparedFile.originalName,
            contentType: preparedFile.file.type,
            size: preparedFile.file.size,
            originalSize: preparedFile.originalSize,
            optimized: preparedFile.optimized,
            optimizationSavings: preparedFile.optimizationSavings,
            optimizationSavingsPercent: preparedFile.optimizationSavingsPercent,
            width: preparedFile.width,
            height: preparedFile.height,
            downloadUrl: event.downloadUrl,
          }))
        );
      })
    );
  }

  private getImageTypeValidationError(file: File): string | null {
    if (!file.type.startsWith('image/')) {
      return 'Only image files can be uploaded.';
    }

    return null;
  }

  private getSizeValidationError(file: File, maxSizeBytes: number): string | null {
    if (file.size > maxSizeBytes) {
      return `Image must be smaller than ${this.formatBytes(maxSizeBytes)}.`;
    }

    return null;
  }

  private async prepareUploadFile(file: File, options: BlogMediaUploadOptions): Promise<PreparedUploadFile> {
    const resolvedOptimization = this.resolveOptimizationOptions(options.optimization);

    if (!this.canOptimizeImage(file, resolvedOptimization)) {
      return this.createPreparedUploadFile(file, file, false);
    }

    try {
      const image = await this.loadImage(file);
      const targetSize = this.getTargetImageSize(image.width, image.height, resolvedOptimization);

      if (!targetSize) {
        return this.createPreparedUploadFile(file, file, false);
      }

      const blob = await this.renderOptimizedImage(image, targetSize.width, targetSize.height, resolvedOptimization);

      if (!blob) {
        return this.createPreparedUploadFile(file, file, false, image.width, image.height);
      }

      const savings = file.size - blob.size;
      const savingsPercent = file.size > 0 ? (savings / file.size) * 100 : 0;
      const maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_IMAGE_SIZE_BYTES;
      const optimizedFitsWhenOriginalDoesNot = file.size > maxSizeBytes && blob.size <= maxSizeBytes;

      if (savings <= 0 || (savingsPercent < resolvedOptimization.minSavingsPercent && !optimizedFitsWhenOriginalDoesNot)) {
        return this.createPreparedUploadFile(file, file, false, image.width, image.height);
      }

      const optimizedFile = new File(
        [blob],
        this.replaceFileExtension(file.name, this.getExtensionForContentType(blob.type)),
        {
          type: blob.type,
          lastModified: file.lastModified,
        }
      );

      return this.createPreparedUploadFile(file, optimizedFile, true, targetSize.width, targetSize.height);
    } catch {
      return this.createPreparedUploadFile(file, file, false);
    }
  }

  private createPreparedUploadFile(
    originalFile: File,
    uploadFile: File,
    optimized: boolean,
    width?: number,
    height?: number
  ): PreparedUploadFile {
    const savings = originalFile.size - uploadFile.size;

    return {
      file: uploadFile,
      originalName: originalFile.name,
      originalSize: originalFile.size,
      optimized,
      optimizationSavings: optimized ? savings : 0,
      optimizationSavingsPercent: optimized && originalFile.size > 0 ? (savings / originalFile.size) * 100 : 0,
      width,
      height,
    };
  }

  private resolveOptimizationOptions(options?: BlogMediaOptimizationOptions): ResolvedOptimizationOptions {
    return {
      ...DEFAULT_OPTIMIZATION,
      ...options,
      quality: this.clamp(options?.quality ?? DEFAULT_OPTIMIZATION.quality, 0.1, 1),
      minSavingsPercent: this.clamp(
        options?.minSavingsPercent ?? DEFAULT_OPTIMIZATION.minSavingsPercent,
        0,
        100
      ),
    };
  }

  private canOptimizeImage(file: File, options: ResolvedOptimizationOptions): boolean {
    return options.enabled
      && typeof document !== 'undefined'
      && typeof URL !== 'undefined'
      && typeof HTMLCanvasElement !== 'undefined'
      && typeof HTMLCanvasElement.prototype.toBlob === 'function'
      && OPTIMIZABLE_CONTENT_TYPES.has(file.type);
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);

      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Unable to read image for optimization.'));
      };
      image.src = objectUrl;
    });
  }

  private getTargetImageSize(
    width: number,
    height: number,
    options: ResolvedOptimizationOptions
  ): { width: number; height: number } | null {
    if (width <= 0 || height <= 0) {
      return null;
    }

    const resizeRatio = Math.min(options.maxWidth / width, options.maxHeight / height, 1);

    return {
      width: Math.max(1, Math.round(width * resizeRatio)),
      height: Math.max(1, Math.round(height * resizeRatio)),
    };
  }

  private renderOptimizedImage(
    image: HTMLImageElement,
    width: number,
    height: number,
    options: ResolvedOptimizationOptions
  ): Promise<Blob | null> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');

    if (!context) {
      return Promise.resolve(null);
    }

    context.drawImage(image, 0, 0, width, height);

    return new Promise(resolve => {
      canvas.toBlob(resolve, options.outputType, options.quality);
    });
  }

  private createStoragePath(file: File, options: BlogMediaUploadOptions): string {
    const safeSlug = this.toSafePathSegment(options.slug || DEFAULT_SLUG);
    const safeRole = this.toSafePathSegment(options.role || 'inline-image');
    const extension = this.getFileExtension(file);
    const uniqueId = this.createUniqueId();

    return `cms/blog-media/${safeSlug}/${safeRole}/${Date.now()}-${uniqueId}.${extension}`;
  }

  private getFileExtension(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension && /^[a-z0-9]+$/.test(extension)) {
      return extension;
    }

    switch (file.type) {
      case 'image/gif':
        return 'gif';
      case 'image/png':
        return 'png';
      case 'image/svg+xml':
        return 'svg';
      case 'image/webp':
        return 'webp';
      default:
        return 'jpg';
    }
  }

  private getExtensionForContentType(contentType: string): string {
    switch (contentType) {
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      default:
        return 'jpg';
    }
  }

  private replaceFileExtension(fileName: string, extension: string): string {
    const baseName = fileName.replace(/\.[^.]+$/, '') || 'image';

    return `${baseName}.${extension}`;
  }

  private toSafePathSegment(value: string): string {
    const safeValue = value
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    return safeValue || DEFAULT_SLUG;
  }

  private createUniqueId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return Math.random().toString(36).slice(2, 12);
  }

  private formatBytes(value: number): string {
    if (value < 1024 * 1024) {
      return `${Math.round(value / 1024)} KB`;
    }

    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
