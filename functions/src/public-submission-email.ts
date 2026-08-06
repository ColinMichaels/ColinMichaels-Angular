import nodemailer = require('nodemailer');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEADER_WHITESPACE_PATTERN = /[\r\n\t ]+/g;
const CONTROL_CHARACTERS_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g;

export type PublicSubmissionStatus = 'new' | 'in-review' | 'responded' | 'archived' | 'rejected';
export type PublicSubmissionReviewAction = 'start-review' | 'archive' | 'reject' | 'restore';

export interface StoredPublicSubmission {
  id: string;
  type: 'contact' | 'author-pitch';
  status: PublicSubmissionStatus;
  submittedAt: string;
  contact: {
    name: string;
    email: string;
  };
  inquiry?: {
    reason: string;
    subject: string;
    message: string;
  };
  authorProfile?: {
    creditName: string;
    location: string;
    profileWebsite: string;
    currentRole: string;
    shortBio: string;
    creditDetails: string;
  };
  proposal?: {
    topics: string;
    proposedTitle: string;
    pitch: string;
    references: string;
    publishingHistory: string;
  };
}

export interface PublicSubmissionEmailMessage {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
  messageId: string;
}

export interface PublicSubmissionSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

export interface PublicSubmissionResponseRequest {
  submissionId: string;
  requestId: string;
  subject: string;
  message: string;
}

export interface PublicSubmissionReviewRequest {
  submissionId: string;
  action: PublicSubmissionReviewAction;
}

export function parseStoredPublicSubmission(id: string, value: unknown): StoredPublicSubmission {
  const record = requireRecord(value, 'Stored submission is invalid.');
  const type = record['type'];
  const status = parseSubmissionStatus(record['status']);
  const contact = requireRecord(record['contact'], 'Stored submission contact is invalid.');
  const name = requiredText(contact['name'], 2, 120, 'Stored submission name is invalid.');
  const email = requiredEmail(contact['email']);
  const submittedAt = requiredText(record['submittedAt'], 10, 80, 'Stored submission date is invalid.');

  if (type === 'contact') {
    const inquiry = requireRecord(record['inquiry'], 'Stored contact inquiry is invalid.');
    return {
      id,
      type,
      status,
      submittedAt,
      contact: {name, email},
      inquiry: {
        reason: requiredText(inquiry['reason'], 2, 40, 'Stored contact reason is invalid.'),
        subject: requiredText(inquiry['subject'], 3, 160, 'Stored contact subject is invalid.'),
        message: requiredText(inquiry['message'], 20, 4_000, 'Stored contact message is invalid.'),
      },
    };
  }

  if (type === 'author-pitch') {
    const authorProfile = requireRecord(record['authorProfile'], 'Stored author profile is invalid.');
    const proposal = requireRecord(record['proposal'], 'Stored author proposal is invalid.');
    return {
      id,
      type,
      status,
      submittedAt,
      contact: {name, email},
      authorProfile: {
        creditName: requiredText(authorProfile['creditName'], 2, 120, 'Stored author credit is invalid.'),
        location: optionalText(authorProfile['location'], 120),
        profileWebsite: optionalText(authorProfile['profileWebsite'], 500),
        currentRole: optionalText(authorProfile['currentRole'], 160),
        shortBio: requiredText(authorProfile['shortBio'], 40, 600, 'Stored author biography is invalid.'),
        creditDetails: optionalText(authorProfile['creditDetails'], 800),
      },
      proposal: {
        topics: requiredText(proposal['topics'], 3, 500, 'Stored proposal topics are invalid.'),
        proposedTitle: requiredText(proposal['proposedTitle'], 5, 180, 'Stored proposal title is invalid.'),
        pitch: requiredText(proposal['pitch'], 80, 5_000, 'Stored proposal pitch is invalid.'),
        references: optionalText(proposal['references'], 3_000),
        publishingHistory: optionalText(proposal['publishingHistory'], 3_000),
      },
    };
  }

  throw new Error('Stored submission type is invalid.');
}

export function parsePublicSubmissionReviewRequest(value: unknown): PublicSubmissionReviewRequest {
  const record = requireRecord(value, 'Submission review request must be an object.');
  const submissionId = requiredIdentifier(record['submissionId'], 'Submission id is required.');
  const action = record['action'];

  if (action !== 'start-review' && action !== 'archive' && action !== 'reject' && action !== 'restore') {
    throw new Error('Unsupported submission review action.');
  }

  return {submissionId, action};
}

export function parsePublicSubmissionResponseRequest(value: unknown): PublicSubmissionResponseRequest {
  const record = requireRecord(value, 'Submission response request must be an object.');
  const subject = normalizeText(record['subject']);
  const message = normalizeText(record['message']);

  if (subject.length < 3 || subject.length > 160 || /[\r\n]/.test(subject)) {
    throw new Error('Response subject must be a single line between 3 and 160 characters.');
  }
  if (message.length < 10 || message.length > 5_000) {
    throw new Error('Response message must be between 10 and 5,000 characters.');
  }

  return {
    submissionId: requiredIdentifier(record['submissionId'], 'Submission id is required.'),
    requestId: requiredIdentifier(record['requestId'], 'Response request id is required.'),
    subject,
    message,
  };
}

export function getNextPublicSubmissionStatus(
  currentStatus: PublicSubmissionStatus,
  action: PublicSubmissionReviewAction
): PublicSubmissionStatus {
  switch (action) {
    case 'start-review':
      if (currentStatus !== 'new') {
        throw new Error('Only new submissions can be moved into review.');
      }
      return 'in-review';
    case 'archive':
      if (currentStatus === 'archived') {
        throw new Error('This submission is already archived.');
      }
      return 'archived';
    case 'reject':
      if (currentStatus === 'rejected') {
        throw new Error('This submission is already rejected.');
      }
      return 'rejected';
    case 'restore':
      if (currentStatus !== 'archived' && currentStatus !== 'rejected') {
        throw new Error('Only archived or rejected submissions can be restored.');
      }
      return 'in-review';
  }
}

export function createPublicSubmissionAlertEmail(options: {
  submission: StoredPublicSubmission;
  adminUrl: string;
  alertTo: string;
  from: string;
  eventId: string;
}): PublicSubmissionEmailMessage {
  const {submission} = options;
  const typeLabel = submission.type === 'contact' ? 'contact message' : 'author proposal';
  const summary = getPublicSubmissionSummary(submission);
  const subject = sanitizeHeader(`New ${typeLabel} from ${submission.contact.name}`);
  const adminUrl = new URL(options.adminUrl);
  adminUrl.searchParams.set('submission', submission.id);
  const safeUrl = adminUrl.toString();
  const submittedLabel = formatSubmittedAt(submission.submittedAt);

  return {
    to: requiredEmail(options.alertTo),
    from: sanitizeHeader(options.from),
    replyTo: submission.contact.email,
    subject,
    messageId: createMessageId(`submission-alert-${options.eventId}`),
    text: [
      `A new ${typeLabel} was received.`,
      '',
      `From: ${submission.contact.name} <${submission.contact.email}>`,
      `Received: ${submittedLabel}`,
      `Summary: ${summary}`,
      `Reference: ${submission.id}`,
      '',
      `Review securely: ${safeUrl}`,
      '',
      'The full submission is intentionally kept out of email and remains in the protected admin inbox.',
    ].join('\n'),
    html: [
      '<p>A new ' + escapeHtml(typeLabel) + ' was received.</p>',
      '<dl>',
      `<dt><strong>From</strong></dt><dd>${escapeHtml(submission.contact.name)} &lt;${escapeHtml(submission.contact.email)}&gt;</dd>`,
      `<dt><strong>Received</strong></dt><dd>${escapeHtml(submittedLabel)}</dd>`,
      `<dt><strong>Summary</strong></dt><dd>${escapeHtml(summary)}</dd>`,
      `<dt><strong>Reference</strong></dt><dd>${escapeHtml(submission.id)}</dd>`,
      '</dl>',
      `<p><a href="${escapeHtml(safeUrl)}">Review this submission securely</a></p>`,
      '<p>The full submission is intentionally kept out of email and remains in the protected admin inbox.</p>',
    ].join(''),
  };
}

export function createPublicSubmissionResponseEmail(options: {
  submission: StoredPublicSubmission;
  request: PublicSubmissionResponseRequest;
  from: string;
}): PublicSubmissionEmailMessage {
  const bodyHtml = options.request.message
    .split('\n\n')
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');

  return {
    to: options.submission.contact.email,
    from: sanitizeHeader(options.from),
    replyTo: sanitizeHeader(options.from),
    subject: sanitizeHeader(options.request.subject),
    messageId: createMessageId(`submission-response-${options.submission.id}-${options.request.requestId}`),
    text: options.request.message,
    html: bodyHtml,
  };
}

export async function sendPublicSubmissionEmail(
  smtp: PublicSubmissionSmtpConfig,
  message: PublicSubmissionEmailMessage
): Promise<{ messageId: string }> {
  validateSmtpConfig(smtp);
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.username,
      pass: smtp.password,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  const result = await transporter.sendMail(message);

  return {messageId: String(result.messageId || message.messageId)};
}

export function parseSubmissionStatus(value: unknown): PublicSubmissionStatus {
  return value === 'in-review'
  || value === 'responded'
  || value === 'archived'
  || value === 'rejected'
    ? value
    : 'new';
}

export function getPublicSubmissionSummary(submission: StoredPublicSubmission): string {
  return submission.type === 'contact'
    ? submission.inquiry?.subject ?? 'Contact message'
    : submission.proposal?.proposedTitle ?? 'Author proposal';
}

function validateSmtpConfig(config: PublicSubmissionSmtpConfig): void {
  if (!config.host.trim() || !Number.isInteger(config.port) || config.port < 1 || config.port > 65_535) {
    throw new Error('Submission email SMTP host or port is invalid.');
  }
  if (!config.username.trim() || !config.password) {
    throw new Error('Submission email SMTP credentials are not configured.');
  }
}

function requiredEmail(value: unknown): string {
  const email = normalizeText(value).toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    throw new Error('Submission email address is invalid.');
  }
  return email;
}

function requiredIdentifier(value: unknown, message: string): string {
  const identifier = normalizeText(value);
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(identifier)) {
    throw new Error(message);
  }
  return identifier;
}

function requiredText(value: unknown, min: number, max: number, message: string): string {
  const text = normalizeText(value);
  if (text.length < min || text.length > max) {
    throw new Error(message);
  }
  return text;
}

function optionalText(value: unknown, max: number): string {
  const text = normalizeText(value);
  if (text.length > max) {
    throw new Error('Stored submission text is invalid.');
  }
  return text;
}

function normalizeText(value: unknown): string {
  return typeof value === 'string'
    ? value
      .normalize('NFKC')
      .replace(CONTROL_CHARACTERS_PATTERN, '')
      .split('\n')
      .map(line => line.replace(/[\t ]+/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    : '';
}

function sanitizeHeader(value: string): string {
  const header = value.replace(CONTROL_CHARACTERS_PATTERN, '').replace(HEADER_WHITESPACE_PATTERN, ' ').trim();
  if (!header) {
    throw new Error('Submission email header is invalid.');
  }
  return header;
}

function createMessageId(value: string): string {
  const localPart = value.replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 180);
  return `<${localPart}@colinmichaels.com>`;
}

function formatSubmittedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-US', {timeZone: 'America/New_York'});
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(message);
  }
  return value as Record<string, unknown>;
}
