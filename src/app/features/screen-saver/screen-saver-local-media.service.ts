import {DOCUMENT} from '@angular/common';
import {DestroyRef, Injectable, inject, signal} from '@angular/core';

import {
  ScreenSaverActiveLocalImage,
  ScreenSaverLocalImage,
  getScreenSaverActiveWindowIndexes,
} from './screen-saver.model';

export const SCREEN_SAVER_LOCAL_MEDIA_DATABASE = 'colinmichaels-screen-saver-v1';
const SCREEN_SAVER_LOCAL_MEDIA_STORE = 'images';
const SCREEN_SAVER_LOCAL_MEDIA_DATABASE_VERSION = 1;
const MAX_LOCAL_IMAGE_COUNT = 40;
const MAX_LOCAL_IMAGE_BYTES = 25 * 1024 * 1024;

interface ScreenSaverLocalImageRecord {
  id: string;
  name: string;
  addedAt: string;
  size: number;
  blob: Blob;
}

@Injectable({providedIn: 'root'})
export class ScreenSaverLocalMediaService {
  private readonly browserWindow = inject(DOCUMENT).defaultView;
  private readonly indexedDb = this.browserWindow?.indexedDB;
  private readonly destroyRef = inject(DestroyRef);
  private readonly imagesState = signal<readonly ScreenSaverLocalImage[]>([]);
  private readonly activeImagesState = signal<readonly ScreenSaverActiveLocalImage[]>([]);
  private readonly readyState = signal(false);
  private readonly busyState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private databasePromise: Promise<IDBDatabase> | undefined;
  private readonly objectUrlsById = new Map<string, string>();
  private activeWindowGeneration = 0;
  private readonly initialization: Promise<void>;

  readonly supported = signal(Boolean(this.indexedDb)).asReadonly();
  readonly images = this.imagesState.asReadonly();
  readonly activeImages = this.activeImagesState.asReadonly();
  readonly ready = this.readyState.asReadonly();
  readonly busy = this.busyState.asReadonly();
  readonly error = this.errorState.asReadonly();

  constructor() {
    this.initialization = this.refresh();
    this.destroyRef.onDestroy(() => this.releaseActiveImages());
  }

  whenReady(): Promise<void> {
    return this.initialization;
  }

  async addFiles(files: readonly File[]): Promise<number> {
    await this.initialization;

    if (!this.indexedDb) {
      this.errorState.set('Local image storage is not supported in this browser.');
      return 0;
    }

    const imageFiles = files.filter(file => file.type.startsWith('image/') && file.size <= MAX_LOCAL_IMAGE_BYTES);
    const availableSlots = Math.max(0, MAX_LOCAL_IMAGE_COUNT - this.imagesState().length);
    const acceptedFiles = imageFiles.slice(0, availableSlots);

    if (acceptedFiles.length === 0) {
      this.errorState.set(availableSlots === 0
        ? `My Images can store up to ${MAX_LOCAL_IMAGE_COUNT} files.`
        : 'Choose image files smaller than 25 MB each.');
      return 0;
    }

    this.busyState.set(true);
    this.errorState.set(null);

    try {
      const database = await this.openDatabase();
      const transaction = database.transaction(SCREEN_SAVER_LOCAL_MEDIA_STORE, 'readwrite');
      const store = transaction.objectStore(SCREEN_SAVER_LOCAL_MEDIA_STORE);
      const addedAt = new Date().toISOString();

      acceptedFiles.forEach(file => {
        store.put({
          id: this.createId(),
          name: file.name,
          addedAt,
          size: file.size,
          blob: file,
        } satisfies ScreenSaverLocalImageRecord);
      });

      await waitForTransaction(transaction);
      await this.refresh();

      if (acceptedFiles.length < files.length) {
        this.errorState.set('Some files were skipped because they were not supported, too large, or exceeded the limit.');
      }

      return acceptedFiles.length;
    } catch {
      this.errorState.set('Your images could not be saved locally.');
      return 0;
    } finally {
      this.busyState.set(false);
    }
  }

  async clearAll(): Promise<void> {
    await this.initialization;

    if (!this.indexedDb) {
      this.releaseActiveImages();
      this.imagesState.set([]);
      return;
    }

    const database = await this.openDatabase();
    const transaction = database.transaction(SCREEN_SAVER_LOCAL_MEDIA_STORE, 'readwrite');
    transaction.objectStore(SCREEN_SAVER_LOCAL_MEDIA_STORE).clear();
    await waitForTransaction(transaction);
    this.releaseActiveImages();
    await this.refresh();
  }

  async setActiveWindow(activeIndex: number): Promise<void> {
    await this.initialization;

    if (!this.indexedDb || !this.browserWindow || this.imagesState().length === 0) {
      this.releaseActiveImages();
      return;
    }

    const images = this.imagesState();
    const desiredImages = getScreenSaverActiveWindowIndexes(activeIndex, images.length)
      .map(sourceIndex => ({metadata: images[sourceIndex], sourceIndex}));
    const desiredIds = new Set(desiredImages.map(image => image.metadata.id));
    const generation = ++this.activeWindowGeneration;

    for (const id of this.objectUrlsById.keys()) {
      if (!desiredIds.has(id)) {
        this.releaseObjectUrl(id);
      }
    }
    this.publishActiveImages(desiredImages);

    try {
      const missingImages = desiredImages.filter(image => !this.objectUrlsById.has(image.metadata.id));
      const records = await Promise.all(missingImages.map(image => this.readRecord(image.metadata.id)));

      if (generation !== this.activeWindowGeneration) {
        return;
      }

      records.forEach(record => {
        if (!record || this.objectUrlsById.has(record.id)) {
          return;
        }

        this.objectUrlsById.set(record.id, this.browserWindow!.URL.createObjectURL(record.blob));
      });
      this.publishActiveImages(desiredImages);
      this.errorState.set(null);
    } catch {
      if (generation === this.activeWindowGeneration) {
        this.errorState.set('Your saved screen saver images are unavailable.');
      }
    }
  }

  releaseActiveImages(): void {
    this.activeWindowGeneration += 1;

    for (const id of [...this.objectUrlsById.keys()]) {
      this.releaseObjectUrl(id);
    }
    this.activeImagesState.set([]);
  }

  private async refresh(): Promise<void> {
    if (!this.indexedDb || !this.browserWindow) {
      this.readyState.set(true);
      return;
    }

    try {
      const database = await this.openDatabase();
      const transaction = database.transaction(SCREEN_SAVER_LOCAL_MEDIA_STORE, 'readonly');
      const images = await readAllMetadata(transaction.objectStore(SCREEN_SAVER_LOCAL_MEDIA_STORE));
      await waitForTransaction(transaction);

      this.imagesState.set(images.sort((left, right) => (
        left.addedAt.localeCompare(right.addedAt) || left.name.localeCompare(right.name)
      )));
      this.errorState.set(null);
    } catch {
      this.releaseActiveImages();
      this.imagesState.set([]);
      this.errorState.set('Your saved screen saver images are unavailable.');
    } finally {
      this.readyState.set(true);
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (!this.indexedDb) {
      return Promise.reject(new Error('IndexedDB is unavailable.'));
    }

    this.databasePromise ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.indexedDb!.open(
        SCREEN_SAVER_LOCAL_MEDIA_DATABASE,
        SCREEN_SAVER_LOCAL_MEDIA_DATABASE_VERSION
      );

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(SCREEN_SAVER_LOCAL_MEDIA_STORE)) {
          database.createObjectStore(SCREEN_SAVER_LOCAL_MEDIA_STORE, {keyPath: 'id'});
        }
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () => reject(request.error ?? new Error('Unable to open the local image database.'));
    });

    return this.databasePromise;
  }

  private createId(): string {
    return this.browserWindow?.crypto.randomUUID?.()
      ?? `screen-saver-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private async readRecord(id: string): Promise<ScreenSaverLocalImageRecord | undefined> {
    const database = await this.openDatabase();
    const transaction = database.transaction(SCREEN_SAVER_LOCAL_MEDIA_STORE, 'readonly');
    const record = await readRecord(transaction.objectStore(SCREEN_SAVER_LOCAL_MEDIA_STORE), id);
    await waitForTransaction(transaction);
    return record;
  }

  private publishActiveImages(
    desiredImages: readonly { metadata: ScreenSaverLocalImage; sourceIndex: number }[]
  ): void {
    this.activeImagesState.set(desiredImages.flatMap(({metadata, sourceIndex}) => {
      const imageUrl = this.objectUrlsById.get(metadata.id);
      return imageUrl ? [{...metadata, imageUrl, sourceIndex}] : [];
    }));
  }

  private releaseObjectUrl(id: string): void {
    const imageUrl = this.objectUrlsById.get(id);

    if (!imageUrl) {
      return;
    }

    this.browserWindow?.URL.revokeObjectURL(imageUrl);
    this.objectUrlsById.delete(id);
  }
}

function readAllMetadata(store: IDBObjectStore): Promise<ScreenSaverLocalImage[]> {
  return new Promise((resolve, reject) => {
    const images: ScreenSaverLocalImage[] = [];
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor) {
        resolve(images);
        return;
      }

      const {id, name, addedAt, size} = cursor.value as ScreenSaverLocalImageRecord;
      images.push({id, name, addedAt, size});
      cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error('Unable to read local images.'));
  });
}

function readRecord(
  store: IDBObjectStore,
  id: string
): Promise<ScreenSaverLocalImageRecord | undefined> {
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as ScreenSaverLocalImageRecord | undefined);
    request.onerror = () => reject(request.error ?? new Error('Unable to read a local image.'));
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Local image transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Local image transaction was aborted.'));
  });
}
