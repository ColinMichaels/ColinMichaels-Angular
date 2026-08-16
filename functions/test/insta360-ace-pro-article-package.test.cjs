const assert = require('node:assert/strict');
const {existsSync, readFileSync} = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const sharp = require('sharp');

const rootDirectory = path.resolve(__dirname, '../..');
const packageDirectory = path.join(
  rootDirectory,
  'docs/CONTENT_PACKAGES/insta360-ace-pro-fpv-sunset-test',
);
const importPath = path.join(
  packageDirectory,
  'insta360-ace-pro-fpv-sunset-test-import.json',
);
const guidePath = path.join(packageDirectory, 'POST_PACKAGE.md');

function readPackage() {
  const document = JSON.parse(readFileSync(importPath, 'utf8'));
  return {
    document,
    post: document.posts[0],
    guide: readFileSync(guidePath, 'utf8'),
  };
}

test('keeps the Ace Pro article as one explicit local draft', () => {
  const {document, post, guide} = readPackage();

  assert.equal(document.version, 1);
  assert.equal(document.source, 'colinmichaels-cms');
  assert.equal(document.collection, 'posts');
  assert.equal(document.totalPosts, 1);
  assert.equal(document.posts.length, 1);
  assert.equal(post.id, 'insta360-ace-pro-fpv-sunset-test');
  assert.equal(post.slug, 'insta360-ace-pro-fpv-sunset-test');
  assert.equal(post.status, 'draft');
  assert.equal(post.publishedAt, null);
  assert.equal(
    post.seo.canonical,
    'https://colinmichaels.com/blog/insta360-ace-pro-fpv-sunset-test',
  );
  assert.match(guide, /complete local draft package only/i);
  assert.match(guide, /has not been imported into the CMS, saved to Firebase/i);
  assert.match(guide, /must not link to this draft yet/i);
});

test('preserves the hands-on record without claiming a controlled review', () => {
  const {post, guide} = readPackage();
  const body = JSON.stringify(post.blocks);

  assert.equal(post.editorial.evidenceBasis, 'mixed');
  assert.equal(post.editorial.sourceReviewedAt, '2026-08-15');
  assert.match(post.editorial.evidenceSummary, /does not claim a controlled comparison or final review/i);
  assert.match(post.editorial.relationshipDisclosure, /Colin must confirm/i);
  assert.match(post.editorial.syntheticMediaDisclosure, /no generative editing/i);
  assert.match(body, /hands-on first flight/i);
  assert.match(body, /not a laboratory review/i);
  assert.match(body, /did not preserve every stabilization/i);
  assert.match(body, /I am not sure whether it was on/i);
  assert.match(body, /no mounted weight is recorded/i);
  assert.doesNotMatch(body, /best action camera|game.?changer|scientifically proven/i);
  assert.match(guide, /The article does not turn an old first flight into a new final review/i);
});

test('uses one exact companion video, first-party source frames, and distinct assets', async () => {
  const {post} = readPackage();
  const companionVideos = post.blocks.filter(
    (block) => block.type === 'embed' && block.data.isCompanionVideo === true,
  );
  const inlineImages = post.blocks.filter((block) => block.type === 'image');

  assert.equal(companionVideos.length, 1);
  assert.equal(companionVideos[0].data.provider, 'youtube');
  assert.equal(
    companionVideos[0].data.url,
    'https://www.youtube.com/watch?v=OFeCTH2LP9s',
  );
  assert.equal(
    companionVideos[0].data.embedUrl,
    'https://www.youtube.com/embed/OFeCTH2LP9s',
  );
  assert.equal(
    companionVideos[0].data.videoTitle,
    'Camera ‘sham’ era! Insta360 Ace Pro First Reaction and FPV Flights video',
  );
  assert.equal(companionVideos[0].data.videoUploadDate, '2023-12-13');
  assert.equal(companionVideos[0].data.videoDurationSeconds, 609);
  assert.match(companionVideos[0].data.videoDescription, /exhilarating adventure/i);
  assert.equal(inlineImages.length, 3);
  assert.equal(new Set(inlineImages.map((block) => block.data.url)).size, 3);

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

test('answers audience questions with official sources and a useful retest checklist', () => {
  const {post} = readPackage();
  const body = JSON.stringify(post.blocks);
  const retest = post.blocks.find((block) => block.id === 'retest-steps-01');
  const poll = post.blocks.find((block) => block.id === 'poll-retest-priority');

  assert.match(
    body,
    /https:\/\/onlinemanual\.insta360\.com\/ace\/en-us\/specs\/hardware\/photo-video/,
  );
  assert.match(body, /https:\/\/www\.faa\.gov\/uas\/recreational_flyers/);
  assert.match(body, /4K30 Active HDR/);
  assert.match(body, /4K30 PureVideo/);
  assert.equal(retest.type, 'list');
  assert.equal(retest.data.listStyle, 'ordered');
  assert.equal(retest.data.listPresentation, 'steps');
  assert.ok(retest.data.items.length >= 8);
  assert.equal(poll.type, 'poll');
  assert.equal(poll.data.pollOptions.length, 4);
  assert.equal(poll.data.pollResultsVisibility, 'afterVote');
  assert.doesNotMatch(JSON.stringify(poll), /email|account|diagnosis|address/i);
});

test('keeps block identity and reciprocal publication gates deterministic', () => {
  const {post, guide} = readPackage();
  const blockIds = post.blocks.map((block) => block.id);

  assert.equal(new Set(blockIds).size, blockIds.length);
  assert.match(
    guide,
    /the exact canonical returns public `200` with matching title, canonical, cover, companion embed, and disclosures/i,
  );
  assert.match(guide, /Production Preview before any YouTube reciprocal link/i);
  assert.match(guide, /never delete, unlist, or re-upload the source video/i);
});
