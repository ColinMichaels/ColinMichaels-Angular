import {BlogContentBlock} from '../../../features/blog/models/blog-post.model';

export interface BlogAssistantContext {
  title: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  categories: readonly string[];
  tags: readonly string[];
  blocks: readonly BlogContentBlock[];
}

export interface BlogMetadataSuggestion {
  id: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  categories: readonly string[];
  tags: readonly string[];
  rationale: string;
}

export interface BlogThumbnailSuggestion {
  id: string;
  prompt: string;
  altText: string;
  style: string;
}

export interface BlogAssistantResult {
  generatedAt: string;
  source: 'local' | 'backend';
  suggestions: readonly BlogMetadataSuggestion[];
  thumbnailSuggestions: readonly BlogThumbnailSuggestion[];
}

export interface BlogThumbnailGenerationRequest {
  prompt: string;
  altText: string;
  style: string;
  postId: string;
  slug: string;
}

export interface BlogStoredThumbnail {
  generatedAt: string;
  source: 'backend';
  prompt: string;
  altText: string;
  style: string;
  contentType: string;
  storagePath: string;
  downloadUrl: string;
  model: string;
}
