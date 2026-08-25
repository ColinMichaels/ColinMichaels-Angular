import {BlogEvidenceBasis, BlogPostStatus} from '../../../features/blog/models/blog-post.model';
import {BlogSocialPromotion} from '../../../features/blog/models/blog-social-promotion.model';
import {isBlogPostStatus, isRecord} from '../../../features/blog/utils/blog-validation.util';
import {
  isBlogEditorialSourceDate,
  isBlogEvidenceBasis
} from '../../../features/blog/utils/blog-editorial-metadata.util';
import {EditorRecoverySnapshot} from './editor-document.model';

export const CMS_POST_RECOVERY_SCHEMA_VERSION = 1;
export const CMS_POST_RECOVERY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export interface CmsPostRecoveryFormData {
  authorId: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  backgroundImage: string;
  featured: boolean;
  catCornerEnabled: boolean;
  catCornerDiscoveryPost: boolean;
  status: BlogPostStatus;
  publishedAt: string;
  categories: string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  canonical: string;
  openGraphImage: string;
  evidenceBasis?: BlogEvidenceBasis | '';
  evidenceSummary?: string;
  sourceReviewedAt?: string;
  relationshipDisclosure?: string;
  aiAssistanceDisclosure?: string;
  syntheticMediaDisclosure?: string;
  updateNote?: string;
}

export interface CmsPostRecoverySnapshot {
  schemaVersion: typeof CMS_POST_RECOVERY_SCHEMA_VERSION;
  ownerUid: string;
  postId: string;
  postSlug: string;
  isNewPost: boolean;
  baseRevision: number;
  baseUpdatedAt: string;
  savedAt: string;
  expiresAt: string;
  contentHash: string;
  form: CmsPostRecoveryFormData;
  editor: EditorRecoverySnapshot;
  socialPromotion: BlogSocialPromotion;
}

export type CmsPostRecoveryWrite = Omit<
  CmsPostRecoverySnapshot,
  'schemaVersion' | 'ownerUid' | 'savedAt' | 'expiresAt' | 'contentHash'
>;

const RECOVERY_FORM_STRING_FIELDS: readonly (keyof CmsPostRecoveryFormData)[] = [
  'authorId',
  'title',
  'slug',
  'excerpt',
  'coverImage',
  'backgroundImage',
  'publishedAt',
  'categories',
  'tags',
  'seoTitle',
  'seoDescription',
  'canonical',
  'openGraphImage',
];

const RECOVERY_FORM_OPTIONAL_STRING_FIELDS: readonly (keyof CmsPostRecoveryFormData)[] = [
  'evidenceSummary',
  'relationshipDisclosure',
  'aiAssistanceDisclosure',
  'syntheticMediaDisclosure',
  'updateNote',
];

function isRecoveryFormData(value: unknown): value is CmsPostRecoveryFormData {
  return isRecord(value)
    && RECOVERY_FORM_STRING_FIELDS.every(field => typeof value[field] === 'string')
    && RECOVERY_FORM_OPTIONAL_STRING_FIELDS.every(field => value[field] === undefined || typeof value[field] === 'string')
    && (value['evidenceBasis'] === undefined || value['evidenceBasis'] === '' || isBlogEvidenceBasis(value['evidenceBasis']))
    && (value['sourceReviewedAt'] === undefined
      || value['sourceReviewedAt'] === ''
      || isBlogEditorialSourceDate(value['sourceReviewedAt']))
    && typeof value['featured'] === 'boolean'
    && typeof value['catCornerEnabled'] === 'boolean'
    && typeof value['catCornerDiscoveryPost'] === 'boolean'
    && isBlogPostStatus(value['status']);
}

function isEditorRecoverySnapshot(value: unknown): value is EditorRecoverySnapshot {
  if (!isRecord(value)) {
    return false;
  }

  if (value['mode'] === 'json') {
    return typeof value['source'] === 'string';
  }

  return value['mode'] === 'visual'
    && isRecord(value['document'])
    && Array.isArray(value['document']['blocks']);
}

export function isCmsPostRecoverySnapshot(value: unknown): value is CmsPostRecoverySnapshot {
  return isRecord(value)
    && value['schemaVersion'] === CMS_POST_RECOVERY_SCHEMA_VERSION
    && typeof value['ownerUid'] === 'string'
    && typeof value['postId'] === 'string'
    && typeof value['postSlug'] === 'string'
    && typeof value['isNewPost'] === 'boolean'
    && Number.isInteger(value['baseRevision'])
    && Number(value['baseRevision']) >= 0
    && typeof value['baseUpdatedAt'] === 'string'
    && typeof value['savedAt'] === 'string'
    && typeof value['expiresAt'] === 'string'
    && typeof value['contentHash'] === 'string'
    && isRecoveryFormData(value['form'])
    && isEditorRecoverySnapshot(value['editor'])
    && isRecord(value['socialPromotion'])
    && Array.isArray(value['socialPromotion']['announcements']);
}

export function isCmsPostRecoveryExpired(
  snapshot: Pick<CmsPostRecoverySnapshot, 'expiresAt'>,
  now = Date.now()
): boolean {
  const expiresAt = new Date(snapshot.expiresAt).getTime();
  return !Number.isFinite(expiresAt) || expiresAt <= now;
}

/** Stable, non-security fingerprint used only to compare recovery snapshots. */
export function createCmsPostRecoveryContentHash(value: unknown): string {
  const hash = hashStableValue(value, 0x811c9dc5);
  return `fnv1a-v2-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function hashStableValue(value: unknown, hash: number): number {
  if (Array.isArray(value)) {
    let nextHash = hashText(hash, `array:${value.length}[`);
    for (const item of value) {
      nextHash = hashStableValue(item, nextHash);
    }
    return hashText(nextHash, ']');
  }

  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    let nextHash = hashText(hash, `object:${keys.length}{`);
    for (const key of keys) {
      nextHash = hashText(nextHash, `key:${key.length}:`);
      nextHash = hashText(nextHash, key);
      nextHash = hashStableValue(value[key], nextHash);
    }
    return hashText(nextHash, '}');
  }

  if (typeof value === 'string') {
    return hashText(hashText(hash, `string:${value.length}:`), value);
  }
  if (value === null) {
    return hashText(hash, 'null');
  }
  if (typeof value === 'number') {
    return hashText(hash, `number:${Number.isFinite(value) ? String(value) : 'null'}`);
  }
  if (typeof value === 'boolean') {
    return hashText(hash, value ? 'boolean:true' : 'boolean:false');
  }

  return hashText(hash, `${typeof value}:undefined`);
}

function hashText(hash: number, value: string): number {
  let nextHash = hash;
  for (let index = 0; index < value.length; index += 1) {
    nextHash ^= value.charCodeAt(index);
    nextHash = Math.imul(nextHash, 0x01000193);
  }
  return nextHash;
}
