import {BlogPost} from '../../../features/blog/models/blog-post.model';
import {
  createCmsWorkingItem,
  createContentOperationPreviewItem,
  parseCmsPostArtifact,
  serializeCmsPostArtifact,
} from './cms-post-artifact.adapter';

function createPost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: 'post-1',
    slug: 'stable-post-slug',
    title: 'Stable display title',
    excerpt: 'Original excerpt.',
    coverImage: '/assets/blog/cover.webp',
    backgroundImage: '/assets/blog/background.webp',
    thumbnailImage: '/assets/blog/thumbnail.webp',
    featured: false,
    author: {name: 'Colin Michaels', title: 'Applications Developer'},
    categories: ['Technology'],
    subcategories: [],
    tags: ['Firebase'],
    status: 'published',
    seo: {
      title: 'Original SEO title',
      description: 'Original SEO description.',
      canonical: 'https://colinmichaels.com/blog/stable-post-slug',
      openGraphImage: '/assets/blog/og.jpg',
    },
    contentFormat: 'editorjs',
    blocks: [{id: 'block-1', type: 'paragraph', data: {text: 'Body stays unchanged.'}}],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-07-09T00:00:00.000Z',
    publishedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('CMS post artifact adapter', () => {
  it('round-trips the current CMS post document without losing fields', () => {
    const post = createPost();

    expect(parseCmsPostArtifact(serializeCmsPostArtifact(post))).toEqual(post);
  });

  it('creates hashed review artifacts for allowlisted SEO and taxonomy changes', async () => {
    const base = createPost();
    const candidate = createPost({
      categories: ['Technology', 'Tutorials'],
      tags: ['Firebase', 'SEO'],
      seo: {
        ...base.seo,
        title: 'Improved SEO title for the stable post',
        description: 'A focused description that explains the post clearly while preserving its identity, URL, publishing state, content blocks, media, authorship, and timestamps.',
      },
    });

    const preview = await createContentOperationPreviewItem(createCmsWorkingItem(base, candidate));

    expect(preview.status).toBe('validated');
    expect(preview.validation.protectedFieldsUnchanged).toBeTrue();
    expect(preview.diffs.map(diff => diff.path)).toEqual([
      'seo.title',
      'seo.description',
      'categories',
      'tags',
    ]);
    expect(preview.baseArtifact.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(preview.candidateArtifact.artifactId).toContain('post-json_candidate_post-1_');
  });

  it('blocks a candidate that changes the protected slug', async () => {
    const base = createPost();
    const candidate = createPost({slug: 'changed-slug'});

    const preview = await createContentOperationPreviewItem(createCmsWorkingItem(base, candidate));

    expect(preview.status).toBe('blocked');
    expect(preview.validation.protectedFieldsUnchanged).toBeFalse();
    expect(preview.validation.errors.join(' ')).toContain('protected fields');
  });

  it('blocks redirect-required recommendations from the metadata-only slice', async () => {
    const post = createPost();
    const preview = await createContentOperationPreviewItem(createCmsWorkingItem(post, post, {
      redirectRequired: true,
      source: 'optimization-manifest',
    }));

    expect(preview.status).toBe('blocked');
    expect(preview.validation.errors.join(' ')).toContain('redirect safeguards');
  });
});
