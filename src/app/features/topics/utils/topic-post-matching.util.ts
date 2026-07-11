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

export function postMatchesTopicHub(post: BlogPostSummary, topicHub: Pick<TopicHub, 'terms'>): boolean {
  const searchableText = normalizeTopicSearchValue([
    post.title,
    post.excerpt,
    post.slug,
    ...getBlogTaxonomyTerms(post),
    ...post.tags,
  ].join(' '));
  const searchableTokens = searchableText.split(' ');

  return topicHub.terms.some(term => {
    const normalizedTerm = normalizeTopicSearchValue(term);

    if (!normalizedTerm) {
      return false;
    }

    return normalizedTerm.includes(' ')
      ? searchableText.includes(normalizedTerm)
      : searchableTokens.includes(normalizedTerm);
  });
}
