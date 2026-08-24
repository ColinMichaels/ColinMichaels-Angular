const assert = require('node:assert/strict');
const test = require('node:test');

const {
  detectTrustedImageMimeType,
  getBlogMediaVariantFormats,
  getResponsiveVariantWidths,
} = require('../lib/blog-media.js');

test('detects supported image signatures independently of declared metadata', () => {
  assert.equal(detectTrustedImageMimeType(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(detectTrustedImageMimeType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
  assert.equal(detectTrustedImageMimeType(Buffer.from('RIFF0000WEBP')), 'image/webp');
  assert.equal(detectTrustedImageMimeType(Buffer.from('GIF89a')), 'image/gif');
  assert.equal(detectTrustedImageMimeType(Buffer.from([0, 0, 0, 0, ...Buffer.from('ftypavif')])), 'image/avif');
  assert.equal(detectTrustedImageMimeType(Buffer.from('<svg><script>alert(1)</script></svg>')), null);
});

test('creates bounded responsive widths without enlargement or duplicates', () => {
  assert.deepEqual(getResponsiveVariantWidths(320), [320]);
  assert.deepEqual(getResponsiveVariantWidths(960), [480, 960]);
  assert.deepEqual(getResponsiveVariantWidths(2400), [480, 960, 1600]);
  assert.deepEqual(getResponsiveVariantWidths(0), []);
});

test('keeps Open Graph uploads JPEG-only while retaining responsive web formats elsewhere', () => {
  assert.deepEqual(getBlogMediaVariantFormats('open-graph'), ['jpeg']);
  assert.deepEqual(getBlogMediaVariantFormats('cover'), ['avif', 'webp', 'jpeg']);
  assert.deepEqual(getBlogMediaVariantFormats('editor-image'), ['avif', 'webp', 'jpeg']);
});
