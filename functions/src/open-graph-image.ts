export interface OpenGraphImageVariant {
  contentType?: unknown;
  format?: unknown;
  url?: unknown;
  width?: unknown;
}

const FIREBASE_STORAGE_HOST = 'firebasestorage.googleapis.com';
const MEDIA_ID_PATTERN = '[A-Za-z0-9][A-Za-z0-9_-]{15,127}';
const MANAGED_WEBP_PATH_PATTERN = new RegExp(
  `/o/cms/blog-media/[^/]+/[^/]+/(${MEDIA_ID_PATTERN})/\\d+w\\.webp$`,
  'i'
);

export function getManagedMediaIdFromWebpUrl(value: string): string | null {
  try {
    const url = new URL(value);

    if (url.protocol !== 'https:' || url.hostname !== FIREBASE_STORAGE_HOST) {
      return null;
    }

    return decodeURIComponent(url.pathname).match(MANAGED_WEBP_PATH_PATTERN)?.[1] ?? null;
  } catch {
    return null;
  }
}

export function getLargestJpegVariantUrl(value: unknown): string | null {
  if (!isRecord(value) || !Array.isArray(value['variants'])) {
    return null;
  }

  const jpegVariants = value['variants']
    .filter(isOpenGraphImageVariant)
    .filter(variant => variant.format === 'jpeg' || variant.contentType === 'image/jpeg')
    .map(variant => ({
      url: getSafeHttpsUrl(variant.url),
      width: getPositiveInteger(variant.width),
    }))
    .filter((variant): variant is { url: string; width: number } => Boolean(variant.url && variant.width));

  return jpegVariants.sort((left, right) => right.width - left.width)[0]?.url ?? null;
}

function isOpenGraphImageVariant(value: unknown): value is OpenGraphImageVariant {
  return isRecord(value);
}

function getSafeHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function getPositiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
