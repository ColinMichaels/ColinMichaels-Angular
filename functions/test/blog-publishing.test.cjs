const assert = require('node:assert/strict');
const test = require('node:test');

const {
  collectTrustedBlogMediaIds,
  createBlogPostSummaryDocument,
  createEditorialUpdatePlan,
  normalizeUnsupportedBlogBlocksForStorage,
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

test('creates a compact searchable summary without retaining canonical blocks', () => {
  const post = createPost({
    status: 'published',
    publishedAt: '2026-08-03T13:00:00.000Z',
    blocks: [
      {id: 'paragraph', type: 'paragraph', data: {text: '<strong>Useful</strong> recovery advice.'}},
      {
        id: 'markdown',
        type: 'markdown',
        data: {markdown: 'Read **the guide** at [this page](https://example.com/private).'}
      },
      {
        id: 'gallery',
        type: 'gallery',
        data: {galleryImages: [{url: '/assets/images/inside.webp', alt: 'Inside view'}]},
      },
    ],
  });

  const summary = createBlogPostSummaryDocument(post);

  assert.equal(summary.id, post.id);
  assert.equal(summary.status, 'published');
  assert.equal(summary.storageVersion, 1);
  assert.equal('blocks' in summary, false);
  assert.match(summary.searchBodyText, /useful recovery advice/);
  assert.match(summary.searchBodyText, /read the guide at this page/);
  assert.doesNotMatch(summary.searchBodyText, /example\.com/);
  assert.deepEqual(summary.previewImages, [{url: '/assets/images/inside.webp', alt: 'Inside view'}]);
  assert.ok(summary.wordCount > 0);
  assert.ok(summary.readingMinutes > 0);
});

test('repairs HTML-escaped Firebase query parameters in compact preview summaries', () => {
  const summary = createBlogPostSummaryDocument(createPost({
    blocks: [{
      id: 'encoded-image',
      type: 'image',
      data: {
        url: 'https://firebasestorage.googleapis.com/example.webp?alt=media&amp;token=public-token',
        alt: 'Encoded Firebase preview',
      },
    }],
  }));

  assert.deepEqual(summary.previewImages, [{
    url: 'https://firebasestorage.googleapis.com/example.webp?alt=media&token=public-token',
    alt: 'Encoded Firebase preview',
  }]);
});

test('bounds compact summary search text without truncating reading statistics', () => {
  const repeatedText = 'searchable '.repeat(4_000);
  const summary = createBlogPostSummaryDocument(createPost({
    blocks: [{id: 'large-paragraph', type: 'paragraph', data: {text: repeatedText}}],
  }));

  assert.equal(summary.searchBodyText.length, 16_000);
  assert.ok(summary.wordCount > 3_000);
});

test('accepts evidence-backed companion video metadata and rejects malformed or misplaced fields', () => {
  const companion = {
    id: 'youtube-companion',
    type: 'embed',
    data: {
      provider: 'youtube',
      url: 'https://www.youtube.com/watch?v=L229QDxDakU',
      embedUrl: 'https://www.youtube.com/embed/L229QDxDakU',
      isCompanionVideo: true,
      videoTitle: 'Field flight',
      videoDescription: 'The exact public companion video.',
      videoUploadDate: '2026-08-13T13:43:21Z',
      videoDurationSeconds: 158.4,
    },
  };

  assert.doesNotThrow(() => validateTrustedBlogPost(createPost({blocks: [companion]})));
  assert.throws(() => validateTrustedBlogPost(createPost({
    blocks: [{...companion, data: {...companion.data, videoUploadDate: '2026-08-13T13:43:21'}}],
  })), /Block data fields/);
  assert.throws(() => validateTrustedBlogPost(createPost({
    blocks: [{...companion, data: {...companion.data, videoDurationSeconds: 0}}],
  })), /Block data fields/);
  assert.throws(() => validateTrustedBlogPost(createPost({
    blocks: [{...companion, data: {...companion.data, isCompanionVideo: false}}],
  })), /selected YouTube companion/);
});

test('accepts bounded editorial evidence metadata and rejects unsupported claims data', () => {
  assert.doesNotThrow(() => validateTrustedBlogPost(createPost({
    editorial: {
      evidenceBasis: 'mixed',
      evidenceSummary: 'Hands-on observations are separated from linked manufacturer specifications.',
      sourceReviewedAt: '2026-08-15',
      relationshipDisclosure: 'No product access or compensation was supplied.',
      aiAssistanceDisclosure: 'AI assisted with transcript organization.',
      syntheticMediaDisclosure: 'The cover is an editorial illustration.',
      updateNote: 'Clarified the evidence boundary.',
    },
  })));
  assert.throws(() => validateTrustedBlogPost(createPost({
    editorial: {evidenceBasis: 'guaranteed-verified'},
  })), /evidence basis/);
  assert.throws(() => validateTrustedBlogPost(createPost({
    editorial: {sourceReviewedAt: '2026-02-30'},
  })), /YYYY-MM-DD/);
  assert.throws(() => validateTrustedBlogPost(createPost({
    editorial: {evidenceBasis: 'researched', authorityScore: 100},
  })), /unsupported fields/);
});

test('accepts bounded trusted galleries and rejects malformed nested image data', () => {
  const gallery = {
    id: 'gallery-1',
    type: 'gallery',
    data: {
      title: 'Session gallery',
      galleryLayout: 'mosaic',
      galleryImages: [
        {url: '/assets/images/session-one.webp', alt: 'Session one', width: 1600, height: 900},
        {url: 'https://images.example.com/session-two.webp', alt: 'Session two', caption: 'After dark'},
      ],
    },
  };

  assert.doesNotThrow(() => validateTrustedBlogPost(createPost({blocks: [gallery]})));
  assert.throws(() => validateTrustedBlogPost(createPost({
    blocks: [{...gallery, data: {...gallery.data, galleryLayout: 'autoplay'}}],
  })), /Block data fields/);
  assert.throws(() => validateTrustedBlogPost(createPost({
    blocks: [{
      ...gallery,
      data: {
        ...gallery.data,
        galleryImages: [gallery.data.galleryImages[0], {url: 'javascript:alert(1)', alt: 'Unsafe'}],
      },
    }],
  })), /Block data fields/);
  assert.throws(() => validateTrustedBlogPost(createPost({
    blocks: [{
      ...gallery,
      data: {
        ...gallery.data,
        galleryImages: [gallery.data.galleryImages[0], {url: '/assets/images/two.webp', alt: ''}],
      },
    }],
  })), /Block data fields/);
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

test('encodes nested-array compatibility data before Firestore storage without losing it', () => {
  const tableData = {
    withHeadings: true,
    content: [['Aircraft', 'Price'], ['Helix', '$190,000']],
  };
  const normalized = normalizeUnsupportedBlogBlocksForStorage(createPost({
    blocks: [{
      id: 'table-1',
      type: 'unsupported',
      data: {
        unsupportedBlock: {
          originalType: 'table',
          originalData: tableData,
          originalTunes: {alignmentTune: {alignment: 'center'}},
        },
      },
    }],
  }));
  const envelope = normalized.blocks[0].data.unsupportedBlock;

  assert.equal(envelope.encoding, 'json-v1');
  assert.deepEqual(JSON.parse(envelope.originalDataJson), tableData);
  assert.deepEqual(JSON.parse(envelope.originalTunesJson), {alignmentTune: {alignment: 'center'}});
  assert.equal(envelope.originalData, undefined);
  assert.doesNotThrow(() => validateTrustedBlogPost(normalized));
});

test('rejects malformed encoded compatibility data at the trusted boundary', () => {
  assert.throws(() => validateTrustedBlogPost(createPost({
    blocks: [{
      id: 'table-1',
      type: 'unsupported',
      data: {
        unsupportedBlock: {
          originalType: 'table',
          encoding: 'json-v1',
          originalDataJson: '{not-json}',
        },
      },
    }],
  })), /compatibility envelope/);
  assert.throws(() => validateTrustedBlogPost(createPost({
    blocks: [{
      id: 'mixed-table-1',
      type: 'unsupported',
      data: {
        unsupportedBlock: {
          originalType: 'table',
          encoding: 'json-v1',
          originalDataJson: '{"content":[["A","B"]]}',
          originalData: {content: [['A', 'B']]},
        },
      },
    }],
  })), /compatibility envelope/);
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

test('parses and normalizes evidence-only updates without inspecting legacy blocks', () => {
  const request = parseBlogMutationRequest({
    operation: 'updateEditorial',
    postId: 'post-phase-seven',
    expectedRevision: 3,
    requestId: '019fc788-730b-7982-91c8-055dcdb1a8c6',
    editorial: {
      evidenceBasis: 'researched',
      evidenceSummary: '  Public sources were checked independently.  ',
      sourceReviewedAt: '2026-08-21',
    },
  });
  const legacyBlocks = [{id: 'legacy', type: 'future-block', data: '{malformed'}];
  const currentPost = createPost({revision: 3, blocks: legacyBlocks, legacyField: {preserve: true}});
  const plan = createEditorialUpdatePlan(
    currentPost,
    request.editorial,
    request.expectedRevision,
    new Date('2026-08-21T16:00:00.000Z')
  );

  assert.deepEqual(request.editorial, {
    evidenceBasis: 'researched',
    evidenceSummary: 'Public sources were checked independently.',
    sourceReviewedAt: '2026-08-21',
  });
  assert.equal(plan.revision, 4);
  assert.equal(plan.updatedAt, '2026-08-21T16:00:00.000Z');
  assert.equal(plan.nextPost.blocks, legacyBlocks);
  assert.deepEqual(plan.nextPost.legacyField, {preserve: true});
  assert.throws(() => parseBlogMutationRequest({
    ...request,
    editorial: {evidenceBasis: 'researched', authorityScore: 100},
  }), /unsupported fields/);
  assert.throws(() => parseBlogMutationRequest({
    ...request,
    editorial: {sourceReviewedAt: '2026-02-30'},
  }), /YYYY-MM-DD/);
});

test('extracts only trusted Phase 7 media identities from storage paths and provider URLs', () => {
  const mediaId = '019fc788-730b-7982-91c8-055dcdb1a8bf';
  const storagePath = `cms/blog-media/phase-seven/editor-image/${mediaId}/960w.webp`;
  const firebaseUrl = `https://firebasestorage.googleapis.com/v0/b/example.appspot.com/o/${encodeURIComponent(storagePath)}?alt=media&token=test`;
  const googleStorageUrl = `https://storage.googleapis.com/example.appspot.com/${storagePath}`;
  assert.deepEqual(collectTrustedBlogMediaIds({coverImage: firebaseUrl, blocks: [{url: googleStorageUrl}]}), [mediaId]);
  assert.deepEqual(collectTrustedBlogMediaIds({
    blocks: [{type: 'gallery', data: {galleryImages: [{url: firebaseUrl}, {url: googleStorageUrl}]}}],
  }), [mediaId]);
  assert.deepEqual(collectTrustedBlogMediaIds({
    legacy: 'cms/blog-media/legacy-post/editor-image/legacy.webp',
    external: `https://cdn.example.com/${storagePath}`,
  }), []);
});
