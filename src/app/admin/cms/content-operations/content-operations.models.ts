import {BlogPost, BlogPostStatus} from '../../../features/blog/models/blog-post.model';

export const CONTENT_OPERATION_CAPABILITIES = [
  'seo-metadata',
  'taxonomy',
] as const;

export type ContentOperationCapability = typeof CONTENT_OPERATION_CAPABILITIES[number];

export type ContentOperationFieldPath =
  | 'seo.title'
  | 'seo.description'
  | 'categories'
  | 'tags';

export type ContentOperationPreviewStatus = 'proposed' | 'validated' | 'blocked';

export interface ContentArtifactDescriptor {
  artifactId: string;
  adapterVersion: string;
  byteLength: number;
  declaredContractVersion: string;
  mediaType: 'application/json';
  sha256: string;
}

export interface ContentOperationGuardProjection {
  canonical: string;
  coverImage: string;
  createdAt: string;
  postId: string;
  publishedAt: string | null;
  slug: string;
  status: BlogPostStatus;
  thumbnailImage: string;
  updatedAt: string;
}

export interface ContentOperationFieldDiff {
  after: string | readonly string[];
  before: string | readonly string[];
  capability: ContentOperationCapability;
  label: string;
  path: ContentOperationFieldPath;
}

export interface ContentOperationValidationResult {
  changedCapabilities: readonly ContentOperationCapability[];
  errors: readonly string[];
  protectedFieldsUnchanged: boolean;
  warnings: readonly string[];
}

export interface ContentOperationPreviewItem {
  baseArtifact: ContentArtifactDescriptor;
  baseGuard: ContentOperationGuardProjection;
  candidateArtifact: ContentArtifactDescriptor;
  candidateGuard: ContentOperationGuardProjection;
  diffs: readonly ContentOperationFieldDiff[];
  postId: string;
  selected: boolean;
  source: 'manual' | 'optimization-manifest';
  status: ContentOperationPreviewStatus;
  validation: ContentOperationValidationResult;
}

export interface CmsContentOperationWorkingItem {
  baseDocument: BlogPost;
  candidateDocument: BlogPost;
  preview: ContentOperationPreviewItem | null;
  redirectRequired: boolean;
  source: 'manual' | 'optimization-manifest';
}

export interface ContentOperationPostAudit {
  failCount: number;
  issueCount: number;
  issueIds: readonly string[];
  status: 'ok' | 'warning' | 'fail';
  warningCount: number;
}

export type ContentOperationAuditFilter =
  | 'all'
  | 'any-issue'
  | 'missing-title'
  | 'missing-description'
  | 'missing-alt';

export type ContentOperationStatusFilter = 'all' | BlogPostStatus;
