const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DAILY_DISCOVERY_CHALLENGES,
  DAILY_DISCOVERY_POINTS,
  getDailyDiscoveryChallenge,
  getDailyDiscoveryDateKey,
  getEffectiveDailyDiscoveryCompletedChallengeIds,
  getNextDailyDiscoveryProgress,
  isDailyDiscoveryAnswerCorrect,
  normalizeDailyDiscoveryAnswer,
  selectNextDailyDiscoveryChallenge,
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
    completedChallengeIds: [],
  };
  const first = getNextDailyDiscoveryProgress(initial, '2026-08-09', 'question-1');
  const sameDay = getNextDailyDiscoveryProgress(first, '2026-08-09', 'question-2');
  const second = getNextDailyDiscoveryProgress(sameDay, '2026-08-10', 'question-3');
  const reset = getNextDailyDiscoveryProgress(second, '2026-08-12', 'question-4');

  assert.deepEqual(first, {
    currentStreak: 1,
    longestStreak: 1,
    totalCompleted: 1,
    lastCompletedDate: '2026-08-09',
    completedChallengeIds: ['question-1'],
  });
  assert.equal(sameDay.currentStreak, 1);
  assert.equal(sameDay.totalCompleted, 2);
  assert.deepEqual(sameDay.completedChallengeIds, ['question-1', 'question-2']);
  assert.equal(second.currentStreak, 2);
  assert.equal(reset.currentStreak, 1);
  assert.equal(reset.longestStreak, 2);
  assert.equal(reset.totalCompleted, 4);
  assert.deepEqual(reset.completedChallengeIds, ['question-4']);
  assert.deepEqual(getNextDailyDiscoveryProgress(reset, '2026-08-12', 'question-4'), reset);
});

test('serves the first unfinished challenge and recognizes a completed daily set', () => {
  const firstSelection = selectNextDailyDiscoveryChallenge(DAILY_DISCOVERY_CHALLENGES, []);
  const secondSelection = selectNextDailyDiscoveryChallenge(
    DAILY_DISCOVERY_CHALLENGES,
    [DAILY_DISCOVERY_CHALLENGES[0].id]
  );
  const completedSelection = selectNextDailyDiscoveryChallenge(
    DAILY_DISCOVERY_CHALLENGES,
    DAILY_DISCOVERY_CHALLENGES.map(challenge => challenge.id)
  );

  assert.equal(firstSelection.challengeNumber, 1);
  assert.equal(secondSelection.challengeNumber, 2);
  assert.equal(secondSelection.completedCount, 1);
  assert.equal(completedSelection.dailyComplete, true);
  assert.equal(completedSelection.completedCount, DAILY_DISCOVERY_CHALLENGES.length);
});

test('maps a legacy same-day completion to question one during rollout', () => {
  const legacyProgress = {
    currentStreak: 2,
    longestStreak: 2,
    totalCompleted: 4,
    lastCompletedDate: '2026-08-09',
    completedChallengeIds: [],
  };

  assert.deepEqual(
    getEffectiveDailyDiscoveryCompletedChallengeIds(
      legacyProgress,
      '2026-08-09',
      DAILY_DISCOVERY_CHALLENGES
    ),
    [DAILY_DISCOVERY_CHALLENGES[0].id]
  );
  assert.deepEqual(
    getEffectiveDailyDiscoveryCompletedChallengeIds(
      legacyProgress,
      '2026-08-10',
      DAILY_DISCOVERY_CHALLENGES
    ),
    []
  );
});
