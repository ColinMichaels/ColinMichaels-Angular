import {BlogPost} from '../../../features/blog/models/blog-post.model';
import {createBlogEvidenceReview} from './blog-evidence-review.util';

function createPost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: 'evidence-post',
    slug: 'evidence-post',
    title: 'Evidence Post',
    excerpt: 'A post used to verify the editorial review queue.',
    coverImage: '/assets/images/evidence.webp',
    author: {name: 'Colin Michaels'},
    categories: ['Gadgets & Gear'],
    tags: ['Evidence'],
    status: 'draft',
    seo: {
      title: 'Evidence Post',
      description: 'A post used to verify the editorial review queue.',
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

describe('createBlogEvidenceReview', () => {
  it('prioritizes an unclassified published article without inferring evidence', () => {
    const review = createBlogEvidenceReview(createPost({status: 'published'}));

    expect(review.state).toBe('unclassified');
    expect(review.needsReview).toBeTrue();
    expect(review.publishedPriority).toBeTrue();
    expect(review.detail).toContain('Not yet classified');
  });

  it('keeps a selected basis incomplete until its article-specific summary exists', () => {
    const review = createBlogEvidenceReview(createPost({
      editorial: {evidenceBasis: 'hands-on'},
    }));

    expect(review.state).toBe('incomplete');
    expect(review.label).toBe('Needs evidence summary');
  });

  it('requires a valid source-review date for researched evidence', () => {
    const review = createBlogEvidenceReview(createPost({
      editorial: {
        evidenceBasis: 'researched',
        evidenceSummary: 'Public evidence is separated from products Colin personally tested.',
      },
    }));

    expect(review.state).toBe('incomplete');
    expect(review.label).toBe('Needs source date');
  });

  it('accepts complete researched and first-person evidence without adding unrelated requirements', () => {
    const researched = createBlogEvidenceReview(createPost({
      editorial: {
        evidenceBasis: 'researched',
        evidenceSummary: 'Public evidence is separated from products Colin personally tested.',
        sourceReviewedAt: '2026-08-15',
      },
    }));
    const firstPerson = createBlogEvidenceReview(createPost({
      editorial: {
        evidenceBasis: 'first-person',
        evidenceSummary: 'This account is limited to Colin’s own documented recovery experience.',
      },
    }));

    expect(researched.state).toBe('reviewed');
    expect(researched.label).toBe('Researched analysis');
    expect(firstPerson.state).toBe('reviewed');
    expect(firstPerson.label).toBe('First-person field notes');
  });
});
