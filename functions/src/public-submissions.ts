import {createHash} from 'node:crypto';

import {FieldValue, Firestore, Timestamp} from 'firebase-admin/firestore';
import {HttpsError} from 'firebase-functions/v2/https';

const PUBLIC_SUBMISSIONS_COLLECTION = 'publicSubmissions';
const PUBLIC_SUBMISSION_RATE_LIMITS_COLLECTION = 'publicSubmissionRateLimits';
const MAX_SUBMISSIONS_PER_HOUR = 5;
const CONTACT_REASONS = new Set([
  'general',
  'project',
  'correction',
  'media',
  'privacy',
  'other',
]);
const CONTROL_CHARACTERS_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PublicSubmissionType = 'contact' | 'author-pitch';

export interface PublicSubmissionResult {
  accepted: true;
  referenceId: string;
}

interface PublicSubmissionContext {
  actorUid: string | null;
  ipAddress: string;
}

interface ParsedPublicSubmission {
  isSpam: boolean;
  submission: Record<string, unknown>;
  type: PublicSubmissionType;
}

export function parsePublicSubmission(value: unknown): ParsedPublicSubmission {
  if (!isRecord(value)) {
    invalid('A submission is required.');
  }

  const serializedBytes = Buffer.byteLength(JSON.stringify(value), 'utf8');
  if (serializedBytes > 24_000) {
    invalid('The submission is too large.');
  }

  const type = value['type'];
  if (type !== 'contact' && type !== 'author-pitch') {
    invalid('The submission type is invalid.');
  }

  const company = optionalText(value, 'company', 200);
  if (company) {
    return {isSpam: true, submission: {}, type};
  }

  if (value['privacyConsent'] !== true) {
    invalid('Consent is required before submitting.');
  }

  const email = requiredEmail(value, 'email');
  const name = requiredText(value, 'name', 2, 120);

  if (type === 'contact') {
    requireAllowedKeys(value, [
      'type',
      'name',
      'email',
      'reason',
      'subject',
      'message',
      'privacyConsent',
      'company',
    ]);
    const reason = requiredText(value, 'reason', 2, 40);
    if (!CONTACT_REASONS.has(reason)) {
      invalid('The contact reason is invalid.');
    }

    return {
      isSpam: false,
      type,
      submission: {
        contact: {name, email},
        inquiry: {
          reason,
          subject: requiredText(value, 'subject', 3, 160),
          message: requiredText(value, 'message', 20, 4_000),
        },
      },
    };
  }

  requireAllowedKeys(value, [
    'type',
    'name',
    'email',
    'creditName',
    'location',
    'profileWebsite',
    'currentRole',
    'shortBio',
    'topics',
    'proposedTitle',
    'pitch',
    'references',
    'publishingHistory',
    'creditDetails',
    'originalWorkConfirmation',
    'privacyConsent',
    'company',
  ]);

  if (value['originalWorkConfirmation'] !== true) {
    invalid('The original-work confirmation is required.');
  }

  return {
    isSpam: false,
    type,
    submission: {
      contact: {name, email},
      authorProfile: {
        creditName: requiredText(value, 'creditName', 2, 120),
        location: optionalText(value, 'location', 120),
        profileWebsite: optionalHttpUrl(value, 'profileWebsite'),
        currentRole: optionalText(value, 'currentRole', 160),
        shortBio: requiredText(value, 'shortBio', 40, 600),
        creditDetails: optionalText(value, 'creditDetails', 800),
      },
      proposal: {
        topics: requiredText(value, 'topics', 3, 500),
        proposedTitle: requiredText(value, 'proposedTitle', 5, 180),
        pitch: requiredText(value, 'pitch', 80, 5_000),
        references: optionalText(value, 'references', 3_000),
        publishingHistory: optionalText(value, 'publishingHistory', 3_000),
      },
      originalWorkConfirmed: true,
    },
  };
}

export async function storePublicSubmission(
  firestore: Firestore,
  value: unknown,
  context: PublicSubmissionContext,
  now = new Date()
): Promise<PublicSubmissionResult> {
  const parsed = parsePublicSubmission(value);

  // Honeypot submissions receive the normal success shape without creating review work.
  if (parsed.isSpam) {
    return {accepted: true, referenceId: 'received'};
  }

  const submissionRef = firestore.collection(PUBLIC_SUBMISSIONS_COLLECTION).doc();
  const rateLimitIdentity = createPublicSubmissionRateLimitIdentity(context.actorUid, context.ipAddress);
  const windowId = createHourlyWindowId(now);
  const rateLimitRef = firestore
    .collection(PUBLIC_SUBMISSION_RATE_LIMITS_COLLECTION)
    .doc(rateLimitIdentity);
  const submittedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + (2 * 60 * 60 * 1000));

  // Reuse one opaque identity document and reset its count by UTC window; raw network identifiers never reach Firestore.
  await firestore.runTransaction(async transaction => {
    const rateLimitSnapshot = await transaction.get(rateLimitRef);
    const currentCount = rateLimitSnapshot.exists && rateLimitSnapshot.get('windowId') === windowId
      ? Number(rateLimitSnapshot.get('count') ?? 0)
      : 0;

    if (!Number.isFinite(currentCount) || currentCount < 0 || currentCount >= MAX_SUBMISSIONS_PER_HOUR) {
      throw new HttpsError(
        'resource-exhausted',
        'Too many forms were submitted from this connection. Please try again later.'
      );
    }

    transaction.set(rateLimitRef, {
      count: currentCount + 1,
      windowId,
      updatedAt: submittedAt,
      updatedAtTimestamp: FieldValue.serverTimestamp(),
      expiresAtTimestamp: Timestamp.fromDate(expiresAt),
    }, {merge: false});
    transaction.set(submissionRef, {
      id: submissionRef.id,
      schemaVersion: 1,
      type: parsed.type,
      status: 'new',
      actorUid: context.actorUid,
      ...parsed.submission,
      submittedAt,
      submittedAtTimestamp: FieldValue.serverTimestamp(),
    }, {merge: false});
  });

  return {accepted: true, referenceId: submissionRef.id};
}

export function createPublicSubmissionRateLimitIdentity(
  actorUid: string | null,
  ipAddress: string
): string {
  const normalizedActor = normalizeText(actorUid ?? '') || 'anonymous';
  const normalizedIp = normalizeText(ipAddress) || 'unknown';

  return createHash('sha256')
    .update(`public-submission-v1:${normalizedActor}:${normalizedIp}`)
    .digest('hex');
}

function createHourlyWindowId(now: Date): string {
  return now.toISOString().slice(0, 13).replace(/[-T]/g, '');
}

function requiredEmail(record: Record<string, unknown>, key: string): string {
  const value = requiredText(record, key, 5, 254).toLowerCase();
  if (!EMAIL_PATTERN.test(value)) {
    invalid('A valid email address is required.');
  }

  return value;
}

function optionalHttpUrl(record: Record<string, unknown>, key: string): string | null {
  const value = optionalText(record, key, 500);
  if (!value) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    invalid('Profile website is invalid.');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    invalid('Profile websites must use HTTP or HTTPS.');
  }
  return url.toString();
}

function requiredText(
  record: Record<string, unknown>,
  key: string,
  minLength: number,
  maxLength: number
): string {
  const value = optionalText(record, key, maxLength);
  if (value.length < minLength) {
    invalid(`${key} is required.`);
  }
  return value;
}

function optionalText(record: Record<string, unknown>, key: string, maxLength: number): string {
  const rawValue = record[key];
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return '';
  }
  if (typeof rawValue !== 'string') {
    invalid(`${key} must be text.`);
  }

  const value = normalizeText(rawValue);
  if (value.length > maxLength) {
    invalid(`${key} is too long.`);
  }
  return value;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(CONTROL_CHARACTERS_PATTERN, '')
    .split('\n')
    .map(line => line.replace(/[\t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function requireAllowedKeys(record: Record<string, unknown>, allowedKeys: readonly string[]): void {
  const allowed = new Set(allowedKeys);
  if (Object.keys(record).some(key => !allowed.has(key))) {
    invalid('The submission contains unsupported fields.');
  }
}

function invalid(message: string): never {
  throw new HttpsError('invalid-argument', message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
