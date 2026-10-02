import {BlogPost} from '../blog/models/blog-post.model';

export const TEST_SCHEDULE_POST: BlogPost = {
  id: 'next-post', slug: 'next-post', title: 'Next post', excerpt: 'An announced idea.', coverImage: '/assets/images/backgrounds/night.webp',
  author: {name: 'Colin Michaels'}, categories: ['Projects'], tags: [], status: 'scheduled',
  seo: {title: 'Next post', description: 'An announced idea.'}, contentFormat: 'editorjs',
  blocks: [{id: 'intro', type: 'paragraph', data: {text: 'Private early article body.'}}],
  createdAt: '2026-09-01T12:00:00.000Z', updatedAt: '2026-09-01T12:00:00.000Z', publishedAt: '2026-10-15T12:00:00.000Z',
};
export const TEST_SCHEDULE = {serverNow: '2026-10-01T12:00:00.000Z', entries: [{
  id: 'next-post', slug: 'next-post', title: 'Next post', excerpt: 'An announced idea.', coverImage: '/assets/images/backgrounds/night.webp',
  publishedAt: '2026-10-15T12:00:00.000Z', earlyAccessAt: '2026-10-01T12:00:00.000Z', status: 'scheduled', access: 'locked',
}]};
