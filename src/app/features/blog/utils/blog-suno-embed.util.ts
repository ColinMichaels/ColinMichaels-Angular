export const SUNO_EMBED_HEIGHT = 240;
export const SUNO_HOST = 'suno.com';

const SUNO_SONG_ID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const SUNO_PATH_TYPES = new Set(['song', 'embed']);
const SUNO_HOSTS = new Set([SUNO_HOST, `www.${SUNO_HOST}`]);

export interface BlogSunoEmbedUrls {
  songId: string;
  songUrl: URL;
  embedUrl: URL;
}

export function getBlogSunoEmbedUrls(value: string | undefined): BlogSunoEmbedUrls | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const pathType = pathParts[0] ?? '';
    const songId = pathParts[1] ?? '';

    if (
      url.protocol !== 'https:'
      || !SUNO_HOSTS.has(url.hostname)
      || url.port
      || url.username
      || url.password
      || url.search
      || url.hash
      || pathParts.length !== 2
      || !SUNO_PATH_TYPES.has(pathType)
      || !SUNO_SONG_ID_PATTERN.test(songId)
    ) {
      return null;
    }

    const normalizedSongId = songId.toLowerCase();

    return {
      songId: normalizedSongId,
      songUrl: new URL(`https://${SUNO_HOST}/song/${normalizedSongId}`),
      embedUrl: new URL(`https://${SUNO_HOST}/embed/${normalizedSongId}`),
    };
  } catch {
    return null;
  }
}
