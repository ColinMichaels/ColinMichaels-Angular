export const MAX_POLL_OPTIONS = 8;
export const MIN_POLL_OPTIONS = 2;
export const POST_POLL_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export type PostPollResultsVisibility = 'afterVote' | 'always' | 'hidden';

export interface PostPollOption {
  id: string;
  label: string;
}

export interface PostPollDefinition {
  id: string;
  question: string;
  description: string;
  options: readonly PostPollOption[];
  resultsVisibility: PostPollResultsVisibility;
}

export interface PostPollResultOption extends PostPollOption {
  count: number;
  percent: number;
}

export interface PostPollResults {
  pollId: string;
  selectedOptionId: string | null;
  resultsVisible: boolean;
  totalResponses: number;
  options: readonly PostPollResultOption[];
}

export function parsePostPollDefinition(post: unknown, pollId: string): PostPollDefinition | null {
  if (!isRecord(post) || !Array.isArray(post['blocks'])) {
    return null;
  }

  const block = post['blocks'].find(candidate => {
    return isRecord(candidate) && candidate['id'] === pollId && candidate['type'] === 'poll';
  });

  if (!isRecord(block) || !isRecord(block['data'])) {
    return null;
  }

  const data = block['data'];
  const question = getTrimmedString(data['question']);
  const description = getTrimmedString(data['description']);
  const options = parsePollOptions(data['pollOptions']);

  if (!question || options.length < MIN_POLL_OPTIONS) {
    return null;
  }

  return {
    id: pollId,
    question,
    description,
    options,
    resultsVisibility: parseResultsVisibility(data['pollResultsVisibility']),
  };
}

export function normalizePostPollCounts(
  value: unknown,
  options: readonly PostPollOption[]
): Record<string, number> {
  const storedCounts = isRecord(value) ? value : {};

  return Object.fromEntries(options.map(option => {
    const count = storedCounts[option.id];
    return [option.id, typeof count === 'number' && Number.isSafeInteger(count) && count > 0 ? count : 0];
  }));
}

export function createPostPollResults(
  definition: PostPollDefinition,
  counts: Record<string, number>,
  selectedOptionId: string | null,
  resultsVisible: boolean
): PostPollResults {
  const totalResponses = definition.options.reduce((total, option) => total + (counts[option.id] ?? 0), 0);
  const options = resultsVisible
    ? definition.options.map(option => {
        const count = counts[option.id] ?? 0;
        return {
          ...option,
          count,
          percent: totalResponses > 0 ? Math.round(count / totalResponses * 1000) / 10 : 0,
        };
      })
    : [];

  return {
    pollId: definition.id,
    selectedOptionId,
    resultsVisible,
    totalResponses: resultsVisible ? totalResponses : 0,
    options,
  };
}

function parsePollOptions(value: unknown): readonly PostPollOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const options: PostPollOption[] = [];
  const ids = new Set<string>();
  const labels = new Set<string>();

  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const id = getTrimmedString(item['id']);
    const label = getTrimmedString(item['label']);
    const normalizedLabel = label.toLocaleLowerCase();

    if (!POST_POLL_ID_PATTERN.test(id) || !label || ids.has(id) || labels.has(normalizedLabel)) {
      continue;
    }

    ids.add(id);
    labels.add(normalizedLabel);
    options.push({id, label});

    if (options.length === MAX_POLL_OPTIONS) {
      break;
    }
  }

  return options;
}

function parseResultsVisibility(value: unknown): PostPollResultsVisibility {
  return value === 'always' || value === 'hidden' ? value : 'afterVote';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
