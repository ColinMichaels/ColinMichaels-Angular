const assert = require('node:assert/strict');
const test = require('node:test');
const {HttpsError} = require('firebase-functions/v2/https');

const {
  createPublicAgentContentTelemetryRecord,
  createPublicAgentContentRateLimitIdentity,
  getPublicAgentContentTelemetryErrorCode,
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

test('creates content-free structured operational telemetry', () => {
  const response = {
    operation: 'search',
    items: [toPublicAgentArticle(createPublishedSummary())],
    policy: {
      contentLicense: 'not-granted',
      readOnly: true,
      rateLimit: '20 requests per minute',
    },
  };
  const success = createPublicAgentContentTelemetryRecord({
    operation: 'search',
    query: 'private search phrase that must not enter logs',
  }, {
    authenticated: false,
    durationMs: 12.6,
    response,
  });

  assert.deepEqual(success, {
    event: 'public_agent_content_request',
    operation: 'search',
    outcome: 'success',
    authenticated: false,
    durationMs: 13,
    itemCount: 1,
  });
  assert.equal(JSON.stringify(success).includes('private search phrase'), false);

  const limited = createPublicAgentContentTelemetryRecord({
    operation: 'getArticle',
    canonicalUrl: 'https://colinmichaels.com/blog/private-log-value',
  }, {
    authenticated: true,
    durationMs: 500_000,
    errorCode: 'resource-exhausted',
  });
  assert.deepEqual(limited, {
    event: 'public_agent_content_request',
    operation: 'getArticle',
    outcome: 'rate-limited',
    authenticated: true,
    durationMs: 300_000,
    errorCode: 'resource-exhausted',
  });
  assert.equal(JSON.stringify(limited).includes('private-log-value'), false);

  const rejected = createPublicAgentContentTelemetryRecord({operation: 'unknown', query: 'secret'}, {
    authenticated: false,
    durationMs: -10,
    errorCode: 'invalid-argument',
  });
  assert.equal(rejected.operation, 'unknown');
  assert.equal(rejected.outcome, 'rejected');
  assert.equal(rejected.durationMs, 0);
  assert.equal(JSON.stringify(rejected).includes('secret'), false);
});

test('classifies callable errors without logging their messages', () => {
  assert.equal(
    getPublicAgentContentTelemetryErrorCode(new HttpsError('resource-exhausted', 'Do not log this message.')),
    'resource-exhausted',
  );
  assert.equal(getPublicAgentContentTelemetryErrorCode(new Error('Do not log this error.')), 'internal');
});
