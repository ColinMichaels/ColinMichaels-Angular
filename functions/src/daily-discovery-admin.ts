import {createHash} from 'node:crypto';

export const DAILY_DISCOVERY_ADMIN_MAX_PAYLOAD_BYTES = 512 * 1024;

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{20,80}$/;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type DailyDiscoveryAdminOperation = 'create' | 'replace';

export type DailyDiscoveryAdminErrorKind =
  | 'invalid-argument'
  | 'past-date'
  | 'already-exists'
  | 'not-found'
  | 'revision-conflict'
  | 'live-confirmation-required'
  | 'live-question-ids-changed'
  | 'receipt-conflict'
  | 'data-loss';

export class DailyDiscoveryAdminError extends Error {
  constructor(
    readonly kind: DailyDiscoveryAdminErrorKind,
    message: string,
    readonly details?: Readonly<Record<string, unknown>>
  ) {
    super(message);
    this.name = 'DailyDiscoveryAdminError';
  }
}

export interface DailyDiscoveryAdminDateRequest {
  dateKey: string;
}

export interface DailyDiscoveryAdminSaveRequest {
  operation: DailyDiscoveryAdminOperation;
  requestId: string;
  expectedRevision: number | null;
  approveDraft: boolean;
  confirmLiveReplacement: boolean;
  dryRun: boolean;
  quiz: Record<string, unknown>;
  requestFingerprint: string;
}

export interface DailyDiscoveryAdminMutationPlan {
  nextRevision: number;
  liveReplacement: boolean;
}

export function parseAdminDailyDiscoveryDateRequest(value: unknown): DailyDiscoveryAdminDateRequest {
  if (!isRecord(value)) {
    throw new DailyDiscoveryAdminError('invalid-argument', 'Daily Discovery request must be an object.');
  }

  return {dateKey: parseDateKey(value['dateKey'])};
}

export function parseAdminDailyDiscoverySaveRequest(value: unknown): DailyDiscoveryAdminSaveRequest {
  if (!isRecord(value)) {
    throw new DailyDiscoveryAdminError('invalid-argument', 'Daily Discovery save request must be an object.');
  }

  const operation = value['operation'];

  if (operation !== 'create' && operation !== 'replace') {
    throw new DailyDiscoveryAdminError('invalid-argument', 'Daily Discovery operation must be create or replace.');
  }

  const requestId = typeof value['requestId'] === 'string' ? value['requestId'].trim() : '';

  if (!REQUEST_ID_PATTERN.test(requestId)) {
    throw new DailyDiscoveryAdminError(
      'invalid-argument',
      'Daily Discovery requestId must contain 20 to 80 letters, numbers, underscores, or hyphens.'
    );
  }

  const expectedRevision = value['expectedRevision'];

  if (operation === 'replace') {
    if (!Number.isInteger(expectedRevision) || (expectedRevision as number) < 0) {
      throw new DailyDiscoveryAdminError(
        'invalid-argument',
        'Replacing a Daily Discovery set requires a non-negative expectedRevision.'
      );
    }
  } else if (expectedRevision !== undefined && expectedRevision !== null) {
    throw new DailyDiscoveryAdminError(
      'invalid-argument',
      'Creating a Daily Discovery set must not include expectedRevision.'
    );
  }

  const approveDraft = parseOptionalBoolean(value['approveDraft'], 'approveDraft');
  const confirmLiveReplacement = parseOptionalBoolean(
    value['confirmLiveReplacement'],
    'confirmLiveReplacement'
  );
  const dryRun = parseOptionalBoolean(value['dryRun'], 'dryRun');
  const quiz = value['quiz'];

  if (!isRecord(quiz)) {
    throw new DailyDiscoveryAdminError('invalid-argument', 'Daily Discovery quiz must be a JSON object.');
  }

  const serializedQuiz = serializeAndBoundQuiz(quiz);
  const fingerprintInput = JSON.stringify({
    operation,
    expectedRevision: operation === 'replace' ? expectedRevision : null,
    approveDraft,
    confirmLiveReplacement,
    quiz: serializedQuiz,
  });

  return {
    operation,
    requestId,
    expectedRevision: operation === 'replace' ? expectedRevision as number : null,
    approveDraft,
    confirmLiveReplacement,
    dryRun,
    quiz,
    requestFingerprint: createHash('sha256').update(fingerprintInput).digest('hex'),
  };
}

export function getStoredDailyDiscoveryRevision(value: unknown): number {
  if (!isRecord(value)) {
    throw new DailyDiscoveryAdminError('data-loss', 'Stored Daily Discovery question set is invalid.');
  }

  const revision = value['revision'];

  if (revision === undefined) {
    return 0;
  }

  if (!Number.isInteger(revision) || (revision as number) < 0) {
    throw new DailyDiscoveryAdminError('data-loss', 'Stored Daily Discovery revision is invalid.');
  }

  return revision as number;
}

export function requiresDailyDiscoveryDraftApproval(inputStatus: string, uploadStatus: string): boolean {
  return inputStatus !== 'ready' || uploadStatus !== 'approved';
}

export function planDailyDiscoveryAdminMutation(input: {
  operation: DailyDiscoveryAdminOperation;
  dateKey: string;
  currentDateKey: string;
  expectedRevision: number | null;
  existingRevision: number | null;
  existingQuestionIds: readonly string[] | null;
  nextQuestionIds: readonly string[];
  confirmLiveReplacement: boolean;
}): DailyDiscoveryAdminMutationPlan {
  const dateKey = parseDateKey(input.dateKey);
  const currentDateKey = parseDateKey(input.currentDateKey);

  if (dateKey < currentDateKey) {
    throw new DailyDiscoveryAdminError(
      'past-date',
      'Daily Discovery question sets cannot be created or replaced for a past Eastern date.'
    );
  }

  if (input.operation === 'create') {
    if (input.existingRevision !== null) {
      throw new DailyDiscoveryAdminError(
        'already-exists',
        `Daily Discovery question set ${dateKey} already exists. Use replace with its current revision.`
      );
    }

    return {nextRevision: 1, liveReplacement: false};
  }

  if (input.existingRevision === null || input.existingQuestionIds === null) {
    throw new DailyDiscoveryAdminError(
      'not-found',
      `Daily Discovery question set ${dateKey} does not exist. Use create instead.`
    );
  }

  if (input.expectedRevision !== input.existingRevision) {
    throw new DailyDiscoveryAdminError(
      'revision-conflict',
      'The Daily Discovery set changed after it was loaded. Reload it before replacing it.',
      {
        dateKey,
        expectedRevision: input.expectedRevision,
        actualRevision: input.existingRevision,
      }
    );
  }

  const liveReplacement = dateKey === currentDateKey;

  if (liveReplacement && !input.confirmLiveReplacement) {
    throw new DailyDiscoveryAdminError(
      'live-confirmation-required',
      'Replacing today\'s live Daily Discovery set requires explicit confirmation.'
    );
  }

  if (liveReplacement && !sameOrderedValues(input.existingQuestionIds, input.nextQuestionIds)) {
    throw new DailyDiscoveryAdminError(
      'live-question-ids-changed',
      'Today\'s live replacement must preserve the existing question count and ordered question IDs.'
    );
  }

  return {
    nextRevision: input.existingRevision + 1,
    liveReplacement,
  };
}

export function createDailyDiscoveryAdminReceiptId(actorUid: string, requestId: string): string {
  return createHash('sha256').update(`${actorUid}:${requestId}`).digest('hex');
}

function serializeAndBoundQuiz(quiz: Record<string, unknown>): string {
  let serialized: string;

  try {
    serialized = JSON.stringify(quiz);
  } catch {
    throw new DailyDiscoveryAdminError('invalid-argument', 'Daily Discovery quiz must be valid JSON.');
  }

  if (Buffer.byteLength(serialized, 'utf8') > DAILY_DISCOVERY_ADMIN_MAX_PAYLOAD_BYTES) {
    throw new DailyDiscoveryAdminError(
      'invalid-argument',
      `Daily Discovery quiz must be no larger than ${DAILY_DISCOVERY_ADMIN_MAX_PAYLOAD_BYTES} bytes.`
    );
  }

  return serialized;
}

function parseOptionalBoolean(value: unknown, label: string): boolean {
  if (value === undefined) {
    return false;
  }

  if (typeof value !== 'boolean') {
    throw new DailyDiscoveryAdminError('invalid-argument', `Daily Discovery ${label} must be a boolean.`);
  }

  return value;
}

function parseDateKey(value: unknown): string {
  const dateKey = typeof value === 'string' ? value.trim() : '';

  if (!DATE_KEY_PATTERN.test(dateKey)) {
    throw new DailyDiscoveryAdminError('invalid-argument', 'Daily Discovery dateKey must use YYYY-MM-DD.');
  }

  const parsed = Date.parse(`${dateKey}T00:00:00.000Z`);

  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== dateKey) {
    throw new DailyDiscoveryAdminError('invalid-argument', 'Daily Discovery dateKey must be a valid calendar date.');
  }

  return dateKey;
}

function sameOrderedValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
