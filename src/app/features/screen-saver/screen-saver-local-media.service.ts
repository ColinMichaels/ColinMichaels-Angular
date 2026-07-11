import {DOCUMENT} from '@angular/common';
import {DestroyRef, Injectable, inject, signal} from '@angular/core';

import {ScreenSaverLocalImage} from './screen-saver.model';

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
  private readonly readyState = signal(false);
  private readonly busyState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private databasePromise: Promise<IDBDatabase> | undefined;
  private objectUrls: string[] = [];
  private readonly initialization: Promise<void>;

  readonly supported = signal(Boolean(this.indexedDb)).asReadonly();
  readonly images = this.imagesState.asReadonly();
  readonly ready = this.readyState.asReadonly();
  readonly busy = this.busyState.asReadonly();
  readonly error = this.errorState.asReadonly();

  constructor() {
    this.initialization = this.refresh();
    this.destroyRef.onDestroy(() => this.releaseObjectUrls());
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
      return;
    }

    const database = await this.openDatabase();
    const transaction = database.transaction(SCREEN_SAVER_LOCAL_MEDIA_STORE, 'readwrite');
    transaction.objectStore(SCREEN_SAVER_LOCAL_MEDIA_STORE).clear();
    await waitForTransaction(transaction);
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    if (!this.indexedDb || !this.browserWindow) {
      this.readyState.set(true);
      return;
    }

    try {
      const database = await this.openDatabase();
      const transaction = database.transaction(SCREEN_SAVER_LOCAL_MEDIA_STORE, 'readonly');
      const records = await readAllRecords(transaction.objectStore(SCREEN_SAVER_LOCAL_MEDIA_STORE));
      await waitForTransaction(transaction);

      this.releaseObjectUrls();
      const images = records
        .sort((left, right) => left.addedAt.localeCompare(right.addedAt) || left.name.localeCompare(right.name))
        .map(record => {
          const imageUrl = this.browserWindow!.URL.createObjectURL(record.blob);
          this.objectUrls.push(imageUrl);

          return {
            id: record.id,
            name: record.name,
            addedAt: record.addedAt,
            size: record.size,
            imageUrl,
          } satisfies ScreenSaverLocalImage;
        });

      this.imagesState.set(images);
      this.errorState.set(null);
    } catch {
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
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Unable to open the local image database.'));
    });

    return this.databasePromise;
  }

  private createId(): string {
    return this.browserWindow?.crypto.randomUUID?.()
      ?? `screen-saver-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private releaseObjectUrls(): void {
    if (!this.browserWindow) {
      return;
    }

    this.objectUrls.forEach(url => this.browserWindow!.URL.revokeObjectURL(url));
    this.objectUrls = [];
  }
}

function readAllRecords(store: IDBObjectStore): Promise<ScreenSaverLocalImageRecord[]> {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as ScreenSaverLocalImageRecord[]);
    request.onerror = () => reject(request.error ?? new Error('Unable to read local images.'));
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Local image transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Local image transaction was aborted.'));
  });
}
