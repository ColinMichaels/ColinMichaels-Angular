import {
  BLOG_BLOCK_PLACEMENTS,
  BLOG_CHART_TYPES,
  BLOG_EVIDENCE_BASES,
  BLOG_GALLERY_LAYOUTS,
  BLOG_IMAGE_LAYOUTS,
  BLOG_IMAGE_SIZES,
  BLOG_LIST_PRESENTATIONS,
  BLOG_LIST_STYLES,
  BLOG_POLL_RESULTS_VISIBILITIES,
  BLOG_TYPOGRAPHY_VARIANTS,
  BlogBlockType,
  BlogContentBlock,
  BlogEditorialMetadata,
  BlogEvidenceBasis,
  BlogJsonObject,
  BlogJsonValue,
  BlogListItem,
  BlogPost,
  BlogPostStatus,
} from '../models/blog-post.model';
import {
  BLOG_SOCIAL_CHANNELS,
  BLOG_SOCIAL_CONTENT_ANGLES,
  BLOG_SOCIAL_LINK_PLACEMENTS,
  BLOG_SOCIAL_MEDIA_TYPES,
  BLOG_SOCIAL_POST_FORMATS,
  BlogSocialChannel,
  BlogSocialAnnouncementStatus,
  BlogSocialPostFormat,
} from '../models/blog-social-promotion.model';
import {isSocialPostFormatAllowed} from './blog-social-promotion.util';
import {isBlogEditorialSourceDate} from './blog-editorial-metadata.util';
import {decodeBlogUnsupportedBlockEnvelope} from './blog-unsupported-block.util';
import {isVideoUploadDate} from './blog-youtube-journey.util';
import {
  hasDisallowedInlineUrlProtocol,
  isBlogHttpUrl,
  isBlogMediaUrl,
  isOptionalBlogHttpUrl,
  isOptionalBlogMediaUrl,
  isOptionalBlogNavigationUrl,
} from './blog-url-policy.util';

export const BLOG_POST_STATUSES: readonly BlogPostStatus[] = ['draft', 'scheduled', 'published', 'archived'];
const blogPostStatusSet = new Set<string>(BLOG_POST_STATUSES);
const blogEvidenceBasisSet = new Set<BlogEvidenceBasis>(BLOG_EVIDENCE_BASES);
const blogBlockTypeSet = new Set<BlogBlockType>([
  'paragraph',
  'header',
  'image',
  'gallery',
  'embed',
  'list',
  'quote',
  'code',
  'markdown',
  'delimiter',
  'typography',
  'stats',
  'chart',
  'poll',
  'catCornerUnlock',
  'html',
  'unsupported',
]);
const blogSocialChannelSet = new Set<string>(BLOG_SOCIAL_CHANNELS);
const blogSocialContentAngleSet = new Set<string>(BLOG_SOCIAL_CONTENT_ANGLES);
const blogSocialLinkPlacementSet = new Set<string>(BLOG_SOCIAL_LINK_PLACEMENTS);
const blogSocialMediaTypeSet = new Set<string>(BLOG_SOCIAL_MEDIA_TYPES);
const blogSocialPostFormatSet = new Set<string>(BLOG_SOCIAL_POST_FORMATS);
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

export function isBlogContentBlock(value: unknown): value is BlogContentBlock {
  if (!isRecord(value) || typeof value['id'] !== 'string' || !blogBlockTypeSet.has(value['type'] as BlogBlockType)) {
    return false;
  }

  const type = value['type'] as BlogBlockType;
  const data = value['data'];

  return isBlogBlockData(type, data)
    && (value['editorTunes'] === undefined || isBlogJsonObject(value['editorTunes']));
}

function isBlogBlockData(type: BlogBlockType, value: unknown): boolean {
  if (!isRecord(value) || Array.isArray(value) || !isBlogBlockDataShape(value)) {
    return false;
  }

  const hasVideoMetadata = value['videoTitle'] !== undefined
    || value['videoDescription'] !== undefined
    || value['videoUploadDate'] !== undefined
    || value['videoDurationSeconds'] !== undefined;

  if (hasVideoMetadata && (type !== 'embed'
    || value['provider'] !== 'youtube'
    || value['isCompanionVideo'] !== true)) {
    return false;
  }

  if (type === 'list') {
    return (value['items'] === undefined || isStringArray(value['items']))
      && (value['listItems'] === undefined || (
        Array.isArray(value['listItems'])
        && value['listItems'].every(isBlogListItem)
      ));
  }

  if (type === 'image') {
    return (value['width'] === undefined || isPositiveFiniteNumber(value['width']))
      && (value['height'] === undefined || isPositiveFiniteNumber(value['height']))
      && value['unsupportedBlock'] === undefined;
  }

  if (type === 'gallery') {
    return Array.isArray(value['galleryImages'])
      && value['galleryImages'].length >= 2
      && value['galleryImages'].length <= 20
      && value['galleryImages'].every(isBlogGalleryImage)
      && value['unsupportedBlock'] === undefined;
  }

  if (type === 'unsupported') {
    const envelope = value['unsupportedBlock'];
    return decodeBlogUnsupportedBlockEnvelope(envelope) !== null;
  }

  return value['unsupportedBlock'] === undefined;
}

function isBlogBlockDataShape(value: Record<string, unknown>): boolean {
  const stringFields = [
    'title', 'text', 'url', 'alt', 'caption', 'provider', 'embedUrl', 'language', 'code', 'markdown',
    'attribution', 'unit', 'xAxisTitle', 'yAxisTitle', 'valueSuffix', 'sourceLabel', 'sourceUrl',
    'accessibilitySummary', 'question', 'description', 'html', 'videoTitle', 'videoDescription',
    'videoUploadDate',
  ];
  const numberFields = ['width', 'height', 'yMax', 'decimals', 'videoDurationSeconds'];
  const booleanFields = [
    'ordered',
    'stretched',
    'withBorder',
    'withBackground',
    'showLegend',
    'isCompanionVideo',
  ];

  return stringFields.every(field => value[field] === undefined || typeof value[field] === 'string')
    && numberFields.every(field => value[field] === undefined
      || (typeof value[field] === 'number' && Number.isFinite(value[field])))
    && booleanFields.every(field => value[field] === undefined || typeof value[field] === 'boolean')
    && (value['videoUploadDate'] === undefined
      || (typeof value['videoUploadDate'] === 'string' && isVideoUploadDate(value['videoUploadDate'])))
    && (value['videoDurationSeconds'] === undefined
      || (typeof value['videoDurationSeconds'] === 'number'
        && Number.isFinite(value['videoDurationSeconds'])
        && value['videoDurationSeconds'] > 0))
    && (value['placement'] === undefined || (BLOG_BLOCK_PLACEMENTS as readonly unknown[]).includes(value['placement']))
    && (value['level'] === undefined || value['level'] === 2 || value['level'] === 3)
    && (value['imageLayout'] === undefined || (BLOG_IMAGE_LAYOUTS as readonly unknown[]).includes(value['imageLayout']))
    && (value['imageSize'] === undefined || (BLOG_IMAGE_SIZES as readonly unknown[]).includes(value['imageSize']))
    && (value['galleryLayout'] === undefined
      || (BLOG_GALLERY_LAYOUTS as readonly unknown[]).includes(value['galleryLayout']))
    && (value['listStyle'] === undefined || (BLOG_LIST_STYLES as readonly unknown[]).includes(value['listStyle']))
    && (value['listPresentation'] === undefined
      || (BLOG_LIST_PRESENTATIONS as readonly unknown[]).includes(value['listPresentation']))
    && (value['listPresentation'] !== 'steps'
      || value['listStyle'] === 'ordered'
      || (value['listStyle'] === undefined && value['ordered'] === true))
    && (value['listMeta'] === undefined || isBlogJsonObject(value['listMeta']))
    && (value['variant'] === undefined || (BLOG_TYPOGRAPHY_VARIANTS as readonly unknown[]).includes(value['variant']))
    && (value['chartType'] === undefined || (BLOG_CHART_TYPES as readonly unknown[]).includes(value['chartType']))
    && (value['pollResultsVisibility'] === undefined
      || (BLOG_POLL_RESULTS_VISIBILITIES as readonly unknown[]).includes(value['pollResultsVisibility']))
    && (value['stats'] === undefined || isBlogStats(value['stats']))
    && (value['chartPoints'] === undefined || isBlogChartPoints(value['chartPoints']))
    && (value['labels'] === undefined || isStringArray(value['labels']))
    && (value['datasets'] === undefined || isBlogChartDatasets(value['datasets']))
    && (value['galleryImages'] === undefined || (Array.isArray(value['galleryImages'])
      && value['galleryImages'].every(isBlogGalleryImage)))
    && (value['pollOptions'] === undefined || isBlogPollOptions(value['pollOptions']));
}

function isBlogGalleryImage(value: unknown): boolean {
  if (!isRecord(value) || Array.isArray(value)) {
    return false;
  }

  const allowedKeys = new Set(['url', 'alt', 'caption', 'width', 'height']);

  return Object.keys(value).every(key => allowedKeys.has(key))
    && typeof value['url'] === 'string'
    && value['url'].trim().length > 0
    && typeof value['alt'] === 'string'
    && value['alt'].trim().length > 0
    && (value['caption'] === undefined || typeof value['caption'] === 'string')
    && (value['width'] === undefined || isPositiveFiniteNumber(value['width']))
    && (value['height'] === undefined || isPositiveFiniteNumber(value['height']));
}

function isPositiveFiniteNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isBlogListItem(value: unknown): value is BlogListItem {
  return isRecord(value)
    && typeof value['content'] === 'string'
    && isBlogJsonObject(value['meta'])
    && Array.isArray(value['items'])
    && value['items'].every(isBlogListItem);
}

function isBlogStats(value: unknown): boolean {
  return Array.isArray(value) && value.every(item => isRecord(item)
    && typeof item['label'] === 'string'
    && typeof item['value'] === 'string'
    && (item['caption'] === undefined || typeof item['caption'] === 'string'));
}

function isBlogChartPoints(value: unknown): boolean {
  return Array.isArray(value) && value.every(point => isRecord(point)
    && typeof point['label'] === 'string'
    && typeof point['value'] === 'number'
    && Number.isFinite(point['value'])
    && (point['note'] === undefined || typeof point['note'] === 'string')
    && (point['series'] === undefined || typeof point['series'] === 'string'));
}

function isBlogChartDatasets(value: unknown): boolean {
  return Array.isArray(value) && value.every(dataset => isRecord(dataset)
    && typeof dataset['label'] === 'string'
    && Array.isArray(dataset['data'])
    && dataset['data'].every(item => item === null || (typeof item === 'number' && Number.isFinite(item)))
    && (dataset['borderColor'] === undefined || typeof dataset['borderColor'] === 'string')
    && (dataset['backgroundColor'] === undefined || typeof dataset['backgroundColor'] === 'string'));
}

function isBlogPollOptions(value: unknown): boolean {
  return Array.isArray(value) && value.every(option => isRecord(option)
    && typeof option['id'] === 'string'
    && typeof option['label'] === 'string');
}

function isBlogJsonObject(value: unknown): value is BlogJsonObject {
  return isRecord(value) && !Array.isArray(value) && Object.values(value).every(isBlogJsonValue);
}

function isBlogJsonValue(value: unknown): value is BlogJsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every(isBlogJsonValue);
  }

  return isBlogJsonObject(value);
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

  const status = value['status'];
  const scheduledAt = value['scheduledAt'];
  const hasValidSchedule = typeof scheduledAt === 'string'
    && scheduledAt.trim().length > 0
    && Number.isFinite(new Date(scheduledAt).getTime());
  const channel = value['channel'];
  const postFormat = value['postFormat'];

  return typeof value['id'] === 'string'
    && typeof channel === 'string'
    && blogSocialChannelSet.has(channel)
    && typeof value['message'] === 'string'
    && (hasValidSchedule || ((status === 'draft' || status === 'cancelled') && scheduledAt === undefined))
    && typeof status === 'string'
    && blogSocialAnnouncementStatusSet.has(status as BlogSocialAnnouncementStatus)
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
    && (
      postFormat === undefined
      || (
        typeof postFormat === 'string'
        && blogSocialPostFormatSet.has(postFormat)
        && isSocialPostFormatAllowed(channel as BlogSocialChannel, postFormat as BlogSocialPostFormat)
      )
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

export function isBlogEditorialMetadata(value: unknown): value is BlogEditorialMetadata | undefined {
  if (value === undefined) {
    return true;
  }

  if (!isRecord(value) || Array.isArray(value)) {
    return false;
  }

  const stringFields = [
    'evidenceSummary',
    'relationshipDisclosure',
    'aiAssistanceDisclosure',
    'syntheticMediaDisclosure',
    'updateNote',
  ];

  return (value['evidenceBasis'] === undefined
      || (typeof value['evidenceBasis'] === 'string'
        && blogEvidenceBasisSet.has(value['evidenceBasis'] as BlogEvidenceBasis)))
    && (value['sourceReviewedAt'] === undefined || isBlogEditorialSourceDate(value['sourceReviewedAt']))
    && stringFields.every(field => value[field] === undefined || typeof value[field] === 'string');
}

export function isBlogPost(value: unknown): value is BlogPost {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value['id'] === 'string'
    && (value['revision'] === undefined || (Number.isInteger(value['revision']) && Number(value['revision']) >= 0))
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
    && isBlogEditorialMetadata(value['editorial'])
    && value['contentFormat'] === 'editorjs'
    && Array.isArray(value['blocks'])
    && value['blocks'].every(isBlogContentBlock)
    && isBlogSocialPromotion(value['socialPromotion'])
    && isBlogCatCornerSettings(value['catCorner'])
    && isBlogPostPreview(value['preview'])
    && typeof value['createdAt'] === 'string'
    && typeof value['updatedAt'] === 'string'
    && (typeof value['publishedAt'] === 'string' || value['publishedAt'] === null);
}

/**
 * Write-time URL policy. Read-time structural validation remains permissive so
 * legacy posts can still render through the renderer's safe URL fallbacks.
 */
export function hasTrustedBlogPostUrls(post: BlogPost): boolean {
  if (!isBlogMediaUrl(post.coverImage)
    || !isOptionalBlogMediaUrl(post.backgroundImage)
    || !isOptionalBlogMediaUrl(post.thumbnailImage)
    || !isOptionalBlogMediaUrl(post.author.avatarUrl)
    || !isOptionalBlogNavigationUrl(post.author.profileUrl)
    || !isOptionalBlogHttpUrl(post.seo.canonical)
    || !isOptionalBlogMediaUrl(post.seo.openGraphImage)
    || !isOptionalBlogMediaUrl(post.og?.image)) {
    return false;
  }

  for (const announcement of post.socialPromotion?.announcements ?? []) {
    if (!isOptionalBlogHttpUrl(announcement.linkUrl) || !isOptionalBlogMediaUrl(announcement.mediaUrl)) {
      return false;
    }
  }

  return post.blocks.every(block => {
    const data = block.data;
    if (block.type === 'image' && !isBlogMediaUrl(data.url ?? '')) {
      return false;
    }
    if (block.type === 'gallery' && !(data.galleryImages ?? []).every(image => (
      isBlogMediaUrl(image.url)
      && !hasDisallowedInlineUrlProtocol(image.caption)
    ))) {
      return false;
    }
    if (block.type === 'embed' && !isBlogHttpUrl(data.embedUrl?.trim() || data.url?.trim() || '')) {
      return false;
    }
    if (!isOptionalBlogHttpUrl(data.sourceUrl)) {
      return false;
    }
    if (block.type !== 'code' && ['text', 'html', 'caption', 'description']
      .some(field => hasDisallowedInlineUrlProtocol(data[field as keyof typeof data]))) {
      return false;
    }
    return true;
  });
}
