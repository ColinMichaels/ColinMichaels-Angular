const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DAILY_DISCOVERY_CHALLENGES,
  DAILY_DISCOVERY_POINTS,
  getDailyDiscoveryChallenge,
  getDailyDiscoveryDateKey,
  getNextDailyDiscoveryProgress,
  isDailyDiscoveryAnswerCorrect,
  normalizeDailyDiscoveryAnswer,
} = require('../lib/daily-discovery.js');

test('selects a stable challenge for each Eastern calendar day', () => {
  assert.equal(DAILY_DISCOVERY_POINTS, 5);
  assert.equal(getDailyDiscoveryChallenge('2026-08-09').id, 'family-ai-voice-safe-word');
  assert.equal(getDailyDiscoveryChallenge('2026-08-10').id, 'auto-blog-starting-point');
  assert.equal(getDailyDiscoveryChallenge('2026-08-16').id, 'family-ai-voice-safe-word');
  assert.equal(DAILY_DISCOVERY_CHALLENGES.length, 7);
});

test('uses America/New_York when the UTC date and local date differ', () => {
  assert.equal(getDailyDiscoveryDateKey(new Date('2026-08-10T03:30:00.000Z')), '2026-08-09');
  assert.equal(getDailyDiscoveryDateKey(new Date('2026-08-10T04:30:00.000Z')), '2026-08-10');
});

test('normalizes punctuation and casing without accepting partial guesses', () => {
  const challenge = getDailyDiscoveryChallenge('2026-08-09');

  assert.equal(normalizeDailyDiscoveryAnswer('  SAFE-WORD! '), 'safe word');
  assert.equal(isDailyDiscoveryAnswerCorrect(challenge, 'SAFE-WORD!'), true);
  assert.equal(isDailyDiscoveryAnswerCorrect(challenge, 'safe'), false);
});

test('increments consecutive streaks and resets missed-day streaks', () => {
  const initial = {
    currentStreak: 0,
    longestStreak: 0,
    totalCompleted: 0,
    lastCompletedDate: null,
  };
  const first = getNextDailyDiscoveryProgress(initial, '2026-08-09');
  const second = getNextDailyDiscoveryProgress(first, '2026-08-10');
  const reset = getNextDailyDiscoveryProgress(second, '2026-08-12');

  assert.deepEqual(first, {
    currentStreak: 1,
    longestStreak: 1,
    totalCompleted: 1,
    lastCompletedDate: '2026-08-09',
  });
  assert.equal(second.currentStreak, 2);
  assert.equal(reset.currentStreak, 1);
  assert.equal(reset.longestStreak, 2);
  assert.equal(reset.totalCompleted, 3);
  assert.deepEqual(getNextDailyDiscoveryProgress(reset, '2026-08-12'), reset);
});
