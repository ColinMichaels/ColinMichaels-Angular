import {BlogPost, BlogPostStatus} from '../models/blog-post.model';
import {
  BLOG_SOCIAL_CHANNELS,
  BLOG_SOCIAL_CONTENT_ANGLES,
  BLOG_SOCIAL_LINK_PLACEMENTS,
  BLOG_SOCIAL_MEDIA_TYPES,
  BlogSocialAnnouncementStatus,
} from '../models/blog-social-promotion.model';

export const BLOG_POST_STATUSES: readonly BlogPostStatus[] = ['draft', 'scheduled', 'published', 'archived'];
const blogPostStatusSet = new Set<string>(BLOG_POST_STATUSES);
const blogSocialChannelSet = new Set<string>(BLOG_SOCIAL_CHANNELS);
const blogSocialContentAngleSet = new Set<string>(BLOG_SOCIAL_CONTENT_ANGLES);
const blogSocialLinkPlacementSet = new Set<string>(BLOG_SOCIAL_LINK_PLACEMENTS);
const blogSocialMediaTypeSet = new Set<string>(BLOG_SOCIAL_MEDIA_TYPES);
const blogSocialAnnouncementStatusSet = new Set<BlogSocialAnnouncementStatus>([
  'draft',
  'scheduled',
  'queued',
  'posted',
  'failed',
  'cancelled',
]);

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
    && (value['title'] === undefined || typeof value['title'] === 'string')
    && (value['bio'] === undefined || typeof value['bio'] === 'string')
    && (value['avatarUrl'] === undefined || typeof value['avatarUrl'] === 'string')
    && (value['profileUrl'] === undefined || typeof value['profileUrl'] === 'string')
    && (value['slug'] === undefined || typeof value['slug'] === 'string');
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

export function isBlogCatCornerSettings(value: unknown): boolean {
  return value === undefined || (
    isRecord(value)
    && typeof value['enabled'] === 'boolean'
    && typeof value['discoveryPost'] === 'boolean'
    && (value['enabled'] === true || value['discoveryPost'] === false)
  );
}

function isBlogSocialAnnouncement(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value['id'] === 'string'
    && typeof value['channel'] === 'string'
    && blogSocialChannelSet.has(value['channel'])
    && typeof value['message'] === 'string'
    && typeof value['scheduledAt'] === 'string'
    && typeof value['status'] === 'string'
    && blogSocialAnnouncementStatusSet.has(value['status'] as BlogSocialAnnouncementStatus)
    && typeof value['createdAt'] === 'string'
    && typeof value['updatedAt'] === 'string'
    && (
      value['deliveryTiming'] === undefined
      || value['deliveryTiming'] === 'at-publish'
      || value['deliveryTiming'] === 'scheduled'
    )
    && (value['postedAt'] === undefined || typeof value['postedAt'] === 'string')
    && (value['linkUrl'] === undefined || typeof value['linkUrl'] === 'string')
    && (value['mediaUrl'] === undefined || typeof value['mediaUrl'] === 'string')
    && (
      value['mediaType'] === undefined
      || (
        typeof value['mediaType'] === 'string'
        && blogSocialMediaTypeSet.has(value['mediaType'])
        && typeof value['mediaUrl'] === 'string'
        && value['mediaUrl'].trim().length > 0
      )
    )
    && (
      value['linkPlacement'] === undefined
      || (typeof value['linkPlacement'] === 'string' && blogSocialLinkPlacementSet.has(value['linkPlacement']))
    )
    && (
      value['contentAngle'] === undefined
      || (typeof value['contentAngle'] === 'string' && blogSocialContentAngleSet.has(value['contentAngle']))
    )
    && (value['failureReason'] === undefined || typeof value['failureReason'] === 'string');
}

function isBlogSocialPromotion(value: unknown): boolean {
  return value === undefined || (
    isRecord(value)
    && Array.isArray(value['announcements'])
    && value['announcements'].every(isBlogSocialAnnouncement)
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
    && (value['backgroundImage'] === undefined || typeof value['backgroundImage'] === 'string')
    && (value['thumbnailImage'] === undefined || typeof value['thumbnailImage'] === 'string')
    && (value['featured'] === undefined || typeof value['featured'] === 'boolean')
    && (value['authorId'] === undefined || typeof value['authorId'] === 'string')
    && isBlogAuthor(value['author'])
    && isStringArray(value['categories'])
    && (value['subcategories'] === undefined || isStringArray(value['subcategories']))
    && isStringArray(value['tags'])
    && isBlogPostStatus(value['status'])
    && isBlogSeo(value['seo'])
    && isBlogOpenGraphMetadata(value['og'])
    && value['contentFormat'] === 'editorjs'
    && Array.isArray(value['blocks'])
    && isBlogSocialPromotion(value['socialPromotion'])
    && isBlogCatCornerSettings(value['catCorner'])
    && isBlogPostPreview(value['preview'])
    && typeof value['createdAt'] === 'string'
    && typeof value['updatedAt'] === 'string'
    && (typeof value['publishedAt'] === 'string' || value['publishedAt'] === null);
}
