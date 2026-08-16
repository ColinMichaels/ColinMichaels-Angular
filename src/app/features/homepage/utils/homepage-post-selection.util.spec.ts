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

  it('keeps automatic hero stories inside the homepage creator promise', () => {
    const healthcareFeature = createPost('healthcare-feature', '2026-06-30T12:00:00.000Z', {
      title: 'When healthcare became pay to play',
      excerpt: 'A patient access story after major surgery.',
      categories: ['Health & Recovery'],
      tags: ['Recovery'],
      featured: true,
    });
    const gadgetFeature = createPost('gadget-feature', '2026-06-20T12:00:00.000Z', {
      title: 'Seven gadgets that might actually help',
      categories: ['Gadgets & Gear'],
      tags: ['Useful Gadgets'],
      featured: true,
    });
    const fpvStory = createPost('fpv-story', '2026-06-10T12:00:00.000Z', {
      title: 'FPV flight notes',
      categories: ['Drones & FPV'],
      tags: ['FPV'],
    });

    expect(selectHomepageHeroPosts([healthcareFeature, gadgetFeature, fpvStory], settings).map(post => post.id))
      .toEqual(['gadget-feature', 'fpv-story']);
  });

  it('limits automatic rotation to six focused stories', () => {
    const posts = Array.from({length: 8}, (_, index) => createPost(
      `tech-${index + 1}`,
      `2026-06-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
    ));

    expect(selectHomepageHeroPosts(posts, settings)).toHaveSize(6);
    expect(selectHomepageHeroPosts(posts, settings).map(post => post.id))
      .toEqual(['tech-8', 'tech-7', 'tech-6', 'tech-5', 'tech-4', 'tech-3']);
  });

  it('preserves an explicit off-promise editorial lead while focusing the remaining rotation', () => {
    const selected = createPost('selected-health', '2026-06-30T12:00:00.000Z', {
      title: 'A recovery milestone',
      excerpt: 'A patient journal update.',
      categories: ['Health & Recovery'],
      tags: ['Recovery'],
    });
    const gadget = createPost('gadget', '2026-06-20T12:00:00.000Z', {
      categories: ['Gadgets & Gear'],
    });
    const otherHealth = createPost('other-health', '2026-06-10T12:00:00.000Z', {
      title: 'Another recovery update',
      excerpt: 'Another patient journal entry.',
      categories: ['Health & Recovery'],
      tags: ['Recovery'],
    });

    expect(selectHomepageHeroPosts([otherHealth, gadget, selected], {
      ...settings,
      featuredPostMode: 'selected',
      featuredPostId: selected.id,
    }).map(post => post.id)).toEqual(['selected-health', 'gadget']);
  });
});
