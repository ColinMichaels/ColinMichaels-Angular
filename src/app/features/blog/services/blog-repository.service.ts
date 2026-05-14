import {Injectable} from '@angular/core';

import {BLOG_POSTS} from '../data/blog-posts.data';
import {BlogAdminStats, BlogPost, BlogPostSummary} from '../models/blog-post.model';

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

@Injectable({
  providedIn: 'root',
})
export class BlogRepositoryService {
  private readonly posts = BLOG_POSTS;

  getPublishedPosts(): readonly BlogPostSummary[] {
    return this.posts
      .filter(post => post.status === 'published')
      .sort(sortNewestFirst)
      .map(toSummary);
  }

  getPublishedPostBySlug(slug: string): BlogPost | undefined {
    return this.posts.find(post => post.slug === slug && post.status === 'published');
  }

  getAdminPosts(): readonly BlogPost[] {
    return [...this.posts].sort(sortNewestFirst);
  }

  getAdminPostBySlug(slug: string): BlogPost | undefined {
    return this.posts.find(post => post.slug === slug);
  }

  getCategories(): readonly string[] {
    const categories = this.posts
      .filter(post => post.status === 'published')
      .flatMap(post => post.categories);

    return [...new Set(categories)].sort();
  }

  getAdminStats(): BlogAdminStats {
    return {
      total: this.posts.length,
      published: this.posts.filter(post => post.status === 'published').length,
      drafts: this.posts.filter(post => post.status === 'draft').length,
      scheduled: this.posts.filter(post => post.status === 'scheduled').length,
      archived: this.posts.filter(post => post.status === 'archived').length,
    };
  }
}
