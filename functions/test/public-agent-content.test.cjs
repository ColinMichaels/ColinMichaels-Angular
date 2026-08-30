const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createPublicAgentContentRateLimitIdentity,
  parsePublicAgentContentRequest,
  searchPublicAgentContent,
  toPublicAgentArticle,
} = require('../lib/public-agent-content.js');

function createPublishedSummary(overrides = {}) {
  return {
    status: 'published',
    slug: 'agent-ready-content',
    title: 'Agent-ready public content',
    excerpt: 'A practical guide to public content discovery and citations.',
    author: {name: 'Colin Michaels'},
    categories: ['Angular & Firebase'],
    tags: ['agents', 'webmcp'],
    publishedAt: '2026-08-29T12:00:00.000Z',
    updatedAt: '2026-08-29T12:00:00.000Z',
    searchBodyText: 'This must never leave the compact public agent projection.',
    ...overrides,
  };
}

test('accepts only bounded read-only public-agent request shapes', () => {
  assert.deepEqual(parsePublicAgentContentRequest({
    operation: 'search',
    query: '  WebMCP public discovery  ',
  }), {
    operation: 'search',
    query: 'WebMCP public discovery',
  });
  assert.deepEqual(parsePublicAgentContentRequest({
    operation: 'getArticle',
    canonicalUrl: '/blog/agent-ready-content',
  }), {
    operation: 'getArticle',
    canonicalUrl: 'https://colinmichaels.com/blog/agent-ready-content',
  });
  assert.deepEqual(parsePublicAgentContentRequest({
    operation: 'getTopic',
    topicSlug: 'drones-fpv',
  }), {
    operation: 'getTopic',
    topicSlug: 'drones-fpv',
  });

  assert.throws(
    () => parsePublicAgentContentRequest({operation: 'search', query: 'agent', unexpected: true}),
    /unsupported fields/i,
  );
  assert.throws(
    () => parsePublicAgentContentRequest({
      operation: 'getArticle',
      canonicalUrl: 'https://example.com/blog/agent-ready-content'
    }),
    /canonical colinmichaels/i,
  );
  assert.throws(
    () => parsePublicAgentContentRequest({operation: 'getTopic', topicSlug: 'private-cms'}),
    /topic slug/i,
  );
});

test('projects only published citation metadata and never body-search text', () => {
  const article = toPublicAgentArticle(createPublishedSummary());

  assert.deepEqual(article, {
    kind: 'article',
    title: 'Agent-ready public content',
    excerpt: 'A practical guide to public content discovery and citations.',
    canonicalUrl: 'https://colinmichaels.com/blog/agent-ready-content',
    author: 'Colin Michaels',
    categories: ['Angular & Firebase'],
    tags: ['agents', 'webmcp'],
    publishedAt: '2026-08-29T12:00:00.000Z',
    updatedAt: '2026-08-29T12:00:00.000Z',
  });
  assert.equal(JSON.stringify(article).includes('This must never leave'), false);
  assert.equal(toPublicAgentArticle(createPublishedSummary({status: 'draft'})), null);
});

test('searches the compact article projection and canonical topic guides', () => {
  const article = toPublicAgentArticle(createPublishedSummary());
  assert.ok(article);

  const articleResults = searchPublicAgentContent([article], 'webmcp citations');
  assert.equal(articleResults[0]?.kind, 'article');
  assert.equal(articleResults[0]?.canonicalUrl, 'https://colinmichaels.com/blog/agent-ready-content');

  const topicResults = searchPublicAgentContent([], 'Florida FPV drone flight');
  assert.equal(topicResults[0]?.kind, 'topic');
  assert.equal(topicResults[0]?.canonicalUrl, 'https://colinmichaels.com/topics/drones-fpv');
  assert.ok(topicResults.length <= 5);
});

test('creates an opaque stable per-connection rate-limit identity', () => {
  const identity = createPublicAgentContentRateLimitIdentity('user-1', '203.0.113.25');

  assert.equal(identity, createPublicAgentContentRateLimitIdentity('user-1', '203.0.113.25'));
  assert.match(identity, /^[a-f0-9]{64}$/);
  assert.equal(identity.includes('203.0.113.25'), false);
});
