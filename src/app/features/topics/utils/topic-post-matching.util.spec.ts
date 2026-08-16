import type {BlogPostSummary} from '../../blog/models/blog-post.model';
import {TOPIC_HUBS} from '../topic-hubs.data';
import {postMatchesTopicHub, selectPrimaryTopicHubForPost} from './topic-post-matching.util';

function createPost(overrides: Partial<BlogPostSummary> = {}): BlogPostSummary {
  return {
    id: 'post-1',
    slug: 'angular-routing-notes',
    title: 'Angular routing notes',
    excerpt: 'A practical Firebase publishing walkthrough.',
    coverImage: '/assets/example.webp',
    author: {
      name: 'Colin Michaels',
      title: 'Applications Developer',
    },
    categories: ['Architecture'],
    tags: ['TypeScript'],
    publishedAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('topic post matching', () => {
  it('matches exact single-word terms across title, taxonomy, and tags', () => {
    const post = createPost();

    expect(postMatchesTopicHub(post, {terms: ['angular']})).toBeTrue();
    expect(postMatchesTopicHub(post, {terms: ['architecture']})).toBeTrue();
    expect(postMatchesTopicHub(post, {terms: ['typescript']})).toBeTrue();
  });

  it('matches normalized multi-word phrases', () => {
    const post = createPost({
      title: 'My open-heart surgery recovery notes',
      categories: ['Health & Recovery'],
    });

    expect(postMatchesTopicHub(post, {terms: ['open heart surgery']})).toBeTrue();
    expect(postMatchesTopicHub(post, {terms: ['health and recovery']})).toBeTrue();
  });

  it('does not match partial single-word tokens or empty terms', () => {
    const post = createPost();

    expect(postMatchesTopicHub(post, {terms: ['fire']})).toBeFalse();
    expect(postMatchesTopicHub(post, {terms: ['']})).toBeFalse();
  });

  it('matches gadget discoveries and reviews without claiming generic technology posts', () => {
    const gadgetsTopic = TOPIC_HUBS.find(topic => topic.slug === 'gadgets-toys')!;
    const gadgetReview = createPost({
      slug: 'tiny-desk-robot-review',
      title: 'A Tiny Desk Robot I Actually Want',
      excerpt: 'A playful gadget found online with a few clever design choices.',
      categories: ['Gadgets & Toys'],
      tags: ['Product Review'],
    });
    const genericTechnologyPost = createPost({
      slug: 'technology-workflow-notes',
      title: 'Technology workflow notes',
      excerpt: 'A software architecture article.',
      categories: ['Technology'],
      tags: ['Angular'],
    });

    expect(postMatchesTopicHub(gadgetReview, gadgetsTopic)).toBeTrue();
    expect(postMatchesTopicHub(genericTechnologyPost, gadgetsTopic)).toBeFalse();
  });

  it('selects the strongest topic from explicit taxonomy before incidental title mentions', () => {
    const post = createPost({
      slug: 'ai-powered-desk-robot-review',
      title: 'An AI-Powered Desk Robot Review',
      excerpt: 'A playful product with a conversational feature.',
      categories: ['Gadgets & Toys'],
      tags: ['Product Review'],
    });

    expect(selectPrimaryTopicHubForPost(post, TOPIC_HUBS)?.slug).toBe('gadgets-toys');
  });

  it('returns no primary topic when the post has no exact topic match', () => {
    const post = createPost({
      slug: 'bread-recipe',
      title: 'A Weekend Bread Recipe',
      excerpt: 'Flour, water, salt, and time.',
      categories: ['Cooking'],
      tags: ['Recipe'],
    });

    expect(selectPrimaryTopicHubForPost(post, TOPIC_HUBS)).toBeUndefined();
  });

  it('breaks equal topic scores by stable public display order', () => {
    const post = createPost({title: 'A shared topic note'});
    const laterTopic = {slug: 'later', title: 'Later', displayOrder: 20, terms: ['shared']};
    const earlierTopic = {slug: 'earlier', title: 'Earlier', displayOrder: 10, terms: ['shared']};

    expect(selectPrimaryTopicHubForPost(post, [laterTopic, earlierTopic])?.slug).toBe('earlier');
  });
});
