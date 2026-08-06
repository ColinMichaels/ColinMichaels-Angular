const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createPublicSubmissionAlertEmail,
  createPublicSubmissionResponseEmail,
  getNextPublicSubmissionStatus,
  parsePublicSubmissionResponseRequest,
  parsePublicSubmissionReviewRequest,
  parseStoredPublicSubmission,
} = require('../lib/public-submission-email.js');

function createStoredContact(overrides = {}) {
  return {
    id: 'submission-1',
    schemaVersion: 1,
    type: 'contact',
    status: 'new',
    submittedAt: '2026-08-05T12:30:00.000Z',
    contact: {
      name: 'Reader Name',
      email: 'reader@example.com',
    },
    inquiry: {
      reason: 'general',
      subject: 'A useful question',
      message: 'This full private message should stay in the protected admin inbox.',
    },
    ...overrides,
  };
}

test('parses stored submission records into the mail-safe contract', () => {
  const parsed = parseStoredPublicSubmission('submission-1', createStoredContact());

  assert.equal(parsed.type, 'contact');
  assert.equal(parsed.status, 'new');
  assert.equal(parsed.contact.email, 'reader@example.com');
  assert.equal(parsed.inquiry.subject, 'A useful question');
});

test('builds an alert with a secure admin link and without the full private message', () => {
  const submission = parseStoredPublicSubmission('submission-1', createStoredContact());
  const email = createPublicSubmissionAlertEmail({
    submission,
    adminUrl: 'https://colinmichaels.com/admin/submissions',
    alertTo: 'colin@colinmichaels.com',
    from: 'ColinMichaels.com <colin@colinmichaels.com>',
    eventId: 'event-1',
  });

  assert.equal(email.replyTo, 'reader@example.com');
  assert.match(email.subject, /New contact message from Reader Name/);
  assert.match(email.text, /submission=submission-1/);
  assert.doesNotMatch(email.text, /full private message/);
  assert.equal(email.messageId, '<submission-alert-event-1@colinmichaels.com>');
});

test('escapes admin-authored response HTML and uses a deterministic message id', () => {
  const submission = parseStoredPublicSubmission('submission-1', createStoredContact());
  const request = parsePublicSubmissionResponseRequest({
    submissionId: 'submission-1',
    requestId: 'request-1',
    subject: 'Re: A useful question',
    message: 'Hello Reader,\n\nThanks for the note. <script>alert(1)</script>',
  });
  const email = createPublicSubmissionResponseEmail({
    submission,
    request,
    from: 'ColinMichaels.com <colin@colinmichaels.com>',
  });

  assert.equal(email.to, 'reader@example.com');
  assert.equal(email.html, [
    '<p>Hello Reader,</p>',
    '<p>Thanks for the note. &lt;script&gt;alert(1)&lt;/script&gt;</p>',
  ].join(''));
  assert.equal(email.messageId, '<submission-response-submission-1-request-1@colinmichaels.com>');
});

test('validates review actions, response headers, and reversible status changes', () => {
  assert.deepEqual(parsePublicSubmissionReviewRequest({
    submissionId: 'submission-1',
    action: 'archive',
  }), {
    submissionId: 'submission-1',
    action: 'archive',
  });
  assert.equal(getNextPublicSubmissionStatus('new', 'start-review'), 'in-review');
  assert.equal(getNextPublicSubmissionStatus('rejected', 'restore'), 'in-review');
  assert.throws(() => getNextPublicSubmissionStatus('responded', 'start-review'), /Only new submissions/);
  assert.throws(() => parsePublicSubmissionResponseRequest({
    submissionId: 'submission-1',
    requestId: 'request-1',
    subject: 'Header\nInjection',
    message: 'This response body is long enough.',
  }), /single line/);
});
