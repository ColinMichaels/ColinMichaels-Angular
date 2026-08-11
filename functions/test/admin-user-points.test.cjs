const assert = require('node:assert/strict');
const test = require('node:test');

const {
  parseAdminUserPointAdjustmentRequest,
  planAdminUserPointAdjustment,
} = require('../lib/admin-user-points');

test('parses bounded admin point adjustments with a required audit reason', () => {
  assert.deepEqual(parseAdminUserPointAdjustmentRequest({
    uid: ' reader-uid ',
    operation: 'add',
    amount: 25,
    reason: ' Contest prize ',
  }), {
    uid: 'reader-uid',
    operation: 'add',
    amount: 25,
    reason: 'Contest prize',
  });

  assert.throws(
    () => parseAdminUserPointAdjustmentRequest({
      uid: 'reader-uid',
      operation: 'remove',
      amount: 0,
      reason: 'Correction'
    }),
    /whole number from 1/
  );
  assert.throws(
    () => parseAdminUserPointAdjustmentRequest({uid: 'reader-uid', operation: 'set', amount: 5, reason: 'x'}),
    /between 3 and 240/
  );
});

test('plans add, remove, and set operations without allowing negative balances or no-ops', () => {
  assert.deepEqual(planAdminUserPointAdjustment(40, 'add', 10), {
    delta: 10,
    previousTotal: 40,
    newTotal: 50,
  });
  assert.deepEqual(planAdminUserPointAdjustment(40, 'remove', 15), {
    delta: -15,
    previousTotal: 40,
    newTotal: 25,
  });
  assert.deepEqual(planAdminUserPointAdjustment(40, 'set', 12), {
    delta: -28,
    previousTotal: 40,
    newTotal: 12,
  });

  assert.throws(() => planAdminUserPointAdjustment(5, 'remove', 6), /resulting point balance/);
  assert.throws(() => planAdminUserPointAdjustment(5, 'set', 5), /does not change/);
});
