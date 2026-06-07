import {Injectable, inject} from '@angular/core';

import {BLOG_POSTS} from '../data/blog-posts.data';
import {BlogAdminStats, BlogPost, BlogPostSummary} from '../models/blog-post.model';
import {BlogStorageService} from './blog-storage.service';

const DEFAULT_COVER_IMAGE = '/assets/images/backgrounds/night.webp';

function toSummary(post: BlogPost): BlogPostSummary {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    author: post.author,
    categories: post.categories,
    tags: post.tags,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
  };
}

function sortNewestFirst(left: BlogPost, right: BlogPost): number {
  return right.updatedAt.localeCompare(left.updatedAt);
}

export function createBlogSlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'untitled-post';
}

function mergePosts(seedPosts: readonly BlogPost[], savedPosts: readonly BlogPost[]): readonly BlogPost[] {
  const postMap = new Map<string, BlogPost>();

  for (const post of seedPosts) {
    postMap.set(post.id, post);
  }

  for (const post of savedPosts) {
    postMap.set(post.id, post);
  }

  return [...postMap.values()];
}

function createPostId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `post-${crypto.randomUUID()}`;
  }

  return `post-${Date.now().toString(36)}`;
}

@Injectable({
  providedIn: 'root',
})
export class BlogRepositoryService {
  private readonly storage = inject(BlogStorageService);
  private readonly seedPosts = BLOG_POSTS;

  getPublishedPosts(): readonly BlogPostSummary[] {
    return this.getPosts()
      .filter(post => post.status === 'published')
      .sort(sortNewestFirst)
      .map(toSummary);
  }

  getPublishedPostBySlug(slug: string): BlogPost | undefined {
    return this.getPosts().find(post => post.slug === slug && post.status === 'published');
  }

  getAdminPosts(): readonly BlogPost[] {
    return [...this.getPosts()].sort(sortNewestFirst);
  }

  getAdminPostBySlug(slug: string): BlogPost | undefined {
    return this.getPosts().find(post => post.slug === slug);
  }

  getCategories(): readonly string[] {
    const categories = this.getPosts()
      .filter(post => post.status === 'published')
      .flatMap(post => post.categories);

    return [...new Set(categories)].sort();
  }

  getAdminStats(): BlogAdminStats {
    const posts = this.getPosts();

    return {
      total: posts.length,
      published: posts.filter(post => post.status === 'published').length,
      drafts: posts.filter(post => post.status === 'draft').length,
      scheduled: posts.filter(post => post.status === 'scheduled').length,
      archived: posts.filter(post => post.status === 'archived').length,
    };
  }

  createNewPostTemplate(): BlogPost {
    const now = new Date().toISOString();

    return {
      id: createPostId(),
      slug: this.createUniqueSlug('untitled-post'),
      title: 'Untitled Post',
      excerpt: '',
      coverImage: DEFAULT_COVER_IMAGE,
      author: {
        name: 'Colin Michaels',
        title: 'Frontend Engineer',
      },
      categories: [],
      tags: [],
      status: 'draft',
      seo: {
        title: 'Untitled Post',
        description: '',
        openGraphImage: DEFAULT_COVER_IMAGE,
      },
      contentFormat: 'editorjs',
      blocks: [],
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    };
  }

  savePost(post: BlogPost): BlogPost {
    const now = new Date().toISOString();
    const slug = this.createUniqueSlug(post.slug || post.title, post.id);
    const publishedAt = post.status === 'published'
      ? post.publishedAt ?? now
      : post.publishedAt;
    const savedPost: BlogPost = {
      ...post,
      slug,
      seo: {
        ...post.seo,
        title: post.seo.title || post.title,
        description: post.seo.description || post.excerpt,
        openGraphImage: post.seo.openGraphImage || post.coverImage,
      },
      updatedAt: now,
      publishedAt,
    };

    this.storage.savePost(savedPost);
    return savedPost;
  }

  createUniqueSlug(value: string, currentPostId?: string): string {
    const baseSlug = createBlogSlug(value);
    const existingSlugs = new Set(
      this.getPosts()
        .filter(post => post.id !== currentPostId)
        .map(post => post.slug)
    );

    if (!existingSlugs.has(baseSlug)) {
      return baseSlug;
    }

    let suffix = 2;
    let nextSlug = `${baseSlug}-${suffix}`;

    while (existingSlugs.has(nextSlug)) {
      suffix += 1;
      nextSlug = `${baseSlug}-${suffix}`;
    }

    return nextSlug;
  }

  private getPosts(): readonly BlogPost[] {
    return mergePosts(this.seedPosts, this.storage.getPosts());
  }
}
