import {
  DailyDiscoveryChallengeDefinition,
  normalizeDailyDiscoveryAnswer,
} from './daily-discovery';

export const DAILY_DISCOVERY_GENERATED_QUESTION_COUNT = 10;
export const DAILY_DISCOVERY_MIN_GENERATED_QUESTION_COUNT = 5;
export const DAILY_DISCOVERY_GENERATION_VERSION = 'daily-discovery-title-gap-v1';

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
    || value['generationVersion'] !== DAILY_DISCOVERY_GENERATION_VERSION
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
  const question = getBoundedString(value['question'], 20, 320, 'question');
  const sourceSlug = getBoundedString(value['sourceSlug'], 1, 180, 'source slug');
  const sourceTitle = getBoundedString(value['sourceTitle'], 1, 220, 'source title');
  const answerSummary = getBoundedString(value['answerSummary'], 20, 480, 'answer summary');
  const acceptedAnswers = Array.isArray(value['acceptedAnswers'])
    ? [...new Set(value['acceptedAnswers'].map(answer => getBoundedString(answer, 1, 80, 'accepted answer')))]
    : [];

  if (acceptedAnswers.length < 1 || acceptedAnswers.length > 4) {
    throw new Error('Stored Daily Discovery question must include between one and four accepted answers.');
  }

  return {id, question, sourceSlug, sourceTitle, acceptedAnswers, answerSummary};
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
