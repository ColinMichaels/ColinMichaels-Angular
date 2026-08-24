import {createHash} from 'node:crypto';

import {FieldValue, Firestore} from 'firebase-admin/firestore';
import {Bucket} from '@google-cloud/storage';
import {HttpsError} from 'firebase-functions/v2/https';
import sharp, {type OutputInfo} from 'sharp';

const MEDIA_COLLECTION = 'blogMediaAssets';
const MEDIA_AUDIT_COLLECTION = 'blogMediaAudit';
const POSTS_COLLECTION = 'posts';
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_SOURCE_PIXELS = 40_000_000;
const MEDIA_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{15,127}$/;
const PATH_SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STAGING_FILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;
const OUTPUT_WIDTHS = [480, 960, 1600] as const;
const DELETE_LEASE_MS = 10 * 60 * 1000;

export type TrustedImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif' | 'image/gif';
export type TrustedImageVariantFormat = 'avif' | 'webp' | 'jpeg';

export interface BlogMediaVariant {
  contentType: 'image/avif' | 'image/webp' | 'image/jpeg';
  format: TrustedImageVariantFormat;
  height: number;
  size: number;
  storagePath: string;
  url: string;
  width: number;
}

export interface FinalizedBlogMedia {
  checksum: string;
  contentType: BlogMediaVariant['contentType'];
  downloadUrl: string;
  height: number;
  mediaId: string;
  originalContentType: TrustedImageMimeType;
  originalName: string;
  originalSize: number;
  size: number;
  storagePath: string;
  variants: readonly BlogMediaVariant[];
  width: number;
}

interface FinalizeBlogMediaRequest {
  altText: string;
  declaredContentType: TrustedImageMimeType;
  mediaId: string;
  originalName: string;
  role: string;
  slug: string;
  stagingPath: string;
}

export interface BlogMediaDeleteReport {
  deleted: boolean;
  mediaId: string;
  references: readonly {postId: string; slug: string; matches: number}[];
  storageObjectCount: number;
}

export function detectTrustedImageMimeType(bytes: Uint8Array): TrustedImageMimeType | null {
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return 'image/png';
  }
  if (bytes.length >= 12
    && textAt(bytes, 0, 4) === 'RIFF'
    && textAt(bytes, 8, 4) === 'WEBP') {
    return 'image/webp';
  }
  if (bytes.length >= 6 && (textAt(bytes, 0, 6) === 'GIF87a' || textAt(bytes, 0, 6) === 'GIF89a')) {
    return 'image/gif';
  }
  if (bytes.length >= 12 && textAt(bytes, 4, 4) === 'ftyp') {
    const brand = textAt(bytes, 8, 4);
    if (brand === 'avif' || brand === 'avis') {
      return 'image/avif';
    }
  }
  return null;
}

export function getResponsiveVariantWidths(sourceWidth: number): readonly number[] {
  if (!Number.isInteger(sourceWidth) || sourceWidth <= 0) {
    return [];
  }

  return [...new Set([
    ...OUTPUT_WIDTHS.filter(width => width < sourceWidth),
    Math.min(sourceWidth, OUTPUT_WIDTHS[OUTPUT_WIDTHS.length - 1]),
  ])].sort((left, right) => left - right);
}

/**
 * Social crawlers still have inconsistent WebP support. Keep an Open Graph
 * upload JPEG-only so the URL stored on the post is directly usable by every
 * social scraper, rather than merely selecting JPEG from a mixed variant set.
 */
export function getBlogMediaVariantFormats(role: string): readonly TrustedImageVariantFormat[] {
  return role.trim().toLowerCase() === 'open-graph'
    ? ['jpeg']
    : ['avif', 'webp', 'jpeg'];
}

export async function finalizeBlogMediaUpload(
  firestore: Firestore,
  bucket: Bucket,
  value: unknown,
  actorUid: string,
  now = new Date()
): Promise<FinalizedBlogMedia> {
  const request = parseFinalizeRequest(value, actorUid);
  const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(request.mediaId);
  const existingSnapshot = await mediaRef.get();

  if (existingSnapshot.exists) {
    const existing = existingSnapshot.data();
    if (existing?.['actorUid'] !== actorUid || existing?.['stagingPath'] !== request.stagingPath) {
      throw new HttpsError('already-exists', 'Media id is already owned by another upload.');
    }
    const finalized = parseFinalizedMedia(existing?.['result']);
    if (finalized) {
      return finalized;
    }
  }

  const stagingFile = bucket.file(request.stagingPath);
  const [exists] = await stagingFile.exists();
  if (!exists) {
    throw new HttpsError('not-found', 'The staged upload was not found or has already expired.');
  }

  const [metadata] = await stagingFile.getMetadata();
  const declaredStorageType = normalizeImageMimeType(metadata.contentType ?? '');
  const storedSize = Number(metadata.size ?? 0);
  if (!Number.isFinite(storedSize) || storedSize <= 0 || storedSize > MAX_SOURCE_BYTES) {
    await stagingFile.delete({ignoreNotFound: true}).catch(() => undefined);
    throw new HttpsError('invalid-argument', 'The staged image exceeds the trusted upload size limit.');
  }

  const [source] = await stagingFile.download();
  const variantPaths: string[] = [];
  try {
    const detectedContentType = detectTrustedImageMimeType(source);
    if (!detectedContentType
      || detectedContentType !== request.declaredContentType
      || declaredStorageType !== detectedContentType) {
      throw new HttpsError('invalid-argument', 'Image signature does not match the declared media type.');
    }

    const checksum = createHash('sha256').update(source).digest('hex');
    const processor = sharp(source, {failOn: 'error', animated: false}).rotate();
    const sourceMetadata = await processor.metadata();
    const sourceWidth = sourceMetadata.width ?? 0;
    const sourceHeight = sourceMetadata.height ?? 0;
    if (sourceWidth <= 0 || sourceHeight <= 0 || sourceWidth * sourceHeight > MAX_SOURCE_PIXELS) {
      throw new HttpsError('invalid-argument', 'Image dimensions are unavailable or exceed the trusted pixel limit.');
    }

    // Finalized variants are immutable. Reuse a ready asset only when the
    // trusted source bytes are identical; a changed source naturally receives
    // a fresh media id and a new set of immutable Storage URLs below.
    const reusable = await findReadyMediaByChecksum(firestore, checksum);
    if (reusable) {
      await firestore.collection(MEDIA_AUDIT_COLLECTION).doc(`reuse-${request.mediaId}`).set({
        operation: 'reuse',
        actorUid,
        mediaId: request.mediaId,
        reusedMediaId: reusable.mediaId,
        checksum,
        storageObjectCount: 0,
        occurredAt: now.toISOString(),
        syncedAt: FieldValue.serverTimestamp(),
      }, {merge: false});
      await stagingFile.delete({ignoreNotFound: true}).catch(() => undefined);
      return reusable;
    }

    const variants: BlogMediaVariant[] = [];
    for (const width of getResponsiveVariantWidths(sourceWidth)) {
      for (const format of getBlogMediaVariantFormats(request.role)) {
        const output = await createVariant(source, width, format);
        const extension = format === 'jpeg' ? 'jpg' : format;
        const storagePath = `cms/blog-media/${request.slug}/${request.role}/${request.mediaId}/${width}w.${extension}`;
        const token = createHash('sha256')
          .update(`${request.mediaId}:${checksum}:${storagePath}`)
          .digest('hex');
        const contentType = format === 'jpeg' ? 'image/jpeg' as const : `image/${format}` as const;
        await bucket.file(storagePath).save(output.data, {
          resumable: false,
          validation: 'crc32c',
          metadata: {
            contentType,
            cacheControl: 'public,max-age=31536000,immutable',
            metadata: {
              firebaseStorageDownloadTokens: token,
              mediaId: request.mediaId,
              sourceChecksum: checksum,
              role: request.role,
            },
          },
        });
        variantPaths.push(storagePath);
        variants.push({
          contentType,
          format,
          width: output.info.width,
          height: output.info.height,
          size: output.info.size,
          storagePath,
          url: createFirebaseStorageDownloadUrl(bucket.name, storagePath, token),
        });
      }
    }

    const primaryFormat: TrustedImageVariantFormat = request.role === 'open-graph' ? 'jpeg' : 'webp';
    const primary = [...variants]
      .filter(variant => variant.format === primaryFormat)
      .sort((left, right) => right.width - left.width)[0];
    if (!primary) {
      throw new Error(`Responsive image generation did not produce a ${primaryFormat.toUpperCase()} primary asset.`);
    }

    const result: FinalizedBlogMedia = {
      mediaId: request.mediaId,
      checksum,
      originalName: request.originalName,
      originalContentType: detectedContentType,
      originalSize: source.byteLength,
      downloadUrl: primary.url,
      storagePath: primary.storagePath,
      contentType: primary.contentType,
      size: primary.size,
      width: primary.width,
      height: primary.height,
      variants,
    };

    await firestore.runTransaction(async transaction => {
      const snapshot = await transaction.get(mediaRef);
      if (snapshot.exists && snapshot.get('checksum') !== checksum) {
        throw new HttpsError('already-exists', 'Media id is already associated with different content.');
      }
      transaction.set(mediaRef, {
        mediaId: request.mediaId,
        actorUid,
        slug: request.slug,
        role: request.role,
        altText: request.altText,
        originalName: request.originalName,
        stagingPath: request.stagingPath,
        checksum,
        status: 'ready',
        storagePaths: variants.map(variant => variant.storagePath),
        result,
        createdAt: snapshot.exists ? snapshot.get('createdAt') ?? now.toISOString() : now.toISOString(),
        updatedAt: now.toISOString(),
        syncedAt: FieldValue.serverTimestamp(),
      }, {merge: false});
      transaction.set(firestore.collection(MEDIA_AUDIT_COLLECTION).doc(`finalize-${request.mediaId}`), {
        operation: 'finalize',
        actorUid,
        mediaId: request.mediaId,
        checksum,
        storageObjectCount: variants.length,
        occurredAt: now.toISOString(),
        syncedAt: FieldValue.serverTimestamp(),
      }, {merge: false});
    });

    await stagingFile.delete({ignoreNotFound: true}).catch(() => undefined);
    return result;
  } catch (error) {
    await Promise.allSettled(variantPaths.map(path => bucket.file(path).delete({ignoreNotFound: true})));
    await stagingFile.delete({ignoreNotFound: true}).catch(() => undefined);
    throw error;
  }
}

export async function inspectOrDeleteBlogMedia(
  firestore: Firestore,
  bucket: Bucket,
  value: unknown,
  actorUid: string,
  now = new Date()
): Promise<BlogMediaDeleteReport> {
  const request = parseDeleteRequest(value);
  const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(request.mediaId);
  // The state transition and reference scan share one Firestore transaction.
  // Post mutations read the same media document before committing a trusted
  // URL, so either the post wins and deletion sees its reference, or deletion
  // wins and the post retries against the non-ready state.
  const prepared = await firestore.runTransaction(async transaction => {
    const snapshot = await transaction.get(mediaRef);
    if (!snapshot.exists) {
      return {
        proceed: false,
        report: {deleted: false, mediaId: request.mediaId, references: [], storageObjectCount: 0},
        storagePaths: [] as string[],
      };
    }

    const data = snapshot.data() ?? {};
    const result = parseFinalizedMedia(data['result']);
    const storagePaths = Array.isArray(data['storagePaths'])
      ? data['storagePaths'].filter((path): path is string => typeof path === 'string')
      : result?.variants.map(variant => variant.storagePath) ?? [];
    const identities = new Set<string>([
      request.mediaId,
      ...storagePaths,
      ...(result ? [result.downloadUrl, ...result.variants.map(variant => variant.url)] : []),
    ]);
    const postsSnapshot = await transaction.get(firestore.collection(POSTS_COLLECTION));
    const references = postsSnapshot.docs
      .map(post => ({
        postId: post.id,
        slug: getTrimmedString(post.get('slug')),
        matches: countIdentityMatches(post.data(), identities),
      }))
      .filter(reference => reference.matches > 0);
    const report = {
      deleted: false,
      mediaId: request.mediaId,
      references,
      storageObjectCount: storagePaths.length,
    };

    if (!request.confirmDelete) {
      return {proceed: false, report, storagePaths};
    }
    if (references.length > 0) {
      throw new HttpsError('failed-precondition', 'Media is still referenced by one or more posts.', {references});
    }

    const status = getTrimmedString(data['status']);
    const leaseExpiresAt = Date.parse(getTrimmedString(data['deleteLeaseExpiresAt']));
    if (status === 'deleting' && Number.isFinite(leaseExpiresAt) && leaseExpiresAt > now.getTime()) {
      throw new HttpsError('aborted', 'Media deletion is already in progress.');
    }
    if (status !== 'ready' && status !== 'delete-failed' && status !== 'deleting') {
      throw new HttpsError('failed-precondition', 'Media is not ready for deletion.');
    }

    transaction.set(mediaRef, {
      status: 'deleting',
      deleteActorUid: actorUid,
      deleteLeaseExpiresAt: new Date(now.getTime() + DELETE_LEASE_MS).toISOString(),
      updatedAt: now.toISOString(),
      syncedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
    return {proceed: true, report, storagePaths};
  });

  if (!prepared.proceed) {
    return prepared.report;
  }

  const {storagePaths} = prepared;

  const deleteResults = await Promise.allSettled(
    storagePaths.map(path => bucket.file(path).delete({ignoreNotFound: true}))
  );
  const failedPaths = storagePaths.filter((_, index) => deleteResults[index]?.status === 'rejected');
  if (failedPaths.length > 0) {
    await mediaRef.set({
      status: 'delete-failed',
      deleteLeaseExpiresAt: FieldValue.delete(),
      failedDeletePaths: failedPaths,
      updatedAt: now.toISOString(),
      syncedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
    throw new HttpsError('unavailable', 'Some media objects could not be removed. Retry the explicit delete.', {
      failedObjectCount: failedPaths.length,
    });
  }

  const batch = firestore.batch();
  batch.delete(mediaRef);
  batch.set(firestore.collection(MEDIA_AUDIT_COLLECTION).doc(`delete-${request.mediaId}-${now.getTime()}`), {
    operation: 'delete',
    actorUid,
    mediaId: request.mediaId,
    storageObjectCount: storagePaths.length,
    occurredAt: now.toISOString(),
    syncedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return {deleted: true, mediaId: request.mediaId, references: [], storageObjectCount: storagePaths.length};
}

function parseFinalizeRequest(value: unknown, actorUid: string): FinalizeBlogMediaRequest {
  if (!isRecord(value)) {
    throw new HttpsError('invalid-argument', 'Media finalization request is required.');
  }
  const mediaId = getTrimmedString(value['mediaId']);
  const slug = getTrimmedString(value['slug']).toLowerCase();
  const role = getTrimmedString(value['role']).toLowerCase();
  const originalName = getTrimmedString(value['originalName']);
  const stagingPath = getTrimmedString(value['stagingPath']);
  const declaredContentType = normalizeImageMimeType(getTrimmedString(value['declaredContentType']));
  const expectedPrefix = `cms/blog-media-staging/${actorUid}/${mediaId}/`;

  if (!MEDIA_ID_PATTERN.test(mediaId)
    || !PATH_SEGMENT_PATTERN.test(slug)
    || !PATH_SEGMENT_PATTERN.test(role)
    || !originalName
    || originalName.length > 240
    || !declaredContentType
    || !stagingPath.startsWith(expectedPrefix)
    || !STAGING_FILE_PATTERN.test(stagingPath.slice(expectedPrefix.length))) {
    throw new HttpsError('invalid-argument', 'Media finalization fields or staging path are invalid.');
  }

  return {
    mediaId,
    slug,
    role,
    originalName,
    stagingPath,
    declaredContentType,
    altText: getTrimmedString(value['altText']).slice(0, 1_000),
  };
}

function parseDeleteRequest(value: unknown): {mediaId: string; confirmDelete: boolean} {
  if (!isRecord(value) || !MEDIA_ID_PATTERN.test(getTrimmedString(value['mediaId']))) {
    throw new HttpsError('invalid-argument', 'A valid media id is required.');
  }
  return {
    mediaId: getTrimmedString(value['mediaId']),
    confirmDelete: value['confirmDelete'] === true,
  };
}

function parseFinalizedMedia(value: unknown): FinalizedBlogMedia | null {
  if (!isRecord(value)
    || !MEDIA_ID_PATTERN.test(getTrimmedString(value['mediaId']))
    || !getTrimmedString(value['checksum'])
    || !getTrimmedString(value['downloadUrl'])
    || !getTrimmedString(value['storagePath'])
    || !Array.isArray(value['variants'])) {
    return null;
  }
  return value as unknown as FinalizedBlogMedia;
}

async function findReadyMediaByChecksum(
  firestore: Firestore,
  checksum: string
): Promise<FinalizedBlogMedia | null> {
  const matches = await firestore.collection(MEDIA_COLLECTION)
    .where('checksum', '==', checksum)
    .get();

  for (const snapshot of matches.docs) {
    const data = snapshot.data();
    if (data['status'] !== 'ready') {
      continue;
    }
    const finalized = parseFinalizedMedia(data['result']);
    if (finalized?.checksum === checksum) {
      return finalized;
    }
  }
  return null;
}

async function createVariant(
  source: Buffer,
  width: number,
  format: TrustedImageVariantFormat
): Promise<{data: Buffer; info: OutputInfo}> {
  const pipeline = sharp(source, {failOn: 'error', animated: false})
    .rotate()
    .resize({width, withoutEnlargement: true, fit: 'inside'});
  switch (format) {
    case 'avif':
      return pipeline.avif({quality: 58, effort: 5}).toBuffer({resolveWithObject: true});
    case 'webp':
      return pipeline.webp({quality: 82, effort: 5}).toBuffer({resolveWithObject: true});
    case 'jpeg':
      return pipeline.jpeg({quality: 84, progressive: true, mozjpeg: true}).toBuffer({resolveWithObject: true});
  }
}

function normalizeImageMimeType(value: string): TrustedImageMimeType | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'image/jpg') {
    return 'image/jpeg';
  }
  return normalized === 'image/jpeg'
    || normalized === 'image/png'
    || normalized === 'image/webp'
    || normalized === 'image/avif'
    || normalized === 'image/gif'
    ? normalized
    : null;
}

function countIdentityMatches(value: unknown, identities: ReadonlySet<string>): number {
  if (typeof value === 'string') {
    let matches = 0;
    for (const identity of identities) {
      if (value === identity || value.includes(identity)) {
        matches += 1;
      }
    }
    return matches;
  }
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + countIdentityMatches(item, identities), 0);
  }
  if (isRecord(value)) {
    return Object.values(value).reduce<number>((total, item) => total + countIdentityMatches(item, identities), 0);
  }
  return 0;
}

function createFirebaseStorageDownloadUrl(bucketName: string, storagePath: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

function textAt(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

function getTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
