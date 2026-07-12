import {BlogPost} from '../models/blog-post.model';
import {isBlogPost} from './blog-validation.util';

function createPost(): BlogPost {
  return {
    id: 'post-background-test',
    slug: 'post-background-test',
    title: 'Post Background Test',
    excerpt: 'A valid post used to exercise the optional background contract.',
    coverImage: '/assets/images/backgrounds/night.webp',
    author: {name: 'Colin Michaels'},
    categories: ['CMS'],
    tags: ['Background'],
    status: 'published',
    seo: {
      title: 'Post Background Test',
      description: 'A valid post used to exercise the optional background contract.',
    },
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: '2026-07-11T12:00:00.000Z',
    updatedAt: '2026-07-11T12:00:00.000Z',
    publishedAt: '2026-07-11T12:00:00.000Z',
  };
}

describe('blog post validation', () => {
  it('keeps legacy posts valid when no background image is present', () => {
    expect(isBlogPost(createPost())).toBeTrue();
  });

  it('accepts an optional post background image URL', () => {
    expect(isBlogPost({
      ...createPost(),
      backgroundImage: '/assets/images/backgrounds/day.webp',
    })).toBeTrue();
  });

  it('rejects malformed post background image values', () => {
    expect(isBlogPost({
      ...createPost(),
      backgroundImage: 42,
    })).toBeFalse();
  });

  it('keeps legacy posts valid when Cat Corner metadata is absent', () => {
    expect(isBlogPost(createPost())).toBeTrue();
  });

  it('accepts normalized Cat Corner metadata', () => {
    expect(isBlogPost({
      ...createPost(),
      catCorner: {enabled: true, discoveryPost: true},
    })).toBeTrue();
    expect(isBlogPost({
      ...createPost(),
      catCorner: {enabled: true, discoveryPost: false},
    })).toBeTrue();
    expect(isBlogPost({
      ...createPost(),
      catCorner: {enabled: false, discoveryPost: false},
    })).toBeTrue();
  });

  it('rejects malformed or contradictory Cat Corner metadata', () => {
    expect(isBlogPost({
      ...createPost(),
      catCorner: {enabled: false, discoveryPost: true},
    })).toBeFalse();
    expect(isBlogPost({
      ...createPost(),
      catCorner: {enabled: true},
    })).toBeFalse();
    expect(isBlogPost({
      ...createPost(),
      catCorner: 'cats',
    })).toBeFalse();
  });
});
