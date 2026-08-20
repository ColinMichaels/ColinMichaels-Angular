export interface CampaignUrlOptions {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
}

/**
 * Adds a compact, consistent UTM contract to a public URL without changing
 * its path, fragment, or unrelated query parameters.
 */
export function createCampaignUrl(url: string, options: CampaignUrlOptions): string {
  const parsedUrl = new URL(url);

  parsedUrl.searchParams.set('utm_source', normalizeUtmValue(options.source));
  parsedUrl.searchParams.set('utm_medium', normalizeUtmValue(options.medium));
  parsedUrl.searchParams.set('utm_campaign', normalizeUtmValue(options.campaign));

  const content = normalizeUtmValue(options.content ?? '');
  if (content) {
    parsedUrl.searchParams.set('utm_content', content);
  } else {
    parsedUrl.searchParams.delete('utm_content');
  }

  return parsedUrl.toString();
}

function normalizeUtmValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}
