import {TestBed} from '@angular/core/testing';
import {BehaviorSubject, of} from 'rxjs';

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
      title: 'Frontend Engineer',
    },
    categories: overrides.categories ?? ['CMS'],
    tags: overrides.tags ?? ['Firebase'],
    status: overrides.status ?? 'draft',
    seo: overrides.seo ?? {
      title: overrides.title ?? 'Test Post',
      description: overrides.excerpt ?? 'A test post.',
      openGraphImage: overrides.coverImage ?? '/assets/images/backgrounds/night.webp',
    },
    contentFormat: 'editorjs',
    blocks: overrides.blocks ?? [],
    createdAt: overrides.createdAt ?? '2026-01-01T12:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T12:00:00.000Z',
    publishedAt: overrides.publishedAt ?? null,
  };
}

class FakeBlogStorageService {
  private readonly postsSubject = new BehaviorSubject<readonly BlogPost[]>([]);

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

  async deletePost(postId: string): Promise<void> {
    this.setPosts(this.getPosts().filter(post => post.id !== postId));
  }

  async backupPostsToFirestore(posts: readonly BlogPost[]): Promise<number> {
    this.setPosts(posts);
    return posts.length;
  }

  async loadPostsFromFirestore(): Promise<readonly BlogPost[]> {
    return this.getPosts();
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

  it('does not expose draft posts by public slug lookup', () => {
    expect(service.getPublishedPostBySlug('draft-post')).toBeUndefined();
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
        openGraphImage: '/assets/images/backgrounds/night.webp',
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
        openGraphImage: template.coverImage,
      },
      blocks: [],
    });

    expect(service.getPublishedPostBySlug(savedPost.slug)?.title).toBe('Published CMS Post');
    expect(service.getPublishedPosts().some(post => post.slug === savedPost.slug)).toBeTrue();
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
});
