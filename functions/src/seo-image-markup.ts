export interface SeoImageMarkupOptions {
  src: string;
  alt: string;
  loading: 'eager' | 'lazy';
  width?: number | null;
  height?: number | null;
  fetchPriority?: 'high' | 'low' | 'auto';
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function isPositiveInteger(value: number | null | undefined): value is number {
  return Number.isInteger(value) && (value ?? 0) > 0;
}

export function renderSeoImageMarkup(options: SeoImageMarkupOptions): string {
  const attributes = [
    `src="${escapeHtmlAttribute(options.src)}"`,
    `alt="${escapeHtmlAttribute(options.alt)}"`,
  ];

  if (isPositiveInteger(options.width) && isPositiveInteger(options.height)) {
    attributes.push(`width="${options.width}"`, `height="${options.height}"`);
  }

  attributes.push(`loading="${options.loading}"`, 'decoding="async"');

  if (options.fetchPriority) {
    attributes.push(`fetchpriority="${options.fetchPriority}"`);
  }

  return `<img ${attributes.join(' ')}>`;
}
