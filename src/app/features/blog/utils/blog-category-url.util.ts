export function createBlogCategorySlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'uncategorized';
}

export function createBlogCategoryTitle(value: string): string {
  return value
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b[a-z]/g, letter => letter.toUpperCase());
}

export function getBlogTaxonomyTerms(post: {
  categories: readonly string[];
  subcategories?: readonly string[];
}): readonly string[] {
  const terms = [
    ...post.categories,
    ...(post.subcategories ?? []),
  ].map(term => term.trim()).filter(Boolean);

  return [...new Set(terms)];
}
