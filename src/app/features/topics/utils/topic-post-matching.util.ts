import type {BlogPostSummary} from '../../blog/models/blog-post.model';
import {getBlogTaxonomyTerms} from '../../blog/utils/blog-category-url.util';
import type {TopicHub} from '../topic-hubs.data';

export function normalizeTopicSearchValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizedValueMatchesTerm(value: string, normalizedTerm: string): boolean {
  const normalizedValue = normalizeTopicSearchValue(value);

  if (!normalizedValue || !normalizedTerm) {
    return false;
  }

  return normalizedTerm.includes(' ')
    ? normalizedValue.includes(normalizedTerm)
    : normalizedValue.split(' ').includes(normalizedTerm);
}

export function scorePostForTopicHub(
  post: BlogPostSummary,
  topicHub: Pick<TopicHub, 'terms'>
): number {
  const taxonomyTerms = getBlogTaxonomyTerms(post);

  return topicHub.terms.reduce((score, term) => {
    const normalizedTerm = normalizeTopicSearchValue(term);

    if (!normalizedTerm) {
      return score;
    }

    const relevance = [
      taxonomyTerms.some(value => normalizedValueMatchesTerm(value, normalizedTerm)) ? 100 : 0,
      post.tags.some(value => normalizedValueMatchesTerm(value, normalizedTerm)) ? 80 : 0,
      normalizedValueMatchesTerm(post.title, normalizedTerm) ? 40 : 0,
      normalizedValueMatchesTerm(post.slug, normalizedTerm) ? 30 : 0,
      normalizedValueMatchesTerm(post.excerpt, normalizedTerm) ? 10 : 0,
    ];

    return score + Math.max(...relevance);
  }, 0);
}

export function postMatchesTopicHub(post: BlogPostSummary, topicHub: Pick<TopicHub, 'terms'>): boolean {
  return scorePostForTopicHub(post, topicHub) > 0;
}

export function selectPrimaryTopicHubForPost<
  T extends Pick<TopicHub, 'terms' | 'displayOrder' | 'title' | 'slug'>,
>(post: BlogPostSummary, topicHubs: readonly T[]): T | undefined {
  return topicHubs
    .map(topicHub => ({topicHub, score: scorePostForTopicHub(post, topicHub)}))
    .filter(candidate => candidate.score > 0)
    .sort((left, right) => (
      right.score - left.score
      || left.topicHub.displayOrder - right.topicHub.displayOrder
      || left.topicHub.title.localeCompare(right.topicHub.title)
      || left.topicHub.slug.localeCompare(right.topicHub.slug)
    ))[0]?.topicHub;
}
