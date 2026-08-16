const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const test = require('node:test');

const {
  SEO_RESPONSE_SECURITY_HEADERS,
  applySeoResponseSecurityHeaders,
} = require('../lib/seo-response-headers.js');
const seoFunctions = require('../lib/index.js');

function getHostingSecurityHeaders() {
  const firebaseConfig = JSON.parse(readFileSync(resolve(__dirname, '../../firebase.json'), 'utf8'));
  const globalHeaders = firebaseConfig.hosting.headers.find(entry => entry.source === '**');

  return Object.fromEntries(globalHeaders.headers.map(({key, value}) => [key, value]));
}

function createRequest(method, path = '/') {
  return {
    method,
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
  const headers = {};

  return {
    body: undefined,
    headers,
    statusCode: 200,
    setHeader(name, value) {
      headers[name] = value;
      return this;
    },
    getHeader(name) {
      return headers[name];
    },
    set(name, value) {
      headers[name] = value;
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

function assertSecurityHeaders(response) {
  for (const [name, value] of Object.entries(SEO_RESPONSE_SECURITY_HEADERS)) {
    assert.equal(response.headers[name], value);
  }
}

test('keeps crawler-facing Function security headers aligned with Firebase Hosting', () => {
  assert.deepEqual(SEO_RESPONSE_SECURITY_HEADERS, getHostingSecurityHeaders());
});

test('applies the complete policy before success or error status selection', () => {
  for (const statusCode of [200, 404, 405, 503]) {
    const appliedHeaders = {};
    const response = {
      statusCode,
      setHeader(name, value) {
        appliedHeaders[name] = value;
      },
    };

    applySeoResponseSecurityHeaders(response);

    assert.deepEqual(appliedHeaders, SEO_RESPONSE_SECURITY_HEADERS);
  }
});

test('retains report-only CSP without adding an enforcing policy', () => {
  assert.equal(typeof SEO_RESPONSE_SECURITY_HEADERS['Content-Security-Policy-Report-Only'], 'string');
  assert.equal(SEO_RESPONSE_SECURITY_HEADERS['Content-Security-Policy'], undefined);
});

test('allows only the current Firebase Auth helper origin in frame-src', () => {
  const csp = SEO_RESPONSE_SECURITY_HEADERS['Content-Security-Policy-Report-Only'];
  const frameSources = csp
    .split(';')
    .map(directive => directive.trim())
    .find(directive => directive.startsWith('frame-src '));

  assert.ok(frameSources);
  assert.match(frameSources, /(?:^| )https:\/\/colinmichaels\.firebaseapp\.com(?: |$)/);
  assert.doesNotMatch(frameSources, /https:\/\/\*\.firebaseapp\.com/);
});

test('applies the policy to early method errors on every crawler-facing Function', async () => {
  for (const functionName of ['renderSeoHtml', 'sitemapXml', 'rssFeed', 'jsonFeed']) {
    const response = createResponse();

    await seoFunctions[functionName](createRequest('POST'), response);

    assert.equal(response.statusCode, 405, functionName);
    assertSecurityHeaders(response);
  }
});

test('applies the policy to a Function-generated static-asset 404', async () => {
  const response = createResponse();

  await seoFunctions.renderSeoHtml(createRequest('GET', '/missing-script.js'), response);

  assert.equal(response.statusCode, 404);
  assert.equal(response.body, 'Not Found');
  assertSecurityHeaders(response);
});

test('treats a missing PDF as a static asset instead of an Angular route', async () => {
  const response = createResponse();

  await seoFunctions.renderSeoHtml(createRequest('GET', '/downloads/missing-field-notes.pdf'), response);

  assert.equal(response.statusCode, 404);
  assert.equal(response.body, 'Not Found');
  assertSecurityHeaders(response);
});
