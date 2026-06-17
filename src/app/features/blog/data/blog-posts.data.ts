import {BlogPost} from '../models/blog-post.model';

export const BLOG_POSTS: readonly BlogPost[] = [
  {
    id: 'post-architecture-boundaries',
    slug: 'architecture-boundaries',
    title: 'Architecture Boundaries for the Site and OS',
    excerpt: 'A short implementation note on separating the public site, reusable OS framework, labs, and future admin tools.',
    coverImage: '/assets/images/backgrounds/day.webp',
    author: {
      name: 'Colin Michaels',
      title: 'Applications Developer',
    },
    categories: ['Architecture'],
    tags: ['Angular', 'Refactor', 'Core OS'],
    status: 'published',
    seo: {
      title: 'Architecture Boundaries for ColinMichaels.com',
      description: 'How the public site, Core OS framework, labs, and admin tools are being separated incrementally.',
      openGraphImage: '/assets/images/backgrounds/day.jpg',
    },
    contentFormat: 'editorjs',
    blocks: [
      {
        id: 'architecture-intro',
        type: 'paragraph',
        data: {
          text: 'The current refactor keeps behavior stable while moving the codebase toward explicit boundaries.',
        },
      },
      {
        id: 'architecture-boundaries-heading',
        type: 'header',
        data: {
          text: 'The first boundaries',
          level: 2,
        },
      },
      {
        id: 'architecture-boundaries-list',
        type: 'list',
        data: {
          items: [
            'Public website pages live under features.',
            'Reusable OS-style infrastructure lives under core-os.',
            'Experiments stay isolated in labs.',
            'Admin-only CMS work lives under admin.',
          ],
        },
      },
      {
        id: 'architecture-quote',
        type: 'quote',
        data: {
          text: 'Small route and data boundaries make later file moves much less risky.',
          caption: 'Refactor note',
        },
      },
    ],
    createdAt: '2026-05-12T14:00:00.000Z',
    updatedAt: '2026-05-13T19:30:00.000Z',
    publishedAt: '2026-05-13T19:30:00.000Z',
  },
  {
    id: 'post-cms-foundation',
    slug: 'cms-foundation',
    title: 'CMS Foundation Notes',
    excerpt: 'Draft notes for the upcoming Editor.js-backed publishing workflow and Firebase content model.',
    coverImage: '/assets/images/backgrounds/night.webp',
    author: {
      name: 'Colin Michaels',
      title: 'Applications Developer',
    },
    categories: ['CMS'],
    tags: ['Editor.js', 'Firebase', 'Drafts'],
    status: 'draft',
    seo: {
      title: 'CMS Foundation Notes',
      description: 'Draft implementation notes for future blog publishing workflows.',
      openGraphImage: '/assets/images/backgrounds/night.jpg',
    },
    contentFormat: 'editorjs',
    blocks: [
      {
        id: 'cms-draft-intro',
        type: 'paragraph',
        data: {
          text: 'The admin CMS should lazy-load editor tooling and store structured block data instead of rendered HTML.',
        },
      },
      {
        id: 'cms-draft-code',
        type: 'code',
        data: {
          language: 'typescript',
          code: 'type BlogPostStatus = "draft" | "scheduled" | "published" | "archived";',
        },
      },
    ],
    createdAt: '2026-05-13T16:00:00.000Z',
    updatedAt: '2026-05-13T20:00:00.000Z',
    publishedAt: null,
  },
];
