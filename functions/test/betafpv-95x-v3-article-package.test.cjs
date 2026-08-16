const assert = require('node:assert/strict');
const {existsSync, readFileSync} = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const sharp = require('sharp');

const rootDirectory = path.resolve(__dirname, '../..');
const packageDirectory = path.join(
  rootDirectory,
  'docs/CONTENT_PACKAGES/betafpv-95x-v3-over-water-flight-notes',
);
const importPath = path.join(
  packageDirectory,
  'betafpv-95x-v3-over-water-flight-notes-import.json',
);
const guidePath = path.join(packageDirectory, 'POST_PACKAGE.md');
const youtubePath = path.join(packageDirectory, 'youtube-gateway.json');
const youtubeGuidePath = path.join(packageDirectory, 'YOUTUBE_GATEWAY.md');

function readPackage() {
  const document = JSON.parse(readFileSync(importPath, 'utf8'));
  return {
    document,
    post: document.posts[0],
    guide: readFileSync(guidePath, 'utf8'),
    youtube: JSON.parse(readFileSync(youtubePath, 'utf8')),
    youtubeGuide: readFileSync(youtubeGuidePath, 'utf8'),
  };
}

test('keeps the BetaFPV article and gateway local and reversible', () => {
  const {document, post, guide, youtube, youtubeGuide} = readPackage();

  assert.equal(document.version, 1);
  assert.equal(document.totalPosts, 1);
  assert.equal(post.id, 'betafpv-95x-v3-over-water-flight-notes');
  assert.equal(post.slug, 'betafpv-95x-v3-over-water-flight-notes');
  assert.equal(post.status, 'draft');
  assert.equal(post.publishedAt, null);
  assert.equal(
    post.seo.canonical,
    'https://colinmichaels.com/blog/betafpv-95x-v3-over-water-flight-notes',
  );
  assert.equal(youtube.status, 'local-review-only');
  assert.ok(Object.values(youtube.externalActions).every((value) => value === false));
  assert.match(guide, /has not been imported into the CMS, saved to Firebase/i);
  assert.match(youtubeGuide, /No YouTube title, description, thumbnail/i);
  assert.match(youtubeGuide, /Never delete, unlist, or re-upload/i);
});

test('uses one exact companion video and preserves the supported reply-derived record', () => {
  const {post, youtube} = readPackage();
  const body = JSON.stringify(post.blocks);
  const companionVideos = post.blocks.filter(
    (block) => block.type === 'embed' && block.data.isCompanionVideo === true,
  );

  assert.equal(companionVideos.length, 1);
  assert.equal(companionVideos[0].data.url, 'https://www.youtube.com/watch?v=IJjZir1qM1Y');
  assert.equal(companionVideos[0].data.embedUrl, 'https://www.youtube.com/embed/IJjZir1qM1Y');
  assert.equal(
    companionVideos[0].data.videoTitle,
    'BetaFpv 95x V3 - Over Water Cinematic Insta360 4K SMO',
  );
  assert.equal(companionVideos[0].data.videoUploadDate, '2021-01-02');
  assert.equal(companionVideos[0].data.videoDurationSeconds, 387);
  assert.match(body, /ISO at 100/i);
  assert.match(body, /450mAh 4S/i);
  assert.match(body, /2\.5-3 minutes/i);
  assert.match(body, /VelociDrone/i);
  assert.equal(youtube.accuracyBoundary.replyDerivedDetails.iso, 100);
  assert.equal(youtube.accuracyBoundary.replyDerivedDetails.battery, '450mAh 4S');
});

test('does not inflate an archive flight into a review, range, waterproofing, or legal claim', () => {
  const {post, guide, youtube} = readPackage();
  const body = JSON.stringify(post.blocks);

  assert.equal(post.editorial.evidenceBasis, 'mixed');
  assert.equal(post.editorial.sourceReviewedAt, '2026-08-15');
  assert.match(post.editorial.evidenceSummary, /does not claim a definitive review/i);
  assert.match(body, /not a controlled product review or long-range test/i);
  assert.match(body, /not flight instruction, legal advice, airspace authorization/i);
  assert.match(body, /do not copy an old over-water route/i);
  assert.doesNotMatch(body, /waterproof drone|scientifically proven|best cinewhoop|guaranteed range/i);
  assert.equal(youtube.accuracyBoundary.controlledReview, false);
  assert.equal(youtube.accuracyBoundary.rangeTest, false);
  assert.equal(youtube.accuracyBoundary.waterproofingDemonstration, false);
  assert.match(guide, /makes no retrospective legal determination/i);
});

test('labels every generated article image and preserves the expected files', async () => {
  const {post, guide, youtube} = readPackage();
  const inlineImages = post.blocks.filter((block) => block.type === 'image');

  assert.equal(inlineImages.length, 2);
  assert.match(post.editorial.syntheticMediaDisclosure, /AI-generated editorial illustrations/i);
  assert.ok(inlineImages.every((block) => /AI-generated editorial/i.test(block.data.caption)));
  assert.ok(inlineImages.every((block) => /AI-generated editorial/i.test(block.data.alt)));
  assert.match(guide, /not documentary frames, exact product depictions, maps, test results/i);
  assert.equal(youtube.recommended.thumbnail.syntheticMediaAllowed, false);

  const assetExpectations = new Map([
    [post.coverImage, {width: 1200, height: 675, format: 'webp'}],
    [post.thumbnailImage, {width: 1200, height: 1200, format: 'webp'}],
    [post.seo.openGraphImage, {width: 1200, height: 630, format: 'jpeg'}],
    ...inlineImages.map((block) => [
      block.data.url,
      {width: block.data.width, height: block.data.height, format: 'webp'},
    ]),
  ]);

  for (const [assetUrl, expected] of assetExpectations) {
    const assetPath = path.join(rootDirectory, 'src', assetUrl);
    assert.equal(existsSync(assetPath), true, `${assetUrl} must exist`);
    const metadata = await sharp(assetPath).metadata();
    assert.deepEqual(
      {width: metadata.width, height: metadata.height, format: metadata.format},
      expected,
      `${assetUrl} must preserve its expected crop and format`,
    );
  }
});

test('uses official sources, a concrete retest, and no invented YouTube chapters', () => {
  const {post, youtube, youtubeGuide} = readPackage();
  const body = JSON.stringify(post.blocks);
  const retest = post.blocks.find((block) => block.id === 'retest-steps-01');
  const poll = post.blocks.find((block) => block.id === 'poll-retest-priority');
  const blockIds = post.blocks.map((block) => block.id);

  assert.match(body, /https:\/\/betafpv\.com\/collections\/brushless-frame\/products\/beta95x-v3-frame-kit/);
  assert.match(body, /https:\/\/support\.betafpv\.com\/hc\/en-us\/articles\/900004646103-CLI-for-Beta95X-V3/);
  assert.match(body, /https:\/\/www\.faa\.gov\/uas\/recreational_flyers/);
  assert.match(body, /https:\/\/www\.faa\.gov\/uas\/getting_started\/where_can_i_fly/);
  assert.equal(retest.data.listStyle, 'ordered');
  assert.equal(retest.data.listPresentation, 'steps');
  assert.ok(retest.data.items.length >= 9);
  assert.equal(poll.data.pollOptions.length, 4);
  assert.equal(poll.data.pollResultsVisibility, 'afterVote');
  assert.equal(new Set(blockIds).size, blockIds.length);
  assert.deepEqual(youtube.recommended.chapters, []);
  assert.match(youtube.recommended.chapterBoundary, /do not invent timestamps/i);
  assert.match(youtubeGuide, /Do not invent timestamps/i);
  assert.doesNotMatch(JSON.stringify(poll), /email|account|address|location/i);
});
