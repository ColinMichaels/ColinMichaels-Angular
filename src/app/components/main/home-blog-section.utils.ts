import {BlogPostSummary} from '../../features/blog/models/blog-post.model';
import {getBlogTaxonomyTerms} from '../../features/blog/utils/blog-category-url.util';

export function normalizeSearchValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function postMatchesTerms(post: BlogPostSummary, terms: readonly string[]): boolean {
  const searchableText = normalizeSearchValue([
    post.title,
    post.excerpt,
    post.slug,
    ...post.categories,
    ...(post.subcategories ?? []),
    ...post.tags,
  ].join(' '));

  return terms.some(term => searchableText.includes(normalizeSearchValue(term)));
}

export function postHasTaxonomyTerm(post: BlogPostSummary, terms: readonly string[]): boolean {
  const normalizedTerms = new Set(terms.map(term => normalizeSearchValue(term)));

  return getBlogTaxonomyTerms(post)
    .some(term => normalizedTerms.has(normalizeSearchValue(term)));
}

export function postMatchesHubTerms(post: BlogPostSummary, terms: readonly string[]): boolean {
  const searchableText = normalizeSearchValue([
    post.title,
    post.excerpt,
    post.slug,
    ...getBlogTaxonomyTerms(post),
    ...post.tags,
  ].join(' '));
  const searchableTokens = searchableText.split(' ');

  return terms.some(term => {
    const normalizedTerm = normalizeSearchValue(term);

    return normalizedTerm.includes(' ')
      ? searchableText.includes(normalizedTerm)
      : searchableTokens.includes(normalizedTerm);
  });
}
