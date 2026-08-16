import {BlogContentBlock} from '../../../features/blog/models/blog-post.model';
import {analyzeBlogContentTrustSignals} from './blog-content-trust-signals.util';

describe('blog content trust signals', () => {
  it('finds descriptive external references and contextual internal article links', () => {
    const blocks: BlogContentBlock[] = [
      {
        id: 'sources',
        type: 'header',
        data: {text: 'Sources', level: 2},
      },
      {
        id: 'links',
        type: 'paragraph',
        data: {
          text: 'Read the <a href="https://www.faa.gov/uas/getting_started/remote_id">FAA Remote ID guide</a> and my <a href="/blog/drone-flight-field-notes">drone field notes</a>.',
        },
      },
    ];

    const signals = analyzeBlogContentTrustSignals(blocks, 'current-article');

    expect(signals.hasSourcesHeading).toBeTrue();
    expect(signals.externalReferenceUrls).toEqual(['https://www.faa.gov/uas/getting_started/remote_id']);
    expect(signals.contextualArticleUrls).toEqual(['https://colinmichaels.com/blog/drone-flight-field-notes']);
  });

  it('recognizes bare URLs, Markdown links, and chart source URLs without double counting', () => {
    const blocks: BlogContentBlock[] = [
      {
        id: 'paragraph',
        type: 'paragraph',
        data: {text: 'Source: https://example.com/report.'},
      },
      {
        id: 'markdown',
        type: 'markdown',
        data: {markdown: '[Report](https://example.com/report) and [next read](/blog/next-story).'},
      },
      {
        id: 'chart',
        type: 'chart',
        data: {
          chartType: 'bar',
          chartPoints: [{label: 'A', value: 1}],
          sourceUrl: 'https://data.example.org/series',
        },
      },
    ];

    const signals = analyzeBlogContentTrustSignals(blocks);

    expect(signals.externalReferenceUrls).toEqual([
      'https://example.com/report',
      'https://data.example.org/series',
    ]);
    expect(signals.contextualArticleUrls).toEqual(['https://colinmichaels.com/blog/next-story']);
    expect(signals.supportingArtifactCount).toBe(1);
  });

  it('does not count self-links, topic links, or media destinations as citations', () => {
    const blocks: BlogContentBlock[] = [
      {
        id: 'self',
        type: 'paragraph',
        data: {
          text: '<a href="https://colinmichaels.com/blog/current-story">This story</a> <a href="/topics/drones-fpv">Drones topic</a>',
        },
      },
      {
        id: 'youtube',
        type: 'embed',
        data: {
          provider: 'youtube',
          url: 'https://www.youtube.com/watch?v=L229QDxDakU',
          embedUrl: 'https://www.youtube.com/embed/L229QDxDakU',
        },
      },
    ];

    const signals = analyzeBlogContentTrustSignals(blocks, 'current-story');

    expect(signals.externalReferenceUrls).toEqual([]);
    expect(signals.contextualArticleUrls).toEqual([]);
    expect(signals.supportingArtifactCount).toBe(1);
  });

  it('counts evidence-ready media, code, and tables without treating plain prose as evidence', () => {
    const blocks: BlogContentBlock[] = [
      {id: 'image', type: 'image', data: {url: '/image.webp', alt: 'Flight controller'}},
      {
        id: 'gallery',
        type: 'gallery',
        data: {galleryImages: [{url: '/one.webp', alt: 'One'}, {url: '/two.webp', alt: 'Two'}]},
      },
      {id: 'code', type: 'code', data: {code: 'const ready = true;', language: 'typescript'}},
      {id: 'table', type: 'markdown', data: {markdown: '| Model | Price |\n| --- | --- |\n| A | $1 |'}},
      {id: 'paragraph', type: 'paragraph', data: {text: 'Plain supporting prose.'}},
    ];

    expect(analyzeBlogContentTrustSignals(blocks).supportingArtifactCount).toBe(5);
  });
});
