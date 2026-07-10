import {BlogPost} from '../../../features/blog/models/blog-post.model';
import {isBlogPost} from '../../../features/blog/utils/blog-validation.util';
import {
  CmsContentOperationWorkingItem,
  ContentArtifactDescriptor,
  ContentOperationCapability,
  ContentOperationFieldDiff,
  ContentOperationGuardProjection,
  ContentOperationPreviewItem,
} from './content-operations.models';

export const CMS_POST_ARTIFACT_ADAPTER_VERSION = 'blog-post-adapter-v1';

const encoder = new TextEncoder();

function clonePost(post: BlogPost): BlogPost {
  return JSON.parse(JSON.stringify(post)) as BlogPost;
}

function equalValues(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function createProtectedProjection(post: BlogPost): unknown {
  const {categories: _categories, tags: _tags, seo, ...protectedPost} = post;
  const {title: _seoTitle, description: _seoDescription, ...protectedSeo} = seo;

  void _categories;
  void _tags;
  void _seoTitle;
  void _seoDescription;

  return {
    ...protectedPost,
    seo: protectedSeo,
  };
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map(value => value.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('SHA-256 artifact hashing is unavailable in this browser.');
  }

  return toHex(await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

export function serializeCmsPostArtifact(post: BlogPost): string {
  return JSON.stringify(post);
}

export function parseCmsPostArtifact(json: string): BlogPost {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Post artifact is not valid JSON.');
  }

  if (!isBlogPost(parsed) || parsed.contentFormat !== 'editorjs') {
    throw new Error('Post artifact does not match the current CMS post contract.');
  }

  return parsed;
}

export function extractContentOperationGuardProjection(post: BlogPost): ContentOperationGuardProjection {
  return {
    canonical: post.seo.canonical?.trim() ?? '',
    coverImage: post.coverImage,
    createdAt: post.createdAt,
    postId: post.id,
    publishedAt: post.publishedAt,
    slug: post.slug,
    status: post.status,
    thumbnailImage: post.thumbnailImage ?? '',
    updatedAt: post.updatedAt,
  };
}

export function diffCmsPostArtifacts(base: BlogPost, candidate: BlogPost): readonly ContentOperationFieldDiff[] {
  const diffs: ContentOperationFieldDiff[] = [];

  if (base.seo.title !== candidate.seo.title) {
    diffs.push({
      path: 'seo.title',
      label: 'SEO title',
      capability: 'seo-metadata',
      before: base.seo.title,
      after: candidate.seo.title,
    });
  }

  if (base.seo.description !== candidate.seo.description) {
    diffs.push({
      path: 'seo.description',
      label: 'Meta description',
      capability: 'seo-metadata',
      before: base.seo.description,
      after: candidate.seo.description,
    });
  }

  if (!equalValues(base.categories, candidate.categories)) {
    diffs.push({
      path: 'categories',
      label: 'Categories',
      capability: 'taxonomy',
      before: base.categories,
      after: candidate.categories,
    });
  }

  if (!equalValues(base.tags, candidate.tags)) {
    diffs.push({
      path: 'tags',
      label: 'Tags',
      capability: 'taxonomy',
      before: base.tags,
      after: candidate.tags,
    });
  }

  return diffs;
}

export function createCmsWorkingItem(
  base: BlogPost,
  candidate: BlogPost = base,
  options: {redirectRequired?: boolean; source?: CmsContentOperationWorkingItem['source']} = {}
): CmsContentOperationWorkingItem {
  return {
    baseDocument: clonePost(base),
    candidateDocument: clonePost(candidate),
    preview: null,
    redirectRequired: options.redirectRequired ?? false,
    source: options.source ?? 'manual',
  };
}

export async function createContentOperationPreviewItem(
  workingItem: CmsContentOperationWorkingItem,
  allowedCapabilities: readonly ContentOperationCapability[] = ['seo-metadata', 'taxonomy']
): Promise<ContentOperationPreviewItem> {
  const baseJson = serializeCmsPostArtifact(workingItem.baseDocument);
  const candidateJson = serializeCmsPostArtifact(workingItem.candidateDocument);
  const baseDocument = parseCmsPostArtifact(baseJson);
  const candidateDocument = parseCmsPostArtifact(candidateJson);
  const diffs = diffCmsPostArtifacts(baseDocument, candidateDocument);
  const errors: string[] = [];
  const warnings: string[] = [];
  const protectedFieldsUnchanged = equalValues(
    createProtectedProjection(baseDocument),
    createProtectedProjection(candidateDocument)
  );
  const changedCapabilities = [...new Set(diffs.map(diff => diff.capability))];

  if (!protectedFieldsUnchanged) {
    errors.push('The candidate changed one or more protected fields outside the allowed capability set.');
  }

  const disallowedCapabilities = changedCapabilities.filter(capability => !allowedCapabilities.includes(capability));
  if (disallowedCapabilities.length > 0) {
    errors.push(`Candidate requires disallowed capabilities: ${disallowedCapabilities.join(', ')}.`);
  }

  if (workingItem.redirectRequired) {
    errors.push('This recommendation requires redirect safeguards and is blocked from the metadata-only review.');
  }

  if (diffs.length === 0) {
    warnings.push('Candidate has no changes to review.');
  }

  if (candidateDocument.seo.title.trim().length > 60) {
    warnings.push('SEO title is longer than 60 characters.');
  }

  const descriptionLength = candidateDocument.seo.description.trim().length;
  if (descriptionLength > 0 && (descriptionLength < 120 || descriptionLength > 160)) {
    warnings.push('Meta description is outside the preferred 120-160 character range.');
  }

  const [baseArtifact, candidateArtifact] = await Promise.all([
    createDescriptor(baseDocument, baseJson, 'base'),
    createDescriptor(candidateDocument, candidateJson, 'candidate'),
  ]);

  return {
    postId: baseDocument.id,
    baseArtifact,
    candidateArtifact,
    baseGuard: extractContentOperationGuardProjection(baseDocument),
    candidateGuard: extractContentOperationGuardProjection(candidateDocument),
    diffs,
    selected: true,
    source: workingItem.source,
    status: errors.length > 0 ? 'blocked' : 'validated',
    validation: {
      changedCapabilities,
      errors,
      warnings,
      protectedFieldsUnchanged,
    },
  };
}

async function createDescriptor(
  post: BlogPost,
  json: string,
  role: 'base' | 'candidate'
): Promise<ContentArtifactDescriptor> {
  const hash = await sha256(json);

  return {
    artifactId: `post-json_${role}_${post.id}_${hash.slice(0, 16)}`,
    adapterVersion: CMS_POST_ARTIFACT_ADAPTER_VERSION,
    byteLength: encoder.encode(json).byteLength,
    declaredContractVersion: post.contentFormat,
    mediaType: 'application/json',
    sha256: hash,
  };
}
