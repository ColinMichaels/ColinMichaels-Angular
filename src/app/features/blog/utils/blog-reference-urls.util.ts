import {
  BlogBlockData,
  BlogContentBlock,
  getBlogListItemTexts,
} from '../models/blog-post.model';
import {SITE_URL} from '../../../shared/seo/seo.metadata';

export interface BlogReferenceUrls {
  externalReferenceUrls: readonly string[];
  contextualArticleUrls: readonly string[];
}

/**
 * Collects only explicit references written into article content. Media/embed
 * destinations are intentionally excluded so a video or image is never
 * promoted to a citation merely because it has a URL.
 */
export function collectBlogReferenceUrls(
  blocks: readonly BlogContentBlock[],
  currentSlug = ''
): BlogReferenceUrls {
  const siteUrl = new URL(SITE_URL);
  const externalReferenceUrls = new Set<string>();
  const contextualArticleUrls = new Set<string>();
  const currentArticlePath = currentSlug.trim()
    ? `/blog/${currentSlug.trim().toLowerCase()}`
    : '';

  for (const block of blocks) {
    for (const candidate of collectBlockLinkCandidates(block.data)) {
      const url = toHttpUrl(candidate, siteUrl);

      if (!url) {
        continue;
      }

      if (isPrimarySiteHost(url, siteUrl)) {
        const normalizedPath = url.pathname.replace(/\/$/, '').toLowerCase();

        if (isArticlePath(normalizedPath) && normalizedPath !== currentArticlePath) {
          contextualArticleUrls.add(url.href);
        }

        continue;
      }

      externalReferenceUrls.add(url.href);
    }
  }

  return {
    externalReferenceUrls: [...externalReferenceUrls],
    contextualArticleUrls: [...contextualArticleUrls],
  };
}

function collectBlockLinkCandidates(data: BlogBlockData): readonly string[] {
  const fragments = [
    data.text,
    data.title,
    data.caption,
    data.attribution,
    data.markdown,
    data.html,
    data.description,
    data.accessibilitySummary,
    ...getBlogListItemTexts(data),
    ...(data.stats ?? []).flatMap(item => [item.label, item.value, item.caption]),
    ...(data.chartPoints ?? []).flatMap(point => [point.label, point.note, point.series]),
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  const candidates = fragments.flatMap(extractLinkCandidates);

  if (data.sourceUrl?.trim()) {
    candidates.push(data.sourceUrl.trim());
  }

  return candidates;
}

function extractLinkCandidates(value: string): string[] {
  const candidates: string[] = [];

  for (const match of value.matchAll(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    candidates.push(match[1] ?? match[2] ?? match[3] ?? '');
  }

  for (const match of value.matchAll(/\]\(\s*<?((?:https?:\/\/|\/blog\/)[^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/gi)) {
    candidates.push(match[1] ?? '');
  }

  for (const match of value.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    candidates.push(match[0]);
  }

  return candidates
    .map(candidate => candidate
      .replace(/&amp;/gi, '&')
      .replace(/^[<(]+/, '')
      .replace(/[),.;:!?\]}]+$/, '')
      .trim())
    .filter(Boolean);
}

function toHttpUrl(value: string, siteUrl: URL): URL | null {
  try {
    const url = new URL(value, siteUrl);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

function isPrimarySiteHost(url: URL, siteUrl: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  const siteHostname = siteUrl.hostname.toLowerCase();
  return hostname === siteHostname || hostname === `www.${siteHostname}`;
}

function isArticlePath(pathname: string): boolean {
  return /^\/blog\/[^/]+$/.test(pathname);
}
