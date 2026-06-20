import type {OutputBlockData, OutputData} from '@editorjs/editorjs';

import {
  BLOG_CHART_TYPES,
  BLOG_TYPOGRAPHY_VARIANTS,
  BlogBlockData,
  BlogBlockType,
  BlogChartPoint,
  BlogChartType,
  BlogContentBlock,
  BlogPost,
  BlogStatItem,
  BlogTypographyVariant,
} from '../../../features/blog/models/blog-post.model';

const supportedBlockTypes = new Set<BlogBlockType>([
  'paragraph',
  'header',
  'image',
  'embed',
  'list',
  'quote',
  'code',
  'delimiter',
  'typography',
  'stats',
  'chart',
  'html',
]);
const YOUTUBE_EDITOR_BLOCK_TYPE = 'youtubeEmbed';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function getNestedString(record: Record<string, unknown>, parentKey: string, key: string): string | undefined {
  const parent = record[parentKey];
  return isRecord(parent) ? getString(parent, key) : undefined;
}

function getBoolean(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
}

function getNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];

  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getNestedNumber(record: Record<string, unknown>, parentKey: string, key: string): number | undefined {
  const parent = record[parentKey];
  return isRecord(parent) ? getNumber(parent, key) : undefined;
}

function toHeaderLevel(value: unknown): 2 | 3 {
  return value === 3 ? 3 : 2;
}

function toTypographyVariant(value: unknown): BlogTypographyVariant {
  return typeof value === 'string' && (BLOG_TYPOGRAPHY_VARIANTS as readonly string[]).includes(value)
    ? value as BlogTypographyVariant
    : 'lead';
}

function toChartType(value: unknown): BlogChartType {
  return typeof value === 'string' && (BLOG_CHART_TYPES as readonly string[]).includes(value)
    ? value as BlogChartType
    : 'bar';
}

function toListData(blockData: BlogBlockData): Record<string, unknown> {
  return {
    style: blockData.ordered ? 'ordered' : 'unordered',
    items: blockData.items ?? [],
  };
}

function parseHttpUrl(value: string | undefined): URL | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

function getYouTubeVideoId(value: string | undefined): string {
  const url = parseHttpUrl(value);

  if (!url) {
    return '';
  }

  if (url.hostname === 'youtu.be') {
    return url.pathname.split('/').filter(Boolean)[0] ?? '';
  }

  if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname)) {
    return '';
  }

  if (url.pathname === '/watch') {
    return url.searchParams.get('v') ?? '';
  }

  const pathParts = url.pathname.split('/').filter(Boolean);
  const embedIndex = pathParts.findIndex(part => ['embed', 'shorts', 'live'].includes(part));

  return embedIndex >= 0 ? pathParts[embedIndex + 1] ?? '' : '';
}

function createYouTubeEmbedUrl(value: string | undefined): string {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
}

function createYouTubeWatchUrl(value: string | undefined): string {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : '';
}

function isYouTubeUrl(value: string | undefined): boolean {
  return getYouTubeVideoId(value).length > 0;
}

function toEditorBlock(block: BlogContentBlock): OutputBlockData {
  switch (block.type) {
    case 'list':
      return {
        id: block.id,
        type: block.type,
        data: toListData(block.data),
      };
    case 'image':
      return {
        id: block.id,
        type: block.type,
        data: {
          file: {
            url: block.data.url ?? '',
            alt: block.data.alt ?? '',
            width: block.data.width,
            height: block.data.height,
          },
          alt: block.data.alt ?? '',
          caption: block.data.caption ?? '',
          withBorder: block.data.withBorder ?? false,
          withBackground: block.data.withBackground ?? false,
          stretched: block.data.stretched ?? false,
        },
      };
    case 'embed':
      if (isYouTubeUrl(block.data.url) || isYouTubeUrl(block.data.embedUrl)) {
        const youtubeUrl = createYouTubeWatchUrl(block.data.url) || createYouTubeWatchUrl(block.data.embedUrl);

        return {
          id: block.id,
          type: YOUTUBE_EDITOR_BLOCK_TYPE,
          data: {
            url: youtubeUrl,
          },
        };
      }

      return {
        id: block.id,
        type: block.type,
        data: {
          service: block.data.provider ?? 'link',
          source: block.data.url ?? '',
          embed: block.data.embedUrl ?? block.data.url ?? '',
          caption: block.data.caption ?? '',
        },
      };
    default:
      return {
        id: block.id,
        type: block.type,
        data: {...block.data},
      };
  }
}

function extractListItems(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(item => {
      if (typeof item === 'string') {
        return item;
      }

      if (isRecord(item)) {
        return getString(item, 'content') ?? getString(item, 'text') ?? '';
      }

      return '';
    })
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

function extractStatItems(value: unknown): readonly BlogStatItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const stats: BlogStatItem[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const label = getString(item, 'label')?.trim() ?? '';
    const statValue = getString(item, 'value')?.trim() ?? '';
    const caption = getString(item, 'caption')?.trim() ?? '';

    if (label || statValue) {
      stats.push({
        label,
        value: statValue,
        ...(caption ? {caption} : {}),
      });
    }
  }

  return stats;
}

function extractChartPoints(value: unknown): readonly BlogChartPoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const points: BlogChartPoint[] = [];

  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) {
      continue;
    }

    const pointValue = getNumber(item, 'value');

    if (pointValue !== undefined) {
      const note = getString(item, 'note')?.trim() ?? '';
      points.push({
        label: getString(item, 'label')?.trim() || `Point ${index + 1}`,
        value: pointValue,
        ...(note ? {note} : {}),
      });
    }
  }

  return points;
}

function createBlockData(type: BlogBlockType, data: Record<string, unknown>): BlogBlockData {
  switch (type) {
    case 'header':
      return {
        text: getString(data, 'text') ?? '',
        level: toHeaderLevel(data['level']),
      };
    case 'paragraph':
      return {
        text: getString(data, 'text') ?? '',
      };
    case 'quote':
      return {
        text: getString(data, 'text') ?? '',
        caption: getString(data, 'caption') ?? '',
      };
    case 'list':
      return {
        ordered: data['style'] === 'ordered',
        items: extractListItems(data['items']),
      };
    case 'image':
      return {
        url: getNestedString(data, 'file', 'url') ?? getString(data, 'url') ?? '',
        alt: getString(data, 'alt') ?? getNestedString(data, 'file', 'alt') ?? '',
        caption: getString(data, 'caption') ?? '',
        width: getNestedNumber(data, 'file', 'width') ?? getNumber(data, 'width'),
        height: getNestedNumber(data, 'file', 'height') ?? getNumber(data, 'height'),
        stretched: getBoolean(data, 'stretched'),
        withBorder: getBoolean(data, 'withBorder'),
        withBackground: getBoolean(data, 'withBackground'),
      };
    case 'embed':
      return {
        provider: getString(data, 'service') ?? '',
        url: getString(data, 'source') ?? '',
        embedUrl: getString(data, 'embed') ?? getString(data, 'source') ?? '',
        caption: getString(data, 'caption') ?? '',
      };
    case 'code':
      return {
        code: getString(data, 'code') ?? '',
        language: getString(data, 'language') ?? '',
      };
    case 'delimiter':
      return {};
    case 'typography':
      return {
        variant: toTypographyVariant(data['variant']),
        text: getString(data, 'text') ?? '',
        attribution: getString(data, 'attribution') ?? '',
      };
    case 'stats':
      return {
        title: getString(data, 'title') ?? '',
        caption: getString(data, 'caption') ?? '',
        stats: extractStatItems(data['stats']),
      };
    case 'chart':
      return {
        title: getString(data, 'title') ?? '',
        caption: getString(data, 'caption') ?? '',
        chartType: toChartType(data['chartType']),
        unit: getString(data, 'unit') ?? '',
        chartPoints: extractChartPoints(data['chartPoints']),
      };
    case 'html':
      return {
        title: getString(data, 'title') ?? '',
        html: getString(data, 'html') ?? '',
      };
  }
}

export function createEditorDocument(post: BlogPost): OutputData {
  return {
    time: new Date(post.updatedAt).getTime(),
    blocks: post.blocks.map(toEditorBlock),
  };
}

export function createBlogBlocksFromEditorDocument(document: OutputData): readonly BlogContentBlock[] {
  return document.blocks.flatMap((block, index) => {
    if (block.type === YOUTUBE_EDITOR_BLOCK_TYPE && isRecord(block.data)) {
      const url = getString(block.data, 'url') ?? '';

      return {
        id: block.id ?? `block-${Date.now().toString(36)}-${index}`,
        type: 'embed',
        data: {
          provider: 'youtube',
          url,
          embedUrl: createYouTubeEmbedUrl(url),
        },
      };
    }

    if (!supportedBlockTypes.has(block.type as BlogBlockType) || !isRecord(block.data)) {
      return [];
    }

    const type = block.type as BlogBlockType;

    return {
      id: block.id ?? `block-${Date.now().toString(36)}-${index}`,
      type,
      data: createBlockData(type, block.data),
    };
  });
}
