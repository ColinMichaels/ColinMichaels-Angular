const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const test = require('node:test');

const firebaseConfig = JSON.parse(
  readFileSync(resolve(__dirname, '../../firebase.json'), 'utf8')
);

test('permanently redirects exact legacy blog and taxonomy URLs', () => {
  const blogRedirects = firebaseConfig.hosting.redirects.filter(rule => (
    typeof rule.source === 'string' && rule.source.startsWith('/blog')
  ));

  assert.deepEqual(blogRedirects, [
    {
      source: '/blog/',
      destination: '/blog',
      type: 301,
    },
    {
      source: '/blog/category/cat-corner',
      destination: '/blog/category/cats-and-pets',
      type: 301,
    },
    {
      source: '/blog/category/health',
      destination: '/blog/category/health-and-recovery',
      type: 301,
    },
    {
      source: '/blog/category/recovery',
      destination: '/blog/category/health-and-recovery',
      type: 301,
    },
    {
      source: '/blog/tag/recovery',
      destination: '/blog/category/health-and-recovery',
      type: 301,
    },
    {
      source: '/blog/tag/personal-growth',
      destination: '/blog/category/personal-growth',
      type: 301,
    },
  ]);
});

test('does not create configured redirect loops at canonical blog URLs', () => {
  const redirectSources = new Set(
    firebaseConfig.hosting.redirects.map(rule => rule.source).filter(Boolean)
  );

  assert.equal(redirectSources.has('/blog'), false);
  assert.equal(redirectSources.has('/blog/category/cats-and-pets'), false);
  assert.equal(redirectSources.has('/blog/category/health-and-recovery'), false);
  assert.equal(redirectSources.has('/blog/category/personal-growth'), false);
});
