const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getLargestJpegVariantUrl,
  getManagedMediaIdFromWebpUrl,
} = require('../lib/open-graph-image.js');

const mediaId = '019fc788-730b-7982-91c8-055dcdb1a8bf';

test('identifies a finalized Firebase Storage WebP media URL', () => {
  assert.equal(
    getManagedMediaIdFromWebpUrl(
      `https://firebasestorage.googleapis.com/v0/b/colinmichaels.appspot.com/o/cms%2Fblog-media%2Fstory%2Fopen-graph%2F${mediaId}%2F1600w.webp?alt=media&token=webp-token`
    ),
    mediaId
  );
});

test('rejects non-finalized and non-Firebase WebP URLs', () => {
  assert.equal(getManagedMediaIdFromWebpUrl('https://cdn.example.com/story.webp'), null);
  assert.equal(
    getManagedMediaIdFromWebpUrl(
      `https://firebasestorage.googleapis.com/v0/b/colinmichaels.appspot.com/o/cms%2Fblog-media%2Fstory%2Fopen-graph%2F${mediaId}%2F1600w.jpg?alt=media&token=jpeg-token`
    ),
    null
  );
});

test('selects the widest trusted JPEG sibling from a finalized media result', () => {
  assert.equal(getLargestJpegVariantUrl({
    variants: [
      {format: 'webp', width: 1600, url: 'https://firebasestorage.googleapis.com/final.webp'},
      {format: 'jpeg', width: 960, url: 'https://firebasestorage.googleapis.com/final-960.jpg'},
      {contentType: 'image/jpeg', width: 1600, url: 'https://firebasestorage.googleapis.com/final-1600.jpg'},
    ],
  }), 'https://firebasestorage.googleapis.com/final-1600.jpg');
});

test('does not accept malformed or non-HTTPS stored JPEG variant URLs', () => {
  assert.equal(getLargestJpegVariantUrl({
    variants: [
      {format: 'jpeg', width: 1600, url: 'javascript:alert(1)'},
      {format: 'jpeg', width: 960, url: 'http://cdn.example.com/unsafe.jpg'},
    ],
  }), null);
});
