import {BlogPost} from '../../../features/blog/models/blog-post.model';

export interface PostOptimizationRecommendation {
  categories?: readonly string[];
  currentTitle: string;
  deployment: string;
  priority: string;
  recommendedMetaDescription: string;
  recommendedSeoTitle: string;
  redirectRequired: boolean;
  stableSlug: string;
  tags?: readonly string[];
}

export interface PostOptimizationManifest {
  auditDate: string;
  posts: readonly PostOptimizationRecommendation[];
  site: string;
}

export interface PostOptimizationManifestMatch {
  post: BlogPost;
  recommendation: PostOptimizationRecommendation;
}

export interface PostOptimizationManifestMatchResult {
  matches: readonly PostOptimizationManifestMatch[];
  unmatchedPosts: readonly BlogPost[];
  unmatchedRecommendations: readonly PostOptimizationRecommendation[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getRequiredString(record: Record<string, unknown>, key: string, index: number): string {
  const value = record[key];

  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Manifest row ${index + 1} is missing ${key}.`);
  }

  return value.trim();
}

function getStringArray(record: Record<string, unknown>, key: string, index: number): readonly string[] {
  const value = record[key];

  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new Error(`Manifest row ${index + 1} must provide ${key} as a string array.`);
  }

  return [...new Set(value.map(item => item.trim()).filter(Boolean))];
}

function getOptionalStringArray(
  record: Record<string, unknown>,
  key: string,
  index: number
): readonly string[] | undefined {
  return record[key] === undefined ? undefined : getStringArray(record, key, index);
}

export function parsePostOptimizationManifest(value: unknown): PostOptimizationManifest {
  if (!isRecord(value) || !Array.isArray(value['posts'])) {
    throw new Error('Optimization manifest must contain a posts array.');
  }

  const slugs = new Set<string>();
  const posts = value['posts'].map((row, index): PostOptimizationRecommendation => {
    if (!isRecord(row)) {
      throw new Error(`Manifest row ${index + 1} must be an object.`);
    }

    const stableSlug = getRequiredString(row, 'stableSlug', index);
    if (slugs.has(stableSlug)) {
      throw new Error(`Manifest contains duplicate stable slug: ${stableSlug}.`);
    }
    slugs.add(stableSlug);

    return {
      stableSlug,
      currentTitle: getRequiredString(row, 'currentTitle', index),
      recommendedSeoTitle: getRequiredString(row, 'recommendedSeoTitle', index),
      recommendedMetaDescription: getRequiredString(row, 'recommendedMetaDescription', index),
      categories: getOptionalStringArray(row, 'categories', index),
      tags: getOptionalStringArray(row, 'tags', index),
      deployment: typeof row['deployment'] === 'string' ? row['deployment'] : 'unknown',
      priority: typeof row['priority'] === 'string' ? row['priority'] : 'unprioritized',
      redirectRequired: row['redirectRequired'] === true,
    };
  });

  return {
    auditDate: typeof value['auditDate'] === 'string' ? value['auditDate'] : '',
    site: typeof value['site'] === 'string' ? value['site'] : '',
    posts,
  };
}

export function matchOptimizationManifest(
  manifest: PostOptimizationManifest,
  posts: readonly BlogPost[]
): PostOptimizationManifestMatchResult {
  const postsBySlug = new Map(posts.map(post => [post.slug, post]));
  const matchedPostIds = new Set<string>();
  const matches: PostOptimizationManifestMatch[] = [];
  const unmatchedRecommendations: PostOptimizationRecommendation[] = [];

  for (const recommendation of manifest.posts) {
    const post = postsBySlug.get(recommendation.stableSlug);

    if (!post) {
      unmatchedRecommendations.push(recommendation);
      continue;
    }

    matchedPostIds.add(post.id);
    matches.push({post, recommendation});
  }

  return {
    matches,
    unmatchedPosts: posts.filter(post => !matchedPostIds.has(post.id)),
    unmatchedRecommendations,
  };
}

export function applyOptimizationRecommendation(
  post: BlogPost,
  recommendation: PostOptimizationRecommendation
): BlogPost {
  return {
    ...post,
    ...(recommendation.categories !== undefined ? {categories: [...recommendation.categories]} : {}),
    ...(recommendation.tags !== undefined ? {tags: [...recommendation.tags]} : {}),
    seo: {
      ...post.seo,
      title: recommendation.recommendedSeoTitle,
      description: recommendation.recommendedMetaDescription,
    },
  };
}
