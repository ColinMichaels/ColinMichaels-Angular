const assert = require('node:assert/strict');
const test = require('node:test');

const {
  EDITORIAL_STANDARDS_DESCRIPTION,
  EDITORIAL_STANDARDS_HEADING,
  EDITORIAL_STANDARDS_PATH,
  EDITORIAL_STANDARDS_SECTIONS,
} = require('../lib/editorial-standards.js');
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

test('defines transparent experience, sourcing, AI, relationship, and correction boundaries', () => {
  const text = EDITORIAL_STANDARDS_SECTIONS
    .flatMap(section => [section.heading, ...section.paragraphs])
    .join(' ');
  const links = EDITORIAL_STANDARDS_SECTIONS.flatMap(section => section.links ?? []);

  assert.equal(EDITORIAL_STANDARDS_PATH, '/editorial-standards');
  assert.equal(EDITORIAL_STANDARDS_HEADING, 'Editorial Standards & Corrections');
  assert.match(EDITORIAL_STANDARDS_DESCRIPTION, /hands-on experience/);
  assert.match(text, /Researched or pre-buy analysis means Colin did not test the item/);
  assert.match(text, /Manufacturer claim or demonstration/);
  assert.match(text, /AI output is not treated as a source/);
  assert.match(text, /not medical advice/);
  assert.match(text, /rather than silently rewriting history/);
  assert.ok(links.some(link => link.href === '/contact' && link.label === 'Report a correction'));
  assert.ok(links.some(link => link.href === '/authors/colin-michaels'));
});

test('renders crawler-readable policy HTML with matching canonical and WebPage data', async () => {
  const response = createResponse();

  await seoFunctions.renderSeoHtml(createRequest(EDITORIAL_STANDARDS_PATH), response);

  const html = String(response.body);
  assert.equal(response.statusCode, 200);
  assert.match(response.headers['Content-Type'], /text\/html/);
  assert.equal((html.match(/<h1>/g) ?? []).length, 1);
  assert.match(html, /<h1>Editorial Standards &amp; Corrections<\/h1>/);
  assert.match(html, /What the experience labels mean/);
  assert.match(html, /Report a correction/);
  assert.match(html, /<link rel="canonical" href="https:\/\/colinmichaels\.com\/editorial-standards">/);
  assert.match(html, /"@type":"WebPage"/);
  assert.doesNotMatch(html, /noindex/);
});
