import {isPlatformBrowser} from '@angular/common';
import {Injectable, PLATFORM_ID, inject} from '@angular/core';

import {BlogPost, BlogPostStatus} from '../models/blog-post.model';

export const BLOG_POST_STORAGE_KEY = 'colinmichaels.blog.posts.v1';
const blogPostStatuses = new Set<BlogPostStatus>(['draft', 'scheduled', 'published', 'archived']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isBlogPostStatus(value: unknown): value is BlogPostStatus {
  return typeof value === 'string' && blogPostStatuses.has(value as BlogPostStatus);
}

function isBlogPost(value: unknown): value is BlogPost {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value['id'] === 'string'
    && typeof value['slug'] === 'string'
    && typeof value['title'] === 'string'
    && typeof value['excerpt'] === 'string'
    && typeof value['coverImage'] === 'string'
    && isRecord(value['author'])
    && isStringArray(value['categories'])
    && isStringArray(value['tags'])
    && isBlogPostStatus(value['status'])
    && isRecord(value['seo'])
    && value['contentFormat'] === 'editorjs'
    && Array.isArray(value['blocks'])
    && typeof value['createdAt'] === 'string'
    && typeof value['updatedAt'] === 'string'
    && (typeof value['publishedAt'] === 'string' || value['publishedAt'] === null);
}

@Injectable({
  providedIn: 'root',
})
export class BlogStorageService {
  private readonly platformId = inject(PLATFORM_ID);

  getPosts(): readonly BlogPost[] {
    if (!this.canUseLocalStorage()) {
      return [];
    }

    try {
      const rawPosts = window.localStorage.getItem(BLOG_POST_STORAGE_KEY);

      if (!rawPosts) {
        return [];
      }

      const parsedPosts: unknown = JSON.parse(rawPosts);
      return Array.isArray(parsedPosts) ? parsedPosts.filter(isBlogPost) : [];
    } catch {
      return [];
    }
  }

  savePost(post: BlogPost): void {
    if (!this.canUseLocalStorage()) {
      return;
    }

    const posts = this.getPosts().filter(savedPost => savedPost.id !== post.id);
    this.writePosts([...posts, post]);
  }

  private writePosts(posts: readonly BlogPost[]): void {
    try {
      window.localStorage.setItem(BLOG_POST_STORAGE_KEY, JSON.stringify(posts));
    } catch {
      // Local storage may be unavailable or full; callers still keep the in-memory result.
    }
  }

  private canUseLocalStorage(): boolean {
    return isPlatformBrowser(this.platformId) && typeof window.localStorage !== 'undefined';
  }
}
