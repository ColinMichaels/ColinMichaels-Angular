const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{6,20}$/;

export interface BlogVideoSchemaBlock {
  type: string;
  data: {
    provider?: string;
    url?: string;
    embedUrl?: string;
    isCompanionVideo?: boolean;
    videoTitle?: string;
    videoDescription?: string;
    videoUploadDate?: string;
    videoDurationSeconds?: number;
  };
}

export interface BlogVideoObjectJsonLd extends Record<string, unknown> {
  '@type': 'VideoObject';
  name: string;
  description: string;
  thumbnailUrl: readonly string[];
  uploadDate: string;
  embedUrl: string;
  url: string;
  duration?: string;
}

/**
 * Builds crawler-visible VideoObject data only from a complete, explicitly
 * selected YouTube companion. Missing metadata is never inferred from the
 * article or post dates.
 */
export function createBlogCompanionVideoJsonLd(
  blocks: readonly BlogVideoSchemaBlock[]
): BlogVideoObjectJsonLd | null {
  for (const block of blocks) {
    if (block.type !== 'embed'
      || block.data.provider !== 'youtube'
      || block.data.isCompanionVideo !== true) {
      continue;
    }

    const videoId = getYouTubeVideoId(block.data.url) ?? getYouTubeVideoId(block.data.embedUrl);
    const name = block.data.videoTitle?.trim() ?? '';
    const description = block.data.videoDescription?.trim() ?? '';
    const uploadDate = block.data.videoUploadDate?.trim() ?? '';

    if (!videoId || !name || !description || !isVideoUploadDate(uploadDate)) {
      return null;
    }

    const duration = createIsoVideoDuration(block.data.videoDurationSeconds);

    return {
      '@type': 'VideoObject',
      name,
      description,
      thumbnailUrl: [`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`],
      uploadDate,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      url: `https://www.youtube.com/watch?v=${videoId}`,
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

function getYouTubeVideoId(value: string | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    let videoId = '';

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }

    if (url.hostname === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] ?? '';
    } else if (YOUTUBE_HOSTS.has(url.hostname)) {
      const pathParts = url.pathname.split('/').filter(Boolean);
      videoId = url.searchParams.get('v') ?? '';

      if (!videoId && ['embed', 'shorts', 'live'].includes(pathParts[0] ?? '')) {
        videoId = pathParts[1] ?? '';
      }
    }

    return YOUTUBE_VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}
