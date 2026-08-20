const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const packageDirectory = path.resolve(
  __dirname,
  '../../docs/CONTENT_PACKAGES/captain-colin-channel-refresh',
);
const packagePath = path.join(packageDirectory, 'channel-refresh.json');
const guidePath = path.join(packageDirectory, 'CHANNEL_REFRESH.md');
const bannerPath = path.resolve(
  __dirname,
  '../../src/assets/social/youtube/captain-colin-channel-banner.jpg',
);

function readJpegDimensions(buffer) {
  assert.equal(buffer.readUInt16BE(0), 0xffd8, 'banner must be a JPEG');

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

test('keeps the Captain Colin channel refresh local and reversible', () => {
  const document = JSON.parse(readFileSync(packagePath, 'utf8'));
  const guide = readFileSync(guidePath, 'utf8');

  assert.equal(document.status, 'local-review-only');
  assert.equal(document.channel.channelId, 'UCKZ3E88t-BoUqPgZygJw6bA');
  assert.equal(document.currentPublicSnapshot.trailerVideoId, 'pvXak3YGEjk');
  assert.equal(document.recommended.trailer.status, 'record-before-switch');
  assert.equal(document.recommended.trailer.thirdPartyFootageAllowed, false);
  assert.match(guide, /No YouTube description, link, banner, trailer, playlist, section, video, comment, or Community post has been changed/);
  assert.match(guide, /Do not delete or unlist older videos/);
  assert.match(guide, /## Rollback/);
});

test('keeps the drone package bound to Captain Colin', () => {
  const document = JSON.parse(readFileSync(packagePath, 'utf8'));
  const guide = readFileSync(guidePath, 'utf8');

  assert.equal(document.channel.channelId, 'UCKZ3E88t-BoUqPgZygJw6bA');
  assert.equal(document.secondaryChannelAudit.channelId, 'UCCJMwxuUIb6S4aoZiZeAVeQ');
  assert.notEqual(document.channel.channelId, document.secondaryChannelAudit.channelId);
  assert.equal(
    document.secondaryChannelAudit.decision,
    'do-not-redirect-or-cross-post-without-owner-review',
  );
  assert.match(guide, /Do not redirect the site, duplicate new releases, or apply this drone-specific package to the Colin Michaels channel/);
});

test('uses an HTTPS first-party continuation without identity data', () => {
  const document = JSON.parse(readFileSync(packagePath, 'utf8'));
  const [primaryLink] = document.recommended.profileLinks;

  assert.equal(primaryLink.title, 'Articles, Sources & Field Notes');
  assert.match(primaryLink.url, /^https:\/\/colinmichaels\.com\//);
  assert.match(primaryLink.url, /utm_source=youtube/);
  assert.match(primaryLink.url, /utm_medium=profile/);
  assert.doesNotMatch(primaryLink.url, /user|viewer|account|email/i);
  assert.doesNotMatch(document.recommended.description, /captaincolin\.com/i);
});

test('gates empty series and preserves a truthful evidence promise', () => {
  const document = JSON.parse(readFileSync(packagePath, 'utf8'));
  const sections = document.recommended.homeSections;
  const usefulSeries = sections.find((section) => section.title.startsWith('Is It Actually Useful?'));
  const shorts = sections.find((section) => section.title === 'Shorts');

  assert.equal(usefulSeries.state, 'gate-until-two-public-episodes');
  assert.equal(shorts.state, 'gate-until-three-on-promise-shorts');
  assert.match(document.recommended.description, /Some stories are hands-on\. Some are first-person footage\. Some are research\./);
  assert.doesNotMatch(document.recommended.description, /every (day|week)|daily|weekly upload/i);
});

test('ships a YouTube-compliant channel banner', () => {
  const document = JSON.parse(readFileSync(packagePath, 'utf8'));
  const banner = readFileSync(bannerPath);

  assert.deepEqual(readJpegDimensions(banner), {width: 2560, height: 1440});
  assert.equal(document.recommended.banner.safeAreaWidth, 1546);
  assert.equal(document.recommended.banner.safeAreaHeight, 423);
  assert.ok(banner.length < document.recommended.banner.maxBytes);
});
