const assert = require('node:assert/strict');
const test = require('node:test');

const {createBlogFeedItemUrl} = require('../lib/blog-feed-url.js');

const SITE_URL = 'https://colinmichaels.com';

test('normalizes relative canonical paths to absolute feed item URLs', () => {
  assert.equal(
    createBlogFeedItemUrl('/blog/relative-canonical', 'fallback-slug', SITE_URL),
    'https://colinmichaels.com/blog/relative-canonical'
  );
  assert.equal(
    createBlogFeedItemUrl('blog/relative-without-slash', 'fallback-slug', SITE_URL),
    'https://colinmichaels.com/blog/relative-without-slash'
  );
});

test('preserves valid absolute internal and external canonical URLs', () => {
  assert.equal(
    createBlogFeedItemUrl('https://colinmichaels.com/blog/absolute-canonical', 'fallback-slug', SITE_URL),
    'https://colinmichaels.com/blog/absolute-canonical'
  );
  assert.equal(
    createBlogFeedItemUrl('https://publisher.example/original-story', 'fallback-slug', SITE_URL),
    'https://publisher.example/original-story'
  );
});

test('falls back to the absolute post route when the canonical is missing', () => {
  assert.equal(
    createBlogFeedItemUrl('', 'fallback-slug', SITE_URL),
    'https://colinmichaels.com/blog/fallback-slug'
  );
  assert.equal(
    createBlogFeedItemUrl('   ', '/fallback-slug', SITE_URL),
    'https://colinmichaels.com/blog/fallback-slug'
  );
});

test('falls back to the post route for malformed and non-HTTP canonical values', () => {
  assert.equal(
    createBlogFeedItemUrl('http://[broken', 'safe-fallback', SITE_URL),
    'https://colinmichaels.com/blog/safe-fallback'
  );
  assert.equal(
    createBlogFeedItemUrl('javascript:alert(1)', 'safe-fallback', SITE_URL),
    'https://colinmichaels.com/blog/safe-fallback'
  );
  assert.equal(
    createBlogFeedItemUrl('data:text/html,unsafe', 'safe-fallback', SITE_URL),
    'https://colinmichaels.com/blog/safe-fallback'
  );
});
