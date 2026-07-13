const assert = require('node:assert/strict');
const test = require('node:test');

const {reconcileSocialAnnouncementStatus} = require('../lib/social-delivery');

test('existing outbox lifecycle wins over a stale scheduled announcement', () => {
  assert.equal(reconcileSocialAnnouncementStatus('pending'), 'queued');
  assert.equal(reconcileSocialAnnouncementStatus('processing'), 'queued');
  assert.equal(reconcileSocialAnnouncementStatus('posted'), 'posted');
  assert.equal(reconcileSocialAnnouncementStatus('failed'), 'failed');
  assert.equal(reconcileSocialAnnouncementStatus('cancelled'), 'cancelled');
});

test('unknown existing states remain non-deliverable from the source announcement', () => {
  assert.equal(reconcileSocialAnnouncementStatus(undefined), 'queued');
  assert.equal(reconcileSocialAnnouncementStatus('unexpected'), 'queued');
});
