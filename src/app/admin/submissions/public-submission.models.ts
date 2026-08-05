export type PublicSubmissionType = 'contact' | 'author-pitch';
export type PublicSubmissionStatus = 'new' | 'in-review' | 'responded' | 'archived' | 'rejected';
export type PublicSubmissionReviewAction = 'start-review' | 'archive' | 'reject' | 'restore';

export const PUBLIC_SUBMISSION_STATUSES: readonly PublicSubmissionStatus[] = [
  'new',
  'in-review',
  'responded',
  'archived',
  'rejected',
];

export interface PublicSubmissionContact {
  name: string;
  email: string;
}

export interface PublicSubmissionInquiry {
  reason: string;
  subject: string;
  message: string;
}

export interface PublicSubmissionAuthorProfile {
  creditName: string;
  location: string;
  profileWebsite: string;
  currentRole: string;
  shortBio: string;
  creditDetails: string;
}

export interface PublicSubmissionProposal {
  topics: string;
  proposedTitle: string;
  pitch: string;
  references: string;
  publishingHistory: string;
}

export interface PublicSubmissionAlertDelivery {
  status: 'sending' | 'sent' | 'failed';
  attemptedAt: string;
  sentAt: string;
  failedAt: string;
}

export interface PublicSubmission {
  id: string;
  type: PublicSubmissionType;
  status: PublicSubmissionStatus;
  submittedAt: string;
  updatedAt: string;
  contact: PublicSubmissionContact;
  inquiry: PublicSubmissionInquiry | null;
  authorProfile: PublicSubmissionAuthorProfile | null;
  proposal: PublicSubmissionProposal | null;
  alertDelivery: PublicSubmissionAlertDelivery | null;
}

export interface PublicSubmissionReviewResult {
  submissionId: string;
  status: PublicSubmissionStatus;
  updatedAt: string;
}

export interface PublicSubmissionResponseResult {
  submissionId: string;
  status: 'responded';
  responseId: string;
  messageId: string;
}

export function normalizePublicSubmission(id: string, value: unknown): PublicSubmission | null {
  const record = asRecord(value);
  const contact = asRecord(record?.['contact']);
  const type = record?.['type'];
  const name = getString(contact?.['name']);
  const email = getString(contact?.['email']);
  const submittedAt = getString(record?.['submittedAt']);

  if (!record || (type !== 'contact' && type !== 'author-pitch') || !name || !email || !submittedAt) {
    return null;
  }

  return {
    id,
    type,
    status: normalizePublicSubmissionStatus(record['status']),
    submittedAt,
    updatedAt: getString(record['updatedAt']) || submittedAt,
    contact: {name, email},
    inquiry: normalizeInquiry(record['inquiry']),
    authorProfile: normalizeAuthorProfile(record['authorProfile']),
    proposal: normalizeProposal(record['proposal']),
    alertDelivery: normalizeAlertDelivery(record['alertDelivery']),
  };
}

export function normalizePublicSubmissionStatus(value: unknown): PublicSubmissionStatus {
  return value === 'in-review' || value === 'responded' || value === 'archived' || value === 'rejected'
    ? value
    : 'new';
}

export function getPublicSubmissionSummary(submission: PublicSubmission): string {
  return submission.type === 'contact'
    ? submission.inquiry?.subject || 'Contact message'
    : submission.proposal?.proposedTitle || 'Author proposal';
}

export function getPublicSubmissionSearchText(submission: PublicSubmission): string {
  return [
    submission.id,
    submission.type,
    submission.status,
    submission.contact.name,
    submission.contact.email,
    submission.inquiry?.reason,
    submission.inquiry?.subject,
    submission.inquiry?.message,
    submission.authorProfile?.creditName,
    submission.authorProfile?.location,
    submission.authorProfile?.currentRole,
    submission.authorProfile?.shortBio,
    submission.proposal?.topics,
    submission.proposal?.proposedTitle,
    submission.proposal?.pitch,
  ].filter(Boolean).join(' ').toLowerCase();
}

function normalizeInquiry(value: unknown): PublicSubmissionInquiry | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  return {
    reason: getString(record['reason']),
    subject: getString(record['subject']),
    message: getString(record['message']),
  };
}

function normalizeAuthorProfile(value: unknown): PublicSubmissionAuthorProfile | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  return {
    creditName: getString(record['creditName']),
    location: getString(record['location']),
    profileWebsite: getString(record['profileWebsite']),
    currentRole: getString(record['currentRole']),
    shortBio: getString(record['shortBio']),
    creditDetails: getString(record['creditDetails']),
  };
}

function normalizeProposal(value: unknown): PublicSubmissionProposal | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  return {
    topics: getString(record['topics']),
    proposedTitle: getString(record['proposedTitle']),
    pitch: getString(record['pitch']),
    references: getString(record['references']),
    publishingHistory: getString(record['publishingHistory']),
  };
}

function normalizeAlertDelivery(value: unknown): PublicSubmissionAlertDelivery | null {
  const record = asRecord(value);
  const status = record?.['status'];
  if (!record || (status !== 'sending' && status !== 'sent' && status !== 'failed')) {
    return null;
  }
  return {
    status,
    attemptedAt: getString(record['attemptedAt']),
    sentAt: getString(record['sentAt']),
    failedAt: getString(record['failedAt']),
  };
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}
