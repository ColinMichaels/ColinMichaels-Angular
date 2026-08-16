const assert = require('node:assert/strict');
const test = require('node:test');

const {renderSeoImageMarkup} = require('../lib/seo-image-markup.js');

test('renders intrinsic dimensions and high fetch priority for crawler hero images', () => {
  assert.equal(
    renderSeoImageMarkup({
      src: 'https://images.example.com/hero.jpg?size=large&crop=wide',
      alt: 'Full-size "passenger drone" on a rural field',
      width: 1200,
      height: 630,
      loading: 'eager',
      fetchPriority: 'high',
    }),
    '<img src="https://images.example.com/hero.jpg?size=large&amp;crop=wide" alt="Full-size &quot;passenger drone&quot; on a rural field" width="1200" height="630" loading="eager" decoding="async" fetchpriority="high">'
  );
});

test('omits incomplete dimensions while preserving lazy-loading markup', () => {
  assert.equal(
    renderSeoImageMarkup({
      src: '/assets/images/story.webp',
      alt: "Colin's story image",
      width: 1600,
      loading: 'lazy',
    }),
    '<img src="/assets/images/story.webp" alt="Colin&#39;s story image" loading="lazy" decoding="async">'
  );
});
