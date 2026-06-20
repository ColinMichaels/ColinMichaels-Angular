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
