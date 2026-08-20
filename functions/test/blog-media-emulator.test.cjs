const assert = require('node:assert/strict');
const test = require('node:test');

const {deleteApp, initializeApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
const {getStorage} = require('firebase-admin/storage');
const sharp = require('sharp');

const {
  finalizeBlogMediaUpload,
  inspectOrDeleteBlogMedia,
} = require('../lib/blog-media.js');

test('media finalization validates bytes, creates durable variants, replays safely, reports references, and deletes explicitly', async () => {
  const projectId = 'phase7-media-test';
  const bucketName = `${projectId}.appspot.com`;
  const app = initializeApp({projectId, storageBucket: bucketName}, 'phase7-media-test');
  const firestore = getFirestore(app);
  const bucket = getStorage(app).bucket();
  const actorUid = 'editor-user';
  const mediaId = '019fc788-730b-7982-91c8-055dcdb1a8bf';
  const stagingPath = `cms/blog-media-staging/${actorUid}/${mediaId}/source.png`;
  const source = await sharp({
    create: {width: 1200, height: 675, channels: 4, background: '#123645'},
  }).png().toBuffer();
  await bucket.file(stagingPath).save(source, {metadata: {contentType: 'image/png'}});

  const request = {
    mediaId,
    stagingPath,
    originalName: 'phase-seven.png',
    declaredContentType: 'image/png',
    slug: 'phase-seven',
    role: 'editor-image',
    altText: 'Phase seven media pipeline',
  };
  const result = await finalizeBlogMediaUpload(
    firestore,
    bucket,
    request,
    actorUid,
    new Date('2026-08-03T15:00:00.000Z')
  );
  assert.equal(result.width, 1200);
  assert.equal(result.height, 675);
  assert.equal(result.contentType, 'image/webp');
  assert.equal(result.variants.length, 9);
  assert.deepEqual([...new Set(result.variants.map(variant => variant.width))], [480, 960, 1200]);
  assert.deepEqual([...new Set(result.variants.map(variant => variant.format))].sort(), ['avif', 'jpeg', 'webp']);
  assert.equal((await bucket.file(stagingPath).exists())[0], false);
  assert.equal((await firestore.doc(`blogMediaAssets/${mediaId}`).get()).get('status'), 'ready');

  const duplicateId = '019fc788-730b-7982-91c8-055dcdb1a8c9';
  const duplicatePath = `cms/blog-media-staging/${actorUid}/${duplicateId}/source.png`;
  await bucket.file(duplicatePath).save(source, {metadata: {contentType: 'image/png'}});
  const reused = await finalizeBlogMediaUpload(firestore, bucket, {
    ...request,
    mediaId: duplicateId,
    stagingPath: duplicatePath,
    slug: 'a-new-post',
    role: 'cover',
  }, actorUid);
  assert.equal(reused.mediaId, result.mediaId);
  assert.equal(reused.downloadUrl, result.downloadUrl);
  assert.equal((await bucket.file(duplicatePath).exists())[0], false);
  assert.equal((await firestore.doc(`blogMediaAssets/${duplicateId}`).get()).exists, false);
  assert.equal(
    (await firestore.doc(`blogMediaAudit/reuse-${duplicateId}`).get()).get('reusedMediaId'),
    mediaId
  );

  const replayed = await finalizeBlogMediaUpload(firestore, bucket, request, actorUid);
  assert.equal(replayed.checksum, result.checksum);
  assert.equal(replayed.downloadUrl, result.downloadUrl);

  await firestore.doc('posts/referencing-post').set({
    id: 'referencing-post',
    slug: 'referencing-post',
    status: 'draft',
    coverImage: result.downloadUrl,
  });
  const referenced = await inspectOrDeleteBlogMedia(firestore, bucket, {mediaId, confirmDelete: false}, actorUid);
  assert.deepEqual(referenced.references.map(reference => reference.postId), ['referencing-post']);
  await assert.rejects(
    inspectOrDeleteBlogMedia(firestore, bucket, {mediaId, confirmDelete: true}, actorUid),
    error => error.code === 'failed-precondition'
  );

  await firestore.doc('posts/referencing-post').delete();
  let releaseDelete;
  let markDeleteStarted;
  const deleteStarted = new Promise(resolve => { markDeleteStarted = resolve; });
  const deleteBarrier = new Promise(resolve => { releaseDelete = resolve; });
  const originalFile = bucket.file.bind(bucket);
  let firstDelete = true;
  const blockingBucket = {
    file(path) {
      const file = originalFile(path);
      return {
        async delete(options) {
          if (firstDelete) {
            firstDelete = false;
            markDeleteStarted();
            await deleteBarrier;
          }
          return file.delete(options);
        },
      };
    },
  };
  const deleting = inspectOrDeleteBlogMedia(
    firestore,
    blockingBucket,
    {mediaId, confirmDelete: true},
    actorUid
  );
  await deleteStarted;
  assert.equal((await firestore.doc(`blogMediaAssets/${mediaId}`).get()).get('status'), 'deleting');
  releaseDelete();
  const deleted = await deleting;
  assert.equal(deleted.deleted, true);
  assert.equal(deleted.storageObjectCount, 9);
  assert.equal((await firestore.doc(`blogMediaAssets/${mediaId}`).get()).exists, false);
  assert.equal((await bucket.file(result.storagePath).exists())[0], false);

  const mismatchId = '019fc788-730b-7982-91c8-055dcdb1a8c0';
  const mismatchPath = `cms/blog-media-staging/${actorUid}/${mismatchId}/source.jpg`;
  await bucket.file(mismatchPath).save(Buffer.from('<svg/>'), {metadata: {contentType: 'image/jpeg'}});
  await assert.rejects(
    finalizeBlogMediaUpload(firestore, bucket, {
      ...request,
      mediaId: mismatchId,
      stagingPath: mismatchPath,
      originalName: 'mismatch.jpg',
      declaredContentType: 'image/jpeg',
    }, actorUid),
    error => error.code === 'invalid-argument' && /signature/.test(error.message)
  );
  assert.equal((await bucket.file(mismatchPath).exists())[0], false);

  const corruptId = '019fc788-730b-7982-91c8-055dcdb1a8c2';
  const corruptPath = `cms/blog-media-staging/${actorUid}/${corruptId}/corrupt.jpg`;
  await bucket.file(corruptPath).save(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), {metadata: {contentType: 'image/jpeg'}});
  await assert.rejects(
    finalizeBlogMediaUpload(firestore, bucket, {
      ...request,
      mediaId: corruptId,
      stagingPath: corruptPath,
      originalName: 'corrupt.jpg',
      declaredContentType: 'image/jpeg',
    }, actorUid)
  );
  assert.equal((await bucket.file(corruptPath).exists())[0], false);

  await deleteApp(app);
});
