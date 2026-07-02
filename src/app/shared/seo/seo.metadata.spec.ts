import {
  TAG_INDEX_MIN_POSTS,
  TAXONOMY_INDEX_MIN_POSTS,
  createBlogCategorySeoMetadata,
  createBlogTagSeoMetadata,
  createMissingBlogPostSeoMetadata,
} from './seo.metadata';

describe('SEO metadata policy', () => {
  it('marks low-count category pages noindex while preserving higher-count category canonicals', () => {
    const lowCountMetadata = createBlogCategorySeoMetadata('Angular Firebase', TAXONOMY_INDEX_MIN_POSTS - 1);
    const indexableMetadata = createBlogCategorySeoMetadata('Angular Firebase', TAXONOMY_INDEX_MIN_POSTS);

    expect(lowCountMetadata.path).toBe('/blog/category/angular-firebase');
    expect(lowCountMetadata.robots).toBe('noindex,follow');
    expect(indexableMetadata.robots).toBeUndefined();
  });

  it('marks low-count tag pages noindex while preserving higher-count tag canonicals', () => {
    const lowCountMetadata = createBlogTagSeoMetadata('AI Workflow', TAG_INDEX_MIN_POSTS - 1);
    const indexableMetadata = createBlogTagSeoMetadata('AI Workflow', TAG_INDEX_MIN_POSTS);

    expect(lowCountMetadata.path).toBe('/blog/tag/ai-workflow');
    expect(lowCountMetadata.robots).toBe('noindex,follow');
    expect(indexableMetadata.robots).toBeUndefined();
  });

  it('keeps missing blog posts out of the index', () => {
    const metadata = createMissingBlogPostSeoMetadata('missing-post');

    expect(metadata.path).toBe('/blog/missing-post');
    expect(metadata.robots).toBe('noindex,nofollow');
  });
});
