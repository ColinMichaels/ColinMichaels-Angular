import {BlogContentBlock, BlogPost} from '../../../features/blog/models/blog-post.model';
import {BlogMediaAssetRole} from '../services/blog-media-upload.service';

export const BLOG_POST_MEDIA_REFERENCE_PREFIX = 'media://';

export interface BlogPostMediaManifestEntry {
  /** Relative path of the supplied package image. */
  readonly file: string;
  /** Placeholder in post JSON. Defaults to `media://` plus `file`. */
  readonly reference: string;
  /** Stored media role used by the trusted CMS upload flow. */
  readonly role: BlogMediaAssetRole;
  readonly altText: string;
}

export interface BlogPostMediaPackageManifest {
  readonly images: readonly BlogPostMediaManifestEntry[];
}

export interface BlogPostPackageFileMatch {
  readonly entry: BlogPostMediaManifestEntry;
  readonly file: File;
}

type JsonRecord = Record<string, unknown>;

const MEDIA_ROLES = new Set<BlogMediaAssetRole>([
  'cover',
  'post-background',
  'open-graph',
  'editor-image',
  'thumbnail',
  'inline-image',
]);

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeRelativePath(value: string, label: string): string {
  const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '').trim();

  if (
    !normalized
    || normalized.startsWith('/')
    || normalized.includes('://')
    || normalized.split('/').some(segment => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error(`${label} must be a safe relative package path.`);
  }

  return normalized;
}

function normalizeReference(value: string, fallbackFile: string, index: number): string {
  const fallback = `${BLOG_POST_MEDIA_REFERENCE_PREFIX}${fallbackFile}`;
  const reference = value || fallback;

  if (!reference.startsWith(BLOG_POST_MEDIA_REFERENCE_PREFIX)) {
    throw new Error(`Image manifest entry ${index + 1} reference must begin with ${BLOG_POST_MEDIA_REFERENCE_PREFIX}.`);
  }

  return `${BLOG_POST_MEDIA_REFERENCE_PREFIX}${normalizeRelativePath(
    reference.slice(BLOG_POST_MEDIA_REFERENCE_PREFIX.length),
    `Image manifest entry ${index + 1} reference`
  )}`;
}

function entryRole(value: string): BlogMediaAssetRole {
  return MEDIA_ROLES.has(value as BlogMediaAssetRole)
    ? value as BlogMediaAssetRole
    : 'inline-image';
}

/**
 * Parses the portable image-manifest contract used beside a post JSON file.
 * Each image points to a local package file and a `media://` placeholder that
 * occurs in one of the post's known media fields.
 */
export function parseBlogPostMediaPackageManifest(value: unknown): BlogPostMediaPackageManifest {
  const rawEntries = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value['images'])
      ? value['images']
      : null;

  if (!rawEntries || rawEntries.length === 0) {
    throw new Error('Image manifest must contain a non-empty images array.');
  }

  const references = new Set<string>();
  const files = new Set<string>();
  const images = rawEntries.map((rawEntry, index): BlogPostMediaManifestEntry => {
    if (!isRecord(rawEntry)) {
      throw new Error(`Image manifest entry ${index + 1} must be an object.`);
    }

    const file = normalizeRelativePath(
      text(rawEntry['file']) || text(rawEntry['source']) || text(rawEntry['path']),
      `Image manifest entry ${index + 1} file`
    );
    const reference = normalizeReference(text(rawEntry['reference']), file, index);

    if (files.has(file)) {
      throw new Error(`Image manifest contains the same file more than once: ${file}.`);
    }
    if (references.has(reference)) {
      throw new Error(`Image manifest contains the same media reference more than once: ${reference}.`);
    }

    files.add(file);
    references.add(reference);

    return {
      file,
      reference,
      role: entryRole(text(rawEntry['role'])),
      altText: text(rawEntry['altText']) || text(rawEntry['alt']),
    };
  });

  return {images};
}

/** Finds an optional inline manifest within a normal post-import document. */
export function getEmbeddedBlogPostMediaPackageManifest(value: unknown): BlogPostMediaPackageManifest | null {
  if (!isRecord(value)) {
    return null;
  }

  const embeddedManifest = value['imageManifest']
    ?? value['mediaManifest']
    ?? (Array.isArray(value['images']) ? value : undefined);
  return embeddedManifest === undefined ? null : parseBlogPostMediaPackageManifest(embeddedManifest);
}

/**
 * Matches browser-selected package files to manifest paths. Selecting a folder
 * preserves `webkitRelativePath`; ordinary multi-file selection also works as
 * long as image filenames are unambiguous.
 */
export function matchBlogPostPackageImageFiles(
  manifest: BlogPostMediaPackageManifest,
  files: readonly File[]
): readonly BlogPostPackageFileMatch[] {
  const matches: BlogPostPackageFileMatch[] = [];

  for (const entry of manifest.images) {
    const candidates = files.filter(file => {
      const rawPath = file.webkitRelativePath || file.name;
      const candidatePath = normalizeRelativePath(rawPath, `Selected file ${file.name}`);
      return candidatePath === entry.file || candidatePath.endsWith(`/${entry.file}`);
    });

    if (candidates.length === 0) {
      throw new Error(`Package is missing the image declared by the manifest: ${entry.file}.`);
    }
    if (candidates.length > 1) {
      throw new Error(`Package contains more than one file matching manifest image: ${entry.file}.`);
    }

    matches.push({entry, file: candidates[0]});
  }

  return matches;
}

function replaceReference(value: string | undefined, replacements: ReadonlyMap<string, string>): string | undefined {
  return value ? replacements.get(value) ?? value : value;
}

function replaceBlockMediaReferences(
  block: BlogContentBlock,
  replacements: ReadonlyMap<string, string>
): BlogContentBlock {
  if (block.type === 'image') {
    return {
      ...block,
      data: {...block.data, url: replaceReference(block.data.url, replacements)},
    };
  }

  if (block.type === 'gallery') {
    return {
      ...block,
      data: {
        ...block.data,
        galleryImages: block.data.galleryImages?.map(image => ({
          ...image,
          url: replaceReference(image.url, replacements) ?? image.url,
        })),
      },
    };
  }

  return block;
}

/** Replaces only known media URL fields; article text and external links stay untouched. */
export function replaceBlogPostMediaPackageReferences(
  post: BlogPost,
  replacements: ReadonlyMap<string, string>
): BlogPost {
  return {
    ...post,
    coverImage: replaceReference(post.coverImage, replacements) ?? post.coverImage,
    backgroundImage: replaceReference(post.backgroundImage, replacements),
    thumbnailImage: replaceReference(post.thumbnailImage, replacements),
    author: {
      ...post.author,
      avatarUrl: replaceReference(post.author.avatarUrl, replacements),
    },
    seo: {
      ...post.seo,
      openGraphImage: replaceReference(post.seo.openGraphImage, replacements),
    },
    og: post.og && {
      ...post.og,
      image: replaceReference(post.og.image, replacements),
    },
    socialPromotion: post.socialPromotion && {
      ...post.socialPromotion,
      announcements: post.socialPromotion.announcements.map(announcement => ({
        ...announcement,
        mediaUrl: replaceReference(announcement.mediaUrl, replacements),
      })),
    },
    blocks: post.blocks.map(block => replaceBlockMediaReferences(block, replacements)),
  };
}

/** Fails closed if a declared placeholder remains in a reader-facing image field. */
export function getUnresolvedBlogPostMediaPackageReferences(post: BlogPost): readonly string[] {
  const references = new Set<string>();
  const add = (value: string | undefined): void => {
    if (value?.startsWith(BLOG_POST_MEDIA_REFERENCE_PREFIX)) {
      references.add(value);
    }
  };

  add(post.coverImage);
  add(post.backgroundImage);
  add(post.thumbnailImage);
  add(post.author.avatarUrl);
  add(post.seo.openGraphImage);
  add(post.og?.image);
  post.socialPromotion?.announcements.forEach(announcement => add(announcement.mediaUrl));
  post.blocks.forEach(block => {
    if (block.type === 'image') add(block.data.url);
    if (block.type === 'gallery') block.data.galleryImages?.forEach(image => add(image.url));
  });

  return [...references];
}
