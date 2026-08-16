const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {validateTrustedBlogPost} = require('../lib/blog-publishing.js');

const packages = [
  {
    path: '../../docs/CONTENT_PACKAGES/hoverair-aqua-waterproof-drone/hoverair-aqua-waterproof-drone-import.json',
    slug: 'hoverair-aqua-waterproof-drone',
  },
  {
    path: '../../docs/CONTENT_PACKAGES/passenger-drones-for-sale-2026/passenger-drones-for-sale-2026-import.json',
    slug: 'passenger-drones-for-sale-2026',
  },
  {
    path: '../../docs/CONTENT_PACKAGES/temu-mega-drone-seo-refresh/temu-mega-drone-seo-refresh-import.json',
    slug: 'they-bought-a-full-size-temu-mega-drone',
  },
  {
    path: '../../docs/CONTENT_PACKAGES/unitree-r1-4900-humanoid-robot/unitree-r1-4900-humanoid-robot-import.json',
    slug: 'unitree-r1-4900-humanoid-robot',
  },
  {
    path: '../../docs/CONTENT_PACKAGES/laundry-chair-half-dirty-clothes/laundry-chair-half-dirty-clothes-import.json',
    slug: 'laundry-chair-half-dirty-clothes',
  },
  {
    path: '../../docs/CONTENT_PACKAGES/betafpv-95x-v3-over-water-flight-notes/betafpv-95x-v3-over-water-flight-notes-import.json',
    slug: 'betafpv-95x-v3-over-water-flight-notes',
  },
];

for (const fixture of packages) {
  test(`accepts the evidence-ready ${fixture.slug} package at the trusted write boundary`, () => {
    const filePath = path.resolve(__dirname, fixture.path);
    const document = JSON.parse(readFileSync(filePath, 'utf8'));
    assert.equal(document.posts.length, 1);
    assert.equal(document.posts[0].slug, fixture.slug);
    assert.doesNotThrow(() => validateTrustedBlogPost(
      document.posts[0],
      new Date('2026-08-15T16:00:00.000Z'),
      true,
    ));
  });
}

test('keeps the measured Temu traffic leader staged as the automatic homepage feature candidate', () => {
  const filePath = path.resolve(
    __dirname,
    '../../docs/CONTENT_PACKAGES/temu-mega-drone-seo-refresh/temu-mega-drone-seo-refresh-import.json',
  );
  const document = JSON.parse(readFileSync(filePath, 'utf8'));

  assert.equal(document.posts[0].featured, true);
  assert.equal(document.posts[0].slug, 'they-bought-a-full-size-temu-mega-drone');
});
