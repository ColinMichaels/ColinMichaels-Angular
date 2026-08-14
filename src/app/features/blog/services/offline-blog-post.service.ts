import {DOCUMENT} from '@angular/common';
import {Injectable, computed, inject, signal} from '@angular/core';

import {BlogPost} from '../models/blog-post.model';
import {isBlogPost, isRecord} from '../utils/blog-validation.util';

export const OFFLINE_BLOG_POST_CACHE = 'colinmichaels-offline-blog-posts-v1';
const OFFLINE_BLOG_POST_PATH = '/__pwa/offline-blog-posts/';

export interface OfflineBlogPostRecord {
  version: 1;
  savedAt: string;
  sourceUpdatedAt: string;
  post: BlogPost;
}

@Injectable({
  providedIn: 'root',
})
/**
 * Owns explicit public-article downloads in a user-controlled cache namespace;
 * it never extends Angular's app-shell cache to authenticated or preview data.
 */
export class OfflineBlogPostService {
  private readonly document = inject(DOCUMENT);
  private readonly browserWindow = this.document.defaultView;
  private readonly cacheStorage = this.browserWindow?.caches;
  private readonly recordsState = signal<readonly OfflineBlogPostRecord[]>([]);
  private readonly readyState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly supported = signal(Boolean(this.cacheStorage)).asReadonly();
  readonly records = this.recordsState.asReadonly();
  readonly ready = this.readyState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly savedCount = computed(() => this.recordsState().length);

  constructor() {
    void this.refresh();
  }

  hasSavedSlug(slug: string): boolean {
    return this.recordsState().some(record => record.post.slug === slug);
  }

  async getRecord(slug: string): Promise<OfflineBlogPostRecord | undefined> {
    if (!this.cacheStorage || !slug) {
      return undefined;
    }

    try {
      const cache = await this.cacheStorage.open(OFFLINE_BLOG_POST_CACHE);
      const response = await cache.match(this.createCacheRequest(slug));
      return response ? await this.readRecord(response, slug) : undefined;
    } catch {
      this.errorState.set('Saved articles are unavailable in this browser.');
      return undefined;
    }
  }

  async save(post: BlogPost): Promise<OfflineBlogPostRecord> {
    if (post.status !== 'published' || post.preview) {
      throw new Error('Only published public posts can be saved for offline reading.');
    }

    const cacheStorage = this.requireCacheStorage();
    const cache = await cacheStorage.open(OFFLINE_BLOG_POST_CACHE);
    const record: OfflineBlogPostRecord = {
      version: 1,
      savedAt: new Date().toISOString(),
      sourceUpdatedAt: post.updatedAt,
      post: this.createPublicSnapshot(post),
    };

    await cache.put(
      this.createCacheRequest(post.slug),
      new Response(JSON.stringify(record), {
        headers: {'Content-Type': 'application/json; charset=utf-8'},
      })
    );
    await this.warmLocalArticleAssets(record.post);
    await this.refresh();

    return record;
  }

  async remove(slug: string): Promise<boolean> {
    if (!this.cacheStorage || !slug) {
      return false;
    }

    const cache = await this.cacheStorage.open(OFFLINE_BLOG_POST_CACHE);
    const removed = await cache.delete(this.createCacheRequest(slug));
    await this.refresh();
    return removed;
  }

  async clearAll(): Promise<boolean> {
    if (!this.cacheStorage) {
      return false;
    }

    const removed = await this.cacheStorage.delete(OFFLINE_BLOG_POST_CACHE);
    this.recordsState.set([]);
    this.readyState.set(true);
    return removed;
  }

  async refresh(): Promise<void> {
    if (!this.cacheStorage) {
      this.readyState.set(true);
      return;
    }

    try {
      const cache = await this.cacheStorage.open(OFFLINE_BLOG_POST_CACHE);
      const requests = await cache.keys();
      const records = await Promise.all(requests.map(async request => {
        const expectedSlug = this.getSlugFromCacheRequest(request);

        if (!expectedSlug) {
          return undefined;
        }

        const response = await cache.match(request);
        return response ? this.readRecord(response, expectedSlug) : undefined;
      }));

      this.recordsState.set(records
        .filter((record): record is OfflineBlogPostRecord => Boolean(record))
        .sort((left, right) => right.savedAt.localeCompare(left.savedAt)));
      this.errorState.set(null);
    } catch {
      this.recordsState.set([]);
      this.errorState.set('Saved articles are unavailable in this browser.');
    } finally {
      this.readyState.set(true);
    }
  }

  private createCacheRequest(slug: string): Request {
    const origin = this.browserWindow?.location.origin ?? 'https://colinmichaels.com';
    const url = new URL(`${OFFLINE_BLOG_POST_PATH}${encodeURIComponent(slug)}.json`, origin);
    return new Request(url.toString(), {method: 'GET'});
  }

  private getSlugFromCacheRequest(request: Request): string | undefined {
    try {
      const pathname = new URL(request.url).pathname;

      if (!pathname.startsWith(OFFLINE_BLOG_POST_PATH) || !pathname.endsWith('.json')) {
        return undefined;
      }

      const encodedSlug = pathname.slice(OFFLINE_BLOG_POST_PATH.length, -'.json'.length);
      return encodedSlug ? decodeURIComponent(encodedSlug) : undefined;
    } catch {
      return undefined;
    }
  }

  private async readRecord(response: Response, expectedSlug?: string): Promise<OfflineBlogPostRecord | undefined> {
    try {
      const value: unknown = await response.json();

      if (!isOfflineBlogPostRecord(value)) {
        return undefined;
      }

      if (expectedSlug && value.post.slug !== expectedSlug) {
        return undefined;
      }

      return value;
    } catch {
      return undefined;
    }
  }

  private createPublicSnapshot(post: BlogPost): BlogPost {
    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      ...(post.backgroundImage ? {backgroundImage: post.backgroundImage} : {}),
      ...(post.thumbnailImage ? {thumbnailImage: post.thumbnailImage} : {}),
      ...(post.featured === undefined ? {} : {featured: post.featured}),
      author: {...post.author},
      categories: [...post.categories],
      ...(post.subcategories ? {subcategories: [...post.subcategories]} : {}),
      tags: [...post.tags],
      status: 'published',
      seo: {...post.seo},
      ...(post.og ? {og: {...post.og}} : {}),
      contentFormat: post.contentFormat,
      blocks: post.blocks.map(block => ({
        ...block,
        data: {
          ...block.data,
          ...(block.data.galleryImages
            ? {galleryImages: block.data.galleryImages.map(image => ({...image}))}
            : {}),
        },
      })),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      publishedAt: post.publishedAt,
    };
  }

  private async warmLocalArticleAssets(post: BlogPost): Promise<void> {
    const browserWindow = this.browserWindow;

    if (!browserWindow) {
      return;
    }

    const candidates = [
      post.coverImage,
      post.backgroundImage,
      post.thumbnailImage,
      ...post.blocks
        .filter(block => block.type === 'image')
        .map(block => block.data.url),
      ...post.blocks.flatMap(block => block.type === 'gallery'
        ? (block.data.galleryImages ?? []).map(image => image.url)
        : []),
    ];
    const localAssets = [...new Set(candidates
      .filter((value): value is string => Boolean(value))
      .map(value => this.toLocalAssetUrl(value))
      .filter((value): value is string => Boolean(value)))];

    await Promise.allSettled(localAssets.map(url => browserWindow.fetch(url, {credentials: 'same-origin'})));
  }

  private toLocalAssetUrl(value: string): string | undefined {
    const browserWindow = this.browserWindow;

    if (!browserWindow) {
      return undefined;
    }

    try {
      const url = new URL(value, browserWindow.location.origin);
      return url.origin === browserWindow.location.origin && url.pathname.startsWith('/assets/')
        ? url.toString()
        : undefined;
    } catch {
      return undefined;
    }
  }

  private requireCacheStorage(): CacheStorage {
    if (!this.cacheStorage) {
      throw new Error('Offline article storage is not supported in this browser.');
    }

    return this.cacheStorage;
  }
}

export function isOfflineBlogPostRecord(value: unknown): value is OfflineBlogPostRecord {
  return isRecord(value)
    && value['version'] === 1
    && typeof value['savedAt'] === 'string'
    && typeof value['sourceUpdatedAt'] === 'string'
    && isBlogPost(value['post'])
    && value['post'].status === 'published'
    && value['post'].preview === undefined;
}

export function selectReadableBlogPost(
  remotePost: BlogPost | undefined,
  offlineRecord: OfflineBlogPostRecord | undefined,
  offline: boolean,
  repositoryError: string | null
): BlogPost | undefined {
  if (remotePost) {
    return remotePost;
  }

  return offline || Boolean(repositoryError) ? offlineRecord?.post : undefined;
}
