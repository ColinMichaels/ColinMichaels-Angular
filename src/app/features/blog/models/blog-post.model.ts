export type BlogPostStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export type BlogContentFormat = 'editorjs';

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

export const BLOG_CHART_TYPES = [
  'bar',
  'line',
] as const;

export type BlogChartType = typeof BLOG_CHART_TYPES[number];

export type BlogBlockType =
  'paragraph'
  | 'header'
  | 'image'
  | 'embed'
  | 'list'
  | 'quote'
  | 'code'
  | 'delimiter'
  | 'typography'
  | 'stats'
  | 'chart'
  | 'html';

export interface BlogStatItem {
  label: string;
  value: string;
  caption?: string;
}

export interface BlogChartPoint {
  label: string;
  value: number;
  note?: string;
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
}

export interface BlogPostPreview {
  token: string;
  createdAt: string;
  expiresAt: string;
}

export interface BlogBlockData {
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
  language?: string;
  code?: string;
  stretched?: boolean;
  withBorder?: boolean;
  withBackground?: boolean;
  imageLayout?: BlogImageLayout;
  variant?: BlogTypographyVariant;
  attribution?: string;
  stats?: readonly BlogStatItem[];
  chartType?: BlogChartType;
  chartPoints?: readonly BlogChartPoint[];
  unit?: string;
  html?: string;
}

export interface BlogContentBlock {
  id: string;
  type: BlogBlockType;
  data: BlogBlockData;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  thumbnailImage?: string;
  featured?: boolean;
  author: BlogAuthor;
  categories: readonly string[];
  subcategories?: readonly string[];
  tags: readonly string[];
  status: BlogPostStatus;
  seo: BlogSeoMetadata;
  og?: BlogOpenGraphMetadata;
  contentFormat: BlogContentFormat;
  blocks: readonly BlogContentBlock[];
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
  author: BlogAuthor;
  categories: readonly string[];
  subcategories?: readonly string[];
  tags: readonly string[];
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
