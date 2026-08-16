const DEFAULT_SITE_URL = 'https://colinmichaels.com';

/**
 * Extracts explicit external references from stored article content. Embed and
 * image destinations are deliberately ignored so media is not promoted to a
 * citation simply because it has a URL.
 */
export function collectExternalBlogCitationUrls(
  blocks: readonly unknown[],
  siteUrlValue = DEFAULT_SITE_URL
): readonly string[] {
  const siteUrl = new URL(siteUrlValue);
  const citations = new Set<string>();

  for (const block of blocks) {
    if (!isRecord(block) || !isRecord(block['data'])) {
      continue;
    }

    for (const candidate of collectBlockCandidates(block['data'])) {
      const url = toHttpUrl(candidate, siteUrl);

      if (!url || isPrimarySiteHost(url, siteUrl)) {
        continue;
      }

      citations.add(url.href);
    }
  }

  return [...citations];
}

function collectBlockCandidates(data: Record<string, unknown>): readonly string[] {
  const fragments = [
    data['text'],
    data['title'],
    data['caption'],
    data['attribution'],
    data['markdown'],
    data['html'],
    data['description'],
    data['accessibilitySummary'],
    ...collectListItemTexts(data),
    ...collectNestedTextFields(data['stats'], ['label', 'value', 'caption']),
    ...collectNestedTextFields(data['chartPoints'], ['label', 'note', 'series']),
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  const candidates = fragments.flatMap(extractLinkCandidates);
  const sourceUrl = getTrimmedString(data['sourceUrl']);

  if (sourceUrl) {
    candidates.push(sourceUrl);
  }

  return candidates;
}

function collectListItemTexts(data: Record<string, unknown>): readonly string[] {
  if (Array.isArray(data['listItems'])) {
    const values: string[] = [];
    const append = (items: readonly unknown[]): void => {
      for (const item of items) {
        if (!isRecord(item)) {
          continue;
        }
        const content = getTrimmedString(item['content']);
        if (content) {
          values.push(content);
        }
        if (Array.isArray(item['items'])) {
          append(item['items']);
        }
      }
    };
    append(data['listItems']);
    return values;
  }

  return Array.isArray(data['items'])
    ? data['items'].filter((value): value is string => typeof value === 'string')
    : [];
}

function collectNestedTextFields(value: unknown, fields: readonly string[]): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(item => {
    if (!isRecord(item)) {
      return [];
    }

    return fields
      .map(field => item[field])
      .filter((fieldValue): fieldValue is string => typeof fieldValue === 'string');
  });
}

function extractLinkCandidates(value: string): string[] {
  const candidates: string[] = [];

  for (const match of value.matchAll(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    candidates.push(match[1] ?? match[2] ?? match[3] ?? '');
  }

  for (const match of value.matchAll(/\]\(\s*<?(https?:\/\/[^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/gi)) {
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

function getTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
