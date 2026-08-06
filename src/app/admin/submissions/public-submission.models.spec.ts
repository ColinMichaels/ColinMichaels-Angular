import {
  getPublicSubmissionSearchText,
  getPublicSubmissionSummary,
  normalizePublicSubmission,
} from './public-submission.models';

describe('public submission models', () => {
  it('normalizes a contact submission and projects searchable private content', () => {
    const submission = normalizePublicSubmission('submission-1', {
      type: 'contact',
      status: 'in-review',
      submittedAt: '2026-08-05T12:00:00.000Z',
      contact: {name: 'Reader Name', email: 'reader@example.com'},
      inquiry: {reason: 'project', subject: 'Project question', message: 'A detailed project message.'},
      alertDelivery: {status: 'sent', sentAt: '2026-08-05T12:01:00.000Z'},
    });

    expect(submission).not.toBeNull();
    expect(submission?.status).toBe('in-review');
    expect(getPublicSubmissionSummary(submission!)).toBe('Project question');
    expect(getPublicSubmissionSearchText(submission!)).toContain('detailed project message');
    expect(submission?.alertDelivery?.status).toBe('sent');
  });

  it('rejects records missing the backend-owned submission contract', () => {
    expect(normalizePublicSubmission('submission-1', {type: 'contact'})).toBeNull();
    expect(normalizePublicSubmission('submission-2', {type: 'unknown'})).toBeNull();
  });
});
