import {BlogPost, BlogPostStatus} from '../models/blog-post.model';

export const BLOG_POST_STATUSES: readonly BlogPostStatus[] = ['draft', 'scheduled', 'published', 'archived'];
const blogPostStatusSet = new Set<string>(BLOG_POST_STATUSES);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

export function isBlogPostStatus(value: unknown): value is BlogPostStatus {
  return typeof value === 'string' && blogPostStatusSet.has(value);
}

function isOptionalPositiveInteger(value: unknown): boolean {
  return value === undefined || (typeof value === 'number' && Number.isInteger(value) && value > 0);
}

function isBlogAuthor(value: unknown): value is BlogPost['author'] {
  return isRecord(value)
    && typeof value['name'] === 'string'
    && (value['title'] === undefined || typeof value['title'] === 'string');
}

function isBlogSeo(value: unknown): value is BlogPost['seo'] {
  return isRecord(value)
    && typeof value['title'] === 'string'
    && typeof value['description'] === 'string'
    && (value['metaTitle'] === undefined || typeof value['metaTitle'] === 'string')
    && (value['metaDescription'] === undefined || typeof value['metaDescription'] === 'string')
    && (value['canonical'] === undefined || typeof value['canonical'] === 'string')
    && (value['openGraphImage'] === undefined || typeof value['openGraphImage'] === 'string')
    && isOptionalPositiveInteger(value['openGraphImageWidth'])
    && isOptionalPositiveInteger(value['openGraphImageHeight']);
}

function isBlogOpenGraphMetadata(value: unknown): boolean {
  return value === undefined || (
    isRecord(value)
    && (value['title'] === undefined || typeof value['title'] === 'string')
    && (value['description'] === undefined || typeof value['description'] === 'string')
    && (value['image'] === undefined || typeof value['image'] === 'string')
    && (value['imageAlt'] === undefined || typeof value['imageAlt'] === 'string')
    && isOptionalPositiveInteger(value['imageWidth'])
    && isOptionalPositiveInteger(value['imageHeight'])
  );
}

function isBlogPostPreview(value: unknown): boolean {
  return value === undefined || (
    isRecord(value)
    && typeof value['token'] === 'string'
    && typeof value['createdAt'] === 'string'
    && typeof value['expiresAt'] === 'string'
  );
}

export function isBlogPost(value: unknown): value is BlogPost {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value['id'] === 'string'
    && typeof value['slug'] === 'string'
    && typeof value['title'] === 'string'
    && typeof value['excerpt'] === 'string'
    && typeof value['coverImage'] === 'string'
    && (value['thumbnailImage'] === undefined || typeof value['thumbnailImage'] === 'string')
    && (value['featured'] === undefined || typeof value['featured'] === 'boolean')
    && isBlogAuthor(value['author'])
    && isStringArray(value['categories'])
    && (value['subcategories'] === undefined || isStringArray(value['subcategories']))
    && isStringArray(value['tags'])
    && isBlogPostStatus(value['status'])
    && isBlogSeo(value['seo'])
    && isBlogOpenGraphMetadata(value['og'])
    && value['contentFormat'] === 'editorjs'
    && Array.isArray(value['blocks'])
    && isBlogPostPreview(value['preview'])
    && typeof value['createdAt'] === 'string'
    && typeof value['updatedAt'] === 'string'
    && (typeof value['publishedAt'] === 'string' || value['publishedAt'] === null);
}
