import type {OutputBlockData, OutputData} from '@editorjs/editorjs';

import {
  BLOG_BLOCK_PLACEMENTS,
  BLOG_CHART_TYPES,
  BLOG_IMAGE_LAYOUTS,
  BLOG_POLL_RESULTS_VISIBILITIES,
  BLOG_TYPOGRAPHY_VARIANTS,
  BlogBlockData,
  BlogBlockPlacement,
  BlogBlockType,
  BlogChartDataset,
  BlogChartPoint,
  BlogChartType,
  BlogContentBlock,
  BlogImageLayout,
  BlogPollOption,
  BlogPollResultsVisibility,
  BlogPost,
  BlogStatItem,
  BlogTypographyVariant,
} from '../../../features/blog/models/blog-post.model';
import {getBlogSunoEmbedUrls, SUNO_EMBED_HEIGHT} from '../../../features/blog/utils/blog-suno-embed.util';

const supportedBlockTypes = new Set<BlogBlockType>([
  'paragraph',
  'header',
  'image',
  'embed',
  'list',
  'quote',
  'code',
  'markdown',
  'delimiter',
  'typography',
  'stats',
  'chart',
  'poll',
  'catCornerUnlock',
  'html',
]);
const YOUTUBE_EDITOR_BLOCK_TYPE = 'youtubeEmbed';
const SUNO_EDITOR_BLOCK_TYPE = 'sunoEmbed';
const APP_EMBED_EDITOR_BLOCK_TYPE = 'appEmbed';

interface ImportedChartPoint {
  label: string;
  value: number | undefined;
  note?: string;
}

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

function getOptionalBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
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

function toImageLayout(value: unknown, stretched: unknown): BlogImageLayout {
  if (typeof value === 'string' && (BLOG_IMAGE_LAYOUTS as readonly string[]).includes(value)) {
    return value as BlogImageLayout;
  }

  return stretched === true ? 'fullWidth' : 'contained';
}

function toChartType(value: unknown): BlogChartType {
  return typeof value === 'string' && (BLOG_CHART_TYPES as readonly string[]).includes(value)
    ? value as BlogChartType
    : 'bar';
}

function toPollResultsVisibility(value: unknown): BlogPollResultsVisibility {
  return typeof value === 'string' && (BLOG_POLL_RESULTS_VISIBILITIES as readonly string[]).includes(value)
    ? value as BlogPollResultsVisibility
    : 'afterVote';
}

function toBlockPlacement(value: unknown, fallback?: BlogBlockPlacement): BlogBlockPlacement | undefined {
  return typeof value === 'string' && (BLOG_BLOCK_PLACEMENTS as readonly string[]).includes(value)
    ? value as BlogBlockPlacement
    : fallback;
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
          imageLayout: block.data.imageLayout ?? (block.data.stretched ? 'fullWidth' : 'contained'),
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

      if (block.data.provider === 'app') {
        return {
          id: block.id,
          type: APP_EMBED_EDITOR_BLOCK_TYPE,
          data: {
            url: block.data.embedUrl ?? block.data.url ?? '',
            caption: block.data.caption ?? '',
            height: block.data.height,
          },
        };
      }

      if (block.data.provider === 'suno') {
        const urls = getBlogSunoEmbedUrls(block.data.url ?? block.data.embedUrl);

        return {
          id: block.id,
          type: SUNO_EDITOR_BLOCK_TYPE,
          data: {
            url: urls?.songUrl.toString() ?? block.data.url ?? block.data.embedUrl ?? '',
            caption: block.data.caption ?? '',
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
    case 'catCornerUnlock':
      return {
        id: block.id,
        type: block.type,
        data: {},
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
    const stat = toImportedStatItem(item);

    if (!stat) {
      continue;
    }

    if (stat.label || stat.value) {
      stats.push({
        label: stat.label,
        value: stat.value,
        ...(stat.caption ? {caption: stat.caption} : {}),
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
    const point = toImportedChartPoint(item);

    if (!point) {
      continue;
    }

    if (point.value !== undefined) {
      points.push({
        label: point.label || `Point ${index + 1}`,
        value: point.value,
        ...(point.note ? {note: point.note} : {}),
      });
    }
  }

  return points;
}

function extractChartLabels(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((label, index) => toStringValue(label) || `Label ${index + 1}`);
}

function extractChartDatasets(value: unknown): readonly BlogChartDataset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item, index) => {
    if (!isRecord(item) || !Array.isArray(item['data'])) {
      return [];
    }

    const values = item['data'].map(value => toFiniteNumber(value) ?? null);

    if (!values.some(value => value !== null)) {
      return [];
    }

    const borderColor = getString(item, 'borderColor')?.trim();
    const backgroundColor = getString(item, 'backgroundColor')?.trim();

    return [{
      label: getString(item, 'label')?.trim() || `Series ${index + 1}`,
      data: values,
      ...(borderColor ? {borderColor} : {}),
      ...(backgroundColor ? {backgroundColor} : {}),
    }];
  });
}

function extractPollOptions(value: unknown): readonly BlogPollOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item, index) => {
    if (!isRecord(item)) {
      return [];
    }

    const id = getString(item, 'id')?.trim() || `option-${index + 1}`;
    const label = getString(item, 'label')?.trim() ?? '';

    return label ? [{id, label}] : [];
  }).slice(0, 8);
}

function toImportedStatItem(item: unknown): BlogStatItem | null {
  if (Array.isArray(item)) {
    return {
      label: toStringValue(item[0]),
      value: toStringValue(item[1]),
      caption: toStringValue(item[2]),
    };
  }

  if (!isRecord(item)) {
    return null;
  }

  return {
    label: getStringByAlias(item, ['label', 'name', 'metric', 'stat', 'spec', 'feature']),
    value: getStringByAlias(item, ['value', 'figure', 'amount', 'measurement', 'result']),
    caption: getStringByAlias(item, ['caption', 'note', 'notes', 'description', 'detail', 'details']),
  };
}

function toImportedChartPoint(item: unknown): ImportedChartPoint | null {
  if (Array.isArray(item)) {
    return {
      label: toStringValue(item[0]),
      value: toFiniteNumber(item[1]),
      note: toStringValue(item[2]),
    };
  }

  if (!isRecord(item)) {
    return null;
  }

  return {
    label: getStringByAlias(item, ['label', 'name', 'x', 'category', 'trim', 'model']),
    value: getNumberByAlias(item, ['value', 'y', 'amount', 'score', 'number', 'metric']),
    note: getStringByAlias(item, ['note', 'notes', 'caption', 'description', 'detail', 'details']),
  };
}

function extractArrayByAlias(data: Record<string, unknown>, aliases: readonly string[]): unknown {
  for (const alias of aliases) {
    const value = data[alias];

    if (Array.isArray(value)) {
      return value;
    }
  }

  const nestedData = data['data'];

  if (!isRecord(nestedData)) {
    return undefined;
  }

  for (const alias of aliases) {
    const value = nestedData[alias];

    if (Array.isArray(value)) {
      return value;
    }
  }

  return undefined;
}

function getStringByAlias(record: Record<string, unknown>, aliases: readonly string[]): string {
  for (const alias of aliases) {
    const normalizedAlias = normalizeImportKey(alias);
    const entry = Object.entries(record)
      .find(([key]) => normalizeImportKey(key) === normalizedAlias);
    const value = entry ? toStringValue(entry[1]) : '';

    if (value) {
      return value;
    }
  }

  return '';
}

function getNumberByAlias(record: Record<string, unknown>, aliases: readonly string[]): number | undefined {
  for (const alias of aliases) {
    const normalizedAlias = normalizeImportKey(alias);
    const entry = Object.entries(record)
      .find(([key]) => normalizeImportKey(key) === normalizedAlias);
    const value = entry ? toFiniteNumber(entry[1]) : undefined;

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function toStringValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return '';
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  const normalizedValue = trimmedValue.replace(/,/g, '');

  if (/^[+-]?(?:\d+|\d*\.\d+)(?:e[+-]?\d+)?$/i.test(normalizedValue)) {
    return Number(normalizedValue);
  }

  const firstNumber = trimmedValue.match(/[+-]?\d[\d,]*(?:\.\d+)?/);

  return firstNumber ? Number(firstNumber[0].replace(/,/g, '')) : undefined;
}

function normalizeImportKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
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
        imageLayout: toImageLayout(data['imageLayout'], data['stretched']),
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
    case 'markdown':
      return {
        markdown: getString(data, 'markdown') ?? getString(data, 'text') ?? getString(data, 'content') ?? '',
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
        stats: extractStatItems(extractArrayByAlias(data, ['stats', 'rows', 'items', 'data'])),
      };
    case 'chart': {
      const chartPoints = extractChartPoints(extractArrayByAlias(data, ['chartPoints', 'points', 'rows', 'items', 'data']));
      const labels = extractChartLabels(data['labels']);
      const datasets = extractChartDatasets(data['datasets']);
      const xAxisTitle = getString(data, 'xAxisTitle')?.trim();
      const yAxisTitle = getString(data, 'yAxisTitle')?.trim();
      const yMax = getNumber(data, 'yMax');
      const valueSuffix = getString(data, 'valueSuffix');
      const decimals = getNumber(data, 'decimals');
      const showLegend = getOptionalBoolean(data, 'showLegend');
      const sourceLabel = getString(data, 'sourceLabel')?.trim();
      const sourceUrl = getString(data, 'sourceUrl')?.trim();
      const accessibilitySummary = getString(data, 'accessibilitySummary')?.trim();

      return {
        title: getString(data, 'title') ?? '',
        caption: getString(data, 'caption') ?? '',
        chartType: toChartType(data['chartType']),
        unit: getString(data, 'unit') ?? '',
        chartPoints,
        ...(labels.length > 0 ? {labels} : {}),
        ...(datasets.length > 0 ? {datasets} : {}),
        ...(xAxisTitle ? {xAxisTitle} : {}),
        ...(yAxisTitle ? {yAxisTitle} : {}),
        ...(yMax !== undefined ? {yMax} : {}),
        ...(valueSuffix !== undefined ? {valueSuffix} : {}),
        ...(decimals !== undefined ? {decimals} : {}),
        ...(showLegend !== undefined ? {showLegend} : {}),
        ...(sourceLabel ? {sourceLabel} : {}),
        ...(sourceUrl ? {sourceUrl} : {}),
        ...(accessibilitySummary ? {accessibilitySummary} : {}),
      };
    }
    case 'poll':
      return {
        question: getString(data, 'question') ?? '',
        description: getString(data, 'description') ?? '',
        pollOptions: extractPollOptions(extractArrayByAlias(data, ['pollOptions', 'options', 'answers'])),
        pollResultsVisibility: toPollResultsVisibility(data['pollResultsVisibility']),
      };
    case 'catCornerUnlock':
      return {};
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
    if (block.type === SUNO_EDITOR_BLOCK_TYPE && isRecord(block.data)) {
      const urls = getBlogSunoEmbedUrls(getString(block.data, 'url'));

      if (!urls) {
        return [];
      }

      return {
        id: block.id ?? `block-${Date.now().toString(36)}-${index}`,
        type: 'embed',
        data: {
          provider: 'suno',
          url: urls.songUrl.toString(),
          embedUrl: urls.embedUrl.toString(),
          caption: getString(block.data, 'caption') ?? '',
          height: SUNO_EMBED_HEIGHT,
        },
      };
    }

    if (block.type === APP_EMBED_EDITOR_BLOCK_TYPE && isRecord(block.data)) {
      const url = getString(block.data, 'url') ?? '';

      return {
        id: block.id ?? `block-${Date.now().toString(36)}-${index}`,
        type: 'embed',
        data: {
          provider: 'app',
          url,
          embedUrl: url,
          caption: getString(block.data, 'caption') ?? '',
          height: getNumber(block.data, 'height'),
        },
      };
    }

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
    const placement = toBlockPlacement(block.data['placement'], type === 'poll' ? 'rail' : undefined);

    return {
      id: block.id ?? `block-${Date.now().toString(36)}-${index}`,
      type,
      data: {
        ...createBlockData(type, block.data),
        ...(placement ? {placement} : {}),
      },
    };
  });
}
