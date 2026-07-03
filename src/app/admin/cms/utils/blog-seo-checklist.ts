import {BlogContentBlock} from '../../../features/blog/models/blog-post.model';
import {SITE_URL} from '../../../shared/seo/seo.metadata';

export type SeoChecklistStatus = 'pass' | 'warning' | 'fail';

export interface SeoChecklistInput {
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  categories: readonly string[];
  tags: readonly string[];
  seoTitle: string;
  seoDescription: string;
  canonical: string;
  generatedCanonicalUrl: string;
  openGraphImage: string;
  blocks: readonly BlogContentBlock[];
}

export interface SeoChecklistItem {
  id: string;
  label: string;
  description: string;
  status: SeoChecklistStatus;
  metric?: string;
}

export interface SeoChecklistSummary {
  passCount: number;
  warningCount: number;
  failCount: number;
  items: readonly SeoChecklistItem[];
}

const IDEAL_TITLE_MIN_LENGTH = 30;
const IDEAL_TITLE_MAX_LENGTH = 60;
const IDEAL_DESCRIPTION_MIN_LENGTH = 120;
const IDEAL_DESCRIPTION_MAX_LENGTH = 160;

export function createSeoChecklist(input: SeoChecklistInput): SeoChecklistSummary {
  const items: readonly SeoChecklistItem[] = [
    createTitleCheck(input.seoTitle || input.title),
    createDescriptionCheck(input.seoDescription || input.excerpt),
    createSlugCheck(input.slug),
    createCanonicalCheck(input.canonical, input.generatedCanonicalUrl),
    createCoverImageCheck(input.coverImage),
    createOpenGraphImageCheck(input.openGraphImage, input.coverImage),
    createCategoryCheck(input.categories),
    createTagCheck(input.tags),
    createInlineImageAltCheck(input.blocks),
    createHeadingCheck(input.blocks),
  ];

  return {
    passCount: items.filter(item => item.status === 'pass').length,
    warningCount: items.filter(item => item.status === 'warning').length,
    failCount: items.filter(item => item.status === 'fail').length,
    items,
  };
}

export function createSearchPreviewTitle(input: Pick<SeoChecklistInput, 'seoTitle' | 'title'>): string {
  return stripHtml(input.seoTitle || input.title || 'Untitled Post');
}

export function createSearchPreviewDescription(input: Pick<SeoChecklistInput, 'seoDescription' | 'excerpt'>): string {
  return stripHtml(input.seoDescription || input.excerpt || 'No description set.');
}

export function createSocialPreviewImage(input: Pick<SeoChecklistInput, 'openGraphImage' | 'coverImage'>): string {
  return input.openGraphImage.trim() || input.coverImage.trim();
}

function createTitleCheck(value: string): SeoChecklistItem {
  const title = stripHtml(value);
  const length = title.length;

  if (!title) {
    return createItem('title', 'SEO title', 'Add a search/share title before publishing.', 'fail');
  }

  if (length < IDEAL_TITLE_MIN_LENGTH || length > IDEAL_TITLE_MAX_LENGTH) {
    return createItem('title', 'SEO title', 'A stronger title usually lands between 30 and 60 characters to reduce SERP truncation.', 'warning', `${length} chars`);
  }

  return createItem('title', 'SEO title', 'Title length is in the preferred range.', 'pass', `${length} chars`);
}

function createDescriptionCheck(value: string): SeoChecklistItem {
  const description = stripHtml(value);
  const length = description.length;

  if (!description) {
    return createItem('description', 'SEO description', 'Add a concise meta description before publishing.', 'fail');
  }

  if (length < IDEAL_DESCRIPTION_MIN_LENGTH || length > IDEAL_DESCRIPTION_MAX_LENGTH) {
    return createItem('description', 'SEO description', 'A stronger description usually lands between 120 and 160 characters to reduce SERP truncation.', 'warning', `${length} chars`);
  }

  return createItem('description', 'SEO description', 'Description length is in the preferred range.', 'pass', `${length} chars`);
}

function createSlugCheck(value: string): SeoChecklistItem {
  const slug = value.trim();

  if (!slug) {
    return createItem('slug', 'Slug', 'Add a stable URL slug before publishing.', 'fail');
  }

  if (slug !== createSlug(slug)) {
    return createItem('slug', 'Slug', 'Normalize the slug to lowercase words separated by hyphens.', 'warning', slug);
  }

  return createItem('slug', 'Slug', 'Slug is URL-friendly.', 'pass', slug);
}

function createCanonicalCheck(value: string, generatedCanonicalUrl: string): SeoChecklistItem {
  const canonical = value.trim();

  if (!canonical) {
    return createItem('canonical', 'Canonical URL', 'Use the generated canonical URL or provide a valid override.', 'fail');
  }

  try {
    const canonicalUrl = new URL(canonical);
    const siteUrl = new URL(SITE_URL);

    if (canonicalUrl.protocol !== 'https:') {
      return createItem('canonical', 'Canonical URL', 'Canonical URLs should use HTTPS.', 'warning', canonical);
    }

    if (canonicalUrl.hostname !== siteUrl.hostname) {
      return createItem('canonical', 'Canonical URL', 'This canonical points away from the primary site. Confirm this is intentional.', 'warning', canonical);
    }

    if (canonical !== generatedCanonicalUrl) {
      return createItem('canonical', 'Canonical URL', 'Using a custom canonical URL on the primary site.', 'pass', canonical);
    }

    return createItem('canonical', 'Canonical URL', 'Using the generated canonical URL.', 'pass', canonical);
  } catch {
    return createItem('canonical', 'Canonical URL', 'Canonical must be a valid absolute URL.', 'fail', canonical);
  }
}

function createCoverImageCheck(value: string): SeoChecklistItem {
  return value.trim()
    ? createItem('cover-image', 'Cover image', 'Cover image is set for cards and article hero display.', 'pass')
    : createItem('cover-image', 'Cover image', 'Add a cover image before publishing.', 'fail');
}

function createOpenGraphImageCheck(openGraphImage: string, coverImage: string): SeoChecklistItem {
  const socialImage = openGraphImage.trim();
  const fallbackImage = coverImage.trim();

  if (isWebpImageUrl(socialImage)) {
    return createItem('open-graph-image', 'Social image', 'Use a JPEG or PNG Open Graph image. WebP can fail social crawler previews.', 'fail', socialImage);
  }

  if (socialImage && socialImage !== fallbackImage) {
    return createItem('open-graph-image', 'Social image', 'Custom Open Graph image is set.', 'pass');
  }

  if (isWebpImageUrl(fallbackImage)) {
    return createItem('open-graph-image', 'Social image', 'Add a JPEG or PNG Open Graph image. The cover image fallback is WebP.', 'warning', fallbackImage);
  }

  if (fallbackImage) {
    return createItem('open-graph-image', 'Social image', 'Social previews will fall back to the cover image.', 'warning');
  }

  return createItem('open-graph-image', 'Social image', 'Add a cover or Open Graph image for social previews.', 'fail');
}

function isWebpImageUrl(value: string): boolean {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  try {
    return new URL(trimmedValue, 'https://colinmichaels.com').pathname.toLowerCase().endsWith('.webp');
  } catch {
    return trimmedValue.split('?')[0].split('#')[0].toLowerCase().endsWith('.webp');
  }
}

function createCategoryCheck(values: readonly string[]): SeoChecklistItem {
  return values.length > 0
    ? createItem('categories', 'Categories', 'At least one category is set.', 'pass', values.join(', '))
    : createItem('categories', 'Categories', 'Add at least one broad category for navigation and sitemap taxonomy.', 'fail');
}

function createTagCheck(values: readonly string[]): SeoChecklistItem {
  return values.length > 0
    ? createItem('tags', 'Tags', 'Tags are set for topic archives and related discovery.', 'pass', values.join(', '))
    : createItem('tags', 'Tags', 'Add a few specific tags for topic discovery.', 'warning');
}

function createInlineImageAltCheck(blocks: readonly BlogContentBlock[]): SeoChecklistItem {
  const imageBlocks = blocks.filter(block => block.type === 'image' && block.data.url?.trim());
  const missingAltCount = imageBlocks.filter(block => !block.data.alt?.trim()).length;

  if (imageBlocks.length === 0) {
    return createItem('image-alt', 'Inline image alt text', 'No inline images need alt text yet.', 'pass');
  }

  if (missingAltCount > 0) {
    return createItem('image-alt', 'Inline image alt text', `${missingAltCount} inline image${missingAltCount === 1 ? '' : 's'} missing alt text.`, 'warning');
  }

  return createItem('image-alt', 'Inline image alt text', 'All inline images include alt text.', 'pass', `${imageBlocks.length} image${imageBlocks.length === 1 ? '' : 's'}`);
}

function createHeadingCheck(blocks: readonly BlogContentBlock[]): SeoChecklistItem {
  const headingCount = blocks.filter(block => block.type === 'header' && block.data.text?.trim()).length;

  if (headingCount === 0) {
    return createItem('headings', 'Headings', 'Add section headings for scanability and table-of-contents generation.', 'warning');
  }

  return createItem('headings', 'Headings', 'Section headings are available for article navigation.', 'pass', `${headingCount} heading${headingCount === 1 ? '' : 's'}`);
}

function createItem(
  id: string,
  label: string,
  description: string,
  status: SeoChecklistStatus,
  metric?: string
): SeoChecklistItem {
  return {
    id,
    label,
    description,
    status,
    metric,
  };
}

function createSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-post';
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
