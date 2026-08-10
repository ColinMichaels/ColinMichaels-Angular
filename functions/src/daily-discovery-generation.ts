import {
  DailyDiscoveryChoice,
  DailyDiscoveryChallengeDefinition,
  DailyDiscoverySourceArticle,
  DAILY_DISCOVERY_TIME_ZONE,
  normalizeDailyDiscoveryAnswer,
} from './daily-discovery';

export const DAILY_DISCOVERY_GENERATED_QUESTION_COUNT = 10;
export const DAILY_DISCOVERY_MIN_GENERATED_QUESTION_COUNT = 5;
export const DAILY_DISCOVERY_GENERATION_VERSION = 'daily-discovery-title-gap-v1';
export const DAILY_DISCOVERY_IMPORTED_GENERATION_VERSION = 'daily-discovery-codex-json-v1';

const DAILY_DISCOVERY_EXTERNAL_SCHEMA = 'colinmichaels.daily-discovery-quiz';
const DAILY_DISCOVERY_EXTERNAL_VERSION = 1;
const SUPPORTED_GENERATION_VERSIONS = new Set([
  DAILY_DISCOVERY_GENERATION_VERSION,
  DAILY_DISCOVERY_IMPORTED_GENERATION_VERSION,
]);
const EXTERNAL_QUESTION_TYPES = new Set([
  'article_hunt',
  'scenario_application',
  'inference',
  'compare_articles',
  'sequence',
]);
const EXTERNAL_DIFFICULTIES = new Set(['easy', 'medium', 'challenge']);

const TITLE_WORD_PATTERN = /[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g;
const TITLE_STOP_WORDS = new Set([
  'about', 'after', 'again', 'against', 'before', 'being', 'between', 'could', 'does',
  'from', 'have', 'here', 'into', 'just', 'more', 'most', 'over', 'should', 'than',
  'that', 'their', 'there', 'these', 'they', 'this', 'through', 'under', 'what', 'when',
  'where', 'which', 'while', 'with', 'without', 'would', 'your',
]);

export interface DailyDiscoveryGenerationSource {
  id: string;
  slug: string;
  title: string;
  publishedAt: string;
}

export interface DailyDiscoveryQuestionSetDocument {
  dateKey: string;
  status: 'ready';
  generationVersion: string;
  generatedAt: string;
  sourcePostIds: readonly string[];
  questions: readonly DailyDiscoveryChallengeDefinition[];
}

export interface DailyDiscoveryExternalSource {
  id: string;
  slug: string;
  title: string;
}

export interface DailyDiscoveryExternalImport {
  dateKey: string;
  inputStatus: string;
  uploadStatus: string;
  generatedAt: string;
  sourcePostIds: readonly string[];
  unresolvedSourceSlugs: readonly string[];
  questions: readonly DailyDiscoveryChallengeDefinition[];
  qualityChecks: Readonly<Record<string, boolean | number>>;
}

export interface DailyDiscoveryExternalImportOptions {
  allowUnverifiedSources?: boolean;
}

/**
 * Creates a stable daily set without an AI provider. Each question removes one
 * distinctive word from a published post title so the canonical blog search
 * remains the source of truth for the answer.
 */
export function generateDailyDiscoveryQuestions(
  sources: readonly DailyDiscoveryGenerationSource[],
  dateKey: string,
  count = DAILY_DISCOVERY_GENERATED_QUESTION_COUNT
): readonly DailyDiscoveryChallengeDefinition[] {
  const selectedSources = selectDailyDiscoveryGenerationSources(sources, dateKey, count);

  if (selectedSources.length < DAILY_DISCOVERY_MIN_GENERATED_QUESTION_COUNT) {
    throw new Error(`At least ${DAILY_DISCOVERY_MIN_GENERATED_QUESTION_COUNT} eligible posts are required.`);
  }

  return selectedSources.map((source, index) => {
    const titleGap = createTitleGap(source.title, `${dateKey}:${source.slug}`);

    if (!titleGap) {
      throw new Error(`Post ${source.slug} does not have an eligible title word.`);
    }

    return {
      id: `${dateKey}-q${String(index + 1).padStart(2, '0')}`,
      question: `Which word completes this post title: “${titleGap.maskedTitle}”?`,
      sourceSlug: source.slug,
      sourceTitle: source.title,
      acceptedAnswers: createAcceptedAnswerVariants(titleGap.answer),
      answerSummary: `The missing word is “${titleGap.answer}” in “${source.title}”.`,
    };
  });
}

export function parseStoredDailyDiscoveryQuestionSet(
  value: unknown,
  expectedDateKey: string
): readonly DailyDiscoveryChallengeDefinition[] | null {
  if (
    !isRecord(value)
    || value['status'] !== 'ready'
    || value['dateKey'] !== expectedDateKey
    || typeof value['generationVersion'] !== 'string'
    || !SUPPORTED_GENERATION_VERSIONS.has(value['generationVersion'])
  ) {
    return null;
  }

  const rawQuestions = value['questions'];

  if (
    !Array.isArray(rawQuestions)
    || rawQuestions.length < DAILY_DISCOVERY_MIN_GENERATED_QUESTION_COUNT
    || rawQuestions.length > DAILY_DISCOVERY_GENERATED_QUESTION_COUNT
  ) {
    return null;
  }

  try {
    const questions = rawQuestions.map(parseStoredQuestion);
    const ids = new Set(questions.map(question => question.id));
    const normalizedQuestions = new Set(questions.map(question => normalizeDailyDiscoveryAnswer(question.question)));

    return ids.size === questions.length && normalizedQuestions.size === questions.length ? questions : null;
  } catch {
    return null;
  }
}

/**
 * Validates the scheduled-task JSON contract and converts it to the private
 * question-set representation used by the callable Functions. Published post
 * metadata remains authoritative for source titles and document ids.
 */
export function convertExternalDailyDiscoveryQuiz(
  value: unknown,
  publishedSources: readonly DailyDiscoveryExternalSource[],
  options: DailyDiscoveryExternalImportOptions = {}
): DailyDiscoveryExternalImport {
  if (!isRecord(value)) {
    throw new Error('Daily Discovery import must be a JSON object.');
  }

  if (value['schema'] !== DAILY_DISCOVERY_EXTERNAL_SCHEMA) {
    throw new Error(`Daily Discovery import schema must be ${DAILY_DISCOVERY_EXTERNAL_SCHEMA}.`);
  }

  if (value['version'] !== DAILY_DISCOVERY_EXTERNAL_VERSION) {
    throw new Error(`Daily Discovery import version must be ${DAILY_DISCOVERY_EXTERNAL_VERSION}.`);
  }

  const dateKey = getDateKey(value['quizDate'], 'quiz date');

  if (value['timezone'] !== DAILY_DISCOVERY_TIME_ZONE) {
    throw new Error(`Daily Discovery timezone must be ${DAILY_DISCOVERY_TIME_ZONE}.`);
  }

  const inputStatus = getBoundedString(value['status'], 1, 30, 'status');
  const uploadStatus = getBoundedString(value['uploadStatus'], 1, 40, 'upload status');
  const generatedAt = getIsoDate(value['generatedAt'], 'generated date');
  const rawQuestions = value['questions'];

  if (
    !Array.isArray(rawQuestions)
    || rawQuestions.length < DAILY_DISCOVERY_MIN_GENERATED_QUESTION_COUNT
    || rawQuestions.length > DAILY_DISCOVERY_GENERATED_QUESTION_COUNT
  ) {
    throw new Error(
      `Daily Discovery import must include between ${DAILY_DISCOVERY_MIN_GENERATED_QUESTION_COUNT} and ${DAILY_DISCOVERY_GENERATED_QUESTION_COUNT} questions.`
    );
  }

  const sourceBySlug = new Map(publishedSources.map(source => [source.slug, source]));
  const unresolvedSourceSlugs = new Set<string>();
  const sourcePostIds = new Set<string>();
  const questions = rawQuestions.map((question, index) => {
    const parsed = parseExternalQuestion(question, dateKey, index + 1);
    const sources = parsed.sourceArticles.map(source => {
      const canonical = sourceBySlug.get(source.slug);

      if (!canonical) {
        unresolvedSourceSlugs.add(source.slug);

        if (!options.allowUnverifiedSources) {
          throw new Error(`Daily Discovery source ${source.slug} is not a published Firestore post.`);
        }

        return {slug: source.slug, title: source.title};
      }

      sourcePostIds.add(canonical.id);
      return {slug: canonical.slug, title: canonical.title};
    });
    const correctChoice = parsed.choices.find(choice => choice.id === parsed.correctChoiceId);

    if (!correctChoice) {
      throw new Error(`Daily Discovery question ${parsed.id} has an unknown correct choice id.`);
    }

    return {
      id: parsed.id,
      question: parsed.prompt,
      sourceSlug: sources[0].slug,
      sourceTitle: sources[0].title,
      acceptedAnswers: [correctChoice.id],
      answerSummary: parsed.explanation,
      interactionType: 'multiple_choice' as const,
      questionType: parsed.questionType,
      difficulty: parsed.difficulty,
      hint: parsed.hint,
      choices: parsed.choices,
      estimatedSeconds: parsed.estimatedSeconds,
      sourceArticles: sources,
    } satisfies DailyDiscoveryChallengeDefinition;
  });
  const ids = new Set(questions.map(question => question.id));
  const normalizedQuestions = new Set(questions.map(question => normalizeDailyDiscoveryAnswer(question.question)));
  const distinctTypes = new Set(questions.map(question => question.questionType)).size;
  const qualityChecks = parseExternalQualityChecks(value['qualityChecks'], questions.length, distinctTypes);

  if (ids.size !== questions.length || normalizedQuestions.size !== questions.length) {
    throw new Error('Daily Discovery import contains duplicate question ids or prompts.');
  }

  return {
    dateKey,
    inputStatus,
    uploadStatus,
    generatedAt,
    sourcePostIds: [...sourcePostIds],
    unresolvedSourceSlugs: [...unresolvedSourceSlugs],
    questions,
    qualityChecks,
  };
}

export function selectDailyDiscoveryGenerationSources(
  sources: readonly DailyDiscoveryGenerationSource[],
  dateKey: string,
  limit = DAILY_DISCOVERY_GENERATED_QUESTION_COUNT
): readonly DailyDiscoveryGenerationSource[] {
  return [...new Map(sources.map(source => [source.slug, source])).values()]
    .filter(source => (
      source.slug.length > 0
      && source.title.length > 0
      && createTitleGap(source.title, `${dateKey}:${source.slug}`) !== null
    ))
    .sort((left, right) => {
      const leftScore = hashString(`${dateKey}:${left.slug}`);
      const rightScore = hashString(`${dateKey}:${right.slug}`);

      return leftScore === rightScore
        ? right.publishedAt.localeCompare(left.publishedAt)
        : leftScore - rightScore;
    })
    .slice(0, Math.max(DAILY_DISCOVERY_MIN_GENERATED_QUESTION_COUNT, limit));
}

export function createTitleGap(
  title: string,
  seed: string
): {maskedTitle: string; answer: string} | null {
  const candidates = [...title.matchAll(TITLE_WORD_PATTERN)]
    .filter(match => {
      const word = match[0];
      const normalized = normalizeDailyDiscoveryAnswer(word);

      return normalized.length >= 4
        && !TITLE_STOP_WORDS.has(normalized)
        && !/^\d+$/.test(normalized);
    });

  if (candidates.length === 0) {
    return null;
  }

  const selected = candidates[hashString(seed) % candidates.length];
  const start = selected.index ?? 0;
  const answer = selected[0];
  const maskedTitle = `${title.slice(0, start)}${'—'.repeat(Math.min(8, Math.max(4, answer.length)))}${title.slice(start + answer.length)}`;

  return {maskedTitle, answer};
}

function createAcceptedAnswerVariants(answer: string): readonly string[] {
  const variants = new Set([answer]);
  const withoutPunctuation = answer.replace(/['’\-]/g, ' ').replace(/\s+/g, ' ').trim();

  if (withoutPunctuation && normalizeDailyDiscoveryAnswer(withoutPunctuation) !== normalizeDailyDiscoveryAnswer(answer)) {
    variants.add(withoutPunctuation);
  }

  return [...variants];
}

function parseStoredQuestion(value: unknown): DailyDiscoveryChallengeDefinition {
  if (!isRecord(value)) {
    throw new Error('Stored Daily Discovery question must be an object.');
  }

  const id = getBoundedString(value['id'], 1, 100, 'question id');
  const question = getBoundedString(value['question'], 20, 420, 'question');
  const sourceSlug = getBoundedString(value['sourceSlug'], 1, 180, 'source slug');
  const sourceTitle = getBoundedString(value['sourceTitle'], 1, 220, 'source title');
  const answerSummary = getBoundedString(value['answerSummary'], 20, 600, 'answer summary');
  const acceptedAnswers = Array.isArray(value['acceptedAnswers'])
    ? [...new Set(value['acceptedAnswers'].map(answer => getBoundedString(answer, 1, 80, 'accepted answer')))]
    : [];

  if (acceptedAnswers.length < 1 || acceptedAnswers.length > 4) {
    throw new Error('Stored Daily Discovery question must include between one and four accepted answers.');
  }

  const interactionType = value['interactionType'] === 'multiple_choice' ? 'multiple_choice' : undefined;
  const choices = interactionType ? parseStoredChoices(value['choices']) : undefined;
  const hint = value['hint'] === undefined
    ? undefined
    : getBoundedString(value['hint'], 10, 360, 'hint');
  const questionType = value['questionType'] === undefined
    ? undefined
    : getPatternString(value['questionType'], 1, 40, 'question type', /^[a-z][a-z0-9_]*$/);
  const difficulty = value['difficulty'] === undefined
    ? undefined
    : parseDifficulty(value['difficulty']);
  const estimatedSeconds = value['estimatedSeconds'] === undefined
    ? undefined
    : getBoundedInteger(value['estimatedSeconds'], 10, 300, 'estimated seconds');
  const sourceArticles = value['sourceArticles'] === undefined
    ? undefined
    : parseStoredSourceArticles(value['sourceArticles']);

  return {
    id,
    question,
    sourceSlug,
    sourceTitle,
    acceptedAnswers,
    answerSummary,
    ...(interactionType ? {interactionType, choices} : {}),
    ...(hint ? {hint} : {}),
    ...(questionType ? {questionType} : {}),
    ...(difficulty ? {difficulty} : {}),
    ...(estimatedSeconds ? {estimatedSeconds} : {}),
    ...(sourceArticles ? {sourceArticles} : {}),
  };
}

function parseExternalQuestion(value: unknown, dateKey: string, expectedPosition: number): {
  id: string;
  prompt: string;
  questionType: string;
  difficulty: 'easy' | 'medium' | 'challenge';
  hint: string;
  choices: readonly DailyDiscoveryChoice[];
  correctChoiceId: string;
  explanation: string;
  sourceArticles: readonly DailyDiscoverySourceArticle[];
  estimatedSeconds: number;
} {
  if (!isRecord(value)) {
    throw new Error(`Daily Discovery question ${expectedPosition} must be an object.`);
  }

  const id = getPatternString(value['id'], 1, 100, 'question id', /^\d{4}-\d{2}-\d{2}-q\d{1,2}$/);
  const position = getBoundedInteger(value['position'], 1, DAILY_DISCOVERY_GENERATED_QUESTION_COUNT, 'question position');

  const idPosition = Number.parseInt(id.slice(id.lastIndexOf('q') + 1), 10);

  if (position !== expectedPosition || idPosition !== expectedPosition || !id.startsWith(`${dateKey}-q`)) {
    throw new Error(`Daily Discovery question ${id} must match quiz date and position ${expectedPosition}.`);
  }

  const questionType = getBoundedString(value['type'], 1, 40, 'question type');

  if (!EXTERNAL_QUESTION_TYPES.has(questionType)) {
    throw new Error(`Daily Discovery question ${id} has an unsupported type.`);
  }

  const difficulty = parseDifficulty(value['difficulty']);
  const prompt = getBoundedString(value['prompt'], 20, 420, 'question prompt');
  const hint = getBoundedString(value['hint'], 10, 360, 'question hint');
  const choices = parseStoredChoices(value['choices']);
  const answer = value['answer'];

  if (!isRecord(answer)) {
    throw new Error(`Daily Discovery question ${id} must include an answer object.`);
  }

  const correctChoiceId = getPatternString(answer['correctChoiceId'], 1, 20, 'correct choice id', /^[a-z0-9_-]+$/i);
  const explanation = getBoundedString(answer['explanation'], 20, 600, 'answer explanation');
  const sourceArticles = parseExternalSourceArticles(value['sourceArticles']);
  const estimatedSeconds = getBoundedInteger(value['estimatedSeconds'], 10, 300, 'estimated seconds');

  return {
    id,
    prompt,
    questionType,
    difficulty,
    hint,
    choices,
    correctChoiceId,
    explanation,
    sourceArticles,
    estimatedSeconds,
  };
}

function parseStoredChoices(value: unknown): readonly DailyDiscoveryChoice[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 6) {
    throw new Error('Daily Discovery multiple-choice questions must include between two and six choices.');
  }

  const choices = value.map((choice, index) => {
    if (!isRecord(choice)) {
      throw new Error(`Daily Discovery choice ${index + 1} must be an object.`);
    }

    return {
      id: getPatternString(choice['id'], 1, 20, 'choice id', /^[a-z0-9_-]+$/i),
      text: getBoundedString(choice['text'], 1, 240, 'choice text'),
    };
  });

  if (
    new Set(choices.map(choice => choice.id)).size !== choices.length
    || new Set(choices.map(choice => normalizeDailyDiscoveryAnswer(choice.text))).size !== choices.length
  ) {
    throw new Error('Daily Discovery choice ids and text must be unique within each question.');
  }

  return choices;
}

function parseStoredSourceArticles(value: unknown): readonly DailyDiscoverySourceArticle[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) {
    throw new Error('Daily Discovery questions must include between one and three source articles.');
  }

  const sources = value.map(source => {
    if (!isRecord(source)) {
      throw new Error('Daily Discovery source article must be an object.');
    }

    return {
      slug: getPatternString(source['slug'], 1, 180, 'source slug', /^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      title: getBoundedString(source['title'], 1, 220, 'source title'),
    };
  });

  if (new Set(sources.map(source => source.slug)).size !== sources.length) {
    throw new Error('Daily Discovery source article slugs must be unique within each question.');
  }

  return sources;
}

function parseExternalSourceArticles(value: unknown): readonly DailyDiscoverySourceArticle[] {
  const sources = parseStoredSourceArticles(value);

  (value as readonly unknown[]).forEach((source, index) => {
    const sourceRecord = source as Record<string, unknown>;
    getBoundedString(sourceRecord['evidence'], 20, 1000, `source evidence ${index + 1}`);
    const url = getBoundedString(sourceRecord['url'], 1, 500, `source URL ${index + 1}`);
    const expectedUrl = `https://colinmichaels.com/blog/${sources[index].slug}`;

    if (url !== expectedUrl) {
      throw new Error(`Daily Discovery source URL must be ${expectedUrl}.`);
    }
  });

  return sources;
}

function parseExternalQualityChecks(
  value: unknown,
  questionCount: number,
  distinctTypes: number
): Readonly<Record<string, boolean | number>> {
  if (!isRecord(value)) {
    throw new Error('Daily Discovery import must include quality checks.');
  }

  const requiredBooleanChecks = [
    'allSourcesLive',
    'oneDefensibleAnswerEach',
    'duplicateGatePassed',
    'titleBlankLimitPassed',
    'jsonValidated',
  ];

  if (value['questionCount'] !== questionCount || value['distinctTypes'] !== distinctTypes) {
    throw new Error('Daily Discovery quality-check counts must match the imported questions.');
  }

  for (const check of requiredBooleanChecks) {
    if (value[check] !== true) {
      throw new Error(`Daily Discovery quality check ${check} must be true.`);
    }
  }

  return {
    questionCount,
    distinctTypes,
    ...Object.fromEntries(requiredBooleanChecks.map(check => [check, true])),
  };
}

function parseDifficulty(value: unknown): 'easy' | 'medium' | 'challenge' {
  const difficulty = getBoundedString(value, 1, 20, 'difficulty');

  if (!EXTERNAL_DIFFICULTIES.has(difficulty)) {
    throw new Error('Daily Discovery difficulty must be easy, medium, or challenge.');
  }

  return difficulty as 'easy' | 'medium' | 'challenge';
}

function getDateKey(value: unknown, label: string): string {
  const dateKey = getPatternString(value, 10, 10, label, /^\d{4}-\d{2}-\d{2}$/);
  const parsed = Date.parse(`${dateKey}T00:00:00.000Z`);

  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== dateKey) {
    throw new Error(`Daily Discovery ${label} must be a valid calendar date.`);
  }

  return dateKey;
}

function getIsoDate(value: unknown, label: string): string {
  const date = getBoundedString(value, 20, 40, label);

  if (!Number.isFinite(Date.parse(date))) {
    throw new Error(`Daily Discovery ${label} must be an ISO date.`);
  }

  return date;
}

function getPatternString(
  value: unknown,
  minLength: number,
  maxLength: number,
  label: string,
  pattern: RegExp
): string {
  const text = getBoundedString(value, minLength, maxLength, label);

  if (!pattern.test(text)) {
    throw new Error(`Daily Discovery ${label} has an invalid format.`);
  }

  return text;
}

function getBoundedInteger(value: unknown, min: number, max: number, label: string): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new Error(`Daily Discovery ${label} must be an integer between ${min} and ${max}.`);
  }

  return value as number;
}

function getBoundedString(value: unknown, minLength: number, maxLength: number, label: string): string {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

  if (text.length < minLength || text.length > maxLength) {
    throw new Error(`Daily Discovery ${label} must be between ${minLength} and ${maxLength} characters.`);
  }

  return text;
}

function hashString(value: string): number {
  let hash = 2_166_136_261;

  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }

  return hash;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
