import {
  BlogJsonObject,
  BlogUnsupportedBlockEnvelope,
} from '../models/blog-post.model';

export interface DecodedBlogUnsupportedBlockEnvelope {
  originalType: string;
  originalData: BlogJsonObject;
  originalTunes?: BlogJsonObject;
}

const JSON_ENCODING = 'json-v1';
const MAX_JSON_DEPTH = 32;
const MAX_JSON_VALUES = 50_000;

export function createBlogUnsupportedBlockEnvelope(
  originalType: string,
  originalData: BlogJsonObject,
  originalTunes?: BlogJsonObject
): BlogUnsupportedBlockEnvelope {
  if (!hasFirestoreNestedArray(originalData) && !hasFirestoreNestedArray(originalTunes)) {
    return {
      originalType,
      originalData,
      ...(originalTunes ? {originalTunes} : {}),
    };
  }

  return {
    originalType,
    encoding: JSON_ENCODING,
    originalDataJson: JSON.stringify(originalData),
    ...(originalTunes ? {originalTunesJson: JSON.stringify(originalTunes)} : {}),
  };
}

export function decodeBlogUnsupportedBlockEnvelope(
  value: unknown
): DecodedBlogUnsupportedBlockEnvelope | null {
  if (!isRecord(value) || typeof value['originalType'] !== 'string' || !value['originalType'].trim()) {
    return null;
  }

  if (value['encoding'] === JSON_ENCODING) {
    if (value['originalData'] !== undefined || value['originalTunes'] !== undefined) {
      return null;
    }
    const originalData = parseJsonObject(value['originalDataJson']);
    const originalTunes = value['originalTunesJson'] === undefined
      ? undefined
      : parseJsonObject(value['originalTunesJson']);

    if (!originalData || (value['originalTunesJson'] !== undefined && !originalTunes)) {
      return null;
    }

    return {
      originalType: value['originalType'],
      originalData,
      ...(originalTunes ? {originalTunes} : {}),
    };
  }

  if (value['encoding'] !== undefined
    || value['originalDataJson'] !== undefined
    || value['originalTunesJson'] !== undefined
    || !isBlogJsonObject(value['originalData'])
    || (value['originalTunes'] !== undefined && !isBlogJsonObject(value['originalTunes']))) {
    return null;
  }

  return {
    originalType: value['originalType'],
    originalData: value['originalData'],
    ...(value['originalTunes'] ? {originalTunes: value['originalTunes']} : {}),
  };
}

function parseJsonObject(value: unknown): BlogJsonObject | null {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return isBlogJsonObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function hasFirestoreNestedArray(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(item => Array.isArray(item) || hasFirestoreNestedArray(item));
  }

  return isRecord(value) && Object.values(value).some(hasFirestoreNestedArray);
}

function isBlogJsonObject(value: unknown): value is BlogJsonObject {
  if (!isRecord(value)) {
    return false;
  }

  const stack: { item: unknown; depth: number }[] = [{item: value, depth: 0}];
  let valueCount = 0;
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || current.depth > MAX_JSON_DEPTH || ++valueCount > MAX_JSON_VALUES) {
      return false;
    }
    const item = current.item;
    if (item === null || typeof item === 'string' || typeof item === 'boolean') {
      continue;
    }
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) {
        return false;
      }
      continue;
    }
    if (Array.isArray(item)) {
      item.forEach(child => stack.push({item: child, depth: current.depth + 1}));
      continue;
    }
    if (isRecord(item)) {
      Object.values(item).forEach(child => stack.push({item: child, depth: current.depth + 1}));
      continue;
    }
    return false;
  }

  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
