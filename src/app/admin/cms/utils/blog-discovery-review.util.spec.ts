import {BlogPost} from '../../../features/blog/models/blog-post.model';
import {createBlogDiscoveryReview} from './blog-discovery-review.util';

function createPost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: 'discovery-post',
    slug: 'discovery-post',
    title: 'Discovery Post',
    excerpt: 'A post used to verify the discovery and trust queue.',
    coverImage: '/assets/images/discovery.webp',
    author: {name: 'Colin Michaels'},
    categories: ['Gadgets & Gear'],
    tags: ['Evidence'],
    status: 'draft',
    seo: {
      title: 'Discovery Post',
      description: 'A post used to verify the discovery and trust queue.',
      openGraphImage: '',
    },
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: '2026-08-15T12:00:00.000Z',
    updatedAt: '2026-08-15T12:00:00.000Z',
    publishedAt: null,
    ...overrides,
  };
}

describe('createBlogDiscoveryReview', () => {
  it('prioritizes a published unclassified article without assigning evidence', () => {
    const review = createBlogDiscoveryReview(createPost({status: 'published'}));

    expect(review.needsReview).toBeTrue();
    expect(review.publishedPriority).toBeTrue();
    expect(review.requiredIssueCount).toBe(1);
    expect(review.issues.map(issue => issue.id)).toContain('evidence');
    expect(review.priorityScore).toBeGreaterThan(1000);
  });

  it('requires a usable external reference for source-dependent evidence', () => {
    const review = createBlogDiscoveryReview(createPost({
      editorial: {
        evidenceBasis: 'researched',
        evidenceSummary: 'This analysis separates public source evidence from products Colin personally tested.',
        sourceReviewedAt: '2026-08-15',
      },
    }));

    expect(review.issues.map(issue => issue.id)).toContain('external-references');
    expect(review.requiredIssueCount).toBe(1);
    expect(review.label).toBe('Needs usable source links');
  });

  it('flags a named Sources section that has no usable URL', () => {
    const review = createBlogDiscoveryReview(createPost({
      editorial: {
        evidenceBasis: 'first-person',
        evidenceSummary: 'This post is limited to Colin’s own documented experience.',
      },
      blocks: [
        {id: 'sources', type: 'header', data: {text: 'Sources', level: 2}},
        {id: 'source-name', type: 'paragraph', data: {text: 'Federal Aviation Administration'}},
      ],
    }));

    const sourceIssue = review.issues.find(issue => issue.id === 'external-references');
    expect(sourceIssue?.detail).toContain('no usable external URL');
  });

  it('keeps first-person work source-optional when it has a contextual continuation and artifact', () => {
    const review = createBlogDiscoveryReview(createPost({
      editorial: {
        evidenceBasis: 'first-person',
        evidenceSummary: 'This post is limited to Colin’s own documented experience.',
      },
      blocks: [
        {
          id: 'next-read',
          type: 'paragraph',
          data: {text: '<a href="https://colinmichaels.com/blog/related-story">Read the related field story</a>.'},
        },
        {
          id: 'field-photo',
          type: 'image',
          data: {
            url: '/assets/images/field-photo.webp',
            alt: 'Colin preparing the documented project',
            caption: 'First-person field photo.',
          },
        },
      ],
    }));

    expect(review.state).toBe('ready');
    expect(review.needsReview).toBeFalse();
    expect(review.issues).toEqual([]);
    expect(review.label).toBe('Discovery-ready');
  });

  it('keeps contextual links and artifacts advisory instead of inventing publication blockers', () => {
    const review = createBlogDiscoveryReview(createPost({
      editorial: {
        evidenceBasis: 'first-person',
        evidenceSummary: 'This post is limited to Colin’s own documented experience.',
      },
    }));

    expect(review.requiredIssueCount).toBe(0);
    expect(review.recommendationCount).toBe(2);
    expect(review.issues.every(issue => issue.severity === 'recommended')).toBeTrue();
  });
});
