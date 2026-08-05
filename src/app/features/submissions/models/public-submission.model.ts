export type PublicSubmissionType = 'contact' | 'author-pitch';

interface PublicSubmissionBase {
  name: string;
  email: string;
  privacyConsent: true;
  company: string;
}

export interface ContactSubmissionRequest extends PublicSubmissionBase {
  type: 'contact';
  reason: 'general' | 'project' | 'correction' | 'media' | 'privacy' | 'other';
  subject: string;
  message: string;
}

export interface AuthorPitchSubmissionRequest extends PublicSubmissionBase {
  type: 'author-pitch';
  creditName: string;
  location: string;
  profileWebsite: string;
  currentRole: string;
  shortBio: string;
  topics: string;
  proposedTitle: string;
  pitch: string;
  references: string;
  publishingHistory: string;
  creditDetails: string;
  originalWorkConfirmation: true;
}

export type PublicSubmissionRequest = ContactSubmissionRequest | AuthorPitchSubmissionRequest;

export interface PublicSubmissionResult {
  accepted: true;
  referenceId: string;
}
