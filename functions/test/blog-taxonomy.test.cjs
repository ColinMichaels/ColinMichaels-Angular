const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createBlogCategorySlug,
  createBlogCategoryTitle,
  createBlogTagTaxonomyRoute,
  getCanonicalBlogCategoryTerms,
} = require('../lib/blog-taxonomy');

test('consolidates legacy category identities under canonical public archives', () => {
  assert.equal(createBlogCategorySlug('Cat Corner'), 'cats-and-pets');
  assert.equal(createBlogCategorySlug('Cats & Pets'), 'cats-and-pets');
  assert.equal(createBlogCategorySlug('Health'), 'health-and-recovery');
  assert.equal(createBlogCategorySlug('Recovery'), 'health-and-recovery');
  assert.equal(createBlogCategoryTitle('health'), 'Health & Recovery');
});

test('routes overlapping tags to the category that owns the same intent', () => {
  assert.deepEqual(createBlogTagTaxonomyRoute('Recovery'), {
    kind: 'category',
    slug: 'health-and-recovery',
  });
  assert.deepEqual(createBlogTagTaxonomyRoute('Personal Growth'), {
    kind: 'category',
    slug: 'personal-growth',
  });
  assert.deepEqual(createBlogTagTaxonomyRoute('Angular'), {kind: 'tag', slug: 'angular'});
});

test('deduplicates aliases and includes legacy tag-only category membership', () => {
  assert.deepEqual(getCanonicalBlogCategoryTerms({
    categories: ['Cat Corner', 'Cats & Pets', 'Health'],
    subcategories: ['Recovery'],
    tags: ['Personal Growth', 'Recovery'],
  }), ['Cats & Pets', 'Health & Recovery', 'Personal Growth']);
});
