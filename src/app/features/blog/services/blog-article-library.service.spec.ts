import {TestBed} from '@angular/core/testing';

import {BlogPostSummary} from '../models/blog-post.model';
import {
  BLOG_ARTICLE_COMPLETION_PERCENT,
  BlogArticleLibraryService,
  isBlogArticleLibraryRecord,
  normalizeProgress,
} from './blog-article-library.service';

function createPost(overrides: Partial<BlogPostSummary> = {}): BlogPostSummary {
  return {
    id: overrides.id ?? 'reader-post',
    slug: overrides.slug ?? 'reader-post',
    title: overrides.title ?? 'Reader Post',
    excerpt: overrides.excerpt ?? 'A post used to test the personal reading library.',
    coverImage: overrides.coverImage ?? '/assets/images/reader-post.webp',
    author: overrides.author ?? {name: 'Colin Michaels'},
    categories: overrides.categories ?? ['PWA'],
    subcategories: overrides.subcategories ?? [],
    tags: overrides.tags ?? ['Reading'],
    publishedAt: overrides.publishedAt ?? '2026-07-10T12:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-07-10T12:00:00.000Z',
  };
}

describe('BlogArticleLibraryService', () => {
  let service: BlogArticleLibraryService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BlogArticleLibraryService);
    await service.clearAll();
    await service.refresh();
  });

  afterEach(async () => {
    await service.clearAll();
    TestBed.resetTestingModule();
  });

  it('persists favorites and read-later state independently', async () => {
    const post = createPost();

    await service.setFavorite(post, true);
    await service.setReadLater(post, true);

    expect(service.getRecord(post.slug)?.favorite).toBeTrue();
    expect(service.getRecord(post.slug)?.readLater).toBeTrue();
    expect(service.favorites().map(record => record.post.slug)).toEqual([post.slug]);
    expect(service.readLater().map(record => record.post.slug)).toEqual([post.slug]);

    await service.refresh();
    expect(service.getRecord(post.slug)?.favorite).toBeTrue();
  });

  it('removes empty list-only records after their final choice is cleared', async () => {
    const post = createPost();
    await service.setFavorite(post, true);
    await service.setReadLater(post, true);

    await service.setFavorite(post, false);
    expect(service.getRecord(post.slug)?.readLater).toBeTrue();

    await service.setReadLater(post, false);
    expect(service.getRecord(post.slug)).toBeUndefined();
  });

  it('retains the highest reading percentage and marks near-complete posts as read', async () => {
    const post = createPost();

    await service.updateProgress(post, 48);
    await service.updateProgress(post, 21);

    expect(service.getRecord(post.slug)?.progressPercent).toBe(48);
    expect(service.getRecord(post.slug)?.completedAt).toBeNull();

    await service.updateProgress(post, BLOG_ARTICLE_COMPLETION_PERCENT);

    expect(service.getRecord(post.slug)?.progressPercent).toBe(BLOG_ARTICLE_COMPLETION_PERCENT);
    expect(service.getRecord(post.slug)?.completedAt).not.toBeNull();
    expect(service.completed().length).toBe(1);
  });

  it('does not lose the high-water mark when progress writes are queued together', async () => {
    const post = createPost();

    await Promise.all([
      service.updateProgress(post, 64),
      service.updateProgress(post, 27),
    ]);

    expect(service.getRecord(post.slug)?.progressPercent).toBe(64);
  });

  it('can mark a post read and reset progress without removing list choices', async () => {
    const post = createPost();
    await service.setFavorite(post, true);
    await service.markRead(post);

    expect(service.getRecord(post.slug)?.progressPercent).toBe(100);

    await service.resetProgress(post.slug);

    const reset = service.getRecord(post.slug);
    expect(reset?.progressPercent).toBe(0);
    expect(reset?.completedAt).toBeNull();
    expect(reset?.favorite).toBeTrue();
  });

  it('normalizes progress and rejects malformed records', () => {
    expect(normalizeProgress(-10)).toBe(0);
    expect(normalizeProgress(49.6)).toBe(50);
    expect(normalizeProgress(120)).toBe(100);
    expect(normalizeProgress(Number.NaN)).toBe(0);
    expect(isBlogArticleLibraryRecord({version: 1, progressPercent: 101})).toBeFalse();
  });
});
