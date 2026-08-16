import {
  createBlogCategorySlug,
  createBlogCategoryTitle,
  createBlogTagTaxonomyRoute,
  getBlogTaxonomyTerms,
  parseBlogCategoryFilterSlugs,
} from './blog-category-url.util';

describe('blog category URL utilities', () => {
  it('normalizes category slugs', () => {
    expect(createBlogCategorySlug('AI & Automation')).toBe('ai-and-automation');
  });

  it('consolidates legacy category identities under their public canonical archives', () => {
    expect(createBlogCategorySlug('Cat Corner')).toBe('cats-and-pets');
    expect(createBlogCategorySlug('Cats & Pets')).toBe('cats-and-pets');
    expect(createBlogCategorySlug('Health')).toBe('health-and-recovery');
    expect(createBlogCategorySlug('Recovery')).toBe('health-and-recovery');
    expect(createBlogCategoryTitle('recovery')).toBe('Health & Recovery');
  });

  it('routes overlapping tag archives to the category that owns the same intent', () => {
    expect(createBlogTagTaxonomyRoute('Recovery')).toEqual({
      kind: 'category',
      slug: 'health-and-recovery',
    });
    expect(createBlogTagTaxonomyRoute('Personal Growth')).toEqual({
      kind: 'category',
      slug: 'personal-growth',
    });
    expect(createBlogTagTaxonomyRoute('Angular')).toEqual({kind: 'tag', slug: 'angular'});
  });

  it('deduplicates category aliases and includes posts that used only an overlapping tag', () => {
    expect(getBlogTaxonomyTerms({
      categories: ['Cat Corner', 'Cats & Pets', 'Health'],
      subcategories: ['Recovery'],
      tags: ['Personal Growth', 'Recovery'],
    })).toEqual(['Cats & Pets', 'Health & Recovery', 'Personal Growth']);
  });

  it('parses unique comma-separated category filters', () => {
    expect(parseBlogCategoryFilterSlugs(' Tutorials,AI & Automation,tutorials, ')).toEqual([
      'tutorials',
      'ai-and-automation',
    ]);
    expect(parseBlogCategoryFilterSlugs('health,recovery')).toEqual(['health-and-recovery']);
    expect(parseBlogCategoryFilterSlugs(null)).toEqual([]);
  });
});
