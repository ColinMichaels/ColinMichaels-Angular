const assert = require('node:assert/strict');
const test = require('node:test');

const {
  POST_READ_COMPLETION_PERCENT,
  isQualifiedPostReadProgress,
} = require('../lib/post-reading.js');

test('qualifies only completed article progress for read points', () => {
  assert.equal(POST_READ_COMPLETION_PERCENT, 95);
  assert.equal(isQualifiedPostReadProgress(95), true);
  assert.equal(isQualifiedPostReadProgress(100), true);
  assert.equal(isQualifiedPostReadProgress(94), false);
  assert.equal(isQualifiedPostReadProgress(101), false);
  assert.equal(isQualifiedPostReadProgress(Number.NaN), false);
  assert.equal(isQualifiedPostReadProgress(undefined), false);
});
