const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const packageDirectory = path.resolve(
  __dirname,
  '../../docs/CONTENT_PACKAGES/hurricane-milton-evergreen-gateway',
);
const packagePath = path.join(packageDirectory, 'youtube-gateway.json');
const guidePath = path.join(packageDirectory, 'YOUTUBE_GATEWAY.md');

function readPackage() {
  return {
    document: JSON.parse(readFileSync(packagePath, 'utf8')),
    guide: readFileSync(guidePath, 'utf8'),
  };
}

test('keeps the Hurricane Milton gateway local and preserves earned history', () => {
  const {document, guide} = readPackage();

  assert.equal(document.status, 'local-review-only');
  assert.ok(Object.values(document.externalActions).every((value) => value === false));
  assert.equal(document.video.channelId, 'UCKZ3E88t-BoUqPgZygJw6bA');
  assert.equal(document.video.videoId, 'CBQ1iMhJLUY');
  assert.equal(
    document.video.currentTitle,
    'Driving through Florida during hurricane Milton is madness',
  );
  assert.equal(document.video.preserveTitle, true);
  assert.equal(document.video.preserveVideoId, true);
  assert.equal(document.rollback.deleteOrUnlistVideo, false);
  assert.equal(document.rollback.reuploadVideo, false);
  assert.match(guide, /No YouTube title, description, thumbnail, chapter, card, end screen, playlist, comment, reply, like, heart, or channel setting has been changed/);
  assert.match(guide, /do not delete, unlist, re-upload, or reset the video's history/i);
});

test('corrects the unsupported tornado claim with transcript-grounded chapters', () => {
  const {document} = readPackage();
  const chapters = document.recommended.chapters;

  assert.equal(document.publicSnapshot.views, 14920);
  assert.equal(document.publicSnapshot.likes, 158);
  assert.equal(document.publicSnapshot.comments, 6);
  assert.equal(document.publicSnapshot.channelSubscribers, 602);
  assert.match(document.publicSnapshot.description, /tornados firsthand/i);
  assert.doesNotMatch(document.recommended.description, /tornados? firsthand/i);
  assert.match(document.recommended.description, /not footage of a tornado/i);
  assert.equal(document.accuracyBoundary.filmedTornado, false);
  assert.equal(document.accuracyBoundary.tornadoWarningInAudio, true);
  assert.ok(chapters.length >= 10);
  assert.equal(chapters[0].seconds, 0);
  assert.ok(
    chapters.every((chapter, index) => (
      index === 0 || chapter.seconds > chapters[index - 1].seconds
    )),
    'chapter timestamps must be strictly ascending',
  );
  assert.ok(chapters.at(-1).seconds < document.video.durationSeconds);
  assert.deepEqual(
    chapters.find((chapter) => chapter.seconds === 319),
    {seconds: 319, label: 'Emergency tornado warning'},
  );
});

test('uses official safety starting points and privacy-bounded continuation', () => {
  const {document} = readPackage();
  const urls = document.recommended.officialSafetyUrls;
  const websiteUrl = new URL(document.recommended.continuation.websiteUrl);

  assert.deepEqual(urls, [
    'https://www.weather.gov/safety/hurricane',
    'https://www.floridadisaster.org/planprepare/',
  ]);
  assert.equal(websiteUrl.protocol, 'https:');
  assert.equal(websiteUrl.hostname, 'colinmichaels.com');
  assert.equal(websiteUrl.searchParams.get('utm_source'), 'youtube');
  assert.equal(websiteUrl.searchParams.get('utm_medium'), 'video_description');
  assert.equal(websiteUrl.searchParams.get('utm_campaign'), 'hurricane_milton_gateway');
  assert.equal(websiteUrl.searchParams.get('utm_content'), 'cbq1imhjluy');
  assert.doesNotMatch(websiteUrl.search, /user|viewer|account|email/i);
  assert.equal(document.recommended.continuation.videoId, 'aiA2hlRcVpk');
});

test('requires an honest source-frame thumbnail without claiming a finished asset', () => {
  const {document, guide} = readPackage();
  const thumbnail = document.recommended.thumbnail;

  assert.equal(thumbnail.status, 'source-frame-export-required');
  assert.deepEqual(
    {width: thumbnail.width, height: thumbnail.height},
    {width: 1280, height: 720},
  );
  assert.equal(thumbnail.actualVideoFramesRequired, true);
  assert.equal(thumbnail.syntheticMediaAllowed, false);
  assert.equal(Object.hasOwn(thumbnail, 'assetPath'), false);
  assert.match(guide, /Do not generate another storm scene/);
  assert.match(guide, /this package does not pretend a finished replacement exists/i);
});

test('keeps audience care manual and the optional archive Short outside the launch gate', () => {
  const {document, guide} = readPackage();

  assert.equal(document.recommended.pinnedComment.state, 'not-posted');
  assert.ok(
    document.recommended.commentReplies.every((reply) => reply.state === 'not-posted'),
  );
  assert.equal(document.recommended.optionalShort.state, 'source-master-required');
  assert.equal(document.recommended.optionalShort.countsTowardMainShortsRow, false);
  assert.equal(document.measurement.minimumComparisonDays, 28);
  assert.match(guide, /## Controlled Rollout/);
  assert.match(guide, /## Rollback/);
});
