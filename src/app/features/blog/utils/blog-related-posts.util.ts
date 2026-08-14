import {BlogPostSummary} from '../models/blog-post.model';

function normalizedTerms(values: readonly string[] | undefined): Set<string> {
  return new Set((values ?? []).map(value => value.trim().toLowerCase()).filter(Boolean));
}

function matchingTermCount(left: readonly string[] | undefined, right: readonly string[] | undefined): number {
  const rightTerms = normalizedTerms(right);
  return [...normalizedTerms(left)].filter(term => rightTerms.has(term)).length;
}

function relatedPostScore(post: BlogPostSummary, currentPost: BlogPostSummary): number {
  return matchingTermCount(post.categories, currentPost.categories) * 6
    + matchingTermCount(post.subcategories, currentPost.subcategories) * 3
    + matchingTermCount(post.tags, currentPost.tags);
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
