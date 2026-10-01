import {Auth} from 'firebase-admin/auth';
import {Firestore} from 'firebase-admin/firestore';
import {HttpsError} from 'firebase-functions/v2/https';

export const EARLY_READER_ROLE = 'earlyReader';
export const MAX_PUBLIC_SCHEDULE_RECORDS = 200;
const CMS_READER_ROLES = ['admin', 'cmsAdmin', 'contentEditor'] as const;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export interface ReaderRelease {
  announceInSchedule: boolean;
  earlyAccessAt: string | null;
}

export interface ScheduleCallableAuth {
  uid: string;
  token: Record<string, unknown>;
}

export interface CurrentReaderPermission {
  canReadEarly: boolean;
}

export type PublishingScheduleAccess = 'public' | 'early' | 'locked';
export interface PublicPublishingScheduleEntry {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  publishedAt: string;
  earlyAccessAt: string | null;
  status: 'scheduled' | 'published';
  access: PublishingScheduleAccess;
}

export function parseReleaseTimestamp(value: unknown): number | null {
  if (typeof value !== 'string' || !ISO_PATTERN.test(value)) {
    return null;
  }
  // Date.parse accepts overflowing calendar days; an embargo must not.
  const datePart = value.slice(0, 10);
  const calendarDate = new Date(`${datePart}T00:00:00.000Z`);
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && Number.isFinite(calendarDate.getTime())
    && calendarDate.toISOString().slice(0, 10) === datePart ? timestamp : null;
}

export function validateReaderRelease(value: unknown, publishedAt: unknown): void {
  if (value === undefined) {
    return;
  }
  if (!isRecord(value) || Object.keys(value).length !== 2
    || typeof value['announceInSchedule'] !== 'boolean'
    || !Object.hasOwn(value, 'earlyAccessAt')) {
    throw new HttpsError('invalid-argument', 'Reader release requires only announceInSchedule and earlyAccessAt.');
  }
  const earlyAt = value['earlyAccessAt'];
  if (earlyAt === null) {
    return;
  }
  const earlyTime = parseReleaseTimestamp(earlyAt);
  const releaseTime = parseReleaseTimestamp(publishedAt);
  if (earlyTime === null || releaseTime === null || earlyTime >= releaseTime) {
    throw new HttpsError('invalid-argument', 'Early access requires an ISO timestamp before publication.');
  }
}

/** Resolve privileges from the current Auth record, never the browser role view. */
export async function resolveCurrentReaderPermission(
  auth: Pick<Auth, 'getUser'>,
  caller: ScheduleCallableAuth | undefined,
): Promise<CurrentReaderPermission | null> {
  if (!caller?.uid) {
    return null;
  }
  try {
    const user = await auth.getUser(caller.uid);
    const authenticatedAt = caller.token['auth_time'];
    const validAfter = Date.parse(user.tokensValidAfterTime ?? '');
    if (user.disabled || typeof authenticatedAt !== 'number' || !Number.isFinite(authenticatedAt)
      || (Number.isFinite(validAfter) && authenticatedAt * 1_000 < validAfter)) {
      return null;
    }
    const claims = user.customClaims ?? {};
    return {
      canReadEarly: hasRole(claims, EARLY_READER_ROLE)
        || CMS_READER_ROLES.some(role => hasRole(claims, role)),
    };
  } catch {
    // Revoked/deleted users and Auth outages never yield early privileges.
    return null;
  }
}

export function getPublishingScheduleAccess(
  post: Record<string, unknown>,
  permission: CurrentReaderPermission | null,
  now: Date,
): PublishingScheduleAccess {
  const publishedTime = parseReleaseTimestamp(post['publishedAt']);
  if (publishedTime === null || !Number.isFinite(now.getTime())) {
    return 'locked';
  }
  if (post['status'] === 'published' && publishedTime <= now.getTime()) {
    return 'public';
  }
  const release = readReaderRelease(post);
  const earlyTime = release ? parseReleaseTimestamp(release.earlyAccessAt) : null;
  return post['status'] === 'scheduled' && release?.announceInSchedule === true
    && permission?.canReadEarly === true && earlyTime !== null
    && earlyTime < publishedTime && earlyTime <= now.getTime() && now.getTime() < publishedTime
    ? 'early' : 'locked';
}

export function toPublicPublishingScheduleEntry(
  post: Record<string, unknown>,
  id: string,
  permission: CurrentReaderPermission | null,
  now: Date,
): PublicPublishingScheduleEntry | null {
  const release = readReaderRelease(post);
  const slug = text(post['slug']);
  const title = text(post['title']);
  if (!release?.announceInSchedule || (post['status'] !== 'scheduled' && post['status'] !== 'published')
    || !id || !SLUG_PATTERN.test(slug) || slug.length > 160 || !title || title.length > 240
    || parseReleaseTimestamp(post['publishedAt']) === null || isHiddenCatPost(post)) {
    return null;
  }
  return {
    id, slug, title, excerpt: text(post['excerpt']).slice(0, 2_000),
    coverImage: publicImage(post['coverImage']), publishedAt: post['publishedAt'] as string,
    earlyAccessAt: release.earlyAccessAt,
    status: post['status'], access: getPublishingScheduleAccess(post, permission, now),
  };
}

export async function getPublicPublishingSchedule(
  firestore: Firestore,
  value: unknown,
  permission: CurrentReaderPermission | null,
  now = new Date(),
): Promise<{serverNow: string; entries: readonly PublicPublishingScheduleEntry[]}> {
  requireRequest(value, []);
  const snapshot = await firestore.collection('posts')
    .where('readerRelease.announceInSchedule', '==', true)
    .select('slug', 'title', 'excerpt', 'coverImage', 'publishedAt', 'status', 'readerRelease',
      'authorId', 'author', 'catCorner')
    .limit(MAX_PUBLIC_SCHEDULE_RECORDS + 1).get();
  if (snapshot.docs.length > MAX_PUBLIC_SCHEDULE_RECORDS) {
    throw new HttpsError('resource-exhausted', 'The publishing schedule exceeds its supported record limit.');
  }
  const authors = new Map<string, Promise<boolean>>();
  const entries = await Promise.all(snapshot.docs.map(async document => {
    const post = document.data() as Record<string, unknown>;
    const entry = toPublicPublishingScheduleEntry(post, document.id, permission, now);
    return entry && await hasPublicAuthor(firestore, post, authors) ? entry : null;
  }));
  return {
    serverNow: now.toISOString(),
    entries: entries.filter((entry): entry is PublicPublishingScheduleEntry => entry !== null)
      .sort((left, right) => Date.parse(left.publishedAt) - Date.parse(right.publishedAt)
        || left.id.localeCompare(right.id)),
  };
}

export async function getScheduledPostForReader(
  firestore: Firestore,
  value: unknown,
  permission: CurrentReaderPermission | null,
  now = new Date(),
): Promise<{serverNow: string; access: 'public' | 'early'; post: Record<string, unknown>}> {
  const request = requireRequest(value, ['slug']);
  const slug = text(request['slug']);
  if (!SLUG_PATTERN.test(slug) || slug.length > 160) {
    throw new HttpsError('invalid-argument', 'A valid post slug is required.');
  }
  const snapshot = await firestore.collection('posts').where('slug', '==', slug).limit(2).get();
  if (snapshot.docs.length !== 1) {
    throw new HttpsError('not-found', 'This scheduled article is unavailable.');
  }
  const document = snapshot.docs[0];
  const post = document.data() as Record<string, unknown>;
  const entry = toPublicPublishingScheduleEntry(post, document.id, permission, now);
  if (!entry || !await hasPublicAuthor(firestore, post, new Map())) {
    throw new HttpsError('not-found', 'This scheduled article is unavailable.');
  }
  if (entry.access === 'locked') {
    throw new HttpsError('permission-denied', 'This article is not available to this reader yet.');
  }
  return {
    serverNow: now.toISOString(), access: entry.access,
    post: sanitizeReaderBlogPost(post, document.id),
  };
}

/** Reader content only: no preview tokens, mutation receipts, or promotion plans. */
export function sanitizeReaderBlogPost(post: Record<string, unknown>, id: string): Record<string, unknown> {
  if (post['contentFormat'] !== 'editorjs' || !Array.isArray(post['blocks'])
    || post['blocks'].length > 1_000 || !isRecord(post['author']) || !isRecord(post['seo'])) {
    throw new HttpsError('failed-precondition', 'This article has invalid reader content.');
  }
  const reader = pick(post, [
    'revision', 'slug', 'title', 'excerpt', 'coverImage', 'backgroundImage', 'thumbnailImage',
    'featured', 'authorId', 'categories', 'subcategories', 'tags', 'status', 'contentFormat',
    'createdAt', 'updatedAt', 'publishedAt',
  ]);
  reader['id'] = id;
  reader['coverImage'] = publicImage(post['coverImage']);
  reader['author'] = pickRecord(post['author'], ['name', 'title', 'bio', 'avatarUrl', 'profileUrl', 'slug']);
  reader['seo'] = pickRecord(post['seo'], [
    'title', 'description', 'metaTitle', 'metaDescription', 'canonical', 'openGraphImage',
    'openGraphImageWidth', 'openGraphImageHeight',
  ]);
  if (isRecord(post['editorial'])) {
    reader['editorial'] = pickRecord(post['editorial'], [
      'evidenceBasis', 'evidenceSummary', 'sourceReviewedAt', 'relationshipDisclosure',
      'aiAssistanceDisclosure', 'syntheticMediaDisclosure', 'updateNote',
    ]);
  }
  reader['blocks'] = Array.isArray(post['blocks']) ? post['blocks'].map(value => {
    if (!isRecord(value) || typeof value['id'] !== 'string' || typeof value['type'] !== 'string'
      || !isRecord(value['data'])) {
      throw new HttpsError('failed-precondition', 'This article has invalid reader content.');
    }
    return {id: value['id'], type: value['type'], data: pick(value['data'], BLOCK_DATA_FIELDS)};
  }) : [];
  return JSON.parse(JSON.stringify(reader)) as Record<string, unknown>;
}

const BLOCK_DATA_FIELDS = [
  'placement', 'title', 'text', 'level', 'url', 'alt', 'caption', 'width', 'height', 'provider',
  'embedUrl', 'isCompanionVideo', 'videoTitle', 'videoDescription', 'videoUploadDate',
  'videoDurationSeconds', 'items', 'ordered', 'listStyle', 'listPresentation', 'listMeta', 'listItems',
  'language', 'code', 'markdown', 'stretched', 'withBorder', 'withBackground', 'imageLayout',
  'imageSize', 'galleryLayout', 'galleryImages', 'variant', 'attribution', 'stats', 'chartType',
  'chartPoints', 'labels', 'datasets', 'unit', 'xAxisTitle', 'yAxisTitle', 'yMax', 'valueSuffix',
  'decimals', 'showLegend', 'sourceLabel', 'sourceUrl', 'accessibilitySummary', 'question',
  'description', 'pollOptions', 'pollResultsVisibility', 'html', 'unsupportedBlock',
] as const;

async function hasPublicAuthor(
  firestore: Firestore, post: Record<string, unknown>, cache: Map<string, Promise<boolean>>,
): Promise<boolean> {
  const authorId = text(post['authorId']);
  if (!authorId) {
    // Legacy embedded bylines have no independent author profile to expose.
    return isRecord(post['author']) && !!text(post['author']['name']);
  }
  let published = cache.get(authorId);
  if (!published) {
    published = firestore.collection('authors').doc(authorId).get()
      .then(snapshot => snapshot.exists && snapshot.get('status') === 'published');
    cache.set(authorId, published);
  }
  return published;
}

function readReaderRelease(post: Record<string, unknown>): ReaderRelease | null {
  try {
    validateReaderRelease(post['readerRelease'], post['publishedAt']);
    return isRecord(post['readerRelease']) ? post['readerRelease'] as unknown as ReaderRelease : null;
  } catch {
    return null;
  }
}

function hasRole(claims: Record<string, unknown>, role: string): boolean {
  return claims[role] === true || (isRecord(claims['roles']) && claims['roles'][role] === true);
}

function requireRequest(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!isRecord(value) || Object.keys(value).some(key => !keys.includes(key))
    || keys.some(key => !Object.hasOwn(value, key))) {
    throw new HttpsError('invalid-argument', 'The publishing schedule request has unsupported or missing fields.');
  }
  return value;
}

function isHiddenCatPost(post: Record<string, unknown>): boolean {
  return isRecord(post['catCorner']) && post['catCorner']['enabled'] === true
    && post['catCorner']['discoveryPost'] !== true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function publicImage(value: unknown): string {
  const image = text(value);
  return /^(?:https?:\/\/|\/assets\/|assets\/)/.test(image) ? image : '';
}

function pick(record: Record<string, unknown>, fields: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(fields.filter(field => Object.hasOwn(record, field))
    .map(field => [field, record[field]]));
}

function pickRecord(value: unknown, fields: readonly string[]): Record<string, unknown> {
  return isRecord(value) ? pick(value, fields) : {};
}
