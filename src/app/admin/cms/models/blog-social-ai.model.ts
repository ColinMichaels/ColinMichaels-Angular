import {
  BlogSocialChannel,
  BlogSocialContentAngle,
  BlogSocialLinkPlacement,
  BLOG_SOCIAL_POST_FORMATS,
  BlogSocialPostFormat,
} from '../../../features/blog/models/blog-social-promotion.model';
import {BlogAssistantContext} from './blog-ai-assistant.model';

/** Social channels that can receive authored promotional copy. */
export type BlogSocialAiChannel = Exclude<BlogSocialChannel, 'notify'>;

export const BLOG_SOCIAL_AI_POST_FORMATS = BLOG_SOCIAL_POST_FORMATS;

export type BlogSocialAiPostFormat = BlogSocialPostFormat;

export interface BlogSocialAiTarget {
  channel: BlogSocialAiChannel;
  angle: BlogSocialContentAngle;
  linkPlacement: BlogSocialLinkPlacement;
  currentMessage?: string;
  postFormat?: BlogSocialAiPostFormat;
}

export interface BlogSocialAiRequest {
  context: BlogAssistantContext;
  articleUrl: string;
  targets: readonly BlogSocialAiTarget[];
  instruction?: string;
}

export interface BlogSocialAiSuggestion {
  id: string;
  channel: BlogSocialAiChannel;
  message: string;
  rationale: string;
  mediaConcept: string;
}

export interface BlogSocialAiResult {
  generatedAt: string;
  source: 'backend';
  suggestions: readonly BlogSocialAiSuggestion[];
}
