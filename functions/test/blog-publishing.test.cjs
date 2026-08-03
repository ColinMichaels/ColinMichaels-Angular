const assert = require('node:assert/strict');
const test = require('node:test');

const {
  collectTrustedBlogMediaIds,
  parseBlogMutationRequest,
  validateTrustedBlogPost,
} = require('../lib/blog-publishing.js');

function createPost(overrides = {}) {
  return {
    id: 'post-phase-seven',
    revision: 3,
    slug: 'phase-seven',
    title: 'Phase Seven',
    excerpt: 'A complete post used to validate the trusted publishing boundary.',
    coverImage: '/assets/images/phase-seven.webp',
    featured: false,
    authorId: 'colin-michaels',
    author: {name: 'Colin Michaels', slug: 'colin-michaels'},
    categories: ['CMS'],
    subcategories: [],
    tags: ['Firebase'],
    status: 'draft',
    seo: {
      title: 'Phase Seven',
      description: 'A complete post used to validate the trusted publishing boundary.',
      canonical: 'https://colinmichaels.com/blog/phase-seven',
      openGraphImage: '/assets/images/phase-seven.webp',
    },
    contentFormat: 'editorjs',
    blocks: [
      {id: 'paragraph-1', type: 'paragraph', data: {text: 'Trusted content.'}},
      {
        id: 'image-1',
        type: 'image',
        data: {
          url: 'https://firebasestorage.googleapis.com/example.webp',
          alt: 'Phase seven flow',
          width: 1600,
          height: 900,
          imageLayout: 'contained',
          imageSize: 'wide',
        },
      },
    ],
    createdAt: '2026-08-03T12:00:00.000Z',
    updatedAt: '2026-08-03T12:00:00.000Z',
    publishedAt: null,
    ...overrides,
  };
}

test('accepts the complete backward-compatible Editor.js post contract', () => {
  assert.doesNotThrow(() => validateTrustedBlogPost(createPost(), new Date('2026-08-03T13:00:00.000Z')));
});

test('rejects unsafe URL protocols before a trusted write', () => {
  const post = createPost({coverImage: 'javascript:alert(1)'});
  assert.throws(
    () => validateTrustedBlogPost(post),
    error => error.code === 'invalid-argument' && /Cover image/.test(error.message)
  );
});

test('rejects duplicate block ids and non-positive intrinsic dimensions', () => {
  const duplicate = createPost({
    blocks: [
      {id: 'same', type: 'paragraph', data: {text: 'One'}},
      {id: 'same', type: 'image', data: {url: 'https://example.com/image.webp', width: 0}},
    ],
  });
  assert.throws(() => validateTrustedBlogPost(duplicate), /unique bounded id/);
});

test('rejects malformed structured block and social contracts at the trusted boundary', () => {
  assert.throws(() => validateTrustedBlogPost(createPost({
    blocks: [{id: 'chart-1', type: 'chart', data: {chartPoints: [{label: 'A', value: 'many'}]}}],
  })), /Block data fields/);
  assert.throws(() => validateTrustedBlogPost(createPost({
    socialPromotion: {
      announcements: [{
        id: 'social-1',
        channel: 'instagram',
        message: 'A complete announcement.',
        status: 'draft',
        createdAt: '2026-08-03T12:00:00.000Z',
        updatedAt: '2026-08-03T12:00:00.000Z',
        postFormat: 'thread',
      }],
    },
  })), /invalid for its channel/);
});

test('bounds nested compatibility JSON without rejecting safe internal media paths', () => {
  let nested = {value: 'leaf'};
  for (let depth = 0; depth < 40; depth += 1) {
    nested = {nested};
  }
  assert.throws(() => validateTrustedBlogPost(createPost({
    coverImage: '/images/legacy-safe-path.webp',
    blocks: [{
      id: 'opaque-1',
      type: 'unsupported',
      data: {unsupportedBlock: {originalType: 'future', originalData: nested}},
    }],
  })), /bounded JSON data/);
  assert.doesNotThrow(() => validateTrustedBlogPost(createPost({
    coverImage: '/images/legacy-safe-path.webp',
  })));
});

test('requires a future timestamp for a newly scheduled write', () => {
  const scheduled = createPost({status: 'scheduled', publishedAt: '2026-08-03T11:00:00.000Z'});
  assert.throws(
    () => validateTrustedBlogPost(scheduled, new Date('2026-08-03T12:00:00.000Z')),
    /future publication time/
  );
  assert.doesNotThrow(() => validateTrustedBlogPost(
    {...scheduled, publishedAt: '2026-08-04T12:00:00.000Z'},
    new Date('2026-08-03T12:00:00.000Z')
  ));
});

test('parses bounded idempotent save requests and rejects mismatched post ids', () => {
  const request = parseBlogMutationRequest({
    operation: 'save',
    postId: 'post-phase-seven',
    expectedRevision: 3,
    requestId: '019fc788-730b-7982-91c8-055dcdb1a8bf',
    post: createPost(),
  });
  assert.equal(request.operation, 'save');
  assert.equal(request.expectedRevision, 3);
  assert.throws(() => parseBlogMutationRequest({
    ...request,
    postId: 'another-post',
  }), /matching complete post/);
});

test('extracts only trusted Phase 7 media identities from storage paths and provider URLs', () => {
  const mediaId = '019fc788-730b-7982-91c8-055dcdb1a8bf';
  const storagePath = `cms/blog-media/phase-seven/editor-image/${mediaId}/960w.webp`;
  const firebaseUrl = `https://firebasestorage.googleapis.com/v0/b/example.appspot.com/o/${encodeURIComponent(storagePath)}?alt=media&token=test`;
  const googleStorageUrl = `https://storage.googleapis.com/example.appspot.com/${storagePath}`;
  assert.deepEqual(collectTrustedBlogMediaIds({coverImage: firebaseUrl, blocks: [{url: googleStorageUrl}]}), [mediaId]);
  assert.deepEqual(collectTrustedBlogMediaIds({
    legacy: 'cms/blog-media/legacy-post/editor-image/legacy.webp',
    external: `https://cdn.example.com/${storagePath}`,
  }), []);
});
