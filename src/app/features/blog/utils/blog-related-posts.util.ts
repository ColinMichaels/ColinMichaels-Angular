import {BlogPostSummary} from '../models/blog-post.model';
import {getBlogTaxonomyTerms} from './blog-category-url.util';

function normalizedTerms(values: readonly string[] | undefined): Set<string> {
  return new Set((values ?? []).map(value => value.trim().toLowerCase()).filter(Boolean));
}

function matchingTermCount(left: readonly string[] | undefined, right: readonly string[] | undefined): number {
  const rightTerms = normalizedTerms(right);
  return [...normalizedTerms(left)].filter(term => rightTerms.has(term)).length;
}

function relatedPostScore(post: BlogPostSummary, currentPost: BlogPostSummary): number {
  const postTaxonomy = getBlogTaxonomyTerms(post);
  const currentTaxonomy = getBlogTaxonomyTerms(currentPost);
  const primaryTerm = currentTaxonomy[0]?.trim().toLowerCase();
  const primaryMatch = primaryTerm && normalizedTerms(postTaxonomy).has(primaryTerm) ? 1 : 0;
  const sharedTaxonomyCount = matchingTermCount(postTaxonomy, currentTaxonomy);

  return primaryMatch * 100
    + Math.max(0, sharedTaxonomyCount - primaryMatch) * 10
    + matchingTermCount(post.tags, currentPost.tags) * 2;
}

function postDate(post: BlogPostSummary): string {
  return post.publishedAt ?? post.updatedAt;
}

export function rankRelatedBlogPosts(
  posts: readonly BlogPostSummary[],
  currentPost: BlogPostSummary,
  limit = 3
): readonly BlogPostSummary[] {
  return posts
    .filter(post => post.slug !== currentPost.slug)
    .map(post => ({post, score: relatedPostScore(post, currentPost)}))
    .sort((left, right) => (
      right.score - left.score
      || postDate(right.post).localeCompare(postDate(left.post))
      || left.post.slug.localeCompare(right.post.slug)
    ))
    .map(({post}) => post)
    .slice(0, Math.max(0, limit));
}

export function rankContextualRelatedBlogPosts(
  posts: readonly BlogPostSummary[],
  currentPost: BlogPostSummary,
  limit = 3
): readonly BlogPostSummary[] {
  return posts
    .filter(post => post.slug !== currentPost.slug)
    .map(post => ({post, score: relatedPostScore(post, currentPost)}))
    .filter(candidate => candidate.score > 0)
    .sort((left, right) => (
      right.score - left.score
      || postDate(right.post).localeCompare(postDate(left.post))
      || left.post.slug.localeCompare(right.post.slug)
    ))
    .map(({post}) => post)
    .slice(0, Math.max(0, limit));
}
