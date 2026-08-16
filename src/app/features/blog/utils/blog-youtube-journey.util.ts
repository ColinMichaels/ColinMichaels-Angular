import type {BlogContentBlock, BlogPostSummary} from '../models/blog-post.model';
import {getBlogTaxonomyTerms} from './blog-category-url.util';
import {
  createYouTubeEmbedUrl,
  createYouTubeThumbnailUrl,
  createYouTubeWatchUrl,
  getYouTubeVideoId,
} from '../../youtube/utils/youtube-url.util';

export interface BlogCompanionVideo {
  videoId: string;
  videoUrl: string;
  thumbnailUrl: string;
}

export interface BlogCompanionVideoSchema {
  name: string;
  description: string;
  thumbnailUrl: readonly string[];
  uploadDate: string;
  embedUrl: string;
  url: string;
  duration?: string;
}

const DRONE_YOUTUBE_TERMS = [
  'drone',
  'drones',
  'fpv',
  'first person view',
  'uav',
  'quadcopter',
  'multicopter',
  'evtol',
  'aerial photography',
  'drone photography',
] as const;

function normalizeJourneyTerm(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function explicitTermMatches(value: string, term: string): boolean {
  const normalizedValue = normalizeJourneyTerm(value);

  return term.includes(' ')
    ? normalizedValue.includes(term)
    : normalizedValue.split(' ').includes(term);
}

/**
 * Keeps the article-to-video continuation limited to explicitly classified
 * drone content. Title and excerpt mentions are intentionally excluded so an
 * incidental reference does not turn into an unrelated channel promotion.
 */
export function shouldShowDroneYouTubeJourney(
  post: Pick<BlogPostSummary, 'categories' | 'subcategories' | 'tags'>,
  primaryTopicSlug = ''
): boolean {
  if (primaryTopicSlug.trim().toLowerCase() === 'drones-fpv') {
    return true;
  }

  const explicitTerms = [
    ...getBlogTaxonomyTerms(post),
    ...post.tags,
  ];

  return explicitTerms.some(value => (
    DRONE_YOUTUBE_TERMS.some(term => explicitTermMatches(value, term))
  ));
}

export function selectBlogCompanionVideo(
  blocks: readonly BlogContentBlock[]
): BlogCompanionVideo | null {
  for (const block of blocks) {
    if (block.type !== 'embed'
      || block.data.provider !== 'youtube'
      || block.data.isCompanionVideo !== true) {
      continue;
    }

    const sourceUrl = block.data.url ?? block.data.embedUrl;
    const fallbackUrl = block.data.embedUrl ?? block.data.url;
    const videoId = getYouTubeVideoId(sourceUrl) ?? getYouTubeVideoId(fallbackUrl);
    const videoUrl = createYouTubeWatchUrl(sourceUrl) ?? createYouTubeWatchUrl(fallbackUrl);
    const thumbnailUrl = videoId ? createYouTubeThumbnailUrl(videoId) : null;

    if (videoId && videoUrl && thumbnailUrl) {
      return {videoId, videoUrl, thumbnailUrl};
    }
  }

  return null;
}

/**
 * Returns schema input only when an editor has supplied the complete public
 * YouTube identity. Legacy companion blocks still render, but never receive
 * guessed structured-data fields.
 */
export function selectBlogCompanionVideoSchema(
  blocks: readonly BlogContentBlock[]
): BlogCompanionVideoSchema | null {
  for (const block of blocks) {
    if (block.type !== 'embed'
      || block.data.provider !== 'youtube'
      || block.data.isCompanionVideo !== true) {
      continue;
    }

    const sourceUrl = block.data.url ?? block.data.embedUrl;
    const fallbackUrl = block.data.embedUrl ?? block.data.url;
    const videoId = getYouTubeVideoId(sourceUrl) ?? getYouTubeVideoId(fallbackUrl);
    const url = createYouTubeWatchUrl(sourceUrl) ?? createYouTubeWatchUrl(fallbackUrl);
    const embedUrl = createYouTubeEmbedUrl(sourceUrl) ?? createYouTubeEmbedUrl(fallbackUrl);
    const thumbnail = videoId ? createYouTubeThumbnailUrl(videoId) : null;
    const name = block.data.videoTitle?.trim() ?? '';
    const description = block.data.videoDescription?.trim() ?? '';
    const uploadDate = block.data.videoUploadDate?.trim() ?? '';

    if (!videoId || !url || !embedUrl || !thumbnail || !name || !description || !isVideoUploadDate(uploadDate)) {
      return null;
    }

    const duration = createIsoVideoDuration(block.data.videoDurationSeconds);

    return {
      name,
      description,
      thumbnailUrl: [thumbnail],
      uploadDate,
      embedUrl,
      url,
      ...(duration ? {duration} : {}),
    };
  }

  return null;
}

export function createIsoVideoDuration(seconds: number | undefined): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  return `PT${hours > 0 ? `${hours}H` : ''}${minutes > 0 ? `${minutes}M` : ''}${remainingSeconds > 0 ? `${remainingSeconds}S` : ''}`;
}

export function isVideoUploadDate(value: string): boolean {
  const trimmedValue = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    const [year, month, day] = trimmedValue.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
  }

  return /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(trimmedValue)
    && Number.isFinite(Date.parse(trimmedValue));
}
