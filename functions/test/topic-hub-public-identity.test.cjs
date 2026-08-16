const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const test = require('node:test');

const {
  PUBLIC_TOPIC_HUB_IDENTITIES,
  createPublicTopicSitemapPaths,
  getPublicTopicHubIdentity,
} = require('../lib/topic-hub-public-identity.js');

const angularTopicSource = readFileSync(
  resolve(__dirname, '../../src/app/features/topics/topic-hubs.data.ts'),
  'utf8'
);

function getAngularTopicIdentityHeader(slug) {
  const identityStart = angularTopicSource.indexOf(`id: 'topic-${slug}'`);
  assert.notEqual(identityStart, -1, `Angular is missing the ${slug} public topic.`);

  const headerEnd = angularTopicSource.indexOf('\n    status:', identityStart);
  assert.notEqual(headerEnd, -1, `Angular is missing the ${slug} topic status boundary.`);

  return angularTopicSource.slice(identityStart, headerEnd);
}

test('keeps every Functions topic route on one declared public identity', () => {
  assert.deepEqual(
    PUBLIC_TOPIC_HUB_IDENTITIES.map(topicHub => topicHub.slug),
    [
      'ai-setup',
      'recovery-planning',
      'angular-firebase-architecture',
      'labs-projects',
      'gadgets-toys',
      'drones-fpv',
    ]
  );
  assert.equal(
    getPublicTopicHubIdentity('recovery-planning').heading,
    'Recovery & Medical Planning Resources'
  );
  assert.equal(
    getPublicTopicHubIdentity('angular-firebase-architecture').heading,
    'Angular & Firebase Architecture Notes'
  );
  assert.equal(
    getPublicTopicHubIdentity('labs-projects').heading,
    'Labs & Project Demos'
  );
  assert.equal(PUBLIC_TOPIC_HUB_IDENTITIES.some(topicHub => topicHub.slug === 'weekly-updates'), false);
});

test('generates sitemap paths only from the declared canonical topic slugs', () => {
  const paths = createPublicTopicSitemapPaths();

  assert.equal(paths.length, PUBLIC_TOPIC_HUB_IDENTITIES.length);
  assert.equal(new Set(paths).size, paths.length);
  assert.ok(paths.includes('/topics/labs-projects'));
  assert.ok(paths.includes('/topics/recovery-planning'));
  assert.ok(paths.includes('/topics/angular-firebase-architecture'));
  assert.ok(!paths.includes('/topics/weekly-updates'));
});

test('keeps Angular topic headings and descriptions aligned with Functions identities', () => {
  for (const topicHub of PUBLIC_TOPIC_HUB_IDENTITIES) {
    const angularIdentityHeader = getAngularTopicIdentityHeader(topicHub.slug);

    assert.ok(
      angularIdentityHeader.includes(`slug: '${topicHub.slug}'`),
      `Angular slug drifted for ${topicHub.slug}.`
    );
    assert.ok(
      angularIdentityHeader.includes(`title: '${topicHub.heading}'`),
      `Angular heading drifted for ${topicHub.slug}.`
    );
    assert.ok(
      angularIdentityHeader.includes(`description: '${topicHub.description}'`),
      `Angular description drifted for ${topicHub.slug}.`
    );
  }
});
