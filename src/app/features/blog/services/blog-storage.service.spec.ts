import {TestBed} from '@angular/core/testing';

import {BlogPost, BlogPostIndexEntry} from '../models/blog-post.model';
import {BlogStorageService} from './blog-storage.service';

interface BlogStorageSerializer {
  toFirestorePost(post: BlogPost): Record<string, unknown>;

  toPostIndexEntry(post: BlogPost): BlogPostIndexEntry;

  fromFirestorePostIndex(value: unknown): BlogPostIndexEntry | null;

  readCompletePostIndex(
    documents: readonly { id: string; data(): unknown }[]
  ): readonly BlogPostIndexEntry[] | null;

  fetchPublishedPostBySlug(slug: string): Promise<BlogPost | undefined>;

  cachePublishedPost(post: BlogPost): void;

  getPosts(): readonly BlogPost[];

  loadPublishedPostBySlug(slug: string): Promise<BlogPost | undefined>;
}

function createPost(backgroundImage?: string, catCorner?: BlogPost['catCorner']): BlogPost {
  return {
    id: 'storage-background-post',
    slug: 'storage-background-post',
    title: 'Storage Background Post',
    excerpt: 'A post used to verify Firestore background serialization.',
    coverImage: '/assets/images/backgrounds/night.webp',
    ...(backgroundImage === undefined ? {} : {backgroundImage}),
    ...(catCorner ? {catCorner} : {}),
    author: {name: 'Colin Michaels'},
    categories: ['CMS'],
    tags: ['Firestore'],
    status: 'draft',
    seo: {
      title: 'Storage Background Post',
      description: 'A post used to verify Firestore background serialization.',
    },
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: '2026-07-11T12:00:00.000Z',
    updatedAt: '2026-07-11T12:00:00.000Z',
    publishedAt: null,
  };
}

describe('BlogStorageService background serialization', () => {
  let serializer: BlogStorageSerializer;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    serializer = TestBed.inject(BlogStorageService) as unknown as BlogStorageSerializer;
  });

  it('writes a trimmed post background URL', () => {
    const document = serializer.toFirestorePost(createPost('  /assets/images/backgrounds/day.webp  '));

    expect(document['backgroundImage']).toBe('/assets/images/backgrounds/day.webp');
  });

  it('uses a Firestore delete sentinel when the background is cleared', () => {
    const document = serializer.toFirestorePost(createPost('   '));
    const sentinel = document['backgroundImage'] as { _methodName?: string };

    expect(sentinel._methodName).toBe('deleteField');
  });

  it('serializes Cat Corner metadata and clears it safely for legacy posts', () => {
    const catDocument = serializer.toFirestorePost(createPost(undefined, {
      enabled: true,
      discoveryPost: false,
    }));
    const legacyDocument = serializer.toFirestorePost(createPost());
    const sentinel = legacyDocument['catCorner'] as {_methodName?: string};

    expect(catDocument['catCorner']).toEqual({enabled: true, discoveryPost: false});
    expect(sentinel._methodName).toBe('deleteField');
  });

  it('projects full posts into compact searchable index entries', () => {
    const post = createPost(undefined, {enabled: true, discoveryPost: true});
    post.blocks = [
      {id: 'paragraph', type: 'paragraph', data: {text: 'Searchable body copy.'}},
      {id: 'image', type: 'image', data: {url: '/inside.webp', alt: 'Inside'}},
    ];
    const indexEntry = serializer.toPostIndexEntry(post);

    expect(indexEntry.searchBodyText).toContain('searchable body copy');
    expect(indexEntry.previewImages).toEqual([{url: '/inside.webp', alt: 'Inside'}]);
    expect(indexEntry.readingMinutes).toBeGreaterThan(0);
    expect('blocks' in indexEntry).toBeFalse();
  });

  it('repairs HTML-escaped Firebase preview URLs from existing summary records', () => {
    const post = {...createPost(), status: 'published' as const, publishedAt: '2026-07-12T12:00:00.000Z'};
    const summary = {
      ...serializer.toPostIndexEntry(post),
      storageVersion: 1,
      previewImages: [{
        url: 'https://firebasestorage.googleapis.com/example.webp?alt=media&amp;token=public-token',
        alt: 'Existing preview',
      }],
    };

    expect(serializer.fromFirestorePostIndex(summary)?.previewImages).toEqual([{
      url: 'https://firebasestorage.googleapis.com/example.webp?alt=media&token=public-token',
      alt: 'Existing preview',
    }]);
  });

  it('bounds the retained search projection for exceptionally large posts', () => {
    const post = createPost();
    post.blocks = [{
      id: 'large-paragraph',
      type: 'paragraph',
      data: {text: 'searchable '.repeat(4_000)},
    }];

    expect(serializer.toPostIndexEntry(post).searchBodyText?.length).toBe(16_000);
  });

  it('rejects malformed index documents before they enter the root cache', () => {
    expect(serializer.fromFirestorePostIndex({id: 'unsafe', status: 'published'})).toBeNull();
  });

  it('trusts only a complete schema-compatible index with no malformed summaries', () => {
    const post = {...createPost(), status: 'published' as const, publishedAt: '2026-07-12T12:00:00.000Z'};
    const summary = {...serializer.toPostIndexEntry(post), storageVersion: 1};
    const manifest = {
      kind: 'post-summary-index',
      schemaVersion: 1,
      complete: true,
      status: 'published',
    };

    expect(serializer.readCompletePostIndex([
      {id: '__manifest', data: () => manifest},
      {id: post.id, data: () => summary},
    ])?.map(entry => entry.id)).toEqual([post.id]);
    expect(serializer.readCompletePostIndex([
      {id: '__manifest', data: () => manifest},
      {id: post.id, data: () => ({...summary, title: undefined})},
    ])).toBeNull();
    expect(serializer.readCompletePostIndex([
      {id: '__manifest', data: () => ({...manifest, schemaVersion: 2})},
      {id: post.id, data: () => summary},
    ])).toBeNull();
  });

  it('coalesces concurrent direct-article requests for the same slug', async () => {
    let resolveLoad: ((post: BlogPost | undefined) => void) | undefined;
    const load = new Promise<BlogPost | undefined>(resolve => {
      resolveLoad = resolve;
    });
    const fetchSpy = spyOn(serializer, 'fetchPublishedPostBySlug').and.returnValue(load);

    const first = serializer.loadPublishedPostBySlug('same-post');
    const second = serializer.loadPublishedPostBySlug('same-post');
    resolveLoad?.(undefined);

    expect(first).toBe(second);
    await first;
    expect(fetchSpy).toHaveBeenCalledOnceWith('same-post');
  });

  it('bounds the anonymous direct-article cache to the most recent three posts', () => {
    for (let index = 1; index <= 5; index += 1) {
      serializer.cachePublishedPost({
        ...createPost(),
        id: `post-${index}`,
        slug: `post-${index}`,
        status: 'published',
        publishedAt: `2026-07-${String(index).padStart(2, '0')}T12:00:00.000Z`,
      });
    }

    expect(serializer.getPosts().map(post => post.id)).toEqual(['post-3', 'post-4', 'post-5']);
  });
});
