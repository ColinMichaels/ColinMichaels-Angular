import {Injectable, inject} from '@angular/core';
import {Observable, combineLatest, concatMap, forkJoin, from, merge, of} from 'rxjs';
import {catchError, map, startWith} from 'rxjs/operators';

import {
  BlogMediaUploadProgress,
  BlogMediaOptimizationOptions,
  BlogMediaAssetRole,
  BlogMediaUploadResult,
  BlogMediaUploadService,
} from '../../cms/services/blog-media-upload.service';
import {BlogPost} from '../../../features/blog/models/blog-post.model';
import {BlogRepositoryService} from '../../../features/blog/services/blog-repository.service';
import {FirestoreDocument, FirestoreService} from '../../../services/firebase/firestore.service';
import {
  MediaLibraryFolder,
  MediaLibraryItem,
  MediaMetadataPatch,
  MediaStatus,
  MediaUploadEvent,
  RenamePreviewRow,
} from '../models/media-library.models';
import {
  coerceDateString,
  createSafePathSegment,
  getFileExtension,
  inferMediaType,
  isValidDisplayName,
  normalizeText,
  stripFileExtension,
} from '../utils/media-library.utils';

const MEDIA_COLLECTION = 'mediaLibraryItems';
const FOLDER_COLLECTION = 'mediaLibraryFolders';
const DEFAULT_LIBRARY_SLUG = 'media-library';

interface MediaLibraryDocument extends FirestoreDocument {
  displayName?: unknown;
  originalFileName?: unknown;
  fileName?: unknown;
  extension?: unknown;
  mediaType?: unknown;
  mimeType?: unknown;
  storagePath?: unknown;
  thumbnailUrl?: unknown;
  previewUrl?: unknown;
  originalUrl?: unknown;
  downloadUrl?: unknown;
  width?: unknown;
  height?: unknown;
  aspectRatio?: unknown;
  durationMs?: unknown;
  sizeBytes?: unknown;
  folderId?: unknown;
  folderPath?: unknown;
  tags?: unknown;
  favorite?: unknown;
  rating?: unknown;
  colorLabel?: unknown;
  notes?: unknown;
  altText?: unknown;
  description?: unknown;
  status?: unknown;
  processingError?: unknown;
  uploadedAt?: unknown;
}

interface MediaFolderDocument extends FirestoreDocument {
  name?: unknown;
  parentId?: unknown;
  path?: unknown;
  color?: unknown;
  itemCount?: unknown;
  archived?: unknown;
}

interface UploadedFileMetadata {
  downloadUrl: string;
  storagePath: string;
  originalName: string;
  contentType: string;
  size: number;
  originalSize?: number;
  optimized?: boolean;
  width?: number;
  height?: number;
  mediaId?: string;
}

export interface MediaLibraryUploadOptions {
  slug?: string;
  role?: BlogMediaAssetRole | string;
  altText?: string;
  maxSizeBytes?: number;
  optimization?: BlogMediaOptimizationOptions;
}

@Injectable({providedIn: 'root'})
export class MediaLibraryService {
  private readonly firestore = inject(FirestoreService);
  private readonly blogMediaUpload = inject(BlogMediaUploadService);
  private readonly blogRepository = inject(BlogRepositoryService);

  listenToMediaItems(): Observable<readonly MediaLibraryItem[]> {
    return combineLatest([
      this.firestore.listenToCollection<MediaLibraryDocument>(MEDIA_COLLECTION, [], 'uploadedAt', 'desc'),
      this.blogRepository.getAdminPosts$(),
    ]).pipe(
      map(([documents, posts]) => this.mergeMediaSources(
        documents.map(document => this.toMediaItem(document)),
        this.getBlogAttachmentItems(posts)
      ))
    );
  }

  listenToFolders(): Observable<readonly MediaLibraryFolder[]> {
    return this.firestore.listenToCollection<MediaFolderDocument>(FOLDER_COLLECTION, [], 'path', 'asc').pipe(
      map(documents => documents.map(document => this.toFolder(document)))
    );
  }

  uploadFiles(
    files: readonly File[],
    folder: MediaLibraryFolder | null,
    options: MediaLibraryUploadOptions = {}
  ): Observable<MediaUploadEvent> {
    if (files.length === 0) {
      return of({fileName: '', progress: 0, status: 'complete'});
    }

    return merge(...files.map(file => this.uploadFile(file, folder, options)));
  }

  updateMediaMetadata(mediaId: string, patch: MediaMetadataPatch): Observable<void> {
    if (this.isDerivedBlogMediaId(mediaId)) {
      return this.promoteDerivedBlogItem(mediaId, patch).pipe(map(() => void 0));
    }

    return this.firestore.updateDocument(MEDIA_COLLECTION, mediaId, this.toFirestorePatch(patch));
  }

  renameMedia(mediaId: string, displayName: string): Observable<void> {
    const trimmedName = displayName.trim();

    if (!isValidDisplayName(trimmedName)) {
      return this.createErrorObservable('Use a non-empty name without \\ / : * ? " < > | characters.');
    }

    return this.updateMediaMetadata(mediaId, {displayName: trimmedName});
  }

  batchRenameMedia(rows: readonly RenamePreviewRow[]): Observable<void> {
    const validRows = rows.filter(row => row.status === 'OK');

    if (validRows.length === 0) {
      return this.createErrorObservable('No valid rename operations were provided.');
    }

    const storedRows = validRows.filter(row => !this.isDerivedBlogMediaId(row.itemId));
    const derivedRows = validRows.filter(row => this.isDerivedBlogMediaId(row.itemId));
    const operations: Observable<void>[] = [];

    if (storedRows.length > 0) {
      operations.push(this.firestore.executeBatch(storedRows.map(row => ({
        type: 'update' as const,
        collection: MEDIA_COLLECTION,
        id: row.itemId,
        data: {displayName: row.newName},
      }))));
    }

    operations.push(...derivedRows.map(row => this.promoteDerivedBlogItem(row.itemId, {displayName: row.newName}).pipe(
      map(() => void 0)
    )));

    return operations.length > 1 ? forkJoin(operations).pipe(map(() => void 0)) : operations[0] ?? of(void 0);
  }

  updateMediaTags(items: readonly MediaLibraryItem[], tags: readonly string[], mode: 'replace' | 'add' | 'remove'): Observable<void> {
    const normalizedTags = this.normalizeTags(tags);

    const storedItems = items.filter(item => !this.isDerivedBlogMediaId(item.id));
    const derivedItems = items.filter(item => this.isDerivedBlogMediaId(item.id));
    const operations: Observable<void>[] = [];

    if (storedItems.length > 0) {
      operations.push(this.firestore.executeBatch(storedItems.map(item => {
        const nextTags = this.getNextTags(item.tags, normalizedTags, mode);

        return {
          type: 'update' as const,
          collection: MEDIA_COLLECTION,
          id: item.id,
          data: {tags: nextTags},
        };
      })));
    }

    operations.push(...derivedItems.map(item => {
      const nextTags = this.getNextTags(item.tags, normalizedTags, mode);

      return this.promoteDerivedBlogItem(item.id, {tags: nextTags}).pipe(map(() => void 0));
    }));

    return operations.length > 1 ? forkJoin(operations).pipe(map(() => void 0)) : operations[0] ?? of(void 0);
  }

  setFavorite(mediaIds: readonly string[], favorite: boolean): Observable<void> {
    return this.batchPatch(mediaIds, {favorite});
  }

  moveMedia(mediaIds: readonly string[], folder: MediaLibraryFolder | null): Observable<void> {
    return this.batchPatch(mediaIds, {
      folderId: folder?.id ?? null,
      folderPath: folder?.path ?? '',
    });
  }

  archiveMedia(mediaIds: readonly string[]): Observable<void> {
    return this.batchPatch(mediaIds, {status: 'archived'});
  }

  deleteMedia(mediaIds: readonly string[]): Observable<void> {
    return this.batchPatch(mediaIds, {status: 'deleted'});
  }

  restoreMedia(mediaIds: readonly string[]): Observable<void> {
    return this.batchPatch(mediaIds, {status: 'ready'});
  }

  createFolder(name: string, parentFolder: MediaLibraryFolder | null): Observable<string> {
    const safeName = name.trim();

    if (!isValidDisplayName(safeName)) {
      return this.createErrorObservable('Use a non-empty folder name without \\ / : * ? " < > | characters.');
    }

    const id = this.createId('folder');
    const folderPath = parentFolder ? `${parentFolder.path}/${safeName}` : safeName;
    const document: MediaFolderDocument = {
      id,
      name: safeName,
      parentId: parentFolder?.id ?? null,
      path: folderPath,
      color: null,
      itemCount: 0,
      archived: false,
    };

    return this.firestore.saveDocument(FOLDER_COLLECTION, document, id);
  }

  renameFolder(folder: MediaLibraryFolder, nextName: string): Observable<void> {
    const safeName = nextName.trim();

    if (!isValidDisplayName(safeName)) {
      return this.createErrorObservable('Use a non-empty folder name without \\ / : * ? " < > | characters.');
    }

    const parentPath = folder.path.includes('/') ? folder.path.split('/').slice(0, -1).join('/') : '';
    const nextPath = parentPath ? `${parentPath}/${safeName}` : safeName;

    // Folder paths are denormalized on media items for fast UI filtering. A future service
    // method should cascade child-folder and media path updates when nested folders are renamed.
    return this.firestore.updateDocument(FOLDER_COLLECTION, folder.id, {
      name: safeName,
      path: nextPath,
    });
  }

  archiveFolder(folderId: string): Observable<void> {
    return this.firestore.updateDocument(FOLDER_COLLECTION, folderId, {archived: true});
  }

  copyMediaUrl(item: MediaLibraryItem): Promise<void> {
    const url = item.originalUrl ?? item.downloadUrl ?? item.previewUrl ?? item.thumbnailUrl ?? '';

    if (!url) {
      return Promise.reject(new Error('No media URL is available.'));
    }

    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(url);
    }

    return Promise.reject(new Error('Clipboard access is not available in this browser.'));
  }

  private uploadFile(
    file: File,
    folder: MediaLibraryFolder | null,
    options: MediaLibraryUploadOptions
  ): Observable<MediaUploadEvent> {
    return file.type.startsWith('image/')
      ? this.uploadImageFile(file, folder, options)
      : this.uploadGenericFile(file, folder);
  }

  private uploadImageFile(
    file: File,
    folder: MediaLibraryFolder | null,
    options: MediaLibraryUploadOptions
  ): Observable<MediaUploadEvent> {
    return this.blogMediaUpload.uploadImage(file, {
      slug: options.slug ?? DEFAULT_LIBRARY_SLUG,
      role: options.role ?? (folder ? createSafePathSegment(folder.path) : 'library'),
      altText: options.altText,
      maxSizeBytes: options.maxSizeBytes,
      optimization: {
        enabled: true,
        maxWidth: 2400,
        maxHeight: 2400,
        quality: 0.86,
        outputType: 'image/webp',
        ...options.optimization,
      },
    }).pipe(
      concatMap(progress => this.handleImageUploadProgress(file, folder, progress)),
      catchError(error => of(this.createFailedUploadEvent(file.name, error)))
    );
  }

  private uploadGenericFile(file: File, folder: MediaLibraryFolder | null): Observable<MediaUploadEvent> {
    const storagePath = this.createStoragePath(file, folder);
    const metadata = {
      contentType: file.type || 'application/octet-stream',
      customMetadata: {
        originalName: file.name,
        role: 'media-library',
        folderId: folder?.id ?? '',
        folderPath: folder?.path ?? '',
      },
    };

    return this.firestore.uploadFileWithProgress(storagePath, file, metadata).pipe(
      concatMap(progress => {
        const uploadEvent: MediaUploadEvent = {
          fileName: file.name,
          progress: progress.progress,
          status: 'uploading',
        };

        if (!progress.downloadUrl) {
          return of(uploadEvent);
        }

        return this.createUploadedMediaItem(file, folder, {
          downloadUrl: progress.downloadUrl,
          storagePath,
          originalName: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
        }).pipe(
          map(item => ({fileName: file.name, progress: 100, status: 'complete' as const, item})),
          startWith(uploadEvent)
        );
      }),
      catchError(error => of(this.createFailedUploadEvent(file.name, error)))
    );
  }

  private handleImageUploadProgress(
    file: File,
    folder: MediaLibraryFolder | null,
    progress: BlogMediaUploadProgress
  ): Observable<MediaUploadEvent> {
    const uploadEvent: MediaUploadEvent = {
      fileName: progress.originalName || file.name,
      progress: progress.progress,
      status: 'uploading',
    };

    if (!progress.downloadUrl) {
      return of(uploadEvent);
    }

    const result: BlogMediaUploadResult = {
      downloadUrl: progress.downloadUrl,
      storagePath: progress.storagePath,
      originalName: progress.originalName,
      contentType: progress.contentType,
      size: progress.size,
      originalSize: progress.originalSize,
      optimized: progress.optimized,
      optimizationSavings: progress.optimizationSavings,
      optimizationSavingsPercent: progress.optimizationSavingsPercent,
      width: progress.width,
      height: progress.height,
      mediaId: progress.mediaId,
      checksum: progress.checksum,
      variants: progress.variants,
    };

    return this.createUploadedMediaItem(file, folder, {
      downloadUrl: result.downloadUrl,
      storagePath: result.storagePath,
      originalName: result.originalName,
      contentType: result.contentType,
      size: result.size,
      originalSize: result.originalSize,
      optimized: result.optimized,
      width: result.width,
      height: result.height,
      mediaId: result.mediaId,
    }).pipe(
      map(item => ({fileName: result.originalName, progress: 100, status: 'complete' as const, item})),
      startWith(uploadEvent)
    );
  }

  private createUploadedMediaItem(
    file: File,
    folder: MediaLibraryFolder | null,
    metadata: UploadedFileMetadata
  ): Observable<MediaLibraryItem> {
    const now = new Date().toISOString();
    const fileName = metadata.originalName || file.name;
    const extension = getFileExtension(fileName);
    const mediaType = inferMediaType(metadata.contentType, fileName);
    const width = metadata.width;
    const height = metadata.height;
    const id = metadata.mediaId ?? this.createId('media');
    const item: MediaLibraryItem = {
      id,
      displayName: fileName,
      originalFileName: file.name,
      fileName,
      extension,
      mediaType,
      mimeType: metadata.contentType,
      storagePath: metadata.storagePath,
      thumbnailUrl: mediaType === 'image' ? metadata.downloadUrl : undefined,
      previewUrl: metadata.downloadUrl,
      originalUrl: metadata.downloadUrl,
      downloadUrl: metadata.downloadUrl,
      width,
      height,
      aspectRatio: width && height ? width / height : undefined,
      durationMs: undefined,
      sizeBytes: metadata.size,
      folderId: folder?.id ?? null,
      folderPath: folder?.path ?? '',
      tags: [],
      favorite: false,
      rating: null,
      colorLabel: null,
      notes: null,
      altText: null,
      description: null,
      status: 'ready',
      processingError: null,
      createdAt: now,
      updatedAt: now,
      uploadedAt: now,
    };

    return this.firestore.saveDocument(MEDIA_COLLECTION, this.toFirestoreDocument(item), id).pipe(
      map(() => item)
    );
  }

  private batchPatch(mediaIds: readonly string[], patch: MediaMetadataPatch): Observable<void> {
    const editableMediaIds = mediaIds.filter(mediaId => !this.isDerivedBlogMediaId(mediaId));
    const derivedMediaIds = mediaIds.filter(mediaId => this.isDerivedBlogMediaId(mediaId));
    const operations: Observable<void>[] = [];

    if (editableMediaIds.length > 0) {
      operations.push(this.firestore.executeBatch(editableMediaIds.map(id => ({
        type: 'update' as const,
        collection: MEDIA_COLLECTION,
        id,
        data: this.toFirestorePatch(patch),
      }))));
    }

    operations.push(...derivedMediaIds.map(id => this.promoteDerivedBlogItem(id, patch).pipe(map(() => void 0))));

    return operations.length > 1 ? forkJoin(operations).pipe(map(() => void 0)) : operations[0] ?? of(void 0);
  }

  private promoteDerivedBlogItem(mediaId: string, patch: MediaMetadataPatch): Observable<string> {
    const item = this.getBlogAttachmentItems(this.blogRepository.getAdminPosts()).find(attachmentItem => attachmentItem.id === mediaId);

    if (!item) {
      return this.createErrorObservable('Unable to find the blog attachment metadata to update.');
    }

    return this.firestore.saveDocument(
      MEDIA_COLLECTION,
      this.toFirestoreDocument({
        ...item,
        ...patch,
        tags: patch.tags ?? item.tags,
        folderId: patch.folderId !== undefined ? patch.folderId : item.folderId,
        folderPath: patch.folderPath !== undefined ? patch.folderPath : item.folderPath,
        favorite: patch.favorite ?? item.favorite,
        rating: patch.rating !== undefined ? patch.rating : item.rating,
        colorLabel: patch.colorLabel !== undefined ? patch.colorLabel : item.colorLabel,
        notes: patch.notes !== undefined ? patch.notes : item.notes,
        altText: patch.altText !== undefined ? patch.altText : item.altText,
        description: patch.description !== undefined ? patch.description : item.description,
        status: patch.status ?? item.status,
        processingError: patch.processingError !== undefined ? patch.processingError : item.processingError,
        updatedAt: new Date().toISOString(),
      }),
      mediaId
    );
  }

  private getBlogAttachmentItems(posts: readonly BlogPost[]): readonly MediaLibraryItem[] {
    const attachmentMap = new Map<string, MediaLibraryItem>();

    for (const post of posts) {
      for (const attachment of this.getPostAttachmentCandidates(post)) {
        const key = this.getMediaIdentityKey(attachment.url, undefined);
        const existingItem = attachmentMap.get(key);
        const attachmentItem = this.createBlogAttachmentItem(post, attachment);

        attachmentMap.set(key, existingItem ? this.mergeMediaItemMetadata(existingItem, attachmentItem) : attachmentItem);
      }
    }

    return [...attachmentMap.values()];
  }

  private getPostAttachmentCandidates(post: BlogPost): readonly {
    role: string;
    url: string;
    caption?: string;
    altText?: string
  }[] {
    const attachments: { role: string; url: string; caption?: string; altText?: string }[] = [];

    if (post.coverImage) {
      attachments.push({
        role: 'cover',
        url: post.coverImage,
        altText: `${post.title} cover image`,
      });
    }

    if (post.backgroundImage) {
      attachments.push({
        role: 'post-background',
        url: post.backgroundImage,
        altText: `${post.title} background image`,
      });
    }

    if (post.seo.openGraphImage && post.seo.openGraphImage !== post.coverImage) {
      attachments.push({
        role: 'open-graph',
        url: post.seo.openGraphImage,
        altText: `${post.title} social image`,
      });
    }

    for (const block of post.blocks) {
      if (block.type === 'image' && block.data.url) {
        attachments.push({
          role: 'inline-image',
          url: block.data.url,
          caption: block.data.caption,
          altText: block.data.alt,
        });
      }

      if (block.type === 'gallery') {
        for (const image of block.data.galleryImages ?? []) {
          attachments.push({
            role: 'gallery-image',
            url: image.url,
            caption: image.caption,
            altText: image.alt,
          });
        }
      }
    }

    return attachments.filter(attachment => attachment.url.trim().length > 0);
  }

  private createBlogAttachmentItem(
    post: BlogPost,
    attachment: { role: string; url: string; caption?: string; altText?: string }
  ): MediaLibraryItem {
    const url = attachment.url.trim();
    const fileName = this.getFileNameFromUrl(url) || `${post.slug}-${attachment.role}`;
    const extension = getFileExtension(fileName);
    const normalizedPostTags = this.normalizeTags(post.tags);
    const normalizedCategories = this.normalizeTags(post.categories);
    const tags = this.normalizeTags([
      'blog',
      'cms',
      attachment.role,
      post.status,
      ...normalizedPostTags,
      ...normalizedCategories,
    ]);
    const roleLabel = attachment.role.replace(/-/g, ' ');

    return {
      id: `blog-attachment-${this.hashString(url)}`,
      displayName: fileName,
      originalFileName: fileName,
      fileName,
      extension,
      mediaType: inferMediaType(undefined, fileName) === 'other' ? 'image' : inferMediaType(undefined, fileName),
      mimeType: extension ? `image/${extension === 'jpg' ? 'jpeg' : extension}` : undefined,
      storagePath: this.getFirebaseStoragePathFromUrl(url),
      thumbnailUrl: url,
      previewUrl: url,
      originalUrl: url,
      downloadUrl: url,
      folderId: null,
      folderPath: `Blog / ${post.title}`,
      tags,
      favorite: false,
      rating: null,
      colorLabel: null,
      notes: `Attached to blog post "${post.title}" as ${roleLabel}.`,
      altText: attachment.altText ?? null,
      description: attachment.caption ?? post.excerpt,
      status: 'ready',
      processingError: null,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      uploadedAt: post.createdAt,
    };
  }

  private mergeMediaSources(
    storedItems: readonly MediaLibraryItem[],
    blogAttachmentItems: readonly MediaLibraryItem[]
  ): readonly MediaLibraryItem[] {
    const mergedItems = new Map<string, MediaLibraryItem>();

    for (const item of storedItems) {
      mergedItems.set(this.getMediaIdentityKey(item.originalUrl ?? item.downloadUrl ?? item.previewUrl, item.storagePath), item);
    }

    for (const attachmentItem of blogAttachmentItems) {
      const key = this.getMediaIdentityKey(attachmentItem.originalUrl ?? attachmentItem.downloadUrl ?? attachmentItem.previewUrl, attachmentItem.storagePath);
      const existingItem = mergedItems.get(key);

      mergedItems.set(key, existingItem ? this.mergeMediaItemMetadata(existingItem, attachmentItem) : attachmentItem);
    }

    return [...mergedItems.values()];
  }

  private mergeMediaItemMetadata(primary: MediaLibraryItem, attachment: MediaLibraryItem): MediaLibraryItem {
    const tags = this.normalizeTags([...primary.tags, ...attachment.tags]);
    const notes = [primary.notes, attachment.notes]
      .filter((note): note is string => Boolean(note))
      .filter((note, index, notesList) => notesList.indexOf(note) === index)
      .join('\n');

    return {
      ...primary,
      tags,
      folderPath: primary.folderPath || attachment.folderPath,
      notes: notes || null,
      altText: primary.altText ?? attachment.altText,
      description: primary.description ?? attachment.description,
      updatedAt: primary.updatedAt ?? attachment.updatedAt,
      uploadedAt: primary.uploadedAt ?? attachment.uploadedAt,
      thumbnailUrl: primary.thumbnailUrl ?? attachment.thumbnailUrl,
      previewUrl: primary.previewUrl ?? attachment.previewUrl,
      originalUrl: primary.originalUrl ?? attachment.originalUrl,
      downloadUrl: primary.downloadUrl ?? attachment.downloadUrl,
      storagePath: primary.storagePath ?? attachment.storagePath,
    };
  }

  private toMediaItem(document: MediaLibraryDocument): MediaLibraryItem {
    const fileName = this.getString(document, 'fileName') ?? this.getString(document, 'originalFileName') ?? 'Untitled media';
    const displayName = this.getString(document, 'displayName') ?? fileName;
    const extension = this.getString(document, 'extension') ?? getFileExtension(displayName);
    const mimeType = this.getString(document, 'mimeType');
    const width = this.getNumber(document, 'width');
    const height = this.getNumber(document, 'height');
    const mediaType = this.getMediaType(document, mimeType, fileName);
    const status = this.getStatus(document);

    return {
      id: document.id ?? this.createId('media'),
      displayName,
      originalFileName: this.getString(document, 'originalFileName'),
      fileName,
      extension,
      mediaType,
      mimeType,
      storagePath: this.getString(document, 'storagePath'),
      thumbnailUrl: this.getString(document, 'thumbnailUrl') ?? this.getString(document, 'previewUrl'),
      previewUrl: this.getString(document, 'previewUrl') ?? this.getString(document, 'downloadUrl'),
      originalUrl: this.getString(document, 'originalUrl') ?? this.getString(document, 'downloadUrl'),
      downloadUrl: this.getString(document, 'downloadUrl'),
      width,
      height,
      aspectRatio: this.getNumber(document, 'aspectRatio') ?? (width && height ? width / height : undefined),
      durationMs: this.getNumber(document, 'durationMs'),
      sizeBytes: this.getNumber(document, 'sizeBytes'),
      folderId: this.getNullableString(document, 'folderId'),
      folderPath: this.getString(document, 'folderPath') ?? '',
      tags: this.getStringArray(document, 'tags'),
      favorite: this.getBoolean(document, 'favorite'),
      rating: this.getNullableNumber(document, 'rating'),
      colorLabel: this.getNullableString(document, 'colorLabel'),
      notes: this.getNullableString(document, 'notes'),
      altText: this.getNullableString(document, 'altText'),
      description: this.getNullableString(document, 'description'),
      status,
      processingError: this.getNullableString(document, 'processingError'),
      createdAt: coerceDateString(document.createdAt),
      updatedAt: coerceDateString(document.updatedAt),
      uploadedAt: coerceDateString(document.uploadedAt) ?? coerceDateString(document.createdAt),
    };
  }

  private toFolder(document: MediaFolderDocument): MediaLibraryFolder {
    const name = this.getString(document, 'name') ?? 'Untitled folder';

    return {
      id: document.id ?? this.createId('folder'),
      name,
      parentId: this.getNullableString(document, 'parentId'),
      path: this.getString(document, 'path') ?? name,
      color: this.getNullableString(document, 'color'),
      itemCount: this.getNumber(document, 'itemCount'),
      archived: this.getBoolean(document, 'archived'),
      createdAt: coerceDateString(document.createdAt),
      updatedAt: coerceDateString(document.updatedAt),
    };
  }

  private toFirestoreDocument(item: MediaLibraryItem): MediaLibraryDocument {
    return this.removeUndefined({
      id: item.id,
      displayName: item.displayName,
      originalFileName: item.originalFileName,
      fileName: item.fileName,
      extension: item.extension,
      mediaType: item.mediaType,
      mimeType: item.mimeType,
      storagePath: item.storagePath,
      thumbnailUrl: item.thumbnailUrl,
      previewUrl: item.previewUrl,
      originalUrl: item.originalUrl,
      downloadUrl: item.downloadUrl,
      width: item.width,
      height: item.height,
      aspectRatio: item.aspectRatio,
      durationMs: item.durationMs,
      sizeBytes: item.sizeBytes,
      folderId: item.folderId ?? null,
      folderPath: item.folderPath ?? '',
      tags: [...item.tags],
      favorite: item.favorite,
      rating: item.rating ?? null,
      colorLabel: item.colorLabel ?? null,
      notes: item.notes ?? null,
      altText: item.altText ?? null,
      description: item.description ?? null,
      status: item.status,
      processingError: item.processingError ?? null,
      uploadedAt: item.uploadedAt,
    });
  }

  private toFirestorePatch(patch: MediaMetadataPatch): Partial<FirestoreDocument> {
    return this.removeUndefined({
      displayName: patch.displayName,
      folderId: patch.folderId,
      folderPath: patch.folderPath,
      tags: patch.tags ? [...patch.tags] : undefined,
      favorite: patch.favorite,
      rating: patch.rating,
      colorLabel: patch.colorLabel,
      notes: patch.notes,
      altText: patch.altText,
      description: patch.description,
      status: patch.status,
      processingError: patch.processingError,
    });
  }

  private removeUndefined<T extends FirestoreDocument | Partial<FirestoreDocument>>(record: T): T {
    const nextRecord: Partial<FirestoreDocument> = {};

    for (const [key, value] of Object.entries(record)) {
      if (value !== undefined) {
        nextRecord[key] = value;
      }
    }

    return nextRecord as T;
  }

  private getNextTags(currentTags: readonly string[], tags: readonly string[], mode: 'replace' | 'add' | 'remove'): readonly string[] {
    if (mode === 'replace') {
      return tags;
    }

    const current = new Set(this.normalizeTags(currentTags));

    if (mode === 'add') {
      for (const tag of tags) {
        current.add(tag);
      }
    } else {
      for (const tag of tags) {
        current.delete(tag);
      }
    }

    return [...current].sort();
  }

  private normalizeTags(tags: readonly string[]): readonly string[] {
    return [...new Set(tags.map(tag => normalizeText(tag).replace(/\s+/g, '-')).filter(Boolean))].sort();
  }

  private createStoragePath(file: File, folder: MediaLibraryFolder | null): string {
    const datePath = new Date().toISOString().slice(0, 7);
    const folderPath = folder ? createSafePathSegment(folder.path) : 'library';
    const extension = getFileExtension(file.name);
    const baseName = createSafePathSegment(stripFileExtension(file.name));
    const suffix = extension ? `.${extension}` : '';

    return `media-library/${folderPath}/${datePath}/${Date.now()}-${this.createId('file')}-${baseName}${suffix}`;
  }

  private createFailedUploadEvent(fileName: string, error: unknown): MediaUploadEvent {
    return {
      fileName,
      progress: 0,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Upload failed.',
    };
  }

  private getString(document: FirestoreDocument, key: string): string | undefined {
    const value = document[key];

    return typeof value === 'string' ? value : undefined;
  }

  private getNullableString(document: FirestoreDocument, key: string): string | null {
    const value = document[key];

    if (typeof value === 'string') {
      return value || null;
    }

    return null;
  }

  private getNumber(document: FirestoreDocument, key: string): number | undefined {
    const value = document[key];

    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  private getNullableNumber(document: FirestoreDocument, key: string): number | null {
    const value = this.getNumber(document, key);

    return value ?? null;
  }

  private getBoolean(document: FirestoreDocument, key: string): boolean {
    return document[key] === true;
  }

  private getStringArray(document: FirestoreDocument, key: string): readonly string[] {
    const value = document[key];

    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((entry): entry is string => typeof entry === 'string').sort();
  }

  private getMediaType(document: FirestoreDocument, mimeType: string | undefined, fileName: string): MediaLibraryItem['mediaType'] {
    const value = document['mediaType'];

    if (value === 'image' || value === 'video' || value === 'audio' || value === 'document' || value === 'archive' || value === 'other') {
      return value;
    }

    return inferMediaType(mimeType, fileName);
  }

  private getStatus(document: FirestoreDocument): MediaStatus {
    const value = document['status'];

    if (value === 'uploading' || value === 'processing' || value === 'ready' || value === 'failed' || value === 'archived' || value === 'deleted') {
      return value;
    }

    return 'ready';
  }

  private getMediaIdentityKey(url?: string, storagePath?: string): string {
    if (storagePath) {
      return `storage:${storagePath.trim().toLowerCase()}`;
    }

    const firebaseStoragePath = this.getFirebaseStoragePathFromUrl(url ?? '');

    if (firebaseStoragePath) {
      return `storage:${firebaseStoragePath.toLowerCase()}`;
    }

    return `url:${(url ?? '').trim().toLowerCase()}`;
  }

  private getFileNameFromUrl(url: string): string {
    const storagePath = this.getFirebaseStoragePathFromUrl(url);
    const path = storagePath || this.getUrlPath(url);
    const fileName = path.split('/').filter(Boolean).pop() ?? '';

    return decodeURIComponent(fileName.split('?')[0] ?? '').trim();
  }

  private getFirebaseStoragePathFromUrl(url: string): string | undefined {
    const marker = '/o/';
    const markerIndex = url.indexOf(marker);

    if (markerIndex < 0) {
      return undefined;
    }

    const encodedPath = url.slice(markerIndex + marker.length).split('?')[0] ?? '';

    try {
      return decodeURIComponent(encodedPath);
    } catch {
      return encodedPath;
    }
  }

  private getUrlPath(url: string): string {
    try {
      return new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').pathname;
    } catch {
      return url.split('?')[0] ?? url;
    }
  }

  private hashString(value: string): string {
    let hash = 5381;

    for (let index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
    }

    return (hash >>> 0).toString(36);
  }

  private isDerivedBlogMediaId(mediaId: string): boolean {
    return mediaId.startsWith('blog-attachment-');
  }

  private createId(prefix: string): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private createErrorObservable<T>(message: string): Observable<T> {
    return from(Promise.reject(new Error(message)));
  }
}
