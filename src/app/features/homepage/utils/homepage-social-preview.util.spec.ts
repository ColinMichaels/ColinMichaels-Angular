import {BlogPost} from '../../blog/models/blog-post.model';
import {createDefaultHomepageHeroSettings} from '../homepage-hero.defaults';
import {
  appendSocialImageVersion,
  createHomepageSocialPreviewSelection,
  selectHomepageSocialPost,
} from './homepage-social-preview.util';

function createPost(overrides: Partial<BlogPost>): BlogPost {
  return {
    id: 'latest',
    slug: 'latest',
    title: 'Latest post',
    excerpt: 'Latest excerpt',
    coverImage: '/latest.jpg',
    author: {name: 'Colin Michaels'},
    categories: ['Technology'],
    tags: ['Angular'],
    status: 'published',
    seo: {title: 'Latest post', description: 'Latest post description'},
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-09T00:00:00.000Z',
    publishedAt: '2026-07-09T00:00:00.000Z',
    ...overrides,
  };
}

describe('homepage social preview', () => {
  const latest = createPost({});
  const featured = createPost({id: 'featured', slug: 'featured', title: 'Featured', featured: true});
  const selected = createPost({
    id: 'selected',
    slug: 'selected',
    title: 'Selected',
    seo: {
      title: 'Selected',
      description: 'Selected description',
      openGraphImage: '/selected.jpg',
      openGraphImageWidth: 1200,
      openGraphImageHeight: 630,
    },
  });

  it('uses selected, featured, and latest posts in fallback order', () => {
    const settings = createDefaultHomepageHeroSettings();
    const posts = [latest, featured, selected];

    expect(selectHomepageSocialPost(posts, {...settings, featuredPostMode: 'selected', featuredPostId: 'selected'})).toBe(selected);
    expect(selectHomepageSocialPost(posts, {...settings, featuredPostMode: 'selected', featuredPostId: 'missing'})).toBe(featured);
    expect(selectHomepageSocialPost(posts, {...settings, featuredPostMode: 'featured'})).toBe(featured);
    expect(selectHomepageSocialPost(posts, {...settings, featuredPostMode: 'latest'})).toBe(latest);
  });

  it('versions the resolved image without changing its original query or fragment', () => {
    const versioned = appendSocialImageVersion('/selected.jpg?token=abc#preview', 'post:updated:image');

    expect(versioned).toMatch(/^\/selected\.jpg\?token=abc&ogv=[a-z0-9]{7}#preview$/);
    expect(appendSocialImageVersion('/selected.jpg', 'post:updated:image')).toBe(
      appendSocialImageVersion('/selected.jpg', 'post:updated:image')
    );
  });

  it('uses the selected post OG dimensions and a deterministic version seed', () => {
    const selection = createHomepageSocialPreviewSelection(
      [latest, selected],
      {...createDefaultHomepageHeroSettings(), featuredPostMode: 'selected', featuredPostId: 'selected'}
    );

    expect(selection.image).toBe('/selected.jpg');
    expect(selection.imageWidth).toBe(1200);
    expect(selection.imageHeight).toBe(630);
    expect(selection.versionSeed).toContain('selected');
  });
});
