import {TestBed} from '@angular/core/testing';

import {BlogPost} from '../models/blog-post.model';
import {
  OFFLINE_BLOG_POST_CACHE,
  OfflineBlogPostService,
  isOfflineBlogPostRecord,
  selectReadableBlogPost,
} from './offline-blog-post.service';

function createPost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: overrides.id ?? 'offline-post',
    slug: overrides.slug ?? 'offline-post',
    title: overrides.title ?? 'Offline Post',
    excerpt: overrides.excerpt ?? 'A post saved for offline reading.',
    coverImage: overrides.coverImage ?? 'https://images.example.com/offline-cover.webp',
    ...(overrides.backgroundImage !== undefined ? {backgroundImage: overrides.backgroundImage} : {}),
    author: overrides.author ?? {name: 'Colin Michaels'},
    categories: overrides.categories ?? ['PWA'],
    subcategories: overrides.subcategories ?? [],
    tags: overrides.tags ?? ['Offline'],
    status: overrides.status ?? 'published',
    seo: overrides.seo ?? {
      title: 'Offline Post',
      description: 'A post saved for offline reading.',
    },
    contentFormat: 'editorjs',
    blocks: overrides.blocks ?? [{
      id: 'paragraph-1',
      type: 'paragraph',
      data: {text: 'Saved article text.'},
    }],
    socialPromotion: overrides.socialPromotion,
    preview: overrides.preview,
    createdAt: overrides.createdAt ?? '2026-07-01T12:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-07-10T12:00:00.000Z',
    publishedAt: overrides.publishedAt ?? '2026-07-10T12:00:00.000Z',
  };
}

describe('OfflineBlogPostService', () => {
  let service: OfflineBlogPostService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OfflineBlogPostService);
    await service.clearAll();
    await service.refresh();
  });

  afterEach(async () => {
    await service.clearAll();
    TestBed.resetTestingModule();
  });

  it('saves a public article snapshot in Cache Storage and restores it', async () => {
    const post = createPost({
      backgroundImage: '/assets/images/backgrounds/day.webp',
      socialPromotion: {
        announcements: [],
      },
    });

    const saved = await service.save(post);
    const restored = await service.getRecord(post.slug);

    expect(service.hasSavedSlug(post.slug)).toBeTrue();
    expect(service.savedCount()).toBe(1);
    expect(saved.sourceUpdatedAt).toBe(post.updatedAt);
    expect(restored?.post.title).toBe(post.title);
    expect(restored?.post.blocks).toEqual(post.blocks);
    expect(restored?.post.backgroundImage).toBe('/assets/images/backgrounds/day.webp');
    expect(restored?.post.socialPromotion).toBeUndefined();
  });

  it('removes a saved article from the device cache', async () => {
    const post = createPost();
    await service.save(post);

    await expectAsync(service.remove(post.slug)).toBeResolvedTo(true);

    expect(service.hasSavedSlug(post.slug)).toBeFalse();
    await expectAsync(service.getRecord(post.slug)).toBeResolvedTo(undefined);
  });

  it('refuses to persist drafts or temporary previews', async () => {
    await expectAsync(service.save(createPost({status: 'draft', publishedAt: null})))
      .toBeRejectedWithError('Only published public posts can be saved for offline reading.');
    await expectAsync(service.save(createPost({
      preview: {
        token: 'preview-token',
        createdAt: '2026-07-10T12:00:00.000Z',
        expiresAt: '2026-07-11T12:00:00.000Z',
      },
    }))).toBeRejectedWithError('Only published public posts can be saved for offline reading.');
  });

  it('ignores invalid or unpublished records found in its cache', async () => {
    const cache = await caches.open(OFFLINE_BLOG_POST_CACHE);
    const invalidRecord = {
      version: 1,
      savedAt: '2026-07-10T12:00:00.000Z',
      sourceUpdatedAt: '2026-07-10T12:00:00.000Z',
      post: createPost({status: 'draft', publishedAt: null}),
    };
    await cache.put('/__pwa/offline-blog-posts/invalid.json', new Response(JSON.stringify(invalidRecord)));

    await service.refresh();

    expect(isOfflineBlogPostRecord(invalidRecord)).toBeFalse();
    expect(service.records()).toEqual([]);
  });

  it('uses a saved snapshot only for offline or failed repository loads', () => {
    const remotePost = createPost({title: 'Live article'});
    const offlinePost = createPost({title: 'Saved article'});
    const offlineRecord = {
      version: 1 as const,
      savedAt: '2026-07-10T13:00:00.000Z',
      sourceUpdatedAt: offlinePost.updatedAt,
      post: offlinePost,
    };

    expect(selectReadableBlogPost(remotePost, offlineRecord, true, 'Network unavailable')?.title)
      .toBe('Live article');
    expect(selectReadableBlogPost(undefined, offlineRecord, true, null)?.title)
      .toBe('Saved article');
    expect(selectReadableBlogPost(undefined, offlineRecord, false, 'Firestore unavailable')?.title)
      .toBe('Saved article');
    expect(selectReadableBlogPost(undefined, offlineRecord, false, null)).toBeUndefined();
  });
});
