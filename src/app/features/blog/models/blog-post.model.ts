import {BlogSocialPromotion} from './blog-social-promotion.model';
import {DEFAULT_AUTHOR_ID, DEFAULT_AUTHOR_SLUG} from '../../authors/authors.constants';

export type BlogPostStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export type BlogContentFormat = 'editorjs';

export const BLOG_BLOCK_PLACEMENTS = [
  'content',
  'rail',
] as const;

export type BlogBlockPlacement = typeof BLOG_BLOCK_PLACEMENTS[number];

export interface BlogCatCornerSettings {
  enabled: boolean;
  discoveryPost: boolean;
}

export const BLOG_TYPOGRAPHY_VARIANTS = [
  'lead',
  'sectionIntro',
  'pullQuote',
  'keyTakeaway',
  'callout',
  'warning',
  'aside',
  'caption',
  'eyebrow',
] as const;

export type BlogTypographyVariant = typeof BLOG_TYPOGRAPHY_VARIANTS[number];

export const BLOG_IMAGE_LAYOUTS = [
  'fullWidth',
  'contained',
  'inlineStart',
  'inlineEnd',
] as const;

export type BlogImageLayout = typeof BLOG_IMAGE_LAYOUTS[number];

export const BLOG_IMAGE_SIZES = [
  'small',
  'medium',
  'large',
  'wide',
] as const;

export type BlogImageSize = typeof BLOG_IMAGE_SIZES[number];

export type BlogJsonPrimitive = string | number | boolean | null;

export type BlogJsonValue = BlogJsonPrimitive | BlogJsonObject | readonly BlogJsonValue[];

export interface BlogJsonObject {
  readonly [key: string]: BlogJsonValue;
}

export const BLOG_LIST_STYLES = [
  'unordered',
  'ordered',
  'checklist',
] as const;

export type BlogListStyle = typeof BLOG_LIST_STYLES[number];

export const BLOG_LIST_PRESENTATIONS = [
  'standard',
  'steps',
] as const;

export type BlogListPresentation = typeof BLOG_LIST_PRESENTATIONS[number];

export interface BlogListItem {
  content: string;
  meta: BlogJsonObject;
  items: readonly BlogListItem[];
}

export interface BlogUnsupportedBlockEnvelope {
  originalType: string;
  originalData: BlogJsonObject;
  originalTunes?: BlogJsonObject;
}

export const BLOG_CHART_TYPES = [
  'bar',
  'line',
] as const;

export type BlogChartType = typeof BLOG_CHART_TYPES[number];

export const BLOG_POLL_RESULTS_VISIBILITIES = [
  'afterVote',
  'always',
  'hidden',
] as const;

export type BlogPollResultsVisibility = typeof BLOG_POLL_RESULTS_VISIBILITIES[number];

export type BlogBlockType =
  'paragraph'
  | 'header'
  | 'image'
  | 'embed'
  | 'list'
  | 'quote'
  | 'code'
  | 'markdown'
  | 'delimiter'
  | 'typography'
  | 'stats'
  | 'chart'
  | 'poll'
  | 'catCornerUnlock'
  | 'html'
  | 'unsupported';

export interface BlogStatItem {
  label: string;
  value: string;
  caption?: string;
}

export interface BlogChartPoint {
  label: string;
  value: number;
  note?: string;
  series?: string;
}

export interface BlogChartDataset {
  label: string;
  data: readonly (number | null)[];
  borderColor?: string;
  backgroundColor?: string;
}

export interface BlogPollOption {
  id: string;
  label: string;
}

export interface BlogSeoMetadata {
  title: string;
  description: string;
  metaTitle?: string;
  metaDescription?: string;
  canonical?: string;
  openGraphImage?: string;
  openGraphImageWidth?: number;
  openGraphImageHeight?: number;
}

export interface BlogOpenGraphMetadata {
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
}

export interface BlogAuthor {
  name: string;
  title?: string;
  bio?: string;
  avatarUrl?: string;
  profileUrl?: string;
  slug?: string;
}

export interface BlogPostPreview {
  token: string;
  createdAt: string;
  expiresAt: string;
}

export interface BlogBlockData {
  placement?: BlogBlockPlacement;
  title?: string;
  text?: string;
  level?: 2 | 3;
  url?: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  provider?: string;
  embedUrl?: string;
  items?: readonly string[];
  ordered?: boolean;
  listStyle?: BlogListStyle;
  listPresentation?: BlogListPresentation;
  listMeta?: BlogJsonObject;
  listItems?: readonly BlogListItem[];
  language?: string;
  code?: string;
  markdown?: string;
  stretched?: boolean;
  withBorder?: boolean;
  withBackground?: boolean;
  imageLayout?: BlogImageLayout;
  imageSize?: BlogImageSize;
  variant?: BlogTypographyVariant;
  attribution?: string;
  stats?: readonly BlogStatItem[];
  chartType?: BlogChartType;
  chartPoints?: readonly BlogChartPoint[];
  labels?: readonly string[];
  datasets?: readonly BlogChartDataset[];
  unit?: string;
  xAxisTitle?: string;
  yAxisTitle?: string;
  yMax?: number;
  valueSuffix?: string;
  decimals?: number;
  showLegend?: boolean;
  sourceLabel?: string;
  sourceUrl?: string;
  accessibilitySummary?: string;
  question?: string;
  description?: string;
  pollOptions?: readonly BlogPollOption[];
  pollResultsVisibility?: BlogPollResultsVisibility;
  html?: string;
  unsupportedBlock?: BlogUnsupportedBlockEnvelope;
}

export interface BlogContentBlock {
  id: string;
  type: BlogBlockType;
  data: BlogBlockData;
  editorTunes?: BlogJsonObject;
}

/**
 * Returns list item text in visual reading order for both legacy flat lists and
 * recursive Editor.js list/checklist data.
 */
export function getBlogListItemTexts(data: BlogBlockData): readonly string[] {
  if (data.listItems) {
    const texts: string[] = [];

    const appendItems = (items: readonly BlogListItem[]): void => {
      for (const item of items) {
        texts.push(item.content);
        appendItems(item.items);
      }
    };

    appendItems(data.listItems);

    return texts;
  }

  return data.items ?? [];
}

export interface BlogPost {
  id: string;
  /** Monotonic Firestore write revision. Missing legacy values are treated as revision 0. */
  revision?: number;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  backgroundImage?: string;
  thumbnailImage?: string;
  featured?: boolean;
  authorId?: string;
  author: BlogAuthor;
  categories: readonly string[];
  subcategories?: readonly string[];
  tags: readonly string[];
  status: BlogPostStatus;
  seo: BlogSeoMetadata;
  og?: BlogOpenGraphMetadata;
  contentFormat: BlogContentFormat;
  blocks: readonly BlogContentBlock[];
  socialPromotion?: BlogSocialPromotion;
  catCorner?: BlogCatCornerSettings;
  preview?: BlogPostPreview;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  thumbnailImage?: string;
  featured?: boolean;
  authorId?: string;
  author: BlogAuthor;
  categories: readonly string[];
  subcategories?: readonly string[];
  tags: readonly string[];
  catCorner?: BlogCatCornerSettings;
  publishedAt: string | null;
  updatedAt: string;
}

export interface BlogAdminStats {
  total: number;
  published: number;
  drafts: number;
  scheduled: number;
  archived: number;
}

export function normalizeBlogAuthor(
  author: BlogAuthor | undefined,
  authorId?: string
): {authorId: string; author: BlogAuthor} {
  const name = author?.name?.trim() || 'Colin Michaels';
  const resolvedAuthorId = authorId?.trim() || (
    name.toLowerCase() === 'colin michaels' ? DEFAULT_AUTHOR_ID : `legacy-${createAuthorKey(name)}`
  );

  return {
    authorId: resolvedAuthorId,
    author: {
      ...author,
      name,
      slug: author?.slug?.trim() || (resolvedAuthorId === DEFAULT_AUTHOR_ID ? DEFAULT_AUTHOR_SLUG : createAuthorKey(name)),
      title: author?.title?.trim() || undefined,
      bio: author?.bio?.trim() || undefined,
      avatarUrl: author?.avatarUrl?.trim() || undefined,
      profileUrl: author?.profileUrl?.trim() || undefined,
    },
  };
}

function createAuthorKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'author';
}

export function isCatCornerPost(post: Pick<BlogPost, 'catCorner'>): boolean {
  return post.catCorner?.enabled === true;
}

export function isCatCornerDiscoveryPost(post: Pick<BlogPost, 'catCorner'>): boolean {
  return isCatCornerPost(post) && post.catCorner?.discoveryPost === true;
}

export function isPublicBlogListingPost(post: Pick<BlogPost, 'catCorner'>): boolean {
  return !isCatCornerPost(post) || isCatCornerDiscoveryPost(post);
}

export function normalizeBlogCatCornerSettings(
  settings: BlogCatCornerSettings | undefined
): BlogCatCornerSettings | undefined {
  if (!settings) {
    return undefined;
  }

  const enabled = settings.enabled === true;

  return {
    enabled,
    discoveryPost: enabled && settings.discoveryPost === true,
  };
}
