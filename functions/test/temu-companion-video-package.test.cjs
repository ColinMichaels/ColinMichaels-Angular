const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const packageDirectory = path.resolve(
  __dirname,
  '../../docs/CONTENT_PACKAGES/temu-mega-drone-seo-refresh',
);
const videoPackagePath = path.join(packageDirectory, 'CAPTAIN_COLIN_VIDEO_PACKAGE.md');
const importPath = path.join(packageDirectory, 'temu-mega-drone-seo-refresh-import.json');
const thumbnailPath = path.resolve(
  __dirname,
  '../../src/assets/images/blog/drones/temu-mega-drone-youtube-thumbnail.jpg',
);

function readJpegDimensions(buffer) {
  assert.equal(buffer.readUInt16BE(0), 0xffd8, 'thumbnail must be a JPEG');

  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;

  while (offset + 8 < buffer.length) {
    assert.equal(buffer[offset], 0xff, 'invalid JPEG marker');
    while (buffer[offset] === 0xff) {
      offset += 1;
    }

    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0xd9) {
      continue;
    }

    const segmentLength = buffer.readUInt16BE(offset);
    assert.ok(segmentLength >= 2, 'invalid JPEG segment length');

    if (startOfFrameMarkers.has(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }

    offset += segmentLength;
  }

  throw new Error('JPEG dimensions were not found');
}

test('keeps the Temu companion package local, sourced, and rights-bounded', () => {
  const markdown = readFileSync(videoPackagePath, 'utf8');

  assert.match(markdown, /Status: \*\*local production package only\*\*/);
  assert.match(markdown, /No Captain Colin video has been recorded, uploaded, scheduled, or published/);
  assert.match(markdown, /Temu Full-Size Drone: It Flew, but Here's the Catch/);
  assert.match(markdown, /https:\/\/www\.youtube\.com\/watch\?v=bUkvDe0x47A/);
  assert.match(markdown, /https:\/\/www\.ecfr\.gov\/current\/title-14\/chapter-I\/subchapter-F\/part-103/);
  assert.match(markdown, /This package does not make a legal fair-use determination/);
  assert.match(markdown, /add that exact YouTube block to the article with `isCompanionVideo: true`/);
  assert.match(markdown, /do not mark the third-party Goonzquad evidence embed as Colin's companion/);
});

test('does not promote the existing Goonzquad evidence embed to companion status', () => {
  const document = JSON.parse(readFileSync(importPath, 'utf8'));
  const serialized = JSON.stringify(document);

  assert.match(serialized, /bUkvDe0x47A/);
  assert.doesNotMatch(serialized, /isCompanionVideo/);
});

test('ships a standard-size YouTube thumbnail', () => {
  const thumbnail = readFileSync(thumbnailPath);

  assert.deepEqual(readJpegDimensions(thumbnail), {width: 1280, height: 720});
  assert.ok(thumbnail.length < 2 * 1024 * 1024, 'thumbnail must stay below 2 MB');
});
