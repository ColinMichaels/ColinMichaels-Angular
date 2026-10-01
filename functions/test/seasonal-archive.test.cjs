const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve, dirname} = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const typescript = require('typescript');

const {
  createSeasonalArchiveSitemapPaths,
  getSeasonalArchivePage,
  SEASONAL_ARCHIVE_EDITIONS,
  SEASONAL_ARCHIVE_INDEX,
} = require('../lib/seasonal-archive-identity.js');
const seoFunctions = require('../lib/index.js');

function createRequest(path, method = 'GET') {
  return {
    method, headers: {}, url: path, originalUrl: path, path,
    get() { return undefined; },
  };
}

function createResponse() {
  return {
    body: undefined, headers: {}, statusCode: 200,
    setHeader(name, value) { this.headers[name] = value; return this; },
    set(name, value) { this.headers[name] = value; return this; },
    status(value) { this.statusCode = value; return this; },
    send(body) { this.body = body; return this; },
    end(body) { this.body = body; return this; },
    on() { return this; },
  };
}

// The app catalog is plain presentation data. Transpile its local modules so
// drift checks compare values instead of relying on formatting or regexes.
function loadFrontendModule(filePath, cache = new Map()) {
  if (cache.has(filePath)) {
    return cache.get(filePath);
  }
  const source = readFileSync(filePath, 'utf8');
  const output = typescript.transpileModule(source, {
    compilerOptions: {module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022},
  }).outputText;
  const module = {exports: {}};
  cache.set(filePath, module.exports);
  const execute = vm.runInNewContext(`(function(require, module, exports) {${output}\n})`, {}, {filename: filePath});
  execute(request => {
    assert.ok(request.startsWith('.'), 'Catalog drift loader only accepts local presentation modules.');
    return loadFrontendModule(resolve(dirname(filePath), `${request}.ts`), cache);
  }, module, module.exports);
  return module.exports;
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

test('keeps every server edition identity aligned with the frontend catalog', () => {
  const {SEASONAL_EDITIONS} = loadFrontendModule(resolve(__dirname, '../../src/app/features/seasonal/seasonal.catalog.ts'));
  assert.deepEqual(SEASONAL_ARCHIVE_EDITIONS.map(edition => edition.id), Array.from(SEASONAL_EDITIONS, edition => edition.id));
  for (const edition of SEASONAL_ARCHIVE_EDITIONS) {
    const frontend = SEASONAL_EDITIONS.find(candidate => candidate.id === edition.id);
    for (const field of ['id', 'holidayLabel', 'year', 'titleLine1', 'titleLine2', 'archiveDescription']) {
      assert.equal(edition[field], frontend[field], `${edition.id}: ${field} drifted.`);
    }
    assert.equal(edition.interaction ?? 'hunt', frontend.interaction ?? 'hunt', `${edition.id}: interaction drifted.`);
  }
});

test('recognizes only the exact archive index and declared edition paths', () => {
  assert.equal(getSeasonalArchivePage('/archive/seasons').edition, null);
  assert.equal(getSeasonalArchivePage('/archive/seasons/').path, '/archive/seasons');
  for (const edition of SEASONAL_ARCHIVE_EDITIONS) {
    const path = `/archive/seasons/${edition.id}`;
    assert.equal(getSeasonalArchivePage(`${path}?from=archive#collection`).edition.id, edition.id);
    assert.equal(getSeasonalArchivePage(`${path}/`).path, path);
  }
  for (const path of [
    '/archive/seasons/unknown-2026', '/archive/seasons/hanukkah-2026/extra',
    '/archive/seasons/hanukkah-2026/index.html', '/archive/seasons/index.html',
    '/archive/seasons/hanukkah-2026;preview=true', '/archive/seasons/hanukkah%2d2026',
    '/archive/seasons//hanukkah-2026', '/archive/seasons/Hanukkah-2026',
    '//archive/seasons/hanukkah-2026', '/archive/seasons/hanukkah-2026%2fextra',
  ]) {
    assert.equal(getSeasonalArchivePage(path), null, path);
  }
});

test('holds index and edition sitemap inclusion behind independent publishing approval', () => {
  assert.equal(SEASONAL_ARCHIVE_INDEX.publishApproved, false);
  assert.ok(SEASONAL_ARCHIVE_EDITIONS.every(edition => edition.publishApproved === false));
  assert.deepEqual(createSeasonalArchiveSitemapPaths(), []);
  const approvedEdition = {...SEASONAL_ARCHIVE_EDITIONS[0], publishApproved: true};
  assert.deepEqual(createSeasonalArchiveSitemapPaths(SEASONAL_ARCHIVE_INDEX, [approvedEdition]), [
    '/archive/seasons/scary-christmas-2026',
  ]);
  assert.deepEqual(createSeasonalArchiveSitemapPaths({...SEASONAL_ARCHIVE_INDEX, publishApproved: true}, [approvedEdition]), [
    '/archive/seasons', '/archive/seasons/scary-christmas-2026',
  ]);
});

test('renders an index shell with HTTP 200, noindex, a single H1, and every archive link', async () => {
  const response = createResponse();
  await seoFunctions.renderSeoHtml(createRequest('/archive/seasons'), response);
  const html = String(response.body);
  assert.equal(response.statusCode, 200);
  assert.match(response.headers['Content-Type'], /text\/html/);
  assert.equal((html.match(/<h1>/g) ?? []).length, 1);
  assert.match(html, /<h1>Seasonal archive<\/h1>/);
  assert.ok(html.includes(escapeHtml(SEASONAL_ARCHIVE_INDEX.description)));
  assert.match(html, /<meta name="robots" content="noindex,follow">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/colinmichaels\.com\/archive\/seasons">/);
  assert.match(html, /"@type":"WebPage"/);
  for (const edition of SEASONAL_ARCHIVE_EDITIONS) {
    assert.ok(html.includes(`href="https://colinmichaels.com/archive/seasons/${edition.id}"`), edition.id);
    assert.ok(html.includes(escapeHtml(edition.archiveDescription)), edition.id);
  }
});

for (const edition of SEASONAL_ARCHIVE_EDITIONS) {
  test(`renders ${edition.id} with HTTP 200, exact canonical, and readable fallback`, async () => {
    const path = `/archive/seasons/${edition.id}`;
    const response = createResponse();
    await seoFunctions.renderSeoHtml(createRequest(path), response);
    const html = String(response.body);
    assert.equal(response.statusCode, 200);
    assert.equal((html.match(/<h1>/g) ?? []).length, 1);
    assert.ok(html.includes(`<h1>${escapeHtml(`${edition.titleLine1} ${edition.titleLine2}`)}</h1>`));
    assert.ok(html.includes(escapeHtml(edition.archiveDescription)));
    assert.match(html, /<meta name="robots" content="noindex,follow">/);
    assert.ok(html.includes(`<link rel="canonical" href="https://colinmichaels.com${path}">`));
    assert.match(html, /href="https:\/\/colinmichaels\.com\/archive\/seasons"/);
    if (edition.interaction === 'reflect') {
      assert.match(html, /A moment for reflection/);
      assert.match(html, /Explore the seasonal archive/);
      assert.doesNotMatch(html, /hunt|Collection progress/);
    } else {
      assert.match(html, /Collection progress stays on your device/);
    }
    assert.match(html, /"@type":"WebPage"/);
    assert.doesNotMatch(html, /data-homepage-fallback/);
  });
}

test('keeps unknown and malformed archive requests as real HTTP 404s', async () => {
  for (const path of [
    '/archive/seasons/unknown-2026', '/archive/seasons/hanukkah-2026/extra',
    '/archive/seasons/hanukkah-2026/index.html', '/archive/seasons/index.html',
    '/archive/seasons/hanukkah-2026;preview=true', '/archive/seasons/hanukkah%2d2026',
  ]) {
    const response = createResponse();
    await seoFunctions.renderSeoHtml(createRequest(path), response);
    assert.equal(response.statusCode, 404, path);
    assert.match(String(response.body), /<meta name="robots" content="noindex,follow">/, path);
  }
});

test('responds to archive HEAD requests with the same status and no body', async () => {
  for (const path of ['/archive/seasons', '/archive/seasons/hanukkah-2026']) {
    const response = createResponse();
    await seoFunctions.renderSeoHtml(createRequest(path, 'HEAD'), response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body, '');
    assert.match(response.headers['Content-Type'], /text\/html/);
  }
});
