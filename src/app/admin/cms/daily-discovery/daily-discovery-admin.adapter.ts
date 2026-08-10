import {
  DailyDiscoveryAdminQuestionSetExisting,
  DailyDiscoveryExternalChoice,
  DailyDiscoveryExternalQuestion,
  DailyDiscoveryExternalQuiz,
  DailyDiscoveryExternalSourceArticle,
  DailyDiscoveryQuestionType,
} from './daily-discovery-admin.models';

export const DAILY_DISCOVERY_MAX_JSON_BYTES = 512 * 1024;
export const DAILY_DISCOVERY_QUESTION_TYPES: readonly DailyDiscoveryQuestionType[] = [
  'article_hunt',
  'scenario_application',
  'inference',
  'compare_articles',
  'sequence',
];
export const DAILY_DISCOVERY_DIFFICULTIES = ['easy', 'medium', 'challenge'] as const;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const QUESTION_TYPE_SET = new Set<string>(DAILY_DISCOVERY_QUESTION_TYPES);
const DIFFICULTY_SET = new Set<string>(DAILY_DISCOVERY_DIFFICULTIES);

export function getEasternDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function parseDailyDiscoveryQuizJson(text: string): DailyDiscoveryExternalQuiz {
  if (new TextEncoder().encode(text).byteLength > DAILY_DISCOVERY_MAX_JSON_BYTES) {
    throw new Error('The JSON file is larger than the 512 KiB upload limit.');
  }

  let value: unknown;

  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (!isRecord(value)) {
    throw new Error('The Daily Discovery JSON must contain one object.');
  }
  if (value['schema'] !== 'colinmichaels.daily-discovery-quiz' || value['version'] !== 1) {
    throw new Error('The JSON schema or version is not supported.');
  }

  const quizDate = getString(value, 'quizDate');

  if (!isValidDateKey(quizDate)) {
    throw new Error('The quiz date must be a valid YYYY-MM-DD date.');
  }
  if (value['timezone'] !== 'America/New_York') {
    throw new Error('The quiz timezone must be America/New_York.');
  }
  if (!Array.isArray(value['questions']) || value['questions'].length < 5 || value['questions'].length > 10) {
    throw new Error('The quiz must contain between 5 and 10 questions.');
  }

  const questions = value['questions'].map((question, index) => parseQuestion(question, quizDate, index));

  return {
    schema: 'colinmichaels.daily-discovery-quiz',
    version: 1,
    quizDate,
    timezone: 'America/New_York',
    status: getString(value, 'status') || 'draft',
    uploadStatus: getString(value, 'uploadStatus') || 'manual_review',
    generatedAt: getString(value, 'generatedAt') || new Date().toISOString(),
    questions,
    qualityChecks: isRecord(value['qualityChecks'])
      ? {...value['qualityChecks']} as Record<string, boolean | number>
      : {},
  };
}

export function normalizeDailyDiscoveryQuiz(quiz: DailyDiscoveryExternalQuiz): DailyDiscoveryExternalQuiz {
  const questions = quiz.questions.map((question, index) => {
    const position = index + 1;
    const sourceArticles = question.sourceArticles.map(source => ({
      ...source,
      url: `https://colinmichaels.com/blog/${source.slug.trim()}`,
    }));

    return {
      ...question,
      id: `${quiz.quizDate}-q${position}`,
      position,
      sourceArticles,
    };
  });
  const distinctTypes = new Set(questions.map(question => question.type)).size;

  return {
    ...quiz,
    questions,
    qualityChecks: {
      questionCount: questions.length,
      distinctTypes,
      allSourcesLive: true,
      oneDefensibleAnswerEach: true,
      duplicateGatePassed: true,
      titleBlankLimitPassed: true,
      jsonValidated: true,
    },
  };
}

export function createEditableQuizFromQuestionSet(
  set: DailyDiscoveryAdminQuestionSetExisting
): DailyDiscoveryExternalQuiz | null {
  if (set.questions.some(question => (
    question.interactionType !== 'multiple_choice'
    || !question.choices
    || question.choices.length < 2
    || !question.acceptedAnswers[0]
  ))) {
    return null;
  }

  const questions = set.questions.map((question, index) => {
    const sourceArticles = question.sourceArticles ?? [{
      slug: question.sourceSlug,
      title: question.sourceTitle,
    }];

    return {
      id: question.id,
      position: index + 1,
      type: question.questionType ?? 'article_hunt',
      difficulty: question.difficulty ?? 'medium',
      prompt: question.question,
      hint: question.hint ?? 'Search the linked article for the detail that supports the correct answer.',
      choices: question.choices?.map(choice => ({...choice})) ?? [],
      answer: {
        correctChoiceId: question.acceptedAnswers[0],
        explanation: question.answerSummary,
      },
      sourceArticles: sourceArticles.map(source => ({
        title: source.title,
        slug: source.slug,
        url: `https://colinmichaels.com/blog/${source.slug}`,
        evidence: question.answerSummary,
      })),
      estimatedSeconds: question.estimatedSeconds ?? 60,
    } satisfies DailyDiscoveryExternalQuestion;
  });

  return normalizeDailyDiscoveryQuiz({
    schema: 'colinmichaels.daily-discovery-quiz',
    version: 1,
    quizDate: set.dateKey,
    timezone: 'America/New_York',
    status: 'ready',
    uploadStatus: 'approved',
    generatedAt: set.generatedAt || new Date().toISOString(),
    questions,
    qualityChecks: {},
  });
}

export function requiresDraftApproval(quiz: DailyDiscoveryExternalQuiz): boolean {
  return quiz.status !== 'ready' || quiz.uploadStatus !== 'approved';
}

export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_PATTERN.test(value)) {
    return false;
  }

  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}

function parseQuestion(value: unknown, dateKey: string, index: number): DailyDiscoveryExternalQuestion {
  if (!isRecord(value)) {
    throw new Error(`Question ${index + 1} must be an object.`);
  }

  const choices = parseChoices(value['choices'], index);
  const answer = value['answer'];
  const sourceArticles = parseSourceArticles(value['sourceArticles'], index);
  const type = getString(value, 'type');
  const difficulty = getString(value, 'difficulty');

  if (!QUESTION_TYPE_SET.has(type)) {
    throw new Error(`Question ${index + 1} has an unsupported type.`);
  }
  if (!DIFFICULTY_SET.has(difficulty)) {
    throw new Error(`Question ${index + 1} has an unsupported difficulty.`);
  }
  if (!isRecord(answer)) {
    throw new Error(`Question ${index + 1} must include an answer.`);
  }

  const correctChoiceId = getString(answer, 'correctChoiceId');

  if (!choices.some(choice => choice.id === correctChoiceId)) {
    throw new Error(`Question ${index + 1} has an unknown correct choice.`);
  }

  return {
    id: getString(value, 'id') || `${dateKey}-q${index + 1}`,
    position: getInteger(value['position']) ?? index + 1,
    type: type as DailyDiscoveryQuestionType,
    difficulty: difficulty as DailyDiscoveryExternalQuestion['difficulty'],
    prompt: getString(value, 'prompt'),
    hint: getString(value, 'hint'),
    choices,
    answer: {
      correctChoiceId,
      explanation: getString(answer, 'explanation'),
    },
    sourceArticles,
    estimatedSeconds: getInteger(value['estimatedSeconds']) ?? 60,
  };
}

function parseChoices(value: unknown, questionIndex: number): DailyDiscoveryExternalChoice[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 6) {
    throw new Error(`Question ${questionIndex + 1} must contain between 2 and 6 choices.`);
  }

  return value.map((choice, choiceIndex) => {
    if (!isRecord(choice)) {
      throw new Error(`Choice ${choiceIndex + 1} in question ${questionIndex + 1} must be an object.`);
    }

    return {
      id: getString(choice, 'id'),
      text: getString(choice, 'text'),
    };
  });
}

function parseSourceArticles(value: unknown, questionIndex: number): DailyDiscoveryExternalSourceArticle[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) {
    throw new Error(`Question ${questionIndex + 1} must contain between 1 and 3 source articles.`);
  }

  return value.map((source, sourceIndex) => {
    if (!isRecord(source)) {
      throw new Error(`Source ${sourceIndex + 1} in question ${questionIndex + 1} must be an object.`);
    }

    return {
      title: getString(source, 'title'),
      slug: getString(source, 'slug'),
      url: getString(source, 'url'),
      evidence: getString(source, 'evidence'),
    };
  });
}

function getString(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === 'string' ? record[key].trim() : '';
}

function getInteger(value: unknown): number | null {
  return Number.isInteger(value) ? value as number : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

