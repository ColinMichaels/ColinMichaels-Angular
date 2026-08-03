import {BlogPost} from '../models/blog-post.model';
import {
  createBlogArticleGridLayout,
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
      title: 'Applications Developer',
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
  it('selects article grid tracks from the rails that actually exist', () => {
    expect(createBlogArticleGridLayout(false, false)).toBe('article-only');
    expect(createBlogArticleGridLayout(true, false)).toBe('contents-and-article');
    expect(createBlogArticleGridLayout(false, true)).toBe('article-and-related');
    expect(createBlogArticleGridLayout(true, true)).toBe('three-column');
  });

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

  it('expands TLDR labels without changing their existing anchor IDs', () => {
    const blocks: BlogPost['blocks'] = [
      {id: 'summary-plain', type: 'header', data: {text: 'TLDR', level: 2}},
      {id: 'summary-punctuated', type: 'header', data: {text: 'TL;DR', level: 2}},
    ];

    expect(createBlogTableOfContents(blocks)).toEqual([
      {blockId: 'summary-plain', id: 'tldr', level: 2, text: 'Quick Summary (TL;DR)'},
      {blockId: 'summary-punctuated', id: 'tl-dr', level: 2, text: 'Quick Summary (TL;DR)'},
    ]);
    expect(createBlogHeadingIdMap(blocks).get('summary-plain')).toBe('tldr');
    expect(createBlogHeadingIdMap(blocks).get('summary-punctuated')).toBe('tl-dr');
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

  it('counts readable Markdown content without formatting syntax', () => {
    const post = createPost({
      excerpt: '',
      blocks: [{
        id: 'markdown',
        type: 'markdown',
        data: {markdown: '## Setup\n\nUse **typed blocks** and run `npm install`.'},
      }],
    });

    expect(createBlogReadingStats(post)).toEqual({
      readingMinutes: 1,
      wordCount: 8,
    });
  });

  it('counts poll questions, supporting copy, and answer labels', () => {
    const post = createPost({
      excerpt: '',
      blocks: [{
        id: 'poll',
        type: 'poll',
        data: {
          question: 'Which feature should ship next?',
          description: 'Choose the most useful improvement.',
          pollOptions: [
            {id: 'search', label: 'Faster search'},
            {id: 'themes', label: 'More themes'},
          ],
          pollResultsVisibility: 'afterVote',
        },
      }],
    });

    expect(createBlogReadingStats(post)).toEqual({
      readingMinutes: 1,
      wordCount: 14,
    });
  });

  it('only treats updates at least one day after publish as meaningful', () => {
    expect(hasMeaningfulPostUpdate(createPost())).toBeTrue();
    expect(hasMeaningfulPostUpdate(createPost({
      updatedAt: '2026-01-01T18:00:00.000Z',
    }))).toBeFalse();
  });
});
