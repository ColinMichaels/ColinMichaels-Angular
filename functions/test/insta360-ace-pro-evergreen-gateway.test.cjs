const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const packagesDirectory = path.resolve(__dirname, '../../docs/CONTENT_PACKAGES');
const scorecardPath = path.join(
  packagesDirectory,
  'captain-colin-archive-gateways/archive-candidate-scorecard.json',
);
const scorecardGuidePath = path.join(
  packagesDirectory,
  'captain-colin-archive-gateways/ARCHIVE_GATEWAY_SCORECARD.md',
);
const gatewayPath = path.join(
  packagesDirectory,
  'insta360-ace-pro-fpv-evergreen-gateway/youtube-gateway.json',
);
const gatewayGuidePath = path.join(
  packagesDirectory,
  'insta360-ace-pro-fpv-evergreen-gateway/YOUTUBE_GATEWAY.md',
);

function readPackage() {
  return {
    scorecard: JSON.parse(readFileSync(scorecardPath, 'utf8')),
    scorecardGuide: readFileSync(scorecardGuidePath, 'utf8'),
    gateway: JSON.parse(readFileSync(gatewayPath, 'utf8')),
    gatewayGuide: readFileSync(gatewayGuidePath, 'utf8'),
  };
}

test('selects the archive gateway with a deterministic evidence-weighted score', () => {
  const {scorecard, scorecardGuide} = readPackage();
  const selected = scorecard.candidates.find(
    (candidate) => candidate.videoId === scorecard.selectedVideoId,
  );

  assert.equal(scorecard.status, 'local-review-only');
  assert.equal(scorecard.selectedVideoId, 'OFeCTH2LP9s');
  assert.equal(selected.decision, 'selected');

  for (const candidate of scorecard.candidates) {
    const calculatedTotal = Object.entries(scorecard.weights).reduce(
      (total, [dimension, weight]) => total + candidate.scores[dimension] * weight,
      0,
    );
    assert.equal(candidate.weightedTotal, calculatedTotal);
    assert.ok(
      Object.values(candidate.scores).every(
        (score) => score >= scorecard.scale.minimum && score <= scorecard.scale.maximum,
      ),
    );
  }

  assert.equal(
    selected.weightedTotal,
    Math.max(...scorecard.candidates.map((candidate) => candidate.weightedTotal)),
  );
  assert.match(scorecardGuide, /Raw views do not choose the winner/);
  assert.match(scorecardGuide, /Hurricane Wilma clip does not win merely because it is largest/i);
  assert.ok(Object.values(scorecard.externalActions).every((value) => value === false));
});

test('keeps the Ace Pro package local and preserves earned video history', () => {
  const {gateway, gatewayGuide} = readPackage();

  assert.equal(gateway.status, 'local-review-only');
  assert.ok(Object.values(gateway.externalActions).every((value) => value === false));
  assert.equal(gateway.video.channelId, 'UCKZ3E88t-BoUqPgZygJw6bA');
  assert.equal(gateway.video.videoId, 'OFeCTH2LP9s');
  assert.equal(gateway.video.preserveVideoId, true);
  assert.equal(gateway.video.preservePublicationHistory, true);
  assert.equal(gateway.rollback.deleteOrUnlistVideo, false);
  assert.equal(gateway.rollback.reuploadVideo, false);
  assert.match(gatewayGuide, /No YouTube title, description, thumbnail, chapter, card, end screen, playlist, comment, reply, like, heart, or channel setting has been changed/);
  assert.match(gatewayGuide, /Do not delete, unlist, re-upload, or reset the video's earned history/i);
});

test('describes a hands-on field test without upgrading it into a controlled review', () => {
  const {gateway} = readPackage();
  const boundary = gateway.accuracyBoundary;
  const chapters = gateway.recommended.chapters;

  assert.equal(gateway.publicSnapshot.views, 2328);
  assert.equal(gateway.publicSnapshot.likes, 70);
  assert.equal(gateway.publicSnapshot.comments, 30);
  assert.equal(boundary.handsOn, true);
  assert.equal(boundary.firstFlightFieldTest, true);
  assert.equal(boundary.controlledComparison, false);
  assert.equal(boundary.finalReview, false);
  assert.equal(boundary.exactSettingsFullyDocumented, false);
  assert.equal(boundary.stabilizationSettingConfirmed, false);
  assert.equal(boundary.retrospectiveFlightComplianceDetermination, false);
  assert.match(gateway.recommended.title, /^Insta360 Ace Pro FPV Test:/);
  assert.doesNotMatch(gateway.recommended.title, /best|winner|review|game.?changer/i);
  assert.match(gateway.recommended.description, /not a controlled camera comparison or final review/i);
  assert.match(gateway.recommended.description, /did not preserve every setting clearly enough/i);
  assert.equal(chapters[0].seconds, 0);
  assert.ok(chapters.length >= 8);
  assert.ok(
    chapters.every((chapter, index) => (
      index === 0 || chapter.seconds > chapters[index - 1].seconds
    )),
  );
  assert.ok(chapters.at(-1).seconds < gateway.video.durationSeconds);
});

test('uses privacy-bounded continuation and primary official references', () => {
  const {gateway} = readPackage();
  const continuation = gateway.recommended.continuation;

  assert.equal(continuation.nextVideoId, 'IJjZir1qM1Y');
  assert.equal(
    continuation.playlist,
    'Captain Colin Flies | FPV & Drone Flights',
  );
  assert.deepEqual(gateway.recommended.officialReferences, [
    'https://onlinemanual.insta360.com/ace/en-us/specs/hardware/photo-video',
    'https://www.faa.gov/uas/recreational_flyers',
  ]);

  for (const rawUrl of continuation.websiteUrls) {
    const url = new URL(rawUrl);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'colinmichaels.com');
    assert.equal(url.searchParams.get('utm_source'), 'youtube');
    assert.equal(url.searchParams.get('utm_medium'), 'video_description');
    assert.equal(url.searchParams.get('utm_campaign'), 'ace_pro_fpv_gateway');
    assert.match(url.searchParams.get('utm_content'), /^ofecth2lp9s_/);
    assert.doesNotMatch(url.search, /user|viewer|account|email|comment|search/i);
  }
});

test('keeps thumbnail and audience actions honest, staged, and reversible', () => {
  const {gateway, gatewayGuide} = readPackage();
  const thumbnail = gateway.recommended.thumbnail;

  assert.equal(thumbnail.status, 'source-frame-export-required');
  assert.equal(thumbnail.changeOnlyAfterStudioBaseline, true);
  assert.equal(thumbnail.actualVideoFramesRequired, true);
  assert.equal(thumbnail.syntheticMediaAllowed, false);
  assert.equal(Object.hasOwn(thumbnail, 'assetPath'), false);
  assert.equal(gateway.recommended.pinnedComment.state, 'not-posted');
  assert.ok(
    gateway.recommended.commentReplies.every((reply) => reply.state === 'not-posted'),
  );
  assert.equal(gateway.rollout.changeOneMeasuredSurfaceAtATime, true);
  assert.equal(gateway.measurement.minimumComparisonDays, 28);
  assert.match(gatewayGuide, /does not claim a finished thumbnail exists/i);
  assert.match(gatewayGuide, /Do not bulk-reply, auto-like, auto-heart, guess at old settings/i);
  assert.match(gatewayGuide, /Do not change the description, title, thumbnail, end screen, and comments in one unmeasured moment/i);
});
