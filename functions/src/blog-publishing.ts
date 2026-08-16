import {createHash, randomBytes} from 'node:crypto';

import {FieldValue, Firestore, Timestamp, Transaction} from 'firebase-admin/firestore';
import {HttpsError} from 'firebase-functions/v2/https';

const POSTS_COLLECTION = 'posts';
const AUTHORS_COLLECTION = 'authors';
const PREVIEWS_COLLECTION = 'postPreviews';
const SLUGS_COLLECTION = 'blogSlugs';
const RECEIPTS_COLLECTION = 'blogMutationReceipts';
const AUDIT_COLLECTION = 'blogPublishingAudit';
const MEDIA_COLLECTION = 'blogMediaAssets';
const RECEIPT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PREVIEW_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_POST_BYTES = 900_000;
const MAX_BLOCKS = 1_000;
const MAX_JSON_DEPTH = 32;
const MAX_JSON_VALUES = 50_000;
const MAX_LIST_ITEMS = 5_000;
const POST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{15,127}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STATUSES = new Set(['draft', 'scheduled', 'published', 'archived']);
const EVIDENCE_BASES = new Set(['hands-on', 'first-person', 'researched', 'manufacturer-supplied', 'mixed']);
const BLOCK_TYPES = new Set([
  'paragraph', 'header', 'image', 'gallery', 'embed', 'list', 'quote', 'code', 'markdown', 'delimiter',
  'typography', 'stats', 'chart', 'poll', 'catCornerUnlock', 'html', 'unsupported',
]);
const IMAGE_LAYOUTS = new Set(['fullWidth', 'contained', 'inlineStart', 'inlineEnd']);
const IMAGE_SIZES = new Set(['small', 'medium', 'large', 'wide']);
const GALLERY_LAYOUTS = new Set(['slideshow', 'grid', 'mosaic']);
const LIST_STYLES = new Set(['unordered', 'ordered', 'checklist']);
const LIST_PRESENTATIONS = new Set(['standard', 'steps']);
const BLOCK_PLACEMENTS = new Set(['content', 'rail']);
const TYPOGRAPHY_VARIANTS = new Set([
  'lead', 'sectionIntro', 'pullQuote', 'keyTakeaway', 'callout', 'warning', 'aside', 'caption', 'eyebrow',
]);
const CHART_TYPES = new Set(['bar', 'line']);
const POLL_RESULTS_VISIBILITIES = new Set(['afterVote', 'always', 'hidden']);
const SOCIAL_CHANNELS = new Set(['notify', 'youtube', 'facebook', 'instagram', 'threads', 'x', 'linkedin']);
const SOCIAL_STATUSES = new Set(['draft', 'scheduled', 'queued', 'posted', 'failed', 'cancelled']);
const SOCIAL_DELIVERY_TIMINGS = new Set(['at-publish', 'scheduled']);
const SOCIAL_MEDIA_TYPES = new Set(['image', 'video']);
const SOCIAL_LINK_PLACEMENTS = new Set(['post', 'first-comment', 'profile', 'none']);
const SOCIAL_CONTENT_ANGLES = new Set([
  'personal-story', 'conversation-starter', 'practical-takeaway', 'behind-the-scenes',
]);
const SOCIAL_POST_FORMATS = new Set([
  'text', 'link', 'image', 'video', 'reel', 'story', 'carousel', 'thread', 'community',
]);
const SOCIAL_POST_FORMATS_BY_CHANNEL: Readonly<Record<string, ReadonlySet<string>>> = {
  notify: new Set(['text', 'link']),
  youtube: new Set(['video', 'reel', 'community']),
  facebook: new Set(['text', 'link', 'image', 'video', 'reel', 'story']),
  instagram: new Set(['image', 'video', 'reel', 'story', 'carousel']),
  threads: new Set(['text', 'link', 'image', 'video', 'thread']),
  x: new Set(['text', 'link', 'image', 'video', 'thread']),
  linkedin: new Set(['text', 'link', 'image', 'video', 'carousel']),
};

export type BlogMutationOperation = 'save' | 'issuePreview' | 'revokePreview' | 'delete';

export interface BlogMutationResponse {
  deleted: boolean;
  post: Record<string, unknown> | null;
  replayed: boolean;
}

interface BlogMutationRequest {
  operation: BlogMutationOperation;
  postId: string;
  expectedRevision: number;
  requestId: string;
  post?: Record<string, unknown>;
}

interface MutationReceipt {
  actorUid: string;
  operation: BlogMutationOperation;
  postId: string;
  resultRevision: number | null;
  deleted: boolean;
  previewToken?: string;
}

export interface ScheduledPublishingResult {
  dueCount: number;
  publishedCount: number;
  failures: readonly {postId: string; code: string; message: string}[];
  failedPostIds: readonly string[];
  publishedPostIds: readonly string[];
}

export function parseBlogMutationRequest(value: unknown): BlogMutationRequest {
  if (!isRecord(value)) {
    throw new HttpsError('invalid-argument', 'A blog mutation request is required.');
  }

  const operation = value['operation'];
  const postId = getTrimmedString(value['postId']);
  const requestId = getTrimmedString(value['requestId']);
  const expectedRevision = value['expectedRevision'];

  if (operation !== 'save' && operation !== 'issuePreview' && operation !== 'revokePreview' && operation !== 'delete') {
    throw new HttpsError('invalid-argument', 'Unsupported blog mutation operation.');
  }

  if (!POST_ID_PATTERN.test(postId)) {
    throw new HttpsError('invalid-argument', 'Post id is invalid.');
  }

  if (!REQUEST_ID_PATTERN.test(requestId)) {
    throw new HttpsError('invalid-argument', 'Request id must be an opaque identifier.');
  }

  if (!Number.isInteger(expectedRevision) || Number(expectedRevision) < 0) {
    throw new HttpsError('invalid-argument', 'Expected revision must be a non-negative integer.');
  }

  if (operation === 'save' && (!isRecord(value['post']) || value['post']['id'] !== postId)) {
    throw new HttpsError('invalid-argument', 'The save request must include the matching complete post.');
  }

  return {
    operation,
    postId,
    expectedRevision: Number(expectedRevision),
    requestId,
    ...(operation === 'save' ? {post: value['post'] as Record<string, unknown>} : {}),
  };
}

export function validateTrustedBlogPost(value: unknown, now = new Date(), allowDueSchedule = false): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new HttpsError('invalid-argument', 'Post must be an object.');
  }
  const boundedPostData = Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== 'syncedAt')
  );
  if (!isJsonObject(boundedPostData)) {
    throw new HttpsError('invalid-argument', 'Post must contain bounded JSON data only.');
  }

  const id = getTrimmedString(value['id']);
  const slug = getTrimmedString(value['slug']);
  const status = getTrimmedString(value['status']);
  const revision = value['revision'];
  const title = getTrimmedString(value['title']);
  const excerpt = getTrimmedString(value['excerpt']);
  const coverImage = getTrimmedString(value['coverImage']);
  const publishedAt = value['publishedAt'];
  const blocks = value['blocks'];

  if (!POST_ID_PATTERN.test(id)) {
    invalid('Post id is invalid.');
  }
  if (!SLUG_PATTERN.test(slug) || slug.length > 160) {
    invalid('Slug must be lowercase words separated by single hyphens.');
  }
  if (!Number.isInteger(revision) || Number(revision) < 0) {
    invalid('Revision must be a non-negative integer.');
  }
  if (!title || title.length > 240 || !excerpt || excerpt.length > 2_000) {
    invalid('Title and excerpt are required and must remain within their limits.');
  }
  if (!STATUSES.has(status)) {
    invalid('Post status is invalid.');
  }
  if (!isAllowedMediaUrl(coverImage)) {
    invalid('Cover image must use HTTP(S) or a site asset path.');
  }
  if (!isOptionalMediaUrl(value['backgroundImage']) || !isOptionalMediaUrl(value['thumbnailImage'])) {
    invalid('Post image URLs must use HTTP(S) or site asset paths.');
  }
  if (!isStringArray(value['categories']) || !isStringArray(value['tags'])
    || (value['subcategories'] !== undefined && !isStringArray(value['subcategories']))) {
    invalid('Categories, subcategories, and tags must be string arrays.');
  }
  if ((value['featured'] !== undefined && typeof value['featured'] !== 'boolean')
    || (value['authorId'] !== undefined && typeof value['authorId'] !== 'string')) {
    invalid('Post feature and author identity fields are invalid.');
  }
  if (value['contentFormat'] !== 'editorjs') {
    invalid('Only Editor.js post content is supported.');
  }
  if (!Array.isArray(blocks) || blocks.length > MAX_BLOCKS) {
    invalid(`Posts may contain at most ${MAX_BLOCKS} blocks.`);
  }

  const blockIds = new Set<string>();
  for (const block of blocks) {
    validateBlock(block, blockIds);
  }

  validateAuthor(value['author']);
  validateSeo(value['seo']);
  validateOpenGraph(value['og']);
  validateEditorialMetadata(value['editorial']);
  validateSocialPromotion(value['socialPromotion']);
  validateCatCorner(value['catCorner']);
  validatePreview(value['preview'], status);

  if (!isIsoDate(value['createdAt']) || !isIsoDate(value['updatedAt'])) {
    invalid('Created and updated timestamps must be valid ISO dates.');
  }
  if (publishedAt !== null && !isIsoDate(publishedAt)) {
    invalid('Published timestamp must be null or a valid ISO date.');
  }
  if (status === 'scheduled') {
    const scheduledTime = typeof publishedAt === 'string' ? new Date(publishedAt).getTime() : Number.NaN;
    if (!Number.isFinite(scheduledTime) || (!allowDueSchedule && scheduledTime <= now.getTime())) {
      invalid('Scheduled posts require a future publication time.');
    }
  }
  if (status === 'published' && typeof publishedAt !== 'string') {
    invalid('Published posts require a publication timestamp.');
  }

  const serializedBytes = Buffer.byteLength(JSON.stringify(value), 'utf8');
  if (serializedBytes > MAX_POST_BYTES) {
    invalid(`Post exceeds the ${MAX_POST_BYTES}-byte trusted write limit.`);
  }
}

export async function mutateBlogPost(
  firestore: Firestore,
  value: unknown,
  actorUid: string,
  now = new Date()
): Promise<BlogMutationResponse> {
  const request = parseBlogMutationRequest(value);
  const receiptId = createReceiptId(actorUid, request.requestId);
  const receiptRef = firestore.collection(RECEIPTS_COLLECTION).doc(receiptId);
  const postRef = firestore.collection(POSTS_COLLECTION).doc(request.postId);
  const previewToken = request.operation === 'issuePreview' ? createPreviewToken() : undefined;

  return firestore.runTransaction(async transaction => {
    const receiptSnapshot = await transaction.get(receiptRef);
    const postSnapshot = await transaction.get(postRef);
    const currentPost: Record<string, unknown> | null = postSnapshot.exists
      ? postSnapshot.data() as Record<string, unknown>
      : null;

    if (receiptSnapshot.exists) {
      const receipt = receiptSnapshot.data() as MutationReceipt;
      if (receipt.actorUid !== actorUid || receipt.operation !== request.operation || receipt.postId !== request.postId) {
        throw new HttpsError('already-exists', 'Request id was already used for a different mutation.');
      }

      return {
        deleted: receipt.deleted,
        post: currentPost,
        replayed: true,
      };
    }

    const actualRevision = getRevision(currentPost);

    if ((postSnapshot.exists ? actualRevision : 0) !== request.expectedRevision
      || (!postSnapshot.exists && request.expectedRevision > 0)) {
      throw revisionConflict(request.postId, request.expectedRevision, postSnapshot.exists ? actualRevision : null, currentPost);
    }

    if (request.operation !== 'save' && !currentPost) {
      throw new HttpsError('not-found', 'Post not found.');
    }

    if (request.operation === 'delete') {
      const currentSlug = getTrimmedString(currentPost?.['slug']);
      const currentPreview = getPreview(currentPost);
      const slugRef = currentSlug ? firestore.collection(SLUGS_COLLECTION).doc(currentSlug) : null;
      const slugSnapshot = slugRef ? await transaction.get(slugRef) : null;

      transaction.delete(postRef);
      if (currentPreview) {
        transaction.delete(firestore.collection(PREVIEWS_COLLECTION).doc(currentPreview.token));
      }
      if (slugRef && slugSnapshot?.get('postId') === request.postId) {
        transaction.delete(slugRef);
      }
      writeAudit(transaction, firestore, receiptId, actorUid, request.operation, request.postId, currentPost, null, now);
      writeReceipt(transaction, receiptRef, actorUid, request, null, true, now);

      return {deleted: true, post: null, replayed: false};
    }

    const nextPost = createNextPost(request, currentPost, now, previewToken);
    validateTrustedBlogPost(nextPost, now);
    await assertTrustedBlogMediaReady(transaction, firestore, nextPost);

    const nextSlug = getTrimmedString(nextPost['slug']);
    const currentSlug = getTrimmedString(currentPost?.['slug']);
    const nextSlugRef = firestore.collection(SLUGS_COLLECTION).doc(nextSlug);
    const nextSlugSnapshot = await transaction.get(nextSlugRef);
    const conflictingPosts = await transaction.get(
      firestore.collection(POSTS_COLLECTION).where('slug', '==', nextSlug).limit(2)
    );
    const conflictingPost = conflictingPosts.docs.find(candidate => candidate.id !== request.postId);

    if ((nextSlugSnapshot.exists && nextSlugSnapshot.get('postId') !== request.postId) || conflictingPost) {
      throw new HttpsError('already-exists', 'Another post already owns this slug.', {
        slug: nextSlug,
        postId: conflictingPost?.id ?? nextSlugSnapshot.get('postId') ?? null,
      });
    }

    let oldSlugRef: FirebaseFirestore.DocumentReference | null = null;
    let oldSlugSnapshot: FirebaseFirestore.DocumentSnapshot | null = null;
    if (currentSlug && currentSlug !== nextSlug) {
      oldSlugRef = firestore.collection(SLUGS_COLLECTION).doc(currentSlug);
      oldSlugSnapshot = await transaction.get(oldSlugRef);
    }

    const authorId = getTrimmedString(nextPost['authorId']);
    let authorSnapshot: FirebaseFirestore.DocumentSnapshot | null = null;
    if ((nextPost['status'] === 'published' || nextPost['status'] === 'scheduled') && authorId) {
      authorSnapshot = await transaction.get(firestore.collection(AUTHORS_COLLECTION).doc(authorId));
    }
    if (authorSnapshot?.exists && authorSnapshot.get('status') !== 'published') {
      throw new HttpsError('failed-precondition', 'Publish the author profile before publishing or scheduling this post.');
    }

    const previousPreview = getPreview(currentPost);
    if (previousPreview && previousPreview.token !== getPreview(nextPost)?.token) {
      transaction.delete(firestore.collection(PREVIEWS_COLLECTION).doc(previousPreview.token));
    }

    const nextPreview = getPreview(nextPost);
    if (nextPreview) {
      transaction.set(
        firestore.collection(PREVIEWS_COLLECTION).doc(nextPreview.token),
        createPreviewDocument(nextPost, nextPreview)
      );
    }

    transaction.set(postRef, {
      ...nextPost,
      syncedAt: FieldValue.serverTimestamp(),
      storageVersion: 2,
    }, {merge: false});
    transaction.set(nextSlugRef, {
      slug: nextSlug,
      postId: request.postId,
      updatedAt: now.toISOString(),
      syncedAt: FieldValue.serverTimestamp(),
    }, {merge: false});
    if (oldSlugRef && oldSlugSnapshot?.get('postId') === request.postId) {
      transaction.delete(oldSlugRef);
    }
    writeAudit(transaction, firestore, receiptId, actorUid, request.operation, request.postId, currentPost, nextPost, now);
    writeReceipt(transaction, receiptRef, actorUid, request, getRevision(nextPost), false, now, nextPreview?.token);

    return {deleted: false, post: nextPost, replayed: false};
  });
}

export async function publishDueScheduledPosts(
  firestore: Firestore,
  now = new Date()
): Promise<ScheduledPublishingResult> {
  const scheduledSnapshot = await firestore.collection(POSTS_COLLECTION).where('status', '==', 'scheduled').get();
  const duePostIds = scheduledSnapshot.docs
    .filter(snapshot => {
      const publishedAt = snapshot.get('publishedAt');
      return typeof publishedAt === 'string'
        && Number.isFinite(new Date(publishedAt).getTime())
        && new Date(publishedAt).getTime() <= now.getTime();
    })
    .map(snapshot => snapshot.id);
  const publishedPostIds: string[] = [];
  const failures: {postId: string; code: string; message: string}[] = [];

  for (const postId of duePostIds) {
    try {
      const published = await publishScheduledPost(firestore, postId, now);
      if (published) {
        publishedPostIds.push(postId);
      }
    } catch (error) {
      failures.push({
        postId,
        code: error instanceof HttpsError ? error.code : 'internal',
        message: error instanceof Error ? error.message : 'Scheduled publication failed.',
      });
    }
  }

  return {
    dueCount: duePostIds.length,
    publishedCount: publishedPostIds.length,
    failures,
    failedPostIds: failures.map(failure => failure.postId),
    publishedPostIds,
  };
}

async function publishScheduledPost(firestore: Firestore, postId: string, now: Date): Promise<boolean> {
  const postRef = firestore.collection(POSTS_COLLECTION).doc(postId);

  return firestore.runTransaction(async transaction => {
    const snapshot = await transaction.get(postRef);
    if (!snapshot.exists) {
      return false;
    }

    const currentPost = snapshot.data() as Record<string, unknown>;
    const publishedAt = getTrimmedString(currentPost['publishedAt']);
    if (currentPost['status'] !== 'scheduled' || !publishedAt || new Date(publishedAt).getTime() > now.getTime()) {
      return false;
    }

    validateTrustedBlogPost(currentPost, now, true);
    const nextPost = compactUndefined({
      ...currentPost,
      status: 'published',
      revision: getRevision(currentPost) + 1,
      updatedAt: now.toISOString(),
      preview: undefined,
    });
    validateTrustedBlogPost(nextPost, now);
    await assertTrustedBlogMediaReady(transaction, firestore, nextPost);

    const slug = getTrimmedString(nextPost['slug']);
    const slugRef = firestore.collection(SLUGS_COLLECTION).doc(slug);
    const slugSnapshot = await transaction.get(slugRef);
    const conflictingPosts = await transaction.get(
      firestore.collection(POSTS_COLLECTION).where('slug', '==', slug).limit(2)
    );
    if ((slugSnapshot.exists && slugSnapshot.get('postId') !== postId)
      || conflictingPosts.docs.some(candidate => candidate.id !== postId)) {
      throw new HttpsError('already-exists', 'Another post already owns this scheduled slug.');
    }

    const authorId = getTrimmedString(nextPost['authorId']);
    if (authorId) {
      const authorSnapshot = await transaction.get(firestore.collection(AUTHORS_COLLECTION).doc(authorId));
      if (authorSnapshot.exists && authorSnapshot.get('status') !== 'published') {
        throw new HttpsError('failed-precondition', 'The scheduled post author profile is no longer published.');
      }
    }

    const auditId = `scheduler-${postId}-${getRevision(nextPost)}`;
    transaction.set(postRef, {
      ...nextPost,
      preview: FieldValue.delete(),
      syncedAt: FieldValue.serverTimestamp(),
      storageVersion: 2,
    }, {merge: true});
    transaction.set(slugRef, {
      slug,
      postId,
      updatedAt: now.toISOString(),
      syncedAt: FieldValue.serverTimestamp(),
    }, {merge: false});
    const preview = getPreview(currentPost);
    if (preview) {
      transaction.delete(firestore.collection(PREVIEWS_COLLECTION).doc(preview.token));
    }
    writeAudit(transaction, firestore, auditId, 'scheduler', 'save', postId, currentPost, nextPost, now);
    return true;
  });
}

async function assertTrustedBlogMediaReady(
  transaction: Transaction,
  firestore: Firestore,
  post: Record<string, unknown>
): Promise<void> {
  for (const mediaId of collectTrustedBlogMediaIds(post)) {
    const mediaSnapshot = await transaction.get(firestore.collection(MEDIA_COLLECTION).doc(mediaId));
    if (!mediaSnapshot.exists || mediaSnapshot.get('status') !== 'ready') {
      throw new HttpsError(
        'failed-precondition',
        'A trusted blog image is unavailable or currently being deleted.',
        {mediaId}
      );
    }
  }
}

export function collectTrustedBlogMediaIds(value: unknown): readonly string[] {
  const mediaIds = new Set<string>();
  collectTrustedBlogMediaIdsFromValue(value, mediaIds);
  return [...mediaIds].sort();
}

function collectTrustedBlogMediaIdsFromValue(value: unknown, mediaIds: Set<string>): void {
  if (typeof value === 'string') {
    const storagePath = getTrustedBlogMediaStoragePath(value);
    if (!storagePath) {
      return;
    }
    const match = /^cms\/blog-media\/[^/]+\/[^/]+\/([A-Za-z0-9][A-Za-z0-9_-]{15,127})\//.exec(storagePath);
    if (match?.[1]) {
      mediaIds.add(match[1]);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectTrustedBlogMediaIdsFromValue(item, mediaIds));
    return;
  }
  if (isRecord(value)) {
    Object.values(value).forEach(item => collectTrustedBlogMediaIdsFromValue(item, mediaIds));
  }
}

function getTrustedBlogMediaStoragePath(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.startsWith('cms/blog-media/')) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') {
      return null;
    }
    if (url.hostname === 'firebasestorage.googleapis.com') {
      const objectPath = url.pathname.split('/o/')[1];
      return objectPath ? decodeURIComponent(objectPath) : null;
    }
    if (url.hostname === 'storage.googleapis.com') {
      const [, , ...objectSegments] = url.pathname.split('/');
      return objectSegments.length > 0 ? decodeURIComponent(objectSegments.join('/')) : null;
    }
  } catch {
    return null;
  }

  return null;
}

function createNextPost(
  request: BlogMutationRequest,
  currentPost: Record<string, unknown> | null,
  now: Date,
  previewToken?: string
): Record<string, unknown> {
  const revision = request.expectedRevision + 1;
  const nowIso = now.toISOString();

  if (request.operation === 'save') {
    const requestedPost = request.post as Record<string, unknown>;
    const status = requestedPost['status'];
    const previousPreview = getPreview(currentPost);
    const publishedAt = status === 'published'
      ? getTrimmedString(requestedPost['publishedAt']) || getTrimmedString(currentPost?.['publishedAt']) || nowIso
      : requestedPost['publishedAt'] ?? null;

    return compactUndefined({
      ...requestedPost,
      id: request.postId,
      revision,
      createdAt: getTrimmedString(currentPost?.['createdAt']) || getTrimmedString(requestedPost['createdAt']) || nowIso,
      updatedAt: nowIso,
      publishedAt,
      preview: status === 'draft' ? previousPreview ?? undefined : undefined,
    });
  }

  if (!currentPost) {
    throw new HttpsError('not-found', 'Post not found.');
  }

  if (request.operation === 'issuePreview') {
    if (currentPost['status'] !== 'draft' || !previewToken) {
      throw new HttpsError('failed-precondition', 'Preview links can only be issued for draft posts.');
    }

    return compactUndefined({
      ...currentPost,
      revision,
      updatedAt: nowIso,
      preview: {
        token: previewToken,
        createdAt: nowIso,
        expiresAt: new Date(now.getTime() + PREVIEW_DURATION_MS).toISOString(),
      },
    });
  }

  return compactUndefined({
    ...currentPost,
    revision,
    updatedAt: nowIso,
    preview: undefined,
  });
}

function validateBlock(value: unknown, blockIds: Set<string>): void {
  if (!isRecord(value)) {
    invalid('Every block must be an object.');
  }
  const id = getTrimmedString(value['id']);
  const type = getTrimmedString(value['type']);
  const data = value['data'];
  if (!id || id.length > 160 || blockIds.has(id)) {
    invalid('Every block requires a unique bounded id.');
  }
  blockIds.add(id);
  if (!BLOCK_TYPES.has(type) || !isRecord(data) || Array.isArray(data)) {
    invalid('Block type or data is invalid.');
  }
  if (value['editorTunes'] !== undefined && !isJsonObject(value['editorTunes'])) {
    invalid('Editor block tunes must be JSON data.');
  }
  validateBlockDataShape(data);

  if (type === 'image') {
    if (!isAllowedMediaUrl(getTrimmedString(data['url']))
      || !isOptionalPositiveNumber(data['width'])
      || !isOptionalPositiveNumber(data['height'])
      || (data['imageLayout'] !== undefined && !IMAGE_LAYOUTS.has(String(data['imageLayout'])))
      || (data['imageSize'] !== undefined && !IMAGE_SIZES.has(String(data['imageSize'])))) {
      invalid('Image block data is invalid.');
    }
  }
  if (type === 'gallery') {
    const images = data['galleryImages'];
    if (!GALLERY_LAYOUTS.has(String(data['galleryLayout']))
      || !Array.isArray(images)
      || images.length < 2
      || images.length > 20
      || !images.every(isGalleryImage)) {
      invalid('Gallery block data is invalid.');
    }

    for (const image of images) {
      if (isRecord(image)) {
        rejectUnsafeInlineProtocols(image);
      }
    }
  }
  if (type === 'embed') {
    const url = getTrimmedString(data['embedUrl']) || getTrimmedString(data['url']);
    if (!isHttpUrl(url)) {
      invalid('Embed URLs must use HTTP(S).');
    }

    const hasVideoMetadata = data['videoTitle'] !== undefined
      || data['videoDescription'] !== undefined
      || data['videoUploadDate'] !== undefined
      || data['videoDurationSeconds'] !== undefined;
    if (hasVideoMetadata && (data['provider'] !== 'youtube' || data['isCompanionVideo'] !== true)) {
      invalid('Video metadata is allowed only on a selected YouTube companion block.');
    }
  }
  if (type === 'list') {
    if (data['listStyle'] !== undefined && !LIST_STYLES.has(String(data['listStyle']))) {
      invalid('List style is invalid.');
    }
    if (data['listPresentation'] !== undefined && !LIST_PRESENTATIONS.has(String(data['listPresentation']))) {
      invalid('List presentation is invalid.');
    }
    if (data['listPresentation'] === 'steps'
      && data['listStyle'] !== 'ordered'
      && !(data['listStyle'] === undefined && data['ordered'] === true)) {
      invalid('Step sequence presentation requires an ordered list.');
    }
    if (data['items'] !== undefined && !isStringArray(data['items'])) {
      invalid('Legacy list items must be strings.');
    }
    if (data['listItems'] !== undefined && !isListItemArray(data['listItems'])) {
      invalid('Recursive list items are invalid.');
    }
  }
  if (type === 'unsupported') {
    const envelope = data['unsupportedBlock'];
    if (!isRecord(envelope)
      || !getTrimmedString(envelope['originalType'])
      || !isJsonObject(envelope['originalData'])
      || (envelope['originalTunes'] !== undefined && !isJsonObject(envelope['originalTunes']))) {
      invalid('Unsupported blocks must retain their compatibility envelope.');
    }
  } else if (data['unsupportedBlock'] !== undefined) {
    invalid('Known blocks cannot contain an unsupported compatibility envelope.');
  }

  rejectUnsafeInlineProtocols(data);
}

function validateBlockDataShape(value: Record<string, unknown>): void {
  const stringFields = [
    'title', 'text', 'url', 'alt', 'caption', 'provider', 'embedUrl', 'language', 'code', 'markdown',
    'attribution', 'unit', 'xAxisTitle', 'yAxisTitle', 'valueSuffix', 'sourceLabel', 'sourceUrl',
    'accessibilitySummary', 'question', 'description', 'html', 'videoTitle', 'videoDescription',
    'videoUploadDate',
  ];
  const numberFields = ['width', 'height', 'yMax', 'decimals', 'videoDurationSeconds'];
  const booleanFields = [
    'ordered', 'stretched', 'withBorder', 'withBackground', 'showLegend', 'isCompanionVideo',
  ];

  if (!stringFields.every(field => value[field] === undefined || typeof value[field] === 'string')
    || !numberFields.every(field => value[field] === undefined
      || (typeof value[field] === 'number' && Number.isFinite(value[field])))
    || !booleanFields.every(field => value[field] === undefined || typeof value[field] === 'boolean')
    || (value['videoUploadDate'] !== undefined && !isVideoStructuredDataUploadDate(value['videoUploadDate']))
    || (value['videoDurationSeconds'] !== undefined
      && (typeof value['videoDurationSeconds'] !== 'number'
        || !Number.isFinite(value['videoDurationSeconds'])
        || value['videoDurationSeconds'] <= 0))
    || (value['placement'] !== undefined && !BLOCK_PLACEMENTS.has(String(value['placement'])))
    || (value['level'] !== undefined && value['level'] !== 2 && value['level'] !== 3)
    || (value['variant'] !== undefined && !TYPOGRAPHY_VARIANTS.has(String(value['variant'])))
    || (value['chartType'] !== undefined && !CHART_TYPES.has(String(value['chartType'])))
    || (value['pollResultsVisibility'] !== undefined
      && !POLL_RESULTS_VISIBILITIES.has(String(value['pollResultsVisibility'])))
    || (value['listMeta'] !== undefined && !isJsonObject(value['listMeta']))
    || (value['galleryLayout'] !== undefined && !GALLERY_LAYOUTS.has(String(value['galleryLayout'])))
    || (value['galleryImages'] !== undefined && (!Array.isArray(value['galleryImages'])
      || !value['galleryImages'].every(isGalleryImage)))
    || (value['labels'] !== undefined && !isStringArray(value['labels']))
    || (value['stats'] !== undefined && !isStats(value['stats']))
    || (value['chartPoints'] !== undefined && !isChartPoints(value['chartPoints']))
    || (value['datasets'] !== undefined && !isChartDatasets(value['datasets']))
    || (value['pollOptions'] !== undefined && !isPollOptions(value['pollOptions']))) {
    invalid('Block data fields are invalid.');
  }
}

function isVideoStructuredDataUploadDate(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmedValue = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return isDateOnly(trimmedValue);
  }

  return /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(trimmedValue)
    && isIsoDate(trimmedValue);
}

function isGalleryImage(value: unknown): boolean {
  if (!isRecord(value) || Array.isArray(value)) {
    return false;
  }

  const allowedKeys = new Set(['url', 'alt', 'caption', 'width', 'height']);

  return Object.keys(value).every(key => allowedKeys.has(key))
    && isAllowedMediaUrl(getTrimmedString(value['url']))
    && getTrimmedString(value['alt']).length > 0
    && (value['caption'] === undefined || typeof value['caption'] === 'string')
    && isOptionalPositiveNumber(value['width'])
    && isOptionalPositiveNumber(value['height']);
}

function validateAuthor(value: unknown): void {
  if (!isRecord(value) || !getTrimmedString(value['name'])) {
    invalid('Post author is required.');
  }
  for (const key of ['title', 'bio', 'slug']) {
    if (value[key] !== undefined && typeof value[key] !== 'string') {
      invalid('Post author metadata is invalid.');
    }
  }
  for (const key of ['avatarUrl', 'profileUrl']) {
    if (value[key] !== undefined && key === 'avatarUrl' && !isAllowedMediaUrl(getTrimmedString(value[key]))) {
      invalid('Author image URLs must use HTTP(S) or a site asset path.');
    }
    if (value[key] !== undefined && key === 'profileUrl' && !isAllowedNavigationUrl(getTrimmedString(value[key]))) {
      invalid('Author profile URLs must use HTTP(S) or a safe site path.');
    }
  }
}

function validateSeo(value: unknown): void {
  if (!isRecord(value) || !getTrimmedString(value['title']) || !getTrimmedString(value['description'])) {
    invalid('SEO title and description are required.');
  }
  for (const key of ['metaTitle', 'metaDescription']) {
    if (value[key] !== undefined && typeof value[key] !== 'string') {
      invalid('SEO metadata is invalid.');
    }
  }
  if (value['canonical'] !== undefined && getTrimmedString(value['canonical']) && !isHttpUrl(getTrimmedString(value['canonical']))) {
    invalid('Canonical URL must use HTTP(S).');
  }
  if (!isOptionalMediaUrl(value['openGraphImage'])) {
    invalid('Open Graph image must use HTTP(S) or a site asset path.');
  }
  if (!isOptionalPositiveInteger(value['openGraphImageWidth'])
    || !isOptionalPositiveInteger(value['openGraphImageHeight'])) {
    invalid('Open Graph image dimensions must be positive integers.');
  }
}

function validateOpenGraph(value: unknown): void {
  if (value === undefined) {
    return;
  }
  if (!isRecord(value) || !isOptionalMediaUrl(value['image'])
    || !isOptionalPositiveInteger(value['imageWidth'])
    || !isOptionalPositiveInteger(value['imageHeight'])) {
    invalid('Open Graph metadata is invalid.');
  }
  for (const key of ['title', 'description', 'imageAlt']) {
    if (value[key] !== undefined && typeof value[key] !== 'string') {
      invalid('Open Graph metadata is invalid.');
    }
  }
}

function validateEditorialMetadata(value: unknown): void {
  if (value === undefined) {
    return;
  }
  if (!isRecord(value) || Array.isArray(value)) {
    invalid('Editorial evidence metadata is invalid.');
  }

  const allowedKeys = new Set([
    'evidenceBasis',
    'evidenceSummary',
    'sourceReviewedAt',
    'relationshipDisclosure',
    'aiAssistanceDisclosure',
    'syntheticMediaDisclosure',
    'updateNote',
  ]);
  if (!Object.keys(value).every(key => allowedKeys.has(key))) {
    invalid('Editorial evidence metadata contains unsupported fields.');
  }
  if (value['evidenceBasis'] !== undefined && !EVIDENCE_BASES.has(getTrimmedString(value['evidenceBasis']))) {
    invalid('Editorial evidence basis is invalid.');
  }
  if (value['sourceReviewedAt'] !== undefined && !isDateOnly(value['sourceReviewedAt'])) {
    invalid('Editorial source review date must use YYYY-MM-DD.');
  }

  const boundedFields: Readonly<Record<string, number>> = {
    evidenceSummary: 1_200,
    relationshipDisclosure: 1_200,
    aiAssistanceDisclosure: 1_200,
    syntheticMediaDisclosure: 1_200,
    updateNote: 1_000,
  };
  for (const [field, maxLength] of Object.entries(boundedFields)) {
    if (value[field] !== undefined
      && (typeof value[field] !== 'string' || String(value[field]).trim().length > maxLength)) {
      invalid(`Editorial ${field} is invalid or exceeds ${maxLength} characters.`);
    }
  }
}

function validateSocialPromotion(value: unknown): void {
  if (value === undefined) {
    return;
  }
  if (!isRecord(value) || !Array.isArray(value['announcements'])) {
    invalid('Social promotion data is invalid.');
  }
  for (const announcement of value['announcements']) {
    if (!isRecord(announcement) || !getTrimmedString(announcement['id'])
      || !SOCIAL_CHANNELS.has(getTrimmedString(announcement['channel']))
      || !getTrimmedString(announcement['message'])
      || !SOCIAL_STATUSES.has(getTrimmedString(announcement['status']))
      || !isIsoDate(announcement['createdAt'])
      || !isIsoDate(announcement['updatedAt'])) {
      invalid('Social announcements are incomplete.');
    }
    if (announcement['scheduledAt'] !== undefined && !isIsoDate(announcement['scheduledAt'])) {
      invalid('Social announcement schedule is invalid.');
    }
    if ((announcement['status'] === 'scheduled' || announcement['status'] === 'queued')
      && !isIsoDate(announcement['scheduledAt'])) {
      invalid('Scheduled social announcements require a delivery time.');
    }
    if (announcement['deliveryTiming'] !== undefined
      && !SOCIAL_DELIVERY_TIMINGS.has(String(announcement['deliveryTiming']))) {
      invalid('Social delivery timing is invalid.');
    }
    if (announcement['linkUrl'] !== undefined && !isHttpUrl(getTrimmedString(announcement['linkUrl']))) {
      invalid('Social link URLs must use HTTP(S).');
    }
    if (announcement['mediaUrl'] !== undefined && !isAllowedMediaUrl(getTrimmedString(announcement['mediaUrl']))) {
      invalid('Social media URLs must use HTTP(S) or a site asset path.');
    }
    if (announcement['mediaType'] !== undefined
      && (!SOCIAL_MEDIA_TYPES.has(String(announcement['mediaType'])) || !getTrimmedString(announcement['mediaUrl']))) {
      invalid('Social media type requires a supported media URL.');
    }
    if (announcement['linkPlacement'] !== undefined
      && !SOCIAL_LINK_PLACEMENTS.has(String(announcement['linkPlacement']))) {
      invalid('Social link placement is invalid.');
    }
    if (announcement['contentAngle'] !== undefined
      && !SOCIAL_CONTENT_ANGLES.has(String(announcement['contentAngle']))) {
      invalid('Social content angle is invalid.');
    }
    if (announcement['postFormat'] !== undefined) {
      const channel = getTrimmedString(announcement['channel']);
      const format = String(announcement['postFormat']);
      if (!SOCIAL_POST_FORMATS.has(format) || !SOCIAL_POST_FORMATS_BY_CHANNEL[channel]?.has(format)) {
        invalid('Social post format is invalid for its channel.');
      }
    }
    for (const key of ['postedAt', 'failureReason']) {
      if (announcement[key] !== undefined && typeof announcement[key] !== 'string') {
        invalid('Social announcement metadata is invalid.');
      }
    }
  }
}

function validateCatCorner(value: unknown): void {
  if (value === undefined) {
    return;
  }
  if (!isRecord(value)
    || typeof value['enabled'] !== 'boolean'
    || typeof value['discoveryPost'] !== 'boolean'
    || (value['discoveryPost'] === true && value['enabled'] !== true)) {
    invalid('Cat Corner settings are invalid.');
  }
}

function validatePreview(value: unknown, status: string): void {
  if (value === undefined) {
    return;
  }
  if (status !== 'draft' || !isRecord(value)
    || !getTrimmedString(value['token'])
    || !isIsoDate(value['createdAt'])
    || !isIsoDate(value['expiresAt'])) {
    invalid('Preview metadata is invalid.');
  }
}

function rejectUnsafeInlineProtocols(value: Record<string, unknown>): void {
  for (const key of ['text', 'html', 'markdown', 'caption', 'description']) {
    const text = getTrimmedString(value[key]);
    if (/\b(?:javascript|vbscript|data)\s*:/i.test(text)) {
      invalid('Inline content contains a disallowed URL protocol.');
    }
  }
  for (const key of ['sourceUrl']) {
    if (value[key] !== undefined && !isHttpUrl(getTrimmedString(value[key]))) {
      invalid('Source URLs must use HTTP(S).');
    }
  }
}

function createPreviewDocument(post: Record<string, unknown>, preview: {token: string; createdAt: string; expiresAt: string}) {
  return {
    token: preview.token,
    postId: post['id'],
    createdAt: preview.createdAt,
    expiresAt: preview.expiresAt,
    expiresAtTimestamp: Timestamp.fromDate(new Date(preview.expiresAt)),
    expiresAtMillis: new Date(preview.expiresAt).getTime(),
    post,
    storageVersion: 2,
  };
}

function writeReceipt(
  transaction: FirebaseFirestore.Transaction,
  receiptRef: FirebaseFirestore.DocumentReference,
  actorUid: string,
  request: BlogMutationRequest,
  resultRevision: number | null,
  deleted: boolean,
  now: Date,
  previewToken?: string
): void {
  transaction.set(receiptRef, compactUndefined({
    actorUid,
    operation: request.operation,
    postId: request.postId,
    requestId: request.requestId,
    resultRevision,
    deleted,
    previewToken,
    createdAt: now.toISOString(),
    expiresAt: Timestamp.fromDate(new Date(now.getTime() + RECEIPT_TTL_MS)),
  }), {merge: false});
}

function writeAudit(
  transaction: FirebaseFirestore.Transaction,
  firestore: Firestore,
  auditId: string,
  actorUid: string,
  operation: BlogMutationOperation,
  postId: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  now: Date
): void {
  transaction.set(firestore.collection(AUDIT_COLLECTION).doc(auditId), {
    actorUid,
    operation,
    postId,
    beforeRevision: before ? getRevision(before) : null,
    afterRevision: after ? getRevision(after) : null,
    beforeStatus: before?.['status'] ?? null,
    afterStatus: after?.['status'] ?? null,
    slug: after?.['slug'] ?? before?.['slug'] ?? null,
    occurredAt: now.toISOString(),
    syncedAt: FieldValue.serverTimestamp(),
  }, {merge: false});
}

function revisionConflict(
  postId: string,
  expectedRevision: number,
  actualRevision: number | null,
  remotePost: Record<string, unknown> | null
): HttpsError {
  return new HttpsError('aborted', 'This post changed after the editor loaded it.', {
    kind: 'revision-conflict',
    postId,
    expectedRevision,
    actualRevision,
    remotePost,
  });
}

function createReceiptId(actorUid: string, requestId: string): string {
  return createHash('sha256').update(`${actorUid}:${requestId}`).digest('hex');
}

function createPreviewToken(): string {
  return randomBytes(32).toString('base64url');
}

function getRevision(value: Record<string, unknown> | null): number {
  const revision = value?.['revision'];
  return Number.isInteger(revision) && Number(revision) >= 0 ? Number(revision) : 0;
}

function getPreview(value: Record<string, unknown> | null): {token: string; createdAt: string; expiresAt: string} | null {
  const preview = value?.['preview'];
  if (!isRecord(preview)) {
    return null;
  }
  const token = getTrimmedString(preview['token']);
  const createdAt = getTrimmedString(preview['createdAt']);
  const expiresAt = getTrimmedString(preview['expiresAt']);
  return token && createdAt && expiresAt ? {token, createdAt, expiresAt} : null;
}

function isAllowedMediaUrl(value: string): boolean {
  if (!value) {
    return false;
  }
  if ((/^\/(?!\/)/.test(value) || /^assets\//i.test(value))
    && !/\b(?:javascript|vbscript|data)\s*:/i.test(value)) {
    return true;
  }
  return isHttpUrl(value);
}

function isAllowedNavigationUrl(value: string): boolean {
  return isHttpUrl(value) || (/^\/(?!\/)/.test(value) && !/\b(?:javascript|vbscript|data)\s*:/i.test(value));
}

function isOptionalMediaUrl(value: unknown): boolean {
  return value === undefined || value === null || getTrimmedString(value) === '' || isAllowedMediaUrl(getTrimmedString(value));
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isOptionalPositiveNumber(value: unknown): boolean {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value) && value > 0);
}

function isOptionalPositiveInteger(value: unknown): boolean {
  return value === undefined || (typeof value === 'number' && Number.isInteger(value) && value > 0);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isListItemArray(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  const stack = value.map(item => ({item, depth: 1}));
  let itemCount = 0;
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || current.depth > MAX_JSON_DEPTH || ++itemCount > MAX_LIST_ITEMS) {
      return false;
    }
    const item = current.item;
    if (!isRecord(item)
      || typeof item['content'] !== 'string'
      || !isJsonObject(item['meta'])
      || !Array.isArray(item['items'])) {
      return false;
    }
    for (const child of item['items']) {
      stack.push({item: child, depth: current.depth + 1});
    }
  }
  return true;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }

  const stack: {item: unknown; depth: number}[] = [{item: value, depth: 0}];
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
      for (const child of item) {
        stack.push({item: child, depth: current.depth + 1});
      }
      continue;
    }
    if (isRecord(item)) {
      for (const child of Object.values(item)) {
        stack.push({item: child, depth: current.depth + 1});
      }
      continue;
    }
    return false;
  }
  return true;
}

function isStats(value: unknown): boolean {
  return Array.isArray(value) && value.every(item => isRecord(item)
    && typeof item['label'] === 'string'
    && typeof item['value'] === 'string'
    && (item['caption'] === undefined || typeof item['caption'] === 'string'));
}

function isChartPoints(value: unknown): boolean {
  return Array.isArray(value) && value.every(point => isRecord(point)
    && typeof point['label'] === 'string'
    && typeof point['value'] === 'number'
    && Number.isFinite(point['value'])
    && (point['note'] === undefined || typeof point['note'] === 'string')
    && (point['series'] === undefined || typeof point['series'] === 'string'));
}

function isChartDatasets(value: unknown): boolean {
  return Array.isArray(value) && value.every(dataset => isRecord(dataset)
    && typeof dataset['label'] === 'string'
    && Array.isArray(dataset['data'])
    && dataset['data'].every(item => item === null || (typeof item === 'number' && Number.isFinite(item)))
    && (dataset['borderColor'] === undefined || typeof dataset['borderColor'] === 'string')
    && (dataset['backgroundColor'] === undefined || typeof dataset['backgroundColor'] === 'string'));
}

function isPollOptions(value: unknown): boolean {
  return Array.isArray(value) && value.every(option => isRecord(option)
    && typeof option['id'] === 'string'
    && typeof option['label'] === 'string');
}

function isIsoDate(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0 && Number.isFinite(new Date(value).getTime());
}

function isDateOnly(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function getTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function compactUndefined(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(message: string): never {
  throw new HttpsError('invalid-argument', message);
}
