import {BlogPostSummary} from '../models/blog-post.model';

export interface BlogImageFields {
  coverImage: string;
  thumbnailImage?: string;
}

export function isLocalAssetImageUrl(value: string): boolean {
  const trimmedValue = value.trim();

  if (/^\/?assets\//i.test(trimmedValue)) {
    return true;
  }

  try {
    return new URL(trimmedValue).pathname.startsWith('/assets/');
  } catch {
    return false;
  }
}

export function isRemoteImageUrl(value: string): boolean {
  return /^(https?:)?\/\//i.test(value.trim());
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
