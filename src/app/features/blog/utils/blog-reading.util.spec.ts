import {BlogPost} from '../models/blog-post.model';
import {
  createBlogHeadingIdMap,
  createBlogReadingStats,
  createBlogTableOfContents,
  hasMeaningfulPostUpdate
} from './blog-reading.util';

function createPost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: 'post-reading-test',
    slug: 'reading-test',
    title: 'Reading Test',
    excerpt: 'A concise article summary.',
    coverImage: '/assets/images/backgrounds/night.webp',
    author: {
      name: 'Colin Michaels',
      title: 'Frontend Engineer',
    },
    categories: ['UX'],
    tags: ['Reading'],
    status: 'published',
    seo: {
      title: 'Reading Test',
      description: 'A concise article summary.',
      openGraphImage: '',
    },
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-03T12:00:00.000Z',
    publishedAt: '2026-01-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('blog reading utilities', () => {
  it('creates stable table-of-contents IDs from header blocks', () => {
    const blocks: BlogPost['blocks'] = [
      {id: 'intro', type: 'header', data: {text: 'Intro & Setup', level: 2}},
      {id: 'detail', type: 'header', data: {text: 'Intro & Setup', level: 3}},
      {id: 'body', type: 'paragraph', data: {text: 'Body copy'}},
    ];

    expect(createBlogTableOfContents(blocks)).toEqual([
      {blockId: 'intro', id: 'intro-and-setup', level: 2, text: 'Intro & Setup'},
      {blockId: 'detail', id: 'intro-and-setup-2', level: 3, text: 'Intro & Setup'},
    ]);
    expect(createBlogHeadingIdMap(blocks).get('detail')).toBe('intro-and-setup-2');
  });

  it('calculates reading stats from visible article text', () => {
    const post = createPost({
      excerpt: 'One two.',
      blocks: [
        {id: 'heading', type: 'header', data: {text: 'Three four', level: 2}},
        {id: 'paragraph', type: 'paragraph', data: {text: 'Five six seven.'}},
        {id: 'list', type: 'list', data: {items: ['Eight nine', 'Ten']}},
      ],
    });

    expect(createBlogReadingStats(post)).toEqual({
      readingMinutes: 1,
      wordCount: 10,
    });
  });

  it('only treats updates at least one day after publish as meaningful', () => {
    expect(hasMeaningfulPostUpdate(createPost())).toBeTrue();
    expect(hasMeaningfulPostUpdate(createPost({
      updatedAt: '2026-01-01T18:00:00.000Z',
    }))).toBeFalse();
  });
});
