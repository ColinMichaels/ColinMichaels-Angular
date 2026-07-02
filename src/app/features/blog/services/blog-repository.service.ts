import {Injectable, inject} from '@angular/core';
import {from, map, Observable} from 'rxjs';

import {BlogAdminStats, BlogPost, BlogPostStatus, BlogPostSummary} from '../models/blog-post.model';
import {SITE_URL} from '../../../shared/seo/seo.metadata';
import {getBlogTaxonomyTerms} from '../utils/blog-category-url.util';
import {BlogStorageService} from './blog-storage.service';
import {DEFAULT_COVER_IMAGE, BLOG_PREVIEW_DURATION_MS, BLOG_PREVIEW_TOKEN_BYTE_LENGTH} from '../blog.constants';

export interface BlogPostPreviewResult {
  post: BlogPost;
  url: string;
}

export interface BlogPostsExportDocument {
  version: 1;
  source: 'colinmichaels-cms';
  collection: 'posts';
  exportedAt: string;
  totalPosts: number;
  posts: readonly BlogPost[];
}

export type BlogPostDeleteResult = 'deleted-cms-post' | 'not-found';

export interface BlogPostBulkActionResult {
  requestedCount: number;
  affectedCount: number;
  notFoundIds: readonly string[];
}

function toSummary(post: BlogPost): BlogPostSummary {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    thumbnailImage: post.thumbnailImage,
    author: post.author,
    categories: post.categories,
    subcategories: post.subcategories ?? [],
    tags: post.tags,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
  };
}

function getSortablePostDate(post: BlogPost): string {
  return post.publishedAt ?? post.updatedAt;
}

function sortNewestFirst(left: BlogPost, right: BlogPost): number {
  return getSortablePostDate(right).localeCompare(getSortablePostDate(left))
    || right.updatedAt.localeCompare(left.updatedAt);
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

function createPostId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `post-${crypto.randomUUID()}`;
  }

  return `post-${Date.now().toString(36)}`;
}

function createPreviewToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(BLOG_PREVIEW_TOKEN_BYTE_LENGTH);
    crypto.getRandomValues(bytes);

    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

function isActivePreview(post: BlogPost): boolean {
  if (!post.preview || post.status !== 'draft') {
    return false;
  }

  const expiresAt = new Date(post.preview.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function getUniquePostIds(postIds: readonly string[]): readonly string[] {
  return [...new Set(postIds.filter(Boolean))];
}

@Injectable({
  providedIn: 'root',
})
export class BlogRepositoryService {
  private readonly storage = inject(BlogStorageService);
  readonly loading$ = this.storage.loading$;
  readonly error$ = this.storage.error$;

  getPublishedPosts$(): Observable<readonly BlogPostSummary[]> {
    return this.storage.posts$.pipe(
      map(posts => this.createPublishedPosts(posts))
    );
  }

  getPublishedFullPosts$(): Observable<readonly BlogPost[]> {
    return this.storage.posts$.pipe(
      map(posts => this.createPublishedFullPosts(posts))
    );
  }

  getPublishedPostBySlug$(slug: string): Observable<BlogPost | undefined> {
    return this.storage.posts$.pipe(
      map(posts => posts.find(post => post.slug === slug && post.status === 'published'))
    );
  }

  getPreviewPostByToken$(token: string): Observable<BlogPost | undefined> {
    return from(this.getPreviewPostByToken(token));
  }

  getAdminPosts$(): Observable<readonly BlogPost[]> {
    return this.storage.posts$.pipe(
      map(posts => this.createAdminPosts(posts))
    );
  }

  getAdminPostBySlug$(slug: string): Observable<BlogPost | undefined> {
    return this.storage.posts$.pipe(
      map(posts => posts.find(post => post.slug === slug))
    );
  }

  getCategories$(): Observable<readonly string[]> {
    return this.storage.posts$.pipe(
      map(posts => this.createCategories(posts))
    );
  }

  getAdminStats$(): Observable<BlogAdminStats> {
    return this.storage.posts$.pipe(
      map(posts => this.createAdminStats(posts))
    );
  }

  getPublishedPosts(): readonly BlogPostSummary[] {
    return this.createPublishedPosts(this.getPosts());
  }

  getPublishedFullPosts(): readonly BlogPost[] {
    return this.createPublishedFullPosts(this.getPosts());
  }

  getPublishedPostBySlug(slug: string): BlogPost | undefined {
    return this.getPosts().find(post => post.slug === slug && post.status === 'published');
  }

  getPreviewPostByToken(token: string): Promise<BlogPost | undefined> {
    return this.storage.loadPostPreview(token);
  }

  getAdminPosts(): readonly BlogPost[] {
    return this.createAdminPosts(this.getPosts());
  }

  getAdminPostBySlug(slug: string): BlogPost | undefined {
    return this.getPosts().find(post => post.slug === slug);
  }

  getCategories(): readonly string[] {
    return this.createCategories(this.getPosts());
  }

  getAdminStats(): BlogAdminStats {
    return this.createAdminStats(this.getPosts());
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
        title: 'Applications Developer',
      },
      categories: [],
      subcategories: [],
      tags: [],
      status: 'draft',
      seo: {
        title: 'Untitled Post',
        description: '',
        openGraphImage: '',
      },
      contentFormat: 'editorjs',
      blocks: [],
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    };
  }

  async savePost(post: BlogPost): Promise<BlogPost> {
    const now = new Date().toISOString();
    const existingPost = this.getPosts().find(savedPost => savedPost.id === post.id);
    const slug = this.createUniqueSlug(post.slug || post.title, post.id);
    const publishedAt = post.status === 'published'
      ? post.publishedAt ?? now
      : post.publishedAt;
    const savedPost: BlogPost = {
      ...post,
      slug,
      ...(post.status === 'draft' && isActivePreview(post) ? {preview: post.preview} : {preview: undefined}),
      seo: {
        ...post.seo,
        title: post.seo.title || post.title,
        description: post.seo.description || post.excerpt,
        openGraphImage: post.seo.openGraphImage?.trim() || '',
      },
      updatedAt: now,
      publishedAt,
    };

    await this.storage.savePost(savedPost);

    if (existingPost?.preview && !savedPost.preview) {
      await this.storage.deletePostPreview(existingPost.preview.token);
    }

    return savedPost;
  }

  async createPreviewForPost(post: BlogPost): Promise<BlogPostPreviewResult> {
    if (post.status !== 'draft') {
      throw new Error('Preview links can only be generated for draft posts.');
    }

    const now = new Date();
    const preview = {
      token: createPreviewToken(),
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + BLOG_PREVIEW_DURATION_MS).toISOString(),
    };
    const previousPreview = post.preview;
    const savedPost: BlogPost = {
      ...post,
      preview,
      updatedAt: now.toISOString(),
    };

    await this.storage.savePostPreview(savedPost);

    if (previousPreview && previousPreview.token !== preview.token) {
      await this.storage.deletePostPreview(previousPreview.token);
    }

    return {
      post: savedPost,
      url: this.createPreviewUrl(preview.token),
    };
  }

  async revokePreviewForPost(post: BlogPost): Promise<BlogPost> {
    const preview = post.preview;
    const savedPost: BlogPost = {
      ...post,
      preview: undefined,
      updatedAt: new Date().toISOString(),
    };

    await this.storage.savePost(savedPost);

    if (preview) {
      await this.storage.deletePostPreview(preview.token);
    }

    return savedPost;
  }

  createPreviewUrl(token: string): string {
    return `${SITE_URL}/blog/preview/${token}`;
  }

  createExportDocument(posts: readonly BlogPost[] = this.getAdminPosts()): BlogPostsExportDocument {
    return {
      version: 1,
      source: 'colinmichaels-cms',
      collection: 'posts',
      exportedAt: new Date().toISOString(),
      totalPosts: posts.length,
      posts,
    };
  }

  backupPostsToFirestore(posts: readonly BlogPost[] = this.getAdminPosts()): Promise<number> {
    return this.storage.backupPostsToFirestore(posts);
  }

  loadPostsFromFirestore(): Promise<readonly BlogPost[]> {
    return this.storage.loadPostsFromFirestore();
  }

  loadPublishedPostsFromFirestore(): Promise<readonly BlogPost[]> {
    return this.storage.loadPublishedPostsFromFirestore();
  }

  async deletePost(postId: string): Promise<BlogPostDeleteResult> {
    const firestorePost = this.storage.getPosts().find(post => post.id === postId);

    if (!firestorePost) {
      return 'not-found';
    }

    await this.storage.deletePost(postId);

    if (firestorePost.preview) {
      await this.storage.deletePostPreview(firestorePost.preview.token);
    }

    return 'deleted-cms-post';
  }

  async updatePostStatuses(postIds: readonly string[], status: BlogPostStatus): Promise<BlogPostBulkActionResult> {
    const uniquePostIds = getUniquePostIds(postIds);
    const postsById = new Map(this.storage.getPosts().map(post => [post.id, post]));
    const now = new Date().toISOString();
    const updatedPosts: BlogPost[] = [];
    const previewTokensToDelete: string[] = [];
    const notFoundIds: string[] = [];

    for (const postId of uniquePostIds) {
      const post = postsById.get(postId);

      if (!post) {
        notFoundIds.push(postId);
        continue;
      }

      const preview = status === 'draft' && isActivePreview(post) ? post.preview : undefined;

      if (post.preview && !preview) {
        previewTokensToDelete.push(post.preview.token);
      }

      updatedPosts.push({
        ...post,
        status,
        preview,
        updatedAt: now,
        publishedAt: status === 'published' ? post.publishedAt ?? now : post.publishedAt,
      });
    }

    if (updatedPosts.length > 0) {
      await this.storage.savePosts(updatedPosts);
    }

    if (previewTokensToDelete.length > 0) {
      await this.storage.deletePostPreviews(previewTokensToDelete);
    }

    return {
      requestedCount: uniquePostIds.length,
      affectedCount: updatedPosts.length,
      notFoundIds,
    };
  }

  async deletePosts(postIds: readonly string[]): Promise<BlogPostBulkActionResult> {
    const uniquePostIds = getUniquePostIds(postIds);
    const postsById = new Map(this.storage.getPosts().map(post => [post.id, post]));
    const postsToDelete: BlogPost[] = [];
    const notFoundIds: string[] = [];

    for (const postId of uniquePostIds) {
      const post = postsById.get(postId);

      if (post) {
        postsToDelete.push(post);
      } else {
        notFoundIds.push(postId);
      }
    }

    if (postsToDelete.length > 0) {
      await this.storage.deletePosts(postsToDelete.map(post => post.id));
    }

    const previewTokens = postsToDelete
      .map(post => post.preview?.token)
      .filter((token): token is string => Boolean(token));

    if (previewTokens.length > 0) {
      await this.storage.deletePostPreviews(previewTokens);
    }

    return {
      requestedCount: uniquePostIds.length,
      affectedCount: postsToDelete.length,
      notFoundIds,
    };
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
    return this.storage.getPosts();
  }

  private createPublishedPosts(posts: readonly BlogPost[]): readonly BlogPostSummary[] {
    return this.createPublishedFullPosts(posts)
      .map(toSummary);
  }

  private createPublishedFullPosts(posts: readonly BlogPost[]): readonly BlogPost[] {
    return posts
      .filter(post => post.status === 'published')
      .sort(sortNewestFirst);
  }

  private createAdminPosts(posts: readonly BlogPost[]): readonly BlogPost[] {
    return [...posts].sort(sortNewestFirst);
  }

  private createCategories(posts: readonly BlogPost[]): readonly string[] {
    const categories = posts
      .filter(post => post.status === 'published')
      .flatMap(post => getBlogTaxonomyTerms(post));

    return [...new Set(categories)].sort();
  }

  private createAdminStats(posts: readonly BlogPost[]): BlogAdminStats {
    return {
      total: posts.length,
      published: posts.filter(post => post.status === 'published').length,
      drafts: posts.filter(post => post.status === 'draft').length,
      scheduled: posts.filter(post => post.status === 'scheduled').length,
      archived: posts.filter(post => post.status === 'archived').length,
    };
  }
}
