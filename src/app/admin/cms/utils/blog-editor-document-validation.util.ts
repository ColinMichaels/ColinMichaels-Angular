import type {OutputData} from '@editorjs/editorjs';

import {
  BLOG_CHART_TYPES,
  BLOG_GALLERY_LAYOUTS,
  BLOG_IMAGE_LAYOUTS,
  BLOG_IMAGE_SIZES,
  BLOG_LIST_PRESENTATIONS,
  BLOG_LIST_STYLES,
  BLOG_POLL_RESULTS_VISIBILITIES,
  BLOG_TYPOGRAPHY_VARIANTS,
  BlogJsonObject,
  BlogJsonValue,
} from '../../../features/blog/models/blog-post.model';
import {getBlogSunoEmbedUrls} from '../../../features/blog/utils/blog-suno-embed.util';

export const BLOG_UNSUPPORTED_EDITOR_BLOCK_TYPE = 'unsupported';

const YOUTUBE_EDITOR_BLOCK_TYPE = 'youtubeEmbed';
const SUNO_EDITOR_BLOCK_TYPE = 'sunoEmbed';
const APP_EMBED_EDITOR_BLOCK_TYPE = 'appEmbed';
const LEGACY_CHECKLIST_EDITOR_BLOCK_TYPE = 'checklist';

const knownEditorBlockTypes = new Set([
  'paragraph',
  'header',
  'image',
  'gallery',
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
  YOUTUBE_EDITOR_BLOCK_TYPE,
  SUNO_EDITOR_BLOCK_TYPE,
  APP_EMBED_EDITOR_BLOCK_TYPE,
  LEGACY_CHECKLIST_EDITOR_BLOCK_TYPE,
  BLOG_UNSUPPORTED_EDITOR_BLOCK_TYPE,
]);

export type BlogEditorDocumentDiagnosticSeverity = 'error' | 'warning';

export type BlogEditorDocumentDiagnosticCode =
  | 'invalid-known-block'
  | 'invalid-editor-block'
  | 'preserved-unsupported-block'
  | 'markdown-heading-outside-toc'
  | 'repeated-post-title-heading';

export interface BlogEditorDocumentValidationContext {
  postTitle?: string;
}

export interface BlogEditorDocumentDiagnostic {
  severity: BlogEditorDocumentDiagnosticSeverity;
  code: BlogEditorDocumentDiagnosticCode;
  blockIndex: number;
  blockType: string;
  message: string;
}

export interface BlogEditorDocumentValidationResult {
  isValid: boolean;
  diagnostics: readonly BlogEditorDocumentDiagnostic[];
}

export function isKnownBlogEditorBlockType(type: string): boolean {
  return knownEditorBlockTypes.has(type);
}

export function validateEditorDocumentForBlog(
  document: OutputData,
  context: BlogEditorDocumentValidationContext = {}
): BlogEditorDocumentValidationResult {
  const diagnostics: BlogEditorDocumentDiagnostic[] = [];

  document.blocks.forEach((block, blockIndex) => {
    const blockType = typeof block?.type === 'string' ? block.type : '';

    if (!blockType || !isJsonObject(block?.data)) {
      diagnostics.push({
        severity: 'error',
        code: 'invalid-editor-block',
        blockIndex,
        blockType: blockType || '(missing)',
        message: `Block ${blockIndex + 1} must have a non-empty type and JSON object data.`,
      });
      return;
    }

    if (block.tunes !== undefined && !isJsonObject(block.tunes)) {
      diagnostics.push({
        severity: 'error',
        code: 'invalid-editor-block',
        blockIndex,
        blockType,
        message: `Block ${blockIndex + 1} (${blockType}) has non-object tune metadata that cannot be preserved safely.`,
      });
      return;
    }

    if (!isKnownBlogEditorBlockType(blockType)) {
      diagnostics.push({
        severity: 'warning',
        code: 'preserved-unsupported-block',
        blockIndex,
        blockType,
        message: `Block ${blockIndex + 1} (${blockType}) is unsupported and will be preserved in a compatibility envelope.`,
      });
      return;
    }

    const validationError = getKnownBlockValidationError(blockType, block.data)
      ?? getKnownBlockTuneValidationError(blockType, block.data, block.tunes);

    if (validationError) {
      diagnostics.push({
        severity: 'error',
        code: 'invalid-known-block',
        blockIndex,
        blockType,
        message: `Block ${blockIndex + 1} (${blockType}) ${validationError}`,
      });
    } else if (blockType === BLOG_UNSUPPORTED_EDITOR_BLOCK_TYPE) {
      const originalType = typeof block.data['originalType'] === 'string'
        ? block.data['originalType']
        : 'unknown';
      diagnostics.push({
        severity: 'warning',
        code: 'preserved-unsupported-block',
        blockIndex,
        blockType: originalType,
        message: `Block ${blockIndex + 1} (${originalType}) is preserved in a compatibility envelope and is not rendered publicly.`,
      });
    }

    if (blockType === 'markdown' && hasMarkdownHeading(block.data['markdown'])) {
      diagnostics.push({
        severity: 'warning',
        code: 'markdown-heading-outside-toc',
        blockIndex,
        blockType,
        message: `Block ${blockIndex + 1} (markdown) contains a heading that renders visually but is not included in the article table of contents. Use a Heading block when the section should be navigable.`,
      });
    }
  });

  const firstHeadingIndex = document.blocks.findIndex(block => block.type === 'header');
  const firstHeading = document.blocks[firstHeadingIndex];
  const postTitle = normalizeHeadingComparisonText(context.postTitle ?? '');
  const firstHeadingText = firstHeading && isJsonObject(firstHeading.data)
    ? normalizeHeadingComparisonText(typeof firstHeading.data['text'] === 'string' ? firstHeading.data['text'] : '')
    : '';

  if (postTitle && firstHeadingText && postTitle === firstHeadingText) {
    diagnostics.push({
      severity: 'warning',
      code: 'repeated-post-title-heading',
      blockIndex: firstHeadingIndex,
      blockType: 'header',
      message: `Block ${firstHeadingIndex + 1} repeats the post title as the first article heading. Remove or rename it so the page keeps one clear title hierarchy.`,
    });
  }

  return {
    isValid: diagnostics.every(diagnostic => diagnostic.severity !== 'error'),
    diagnostics,
  };
}

function hasMarkdownHeading(value: BlogJsonValue | undefined): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  let fenceMarker: '`' | '~' | null = null;
  let previousContentLine = '';

  for (const line of value.split(/\r?\n/)) {
    const fence = line.match(/^\s{0,3}(`{3,}|~{3,})/);

    if (fence) {
      const marker = fence[1][0] as '`' | '~';
      fenceMarker = fenceMarker === marker ? null : fenceMarker ?? marker;
      previousContentLine = '';
      continue;
    }

    if (fenceMarker) {
      continue;
    }

    if (/^\s{0,3}#{1,6}(?:\s+|$)\S*/.test(line)) {
      return true;
    }

    if (previousContentLine && /^\s{0,3}(?:=+|-+)\s*$/.test(line)) {
      return true;
    }

    previousContentLine = line.trim();
  }

  return false;
}

function normalizeHeadingComparisonText(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Replaces raw, unregistered Editor.js tools with the CMS compatibility tool.
 * The source document is not mutated and IDs, data, and tune metadata survive.
 */
export function normalizeEditorDocumentForBlogEditor(document: OutputData): OutputData {
  return {
    ...document,
    blocks: document.blocks.map(block => {
      if (isKnownBlogEditorBlockType(block.type)
        || !isJsonObject(block.data)
        || (block.tunes !== undefined && !isJsonObject(block.tunes))) {
        return block;
      }

      const originalTunes = isJsonObject(block.tunes) ? block.tunes : undefined;

      return {
        id: block.id,
        type: BLOG_UNSUPPORTED_EDITOR_BLOCK_TYPE,
        data: {
          originalType: block.type,
          originalData: block.data,
          ...(originalTunes ? {originalTunes} : {}),
        },
      };
    }),
  };
}

export function isJsonObject(value: unknown): value is BlogJsonObject {
  return isPlainRecord(value) && Object.values(value).every(isJsonValue);
}

function isJsonValue(value: unknown): value is BlogJsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  return isJsonObject(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getKnownBlockValidationError(type: string, data: BlogJsonObject): string | null {
  switch (type) {
    case 'paragraph':
      return validateFields(data, {text: isString});
    case 'header':
      return validateFields(data, {text: isString, level: value => value === 2 || value === 3});
    case 'quote':
      return validateFields(data, {text: isString, caption: isString, alignment: isString});
    case 'list':
      return validateListData(data);
    case LEGACY_CHECKLIST_EDITOR_BLOCK_TYPE:
      return validateLegacyChecklistData(data);
    case 'image':
      return validateImageData(data);
    case 'gallery':
      return validateGalleryData(data);
    case 'embed':
      return validateFields(data, {
        service: isString,
        source: isString,
        embed: isString,
        caption: isString,
        width: isFiniteNumber,
        height: isFiniteNumber,
      });
    case YOUTUBE_EDITOR_BLOCK_TYPE:
      return validateFields(data, {url: isString});
    case SUNO_EDITOR_BLOCK_TYPE: {
      const fieldsError = validateFields(data, {url: isString, caption: isString});
      const url = data['url'];
      return fieldsError ?? (typeof url === 'string' && getBlogSunoEmbedUrls(url)
        ? null
        : 'has an invalid Suno URL.');
    }
    case APP_EMBED_EDITOR_BLOCK_TYPE:
      return validateFields(data, {url: isString, caption: isString, height: isFiniteNumber});
    case 'code':
      return validateFields(data, {code: isString, language: isString});
    case 'markdown':
      return validateFields(data, {markdown: isString, text: isString, content: isString});
    case 'delimiter':
    case 'catCornerUnlock':
      return validateFields(data, {});
    case 'typography':
      return validateFields(data, {
        variant: value => typeof value === 'string' && (BLOG_TYPOGRAPHY_VARIANTS as readonly string[]).includes(value),
        text: isString,
        attribution: isString,
      });
    case 'stats':
      return validateStatsData(data);
    case 'chart':
      return validateChartData(data);
    case 'poll':
      return validatePollData(data);
    case 'html':
      return validateFields(data, {title: isString, html: isString});
    case BLOG_UNSUPPORTED_EDITOR_BLOCK_TYPE:
      return validateUnsupportedBlockData(data);
    default:
      return null;
  }
}

function getKnownBlockTuneValidationError(type: string, data: BlogJsonObject, tunes: unknown): string | null {
  if ((type !== 'list' && type !== LEGACY_CHECKLIST_EDITOR_BLOCK_TYPE)
    || tunes === undefined
    || !isJsonObject(tunes)) {
    return null;
  }

  const presentationTune = tunes['listPresentation'];

  if (presentationTune === undefined) {
    return null;
  }

  if (!isJsonObject(presentationTune)) {
    return 'has invalid list presentation tune metadata.';
  }

  const keys = Object.keys(presentationTune);
  const presentation = presentationTune['presentation'];

  if (keys.length === 0) {
    return null;
  }

  const tuneShapeValid = keys.length === 1
    && typeof presentation === 'string'
    && (BLOG_LIST_PRESENTATIONS as readonly string[]).includes(presentation);

  if (!tuneShapeValid) {
    return 'has invalid list presentation tune metadata.';
  }

  if (presentation === 'steps' && (type === LEGACY_CHECKLIST_EDITOR_BLOCK_TYPE || data['style'] !== 'ordered')) {
    return 'can use the Steps presentation only with an ordered list.';
  }

  return null;
}

type FieldValidator = (value: BlogJsonValue) => boolean;

function validateFields(
  data: BlogJsonObject,
  validators: Readonly<Record<string, FieldValidator>>,
  additionalAllowedKeys: readonly string[] = []
): string | null {
  const allowedKeys = new Set([...Object.keys(validators), ...additionalAllowedKeys, 'placement']);

  for (const [key, value] of Object.entries(data)) {
    if (!allowedKeys.has(key)) {
      return `contains unsupported data field "${key}" that the known block cannot preserve.`;
    }

    if (key === 'placement') {
      if (value !== 'content' && value !== 'rail') {
        return 'has an invalid placement.';
      }
      continue;
    }

    const validator = validators[key];

    if (validator && !validator(value)) {
      return `has an invalid "${key}" field.`;
    }
  }

  return null;
}

function validateListData(data: BlogJsonObject): string | null {
  const fieldsError = validateFields(data, {
    style: value => typeof value === 'string' && (BLOG_LIST_STYLES as readonly string[]).includes(value),
    meta: isJsonObject,
    items: value => Array.isArray(value) && value.every(item => typeof item === 'string' || isListItem(item)),
  });

  if (fieldsError) {
    return fieldsError;
  }

  if (!Array.isArray(data['items'])) {
    return 'must contain an items array.';
  }

  const containsStrings = data['items'].some(item => typeof item === 'string');
  const containsObjects = data['items'].some(item => typeof item !== 'string');

  return containsStrings && containsObjects
    ? 'cannot mix legacy string items with recursive list items.'
    : null;
}

function isListItem(value: BlogJsonValue): boolean {
  if (!isJsonObject(value)) {
    return false;
  }

  const error = validateFields(value, {
    content: isString,
    meta: isJsonObject,
    items: candidate => Array.isArray(candidate) && candidate.every(isListItem),
  }, ['text', 'checked']);

  if (error) {
    return false;
  }

  const content = value['content'] ?? value['text'];
  const checked = value['checked'];

  return typeof content === 'string'
    && (checked === undefined || typeof checked === 'boolean')
    && (value['items'] === undefined || Array.isArray(value['items']));
}

function validateLegacyChecklistData(data: BlogJsonObject): string | null {
  const error = validateFields(data, {
    items: value => Array.isArray(value) && value.every(item => isJsonObject(item)
      && typeof item['text'] === 'string'
      && typeof item['checked'] === 'boolean'),
  });

  return error ?? (Array.isArray(data['items']) ? null : 'must contain an items array.');
}

function validateImageData(data: BlogJsonObject): string | null {
  const error = validateFields(data, {
    file: value => isJsonObject(value)
      && validateFields(value, {url: isString, alt: isString, width: isPositiveFiniteNumber, height: isPositiveFiniteNumber}) === null,
    url: isString,
    alt: isString,
    caption: isString,
    width: isPositiveFiniteNumber,
    height: isPositiveFiniteNumber,
    stretched: isBoolean,
    withBorder: isBoolean,
    withBackground: isBoolean,
    imageLayout: value => typeof value === 'string' && (BLOG_IMAGE_LAYOUTS as readonly string[]).includes(value),
    imageSize: value => typeof value === 'string' && (BLOG_IMAGE_SIZES as readonly string[]).includes(value),
  });

  return error;
}

function validateGalleryData(data: BlogJsonObject): string | null {
  const error = validateFields(data, {
    title: isString,
    caption: isString,
    layout: value => typeof value === 'string'
      && (BLOG_GALLERY_LAYOUTS as readonly string[]).includes(value),
    images: value => Array.isArray(value) && value.every(isGalleryImage),
  });

  if (error) {
    return error;
  }

  const images = data['images'];

  if (!Array.isArray(images) || images.length < 2 || images.length > 20) {
    return 'must contain between 2 and 20 images.';
  }

  return null;
}

function isGalleryImage(value: BlogJsonValue): boolean {
  if (!isJsonObject(value)) {
    return false;
  }

  const error = validateFields(value, {
    url: isString,
    alt: isString,
    caption: isString,
    width: isPositiveFiniteNumber,
    height: isPositiveFiniteNumber,
  });

  return error === null
    && typeof value['url'] === 'string'
    && value['url'].trim().length > 0
    && typeof value['alt'] === 'string'
    && value['alt'].trim().length > 0;
}

function validateStatsData(data: BlogJsonObject): string | null {
  const rowValidator = (value: BlogJsonValue): boolean => Array.isArray(value)
    || (isJsonObject(value) && Object.values(value).every(isJsonValue));
  return validateFields(data, {
    title: isString,
    caption: isString,
    stats: value => Array.isArray(value) && value.every(rowValidator),
    rows: value => Array.isArray(value) && value.every(rowValidator),
    items: value => Array.isArray(value) && value.every(rowValidator),
    data: value => Array.isArray(value) && value.every(rowValidator),
  });
}

function validateChartData(data: BlogJsonObject): string | null {
  return validateFields(data, {
    title: isString,
    caption: isString,
    chartType: value => typeof value === 'string' && (BLOG_CHART_TYPES as readonly string[]).includes(value),
    type: value => typeof value === 'string' && (BLOG_CHART_TYPES as readonly string[]).includes(value),
    unit: isString,
    chartPoints: isChartPointArray,
    points: isChartPointArray,
    rows: isChartPointArray,
    items: isChartPointArray,
    data: value => isChartPointArray(value) || (isJsonObject(value)
      && validateFields(value, {labels: isChartLabelArray, datasets: isChartDatasetArray}) === null),
    labels: isChartLabelArray,
    datasets: isChartDatasetArray,
    xAxisTitle: isString,
    yAxisTitle: isString,
    yMax: isFiniteNumber,
    valueSuffix: isString,
    decimals: isFiniteNumber,
    showLegend: isBoolean,
    sourceLabel: isString,
    sourceUrl: isString,
    accessibilitySummary: isString,
  });
}

function validatePollData(data: BlogJsonObject): string | null {
  const optionsValidator = (value: BlogJsonValue): boolean => Array.isArray(value)
    && value.every(option => isJsonObject(option)
      && (option['id'] === undefined || typeof option['id'] === 'string')
      && typeof (option['label'] ?? option['text']) === 'string');

  return validateFields(data, {
    question: isString,
    description: isString,
    pollOptions: optionsValidator,
    options: optionsValidator,
    answers: optionsValidator,
    pollResultsVisibility: value => typeof value === 'string'
      && (BLOG_POLL_RESULTS_VISIBILITIES as readonly string[]).includes(value),
  });
}

function validateUnsupportedBlockData(data: BlogJsonObject): string | null {
  const error = validateFields(data, {
    originalType: value => typeof value === 'string' && value.trim().length > 0,
    originalData: isJsonObject,
    originalTunes: isJsonObject,
  });

  return error ?? (typeof data['originalType'] === 'string' && isJsonObject(data['originalData'])
    ? null
    : 'must contain originalType and originalData.');
}

function isString(value: BlogJsonValue): boolean {
  return typeof value === 'string';
}

function isBoolean(value: BlogJsonValue): boolean {
  return typeof value === 'boolean';
}

function isFiniteNumber(value: BlogJsonValue): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveFiniteNumber(value: BlogJsonValue): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isChartLabelArray(value: BlogJsonValue): boolean {
  return Array.isArray(value)
    && value.every(label => typeof label === 'string' || typeof label === 'number' || typeof label === 'boolean');
}

function isChartPointArray(value: BlogJsonValue): boolean {
  return Array.isArray(value) && value.every(point => {
    if (Array.isArray(point)) {
      return point[1] === undefined || toFiniteNumber(point[1]) !== undefined;
    }

    if (!isJsonObject(point)) {
      return false;
    }

    const valueKeys = ['value', 'y', 'amount', 'score', 'number', 'metric'];
    const valueEntry = Object.entries(point)
      .find(([key]) => valueKeys.includes(key.trim().toLowerCase().replace(/[\s_-]+/g, '')));

    return valueEntry === undefined || toFiniteNumber(valueEntry[1]) !== undefined;
  });
}

function isChartDatasetArray(value: BlogJsonValue): boolean {
  return Array.isArray(value) && value.every(dataset => isJsonObject(dataset)
    && typeof dataset['label'] === 'string'
    && Array.isArray(dataset['data'])
    && dataset['data'].every(item => item === null || toFiniteNumber(item) !== undefined)
    && (dataset['borderColor'] === undefined || typeof dataset['borderColor'] === 'string')
    && (dataset['backgroundColor'] === undefined || typeof dataset['backgroundColor'] === 'string'));
}

function toFiniteNumber(value: BlogJsonValue): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const normalizedValue = value.trim().replace(/,/g, '');

  if (/^[+-]?(?:\d+|\d*\.\d+)(?:e[+-]?\d+)?$/i.test(normalizedValue)) {
    return Number(normalizedValue);
  }

  const firstNumber = value.match(/[+-]?\d[\d,]*(?:\.\d+)?/);
  return firstNumber ? Number(firstNumber[0].replace(/,/g, '')) : undefined;
}
