import {BlogPost} from '../../../features/blog/models/blog-post.model';
import {
  applyOptimizationRecommendation,
  matchOptimizationManifest,
  parsePostOptimizationManifest,
} from './post-optimization-manifest.adapter';

function createPost(id: string, slug: string): BlogPost {
  return {
    id,
    slug,
    title: `Title for ${slug}`,
    excerpt: 'Excerpt',
    coverImage: '/cover.webp',
    author: {name: 'Colin Michaels'},
    categories: ['Original'],
    tags: ['Original'],
    status: 'published',
    seo: {title: 'Old SEO title', description: 'Old description'},
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-07-09T00:00:00.000Z',
    publishedAt: '2026-01-02T00:00:00.000Z',
  };
}

function createManifestRow(stableSlug: string): Record<string, unknown> {
  return {
    stableSlug,
    currentTitle: 'Current title',
    recommendedSeoTitle: 'Recommended search title',
    recommendedMetaDescription: 'Recommended description with enough context for a useful content operations review.',
    categories: ['Tutorials', 'Technology'],
    tags: ['Firebase', 'SEO'],
    deployment: 'live',
    priority: 'P1',
    redirectRequired: false,
  };
}

describe('post optimization manifest adapter', () => {
  it('parses and matches recommendations by stable slug', () => {
    const manifest = parsePostOptimizationManifest({
      auditDate: '2026-07-09',
      site: 'https://colinmichaels.com',
      posts: [createManifestRow('matched'), createManifestRow('missing')],
    });
    const matchedPost = createPost('post-1', 'matched');
    const unmatchedPost = createPost('post-2', 'unmatched');
    const result = matchOptimizationManifest(manifest, [matchedPost, unmatchedPost]);

    expect(result.matches).toHaveSize(1);
    expect(result.matches[0].post.id).toBe('post-1');
    expect(result.unmatchedRecommendations.map(row => row.stableSlug)).toEqual(['missing']);
    expect(result.unmatchedPosts.map(post => post.id)).toEqual(['post-2']);
  });

  it('rejects duplicate stable slugs', () => {
    expect(() => parsePostOptimizationManifest({
      posts: [createManifestRow('duplicate'), createManifestRow('duplicate')],
    })).toThrowError(/duplicate stable slug/i);
  });

  it('applies only the approved metadata and taxonomy recommendation fields', () => {
    const base = createPost('post-1', 'matched');
    const recommendation = parsePostOptimizationManifest({posts: [createManifestRow('matched')]}).posts[0];
    const candidate = applyOptimizationRecommendation(base, recommendation);

    expect(candidate.seo.title).toBe('Recommended search title');
    expect(candidate.categories).toEqual(['Tutorials', 'Technology']);
    expect(candidate.tags).toEqual(['Firebase', 'SEO']);
    expect(candidate.id).toBe(base.id);
    expect(candidate.slug).toBe(base.slug);
    expect(candidate.title).toBe(base.title);
    expect(candidate.status).toBe(base.status);
    expect(candidate.blocks).toBe(base.blocks);
    expect(candidate.createdAt).toBe(base.createdAt);
    expect(candidate.updatedAt).toBe(base.updatedAt);
  });
});
