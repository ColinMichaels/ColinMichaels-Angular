import {DOCUMENT} from '@angular/common';
import {Injectable, computed, inject, signal} from '@angular/core';

import {BlogPostSummary} from '../models/blog-post.model';

export const BLOG_ARTICLE_LIBRARY_DATABASE = 'colinmichaels-reader-library';
export const BLOG_ARTICLE_LIBRARY_STORE = 'article-state';
export const BLOG_ARTICLE_COMPLETION_PERCENT = 95;

export interface BlogArticleLibrarySummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  publishedAt: string | null;
  updatedAt: string;
}

export type BlogArticleLibrarySource = Pick<
  BlogPostSummary,
  'id' | 'slug' | 'title' | 'excerpt' | 'coverImage' | 'publishedAt' | 'updatedAt'
>;

export interface BlogArticleLibraryRecord {
  version: 1;
  post: BlogArticleLibrarySummary;
  favorite: boolean;
  readLater: boolean;
  progressPercent: number;
  lastReadAt: string | null;
  completedAt: string | null;
  modifiedAt: string;
}

@Injectable({
  providedIn: 'root',
})
/**
 * Persists queryable reader metadata only. Complete article snapshots remain in
 * the separate offline Cache Storage boundary owned by OfflineBlogPostService.
 */
export class BlogArticleLibraryService {
  private readonly document = inject(DOCUMENT);
  private readonly indexedDb = this.document.defaultView?.indexedDB;
  private readonly recordsState = signal<readonly BlogArticleLibraryRecord[]>([]);
  private readonly readyState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private databasePromise: Promise<IDBDatabase> | undefined;
  private writeQueue: Promise<void> = Promise.resolve();

  readonly supported = signal(Boolean(this.indexedDb)).asReadonly();
  readonly records = this.recordsState.asReadonly();
  readonly ready = this.readyState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly favorites = computed(() => this.recordsState().filter(record => record.favorite));
  readonly readLater = computed(() => this.recordsState().filter(record => record.readLater));
  readonly completed = computed(() => this.recordsState().filter(record => Boolean(record.completedAt)));
  readonly inProgress = computed(() => this.recordsState().filter(record => (
    record.progressPercent > 0 && !record.completedAt
  )));

  constructor() {
    void this.refresh();
  }

  getRecord(slug: string): BlogArticleLibraryRecord | undefined {
    return this.recordsState().find(record => record.post.slug === slug);
  }

  async setFavorite(
    post: BlogArticleLibrarySource,
    favorite: boolean
  ): Promise<BlogArticleLibraryRecord | undefined> {
    const updated = await this.updateRecord(post, record => ({...record, favorite}));
    return this.removeIfEmpty(updated);
  }

  async setReadLater(
    post: BlogArticleLibrarySource,
    readLater: boolean
  ): Promise<BlogArticleLibraryRecord | undefined> {
    const updated = await this.updateRecord(post, record => ({...record, readLater}));
    return this.removeIfEmpty(updated);
  }

  async updateProgress(
    post: BlogArticleLibrarySource,
    progressPercent: number
  ): Promise<BlogArticleLibraryRecord | undefined> {
    const normalizedProgress = normalizeProgress(progressPercent);
    const existing = this.getRecord(post.slug);

    if (normalizedProgress <= (existing?.progressPercent ?? 0)) {
      return existing;
    }

    return this.updateRecord(post, record => {
      const now = new Date().toISOString();
      const nextProgress = Math.max(record.progressPercent, normalizedProgress);
      const completedAt = nextProgress >= BLOG_ARTICLE_COMPLETION_PERCENT
        ? record.completedAt ?? now
        : record.completedAt;

      return {
        ...record,
        progressPercent: nextProgress,
        lastReadAt: now,
        completedAt,
      };
    });
  }

  async markRead(post: BlogArticleLibrarySource): Promise<BlogArticleLibraryRecord> {
    return this.updateRecord(post, record => {
      const now = new Date().toISOString();

      return {
        ...record,
        progressPercent: 100,
        lastReadAt: now,
        completedAt: record.completedAt ?? now,
      };
    });
  }

  async resetProgress(slug: string): Promise<BlogArticleLibraryRecord | undefined> {
    const existing = this.getRecord(slug);

    if (!existing) {
      return undefined;
    }

    return this.enqueueWrite(async () => {
      const updated: BlogArticleLibraryRecord = {
        ...existing,
        progressPercent: 0,
        lastReadAt: null,
        completedAt: null,
        modifiedAt: new Date().toISOString(),
      };
      await this.putRecord(updated);
      await this.refresh();
      return updated;
    });
  }

  async remove(slug: string): Promise<boolean> {
    if (!this.indexedDb || !slug) {
      return false;
    }

    return this.enqueueWrite(async () => {
      const database = await this.openDatabase();
      const transaction = database.transaction(BLOG_ARTICLE_LIBRARY_STORE, 'readwrite');
      transaction.objectStore(BLOG_ARTICLE_LIBRARY_STORE).delete(slug);
      await transactionDone(transaction);
      await this.refresh();
      return true;
    });
  }

  async clearAll(): Promise<void> {
    if (!this.indexedDb) {
      this.recordsState.set([]);
      this.readyState.set(true);
      return;
    }

    await this.enqueueWrite(async () => {
      const database = await this.openDatabase();
      const transaction = database.transaction(BLOG_ARTICLE_LIBRARY_STORE, 'readwrite');
      transaction.objectStore(BLOG_ARTICLE_LIBRARY_STORE).clear();
      await transactionDone(transaction);
      this.recordsState.set([]);
      this.readyState.set(true);
    });
  }

  async refresh(): Promise<void> {
    if (!this.indexedDb) {
      this.readyState.set(true);
      return;
    }

    try {
      const database = await this.openDatabase();
      const transaction = database.transaction(BLOG_ARTICLE_LIBRARY_STORE, 'readonly');
      const values = await requestResult<unknown[]>(
        transaction.objectStore(BLOG_ARTICLE_LIBRARY_STORE).getAll()
      );
      await transactionDone(transaction);

      this.recordsState.set(values
        .filter(isBlogArticleLibraryRecord)
        .sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt)));
      this.errorState.set(null);
    } catch {
      this.recordsState.set([]);
      this.errorState.set('Your reading library is unavailable in this browser.');
    } finally {
      this.readyState.set(true);
    }
  }

  private updateRecord(
    post: BlogArticleLibrarySource,
    update: (record: BlogArticleLibraryRecord) => BlogArticleLibraryRecord
  ): Promise<BlogArticleLibraryRecord> {
    return this.enqueueWrite(async () => {
      const existing = await this.readRecord(post.slug);
      const now = new Date().toISOString();
      const baseRecord = existing ?? createArticleLibraryRecord(post, now);
      const updated = update({
        ...baseRecord,
        post: createArticleSummary(post),
        modifiedAt: now,
      });

      await this.putRecord(updated);
      await this.refresh();
      return updated;
    });
  }

  private enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.writeQueue.then(operation, operation);
    this.writeQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  private async removeIfEmpty(
    record: BlogArticleLibraryRecord
  ): Promise<BlogArticleLibraryRecord | undefined> {
    if (record.favorite || record.readLater || record.progressPercent > 0) {
      return record;
    }

    await this.remove(record.post.slug);
    return undefined;
  }

  private async readRecord(slug: string): Promise<BlogArticleLibraryRecord | undefined> {
    const database = await this.openDatabase();
    const transaction = database.transaction(BLOG_ARTICLE_LIBRARY_STORE, 'readonly');
    const value = await requestResult<unknown>(transaction.objectStore(BLOG_ARTICLE_LIBRARY_STORE).get(slug));
    await transactionDone(transaction);
    return isBlogArticleLibraryRecord(value) ? value : undefined;
  }

  private async putRecord(record: BlogArticleLibraryRecord): Promise<void> {
    const database = await this.openDatabase();
    const transaction = database.transaction(BLOG_ARTICLE_LIBRARY_STORE, 'readwrite');
    transaction.objectStore(BLOG_ARTICLE_LIBRARY_STORE).put(record);
    await transactionDone(transaction);
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (!this.indexedDb) {
      return Promise.reject(new Error('IndexedDB is not supported in this browser.'));
    }

    this.databasePromise ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.indexedDb!.open(BLOG_ARTICLE_LIBRARY_DATABASE, 1);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(BLOG_ARTICLE_LIBRARY_STORE)) {
          database.createObjectStore(BLOG_ARTICLE_LIBRARY_STORE, {keyPath: 'post.slug'});
        }
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () => reject(request.error ?? new Error('Unable to open the reading library.'));
      request.onblocked = () => reject(new Error('The reading library database upgrade is blocked.'));
    });

    return this.databasePromise;
  }
}

export function normalizeProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

export function isBlogArticleLibraryRecord(value: unknown): value is BlogArticleLibraryRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Partial<BlogArticleLibraryRecord>;
  const post = record.post as Partial<BlogArticleLibrarySummary> | undefined;

  return record.version === 1
    && Boolean(post)
    && typeof post?.id === 'string'
    && typeof post.slug === 'string'
    && typeof post.title === 'string'
    && typeof post.excerpt === 'string'
    && typeof post.coverImage === 'string'
    && (post.publishedAt === null || typeof post.publishedAt === 'string')
    && typeof post.updatedAt === 'string'
    && typeof record.favorite === 'boolean'
    && typeof record.readLater === 'boolean'
    && typeof record.progressPercent === 'number'
    && normalizeProgress(record.progressPercent) === record.progressPercent
    && (record.lastReadAt === null || typeof record.lastReadAt === 'string')
    && (record.completedAt === null || typeof record.completedAt === 'string')
    && typeof record.modifiedAt === 'string';
}

function createArticleLibraryRecord(post: BlogArticleLibrarySource, now: string): BlogArticleLibraryRecord {
  return {
    version: 1,
    post: createArticleSummary(post),
    favorite: false,
    readLater: false,
    progressPercent: 0,
    lastReadAt: null,
    completedAt: null,
    modifiedAt: now,
  };
}

function createArticleSummary(post: BlogArticleLibrarySource): BlogArticleLibrarySummary {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
  };
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
  });
}
