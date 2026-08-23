import {BlogPost} from '../../../features/blog/models/blog-post.model';
import {validateEditorDocumentForBlog} from './blog-editor-document-validation.util';
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
  it('rejects non-object tune metadata instead of silently dropping it', () => {
    expect(() => createBlogBlocksFromEditorDocument({
      blocks: [{
        id: 'paragraph-unsafe-tunes',
        type: 'paragraph',
        data: {text: 'Safe copy'},
        tunes: ['alignment'],
      }],
    })).toThrowError(/non-object tune metadata/);
  });

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

  it('round-trips one explicit companion YouTube video without changing legacy embeds', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [{
        id: 'youtube-companion',
        type: 'youtubeEmbed',
        data: {
          url: 'https://youtu.be/L229QDxDakU',
          isCompanionVideo: true,
          videoTitle: 'Field flight',
          videoDescription: 'The exact public companion video.',
          videoUploadDate: '2026-08-13T13:43:21Z',
          videoDurationSeconds: 158.4,
        },
      }],
    });

    expect(blocks[0]).toEqual({
      id: 'youtube-companion',
      type: 'embed',
      data: {
        provider: 'youtube',
        url: 'https://youtu.be/L229QDxDakU',
        embedUrl: 'https://www.youtube.com/embed/L229QDxDakU',
        isCompanionVideo: true,
        videoTitle: 'Field flight',
        videoDescription: 'The exact public companion video.',
        videoUploadDate: '2026-08-13T13:43:21Z',
        videoDurationSeconds: 158.4,
      },
    });

    expect(createEditorDocument(createPost({blocks})).blocks[0]).toEqual({
      id: 'youtube-companion',
      type: 'youtubeEmbed',
      data: {
        url: 'https://www.youtube.com/watch?v=L229QDxDakU',
        isCompanionVideo: true,
        videoTitle: 'Field flight',
        videoDescription: 'The exact public companion video.',
        videoUploadDate: '2026-08-13T13:43:21Z',
        videoDurationSeconds: 158.4,
      },
    });
  });

  it('rejects multiple companion video selections as an ambiguous article pairing', () => {
    expect(() => createBlogBlocksFromEditorDocument({
      blocks: [
        {
          id: 'youtube-1',
          type: 'youtubeEmbed',
          data: {url: 'https://youtu.be/L229QDxDakU', isCompanionVideo: true},
        },
        {
          id: 'youtube-2',
          type: 'youtubeEmbed',
          data: {url: 'https://youtu.be/abcdefghijk', isCompanionVideo: true},
        },
      ],
    })).toThrowError(/exactly one companion YouTube block/i);
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

  it('does not emit an undefined height for legacy app embeds', () => {
    const document = createEditorDocument(createPost({
      blocks: [{
        id: 'legacy-app-embed',
        type: 'embed',
        data: {
          provider: 'app',
          url: 'https://example.com/tool',
          embedUrl: 'https://example.com/tool',
          caption: 'Legacy app embed',
        },
      }],
    }));

    expect(document.blocks[0]).toEqual({
      id: 'legacy-app-embed',
      type: 'appEmbed',
      data: {
        url: 'https://example.com/tool',
        caption: 'Legacy app embed',
      },
    });
    expect(validateEditorDocumentForBlog(document).isValid).toBeTrue();
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
            imageSize: 'medium',
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
          imageSize: 'medium',
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
        imageSize: 'medium',
      },
    });
  });

  it('does not materialize an optional image size when a legacy block has none', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [{
        id: 'legacy-image',
        type: 'image',
        data: {
          file: {url: '/assets/images/backgrounds/day.webp'},
          imageLayout: 'contained',
        },
      }],
    });

    const document = createEditorDocument(createPost({blocks}));

    expect(blocks[0].data.imageSize).toBeUndefined();
    expect(document.blocks[0]).toEqual({
      id: 'legacy-image',
      type: 'image',
      data: {
        file: {
          url: '/assets/images/backgrounds/day.webp',
          alt: '',
        },
        alt: '',
        caption: '',
        withBorder: false,
        withBackground: false,
        stretched: false,
        imageLayout: 'contained',
      },
    });
    expect(validateEditorDocumentForBlog(document).isValid).toBeTrue();
  });

  it('compatibility-protects an image block with an arbitrary size value', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [{
        id: 'invalid-image-size',
        type: 'image',
        data: {
          file: {url: '/assets/images/backgrounds/day.webp'},
          imageLayout: 'contained',
          imageSize: '960px',
        },
      }],
    });

    expect(blocks.length).toBe(1);
    expect(blocks[0].id).toBe('invalid-image-size');
    expect(blocks[0].type).toBe('unsupported');
    expect(blocks[0].data.unsupportedBlock?.originalType).toBe('image');
    expect(JSON.stringify(blocks[0].data.unsupportedBlock?.originalData)).toBe(JSON.stringify({
      file: {url: '/assets/images/backgrounds/day.webp'},
      imageLayout: 'contained',
      imageSize: '960px',
    }));
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

  it('preserves obsolete Cat Corner configuration in an unsupported envelope instead of dropping it', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [{
        id: 'cat-corner-unlock-1',
        type: 'catCornerUnlock',
        data: {
          imageUrl: 'https://example.com/ignored.jpg',
        },
      }],
    });

    expect(blocks as unknown).toEqual([{
      id: 'cat-corner-unlock-1',
      type: 'unsupported',
      data: {
        unsupportedBlock: {
          originalType: 'catCornerUnlock',
          originalData: {
            imageUrl: 'https://example.com/ignored.jpg',
          },
        },
      },
    }]);
    expect(createEditorDocument(createPost({blocks})).blocks[0]).toEqual({
      id: 'cat-corner-unlock-1',
      type: 'unsupported',
      data: {
        originalType: 'catCornerUnlock',
        originalData: {
          imageUrl: 'https://example.com/ignored.jpg',
        },
      },
    });
  });

  it('round-trips the canonical Cat Corner unlock block', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [{id: 'cat-corner-unlock-1', type: 'catCornerUnlock', data: {}}],
    });

    expect(blocks).toEqual([{id: 'cat-corner-unlock-1', type: 'catCornerUnlock', data: {}}]);
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

  it('normalizes Chart.js labels and datasets without losing series', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [
        {
          id: 'chart-series-1',
          type: 'chart',
          data: {
            title: 'Title trends',
            type: 'line',
            data: {
              labels: ['1995–2004', '2005–2014', '2015–2024'],
              datasets: [
                {
                  label: 'One-word titles',
                  data: [18, '22.4', 28.2],
                },
                {
                  label: 'Titles using love',
                  data: [5.3, 4.7, 3],
                },
              ],
            },
          },
        },
      ],
    });

    expect(blocks).toEqual([
      {
        id: 'chart-series-1',
        type: 'chart',
        data: {
          title: 'Title trends',
          caption: '',
          chartType: 'line',
          unit: '',
          chartPoints: [
            {label: '1995–2004', value: 18, series: 'One-word titles'},
            {label: '1995–2004', value: 5.3, series: 'Titles using love'},
            {label: '2005–2014', value: 22.4, series: 'One-word titles'},
            {label: '2005–2014', value: 4.7, series: 'Titles using love'},
            {label: '2015–2024', value: 28.2, series: 'One-word titles'},
            {label: '2015–2024', value: 3, series: 'Titles using love'},
          ],
        },
      },
    ]);
  });

  it('preserves Chart.js labels, datasets, axes, formatting, sources, and accessibility metadata', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [{
        id: 'chart-datasets',
        type: 'chart',
        data: {
          title: 'Song titles compressed while love lost share',
          caption: 'Thirty years of Billboard titles.',
          chartType: 'line',
          labels: ['1995–2004', '2005–2014', '2015–2024'],
          datasets: [
            {
              label: 'One-word titles',
              data: [18, 22.6, 28.2],
              borderColor: '#22d3ee',
              backgroundColor: 'rgba(34, 211, 238, 0.72)',
            },
            {
              label: 'Titles containing love',
              data: [5.3, 4.7, 3],
              borderColor: '#f472b6',
              backgroundColor: 'rgba(244, 114, 182, 0.72)',
            },
          ],
          xAxisTitle: 'Billboard year-end era',
          yAxisTitle: 'Share of titles',
          yMax: 30,
          valueSuffix: '%',
          decimals: 1,
          showLegend: true,
          sourceLabel: 'Billboard Year-End Hot 100 lists',
          sourceUrl: 'https://example.com/billboard',
          accessibilitySummary: 'One-word titles rose while love-title share fell.',
        },
      }],
    });

    expect(blocks[0].data).toEqual({
      title: 'Song titles compressed while love lost share',
      caption: 'Thirty years of Billboard titles.',
      chartType: 'line',
      unit: '',
      chartPoints: [],
      labels: ['1995–2004', '2005–2014', '2015–2024'],
      datasets: [
        {
          label: 'One-word titles',
          data: [18, 22.6, 28.2],
          borderColor: '#22d3ee',
          backgroundColor: 'rgba(34, 211, 238, 0.72)',
        },
        {
          label: 'Titles containing love',
          data: [5.3, 4.7, 3],
          borderColor: '#f472b6',
          backgroundColor: 'rgba(244, 114, 182, 0.72)',
        },
      ],
      xAxisTitle: 'Billboard year-end era',
      yAxisTitle: 'Share of titles',
      yMax: 30,
      valueSuffix: '%',
      decimals: 1,
      showLegend: true,
      sourceLabel: 'Billboard Year-End Hot 100 lists',
      sourceUrl: 'https://example.com/billboard',
      accessibilitySummary: 'One-word titles rose while love-title share fell.',
    });

    expect(createEditorDocument(createPost({blocks})).blocks[0].data).toEqual(blocks[0].data);
  });

  it('keeps legacy flat string lists byte-for-byte compatible', () => {
    const source = {
      blocks: [{
        id: 'legacy-list',
        type: 'list',
        data: {
          style: 'ordered',
          items: ['First item', 'Second <strong>item</strong>'],
        },
      }],
    };

    const blocks = createBlogBlocksFromEditorDocument(source);

    expect(blocks).toEqual([{
      id: 'legacy-list',
      type: 'list',
      data: {
        ordered: true,
        items: ['First item', 'Second <strong>item</strong>'],
      },
    }]);
    expect(createEditorDocument(createPost({blocks})).blocks).toEqual(source.blocks);
  });

  it('round-trips recursive Editor.js list hierarchy and metadata without flattening', () => {
    const source = {
      blocks: [{
        id: 'nested-list',
        type: 'list',
        data: {
          style: 'ordered',
          meta: {start: 3, counterType: 'upper-roman'},
          items: [{
            content: 'Parent',
            meta: {start: 3},
            items: [{
              content: 'Child',
              meta: {counterType: 'lower-alpha'},
              items: [],
            }],
          }],
        },
      }],
    };

    const blocks = createBlogBlocksFromEditorDocument(source);

    expect(blocks[0] as unknown).toEqual({
      id: 'nested-list',
      type: 'list',
      data: {
        ordered: true,
        listStyle: 'ordered',
        listMeta: {start: 3, counterType: 'upper-roman'},
        listItems: [{
          content: 'Parent',
          meta: {start: 3},
          items: [{content: 'Child', meta: {counterType: 'lower-alpha'}, items: []}],
        }],
      },
    });
    expect(createEditorDocument(createPost({blocks})).blocks).toEqual(source.blocks);
  });

  it('round-trips the bounded list presentation tune without leaking it into opaque tunes', () => {
    const source = {
      blocks: [{
        id: 'steps-list',
        type: 'list',
        data: {
          style: 'ordered',
          meta: {},
          items: [
            {content: 'Draft', meta: {}, items: []},
            {content: 'Review', meta: {}, items: []},
          ],
        },
        tunes: {
          listPresentation: {presentation: 'steps'},
          alignmentTune: {alignment: 'left'},
        },
      }],
    };

    const blocks = createBlogBlocksFromEditorDocument(source);

    expect(blocks[0].data.listPresentation).toBe('steps');
    expect(blocks[0].editorTunes as unknown).toEqual({alignmentTune: {alignment: 'left'}});
    expect(createEditorDocument(createPost({blocks})).blocks).toEqual(source.blocks);
  });

  it('envelopes invalid list presentation tune values instead of partially saving them', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [{
        id: 'invalid-list-presentation',
        type: 'list',
        data: {style: 'ordered', items: ['Draft']},
        tunes: {listPresentation: {presentation: 'timeline'}},
      }],
    });

    expect(blocks[0].type).toBe('unsupported');
    expect(blocks[0].data.unsupportedBlock?.originalTunes as unknown).toEqual({
      listPresentation: {presentation: 'timeline'},
    });
  });

  it('envelopes Steps on a non-ordered list instead of saving an ambiguous presentation', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [{
        id: 'unordered-steps',
        type: 'list',
        data: {style: 'unordered', items: ['Draft']},
        tunes: {listPresentation: {presentation: 'steps'}},
      }],
    });

    expect(blocks[0].type).toBe('unsupported');
    expect(blocks[0].data.unsupportedBlock?.originalData as unknown).toEqual({
      style: 'unordered',
      items: ['Draft'],
    });
    expect(blocks[0].data.unsupportedBlock?.originalTunes as unknown).toEqual({
      listPresentation: {presentation: 'steps'},
    });
  });

  it('round-trips modern and legacy checklist state without flattening it', () => {
    const modernBlocks = createBlogBlocksFromEditorDocument({
      blocks: [{
        id: 'modern-checklist',
        type: 'list',
        data: {
          style: 'checklist',
          meta: {},
          items: [{
            content: 'Ship it',
            meta: {checked: true},
            items: [{content: 'Tag release', meta: {checked: false}, items: []}],
          }],
        },
      }],
    });

    expect(modernBlocks[0].data.listStyle).toBe('checklist');
    expect(modernBlocks[0].data.listItems?.[0].meta['checked']).toBeTrue();
    expect(modernBlocks[0].data.listItems?.[0].items[0].meta['checked']).toBeFalse();
    expect(createEditorDocument(createPost({blocks: modernBlocks})).blocks[0].data).toEqual({
      style: 'checklist',
      meta: {},
      items: [{
        content: 'Ship it',
        meta: {checked: true},
        items: [{content: 'Tag release', meta: {checked: false}, items: []}],
      }],
    });

    const legacyBlocks = createBlogBlocksFromEditorDocument({
      blocks: [{
        id: 'legacy-checklist',
        type: 'checklist',
        data: {items: [{text: 'Reviewed', checked: true}, {text: 'Published', checked: false}]},
      }],
    });

    expect(legacyBlocks[0] as unknown).toEqual({
      id: 'legacy-checklist',
      type: 'list',
      data: {
        ordered: false,
        listStyle: 'checklist',
        listMeta: {},
        listItems: [
          {content: 'Reviewed', meta: {checked: true}, items: []},
          {content: 'Published', meta: {checked: false}, items: []},
        ],
      },
    });
  });

  it('preserves raw unsupported block data and tunes through the registered compatibility block', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [{
        id: 'table-1',
        type: 'table',
        data: {
          withHeadings: true,
          content: [['Name', 'Value'], ['Speed', 42]],
          settings: {compact: false},
        },
        tunes: {alignmentTune: {alignment: 'center'}},
      }],
    });

    expect(blocks as unknown).toEqual([{
      id: 'table-1',
      type: 'unsupported',
      data: {
        unsupportedBlock: {
          originalType: 'table',
          originalData: {
            withHeadings: true,
            content: [['Name', 'Value'], ['Speed', 42]],
            settings: {compact: false},
          },
          originalTunes: {alignmentTune: {alignment: 'center'}},
        },
      },
    }]);

    const wrapped = createEditorDocument(createPost({blocks}));
    expect(wrapped.blocks[0]).toEqual({
      id: 'table-1',
      type: 'unsupported',
      data: {
        originalType: 'table',
        originalData: {
          withHeadings: true,
          content: [['Name', 'Value'], ['Speed', 42]],
          settings: {compact: false},
        },
        originalTunes: {alignmentTune: {alignment: 'center'}},
      },
    });
    expect(createBlogBlocksFromEditorDocument(wrapped) as unknown).toEqual(blocks);
  });

  it('restores supported list and chart envelopes into editable and public blocks', () => {
    const document = createEditorDocument(createPost({
      blocks: [
        {
          id: 'canonical-list',
          type: 'unsupported',
          data: {
            unsupportedBlock: {
              originalType: 'list',
              originalData: {
                items: ['Draft', 'Review'],
                ordered: true,
                listStyle: 'ordered',
                listPresentation: 'steps',
              },
            },
          },
        },
        {
          id: 'chart-series',
          type: 'unsupported',
          data: {
            unsupportedBlock: {
              originalType: 'chart',
              originalData: {
                chartType: 'line',
                labels: ['Week 1', 'Week 2'],
                datasets: [{label: 'Readers', data: [42, 57]}],
              },
            },
          },
        },
      ],
    }));

    expect(document.blocks).toEqual([
      {
        id: 'canonical-list',
        type: 'list',
        data: {style: 'ordered', items: ['Draft', 'Review']},
        tunes: {listPresentation: {presentation: 'steps'}},
      },
      {
        id: 'chart-series',
        type: 'chart',
        data: {
          chartType: 'line',
          labels: ['Week 1', 'Week 2'],
          datasets: [{label: 'Readers', data: [42, 57]}],
        },
      },
    ]);

    const restored = createBlogBlocksFromEditorDocument(document);
    expect(restored.map(block => block.type)).toEqual(['list', 'chart']);
    expect(restored[0].data).toEqual(jasmine.objectContaining({
      items: ['Draft', 'Review'],
      ordered: true,
      listPresentation: 'steps',
    }));
    expect(restored[1].data).toEqual(jasmine.objectContaining({
      chartType: 'line',
      labels: ['Week 1', 'Week 2'],
      datasets: [{label: 'Readers', data: [42, 57]}],
    }));
  });

  it('envelopes malformed known blocks instead of partially normalizing or dropping data', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [{
        id: 'bad-list',
        type: 'list',
        data: {
          style: 'unordered',
          items: ['Legacy', {content: 'Recursive', meta: {}, items: []}],
        },
      }],
    });

    expect(blocks as unknown).toEqual([{
      id: 'bad-list',
      type: 'unsupported',
      data: {
        unsupportedBlock: {
          originalType: 'list',
          originalData: {
            style: 'unordered',
            items: ['Legacy', {content: 'Recursive', meta: {}, items: []}],
          },
        },
      },
    }]);
  });

  it('preserves Editor.js tune metadata on supported blocks', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [{
        id: 'paragraph-with-tunes',
        type: 'paragraph',
        data: {text: 'Aligned copy'},
        tunes: {alignmentTune: {alignment: 'right'}},
      }],
    });

    expect(blocks[0].editorTunes as unknown).toEqual({alignmentTune: {alignment: 'right'}});
    expect(createEditorDocument(createPost({blocks})).blocks[0]).toEqual({
      id: 'paragraph-with-tunes',
      type: 'paragraph',
      data: {text: 'Aligned copy'},
      tunes: {alignmentTune: {alignment: 'right'}},
    });
  });

  it('round-trips ordered gallery images and omits unavailable optional fields', () => {
    const source = {
      blocks: [{
        id: 'gallery-1',
        type: 'gallery',
        data: {
          title: 'Recording weekend',
          caption: 'Three moments from the session.',
          layout: 'mosaic',
          images: [
            {url: '/assets/images/backgrounds/day.webp', alt: 'Day session', width: 1600, height: 900},
            {url: '/assets/images/backgrounds/night.webp', alt: 'Night session', caption: 'After dark'},
          ],
        },
      }],
    };

    const blocks = createBlogBlocksFromEditorDocument(source);

    expect(blocks).toEqual([{
      id: 'gallery-1',
      type: 'gallery',
      data: {
        title: 'Recording weekend',
        caption: 'Three moments from the session.',
        galleryLayout: 'mosaic',
        galleryImages: [
          {url: '/assets/images/backgrounds/day.webp', alt: 'Day session', width: 1600, height: 900},
          {url: '/assets/images/backgrounds/night.webp', alt: 'Night session', caption: 'After dark'},
        ],
      },
    }]);
    expect(createEditorDocument(createPost({blocks})).blocks).toEqual(source.blocks);
  });

  it('compatibility-protects a malformed known gallery without dropping its images', () => {
    const blocks = createBlogBlocksFromEditorDocument({
      blocks: [{
        id: 'gallery-invalid',
        type: 'gallery',
        data: {
          layout: 'autoplay-stack',
          images: [{url: '/assets/images/backgrounds/day.webp', alt: 'Only image'}],
        },
      }],
    });

    expect(blocks[0] as unknown).toEqual({
      id: 'gallery-invalid',
      type: 'unsupported',
      data: {
        unsupportedBlock: {
          originalType: 'gallery',
          originalData: {
            layout: 'autoplay-stack',
            images: [{url: '/assets/images/backgrounds/day.webp', alt: 'Only image'}],
          },
        },
      },
    });
  });
});
