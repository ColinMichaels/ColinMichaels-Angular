const assert = require('node:assert/strict');
const test = require('node:test');

const {collectExternalBlogCitationUrls} = require('../lib/blog-citations.js');

test('collects explicit external references and excludes media and same-site destinations', () => {
  const citations = collectExternalBlogCitationUrls([
    {
      id: 'intro',
      type: 'paragraph',
      data: {
        text: 'Use <a href="https://www.faa.gov/uas">FAA guidance</a>, then read <a href="/blog/next-story">the next story</a>.',
      },
    },
    {
      id: 'research',
      type: 'markdown',
      data: {
        markdown: 'Compare the [official specification](https://manufacturer.example/specs).',
        sourceUrl: 'https://research.example/report',
      },
    },
    {
      id: 'video',
      type: 'embed',
      data: {embedUrl: 'https://www.youtube.com/watch?v=not-a-citation'},
    },
  ]);

  assert.deepEqual(citations, [
    'https://www.faa.gov/uas',
    'https://manufacturer.example/specs',
    'https://research.example/report',
  ]);
});

test('deduplicates references and rejects active or malformed protocols', () => {
  assert.deepEqual(collectExternalBlogCitationUrls([{
    id: 'links',
    type: 'paragraph',
    data: {
      text: 'https://example.com/report. <a href="https://example.com/report">Report</a> <a href="javascript:alert(1)">Unsafe</a>',
    },
  }]), ['https://example.com/report']);
});
