const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DAILY_DISCOVERY_GENERATED_QUESTION_COUNT,
  DAILY_DISCOVERY_GENERATION_VERSION,
  DAILY_DISCOVERY_IMPORTED_GENERATION_VERSION,
  convertExternalDailyDiscoveryQuiz,
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

const externalTypes = [
  'article_hunt',
  'scenario_application',
  'inference',
  'compare_articles',
  'sequence',
];

function createExternalQuiz() {
  return {
    schema: 'colinmichaels.daily-discovery-quiz',
    version: 1,
    quizDate: '2026-08-10',
    timezone: 'America/New_York',
    status: 'draft',
    uploadStatus: 'manual_review',
    generatedAt: '2026-08-10T08:00:00-04:00',
    questions: externalTypes.map((type, index) => ({
      id: `2026-08-10-q${index + 1}`,
      position: index + 1,
      type,
      difficulty: index < 1 ? 'easy' : index < 4 ? 'medium' : 'challenge',
      prompt: `Which supported answer belongs to discovery question number ${index + 1}?`,
      hint: `Search the source article for discovery clue number ${index + 1}.`,
      choices: [
        {id: 'a', text: `Supported answer ${index + 1}`},
        {id: 'b', text: `Distractor answer ${index + 1}`},
      ],
      answer: {
        correctChoiceId: 'a',
        explanation: `The canonical article evidence supports answer number ${index + 1}.`,
      },
      sourceArticles: [{
        title: `Generated title ${index + 1}`,
        slug: `external-post-${index + 1}`,
        url: `https://colinmichaels.com/blog/external-post-${index + 1}`,
        evidence: `The published article contains defensible evidence for answer number ${index + 1}.`,
      }],
      estimatedSeconds: 45 + index,
    })),
    qualityChecks: {
      questionCount: 5,
      distinctTypes: 5,
      allSourcesLive: true,
      oneDefensibleAnswerEach: true,
      duplicateGatePassed: true,
      titleBlankLimitPassed: true,
      jsonValidated: true,
    },
  };
}

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

test('converts reviewed external multiple-choice JSON without exposing its answer marker', () => {
  const publishedSources = externalTypes.map((_, index) => ({
    id: `canonical-post-${index + 1}`,
    slug: `external-post-${index + 1}`,
    title: `Canonical published title ${index + 1}`,
  }));
  const converted = convertExternalDailyDiscoveryQuiz(createExternalQuiz(), publishedSources);

  assert.equal(converted.dateKey, '2026-08-10');
  assert.equal(converted.questions.length, 5);
  assert.equal(converted.questions[0].interactionType, 'multiple_choice');
  assert.equal(converted.questions[0].sourceTitle, 'Canonical published title 1');
  assert.deepEqual(converted.questions[0].acceptedAnswers, ['a']);
  assert.deepEqual(converted.sourcePostIds, publishedSources.map(source => source.id));
  assert.deepEqual(converted.unresolvedSourceSlugs, []);

  const stored = parseStoredDailyDiscoveryQuestionSet({
    dateKey: converted.dateKey,
    status: 'ready',
    generationVersion: DAILY_DISCOVERY_IMPORTED_GENERATION_VERSION,
    questions: converted.questions,
  }, converted.dateKey);

  assert.ok(stored);
  assert.deepEqual(stored[0].choices, [
    {id: 'a', text: 'Supported answer 1'},
    {id: 'b', text: 'Distractor answer 1'},
  ]);
  assert.equal(stored[0].hint, 'Search the source article for discovery clue number 1.');
});

test('rejects missing published sources and invalid quality gates', () => {
  const quiz = createExternalQuiz();

  assert.throws(
    () => convertExternalDailyDiscoveryQuiz(quiz, []),
    /not a published Firestore post/
  );
  assert.throws(
    () => convertExternalDailyDiscoveryQuiz({
      ...quiz,
      qualityChecks: {...quiz.qualityChecks, duplicateGatePassed: false},
    }, [], {allowUnverifiedSources: true}),
    /duplicateGatePassed must be true/
  );
});
