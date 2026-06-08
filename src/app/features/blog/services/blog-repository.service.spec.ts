import {TestBed} from '@angular/core/testing';

import {BlogPost} from '../models/blog-post.model';
import {BLOG_POST_STORAGE_KEY} from './blog-storage.service';
import {BlogRepositoryService} from './blog-repository.service';

describe('BlogRepositoryService', () => {
  let service: BlogRepositoryService;

  beforeEach(() => {
    window.localStorage.removeItem(BLOG_POST_STORAGE_KEY);
    TestBed.configureTestingModule({});
    service = TestBed.inject(BlogRepositoryService);
  });

  afterEach(() => {
    window.localStorage.removeItem(BLOG_POST_STORAGE_KEY);
  });

  it('returns only published posts for the public blog', () => {
    const posts = service.getPublishedPosts();

    expect(posts.length).toBe(1);
    expect(posts[0].slug).toBe('architecture-boundaries');
  });

  it('does not expose draft posts by public slug lookup', () => {
    expect(service.getPublishedPostBySlug('cms-foundation')).toBeUndefined();
  });

  it('keeps drafts available to the admin repository view', () => {
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

  it('returns draft posts by slug for the admin editor', () => {
    expect(service.getAdminPostBySlug('cms-foundation')?.status).toBe('draft');
  });

  it('persists newly created posts in local CMS storage', () => {
    const template = service.createNewPostTemplate();
    const savedPost = service.savePost({
      ...template,
      slug: 'local-storage-draft',
      title: 'Local Storage Draft',
      excerpt: 'A locally persisted CMS draft.',
      coverImage: '/assets/images/backgrounds/night.webp',
      categories: ['CMS'],
      tags: ['Local Storage'],
      seo: {
        title: 'Local Storage Draft',
        description: 'A locally persisted CMS draft.',
        openGraphImage: '/assets/images/backgrounds/night.webp',
      },
      blocks: [
        {
          id: 'local-draft-intro',
          type: 'paragraph',
          data: {
            text: 'Saved from the CMS editor.',
          },
        },
      ],
    });

    const storedPosts = JSON.parse(window.localStorage.getItem(BLOG_POST_STORAGE_KEY) ?? '[]') as BlogPost[];

    expect(service.getAdminPostBySlug(savedPost.slug)?.title).toBe('Local Storage Draft');
    expect(service.getAdminStats().total).toBe(3);
    expect(storedPosts.length).toBe(1);
    expect(storedPosts[0].id).toBe(savedPost.id);
  });

  it('overrides seed posts by id without duplicating the admin list', () => {
    const seedPost = service.getAdminPostBySlug('cms-foundation');

    expect(seedPost).toBeDefined();

    const savedPost = service.savePost({
      ...seedPost!,
      title: 'Updated CMS Foundation Notes',
    });

    expect(service.getAdminPostBySlug(savedPost.slug)?.title).toBe('Updated CMS Foundation Notes');
    expect(service.getAdminStats().total).toBe(2);
  });

  it('exposes locally saved published posts to the public blog', () => {
    const template = service.createNewPostTemplate();
    const savedPost = service.savePost({
      ...template,
      slug: 'published-local-post',
      title: 'Published Local Post',
      excerpt: 'A locally saved post that is visible publicly.',
      status: 'published',
      categories: ['CMS'],
      tags: ['Publishing'],
      seo: {
        title: 'Published Local Post',
        description: 'A locally saved post that is visible publicly.',
        openGraphImage: template.coverImage,
      },
      blocks: [],
    });

    expect(service.getPublishedPostBySlug(savedPost.slug)?.title).toBe('Published Local Post');
    expect(service.getPublishedPosts().some(post => post.slug === savedPost.slug)).toBeTrue();
  });

  it('archives seed posts instead of deleting source content', () => {
    const seedPost = service.getAdminPostBySlug('architecture-boundaries');

    expect(seedPost).toBeDefined();

    const result = service.deletePost(seedPost!.id);

    expect(result).toBe('archived-seed-post');
    expect(service.getPublishedPostBySlug('architecture-boundaries')).toBeUndefined();
    expect(service.getAdminPostBySlug('architecture-boundaries')?.status).toBe('archived');
  });

  it('deletes locally created posts from CMS storage', () => {
    const template = service.createNewPostTemplate();
    const savedPost = service.savePost({
      ...template,
      slug: 'temporary-local-post',
      title: 'Temporary Local Post',
      excerpt: 'A temporary local post.',
    });

    expect(service.getAdminPostBySlug(savedPost.slug)).toBeDefined();

    const result = service.deletePost(savedPost.id);

    expect(result).toBe('deleted-local-post');
    expect(service.getAdminPostBySlug(savedPost.slug)).toBeUndefined();
  });
});
