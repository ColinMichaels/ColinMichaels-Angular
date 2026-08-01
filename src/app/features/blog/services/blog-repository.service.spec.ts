import {TestBed} from '@angular/core/testing';
import {BehaviorSubject, filter, firstValueFrom, of} from 'rxjs';

import {BlogPost} from '../models/blog-post.model';
import {BlogStorageService} from './blog-storage.service';
import {BlogRepositoryService} from './blog-repository.service';

function createPost(overrides: Partial<BlogPost>): BlogPost {
  return {
    id: overrides.id ?? `post-${overrides.slug ?? 'test'}`,
    slug: overrides.slug ?? 'test-post',
    title: overrides.title ?? 'Test Post',
    excerpt: overrides.excerpt ?? 'A test post.',
    coverImage: overrides.coverImage ?? '/assets/images/backgrounds/night.webp',
    author: overrides.author ?? {
      name: 'Colin Michaels',
      title: 'Applications Developer',
    },
    categories: overrides.categories ?? ['CMS'],
    tags: overrides.tags ?? ['Firebase'],
    status: overrides.status ?? 'draft',
    seo: overrides.seo ?? {
      title: overrides.title ?? 'Test Post',
      description: overrides.excerpt ?? 'A test post.',
      openGraphImage: '',
    },
    contentFormat: 'editorjs',
    blocks: overrides.blocks ?? [],
    ...(overrides.catCorner ? {catCorner: overrides.catCorner} : {}),
    ...(overrides.preview ? {preview: overrides.preview} : {}),
    ...(overrides.backgroundImage !== undefined ? {backgroundImage: overrides.backgroundImage} : {}),
    ...(overrides.thumbnailImage ? {thumbnailImage: overrides.thumbnailImage} : {}),
    createdAt: overrides.createdAt ?? '2026-01-01T12:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T12:00:00.000Z',
    publishedAt: overrides.publishedAt ?? null,
  };
}

class FakeBlogStorageService {
  private readonly postsSubject = new BehaviorSubject<readonly BlogPost[]>([]);
  private readonly previews = new Map<string, BlogPost>();
  private readonly directPublishedPosts = new Map<string, BlogPost>();

  readonly loadPublishedPostBySlugCalls: string[] = [];

  readonly posts$ = this.postsSubject.asObservable();
  readonly loading$ = of(false);
  readonly error$ = of(null);

  setPosts(posts: readonly BlogPost[]): void {
    this.postsSubject.next(posts);
  }

  getPosts(): readonly BlogPost[] {
    return this.postsSubject.value;
  }

  async savePost(post: BlogPost): Promise<void> {
    this.setPosts([...this.getPosts().filter(savedPost => savedPost.id !== post.id), post]);
  }

  async savePosts(posts: readonly BlogPost[]): Promise<void> {
    const updatedPostsById = new Map(posts.map(post => [post.id, post]));
    const unchangedPosts = this.getPosts().filter(post => !updatedPostsById.has(post.id));

    this.setPosts([...unchangedPosts, ...posts]);
  }

  async savePostPreview(post: BlogPost): Promise<void> {
    await this.savePost(post);

    if (post.preview) {
      this.previews.set(post.preview.token, post);
    }
  }

  async loadPostPreview(token: string): Promise<BlogPost | undefined> {
    const post = this.previews.get(token);
    const expiresAt = post?.preview ? new Date(post.preview.expiresAt).getTime() : 0;

    return post?.status === 'draft' && expiresAt > Date.now() ? post : undefined;
  }

  async deletePostPreview(token: string): Promise<void> {
    this.previews.delete(token);
  }

  async deletePostPreviews(tokens: readonly string[]): Promise<void> {
    for (const token of tokens) {
      this.previews.delete(token);
    }
  }

  async deletePost(postId: string): Promise<void> {
    this.setPosts(this.getPosts().filter(post => post.id !== postId));
  }

  async deletePosts(postIds: readonly string[]): Promise<void> {
    const postIdsToDelete = new Set(postIds);
    this.setPosts(this.getPosts().filter(post => !postIdsToDelete.has(post.id)));
  }

  async backupPostsToFirestore(posts: readonly BlogPost[]): Promise<number> {
    this.setPosts(posts);
    return posts.length;
  }

  async loadPostsFromFirestore(): Promise<readonly BlogPost[]> {
    return this.getPosts();
  }

  async loadPublishedPostsFromFirestore(): Promise<readonly BlogPost[]> {
    return this.getPosts().filter(post => post.status === 'published');
  }

  setDirectPublishedPost(post: BlogPost): void {
    this.directPublishedPosts.set(post.slug, post);
  }

  async loadPublishedPostBySlug(slug: string): Promise<BlogPost | undefined> {
    this.loadPublishedPostBySlugCalls.push(slug);
    const post = this.directPublishedPosts.get(slug);

    if (post) {
      this.setPosts([...this.getPosts().filter(savedPost => savedPost.id !== post.id), post]);
    }

    return post;
  }
}

describe('BlogRepositoryService', () => {
  let service: BlogRepositoryService;
  let storage: FakeBlogStorageService;

  const publishedPost = createPost({
    id: 'published-post',
    slug: 'published-post',
    title: 'Published Post',
    status: 'published',
    publishedAt: '2026-01-02T12:00:00.000Z',
  });
  const draftPost = createPost({
    id: 'draft-post',
    slug: 'draft-post',
    title: 'Draft Post',
    status: 'draft',
  });

  beforeEach(() => {
    storage = new FakeBlogStorageService();
    storage.setPosts([publishedPost, draftPost]);

    TestBed.configureTestingModule({
      providers: [
        {provide: BlogStorageService, useValue: storage},
      ],
    });
    service = TestBed.inject(BlogRepositoryService);
  });

  it('returns only Firestore published posts for the public blog', () => {
    const posts = service.getPublishedPosts();

    expect(posts.length).toBe(1);
    expect(posts[0].slug).toBe('published-post');
  });

  it('defaults new posts to Colin with a stable author relationship', () => {
    const post = service.createNewPostTemplate();

    expect(post.authorId).toBe('colin-michaels');
    expect(post.author.slug).toBe('colin-michaels');
    expect(post.author.name).toBe('Colin Michaels');
  });

  it('returns full published posts for public search without exposing drafts', () => {
    const posts = service.getPublishedFullPosts();

    expect(posts.length).toBe(1);
    expect(posts[0].slug).toBe('published-post');
    expect(posts[0].blocks).toEqual(publishedPost.blocks);
  });

  it('shows Cat Corner discovery posts in public feeds and omits non-discovery posts', () => {
    const discoveryPost = createPost({
      id: 'cat-discovery',
      slug: 'cat-discovery',
      status: 'published',
      publishedAt: '2026-01-04T12:00:00.000Z',
      catCorner: {enabled: true, discoveryPost: true},
    });
    const hiddenCatPost = createPost({
      id: 'cat-hidden',
      slug: 'cat-hidden',
      status: 'published',
      publishedAt: '2026-01-03T12:00:00.000Z',
      catCorner: {enabled: true, discoveryPost: false},
    });
    storage.setPosts([publishedPost, discoveryPost, hiddenCatPost]);

    expect(service.getPublishedPosts().map(post => post.slug)).toEqual([
      'cat-discovery',
      'published-post',
    ]);
    expect(service.getPublishedFullPosts().map(post => post.slug)).toEqual([
      'cat-discovery',
      'published-post',
    ]);
  });

  it('returns every published Cat Corner post to the member hub newest first', () => {
    const hiddenCatPost = createPost({
      id: 'cat-hidden',
      slug: 'cat-hidden',
      status: 'published',
      publishedAt: '2026-01-03T12:00:00.000Z',
      catCorner: {enabled: true, discoveryPost: false},
    });
    const discoveryPost = createPost({
      id: 'cat-discovery',
      slug: 'cat-discovery',
      status: 'published',
      publishedAt: '2026-01-04T12:00:00.000Z',
      catCorner: {enabled: true, discoveryPost: true},
    });
    const draftCatPost = createPost({
      id: 'cat-draft',
      slug: 'cat-draft',
      status: 'draft',
      catCorner: {enabled: true, discoveryPost: false},
    });
    storage.setPosts([publishedPost, hiddenCatPost, discoveryPost, draftCatPost]);

    expect(service.getPublishedCatCornerPosts().map(post => post.slug)).toEqual([
      'cat-discovery',
      'cat-hidden',
    ]);
  });

  it('keeps non-discovery Cat Corner posts available by direct published slug', () => {
    const hiddenCatPost = createPost({
      id: 'cat-hidden',
      slug: 'cat-hidden',
      status: 'published',
      publishedAt: '2026-01-03T12:00:00.000Z',
      catCorner: {enabled: true, discoveryPost: false},
    });
    storage.setPosts([publishedPost, hiddenCatPost]);

    expect(service.getPublishedPosts().some(post => post.slug === hiddenCatPost.slug)).toBeFalse();
    expect(service.getPublishedPostBySlug(hiddenCatPost.slug)).toEqual(hiddenCatPost);
  });

  it('does not expose draft posts by public slug lookup', () => {
    expect(service.getPublishedPostBySlug('draft-post')).toBeUndefined();
  });

  it('uses an isolated Firestore lookup when a direct post is not in the collection cache', async () => {
    storage.setPosts([]);
    storage.setDirectPublishedPost(publishedPost);

    const post = await firstValueFrom(service.getPublishedPostBySlug$('published-post'));

    expect(post).toEqual(publishedPost);
    expect(storage.loadPublishedPostBySlugCalls).toEqual(['published-post']);
  });

  it('uses the collection cache without a second direct post request', async () => {
    const post = await firstValueFrom(service.getPublishedPostBySlug$('published-post'));

    expect(post).toEqual(publishedPost);
    expect(storage.loadPublishedPostBySlugCalls).toEqual([]);
  });

  it('keeps a cold slug lookup subscribed until the published collection supplies the post', async () => {
    storage.setPosts([]);
    const postPromise = firstValueFrom(
      service.getPublishedPostBySlug$('published-post').pipe(
        filter((post): post is BlogPost => Boolean(post))
      )
    );

    await Promise.resolve();
    storage.setPosts([publishedPost]);

    expect(await postPromise).toEqual(publishedPost);
    expect(storage.loadPublishedPostBySlugCalls).toEqual(['published-post']);
  });

  it('keeps Firestore drafts available to the admin repository view', () => {
    const posts = service.getAdminPosts();
    const stats = service.getAdminStats();

    expect(posts.length).toBe(2);
    expect(stats).toEqual({
      total: 2,
      published: 1,
      drafts: 1,
      scheduled: 0,
      archived: 0,
    });
  });

  it('returns Firestore draft posts by slug for the admin editor', () => {
    expect(service.getAdminPostBySlug('draft-post')?.status).toBe('draft');
  });

  it('saves newly created posts through the storage service', async () => {
    const template = service.createNewPostTemplate();
    const savedPost = await service.savePost({
      ...template,
      slug: 'firestore-draft',
      title: 'Firestore CMS Draft',
      excerpt: 'A Firestore CMS draft.',
      coverImage: '/assets/images/backgrounds/night.webp',
      categories: ['CMS'],
      tags: ['Firestore'],
      seo: {
        title: 'Firestore CMS Draft',
        description: 'A Firestore CMS draft.',
        openGraphImage: '',
      },
      blocks: [
        {
          id: 'firestore-draft-intro',
          type: 'paragraph',
          data: {
            text: 'Saved from the CMS editor.',
          },
        },
      ],
    });

    expect(service.getAdminPostBySlug(savedPost.slug)?.title).toBe('Firestore CMS Draft');
    expect(service.getAdminStats().total).toBe(3);
    expect(storage.getPosts().some(post => post.id === savedPost.id)).toBeTrue();
  });

  it('updates Firestore posts by id without duplicating the admin list', async () => {
    const savedPost = await service.savePost({
      ...draftPost,
      title: 'Updated Draft Post',
    });

    expect(service.getAdminPostBySlug(savedPost.slug)?.title).toBe('Updated Draft Post');
    expect(service.getAdminStats().total).toBe(2);
  });

  it('exposes saved published posts to the public blog', async () => {
    const template = service.createNewPostTemplate();
    const savedPost = await service.savePost({
      ...template,
      slug: 'published-firestore-post',
      title: 'Published CMS Post',
      excerpt: 'A saved post that is visible publicly.',
      status: 'published',
      categories: ['CMS'],
      tags: ['Publishing'],
      seo: {
        title: 'Published CMS Post',
        description: 'A saved post that is visible publicly.',
        openGraphImage: '',
      },
      blocks: [],
    });

    expect(service.getPublishedPostBySlug(savedPost.slug)?.title).toBe('Published CMS Post');
    expect(service.getPublishedPosts().some(post => post.slug === savedPost.slug)).toBeTrue();
  });

  it('preserves a custom Open Graph image separately from the cover image', async () => {
    const savedPost = await service.savePost(createPost({
      id: 'custom-og-post',
      slug: 'custom-og-post',
      coverImage: '/assets/images/posts/cover.webp',
      seo: {
        title: 'Custom OG Post',
        description: 'A post with separate social artwork.',
        openGraphImage: '/assets/images/posts/social-share.webp',
      },
    }));

    expect(savedPost.seo.openGraphImage).toBe('/assets/images/posts/social-share.webp');
  });

  it('trims an optional post background and clears blank background values', async () => {
    const savedPost = await service.savePost(createPost({
      id: 'background-post',
      slug: 'background-post',
      backgroundImage: '  /assets/images/backgrounds/day.webp  ',
    }));

    expect(savedPost.backgroundImage).toBe('/assets/images/backgrounds/day.webp');
    expect(storage.getPosts().find(post => post.id === savedPost.id)?.backgroundImage)
      .toBe('/assets/images/backgrounds/day.webp');

    const clearedPost = await service.savePost({
      ...savedPost,
      backgroundImage: '   ',
    });

    expect(clearedPost.backgroundImage).toBeUndefined();
    expect(storage.getPosts().find(post => post.id === savedPost.id)?.backgroundImage)
      .toBeUndefined();
  });

  it('drops a stale local thumbnail when the cover image has a Firebase Storage URL', async () => {
    const firebaseCoverImage =
      'https://firebasestorage.googleapis.com/v0/b/colinmichaels.firebasestorage.app/o/cms%2Fblog-media%2Fcover.webp?alt=media&token=abc';
    const savedPost = await service.savePost(createPost({
      id: 'firebase-cover-post',
      slug: 'firebase-cover-post',
      coverImage: firebaseCoverImage,
      thumbnailImage: '/assets/images/blog/legacy-thumbnail.webp',
      status: 'published',
      publishedAt: '2026-01-03T12:00:00.000Z',
    }));
    const publicSummary = service.getPublishedPosts().find(post => post.id === savedPost.id);

    expect(savedPost.thumbnailImage).toBeUndefined();
    expect(publicSummary?.coverImage).toBe(firebaseCoverImage);
    expect(publicSummary?.thumbnailImage).toBeUndefined();
    expect(storage.getPosts().find(post => post.id === savedPost.id)?.thumbnailImage)
      .toBeUndefined();
  });

  it('keeps the Open Graph image blank when social sharing should fall back to the cover image', async () => {
    const savedPost = await service.savePost(createPost({
      id: 'cover-fallback-post',
      slug: 'cover-fallback-post',
      coverImage: '/assets/images/posts/cover.webp',
      seo: {
        title: 'Cover Fallback Post',
        description: 'A post without separate social artwork.',
        openGraphImage: '',
      },
    }));

    expect(savedPost.seo.openGraphImage).toBe('');
  });

  it('creates a temporary public preview for draft posts', async () => {
    const result = await service.createPreviewForPost(draftPost);

    expect(result.url).toContain('/blog/preview/');
    expect(result.post.preview?.token).toBeTruthy();
    expect(result.post.status).toBe('draft');
    await expectAsync(service.getPreviewPostByToken(result.post.preview?.token ?? ''))
      .toBeResolvedTo(result.post);
  });

  it('rejects preview links for published posts', async () => {
    await expectAsync(service.createPreviewForPost(publishedPost)).toBeRejectedWithError(
      'Preview links can only be generated for draft posts.'
    );
  });

  it('revokes draft preview links', async () => {
    const result = await service.createPreviewForPost(draftPost);
    const token = result.post.preview?.token ?? '';
    const revokedPost = await service.revokePreviewForPost(result.post);

    expect(revokedPost.preview).toBeUndefined();
    await expectAsync(service.getPreviewPostByToken(token)).toBeResolvedTo(undefined);
  });

  it('uses the controlled published date for public post ordering', async () => {
    await service.savePost(createPost({
      id: 'older-controlled-post',
      slug: 'older-controlled-post',
      title: 'Older Controlled Post',
      excerpt: 'A published post with an older posted date.',
      status: 'published',
      publishedAt: '2024-01-10T12:00:00.000Z',
    }));
    await service.savePost(createPost({
      id: 'newer-controlled-post',
      slug: 'newer-controlled-post',
      title: 'Newer Controlled Post',
      excerpt: 'A published post with a newer posted date.',
      status: 'published',
      publishedAt: '2027-01-10T12:00:00.000Z',
    }));

    const publishedSlugs = service.getPublishedPosts().map(post => post.slug);

    expect(publishedSlugs.indexOf('newer-controlled-post'))
      .toBeLessThan(publishedSlugs.indexOf('older-controlled-post'));
  });

  it('deletes posts from Firestore storage', async () => {
    expect(service.getAdminPostBySlug(draftPost.slug)).toBeDefined();

    const result = await service.deletePost(draftPost.id);

    expect(result).toBe('deleted-cms-post');
    expect(service.getAdminPostBySlug(draftPost.slug)).toBeUndefined();
  });

  it('updates multiple post statuses and clears draft previews when publishing', async () => {
    const previewDraft = createPost({
      id: 'preview-draft',
      slug: 'preview-draft',
      status: 'draft',
      preview: {
        token: 'preview-token',
        createdAt: '2026-01-01T12:00:00.000Z',
        expiresAt: '2999-01-01T12:00:00.000Z',
      },
    });

    await storage.savePostPreview(previewDraft);

    const result = await service.updatePostStatuses([draftPost.id, previewDraft.id], 'published');

    expect(result).toEqual({
      requestedCount: 2,
      affectedCount: 2,
      notFoundIds: [],
    });
    expect(service.getAdminPostBySlug(draftPost.slug)?.status).toBe('published');
    expect(service.getAdminPostBySlug(previewDraft.slug)?.preview).toBeUndefined();
    await expectAsync(service.getPreviewPostByToken('preview-token')).toBeResolvedTo(undefined);
  });

  it('deletes multiple posts from Firestore storage', async () => {
    const result = await service.deletePosts([publishedPost.id, draftPost.id, 'missing-post']);

    expect(result).toEqual({
      requestedCount: 3,
      affectedCount: 2,
      notFoundIds: ['missing-post'],
    });
    expect(service.getAdminStats().total).toBe(0);
  });
});
