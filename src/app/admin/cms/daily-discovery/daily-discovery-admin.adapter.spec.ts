import {
  createEditableQuizFromQuestionSet,
  normalizeDailyDiscoveryQuiz,
  parseDailyDiscoveryQuizJson,
  requiresDraftApproval,
} from './daily-discovery-admin.adapter';
import {DailyDiscoveryAdminQuestionSetExisting} from './daily-discovery-admin.models';

function createQuiz() {
  return {
    schema: 'colinmichaels.daily-discovery-quiz',
    version: 1,
    quizDate: '2026-08-10',
    timezone: 'America/New_York',
    status: 'draft',
    uploadStatus: 'manual_review',
    generatedAt: '2026-08-10T08:00:00-04:00',
    questions: Array.from({length: 5}, (_, index) => ({
      id: `2026-08-10-q${index + 1}`,
      position: index + 1,
      type: ['article_hunt', 'scenario_application', 'inference', 'compare_articles', 'sequence'][index],
      difficulty: index === 0 ? 'easy' : index === 4 ? 'challenge' : 'medium',
      prompt: `Which answer belongs to question number ${index + 1}?`,
      hint: `Search the article for clue number ${index + 1}.`,
      choices: [
        {id: 'a', text: `Answer ${index + 1}`},
        {id: 'b', text: `Distractor ${index + 1}`},
      ],
      answer: {
        correctChoiceId: 'a',
        explanation: `The article supports answer number ${index + 1}.`,
      },
      sourceArticles: [{
        title: `Source ${index + 1}`,
        slug: `source-${index + 1}`,
        url: `https://colinmichaels.com/blog/source-${index + 1}`,
        evidence: `Published evidence for answer number ${index + 1}.`,
      }],
      estimatedSeconds: 45,
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

describe('Daily Discovery admin adapter', () => {
  it('parses an editable generated question file', () => {
    const parsed = parseDailyDiscoveryQuizJson(JSON.stringify(createQuiz()));

    expect(parsed.quizDate).toBe('2026-08-10');
    expect(parsed.questions.length).toBe(5);
    expect(parsed.questions[1].type).toBe('scenario_application');
    expect(parsed.questions[0].answer.correctChoiceId).toBe('a');
    expect(requiresDraftApproval(parsed)).toBeTrue();
  });

  it('normalizes ids, positions, source URLs, and quality counts after editing', () => {
    const parsed = parseDailyDiscoveryQuizJson(JSON.stringify(createQuiz()));
    parsed.questions[0].id = 'stale-id';
    parsed.questions[0].position = 9;
    parsed.questions[0].sourceArticles[0].slug = 'updated-source';
    const normalized = normalizeDailyDiscoveryQuiz(parsed);

    expect(normalized.questions[0].id).toBe('2026-08-10-q1');
    expect(normalized.questions[0].position).toBe(1);
    expect(normalized.questions[0].sourceArticles[0].url)
      .toBe('https://colinmichaels.com/blog/updated-source');
    expect(normalized.qualityChecks['questionCount']).toBe(5);
    expect(normalized.qualityChecks['distinctTypes']).toBe(5);
  });

  it('converts an imported private set into an approved editing draft', () => {
    const existing: DailyDiscoveryAdminQuestionSetExisting = {
      dateKey: '2026-08-10',
      exists: true,
      revision: 2,
      status: 'ready',
      generationVersion: 'daily-discovery-codex-json-v1',
      generationMode: 'admin-cms-json-import',
      generatedAt: '2026-08-10T12:00:00.000Z',
      createdAt: '2026-08-10T12:00:00.000Z',
      updatedAt: '2026-08-10T12:00:00.000Z',
      sourcePostIds: ['post-1'],
      questions: Array.from({length: 5}, (_, index) => ({
        id: `2026-08-10-q${index + 1}`,
        question: `Existing multiple choice question number ${index + 1}?`,
        sourceSlug: 'source-1',
        sourceTitle: 'Canonical source',
        acceptedAnswers: ['a'],
        answerSummary: `The canonical source supports existing answer number ${index + 1}.`,
        interactionType: 'multiple_choice',
        questionType: 'article_hunt',
        difficulty: 'medium',
        hint: 'Search the canonical source for the answer.',
        choices: [{id: 'a', text: 'Correct'}, {id: 'b', text: 'Incorrect'}],
        estimatedSeconds: 60,
      })),
    };
    const editable = createEditableQuizFromQuestionSet(existing);

    expect(editable).not.toBeNull();
    expect(editable?.status).toBe('ready');
    expect(editable?.uploadStatus).toBe('approved');
    expect(editable?.questions[0].sourceArticles[0].evidence).toContain('canonical source');
  });

  it('rejects unsafe or unsupported editor input', () => {
    expect(() => parseDailyDiscoveryQuizJson('{bad json')).toThrowError(/not valid JSON/);
    expect(() => parseDailyDiscoveryQuizJson(JSON.stringify({...createQuiz(), timezone: 'UTC'})))
      .toThrowError(/America\/New_York/);
    expect(() => parseDailyDiscoveryQuizJson(JSON.stringify({...createQuiz(), questions: []})))
      .toThrowError(/between 5 and 10/);
  });
});

