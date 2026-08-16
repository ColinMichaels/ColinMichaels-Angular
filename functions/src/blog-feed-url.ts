export function createBlogFeedItemUrl(
  canonicalUrl: string,
  slug: string,
  siteUrl: string
): string {
  const fallbackUrl = new URL(`/blog/${slug.trim().replace(/^\/+/, '')}`, siteUrl).toString();
  const trimmedCanonicalUrl = canonicalUrl.trim();

  if (!trimmedCanonicalUrl) {
    return fallbackUrl;
  }

  try {
    const resolvedCanonicalUrl = new URL(trimmedCanonicalUrl, siteUrl);

    return resolvedCanonicalUrl.protocol === 'http:' || resolvedCanonicalUrl.protocol === 'https:'
      ? resolvedCanonicalUrl.toString()
      : fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}
