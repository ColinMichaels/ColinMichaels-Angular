export const BLOG_APP_EMBED_HOSTS = [
  'hear-the-hook.captaincolin.chatgpt.site',
] as const;

export const HEAR_THE_HOOK_EMBED_URL = 'https://hear-the-hook.captaincolin.chatgpt.site/soundboard';

export const DEFAULT_BLOG_APP_EMBED_HEIGHT = 700;
export const MIN_BLOG_APP_EMBED_HEIGHT = 360;
export const MAX_BLOG_APP_EMBED_HEIGHT = 2400;

const trustedAppEmbedHosts = new Set<string>(BLOG_APP_EMBED_HOSTS);
const trustedHearTheHookPaths = new Set(['/soundboard', '/soundboard.html']);

export function getTrustedBlogAppEmbedUrl(value: string | undefined): URL | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== 'https:'
      || !trustedAppEmbedHosts.has(url.hostname)
      || !trustedHearTheHookPaths.has(url.pathname)
      || url.username
      || url.password
      || url.search
    ) {
      return null;
    }

    return new URL(HEAR_THE_HOOK_EMBED_URL);
  } catch {
    return null;
  }
}

export function normalizeBlogAppEmbedHeight(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_BLOG_APP_EMBED_HEIGHT;
  }

  return Math.min(MAX_BLOG_APP_EMBED_HEIGHT, Math.max(MIN_BLOG_APP_EMBED_HEIGHT, Math.round(value)));
}
