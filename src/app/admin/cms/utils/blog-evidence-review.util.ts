import {BlogPost} from '../../../features/blog/models/blog-post.model';
import {
  BLOG_EVIDENCE_BASIS_LABELS,
  isBlogEditorialSourceDate,
} from '../../../features/blog/utils/blog-editorial-metadata.util';

export type BlogEvidenceReviewState = 'unclassified' | 'incomplete' | 'reviewed';

export interface BlogEvidenceReview {
  state: BlogEvidenceReviewState;
  label: string;
  detail: string;
  needsReview: boolean;
  publishedPriority: boolean;
}

const SOURCE_DEPENDENT_EVIDENCE = new Set([
  'researched',
  'manufacturer-supplied',
  'mixed',
]);

export function createBlogEvidenceReview(post: BlogPost): BlogEvidenceReview {
  const evidenceBasis = post.editorial?.evidenceBasis;
  const publishedPriority = post.status === 'published';

  if (!evidenceBasis) {
    return {
      state: 'unclassified',
      label: 'Needs classification',
      detail: publishedPriority
        ? 'Published article currently shows the legacy Not yet classified notice.'
        : 'Choose an evidence basis before this article moves toward publication.',
      needsReview: true,
      publishedPriority,
    };
  }

  if (!post.editorial?.evidenceSummary?.trim()) {
    return {
      state: 'incomplete',
      label: 'Needs evidence summary',
      detail: `Explain the article-specific boundary for ${BLOG_EVIDENCE_BASIS_LABELS[evidenceBasis].toLowerCase()}.`,
      needsReview: true,
      publishedPriority,
    };
  }

  if (
    SOURCE_DEPENDENT_EVIDENCE.has(evidenceBasis)
    && !isBlogEditorialSourceDate(post.editorial.sourceReviewedAt)
  ) {
    return {
      state: 'incomplete',
      label: 'Needs source date',
      detail: 'Record when the source-dependent evidence was last checked.',
      needsReview: true,
      publishedPriority,
    };
  }

  return {
    state: 'reviewed',
    label: BLOG_EVIDENCE_BASIS_LABELS[evidenceBasis],
    detail: post.editorial.sourceReviewedAt
      ? `Sources checked ${post.editorial.sourceReviewedAt}.`
      : 'Article-specific evidence details are present.',
    needsReview: false,
    publishedPriority: false,
  };
}
