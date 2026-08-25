import {BlogPost, getBlogListItemTexts} from '../models/blog-post.model';
import {createBlogMarkdownPlainText} from './blog-markdown.util';

export const BLOG_POST_SEARCH_BODY_CHARACTER_LIMIT = 16_000;

/**
 * Builds the body-only search projection stored in the compact post index.
 * Keep this deterministic and free of markup so the public search surface does
 * not need to retain complete Editor.js block graphs.
 */
export function createBlogPostSearchBodyText(post: BlogPost): string {
  let searchBodyText = '';
  const append = (value: unknown): void => {
    if (typeof value !== 'string' || !value || searchBodyText.length >= BLOG_POST_SEARCH_BODY_CHARACTER_LIMIT) {
      return;
    }

    const separator = searchBodyText ? ' ' : '';
    const remaining = BLOG_POST_SEARCH_BODY_CHARACTER_LIMIT - searchBodyText.length - separator.length;
    const normalized = normalizeBlogSearchTextSegment(value, remaining);
    if (normalized && remaining > 0) {
      searchBodyText += `${separator}${normalized.slice(0, remaining)}`;
    }
  };

  for (const block of post.blocks) {
    append(block.data.title);
    append(block.data.text);
    append(block.data.caption);
    append(block.data.attribution);
    append(block.data.code);
    append(block.data.html);
    const markdown = block.data.markdown;
    append(block.type === 'markdown' && typeof markdown === 'string'
      ? createBlogMarkdownPlainText(markdown.slice(0, BLOG_POST_SEARCH_BODY_CHARACTER_LIMIT * 4))
      : markdown);
    getBlogListItemTexts(block.data).forEach(append);
    block.data.stats?.forEach(stat => {
      append(stat.label);
      append(stat.value);
      append(stat.caption);
    });
    block.data.chartPoints?.forEach(point => {
      append(point.label);
      append(point.note);
    });
    block.data.labels?.forEach(append);
    block.data.datasets?.forEach(dataset => append(dataset.label));
    append(block.data.xAxisTitle);
    append(block.data.yAxisTitle);
    append(block.data.sourceLabel);
    append(block.data.accessibilitySummary);
    block.data.galleryImages?.forEach(image => {
      append(image.alt);
      append(image.caption);
    });

    if (searchBodyText.length >= BLOG_POST_SEARCH_BODY_CHARACTER_LIMIT) {
      break;
    }
  }

  append(post.editorial?.evidenceBasis);
  append(post.editorial?.evidenceSummary);
  append(post.editorial?.relationshipDisclosure);
  append(post.editorial?.aiAssistanceDisclosure);
  append(post.editorial?.syntheticMediaDisclosure);
  append(post.editorial?.updateNote);

  return searchBodyText;
}

function normalizeBlogSearchTextSegment(value: string, outputCharacterLimit: number): string {
  const sourceCharacterLimit = Math.max(4_096, outputCharacterLimit * 4);
  return value
    .slice(0, sourceCharacterLimit)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, ' $1 ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, ' $1 ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[`*_~>#]/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, ' and ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
