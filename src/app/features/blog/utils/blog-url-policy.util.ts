export function isBlogHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isBlogSitePath(value: string): boolean {
  const normalized = value.trim();
  return (/^\/(?!\/)/.test(normalized) || /^assets\//i.test(normalized))
    && !/\b(?:javascript|vbscript|data)\s*:/i.test(normalized);
}

export function isBlogMediaUrl(value: string): boolean {
  const normalized = value.trim();
  return normalized.length > 0 && (isBlogHttpUrl(normalized) || isBlogSitePath(normalized));
}

export function isBlogNavigationUrl(value: string): boolean {
  const normalized = value.trim();
  return normalized.length > 0 && (isBlogHttpUrl(normalized) || isBlogSitePath(normalized));
}

export function isOptionalBlogHttpUrl(value: unknown): boolean {
  return value === undefined || value === null || value === ''
    || (typeof value === 'string' && isBlogHttpUrl(value));
}

export function isOptionalBlogNavigationUrl(value: unknown): boolean {
  return value === undefined || value === null || value === ''
    || (typeof value === 'string' && isBlogNavigationUrl(value));
}

export function isOptionalBlogMediaUrl(value: unknown): boolean {
  return value === undefined || value === null || value === ''
    || (typeof value === 'string' && isBlogMediaUrl(value));
}

export function hasDisallowedInlineUrlProtocol(value: unknown): boolean {
  return typeof value === 'string' && /\b(?:javascript|vbscript|data)\s*:/i.test(value);
}
