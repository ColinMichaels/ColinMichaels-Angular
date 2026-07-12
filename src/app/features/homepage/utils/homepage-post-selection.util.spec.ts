import {BlogPost} from '../../blog/models/blog-post.model';
import {createDefaultHomepageHeroSettings} from '../homepage-hero.defaults';
import {selectHomepageHeroPost, selectHomepageHeroPosts} from './homepage-post-selection.util';

function createPost(
  id: string,
  publishedAt: string,
  overrides: Partial<BlogPost> = {}
): BlogPost {
  return {
    id,
    slug: id,
    title: id,
    excerpt: `${id} excerpt`,
    coverImage: `/${id}.webp`,
    author: {name: 'Colin Michaels'},
    categories: ['Technology'],
    tags: ['Homepage'],
    status: 'published',
    seo: {title: id, description: `${id} description`},
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: publishedAt,
    updatedAt: publishedAt,
    publishedAt,
    ...overrides,
  };
}

describe('selectHomepageHeroPost', () => {
  const settings = createDefaultHomepageHeroSettings();

  it('selects the newest featured post without clearing older feature flags', () => {
    const oldestFeatured = createPost('oldest-featured', '2026-06-01T12:00:00.000Z', {featured: true});
    const newestFeatured = createPost('newest-featured', '2026-06-20T12:00:00.000Z', {featured: true});
    const newestOverall = createPost('newest-overall', '2026-06-30T12:00:00.000Z');
    const posts = [oldestFeatured, newestOverall, newestFeatured];

    expect(selectHomepageHeroPost(posts, settings)).toBe(newestFeatured);
    expect(oldestFeatured.featured).toBeTrue();
    expect(posts).toEqual([oldestFeatured, newestOverall, newestFeatured]);
  });

  it('orders the gallery with the hero lead first and the remaining recent posts after it', () => {
    const oldestFeatured = createPost('oldest-featured', '2026-06-01T12:00:00.000Z', {featured: true});
    const newestFeatured = createPost('newest-featured', '2026-06-20T12:00:00.000Z', {featured: true});
    const newestOverall = createPost('newest-overall', '2026-06-30T12:00:00.000Z');
    const posts = [oldestFeatured, newestOverall, newestFeatured, newestOverall];

    expect(selectHomepageHeroPosts(posts, settings).map(post => post.id)).toEqual([
      'newest-featured',
      'newest-overall',
      'oldest-featured',
    ]);
    expect(posts).toEqual([oldestFeatured, newestOverall, newestFeatured, newestOverall]);
  });

  it('preserves an explicit selected-post override', () => {
    const selected = createPost('selected', '2026-06-01T12:00:00.000Z');
    const featured = createPost('featured', '2026-06-20T12:00:00.000Z', {featured: true});
    const newest = createPost('newest', '2026-06-30T12:00:00.000Z');
    const selectedSettings = {
      ...settings,
      featuredPostMode: 'selected' as const,
      featuredPostId: selected.id,
    };

    expect(selectHomepageHeroPost([featured, newest, selected], selectedSettings)).toBe(selected);
    expect(selectHomepageHeroPosts([featured, newest, selected], selectedSettings).map(post => post.id))
      .toEqual(['selected', 'newest', 'featured']);
  });

  it('falls back from a stale selected ID to the newest featured post', () => {
    const olderFeatured = createPost('older-featured', '2026-06-01T12:00:00.000Z', {featured: true});
    const newerFeatured = createPost('newer-featured', '2026-06-20T12:00:00.000Z', {featured: true});

    expect(selectHomepageHeroPost([olderFeatured, newerFeatured], {
      ...settings,
      featuredPostMode: 'selected',
      featuredPostId: 'missing-post',
    })).toBe(newerFeatured);
  });

  it('uses the newest published post when none are featured', () => {
    const older = createPost('older', '2026-06-01T12:00:00.000Z');
    const newer = createPost('newer', '2026-06-20T12:00:00.000Z');

    expect(selectHomepageHeroPost([older, newer], settings)).toBe(newer);
  });
});
