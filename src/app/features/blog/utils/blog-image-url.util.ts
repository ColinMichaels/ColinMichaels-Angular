import {
  BlogGalleryImage,
  BlogPost,
  BlogPostSummary,
} from '../models/blog-post.model';
import {isBlogHttpUrl, isBlogSitePath} from './blog-url-policy.util';

export const BLOG_POST_PREVIEW_IMAGE_LIMIT = 5;

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

/**
 * Projects a small, reading-order set of in-body images into public summaries.
 * Only URL metadata is copied here; listing components decide when image bytes
 * are requested by adding preview markup after an intentional interaction.
 */
export function resolveBlogPostPreviewImages(
  post: Pick<BlogPost, 'blocks' | 'coverImage' | 'thumbnailImage'>,
  limit = BLOG_POST_PREVIEW_IMAGE_LIMIT
): readonly BlogGalleryImage[] {
  const boundedLimit = Math.min(
    BLOG_POST_PREVIEW_IMAGE_LIMIT,
    Math.max(0, Number.isFinite(limit) ? Math.floor(limit) : BLOG_POST_PREVIEW_IMAGE_LIMIT)
  );

  if (boundedLimit === 0) {
    return [];
  }

  const primaryUrls = new Set([
    post.coverImage.trim(),
    post.thumbnailImage?.trim() ?? '',
    resolveBlogPostImage(post).trim(),
  ].filter(Boolean));
  const seenUrls = new Set(primaryUrls);
  const previewImages: BlogGalleryImage[] = [];

  const appendImage = (image: Partial<BlogGalleryImage> & { url?: string }): void => {
    const url = image.url?.trim() ?? '';

    if (!url || seenUrls.has(url) || previewImages.length >= boundedLimit) {
      return;
    }

    seenUrls.add(url);
    const width = normalizePreviewDimension(image.width);
    const height = normalizePreviewDimension(image.height);
    previewImages.push({
      url,
      alt: image.alt?.trim() ?? '',
      ...(image.caption?.trim() ? {caption: image.caption.trim()} : {}),
      ...(width ? {width} : {}),
      ...(height ? {height} : {}),
    });
  };

  for (const block of post.blocks) {
    if (block.type === 'image') {
      appendImage({
        url: block.data.url,
        alt: block.data.alt,
        caption: block.data.caption,
        width: block.data.width,
        height: block.data.height,
      });
    } else if (block.type === 'gallery') {
      for (const image of block.data.galleryImages ?? []) {
        appendImage(image);
      }
    }

    if (previewImages.length >= boundedLimit) {
      break;
    }
  }

  return previewImages;
}

function normalizePreviewDimension(value: number | undefined): number | undefined {
  return Number.isFinite(value) && Number(value) > 0
    ? Math.floor(Number(value))
    : undefined;
}
