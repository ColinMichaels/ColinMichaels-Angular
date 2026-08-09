const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DAILY_DISCOVERY_GENERATED_QUESTION_COUNT,
  DAILY_DISCOVERY_GENERATION_VERSION,
  createTitleGap,
  generateDailyDiscoveryQuestions,
  parseStoredDailyDiscoveryQuestionSet,
} = require('../lib/daily-discovery-generation.js');

const sources = Array.from({length: 16}, (_, index) => ({
  id: `post-${index + 1}`,
  slug: `post-${index + 1}`,
  title: `Practical Discovery Guide Number ${index + 1}`,
  publishedAt: `2026-08-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
}));

test('builds ten stable title-gap questions without an AI provider', () => {
  const first = generateDailyDiscoveryQuestions(sources, '2026-08-10');
  const repeat = generateDailyDiscoveryQuestions(sources, '2026-08-10');

  assert.equal(first.length, DAILY_DISCOVERY_GENERATED_QUESTION_COUNT);
  assert.deepEqual(repeat, first);
  assert.equal(new Set(first.map(question => question.sourceSlug)).size, 10);
  assert.ok(first.every(question => question.question.includes('—')));
  assert.ok(first.every(question => question.acceptedAnswers.length >= 1));
});

test('changes the deterministic source rotation on a new date', () => {
  const firstSlugs = generateDailyDiscoveryQuestions(sources, '2026-08-10').map(question => question.sourceSlug);
  const nextSlugs = generateDailyDiscoveryQuestions(sources, '2026-08-11').map(question => question.sourceSlug);

  assert.notDeepEqual(nextSlugs, firstSlugs);
});

test('masks an informative word and rejects titles made only of stop words', () => {
  const gap = createTitleGap('How I Built a Practical Blog Workflow', 'seed');

  assert.ok(gap);
  assert.ok(gap.maskedTitle.includes('—'));
  assert.equal(createTitleGap('What This Is About', 'seed'), null);
});

test('accepts only a complete stored set from the current generator version', () => {
  const questions = generateDailyDiscoveryQuestions(sources, '2026-08-10');
  const document = {
    dateKey: '2026-08-10',
    status: 'ready',
    generationVersion: DAILY_DISCOVERY_GENERATION_VERSION,
    questions,
  };

  assert.deepEqual(parseStoredDailyDiscoveryQuestionSet(document, '2026-08-10'), questions);
  assert.equal(parseStoredDailyDiscoveryQuestionSet({...document, dateKey: '2026-08-09'}, '2026-08-10'), null);
  assert.equal(parseStoredDailyDiscoveryQuestionSet({...document, generationVersion: 'old'}, '2026-08-10'), null);
});
