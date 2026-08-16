export interface SeoFallbackCollectionItem {
  title: string;
  url: string;
  description: string;
  publishedAt?: string;
}

export interface SeoFallbackLink {
  href: string;
  label: string;
  description?: string;
}

export function renderSeoFallbackLinkList(links: readonly SeoFallbackLink[]): string {
  if (links.length === 0) {
    return '';
  }

  return [
    '<ul class="seo-fallback-list">',
    ...links.map(link => (
      `  <li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>${link.description ? ` - ${escapeHtml(link.description)}` : ''}</li>`
    )),
    '</ul>',
  ].join('\n');
}

export function renderSeoArticleContinuationFallbackHtml(options: {
  heading: string;
  href: string;
  label: string;
  description: string;
}): string {
  return [
    '  <aside aria-label="Continue exploring this topic">',
    `    <h2>${escapeHtml(options.heading)}</h2>`,
    `    <p><a href="${escapeHtml(options.href)}">${escapeHtml(options.label)}</a> - ${escapeHtml(options.description)}</p>`,
    '  </aside>',
  ].join('\n');
}

export function replaceAppRootFallback(template: string, fallbackHtml: string): string {
  return template.replace(
    /<app-root(?:\s[^>]*)?>[\s\S]*?<\/app-root>/i,
    `<app-root>\n${fallbackHtml}\n</app-root>`
  );
}

interface SeoFallbackSection {
  heading: string;
  paragraphs?: readonly string[];
  links?: readonly SeoFallbackLink[];
}

interface SeoFallbackIdentity {
  siteName: string;
  siteUrl: string;
  publisherName: string;
}

export function renderSeoCollectionFallbackHtml(options: {
  eyebrow: string;
  heading: string;
  description: string;
  totalItems: number;
  items: readonly SeoFallbackCollectionItem[];
  emptyMessage: string;
}): string {
  const itemCards = options.items.map(item => [
    '<article class="seo-fallback-card">',
    `  <h2><a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a></h2>`,
    item.publishedAt ? `  <p class="seo-fallback-meta">${escapeHtml(formatFallbackDate(item.publishedAt))}</p>` : '',
    item.description ? `  <p>${escapeHtml(item.description)}</p>` : '',
    '</article>',
  ].filter(Boolean).join('\n')).join('\n');
  const itemLabel = options.totalItems === 1 ? 'published article' : 'published articles';

  return renderSeoFallbackShell({
    eyebrow: options.eyebrow,
    heading: options.heading,
    description: options.description,
    body: [
      `<p class="seo-fallback-meta">${options.totalItems} ${itemLabel}</p>`,
      itemCards || `<p>${escapeHtml(options.emptyMessage)}</p>`,
    ].join('\n'),
  });
}

export function renderSeoStaticFallbackHtml(options: {
  eyebrow: string;
  heading: string;
  description: string;
  sections: readonly SeoFallbackSection[];
}): string {
  const sections = options.sections.map(section => {
    const paragraphs = (section.paragraphs ?? [])
      .map(paragraph => `  <p>${escapeHtml(paragraph)}</p>`)
      .join('\n');
    const links = renderSeoFallbackLinkList(section.links ?? []);

    return [
      '<section class="seo-fallback-article">',
      `  <h2>${escapeHtml(section.heading)}</h2>`,
      paragraphs,
      links,
      '</section>',
    ].filter(Boolean).join('\n');
  }).join('\n');

  return renderSeoFallbackShell({
    eyebrow: options.eyebrow,
    heading: options.heading,
    description: options.description,
    body: sections,
  });
}

export function createCollectionPageStructuredData(options: SeoFallbackIdentity & {
  url: string;
  name: string;
  description: string;
  items: readonly SeoFallbackCollectionItem[];
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: options.name,
    description: options.description,
    url: options.url,
    isPartOf: createWebsiteReference(options),
    publisher: createPublisherReference(options),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: options.items.length,
      itemListElement: options.items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.title,
        url: item.url,
      })),
    },
  };
}

export function createWebPageStructuredData(options: SeoFallbackIdentity & {
  url: string;
  name: string;
  description: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: options.name,
    description: options.description,
    url: options.url,
    isPartOf: createWebsiteReference(options),
    publisher: createPublisherReference(options),
  };
}

function renderSeoFallbackShell(options: {
  eyebrow: string;
  heading: string;
  description: string;
  body: string;
}): string {
  return [
    '<main class="seo-fallback">',
    `  <p class="seo-fallback-eyebrow">${escapeHtml(options.eyebrow)}</p>`,
    `  <h1>${escapeHtml(options.heading)}</h1>`,
    `  <p class="seo-fallback-description">${escapeHtml(options.description)}</p>`,
    options.body,
    '</main>',
  ].join('\n');
}

function createWebsiteReference(identity: SeoFallbackIdentity): Record<string, string> {
  return {
    '@type': 'WebSite',
    '@id': `${identity.siteUrl}/#website`,
    name: identity.siteName,
    url: identity.siteUrl,
  };
}

function createPublisherReference(identity: SeoFallbackIdentity): Record<string, string> {
  return {
    '@type': 'Person',
    '@id': `${identity.siteUrl}/#person`,
    name: identity.publisherName,
    url: identity.siteUrl,
  };
}

function formatFallbackDate(value: string): string {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(timestamp));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
