export interface BlogTaxonomyRoute {
  kind: 'category' | 'tag';
  slug: string;
}

const CANONICAL_CATEGORY_BY_SLUG: Readonly<Record<string, { slug: string; title: string }>> = {
  'cat-corner': {slug: 'cats-and-pets', title: 'Cats & Pets'},
  'cats-and-pets': {slug: 'cats-and-pets', title: 'Cats & Pets'},
  health: {slug: 'health-and-recovery', title: 'Health & Recovery'},
  recovery: {slug: 'health-and-recovery', title: 'Health & Recovery'},
  'health-and-recovery': {slug: 'health-and-recovery', title: 'Health & Recovery'},
};

const CATEGORY_ROUTE_BY_TAG_SLUG: Readonly<Record<string, { slug: string; title: string }>> = {
  recovery: {slug: 'health-and-recovery', title: 'Health & Recovery'},
  'personal-growth': {slug: 'personal-growth', title: 'Personal Growth'},
};

export function createBlogCategorySlug(value: string): string {
  const slug = createBlogTaxonomySlug(value, 'uncategorized');
  return CANONICAL_CATEGORY_BY_SLUG[slug]?.slug ?? slug;
}

export function createBlogTagSlug(value: string): string {
  return createBlogTaxonomySlug(value, 'untagged');
}

export function createBlogTagTaxonomyRoute(value: string): BlogTaxonomyRoute {
  const tagSlug = createBlogTagSlug(value);
  const category = CATEGORY_ROUTE_BY_TAG_SLUG[tagSlug];

  return category
    ? {kind: 'category', slug: category.slug}
    : {kind: 'tag', slug: tagSlug};
}

function createBlogTaxonomySlug(value: string, fallback: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || fallback;
}

export function createBlogCategoryTitle(value: string): string {
  const slug = createBlogTaxonomySlug(value, 'uncategorized');
  const canonicalCategory = CANONICAL_CATEGORY_BY_SLUG[slug]
    ?? CATEGORY_ROUTE_BY_TAG_SLUG[slug];

  if (canonicalCategory) {
    return canonicalCategory.title;
  }

  return value
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b[a-z]/g, letter => letter.toUpperCase());
}

export function parseBlogCategoryFilterSlugs(value: string | null | undefined): readonly string[] {
  return [...new Set(
    (value ?? '')
      .split(',')
      .map(slug => slug.trim())
      .filter(Boolean)
      .map(createBlogCategorySlug)
  )];
}

export function getBlogTaxonomyTerms(post: {
  categories: readonly string[];
  subcategories?: readonly string[];
  tags?: readonly string[];
}): readonly string[] {
  const storedTerms = [
    ...post.categories,
    ...(post.subcategories ?? []),
  ];
  const canonicalTerms = storedTerms
    .map(term => term.trim())
    .filter(Boolean)
    .map(term => CANONICAL_CATEGORY_BY_SLUG[createBlogTaxonomySlug(term, 'uncategorized')]?.title ?? term);
  const tagCategories = (post.tags ?? [])
    .map(tag => CATEGORY_ROUTE_BY_TAG_SLUG[createBlogTagSlug(tag)]?.title)
    .filter((term): term is string => Boolean(term));

  return [...new Set([...canonicalTerms, ...tagCategories])];
}
