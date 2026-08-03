import {BlogPostSummary} from '../models/blog-post.model';
import {isBlogHttpUrl, isBlogSitePath} from './blog-url-policy.util';

export interface BlogImageFields {
  coverImage: string;
  thumbnailImage?: string;
}

export function isLocalAssetImageUrl(value: string): boolean {
  const trimmedValue = value.trim();

  if (/^\/?assets\//i.test(trimmedValue)) {
    return true;
  }

  if (isBlogSitePath(trimmedValue)) {
    return /^\/?assets\//i.test(trimmedValue);
  }

  if (isBlogHttpUrl(trimmedValue)) {
    return /^\/assets\//i.test(new URL(trimmedValue).pathname);
  }

  return false;
}

export function isRemoteImageUrl(value: string): boolean {
  return isBlogHttpUrl(value);
}

export function normalizeBlogImageFields(fields: BlogImageFields): BlogImageFields {
  const coverImage = fields.coverImage.trim();
  const thumbnailImage = fields.thumbnailImage?.trim() ?? '';

  if (!thumbnailImage || (isLocalAssetImageUrl(thumbnailImage) && isRemoteImageUrl(coverImage))) {
    return {coverImage};
  }

  return {
    coverImage,
    thumbnailImage,
  };
}

export function resolveBlogPostImage(post: Pick<BlogPostSummary, 'coverImage' | 'thumbnailImage'>): string {
  const imageFields = normalizeBlogImageFields(post);

  return imageFields.thumbnailImage ?? imageFields.coverImage;
}
