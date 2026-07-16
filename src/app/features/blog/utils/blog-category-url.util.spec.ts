import {
  createBlogCategorySlug,
  parseBlogCategoryFilterSlugs,
} from './blog-category-url.util';

describe('blog category URL utilities', () => {
  it('normalizes category slugs', () => {
    expect(createBlogCategorySlug('AI & Automation')).toBe('ai-and-automation');
  });

  it('parses unique comma-separated category filters', () => {
    expect(parseBlogCategoryFilterSlugs(' Tutorials,AI & Automation,tutorials, ')).toEqual([
      'tutorials',
      'ai-and-automation',
    ]);
    expect(parseBlogCategoryFilterSlugs(null)).toEqual([]);
  });
});
