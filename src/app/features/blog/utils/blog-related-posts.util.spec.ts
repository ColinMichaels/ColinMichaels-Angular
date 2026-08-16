import {BlogPostSummary} from '../models/blog-post.model';
import {
  rankContextualRelatedBlogPosts,
  rankRelatedBlogPosts,
} from './blog-related-posts.util';

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

  it('keeps the primary subject ahead of several broad secondary matches', () => {
    const current = createPost(
      'current',
      ['Drones & FPV', 'Creative Technology', 'Opinion'],
      ['Future Tech'],
      '2026-08-10T00:00:00.000Z'
    );
    const droneStory = createPost(
      'drone-story',
      ['Drones & FPV'],
      [],
      '2026-07-01T00:00:00.000Z'
    );
    const broadStory = createPost(
      'broad-story',
      ['Creative Technology', 'Opinion'],
      ['Future Tech'],
      '2026-08-12T00:00:00.000Z'
    );

    expect(rankContextualRelatedBlogPosts(
      [broadStory, current, droneStory],
      current
    ).map(post => post.slug)).toEqual(['drone-story', 'broad-story']);
  });

  it('uses recent posts as a fallback so every article can offer a next read', () => {
    const current = createPost('current', ['Technology'], [], '2026-08-10T00:00:00.000Z');
    const newest = createPost('newest', ['Recovery'], [], '2026-08-13T00:00:00.000Z');
    const older = createPost('older', ['Media'], [], '2026-08-01T00:00:00.000Z');

    expect(rankRelatedBlogPosts([current, older, newest], current, 1)).toEqual([newest]);
  });

  it('matches legacy and canonical recovery taxonomy as the same reading interest', () => {
    const current = createPost('current', ['Health & Recovery'], [], '2026-08-10T00:00:00.000Z');
    const legacyCategory = createPost('legacy-category', ['Health'], [], '2026-01-01T00:00:00.000Z');
    const tagOnly = createPost('tag-only', ['Weekly Updates'], ['Recovery'], '2026-01-02T00:00:00.000Z');
    const unrelated = createPost('unrelated', ['Technology'], [], '2026-08-13T00:00:00.000Z');

    expect(rankRelatedBlogPosts([unrelated, tagOnly, legacyCategory, current], current).map(post => post.slug))
      .toEqual(['tag-only', 'legacy-category', 'unrelated']);
  });

  it('offers an inline next read only when the posts share genuine context', () => {
    const current = createPost('current', ['Technology'], ['Angular'], '2026-08-10T00:00:00.000Z');
    const categoryMatch = createPost('category', ['Technology'], [], '2026-07-01T00:00:00.000Z');
    const tagMatch = createPost('tag', ['Media'], ['Angular'], '2026-08-01T00:00:00.000Z');
    const unrelated = createPost('unrelated', ['Recovery'], [], '2026-08-13T00:00:00.000Z');

    expect(rankContextualRelatedBlogPosts(
      [unrelated, tagMatch, current, categoryMatch],
      current
    ).map(post => post.slug)).toEqual(['category', 'tag']);
  });

  it('does not label a merely recent article as contextually related', () => {
    const current = createPost('current', ['Technology'], [], '2026-08-10T00:00:00.000Z');
    const unrelated = createPost('unrelated', ['Recovery'], [], '2026-08-13T00:00:00.000Z');

    expect(rankContextualRelatedBlogPosts([current, unrelated], current)).toEqual([]);
  });
});
