import {createSeoChecklist, createSocialPreviewImage} from './blog-seo-checklist';

describe('blog SEO checklist', () => {
  const baseInput = {
    title: 'Practical Angular CMS Architecture Notes',
    slug: 'practical-angular-cms-architecture-notes',
    excerpt: 'A practical implementation note on Angular CMS architecture, publishing workflows, and metadata systems for public-facing blogs.',
    coverImage: '/assets/images/backgrounds/day.webp',
    categories: ['CMS'],
    tags: ['Angular', 'SEO'],
    seoTitle: 'Practical Angular CMS Architecture Notes',
    seoDescription: 'A practical implementation note on Angular CMS architecture, publishing workflows, and metadata systems for public-facing blogs.',
    canonical: 'https://colinmichaels.com/blog/practical-angular-cms-architecture-notes',
    generatedCanonicalUrl: 'https://colinmichaels.com/blog/practical-angular-cms-architecture-notes',
    openGraphImage: '/assets/social/post.jpg',
    blocks: [
      {
        id: 'heading',
        type: 'header',
        data: {
          text: 'Implementation notes',
          level: 2,
        },
      },
      {
        id: 'image',
        type: 'image',
        data: {
          url: '/assets/images/backgrounds/day.webp',
          alt: 'Day background',
        },
      },
    ],
  } as const;

  it('passes a complete checklist with preferred metadata ranges', () => {
    const checklist = createSeoChecklist(baseInput);

    expect(checklist.failCount).toBe(0);
    expect(checklist.items.find(item => item.id === 'title')?.status).toBe('pass');
    expect(checklist.items.find(item => item.id === 'image-alt')?.status).toBe('pass');
  });

  it('flags missing required publication metadata', () => {
    const checklist = createSeoChecklist({
      ...baseInput,
      seoTitle: '',
      seoDescription: '',
      canonical: 'not-a-url',
      coverImage: '',
      categories: [],
    });

    expect(checklist.failCount).toBeGreaterThan(0);
    expect(checklist.items.find(item => item.id === 'canonical')?.status).toBe('fail');
    expect(checklist.items.find(item => item.id === 'cover-image')?.status).toBe('fail');
    expect(checklist.items.find(item => item.id === 'categories')?.status).toBe('fail');
  });

  it('warns when social previews fall back to the cover image', () => {
    const checklist = createSeoChecklist({
      ...baseInput,
      openGraphImage: '',
    });

    expect(checklist.items.find(item => item.id === 'open-graph-image')?.status).toBe('warning');
    expect(createSocialPreviewImage({...baseInput, openGraphImage: ''})).toBe(baseInput.coverImage);
  });

  it('fails WebP Open Graph images for social preview compatibility', () => {
    const checklist = createSeoChecklist({
      ...baseInput,
      openGraphImage: '/assets/social/post.webp',
    });

    const socialImage = checklist.items.find(item => item.id === 'open-graph-image');

    expect(socialImage?.status).toBe('fail');
    expect(socialImage?.description).toContain('JPEG or PNG');
  });
});
