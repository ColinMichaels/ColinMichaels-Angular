import {BlogPostSummary} from '../models/blog-post.model';
import {rankRelatedBlogPosts} from './blog-related-posts.util';

function createPost(
  slug: string,
  categories: readonly string[],
  tags: readonly string[],
  publishedAt: string,
  subcategories: readonly string[] = []
): BlogPostSummary {
  return {
    id: slug,
    slug,
    title: slug,
    excerpt: `${slug} summary`,
    coverImage: `/${slug}.webp`,
    author: {name: 'Colin Michaels'},
    categories,
    subcategories,
    tags,
    publishedAt,
    updatedAt: publishedAt,
  };
}

describe('rankRelatedBlogPosts', () => {
  it('prioritizes category, then subcategory, then tag matches', () => {
    const current = createPost('current', ['Technology'], ['Angular'], '2026-08-10T00:00:00.000Z', ['Web']);
    const categoryMatch = createPost('category', ['Technology'], [], '2026-01-01T00:00:00.000Z');
    const tagMatch = createPost('tag', ['Media'], ['Angular'], '2026-08-12T00:00:00.000Z');
    const unrelated = createPost('unrelated', ['Recovery'], [], '2026-08-13T00:00:00.000Z');

    expect(rankRelatedBlogPosts([unrelated, tagMatch, current, categoryMatch], current).map(post => post.slug))
      .toEqual(['category', 'tag', 'unrelated']);
  });

  it('uses recent posts as a fallback so every article can offer a next read', () => {
    const current = createPost('current', ['Technology'], [], '2026-08-10T00:00:00.000Z');
    const newest = createPost('newest', ['Recovery'], [], '2026-08-13T00:00:00.000Z');
    const older = createPost('older', ['Media'], [], '2026-08-01T00:00:00.000Z');

    expect(rankRelatedBlogPosts([current, older, newest], current, 1)).toEqual([newest]);
  });
});
