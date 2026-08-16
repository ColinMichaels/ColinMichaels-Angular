import {getCanonicalBlogCategoryTerms} from './blog-taxonomy';

interface BlogTopicMatchPost {
  slug: string;
  title: string;
  excerpt: string;
  categories: readonly string[];
  subcategories?: readonly string[];
  tags: readonly string[];
}

interface BlogTopicMatchHub {
  terms: readonly string[];
}

export function normalizeBlogTopicSearchValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizedValueMatchesTerm(value: string, normalizedTerm: string): boolean {
  const normalizedValue = normalizeBlogTopicSearchValue(value);

  if (!normalizedValue || !normalizedTerm) {
    return false;
  }

  return normalizedTerm.includes(' ')
    ? normalizedValue.includes(normalizedTerm)
    : normalizedValue.split(' ').includes(normalizedTerm);
}

export function scoreBlogPostForTopicHub(
  post: BlogTopicMatchPost,
  topicHub: BlogTopicMatchHub
): number {
  const taxonomyTerms = getCanonicalBlogCategoryTerms(post);

  return topicHub.terms.reduce((score, term) => {
    const normalizedTerm = normalizeBlogTopicSearchValue(term);

    if (!normalizedTerm) {
      return score;
    }

    return score + Math.max(
      taxonomyTerms.some(value => normalizedValueMatchesTerm(value, normalizedTerm)) ? 100 : 0,
      post.tags.some(value => normalizedValueMatchesTerm(value, normalizedTerm)) ? 80 : 0,
      normalizedValueMatchesTerm(post.title, normalizedTerm) ? 40 : 0,
      normalizedValueMatchesTerm(post.slug, normalizedTerm) ? 30 : 0,
      normalizedValueMatchesTerm(post.excerpt, normalizedTerm) ? 10 : 0
    );
  }, 0);
}

export function selectPrimaryBlogTopicHub<T extends BlogTopicMatchHub>(
  post: BlogTopicMatchPost,
  topicHubs: readonly T[]
): T | undefined {
  return topicHubs
    .map((topicHub, index) => ({topicHub, index, score: scoreBlogPostForTopicHub(post, topicHub)}))
    .filter(candidate => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.topicHub;
}
