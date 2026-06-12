export type BlogPostStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export type BlogContentFormat = 'editorjs';

export const BLOG_TYPOGRAPHY_VARIANTS = [
  'lead',
  'pullQuote',
  'callout',
  'aside',
  'caption',
  'eyebrow',
] as const;

export type BlogTypographyVariant = typeof BLOG_TYPOGRAPHY_VARIANTS[number];

export type BlogBlockType =
  'paragraph'
  | 'header'
  | 'image'
  | 'embed'
  | 'list'
  | 'quote'
  | 'code'
  | 'delimiter'
  | 'typography';

export interface BlogSeoMetadata {
  title: string;
  description: string;
  canonical?: string;
  openGraphImage?: string;
}

export interface BlogAuthor {
  name: string;
  title?: string;
}

export interface BlogBlockData {
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
  variant?: BlogTypographyVariant;
  attribution?: string;
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
  author: BlogAuthor;
  categories: readonly string[];
  subcategories?: readonly string[];
  tags: readonly string[];
  status: BlogPostStatus;
  seo: BlogSeoMetadata;
  contentFormat: BlogContentFormat;
  blocks: readonly BlogContentBlock[];
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
