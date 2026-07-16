import {BlogContentBlock, BlogPost} from '../models/blog-post.model';
import {createBlogMarkdownPlainText} from './blog-markdown.util';

const WORDS_PER_MINUTE = 225;

export const BLOG_QUICK_SUMMARY_LABEL = 'Quick Summary (TL;DR)';
export const BLOG_QUICK_SUMMARY_DESCRIPTION = 'Too long; didn’t read — a brief summary of the article.';

export interface BlogTableOfContentsItem {
  blockId: string;
  id: string;
  level: 2 | 3;
  text: string;
}

export interface BlogReadingStats {
  readingMinutes: number;
  wordCount: number;
}

export function createBlogTableOfContents(blocks: readonly BlogContentBlock[]): readonly BlogTableOfContentsItem[] {
  const usedIds = new Map<string, number>();

  return blocks
    .filter(block => block.type === 'header')
    .map(block => {
      const sourceText = toPlainText(block.data.text ?? '');
      // Build the anchor from stored copy before applying presentation aliases so existing links remain stable.
      const baseId = createHeadingBaseId(sourceText);
      const seenCount = usedIds.get(baseId) ?? 0;
      const level: 2 | 3 = block.data.level === 3 ? 3 : 2;
      usedIds.set(baseId, seenCount + 1);

      return {
        blockId: block.id,
        id: seenCount > 0 ? `${baseId}-${seenCount + 1}` : baseId,
        level,
        text: isBlogQuickSummaryHeading(sourceText) ? BLOG_QUICK_SUMMARY_LABEL : sourceText,
      };
    })
    .filter(item => item.text.length > 0);
}

export function isBlogQuickSummaryHeading(value: string): boolean {
  return value.toLocaleLowerCase().replace(/[^a-z]/g, '') === 'tldr';
}

export function createBlogHeadingIdMap(blocks: readonly BlogContentBlock[]): ReadonlyMap<string, string> {
  return new Map(createBlogTableOfContents(blocks).map(item => [item.blockId, item.id]));
}

export function createBlogReadingStats(post: BlogPost): BlogReadingStats {
  const wordCount = countWords([
    post.excerpt,
    ...post.blocks.flatMap(block => [
      block.data.text,
      block.data.caption,
      block.data.attribution,
      block.data.title,
      block.data.html,
      block.type === 'markdown' ? createBlogMarkdownPlainText(block.data.markdown) : block.data.markdown,
      ...(block.data.items ?? []),
      ...(block.data.stats ?? []).flatMap(item => [item.label, item.value, item.caption]),
      ...(block.data.chartPoints ?? []).flatMap(point => [point.label, String(point.value), point.note]),
      block.data.question,
      block.data.description,
      ...(block.data.pollOptions ?? []).map(option => option.label),
    ]),
  ].filter((value): value is string => typeof value === 'string').join(' '));

  return {
    readingMinutes: Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE)),
    wordCount,
  };
}

export function hasMeaningfulPostUpdate(post: Pick<BlogPost, 'publishedAt' | 'updatedAt'>): boolean {
  if (!post.publishedAt || !post.updatedAt) {
    return false;
  }

  const publishedTime = Date.parse(post.publishedAt);
  const updatedTime = Date.parse(post.updatedAt);

  if (!Number.isFinite(publishedTime) || !Number.isFinite(updatedTime)) {
    return false;
  }

  const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

  return updatedTime - publishedTime >= oneDayInMilliseconds;
}

function createHeadingBaseId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

function countWords(value: string): number {
  const text = toPlainText(value);

  if (!text) {
    return 0;
  }

  return text.split(/\s+/).filter(Boolean).length;
}

function toPlainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
