const assert = require('node:assert/strict');
const test = require('node:test');

const {
  GADGET_USEFULNESS_SCORECARD_DESCRIPTION,
  GADGET_USEFULNESS_SCORECARD_DOWNLOAD_PATH,
  GADGET_USEFULNESS_SCORECARD_HEADING,
  GADGET_USEFULNESS_SCORECARD_PATH,
  GADGET_USEFULNESS_SCORECARD_SECTIONS,
} = require('../lib/gadget-usefulness-scorecard.js');
const seoFunctions = require('../lib/index.js');

function createRequest(path) {
  return {
    method: 'GET',
    headers: {},
    url: path,
    originalUrl: path,
    path,
    get() {
      return undefined;
    },
  };
}

function createResponse() {
  return {
    body: undefined,
    headers: {},
    statusCode: 200,
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(value) {
      this.statusCode = value;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    end(body) {
      this.body = body;
      return this;
    },
    on() {
      return this;
    },
  };
}

test('defines a substantive evidence-led gadget scorecard without pretending it is a product test', () => {
  const text = GADGET_USEFULNESS_SCORECARD_SECTIONS
    .flatMap(section => [section.heading, ...section.paragraphs])
    .join(' ');
  const links = GADGET_USEFULNESS_SCORECARD_SECTIONS.flatMap(section => section.links ?? []);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  assert.equal(GADGET_USEFULNESS_SCORECARD_PATH, '/resources/gadget-usefulness-scorecard');
  assert.equal(GADGET_USEFULNESS_SCORECARD_HEADING, 'Gadget Usefulness Scorecard');
  assert.match(GADGET_USEFULNESS_SCORECARD_DESCRIPTION, /problem fit/);
  assert.ok(wordCount >= 600, `expected at least 600 crawler-readable words, received ${wordCount}`);
  assert.match(text, /not a scientific rating, product test/);
  assert.match(text, /owned, tried, borrowed, or research-only/);
  for (const criterion of ['Real problem fit', 'Evidence quality', 'True cost', 'Everyday friction', 'Support and exit']) {
    assert.match(text, new RegExp(criterion));
  }
  assert.ok(links.some(link => link.href === GADGET_USEFULNESS_SCORECARD_DOWNLOAD_PATH));
  assert.ok(links.some(link => link.href === '/topics/gadgets-toys'));
  assert.ok(links.some(link => link.href === '/editorial-standards'));
  assert.ok(links.some(link => link.href.includes('youtube.com/channel/')));
});

test('renders one indexable crawler heading with matching canonical, PDF, internal links, and WebPage data', async () => {
  const response = createResponse();

  await seoFunctions.renderSeoHtml(createRequest(GADGET_USEFULNESS_SCORECARD_PATH), response);

  const html = String(response.body);
  assert.equal(response.statusCode, 200);
  assert.match(response.headers['Content-Type'], /text\/html/);
  assert.equal((html.match(/<h1>/g) ?? []).length, 1);
  assert.match(html, /<h1>Gadget Usefulness Scorecard<\/h1>/);
  assert.match(html, /The five usefulness scores/);
  assert.match(html, /captain-colin-gadget-usefulness-scorecard\.pdf/);
  assert.match(html, /topics\/gadgets-toys/);
  assert.match(html, /editorial-standards/);
  assert.match(html, /<link rel="canonical" href="https:\/\/colinmichaels\.com\/resources\/gadget-usefulness-scorecard">/);
  assert.match(html, /"@type":"WebPage"/);
  assert.doesNotMatch(html, /noindex/);
});
