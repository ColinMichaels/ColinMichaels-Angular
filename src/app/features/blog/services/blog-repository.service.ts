import {Injectable, inject} from '@angular/core';
import {defer, distinctUntilChanged, from, map, Observable, of, switchMap} from 'rxjs';

import {
  BlogAdminStats,
  BlogPost,
  BlogPostStatus,
  BlogPostSummary,
  isCatCornerPost,
  isPublicBlogListingPost,
  normalizeBlogCatCornerSettings,
  normalizeBlogAuthor,
} from '../models/blog-post.model';
import {SITE_URL} from '../../../shared/seo/seo.metadata';
import {getBlogTaxonomyTerms} from '../utils/blog-category-url.util';
import {BlogStorageService} from './blog-storage.service';
import {normalizeBlogPostRevision} from '../models/blog-post-revision.model';
import {DEFAULT_COVER_IMAGE} from '../blog.constants';
import {normalizeBlogImageFields} from '../utils/blog-image-url.util';

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
  const imageFields = normalizeBlogImageFields(post);
  const authorFields = normalizeBlogAuthor(post.author, post.authorId);

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImage: imageFields.coverImage,
    thumbnailImage: imageFields.thumbnailImage,
    featured: post.featured,
    ...authorFields,
    categories: post.categories,
    subcategories: post.subcategories ?? [],
    tags: post.tags,
    catCorner: post.catCorner,
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

  getPublishedCatCornerPosts$(): Observable<readonly BlogPostSummary[]> {
    return this.storage.posts$.pipe(
      map(posts => this.createPublishedCatCornerPosts(posts))
    );
  }

  getPublishedPostBySlug$(slug: string): Observable<BlogPost | undefined> {
    const normalizedSlug = slug.trim();
    const cachedPost = this.getPublishedPostBySlug(normalizedSlug);
    const initialPost$ = cachedPost
      ? of(cachedPost)
      : defer(() => from(this.storage.loadPublishedPostBySlug(normalizedSlug)));

    return initialPost$.pipe(
      switchMap(() => this.storage.posts$.pipe(
        map(posts => posts.find(post => post.slug === normalizedSlug && post.status === 'published')),
        distinctUntilChanged((previous, current) => (
          previous?.id === current?.id && previous?.updatedAt === current?.updatedAt
        ))
      ))
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

  getPublishedCatCornerPosts(): readonly BlogPostSummary[] {
    return this.createPublishedCatCornerPosts(this.getPosts());
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
      revision: 0,
      slug: this.createUniqueSlug('untitled-post'),
      title: 'Untitled Post',
      excerpt: '',
      coverImage: DEFAULT_COVER_IMAGE,
      featured: false,
      authorId: 'colin-michaels',
      author: {
        name: 'Colin Michaels',
        title: 'Applications Developer',
        slug: 'colin-michaels',
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
    const expectedRevision = normalizeBlogPostRevision(post.revision);
    const slug = this.createUniqueSlug(post.slug || post.title, post.id);
    const imageFields = normalizeBlogImageFields(post);
    const authorFields = normalizeBlogAuthor(post.author, post.authorId);
    const publishedAt = post.status === 'published'
      ? post.publishedAt ?? now
      : post.publishedAt;
    const savedPost: BlogPost = {
      ...post,
      revision: expectedRevision + 1,
      ...authorFields,
      slug,
      coverImage: imageFields.coverImage,
      backgroundImage: post.backgroundImage?.trim() || undefined,
      thumbnailImage: imageFields.thumbnailImage,
      catCorner: normalizeBlogCatCornerSettings(post.catCorner),
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

    return this.storage.savePost(savedPost, expectedRevision);
  }

  async createPreviewForPost(post: BlogPost): Promise<BlogPostPreviewResult> {
    if (post.status !== 'draft') {
      throw new Error('Preview links can only be generated for draft posts.');
    }

    const expectedRevision = normalizeBlogPostRevision(post.revision);
    const savedPost = await this.storage.savePostPreview(post, expectedRevision);

    if (!savedPost.preview) {
      throw new Error('Trusted publishing did not return preview metadata.');
    }

    return {
      post: savedPost,
      url: this.createPreviewUrl(savedPost.preview.token),
    };
  }

  async revokePreviewForPost(post: BlogPost): Promise<BlogPost> {
    const expectedRevision = normalizeBlogPostRevision(post.revision);
    return this.storage.revokePostPreview(post.id, expectedRevision);
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

    await this.storage.deletePost(postId, normalizeBlogPostRevision(firestorePost.revision));

    return 'deleted-cms-post';
  }

  async updatePostStatuses(postIds: readonly string[], status: BlogPostStatus): Promise<BlogPostBulkActionResult> {
    const uniquePostIds = getUniquePostIds(postIds);
    const postsById = new Map(this.storage.getPosts().map(post => [post.id, post]));
    const now = new Date().toISOString();
    const updatedPosts: BlogPost[] = [];
    const notFoundIds: string[] = [];

    for (const postId of uniquePostIds) {
      const post = postsById.get(postId);

      if (!post) {
        notFoundIds.push(postId);
        continue;
      }

      const preview = status === 'draft' && isActivePreview(post) ? post.preview : undefined;

      updatedPosts.push({
        ...post,
        revision: normalizeBlogPostRevision(post.revision) + 1,
        status,
        preview,
        updatedAt: now,
        publishedAt: status === 'published' ? post.publishedAt ?? now : post.publishedAt,
      });
    }

    if (updatedPosts.length > 0) {
      await this.storage.savePosts(updatedPosts);
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
      await this.storage.deletePosts(postsToDelete);
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
      .filter(post => post.status === 'published' && isPublicBlogListingPost(post))
      .sort(sortNewestFirst);
  }

  private createPublishedCatCornerPosts(posts: readonly BlogPost[]): readonly BlogPostSummary[] {
    return posts
      .filter(post => post.status === 'published' && isCatCornerPost(post))
      .sort(sortNewestFirst)
      .map(toSummary);
  }

  private createAdminPosts(posts: readonly BlogPost[]): readonly BlogPost[] {
    return [...posts].sort(sortNewestFirst);
  }

  private createCategories(posts: readonly BlogPost[]): readonly string[] {
    const categories = posts
      .filter(post => post.status === 'published' && isPublicBlogListingPost(post))
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
