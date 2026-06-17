import {BlogPost} from '../../../features/blog/models/blog-post.model';
import {createBlogBlocksFromEditorDocument, createEditorDocument} from './blog-editorjs-adapter';

function createPost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: 'post-editorjs-adapter',
    slug: 'editorjs-adapter',
    title: 'Editor.js Adapter',
    excerpt: 'Adapter test post.',
    coverImage: '/assets/images/backgrounds/night.webp',
    author: {
      name: 'Colin Michaels',
      title: 'Applications Developer',
    },
    categories: ['CMS'],
    tags: ['Editor.js'],
    status: 'published',
    seo: {
      title: 'Editor.js Adapter',
      description: 'Adapter test post.',
      openGraphImage: '',
    },
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z',
    publishedAt: '2026-01-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('blog-editorjs-adapter', () => {
  it('normalizes editorjs-youtube-embed blocks into trusted blog embed blocks', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [
        {
          id: 'youtube-1',
          type: 'youtubeEmbed',
          data: {
            url: 'https://www.youtube.com/watch?v=L229QDxDakU',
          },
        },
      ],
    });

    expect(blocks).toEqual([
      {
        id: 'youtube-1',
        type: 'embed',
        data: {
          provider: 'youtube',
          url: 'https://www.youtube.com/watch?v=L229QDxDakU',
          embedUrl: 'https://www.youtube.com/embed/L229QDxDakU',
        },
      },
    ]);
  });

  it('opens saved YouTube blog embeds with the YouTube editor tool', () => {
    const document = createEditorDocument(createPost({
      blocks: [
        {
          id: 'embed-1',
          type: 'embed',
          data: {
            provider: 'youtube',
            url: 'https://youtu.be/L229QDxDakU',
            embedUrl: 'https://www.youtube.com/embed/L229QDxDakU',
          },
        },
      ],
    }));

    expect(document.blocks[0]).toEqual({
      id: 'embed-1',
      type: 'youtubeEmbed',
      data: {
        url: 'https://www.youtube.com/watch?v=L229QDxDakU',
      },
    });
  });
});
