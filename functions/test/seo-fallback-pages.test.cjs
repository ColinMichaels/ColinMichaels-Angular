const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createCollectionPageStructuredData,
  createWebPageStructuredData,
  replaceAppRootFallback,
  renderSeoArticleContinuationFallbackHtml,
  renderSeoCollectionFallbackHtml,
  renderSeoFallbackLinkList,
  renderSeoStaticFallbackHtml,
} = require('../lib/seo-fallback-pages.js');

test('replaces the physical homepage fallback when rendering a dynamic route', () => {
  const template = '<body><app-root><main><h1>Homepage fallback</h1></main></app-root></body>';
  const html = replaceAppRootFallback(template, '<main><h1>Category fallback</h1></main>');

  assert.equal((html.match(/<app-root>/g) ?? []).length, 1);
  assert.equal((html.match(/<h1>/g) ?? []).length, 1);
  assert.match(html, /Category fallback/);
  assert.doesNotMatch(html, /Homepage fallback/);
});

test('can clear the physical homepage fallback for noindex and missing routes', () => {
  const template = '<body><app-root><main><h1>Homepage fallback</h1></main></app-root></body>';
  const html = replaceAppRootFallback(template, '');

  assert.match(html, /<app-root>\s*<\/app-root>/);
  assert.doesNotMatch(html, /Homepage fallback/);
});

test('renders one escaped collection heading with descriptive article links', () => {
  const html = renderSeoCollectionFallbackHtml({
    eyebrow: 'Blog category',
    heading: 'Drones & FPV Posts',
    description: 'Flights, guides, and field notes.',
    totalItems: 2,
    items: [
      {
        title: 'Farm <script>alert(1)</script>',
        url: 'https://colinmichaels.com/blog/farm?x=1&y=2',
        description: 'A flight above the garden & fields.',
        publishedAt: '2026-08-13T13:43:21Z',
      },
    ],
    emptyMessage: 'No posts found.',
  });

  assert.equal((html.match(/<h1>/g) ?? []).length, 1);
  assert.match(html, /<h1>Drones &amp; FPV Posts<\/h1>/);
  assert.match(html, /2 published articles/);
  assert.match(html, /Farm &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /farm\?x=1&amp;y=2/);
  assert.doesNotMatch(html, /<script>/);
});

test('renders a crawler-readable static page with sections and links', () => {
  const html = renderSeoStaticFallbackHtml({
    eyebrow: 'Trust & privacy',
    heading: 'Privacy Policy',
    description: 'A plain-language summary.',
    sections: [
      {
        heading: 'Your choices',
        paragraphs: ['Ask to remove personal information.'],
        links: [{href: 'mailto:colin@colinmichaels.com', label: 'Email Colin'}],
      },
    ],
  });

  assert.equal((html.match(/<h1>/g) ?? []).length, 1);
  assert.match(html, /<h2>Your choices<\/h2>/);
  assert.match(html, /href="mailto:colin@colinmichaels.com"/);
});

test('renders escaped authority-resource links for crawler fallbacks', () => {
  const html = renderSeoFallbackLinkList([
    {
      href: 'https://colinmichaels.com/downloads/field-notes.pdf?x=1&y=2',
      label: 'Drone <Field> Notes',
      description: 'Printable & practical.',
    },
  ]);

  assert.match(html, /downloads\/field-notes\.pdf\?x=1&amp;y=2/);
  assert.match(html, /Drone &lt;Field&gt; Notes/);
  assert.match(html, /Printable &amp; practical\./);
  assert.doesNotMatch(html, /<Field>/);
});

test('renders one crawler-visible topic continuation without trusting stored markup', () => {
  const html = renderSeoArticleContinuationFallbackHtml({
    heading: 'Continue exploring this topic',
    href: 'https://colinmichaels.com/topics/drones-fpv?x=1&y=2',
    label: 'Drones & FPV',
    description: 'Field notes <script>alert(1)</script>',
  });

  assert.match(html, /<h2>Continue exploring this topic<\/h2>/);
  assert.match(html, /topics\/drones-fpv\?x=1&amp;y=2/);
  assert.match(html, /Drones &amp; FPV/);
  assert.doesNotMatch(html, /<script>/);
});

test('builds CollectionPage and WebPage graphs tied to the same site identity', () => {
  const identity = {
    siteName: 'ColinMichaels.com',
    siteUrl: 'https://colinmichaels.com',
    publisherName: 'Colin Michaels',
  };
  const collection = createCollectionPageStructuredData({
    ...identity,
    url: 'https://colinmichaels.com/blog/category/drones-and-fpv',
    name: 'Drones & FPV Posts',
    description: 'Published drone stories.',
    items: [{title: 'Farm From Above', url: 'https://colinmichaels.com/blog/farm', description: ''}],
  });
  const page = createWebPageStructuredData({
    ...identity,
    url: 'https://colinmichaels.com/privacy',
    name: 'Privacy Policy',
    description: 'Plain-language privacy policy.',
  });

  assert.equal(collection['@type'], 'CollectionPage');
  assert.equal(collection.mainEntity.numberOfItems, 1);
  assert.equal(collection.publisher['@id'], 'https://colinmichaels.com/#person');
  assert.equal(page['@type'], 'WebPage');
  assert.equal(page.isPartOf['@id'], 'https://colinmichaels.com/#website');
});
