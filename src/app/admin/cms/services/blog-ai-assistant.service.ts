import {Injectable} from '@angular/core';

import {
  BlogBlockData,
  BlogBlockType,
  getBlogListItemTexts,
} from '../../../features/blog/models/blog-post.model';
import {createBlogMarkdownPlainText} from '../../../features/blog/utils/blog-markdown.util';
import {
  BlogAssistantContext,
  BlogAssistantResult,
  BlogMetadataSuggestion,
  BlogThumbnailSuggestion,
} from '../models/blog-ai-assistant.model';

interface CategoryRule {
  category: string;
  keywords: readonly string[];
}

interface RankedKeyword {
  value: string;
  score: number;
}

const UNTITLED_TITLE = 'Untitled Post';
const MAX_DESCRIPTION_LENGTH = 165;
const MAX_SEO_TITLE_LENGTH = 62;
const MAX_SEO_DESCRIPTION_LENGTH = 155;

const categoryRules: readonly CategoryRule[] = [
  {
    category: 'CMS',
    keywords: ['blog', 'cms', 'editor', 'editorjs', 'editor.js', 'publish', 'draft', 'post', 'metadata', 'seo'],
  },
  {
    category: 'Angular',
    keywords: ['angular', 'component', 'standalone', 'typescript', 'rxjs', 'tailwind', 'template'],
  },
  {
    category: 'Firebase',
    keywords: ['firebase', 'firestore', 'hosting', 'auth', 'storage', 'function'],
  },
  {
    category: 'AI',
    keywords: ['ai', 'assistant', 'openai', 'model', 'prompt', 'generation', 'thumbnail'],
  },
  {
    category: 'Design',
    keywords: ['design', 'ui', 'interface', 'responsive', 'visual', 'layout', 'typography'],
  },
  {
    category: 'Engineering',
    keywords: ['architecture', 'refactor', 'test', 'lint', 'build', 'performance', 'security', 'service'],
  },
  {
    category: 'Labs',
    keywords: ['lab', 'labs', 'experiment', 'prototype', 'playground'],
  },
];

const stopWords = new Set([
  'about',
  'after',
  'again',
  'also',
  'because',
  'before',
  'being',
  'between',
  'could',
  'every',
  'from',
  'have',
  'into',
  'just',
  'more',
  'over',
  'that',
  'their',
  'there',
  'these',
  'this',
  'through',
  'using',
  'with',
  'without',
  'would',
  'your',
]);

@Injectable({
  providedIn: 'root',
})
export class BlogAiAssistantService {
  createSuggestions(context: BlogAssistantContext): BlogAssistantResult {
    const normalizedContext = this.normalizeContext(context);
    const text = this.createSourceText(normalizedContext);
    const keywords = this.rankKeywords(text);
    const categories = this.createCategories(normalizedContext, text);
    const tags = this.createTags(normalizedContext, keywords, categories);
    const topic = this.createTopic(normalizedContext, keywords, categories);
    const summary = this.createDescription(normalizedContext, topic);
    const suggestions = this.createMetadataSuggestions(normalizedContext, topic, summary, categories, tags);

    return {
      generatedAt: new Date().toISOString(),
      source: 'local',
      suggestions,
      thumbnailSuggestions: this.createThumbnailSuggestions(topic, summary, categories, tags),
    };
  }

  private normalizeContext(context: BlogAssistantContext): BlogAssistantContext {
    return {
      ...context,
      title: context.title.trim(),
      excerpt: context.excerpt.trim(),
      seoTitle: context.seoTitle.trim(),
      seoDescription: context.seoDescription.trim(),
      categories: this.uniqueValues(context.categories),
      tags: this.uniqueValues(context.tags),
    };
  }

  private createSourceText(context: BlogAssistantContext): string {
    return [
      context.title,
      context.excerpt,
      context.seoTitle,
      context.seoDescription,
      ...context.categories,
      ...context.tags,
      ...context.blocks.map(block => this.getBlockText(block.type, block.data)),
    ]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getBlockText(type: BlogBlockType, data: BlogBlockData): string {
    switch (type) {
      case 'header':
      case 'paragraph':
      case 'typography':
        return [data.text, data.attribution].filter(Boolean).join(' ');
      case 'quote':
        return [data.text, data.caption].filter(Boolean).join(' ');
      case 'list':
        return getBlogListItemTexts(data).join(' ');
      case 'image':
      case 'embed':
        return [data.caption, data.alt, data.provider].filter(Boolean).join(' ');
      case 'gallery':
        return [
          data.title,
          data.caption,
          ...(data.galleryImages ?? []).flatMap(image => [image.alt, image.caption]),
        ].filter(Boolean).join(' ');
      case 'code':
        return [data.language, data.code].filter(Boolean).join(' ');
      case 'markdown':
        return createBlogMarkdownPlainText(data.markdown);
      case 'stats':
        return [
          data.title,
          data.caption,
          ...(data.stats ?? []).flatMap(item => [item.label, item.value, item.caption]),
        ].filter(Boolean).join(' ');
      case 'chart':
        return [
          data.title,
          data.caption,
          data.unit,
          ...(data.chartPoints ?? []).flatMap(point => [point.label, String(point.value), point.note]),
          ...(data.labels ?? []),
          ...(data.datasets ?? []).flatMap(dataset => [
            dataset.label,
            ...dataset.data.map(value => value === null ? '' : String(value)),
          ]),
          data.xAxisTitle,
          data.yAxisTitle,
          data.sourceLabel,
          data.accessibilitySummary,
        ].filter(Boolean).join(' ');
      case 'poll':
        return [
          data.question,
          data.description,
          ...(data.pollOptions ?? []).map(option => option.label),
        ].filter(Boolean).join(' ');
      case 'html':
        return [data.title, data.html].filter(Boolean).join(' ');
      case 'delimiter':
      case 'catCornerUnlock':
      case 'unsupported':
        return '';
    }
  }

  private rankKeywords(text: string): readonly RankedKeyword[] {
    const words = this.stripMarkup(text)
      .toLowerCase()
      .replace(/editor\.js/g, 'editorjs')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .map(word => word.trim().replace(/^-+|-+$/g, ''))
      .filter(word => word.length > 2 && !stopWords.has(word) && Number.isNaN(Number(word)));

    const scores = new Map<string, number>();

    for (const word of words) {
      scores.set(word, (scores.get(word) ?? 0) + 1);
    }

    for (const rule of categoryRules) {
      for (const keyword of rule.keywords) {
        if (this.hasKeyword(text, keyword)) {
          scores.set(keyword.replace('.', ''), (scores.get(keyword.replace('.', '')) ?? 0) + 2);
        }
      }
    }

    return [...scores.entries()]
      .map(([value, score]) => ({value, score}))
      .sort((left, right) => right.score - left.score || left.value.localeCompare(right.value))
      .slice(0, 12);
  }

  private createCategories(context: BlogAssistantContext, text: string): readonly string[] {
    const matches = categoryRules
      .map(rule => ({
        category: rule.category,
        score: rule.keywords.filter(keyword => this.hasKeyword(text, keyword)).length,
      }))
      .filter(match => match.score > 0)
      .sort((left, right) => right.score - left.score)
      .map(match => match.category);

    return this.uniqueValues([...context.categories, ...matches, 'Engineering']).slice(0, 3);
  }

  private createTags(
    context: BlogAssistantContext,
    keywords: readonly RankedKeyword[],
    categories: readonly string[]
  ): readonly string[] {
    const keywordTags = keywords
      .map(keyword => this.toTitleCase(keyword.value.replace(/editorjs/g, 'Editor.js')))
      .filter(tag => tag.length > 2);

    return this.uniqueValues([...context.tags, ...categories, ...keywordTags]).slice(0, 8);
  }

  private createTopic(
    context: BlogAssistantContext,
    keywords: readonly RankedKeyword[],
    categories: readonly string[]
  ): string {
    if (context.title && context.title !== UNTITLED_TITLE) {
      return context.title;
    }

    const firstHeader = context.blocks
      .filter(block => block.type === 'header')
      .map(block => this.stripMarkup(block.data.text ?? '').trim())
      .find(text => text.length > 0);

    if (firstHeader) {
      return firstHeader;
    }

    const keywordTopic = keywords
      .slice(0, 3)
      .map(keyword => this.toTitleCase(keyword.value.replace(/editorjs/g, 'Editor.js')))
      .join(' ');

    return keywordTopic || `${categories[0] ?? 'Engineering'} Notes`;
  }

  private createDescription(context: BlogAssistantContext, topic: string): string {
    if (context.excerpt) {
      return this.truncateSentence(context.excerpt, MAX_DESCRIPTION_LENGTH);
    }

    const firstBodyText = context.blocks
      .map(block => this.stripMarkup(this.getBlockText(block.type, block.data)))
      .map(text => text.trim())
      .find(text => text.length > 0);

    if (firstBodyText) {
      return this.truncateSentence(firstBodyText, MAX_DESCRIPTION_LENGTH);
    }

    return `A practical look at ${topic.toLowerCase()}, with notes on implementation decisions, tradeoffs, and next steps.`;
  }

  private createMetadataSuggestions(
    context: BlogAssistantContext,
    topic: string,
    summary: string,
    categories: readonly string[],
    tags: readonly string[]
  ): readonly BlogMetadataSuggestion[] {
    const baseTitle = this.cleanTitle(topic);
    const titleOptions = this.uniqueValues([
      baseTitle,
      `Building ${baseTitle} Without the Rewrite`,
      `${baseTitle}: Practical Notes and Tradeoffs`,
    ]).slice(0, 3);

    return titleOptions.map((title, index) => ({
      id: `metadata-${index + 1}`,
      title: this.truncateTitle(title),
      description: summary,
      seoTitle: this.truncateTitle(context.seoTitle || title),
      seoDescription: this.truncateSentence(context.seoDescription || summary, MAX_SEO_DESCRIPTION_LENGTH),
      categories,
      tags,
      rationale: index === 0
        ? 'Closest to the current draft and safest for preserving intent.'
        : 'Alternative framing that keeps the topic concrete while improving scanability.',
    }));
  }

  private createThumbnailSuggestions(
    topic: string,
    summary: string,
    categories: readonly string[],
    tags: readonly string[]
  ): readonly BlogThumbnailSuggestion[] {
    const topicPhrase = this.cleanTitle(topic).toLowerCase();
    const tagPhrase = tags.slice(0, 4).join(', ').toLowerCase();
    const categoryPhrase = categories.join(', ').toLowerCase();

    return [
      {
        id: 'thumbnail-1',
        style: 'Editorial technical illustration',
        prompt: `Create a clean 16:9 editorial thumbnail for a blog post about ${topicPhrase}. Use abstract interface panels, subtle code textures, and a professional ${categoryPhrase} mood. Avoid text in the image.`,
        altText: `Abstract technical illustration representing ${topicPhrase}.`,
      },
      {
        id: 'thumbnail-2',
        style: 'Minimal product UI composition',
        prompt: `Generate a modern 16:9 product-style hero image for ${topicPhrase}. Show layered browser cards and metadata chips inspired by ${tagPhrase}. Keep the composition minimal and high contrast. Avoid logos and readable text.`,
        altText: `Layered UI cards suggesting ${summary.toLowerCase()}`,
      },
    ];
  }

  private cleanTitle(value: string): string {
    const title = this.stripMarkup(value)
      .replace(/\s+/g, ' ')
      .trim();

    return title || UNTITLED_TITLE;
  }

  private truncateTitle(value: string): string {
    return this.truncateSentence(value, MAX_SEO_TITLE_LENGTH);
  }

  private truncateSentence(value: string, maxLength: number): string {
    const normalized = this.stripMarkup(value)
      .replace(/\s+/g, ' ')
      .trim();

    if (normalized.length <= maxLength) {
      return normalized;
    }

    const shortened = normalized.slice(0, maxLength + 1);
    const lastSpace = shortened.lastIndexOf(' ');
    const trimmed = shortened.slice(0, lastSpace > 40 ? lastSpace : maxLength).replace(/[,.:\s]+$/g, '');

    return `${trimmed}...`;
  }

  private stripMarkup(value: string): string {
    return value.replace(/<[^>]*>/g, ' ');
  }

  private hasKeyword(text: string, keyword: string): boolean {
    const normalizedText = text.toLowerCase().replace(/editor\.js/g, 'editorjs');
    const normalizedKeyword = keyword.toLowerCase().replace('.', '');
    const escapedKeyword = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return new RegExp(`(^|[^a-z0-9])${escapedKeyword}($|[^a-z0-9])`).test(normalizedText);
  }

  private uniqueValues(values: readonly string[]): readonly string[] {
    const seen = new Set<string>();
    const results: string[] = [];

    for (const value of values) {
      const normalized = value.trim();
      const key = normalized.toLowerCase();

      if (!normalized || seen.has(key)) {
        continue;
      }

      seen.add(key);
      results.push(normalized);
    }

    return results;
  }

  private toTitleCase(value: string): string {
    return value
      .split(/[\s-]+/)
      .filter(Boolean)
      .map(word => word === 'ai' ? 'AI' : `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
      .join(' ');
  }
}
