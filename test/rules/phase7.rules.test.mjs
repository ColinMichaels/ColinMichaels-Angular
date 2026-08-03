import assert from 'node:assert/strict';
import {after, before, beforeEach, test} from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {deleteDoc, doc, getDoc, setDoc, updateDoc} from 'firebase/firestore';
import {deleteObject, getBytes, listAll, ref, updateMetadata, uploadBytes} from 'firebase/storage';

const projectId = 'phase7-rules-test';
let testEnvironment;

const editorClaims = {
  contentEditor: true,
  roles: {contentEditor: true},
};
const adminClaims = {
  admin: true,
  roles: {admin: true},
};

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {host: '127.0.0.1', port: 8080},
    storage: {host: '127.0.0.1', port: 9199},
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
  await testEnvironment.clearStorage();
  await testEnvironment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'posts', 'published-post'), {
      id: 'published-post',
      slug: 'published-post',
      status: 'published',
      revision: 2,
    });
    await setDoc(doc(context.firestore(), 'posts', 'draft-post'), {
      id: 'draft-post',
      slug: 'draft-post',
      status: 'draft',
      revision: 3,
    });
    await setDoc(doc(context.firestore(), 'postDrafts', 'owner-user', 'recoveries', 'draft-post'), {
      ownerUid: 'owner-user',
      postId: 'draft-post',
    });
    await setDoc(doc(context.firestore(), 'shareLinks', 'opaque-share'), {
      postId: 'published-post',
    });
    await uploadBytes(
      ref(context.storage(), 'cms/blog-media/legacy-post/editor-image/legacy.webp'),
      new Uint8Array([1, 2, 3]),
      {contentType: 'image/webp'}
    );
    await uploadBytes(
      ref(context.storage(), 'cms/blog-media-staging/owner-user/media-id/source.jpg'),
      new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      {contentType: 'image/jpeg'}
    );
  });
});

after(async () => {
  await testEnvironment?.cleanup();
});

test('public readers can read only published canonical posts', async () => {
  const publicDb = testEnvironment.unauthenticatedContext().firestore();
  const published = await assertSucceeds(getDoc(doc(publicDb, 'posts', 'published-post')));
  assert.equal(published.data().status, 'published');
  await assertFails(getDoc(doc(publicDb, 'posts', 'draft-post')));
});

test('CMS roles can read drafts but every canonical write is backend-only', async () => {
  const editorDb = testEnvironment.authenticatedContext('editor-user', editorClaims).firestore();
  await assertSucceeds(getDoc(doc(editorDb, 'posts', 'draft-post')));
  await assertFails(updateDoc(doc(editorDb, 'posts', 'draft-post'), {title: 'Direct bypass'}));
  await assertFails(setDoc(doc(editorDb, 'posts', 'new-post'), {status: 'draft'}));
  await assertFails(deleteDoc(doc(editorDb, 'posts', 'draft-post')));
  await assertFails(setDoc(doc(editorDb, 'postPreviews', 'preview-token'), {post: {status: 'draft'}}));
  await assertFails(setDoc(doc(editorDb, 'blogSlugs', 'reserved-slug'), {postId: 'new-post'}));
  await assertFails(setDoc(doc(editorDb, 'blogPublishingAudit', 'event'), {postId: 'draft-post'}));
});

test('the recursive admin fallback cannot bypass backend-only publishing records', async () => {
  const adminDb = testEnvironment.authenticatedContext('admin-user', adminClaims).firestore();
  await assertFails(updateDoc(doc(adminDb, 'posts', 'draft-post'), {title: 'Direct admin bypass'}));
  for (const [collectionName, documentId] of [
    ['postPreviews', 'preview-token'],
    ['postDrafts', 'direct-admin-draft'],
    ['blogSlugs', 'reserved-slug'],
    ['blogMutationReceipts', 'receipt'],
    ['blogPublishingAudit', 'event'],
    ['blogMediaAssets', 'media-id'],
    ['blogMediaAudit', 'media-event'],
    ['socialOutbox', 'delivery'],
    ['socialConnections', 'provider'],
    ['shareLinks', 'share'],
    ['shareLandingEvents', 'landing'],
    ['pushSubscriptions', 'subscription'],
    ['postComments', 'comment'],
    ['userPointEvents', 'point-event'],
  ]) {
    await assertFails(setDoc(doc(adminDb, collectionName, documentId), {directClientWrite: true}));
  }
  await assertFails(getDoc(doc(adminDb, 'shareLinks', 'opaque-share')));
  await assertFails(getDoc(doc(adminDb, 'postDrafts', 'owner-user', 'recoveries', 'draft-post')));
});

test('an editor can create only a supported image in their own staging path', async () => {
  const editorStorage = testEnvironment.authenticatedContext('editor-user', editorClaims).storage();
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  const ownStaging = ref(editorStorage, 'cms/blog-media-staging/editor-user/019fc788-730b-7982-91c8/source.jpg');
  await assertSucceeds(uploadBytes(ownStaging, bytes, {contentType: 'image/jpeg'}));
  await assertFails(uploadBytes(
    ref(editorStorage, 'cms/blog-media-staging/other-user/019fc788-730b-7982-91c8/source.jpg'),
    bytes,
    {contentType: 'image/jpeg'}
  ));
  await assertFails(uploadBytes(
    ref(editorStorage, 'cms/blog-media-staging/editor-user/019fc788-730b-7982-91c9/source.svg'),
    new TextEncoder().encode('<svg/>'),
    {contentType: 'image/svg+xml'}
  ));
  await assertFails(updateMetadata(ownStaging, {cacheControl: 'public,max-age=60'}));
  await assertFails(deleteObject(ownStaging));
});

test('final and legacy blog media remain publicly readable but client writes are denied', async () => {
  const publicStorage = testEnvironment.unauthenticatedContext().storage();
  const editorStorage = testEnvironment.authenticatedContext('editor-user', editorClaims).storage();
  const legacyPath = 'cms/blog-media/legacy-post/editor-image/legacy.webp';
  await assertSucceeds(getBytes(ref(publicStorage, legacyPath)));
  await assertFails(uploadBytes(
    ref(editorStorage, 'cms/blog-media/new-post/editor-image/media-id/960w.webp'),
    new Uint8Array([1, 2, 3]),
    {contentType: 'image/webp'}
  ));
});

test('staging remains private and the recursive admin fallback cannot mutate blog media', async () => {
  const readerStorage = testEnvironment.authenticatedContext('reader-user').storage();
  const adminStorage = testEnvironment.authenticatedContext('admin-user', adminClaims).storage();
  const stagingPath = 'cms/blog-media-staging/owner-user/media-id/source.jpg';
  await assertFails(getBytes(ref(readerStorage, stagingPath)));
  await assertFails(listAll(ref(readerStorage, 'cms/blog-media-staging')));
  await assertFails(updateMetadata(ref(adminStorage, stagingPath), {cacheControl: 'public,max-age=60'}));
  await assertFails(deleteObject(ref(adminStorage, stagingPath)));
  await assertFails(uploadBytes(
    ref(adminStorage, 'cms/blog-media/new-post/editor-image/media-id/960w.webp'),
    new Uint8Array([1, 2, 3]),
    {contentType: 'image/webp'}
  ));
});
