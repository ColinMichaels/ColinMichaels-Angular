const assert = require('node:assert/strict');
const test = require('node:test');

const {
  PERSONAL_AIRCRAFT_BUYER_VERIFICATION_DESCRIPTION,
  PERSONAL_AIRCRAFT_BUYER_VERIFICATION_DOWNLOAD_PATH,
  PERSONAL_AIRCRAFT_BUYER_VERIFICATION_HEADING,
  PERSONAL_AIRCRAFT_BUYER_VERIFICATION_PATH,
  PERSONAL_AIRCRAFT_BUYER_VERIFICATION_SECTIONS,
} = require('../lib/personal-aircraft-buyer-verification.js');
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

test('defines a substantive non-advisory buyer verification resource with official starting points', () => {
  const text = PERSONAL_AIRCRAFT_BUYER_VERIFICATION_SECTIONS
    .flatMap(section => [section.heading, ...section.paragraphs])
    .join(' ');
  const links = PERSONAL_AIRCRAFT_BUYER_VERIFICATION_SECTIONS.flatMap(section => section.links ?? []);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  assert.equal(PERSONAL_AIRCRAFT_BUYER_VERIFICATION_PATH, '/resources/personal-aircraft-buyer-verification');
  assert.equal(PERSONAL_AIRCRAFT_BUYER_VERIFICATION_HEADING, 'Personal Aircraft Buyer Verification');
  assert.match(PERSONAL_AIRCRAFT_BUYER_VERIFICATION_DESCRIPTION, /deposit terms/);
  assert.ok(wordCount >= 600, `expected at least 600 crawler-readable words, received ${wordCount}`);
  assert.match(text, /not financial, legal, aviation, safety, or purchase advice/);
  assert.match(text, /do not classify a particular electric multicopter/i);
  assert.match(text, /No deposit until the unanswered red flags/);
  assert.ok(links.some(link => link.href === PERSONAL_AIRCRAFT_BUYER_VERIFICATION_DOWNLOAD_PATH));
  assert.ok(links.some(link => link.href.includes('ecfr.gov') && link.label.includes('Part 103')));
  assert.ok(links.some(link => link.href.includes('faa.gov/licenses_certificates')));
  assert.ok(links.some(link => link.href.includes('ntsb.gov')));
  assert.ok(links.some(link => link.href.includes('consumer.ftc.gov')));
});

test('renders one indexable crawler heading with matching canonical, sources, PDF, and WebPage data', async () => {
  const response = createResponse();

  await seoFunctions.renderSeoHtml(createRequest(PERSONAL_AIRCRAFT_BUYER_VERIFICATION_PATH), response);

  const html = String(response.body);
  assert.equal(response.statusCode, 200);
  assert.match(response.headers['Content-Type'], /text\/html/);
  assert.equal((html.match(/<h1>/g) ?? []).length, 1);
  assert.match(html, /<h1>Personal Aircraft Buyer Verification<\/h1>/);
  assert.match(html, /A filmed flight proves less than a purchase requires/);
  assert.match(html, /captain-colin-personal-aircraft-buyer-verification\.pdf/);
  assert.match(html, /ecfr\.gov\/current\/title-14/);
  assert.match(html, /<link rel="canonical" href="https:\/\/colinmichaels\.com\/resources\/personal-aircraft-buyer-verification">/);
  assert.match(html, /"@type":"WebPage"/);
  assert.doesNotMatch(html, /noindex/);
});
