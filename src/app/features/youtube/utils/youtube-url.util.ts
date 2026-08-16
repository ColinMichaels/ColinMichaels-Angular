const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{6,20}$/;

export function getYouTubeVideoId(value: string | undefined): string | null {
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

export function createYouTubeWatchUrl(value: string | undefined): string | null {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

export function createYouTubeEmbedUrl(value: string | undefined): string | null {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

export function createYouTubeThumbnailUrl(videoId: string): string | null {
  return YOUTUBE_VIDEO_ID_PATTERN.test(videoId)
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : null;
}
