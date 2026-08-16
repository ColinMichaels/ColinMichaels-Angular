import {BlogContentBlock} from '../../../features/blog/models/blog-post.model';
import {collectBlogReferenceUrls} from '../../../features/blog/utils/blog-reference-urls.util';

export interface BlogContentTrustSignals {
  externalReferenceUrls: readonly string[];
  contextualArticleUrls: readonly string[];
  supportingArtifactCount: number;
  hasSourcesHeading: boolean;
}

const SOURCE_HEADING_PATTERN = /^(?:sources?|references?|further reading|research links|where this came from)\s*:?$/i;

export function analyzeBlogContentTrustSignals(
  blocks: readonly BlogContentBlock[],
  currentSlug = ''
): BlogContentTrustSignals {
  const references = collectBlogReferenceUrls(blocks, currentSlug);

  return {
    externalReferenceUrls: references.externalReferenceUrls,
    contextualArticleUrls: references.contextualArticleUrls,
    supportingArtifactCount: blocks.reduce((total, block) => total + countSupportingArtifacts(block), 0),
    hasSourcesHeading: blocks.some(block => (
      block.type === 'header'
      && SOURCE_HEADING_PATTERN.test(stripHtml(block.data.text ?? ''))
    )),
  };
}

function countSupportingArtifacts(block: BlogContentBlock): number {
  switch (block.type) {
    case 'image':
      return block.data.url?.trim() ? 1 : 0;
    case 'gallery':
      return (block.data.galleryImages ?? []).filter(image => image.url.trim()).length;
    case 'embed':
      return block.data.embedUrl?.trim() || block.data.url?.trim() ? 1 : 0;
    case 'chart':
      return (block.data.chartPoints?.length ?? 0) > 0 || (block.data.datasets?.length ?? 0) > 0 ? 1 : 0;
    case 'stats':
      return (block.data.stats?.length ?? 0) > 0 ? 1 : 0;
    case 'code':
      return block.data.code?.trim() ? 1 : 0;
    case 'html':
      return /<table\b/i.test(block.data.html ?? '') ? 1 : 0;
    case 'markdown':
      return containsMarkdownTable(block.data.markdown ?? '') ? 1 : 0;
    default:
      return 0;
  }
}

function containsMarkdownTable(value: string): boolean {
  const lines = value.split(/\r?\n/);
  return lines.some((line, index) => (
    line.includes('|')
    && index + 1 < lines.length
    && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1] ?? '')
  ));
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
