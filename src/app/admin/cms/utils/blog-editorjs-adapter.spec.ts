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
  it('normalizes saved youtubeEmbed blocks into trusted blog embed blocks', () => {
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

  it('round-trips app editor blocks through the typed blog embed model', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [
        {
          id: 'app-embed-1',
          type: 'appEmbed',
          data: {
            url: 'https://hear-the-hook.captaincolin.chatgpt.site/soundboard',
            caption: 'Hear the Hook',
            height: 820,
          },
        },
      ],
    });

    expect(blocks).toEqual([
      {
        id: 'app-embed-1',
        type: 'embed',
        data: {
          provider: 'app',
          url: 'https://hear-the-hook.captaincolin.chatgpt.site/soundboard',
          embedUrl: 'https://hear-the-hook.captaincolin.chatgpt.site/soundboard',
          caption: 'Hear the Hook',
          height: 820,
        },
      },
    ]);

    const document = createEditorDocument(createPost({blocks}));

    expect(document.blocks[0]).toEqual({
      id: 'app-embed-1',
      type: 'appEmbed',
      data: {
        url: 'https://hear-the-hook.captaincolin.chatgpt.site/soundboard',
        caption: 'Hear the Hook',
        height: 820,
      },
    });
  });

  it('round-trips Suno editor blocks through canonical song and player URLs', () => {
    const songId = '44cd6eab-d6d7-4cb9-bea7-af398776556e';
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [
        {
          id: 'suno-embed-1',
          type: 'sunoEmbed',
          data: {
            url: `https://suno.com/embed/${songId}`,
            caption: 'Some Memories Never Stop Playing',
          },
        },
      ],
    });

    expect(blocks).toEqual([
      {
        id: 'suno-embed-1',
        type: 'embed',
        data: {
          provider: 'suno',
          url: `https://suno.com/song/${songId}`,
          embedUrl: `https://suno.com/embed/${songId}`,
          caption: 'Some Memories Never Stop Playing',
          height: 240,
        },
      },
    ]);

    expect(createEditorDocument(createPost({blocks})).blocks[0]).toEqual({
      id: 'suno-embed-1',
      type: 'sunoEmbed',
      data: {
        url: `https://suno.com/song/${songId}`,
        caption: 'Some Memories Never Stop Playing',
      },
    });
  });

  it('round-trips poll definitions without result or vote state', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [
        {
          id: 'poll-1',
          type: 'poll',
          data: {
            placement: 'rail',
            question: 'Which topic should I cover next?',
            description: 'Choose one answer.',
            pollOptions: [
              {id: 'angular', label: 'Angular'},
              {id: 'firebase', label: 'Firebase'},
            ],
            pollResultsVisibility: 'afterVote',
          },
        },
      ],
    });

    expect(blocks).toEqual([
      {
        id: 'poll-1',
        type: 'poll',
        data: {
          placement: 'rail',
          question: 'Which topic should I cover next?',
          description: 'Choose one answer.',
          pollOptions: [
            {id: 'angular', label: 'Angular'},
            {id: 'firebase', label: 'Firebase'},
          ],
          pollResultsVisibility: 'afterVote',
        },
      },
    ]);

    expect(createEditorDocument(createPost({blocks})).blocks[0]).toEqual({
      id: 'poll-1',
      type: 'poll',
      data: blocks[0].data,
    });
  });

  it('normalizes custom stats, chart, and HTML editor blocks', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [
        {
          id: 'stats-1',
          type: 'stats',
          data: {
            title: 'Performance Snapshot',
            caption: 'Factory figures.',
            stats: [
              {label: 'Horsepower', value: '480 hp', caption: '5.0L V8'},
              {label: '', value: ''},
            ],
          },
        },
        {
          id: 'chart-1',
          type: 'chart',
          data: {
            title: 'Power by Trim',
            chartType: 'line',
            unit: 'hp',
            chartPoints: [
              {label: 'EcoBoost', value: 315, note: 'Turbo four'},
              {label: 'GT', value: 480},
              {label: 'Invalid', value: 'fast'},
            ],
          },
        },
        {
          id: 'html-1',
          type: 'html',
          data: {
            title: 'Custom spec table',
            html: '<table><tr><td>0-60 mph</td><td>4.2 sec</td></tr></table>',
          },
        },
      ],
    });

    expect(blocks).toEqual([
      {
        id: 'stats-1',
        type: 'stats',
        data: {
          title: 'Performance Snapshot',
          caption: 'Factory figures.',
          stats: [
            {label: 'Horsepower', value: '480 hp', caption: '5.0L V8'},
          ],
        },
      },
      {
        id: 'chart-1',
        type: 'chart',
        data: {
          title: 'Power by Trim',
          caption: '',
          chartType: 'line',
          unit: 'hp',
          chartPoints: [
            {label: 'EcoBoost', value: 315, note: 'Turbo four'},
            {label: 'GT', value: 480},
          ],
        },
      },
      {
        id: 'html-1',
        type: 'html',
        data: {
          title: 'Custom spec table',
          html: '<table><tr><td>0-60 mph</td><td>4.2 sec</td></tr></table>',
        },
      },
    ]);
  });

  it('preserves CMS image layout metadata across editor conversions', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [
        {
          id: 'image-1',
          type: 'image',
          data: {
            file: {
              url: '/assets/images/backgrounds/day.webp',
              alt: 'Inline detail',
              width: 960,
              height: 640,
            },
            alt: 'Inline detail',
            caption: 'Placed beside supporting copy.',
            imageLayout: 'inlineEnd',
            withBorder: true,
            withBackground: true,
          },
        },
      ],
    });

    expect(blocks).toEqual([
      {
        id: 'image-1',
        type: 'image',
        data: {
          url: '/assets/images/backgrounds/day.webp',
          alt: 'Inline detail',
          caption: 'Placed beside supporting copy.',
          width: 960,
          height: 640,
          stretched: false,
          withBorder: true,
          withBackground: true,
          imageLayout: 'inlineEnd',
        },
      },
    ]);

    const document = createEditorDocument(createPost({blocks}));

    expect(document.blocks[0]).toEqual({
      id: 'image-1',
      type: 'image',
      data: {
        file: {
          url: '/assets/images/backgrounds/day.webp',
          alt: 'Inline detail',
          width: 960,
          height: 640,
        },
        alt: 'Inline detail',
        caption: 'Placed beside supporting copy.',
        withBorder: true,
        withBackground: true,
        stretched: false,
        imageLayout: 'inlineEnd',
      },
    });
  });

  it('preserves code block language metadata across editor conversions', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [
        {
          id: 'code-1',
          type: 'code',
          data: {
            language: 'typescript',
            code: 'const answer = 42;',
          },
        },
      ],
    });

    expect(blocks).toEqual([
      {
        id: 'code-1',
        type: 'code',
        data: {
          language: 'typescript',
          code: 'const answer = 42;',
        },
      },
    ]);

    expect(createEditorDocument(createPost({blocks})).blocks[0]).toEqual({
      id: 'code-1',
      type: 'code',
      data: {
        language: 'typescript',
        code: 'const answer = 42;',
      },
    });
  });

  it('preserves Markdown source across editor conversions', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [
        {
          id: 'markdown-1',
          type: 'markdown',
          data: {
            markdown: '## Setup\n\nRun `npm install`.',
          },
        },
      ],
    });

    expect(blocks).toEqual([
      {
        id: 'markdown-1',
        type: 'markdown',
        data: {
          markdown: '## Setup\n\nRun `npm install`.',
        },
      },
    ]);

    expect(createEditorDocument(createPost({blocks})).blocks[0]).toEqual({
      id: 'markdown-1',
      type: 'markdown',
      data: {
        markdown: '## Setup\n\nRun `npm install`.',
      },
    });
  });

  it('preserves the reusable Cat Corner unlock block without configurable image data', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [{
        id: 'cat-corner-unlock-1',
        type: 'catCornerUnlock',
        data: {
          imageUrl: 'https://example.com/ignored.jpg',
        },
      }],
    });

    expect(blocks).toEqual([{
      id: 'cat-corner-unlock-1',
      type: 'catCornerUnlock',
      data: {},
    }]);
    expect(createEditorDocument(createPost({blocks})).blocks[0]).toEqual({
      id: 'cat-corner-unlock-1',
      type: 'catCornerUnlock',
      data: {},
    });
  });

  it('round trips custom blog blocks back into Editor.js documents', () => {
    const document = createEditorDocument(createPost({
      blocks: [
        {
          id: 'stats-1',
          type: 'stats',
          data: {
            title: 'Quick Specs',
            stats: [{label: 'Torque', value: '415 lb-ft'}],
          },
        },
        {
          id: 'chart-1',
          type: 'chart',
          data: {
            chartType: 'bar',
            chartPoints: [{label: 'GT', value: 480}],
            unit: 'hp',
          },
        },
        {
          id: 'html-1',
          type: 'html',
          data: {
            html: '<section><p>Custom body</p></section>',
          },
        },
      ],
    }));

    expect(document.blocks).toEqual([
      {
        id: 'stats-1',
        type: 'stats',
        data: {
          title: 'Quick Specs',
          stats: [{label: 'Torque', value: '415 lb-ft'}],
        },
      },
      {
        id: 'chart-1',
        type: 'chart',
        data: {
          chartType: 'bar',
          chartPoints: [{label: 'GT', value: 480}],
          unit: 'hp',
        },
      },
      {
        id: 'html-1',
        type: 'html',
        data: {
          html: '<section><p>Custom body</p></section>',
        },
      },
    ]);
  });

  it('normalizes imported stats and chart blocks from common JSON row shapes', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [
        {
          id: 'stats-1',
          type: 'stats',
          data: {
            items: [
              {metric: 'Horsepower', figure: '480 hp', notes: '5.0L V8'},
              ['Torque', '415 lb-ft', 'Peak torque'],
            ],
          },
        },
        {
          id: 'chart-1',
          type: 'chart',
          data: {
            points: [
              {name: 'EcoBoost', y: '315', notes: 'Turbo four'},
              ['GT', '480 hp', 'Manual coupe'],
            ],
          },
        },
      ],
    });

    expect(blocks).toEqual([
      {
        id: 'stats-1',
        type: 'stats',
        data: {
          title: '',
          caption: '',
          stats: [
            {label: 'Horsepower', value: '480 hp', caption: '5.0L V8'},
            {label: 'Torque', value: '415 lb-ft', caption: 'Peak torque'},
          ],
        },
      },
      {
        id: 'chart-1',
        type: 'chart',
        data: {
          title: '',
          caption: '',
          chartType: 'bar',
          unit: '',
          chartPoints: [
            {label: 'EcoBoost', value: 315, note: 'Turbo four'},
            {label: 'GT', value: 480, note: 'Manual coupe'},
          ],
        },
      },
    ]);
  });
});
