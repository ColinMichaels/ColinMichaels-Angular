const assert = require('node:assert/strict');
const test = require('node:test');

const {
  CAT_CORNER_ADDICT_ROLE,
  CAT_CORNER_SOCIAL_CANCELLATION_REASON,
  addCatCornerAccessClaim,
  cancelQueuedCatCornerSocialAnnouncements,
  hasCatCornerAccessClaim,
  isHiddenCatCornerPost,
  shouldCancelPendingCatCornerSocialDeliveries,
} = require('../lib/cat-corner');

test('only non-discovery Cat Corner posts are hidden from public discovery', () => {
  assert.equal(isHiddenCatCornerPost({title: 'Regular post'}), false);
  assert.equal(isHiddenCatCornerPost({catCorner: {enabled: false, discoveryPost: false}}), false);
  assert.equal(isHiddenCatCornerPost({catCorner: {enabled: true, discoveryPost: true}}), false);
  assert.equal(isHiddenCatCornerPost({catCorner: {enabled: true, discoveryPost: false}}), true);
  assert.equal(isHiddenCatCornerPost({catCorner: {enabled: true}}), true);
});

test('Cat Corner claim preserves all existing claims and nested roles', () => {
  const existingClaims = {
    admin: true,
    tenant: 'public-site',
    roles: {
      admin: true,
      contentEditor: true,
    },
  };

  const nextClaims = addCatCornerAccessClaim(existingClaims);

  assert.deepEqual(nextClaims, {
    admin: true,
    tenant: 'public-site',
    roles: {
      admin: true,
      contentEditor: true,
      catCornerAddict: true,
    },
  });
  assert.equal(hasCatCornerAccessClaim(existingClaims), false);
  assert.equal(hasCatCornerAccessClaim(nextClaims), true);
  assert.equal(existingClaims.roles[CAT_CORNER_ADDICT_ROLE], undefined);
});

test('adding Cat Corner access is idempotent', () => {
  const once = addCatCornerAccessClaim({roles: {user: true}});
  const twice = addCatCornerAccessClaim(once);

  assert.deepEqual(twice, once);
  assert.equal(hasCatCornerAccessClaim(twice), true);
});

test('hiding a previously discoverable Cat post cancels its pending social boundary', () => {
  const before = {catCorner: {enabled: true, discoveryPost: true}};
  const after = {catCorner: {enabled: true, discoveryPost: false}};

  assert.equal(shouldCancelPendingCatCornerSocialDeliveries(before, after), true);
  assert.equal(shouldCancelPendingCatCornerSocialDeliveries(after, after), false);
  assert.equal(shouldCancelPendingCatCornerSocialDeliveries(before, before), false);
});

test('only queued announcements backed by pending outbox entries are cancelled', () => {
  const announcements = [
    {id: 'pending-one', status: 'queued', message: 'Do not deliver'},
    {id: 'already-posted', status: 'posted', message: 'Already delivered'},
    {id: 'unrelated', status: 'queued', message: 'Another delivery'},
  ];
  const updatedAt = '2026-07-12T18:00:00.000Z';
  const result = cancelQueuedCatCornerSocialAnnouncements(
    announcements,
    ['pending-one', 'already-posted'],
    updatedAt
  );

  assert.deepEqual(result, [
    {
      id: 'pending-one',
      status: 'cancelled',
      message: 'Do not deliver',
      failureReason: CAT_CORNER_SOCIAL_CANCELLATION_REASON,
      updatedAt,
    },
    announcements[1],
    announcements[2],
  ]);
});
