const assert = require('node:assert/strict');
const test = require('node:test');

const {
  canAcquireUserRoleMutationLease,
  matchesUserDeletionConfirmation,
  ownsUserRoleMutationLease,
  replaceManagedUserRoleClaims,
} = require('../lib/user-role-mutation');
const {addCatCornerAccessClaim} = require('../lib/cat-corner');

test('an active role mutation lease serializes different owners', () => {
  const lease = {ownerId: 'first-call', expiresAtMillis: 20_000};

  assert.equal(canAcquireUserRoleMutationLease(lease, 'second-call', 10_000), false);
  assert.equal(canAcquireUserRoleMutationLease(lease, 'first-call', 10_000), true);
  assert.equal(ownsUserRoleMutationLease(lease, 'first-call'), true);
  assert.equal(ownsUserRoleMutationLease(lease, 'second-call'), false);
});

test('an expired or malformed role mutation lease can be recovered', () => {
  assert.equal(canAcquireUserRoleMutationLease(undefined, 'next-call', 10_000), true);
  assert.equal(canAcquireUserRoleMutationLease({}, 'next-call', 10_000), true);
  assert.equal(canAcquireUserRoleMutationLease(
    {ownerId: 'stale-call', expiresAtMillis: 10_000},
    'next-call',
    10_000
  ), true);
});

test('admin replacement remains intentional while a later fixed Cat grant preserves it', () => {
  const existingClaims = {
    tenant: 'public-site',
    cmsAdmin: true,
    roles: {
      cmsAdmin: true,
      catCornerAddict: true,
    },
  };
  const replacedClaims = replaceManagedUserRoleClaims(existingClaims, ['admin']);

  assert.deepEqual(replacedClaims, {
    tenant: 'public-site',
    admin: true,
    roles: {admin: true},
  });
  assert.deepEqual(addCatCornerAccessClaim(replacedClaims), {
    tenant: 'public-site',
    admin: true,
    roles: {
      admin: true,
      catCornerAddict: true,
    },
  });
});

test('user deletion confirmation accepts only the exact uid or case-insensitive email', () => {
  assert.equal(matchesUserDeletionConfirmation('reader-uid', 'Reader@Example.com', 'reader-uid'), true);
  assert.equal(matchesUserDeletionConfirmation('reader-uid', 'Reader@Example.com', 'reader@example.com'), true);
  assert.equal(matchesUserDeletionConfirmation('reader-uid', 'Reader@Example.com', ' Reader@Example.com '), true);
  assert.equal(matchesUserDeletionConfirmation('reader-uid', 'Reader@Example.com', 'reader'), false);
  assert.equal(matchesUserDeletionConfirmation('reader-uid', null, 'reader@example.com'), false);
});
