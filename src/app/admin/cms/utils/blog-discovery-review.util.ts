import {BlogPost} from '../../../features/blog/models/blog-post.model';
import {analyzeBlogContentTrustSignals} from './blog-content-trust-signals.util';
import {createBlogEvidenceReview} from './blog-evidence-review.util';

export type BlogDiscoveryReviewState = 'needs-review' | 'ready';
export type BlogDiscoveryReviewSeverity = 'required' | 'recommended';

export interface BlogDiscoveryReviewIssue {
  id: 'evidence' | 'external-references' | 'contextual-article-link' | 'supporting-evidence';
  severity: BlogDiscoveryReviewSeverity;
  label: string;
  detail: string;
}

export interface BlogDiscoveryReview {
  state: BlogDiscoveryReviewState;
  label: string;
  detail: string;
  issues: readonly BlogDiscoveryReviewIssue[];
  needsReview: boolean;
  publishedPriority: boolean;
  requiredIssueCount: number;
  recommendationCount: number;
  priorityScore: number;
}

const SOURCE_DEPENDENT_EVIDENCE = new Set([
  'researched',
  'manufacturer-supplied',
  'mixed',
]);

export function createBlogDiscoveryReview(post: BlogPost): BlogDiscoveryReview {
  const evidence = createBlogEvidenceReview(post);
  const signals = analyzeBlogContentTrustSignals(post.blocks, post.slug);
  const issues: BlogDiscoveryReviewIssue[] = [];

  if (evidence.needsReview) {
    issues.push({
      id: 'evidence',
      severity: 'required',
      label: evidence.label,
      detail: evidence.detail,
    });
  }

  const evidenceBasis = post.editorial?.evidenceBasis;
  const sourceDependent = Boolean(
    evidenceBasis && SOURCE_DEPENDENT_EVIDENCE.has(evidenceBasis)
  );

  if (
    signals.externalReferenceUrls.length === 0
    && (sourceDependent || signals.hasSourcesHeading)
  ) {
    issues.push({
      id: 'external-references',
      severity: 'required',
      label: 'Needs usable source links',
      detail: signals.hasSourcesHeading
        ? 'A Sources or References section is present, but it has no usable external URL.'
        : 'This source-dependent evidence basis needs at least one descriptive external reference.',
    });
  }

  if (signals.contextualArticleUrls.length === 0) {
    issues.push({
      id: 'contextual-article-link',
      severity: 'recommended',
      label: 'Needs a contextual next read',
      detail: 'Add one in-body ColinMichaels article link only when it genuinely advances the reader’s question.',
    });
  }

  if (signals.supportingArtifactCount === 0) {
    issues.push({
      id: 'supporting-evidence',
      severity: 'recommended',
      label: 'Needs supporting evidence',
      detail: 'Add a relevant original image, video, screenshot, measurement, table, code sample, or other useful artifact when available.',
    });
  }

  const requiredIssueCount = issues.filter(issue => issue.severity === 'required').length;
  const recommendationCount = issues.length - requiredIssueCount;
  const needsReview = issues.length > 0;
  const publishedPriority = post.status === 'published' && needsReview;
  const primaryIssue = issues.find(issue => issue.severity === 'required') ?? issues[0];

  return {
    state: needsReview ? 'needs-review' : 'ready',
    label: primaryIssue?.label ?? 'Discovery-ready',
    detail: needsReview
      ? `${issues.length} review item${issues.length === 1 ? '' : 's'}: ${issues.map(issue => issue.label).join('; ')}.`
      : 'Evidence, usable sources when required, contextual continuation, and supporting material are present.',
    issues,
    needsReview,
    publishedPriority,
    requiredIssueCount,
    recommendationCount,
    priorityScore: (publishedPriority ? 1000 : 0) + (requiredIssueCount * 100) + recommendationCount,
  };
}
