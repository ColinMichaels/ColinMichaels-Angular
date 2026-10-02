const assert = require('node:assert/strict');
const test = require('node:test');
const {
  getPublicPublishingSchedule, getScheduledPostForReader, getPublishingScheduleAccess,
  MAX_PUBLIC_SCHEDULE_RECORDS, parseReleaseTimestamp, resolveCurrentReaderPermission,
  sanitizeReaderBlogPost, toPublicPublishingScheduleEntry, validateReaderRelease,
} = require('../lib/public-publishing-schedule.js');

const now = new Date('2026-10-20T12:00:00.000Z');
const permission = {canReadEarly: true};
function post(overrides = {}) {
  return {
    id: 'spooky-story', slug: 'spooky-story', title: 'A spooky story',
    excerpt: 'A public teaser.', coverImage: '/assets/public-teaser.webp',
    status: 'scheduled', publishedAt: '2026-10-31T12:00:00.000Z',
    readerRelease: {announceInSchedule: true, earlyAccessAt: '2026-10-20T12:00:00.000Z'},
    authorId: 'colin', author: {name: 'Colin', privateEmail: 'private@example.test'},
    seo: {title: 'A spooky story', description: 'A public teaser.', privatePlan: 'private'},
    contentFormat: 'editorjs', categories: ['Stories'], tags: ['autumn'],
    createdAt: '2026-10-01T12:00:00.000Z', updatedAt: '2026-10-19T12:00:00.000Z',
    blocks: [{id: 'text', type: 'paragraph', privateNote: 'private', data: {text: 'Secret body.', privateNote: 'private'}}],
    searchBodyText: 'Secret search body.', preview: {token: 'secret-token'},
    socialPromotion: {privateToken: 'private'}, draftNotes: 'private',
    ...overrides,
  };
}

function firestore(posts, authors = {colin: {status: 'published'}}) {
  const calls = [];
  return {
    calls,
    collection(name) {
      const filters = []; let max = Infinity; let fields;
      const query = {
        where(field, operator, expected) {filters.push([field, operator, expected]); calls.push(['where', field]); return query;},
        limit(limit) {max = limit; return query;},
        select(...projection) {fields = projection; calls.push(['select', ...projection]); return query;},
        async get() {
          const all = name === 'posts' ? posts : Object.entries(authors).map(([id, value]) => ({...value, id}));
          const documents = all.filter(value => filters.every(([field, , expected]) =>
            field.split('.').reduce((current, key) => current?.[key], value) === expected)).slice(0, max);
          return {docs: documents.map(value => ({id: value.id, data: () => fields
            ? Object.fromEntries(fields.filter(field => field in value).map(field => [field, value[field]])) : value}))};
        },
        doc(id) {return {async get() {return {exists: !!authors[id], get(field) {return authors[id]?.[field];}};}};},
      };
      return query;
    },
  };
}

function authRecord(claims, overrides = {}) {
  return {disabled: false, customClaims: claims, tokensValidAfterTime: '2026-10-01T00:00:00.000Z', ...overrides};
}
const caller = {uid: 'reader', token: {auth_time: Date.parse('2026-10-10T00:00:00.000Z') / 1000, roles: {earlyReader: true}}};
function auth(user) {return {async getUser(uid) {assert.equal(uid, 'reader'); return user;}};}

function code(expected) {return error => error.code === expected;}

test('timestamps require a valid timezone-qualified calendar date', () => {
  for (const value of [null, '2026-10-20', '10/20/2026', '2026-02-30T12:00:00Z', '2026-10-20T12:00:00', '2026-10-20T25:00:00Z']) {
    assert.equal(parseReleaseTimestamp(value), null, String(value));
  }
  assert.equal(parseReleaseTimestamp('2026-10-20T08:00:00-04:00'), now.getTime());
});

test('reader release validates a bounded optional schema', () => {
  assert.doesNotThrow(() => validateReaderRelease(undefined, null));
  assert.doesNotThrow(() => validateReaderRelease({announceInSchedule: false, earlyAccessAt: null}, null));
  for (const value of [null, {}, {announceInSchedule: 'true', earlyAccessAt: null},
    {announceInSchedule: true, earlyAccessAt: '2026-10-31T12:00:00Z'},
    {announceInSchedule: true, earlyAccessAt: null, token: 'private'},
  ]) assert.throws(() => validateReaderRelease(value, post().publishedAt), code('invalid-argument'));
});

test('server time and canonical status control exact early/public boundaries', () => {
  const value = post();
  assert.equal(getPublishingScheduleAccess(value, permission, new Date(now.getTime() - 1)), 'locked');
  assert.equal(getPublishingScheduleAccess(value, permission, now), 'early');
  assert.equal(getPublishingScheduleAccess(value, null, now), 'locked');
  const release = new Date(value.publishedAt);
  assert.equal(getPublishingScheduleAccess(value, permission, new Date(release.getTime() - 1)), 'early');
  assert.equal(getPublishingScheduleAccess(value, permission, release), 'locked');
  assert.equal(getPublishingScheduleAccess({...value, status: 'published'}, null, release), 'public');
  assert.equal(getPublishingScheduleAccess({...value, status: 'published'}, permission, now), 'locked');
  for (const status of ['draft', 'archived', 'cancelled']) {
    assert.equal(getPublishingScheduleAccess({...value, status}, permission, release), 'locked');
  }
  assert.equal(getPublishingScheduleAccess({...value, publishedAt: 'bad'}, permission, now), 'locked');
  assert.equal(getPublishingScheduleAccess({...value, readerRelease: {announceInSchedule: false, earlyAccessAt: value.readerRelease.earlyAccessAt}}, permission, now), 'locked');
});

test('public teasers explicitly omit body, internal metadata, and private Cat Corner records', () => {
  const entry = toPublicPublishingScheduleEntry(post(), 'canonical-id', null, now);
  assert.deepEqual(Object.keys(entry).sort(), ['access', 'coverImage', 'earlyAccessAt', 'excerpt', 'id', 'publishedAt', 'slug', 'status', 'title']);
  assert.equal(entry.id, 'canonical-id'); assert.equal(entry.access, 'locked');
  assert.doesNotMatch(JSON.stringify(entry), /Secret|private|token|blocks|searchBodyText|socialPromotion/);
  assert.equal(toPublicPublishingScheduleEntry(post({readerRelease: undefined}), 'id', null, now), null);
  assert.equal(toPublicPublishingScheduleEntry(post({status: 'draft'}), 'id', permission, now), null);
  assert.equal(toPublicPublishingScheduleEntry(post({catCorner: {enabled: true, discoveryPost: false}}), 'id', permission, now), null);
  assert.equal(toPublicPublishingScheduleEntry(post({publishedAt: 'bad'}), 'id', permission, now), null);
});

test('current server claims grant early reading separately from ordinary signup and Cat Corner', async () => {
  assert.equal(await resolveCurrentReaderPermission(auth(authRecord({roles: {earlyReader: true}})), undefined), null);
  for (const claims of [{}, {roles: {user: true}}, {roles: {catCornerAddict: true}}, {roles: {trustedCommenter: true}}, {roles: {viewer: true}}, {roles: {mediaManager: true}}]) {
    assert.equal((await resolveCurrentReaderPermission(auth(authRecord(claims)), caller)).canReadEarly, false);
  }
  for (const role of ['earlyReader', 'admin', 'cmsAdmin', 'contentEditor']) {
    for (const claims of [{roles: {[role]: true}}, {[role]: true}]) {
      assert.equal((await resolveCurrentReaderPermission(auth(authRecord(claims)), caller)).canReadEarly, true);
    }
  }
});

test('disabled, revoked, deleted, stale-claim, and Auth-failure readers cannot retain early access', async () => {
  assert.equal(await resolveCurrentReaderPermission(auth(authRecord({roles: {earlyReader: true}}, {disabled: true})), caller), null);
  assert.equal(await resolveCurrentReaderPermission(auth(authRecord({roles: {earlyReader: true}}, {tokensValidAfterTime: '2026-10-11T00:00:00Z'})), caller), null);
  assert.equal((await resolveCurrentReaderPermission(auth(authRecord({})), caller)).canReadEarly, false);
  assert.equal(await resolveCurrentReaderPermission(auth(authRecord({roles: {earlyReader: true}})), {...caller, token: {}}), null);
  assert.equal(await resolveCurrentReaderPermission({async getUser() {throw new Error('auth/user-not-found');}}, caller), null);
  assert.equal(await resolveCurrentReaderPermission({async getUser() {throw new Error('Auth outage');}}, caller), null);
});

test('schedule reads projected opt-in canonical fields, resolves published authors, and orders dates', async () => {
  const db = firestore([post({id: 'later'}), post({id: 'earlier', slug: 'earlier', status: 'published', publishedAt: '2026-10-19T12:00:00Z', readerRelease: {announceInSchedule: true, earlyAccessAt: null}}),
    post({id: 'no-opt-in', readerRelease: undefined}), post({id: 'private-author', authorId: 'draft-author'}),
    post({id: 'missing-author', authorId: 'missing'}), post({id: 'draft', status: 'draft'})], {colin: {status: 'published'}, 'draft-author': {status: 'draft'}});
  const response = await getPublicPublishingSchedule(db, {}, null, now);
  assert.equal(response.serverNow, now.toISOString());
  assert.deepEqual(response.entries.map(entry => entry.id), ['earlier', 'later']);
  assert.deepEqual(response.entries.map(entry => entry.access), ['public', 'locked']);
  assert.doesNotMatch(JSON.stringify(response), /Secret|privateEmail|secret-token/);
  assert.ok(db.calls.some(call => call[0] === 'select'));
  assert.ok(db.calls.every(call => !call.includes('blocks') && !call.includes('searchBodyText')));
  assert.equal((await getPublicPublishingSchedule(db, {}, permission, now)).entries[1].access, 'early');
});

test('schedule rejects caller-supplied clocks, claims, and silently truncated catalogs', async () => {
  for (const request of [null, {now: '2099'}, {roles: {earlyReader: true}}, {operation: 'get'}]) {
    await assert.rejects(getPublicPublishingSchedule(firestore([]), request, permission, now), code('invalid-argument'));
  }
  const records = Array.from({length: MAX_PUBLIC_SCHEDULE_RECORDS + 1}, (_, i) => post({id: `id-${i}`}));
  await assert.rejects(getPublicPublishingSchedule(firestore(records), {}, null, now), code('resource-exhausted'));
});

test('reader returns allowed article fields only after authorization and never changes its scheduled status', async () => {
  const result = await getScheduledPostForReader(firestore([post()]), {slug: 'spooky-story'}, permission, now);
  assert.equal(result.serverNow, now.toISOString()); assert.equal(result.access, 'early');
  assert.equal(result.post.status, 'scheduled'); assert.equal(result.post.blocks[0].data.text, 'Secret body.');
  assert.doesNotMatch(JSON.stringify(result), /secret-token|privateEmail|privatePlan|privateNote|socialPromotion|draftNotes|searchBodyText|readerRelease/);
  assert.deepEqual(result.post.blocks[0], {id: 'text', type: 'paragraph', data: {text: 'Secret body.'}});
  await assert.rejects(getScheduledPostForReader(firestore([post()]), {slug: 'spooky-story'}, null, now), code('permission-denied'));
  await assert.rejects(getScheduledPostForReader(firestore([post()]), {slug: 'spooky-story', roles: ['earlyReader']}, permission, now), code('invalid-argument'));
});

for (const overrides of [
  {status: 'draft'}, {status: 'archived'}, {readerRelease: undefined},
  {publishedAt: 'bad'}, {readerRelease: {announceInSchedule: false, earlyAccessAt: null}},
  {catCorner: {enabled: true, discoveryPost: false}},
]) {
  test(`reader fails closed for ${JSON.stringify(overrides)}`, async () => {
    await assert.rejects(getScheduledPostForReader(firestore([post(overrides)]), {slug: 'spooky-story'}, permission, now), code('not-found'));
  });
}

test('publication time alone never releases a scheduled, cancelled, or future-published article', async () => {
  const release = new Date(post().publishedAt);
  await assert.rejects(getScheduledPostForReader(firestore([post()]), {slug: 'spooky-story'}, permission, release), code('permission-denied'));
  await assert.rejects(getScheduledPostForReader(firestore([post({status: 'published'})]), {slug: 'spooky-story'}, permission, now), code('permission-denied'));
  const result = await getScheduledPostForReader(firestore([post({status: 'published'})]), {slug: 'spooky-story'}, null, release);
  assert.equal(result.access, 'public');
});

test('reader rejects missing/private authors, duplicate slugs, malformed requests and invalid body formats', async () => {
  for (const records of [[], [post(), post({id: 'duplicate'})], [post({authorId: 'missing'})]]) {
    await assert.rejects(getScheduledPostForReader(firestore(records), {slug: 'spooky-story'}, permission, now), code('not-found'));
  }
  await assert.rejects(getScheduledPostForReader(firestore([post()], {colin: {status: 'draft'}}), {slug: 'spooky-story'}, permission, now), code('not-found'));
  for (const request of [{}, {slug: '../private'}, {slug: 'UPPER'}, {slug: 'x'.repeat(161)}]) {
    await assert.rejects(getScheduledPostForReader(firestore([post()]), request, permission, now), code('invalid-argument'));
  }
  assert.throws(() => sanitizeReaderBlogPost(post({contentFormat: 'legacy'}), 'id'), code('failed-precondition'));
});

test('deployed endpoints and reader SEO shell expose only generic private-cached metadata', async () => {
  const functions = require('../lib/index.js');
  assert.equal(typeof functions.getPublicPublishingSchedule, 'function');
  assert.equal(typeof functions.getScheduledPostForReader, 'function');
  for (const path of ['/schedule', '/schedule/read/spooky-story']) {
    const response = {headers: {}, body: '', setHeader(k,v) {this.headers[k]=v;return this;}, set(k,v) {this.headers[k]=v;return this;}, status(value) {this.statusCode=value;return this;}, send(value) {this.body=value;return this;}, end() {return this;}, on() {return this;}};
    await functions.renderSeoHtml({method:'GET',headers:{},url:path,originalUrl:path,path,get() {}}, response);
    assert.equal(response.statusCode, 200); assert.equal((response.body.match(/<h1>/g) ?? []).length, 1);
    assert.doesNotMatch(response.body, /Secret body|A spooky story|BlogPosting|article:published_time/);
    if (path.includes('/read/')) {
      assert.equal(response.headers['Cache-Control'], 'private, no-store');
      assert.match(response.body, /name="robots" content="noindex,nofollow"/);
    }
  }
});

test('callable handlers recheck current privileges and mark every response private and non-cacheable', async () => {
  const authModule = require('firebase-admin/auth');
  const firestoreModule = require('firebase-admin/firestore');
  const originalAuth = authModule.getAuth;
  const originalFirestore = firestoreModule.getFirestore;
  const functions = require('../lib/index.js');
  const headers = {};
  const request = {
    data: {}, auth: caller,
    rawRequest: {res: {setHeader(name, value) {headers[name] = value;}}},
  };
  let currentClaims = {};
  let userLookups = 0;
  authModule.getAuth = () => ({async getUser() {userLookups += 1; return authRecord(currentClaims);}});
  firestoreModule.getFirestore = () => firestore([post({
    publishedAt: new Date(Date.now() + 86_400_000).toISOString(),
    readerRelease: {announceInSchedule: true, earlyAccessAt: new Date(Date.now() - 86_400_000).toISOString()},
  })]);
  try {
    const ordinary = await functions.getPublicPublishingSchedule.run(request);
    assert.equal(ordinary.entries[0].access, 'locked');
    assert.equal(headers['Cache-Control'], 'private, no-store');
    request.data = {slug: 'spooky-story'};
    await assert.rejects(functions.getScheduledPostForReader.run(request), code('permission-denied'));
    currentClaims = {roles: {earlyReader: true}};
    const early = await functions.getScheduledPostForReader.run(request);
    assert.equal(early.access, 'early');
    currentClaims = {};
    await assert.rejects(functions.getScheduledPostForReader.run(request), code('permission-denied'));
    assert.equal(userLookups, 4);
  } finally {
    authModule.getAuth = originalAuth;
    firestoreModule.getFirestore = originalFirestore;
  }
});
