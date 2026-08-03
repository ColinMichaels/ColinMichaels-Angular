import type {OutputBlockData, OutputData} from '@editorjs/editorjs';

import {
  BLOG_BLOCK_PLACEMENTS,
  BLOG_CHART_TYPES,
  BLOG_IMAGE_LAYOUTS,
  BLOG_IMAGE_SIZES,
  BLOG_LIST_PRESENTATIONS,
  BLOG_LIST_STYLES,
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
  BlogImageSize,
  BlogJsonObject,
  BlogListItem,
  BlogListPresentation,
  BlogListStyle,
  BlogPollOption,
  BlogPollResultsVisibility,
  BlogPost,
  BlogStatItem,
  BlogTypographyVariant,
  BlogUnsupportedBlockEnvelope,
} from '../../../features/blog/models/blog-post.model';
import {getBlogSunoEmbedUrls, SUNO_EMBED_HEIGHT} from '../../../features/blog/utils/blog-suno-embed.util';
import {
  BLOG_UNSUPPORTED_EDITOR_BLOCK_TYPE,
  isJsonObject,
  validateEditorDocumentForBlog,
} from './blog-editor-document-validation.util';

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
  'unsupported',
]);
const YOUTUBE_EDITOR_BLOCK_TYPE = 'youtubeEmbed';
const SUNO_EDITOR_BLOCK_TYPE = 'sunoEmbed';
const APP_EMBED_EDITOR_BLOCK_TYPE = 'appEmbed';
const LEGACY_CHECKLIST_EDITOR_BLOCK_TYPE = 'checklist';
const LIST_PRESENTATION_TUNE_NAME = 'listPresentation';

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

function toImageSize(value: unknown): BlogImageSize | undefined {
  return typeof value === 'string' && (BLOG_IMAGE_SIZES as readonly string[]).includes(value)
    ? value as BlogImageSize
    : undefined;
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
  if (blockData.listItems) {
    return {
      style: blockData.listStyle ?? (blockData.ordered ? 'ordered' : 'unordered'),
      meta: blockData.listMeta ?? {},
      items: blockData.listItems.map(toEditorListItem),
    };
  }

  return {
    style: blockData.ordered ? 'ordered' : 'unordered',
    items: blockData.items ?? [],
  };
}

function toEditorListItem(item: BlogListItem): Record<string, unknown> {
  return {
    content: item.content,
    meta: item.meta,
    items: item.items.map(toEditorListItem),
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

function toEditorBlockWithoutTunes(block: BlogContentBlock): OutputBlockData {
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
          ...(block.data.imageSize ? {imageSize: block.data.imageSize} : {}),
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
    case 'unsupported': {
      const envelope = block.data.unsupportedBlock;

      return {
        id: block.id,
        type: BLOG_UNSUPPORTED_EDITOR_BLOCK_TYPE,
        data: envelope ? {
          originalType: envelope.originalType,
          originalData: envelope.originalData,
          ...(envelope.originalTunes ? {originalTunes: envelope.originalTunes} : {}),
        } : {
          originalType: 'unknown',
          originalData: {},
        },
      };
    }
    default:
      return {
        id: block.id,
        type: block.type,
        data: {...block.data},
      };
  }
}

function toEditorBlock(block: BlogContentBlock): OutputBlockData {
  const editorBlock = toEditorBlockWithoutTunes(block);
  const editorTunes = createEditorTunes(block);

  return editorTunes
    ? {...editorBlock, tunes: editorTunes}
    : editorBlock;
}

function createEditorTunes(block: BlogContentBlock): BlogJsonObject | undefined {
  if (block.type !== 'list') {
    return block.editorTunes;
  }

  const tunes: Record<string, BlogJsonObject[keyof BlogJsonObject]> = {...(block.editorTunes ?? {})};
  delete tunes[LIST_PRESENTATION_TUNE_NAME];

  if (block.data.listPresentation) {
    tunes[LIST_PRESENTATION_TUNE_NAME] = {presentation: block.data.listPresentation};
  }

  return Object.keys(tunes).length > 0 ? tunes as BlogJsonObject : undefined;
}

function extractLegacyListItems(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

function extractRecursiveListItems(value: unknown, legacyChecklist = false): readonly BlogListItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(item => {
    if (!isRecord(item)) {
      return [];
    }

    const content = getString(item, 'content') ?? getString(item, 'text') ?? '';
    const sourceMeta = isJsonObject(item['meta']) ? item['meta'] : {};
    const checked = getOptionalBoolean(item, 'checked');
    const meta: BlogJsonObject = legacyChecklist && checked !== undefined
      ? {...sourceMeta, checked}
      : sourceMeta;

    return [{
      content,
      meta,
      items: extractRecursiveListItems(item['items'], legacyChecklist),
    }];
  });
}

function toListStyle(value: unknown, fallback: BlogListStyle = 'unordered'): BlogListStyle {
  return typeof value === 'string' && (BLOG_LIST_STYLES as readonly string[]).includes(value)
    ? value as BlogListStyle
    : fallback;
}

function toListPresentation(value: unknown): BlogListPresentation | undefined {
  return typeof value === 'string' && (BLOG_LIST_PRESENTATIONS as readonly string[]).includes(value)
    ? value as BlogListPresentation
    : undefined;
}

function getListPresentationFromTunes(tunes: BlogJsonObject | undefined): BlogListPresentation | undefined {
  const tune = tunes?.[LIST_PRESENTATION_TUNE_NAME];
  return isRecord(tune) ? toListPresentation(tune['presentation']) : undefined;
}

function omitListPresentationTune(tunes: BlogJsonObject | undefined): BlogJsonObject | undefined {
  if (!tunes || !(LIST_PRESENTATION_TUNE_NAME in tunes)) {
    return tunes;
  }

  const retainedTunes = Object.fromEntries(
    Object.entries(tunes).filter(([name]) => name !== LIST_PRESENTATION_TUNE_NAME)
  ) as BlogJsonObject;

  return Object.keys(retainedTunes).length > 0 ? retainedTunes : undefined;
}

function createListBlockData(data: Record<string, unknown>, legacyChecklist = false): BlogBlockData {
  const rawItems = data['items'];

  if (Array.isArray(rawItems) && rawItems.every(item => typeof item === 'string')) {
    const ordered = data['style'] === 'ordered';

    return {
      ordered,
      items: extractLegacyListItems(rawItems),
    };
  }

  const listStyle = legacyChecklist ? 'checklist' : toListStyle(data['style']);

  return {
    ordered: listStyle === 'ordered',
    listStyle,
    listMeta: isJsonObject(data['meta']) ? data['meta'] : {},
    listItems: extractRecursiveListItems(rawItems, legacyChecklist),
  };
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

function createUnsupportedEnvelope(data: Record<string, unknown>): BlogUnsupportedBlockEnvelope {
  return {
    originalType: getString(data, 'originalType') ?? 'unknown',
    originalData: isJsonObject(data['originalData']) ? data['originalData'] : {},
    ...(isJsonObject(data['originalTunes']) ? {originalTunes: data['originalTunes']} : {}),
  };
}

function extractLegacyChartJsPoints(data: Record<string, unknown>): readonly BlogChartPoint[] {
  const nestedData = data['data'];

  if (!isRecord(nestedData)) {
    return [];
  }

  const labels = extractChartLabels(nestedData['labels']);
  const datasets = extractChartDatasets(nestedData['datasets']);

  return labels.flatMap((label, labelIndex) => datasets.flatMap(dataset => {
    const value = dataset.data[labelIndex];

    return typeof value === 'number' ? [{
      label,
      value,
      series: dataset.label,
    }] : [];
  }));
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
      return createListBlockData(data);
    case 'image': {
      const imageSize = toImageSize(data['imageSize']);

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
        ...(imageSize ? {imageSize} : {}),
      };
    }
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
      const importedPoints = extractChartPoints(extractArrayByAlias(data, ['chartPoints', 'points', 'rows', 'items', 'data']));
      const chartPoints = importedPoints.length > 0 ? importedPoints : extractLegacyChartJsPoints(data);
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
        chartType: toChartType(data['chartType'] ?? data['type']),
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
    case 'unsupported':
      return {
        unsupportedBlock: createUnsupportedEnvelope(data),
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
  return document.blocks.map((block, index) => {
    const id = block.id ?? `block-${Date.now().toString(36)}-${index}`;
    const data = block.data;

    if (!isJsonObject(data)) {
      throw new Error(`Editor.js block ${index + 1} (${block.type || 'missing type'}) has non-JSON data and cannot be saved safely.`);
    }

    if (block.tunes !== undefined && !isJsonObject(block.tunes)) {
      throw new Error(`Editor.js block ${index + 1} (${block.type || 'missing type'}) has non-object tune metadata and cannot be saved safely.`);
    }

    const originalTunes = isJsonObject(block.tunes) ? block.tunes : undefined;
    const validation = validateEditorDocumentForBlog({blocks: [block]});
    const hasValidationError = validation.diagnostics.some(diagnostic => diagnostic.severity === 'error');

    if (!supportedBlockTypes.has(block.type as BlogBlockType)
      && block.type !== SUNO_EDITOR_BLOCK_TYPE
      && block.type !== APP_EMBED_EDITOR_BLOCK_TYPE
      && block.type !== YOUTUBE_EDITOR_BLOCK_TYPE
      && block.type !== LEGACY_CHECKLIST_EDITOR_BLOCK_TYPE) {
      return createUnsupportedBlogBlock(id, block.type, data, originalTunes);
    }

    if (hasValidationError) {
      return createUnsupportedBlogBlock(id, block.type, data, originalTunes);
    }

    if (block.type === BLOG_UNSUPPORTED_EDITOR_BLOCK_TYPE) {
      const envelope = createUnsupportedEnvelope(data);

      return {
        id,
        type: 'unsupported',
        data: {unsupportedBlock: envelope},
      };
    }

    if (block.type === SUNO_EDITOR_BLOCK_TYPE && isRecord(block.data)) {
      const urls = getBlogSunoEmbedUrls(getString(block.data, 'url'));

      if (!urls) {
        return createUnsupportedBlogBlock(id, block.type, data, originalTunes);
      }

      return withEditorTunes({
        id,
        type: 'embed',
        data: {
          provider: 'suno',
          url: urls.songUrl.toString(),
          embedUrl: urls.embedUrl.toString(),
          caption: getString(block.data, 'caption') ?? '',
          height: SUNO_EMBED_HEIGHT,
        },
      }, originalTunes);
    }

    if (block.type === APP_EMBED_EDITOR_BLOCK_TYPE && isRecord(block.data)) {
      const url = getString(block.data, 'url') ?? '';

      return withEditorTunes({
        id,
        type: 'embed',
        data: {
          provider: 'app',
          url,
          embedUrl: url,
          caption: getString(block.data, 'caption') ?? '',
          height: getNumber(block.data, 'height'),
        },
      }, originalTunes);
    }

    if (block.type === YOUTUBE_EDITOR_BLOCK_TYPE && isRecord(block.data)) {
      const url = getString(block.data, 'url') ?? '';

      return withEditorTunes({
        id,
        type: 'embed',
        data: {
          provider: 'youtube',
          url,
          embedUrl: createYouTubeEmbedUrl(url),
        },
      }, originalTunes);
    }

    if (block.type === LEGACY_CHECKLIST_EDITOR_BLOCK_TYPE) {
      const listPresentation = getListPresentationFromTunes(originalTunes);

      return withEditorTunes({
        id,
        type: 'list',
        data: {
          ...createListBlockData(data, true),
          ...(listPresentation ? {listPresentation} : {}),
        },
      }, omitListPresentationTune(originalTunes));
    }

    const type = block.type as BlogBlockType;
    const placement = toBlockPlacement(block.data['placement'], type === 'poll' ? 'rail' : undefined);
    const listPresentation = type === 'list' ? getListPresentationFromTunes(originalTunes) : undefined;
    const editorTunes = type === 'list' ? omitListPresentationTune(originalTunes) : originalTunes;

    return withEditorTunes({
      id,
      type,
      data: {
        ...createBlockData(type, block.data),
        ...(placement ? {placement} : {}),
        ...(listPresentation ? {listPresentation} : {}),
      },
    }, editorTunes);
  });
}

function createUnsupportedBlogBlock(
  id: string,
  originalType: string,
  originalData: BlogJsonObject,
  originalTunes?: BlogJsonObject
): BlogContentBlock {
  return {
    id,
    type: 'unsupported',
    data: {
      unsupportedBlock: {
        originalType,
        originalData,
        ...(originalTunes ? {originalTunes} : {}),
      },
    },
  };
}

function withEditorTunes(block: BlogContentBlock, editorTunes?: BlogJsonObject): BlogContentBlock {
  return editorTunes ? {...block, editorTunes} : block;
}
