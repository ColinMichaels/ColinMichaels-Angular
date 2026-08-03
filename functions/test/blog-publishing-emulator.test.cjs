const assert = require('node:assert/strict');
const test = require('node:test');

const {deleteApp, getApps, initializeApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');

const {
  mutateBlogPost,
  publishDueScheduledPosts,
} = require('../lib/blog-publishing.js');

function createPost(id, slug, overrides = {}) {
  return {
    id,
    revision: 0,
    slug,
    title: `Post ${slug}`,
    excerpt: 'A complete emulator post for trusted publishing transactions.',
    coverImage: '/assets/images/post.webp',
    authorId: 'colin-michaels',
    author: {name: 'Colin Michaels', slug: 'colin-michaels'},
    categories: ['CMS'],
    subcategories: [],
    tags: ['Firebase'],
    status: 'draft',
    seo: {title: `Post ${slug}`, description: 'Trusted publishing transaction coverage.'},
    contentFormat: 'editorjs',
    blocks: [{id: `${id}-paragraph`, type: 'paragraph', data: {text: 'Trusted content.'}}],
    createdAt: '2026-08-03T12:00:00.000Z',
    updatedAt: '2026-08-03T12:00:00.000Z',
    publishedAt: null,
    ...overrides,
  };
}

test('trusted publishing transactions are revisioned, idempotent, slug-safe, preview-atomic, scheduled, audited, and deletable', async () => {
  const app = initializeApp({projectId: 'phase7-functions-test'}, 'phase7-functions-test');
  const firestore = getFirestore(app);
  const actorUid = 'editor-user';
  const firstPost = createPost('post-one', 'shared-slug');
  const saveRequest = {
    operation: 'save',
    postId: firstPost.id,
    expectedRevision: 0,
    requestId: '019fc788-730b-7982-91c8-055dcdb1a8bf',
    post: firstPost,
  };

  const saved = await mutateBlogPost(firestore, saveRequest, actorUid, new Date('2026-08-03T13:00:00.000Z'));
  assert.equal(saved.post.revision, 1);
  assert.equal((await firestore.doc('blogSlugs/shared-slug').get()).get('postId'), firstPost.id);
  assert.equal((await firestore.collection('blogPublishingAudit').get()).size, 1);

  const replayed = await mutateBlogPost(firestore, saveRequest, actorUid, new Date('2026-08-03T13:01:00.000Z'));
  assert.equal(replayed.replayed, true);
  assert.equal(replayed.post.revision, 1);
  assert.equal((await firestore.collection('blogPublishingAudit').get()).size, 1);

  await assert.rejects(
    mutateBlogPost(firestore, {
      ...saveRequest,
      requestId: '019fc788-730b-7982-91c8-055dcdb1a8c0',
      post: {...firstPost, title: 'Stale writer'},
    }, actorUid),
    error => error.code === 'aborted' && error.details.actualRevision === 1
  );

  const secondPost = createPost('post-two', 'shared-slug');
  await assert.rejects(
    mutateBlogPost(firestore, {
      operation: 'save',
      postId: secondPost.id,
      expectedRevision: 0,
      requestId: '019fc788-730b-7982-91c8-055dcdb1a8c1',
      post: secondPost,
    }, actorUid),
    error => error.code === 'already-exists'
  );

  const mediaId = '019fc788-730b-7982-91c8-055dcdb1a8d0';
  const mediaUrl = `https://firebasestorage.googleapis.com/v0/b/phase7-functions-test.appspot.com/o/${encodeURIComponent(`cms/blog-media/media-post/editor-image/${mediaId}/960w.webp`)}?alt=media&token=test`;
  await firestore.doc(`blogMediaAssets/${mediaId}`).set({status: 'ready'});
  const mediaPost = createPost('post-media', 'media-post', {coverImage: mediaUrl});
  const mediaSaved = await mutateBlogPost(firestore, {
    operation: 'save',
    postId: mediaPost.id,
    expectedRevision: 0,
    requestId: '019fc788-730b-7982-91c8-055dcdb1a8d1',
    post: mediaPost,
  }, actorUid);
  assert.equal(mediaSaved.post.revision, 1);
  await firestore.doc(`blogMediaAssets/${mediaId}`).update({status: 'deleting'});
  await assert.rejects(
    mutateBlogPost(firestore, {
      operation: 'save',
      postId: mediaPost.id,
      expectedRevision: 1,
      requestId: '019fc788-730b-7982-91c8-055dcdb1a8d2',
      post: {...mediaSaved.post, title: 'Must not attach deleting media'},
    }, actorUid),
    error => error.code === 'failed-precondition' && error.details.mediaId === mediaId
  );
  await firestore.doc(`blogMediaAssets/${mediaId}`).update({status: 'ready'});

  const previewed = await mutateBlogPost(firestore, {
    operation: 'issuePreview',
    postId: firstPost.id,
    expectedRevision: 1,
    requestId: '019fc788-730b-7982-91c8-055dcdb1a8c2',
  }, actorUid, new Date('2026-08-03T13:05:00.000Z'));
  const previewToken = previewed.post.preview.token;
  assert.equal(previewed.post.revision, 2);
  assert.equal((await firestore.doc(`postPreviews/${previewToken}`).get()).exists, true);

  const revoked = await mutateBlogPost(firestore, {
    operation: 'revokePreview',
    postId: firstPost.id,
    expectedRevision: 2,
    requestId: '019fc788-730b-7982-91c8-055dcdb1a8c3',
  }, actorUid, new Date('2026-08-03T13:06:00.000Z'));
  assert.equal(revoked.post.revision, 3);
  assert.equal(revoked.post.preview, undefined);
  assert.equal((await firestore.doc(`postPreviews/${previewToken}`).get()).exists, false);

  const scheduledAt = '2026-08-03T14:00:00.000Z';
  const scheduled = await mutateBlogPost(firestore, {
    operation: 'save',
    postId: firstPost.id,
    expectedRevision: 3,
    requestId: '019fc788-730b-7982-91c8-055dcdb1a8c4',
    post: {...revoked.post, status: 'scheduled', publishedAt: scheduledAt},
  }, actorUid, new Date('2026-08-03T13:10:00.000Z'));
  assert.equal(scheduled.post.status, 'scheduled');

  const publication = await publishDueScheduledPosts(firestore, new Date('2026-08-03T14:01:00.000Z'));
  assert.deepEqual(publication.publishedPostIds, [firstPost.id], JSON.stringify(publication));
  const published = (await firestore.doc(`posts/${firstPost.id}`).get()).data();
  assert.equal(published.status, 'published');
  assert.equal(published.revision, 5);
  assert.equal(published.publishedAt, scheduledAt);

  const deleted = await mutateBlogPost(firestore, {
    operation: 'delete',
    postId: firstPost.id,
    expectedRevision: 5,
    requestId: '019fc788-730b-7982-91c8-055dcdb1a8c5',
  }, actorUid, new Date('2026-08-03T14:05:00.000Z'));
  assert.equal(deleted.deleted, true);
  assert.equal((await firestore.doc(`posts/${firstPost.id}`).get()).exists, false);
  assert.equal((await firestore.doc('blogSlugs/shared-slug').get()).exists, false);

  await deleteApp(app);
  assert.equal(getApps().some(candidate => candidate.name === 'phase7-functions-test'), false);
});
