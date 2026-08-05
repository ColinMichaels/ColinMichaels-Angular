const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createPublicSubmissionRateLimitIdentity,
  parsePublicSubmission,
} = require('../lib/public-submissions.js');

function createContact(overrides = {}) {
  return {
    type: 'contact',
    name: 'Reader Name',
    email: 'reader@example.com',
    reason: 'general',
    subject: 'A useful question',
    message: 'This is a complete contact message for the site owner.',
    privacyConsent: true,
    company: '',
    ...overrides,
  };
}

function createAuthorPitch(overrides = {}) {
  return {
    type: 'author-pitch',
    name: 'Writer Name',
    email: 'writer@example.com',
    creditName: 'Writer Name',
    location: 'Jupiter, Florida',
    profileWebsite: 'https://writer.example.com',
    currentRole: 'Independent writer',
    shortBio: 'I write practical stories grounded in first-hand experience and careful research.',
    topics: 'Recovery and technology',
    proposedTitle: 'A practical post proposal',
    pitch: 'This proposal explains a useful reader problem, the first-hand perspective behind it, and the sources that would support a careful article.',
    references: 'A first-hand interview and https://example.com/reference',
    publishingHistory: 'Newsletter and https://example.com/portfolio',
    creditDetails: 'Use the supplied byline and website.',
    originalWorkConfirmation: true,
    privacyConsent: true,
    company: '',
    ...overrides,
  };
}

test('parses and normalizes a bounded contact submission', () => {
  const parsed = parsePublicSubmission(createContact({email: ' READER@EXAMPLE.COM '}));

  assert.equal(parsed.type, 'contact');
  assert.equal(parsed.isSpam, false);
  assert.deepEqual(parsed.submission.contact, {
    name: 'Reader Name',
    email: 'reader@example.com',
  });
  assert.equal(parsed.submission.inquiry.reason, 'general');
});

test('keeps author credit and post proposal data separate', () => {
  const parsed = parsePublicSubmission(createAuthorPitch());

  assert.equal(parsed.type, 'author-pitch');
  assert.equal(parsed.submission.authorProfile.creditName, 'Writer Name');
  assert.equal(parsed.submission.authorProfile.profileWebsite, 'https://writer.example.com/');
  assert.equal(parsed.submission.proposal.proposedTitle, 'A practical post proposal');
  assert.equal(parsed.submission.originalWorkConfirmed, true);
});

test('rejects invalid contact and author contracts', () => {
  assert.throws(() => parsePublicSubmission(createContact({email: 'not-an-email'})), /valid email/i);
  assert.throws(() => parsePublicSubmission(createContact({unexpected: true})), /unsupported fields/i);
  assert.throws(
    () => parsePublicSubmission(createAuthorPitch({profileWebsite: 'javascript:alert(1)'})),
    /HTTP or HTTPS/i
  );
  assert.throws(
    () => parsePublicSubmission(createAuthorPitch({originalWorkConfirmation: false})),
    /original-work/i
  );
});

test('silently accepts honeypot submissions without producing review content', () => {
  const parsed = parsePublicSubmission(createContact({company: 'Spam Incorporated'}));

  assert.equal(parsed.isSpam, true);
  assert.deepEqual(parsed.submission, {});
});

test('creates a stable opaque rate-limit identity', () => {
  const identity = createPublicSubmissionRateLimitIdentity('user-1', '203.0.113.25');

  assert.equal(identity, createPublicSubmissionRateLimitIdentity('user-1', '203.0.113.25'));
  assert.match(identity, /^[a-f0-9]{64}$/);
  assert.equal(identity.includes('203.0.113.25'), false);
});
