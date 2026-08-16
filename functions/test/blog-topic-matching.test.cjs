const assert = require('node:assert/strict');
const test = require('node:test');

const {
  scoreBlogPostForTopicHub,
  selectPrimaryBlogTopicHub,
} = require('../lib/blog-topic-matching.js');

function createPost(overrides = {}) {
  return {
    slug: 'angular-routing-notes',
    title: 'Angular routing notes',
    excerpt: 'A practical Firebase publishing walkthrough.',
    categories: ['Architecture'],
    subcategories: [],
    tags: ['TypeScript'],
    ...overrides,
  };
}

test('scores exact taxonomy, tag, title, slug, and excerpt topic context', () => {
  const post = createPost();

  assert.equal(scoreBlogPostForTopicHub(post, {terms: ['architecture']}), 100);
  assert.equal(scoreBlogPostForTopicHub(post, {terms: ['typescript']}), 80);
  assert.equal(scoreBlogPostForTopicHub(post, {terms: ['angular']}), 40);
  assert.equal(scoreBlogPostForTopicHub(post, {terms: ['routing notes']}), 40);
  assert.equal(scoreBlogPostForTopicHub(post, {terms: ['firebase']}), 10);
  assert.equal(scoreBlogPostForTopicHub(post, {terms: ['fire']}), 0);
});

test('selects the strongest topic and returns no incidental fallback', () => {
  const gadgets = {slug: 'gadgets-toys', terms: ['gadget', 'product review']};
  const architecture = {slug: 'angular-firebase-architecture', terms: ['architecture', 'angular']};

  assert.equal(
    selectPrimaryBlogTopicHub(createPost(), [gadgets, architecture])?.slug,
    'angular-firebase-architecture',
  );
  assert.equal(
    selectPrimaryBlogTopicHub(createPost({
      slug: 'bread-recipe',
      title: 'A Weekend Bread Recipe',
      excerpt: 'Flour, water, salt, and time.',
      categories: ['Cooking'],
      tags: ['Recipe'],
    }), [gadgets, architecture]),
    undefined,
  );
});

test('keeps canonical recovery aliases in one topic', () => {
  const post = createPost({categories: ['Health'], tags: ['Recovery']});
  const topic = {slug: 'recovery-planning', terms: ['health and recovery', 'recovery']};

  assert.equal(selectPrimaryBlogTopicHub(post, [topic])?.slug, 'recovery-planning');
});
