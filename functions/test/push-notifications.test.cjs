const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createPublishedPostPushPayload,
  createPushSubscriptionId,
  isNewlyPublishedPost,
  parseStoredPushSubscription,
} = require('../lib/push-notifications.js');

test('validates and hashes browser push subscriptions without exposing the endpoint as a document id', () => {
  const subscription = parseStoredPushSubscription({
    endpoint: 'https://push.example.com/device/one',
    expirationTime: null,
    keys: {auth: 'auth_key', p256dh: 'p256dh_key'},
  });

  assert.ok(subscription);
  assert.equal(createPushSubscriptionId(subscription.endpoint).length, 64);
  assert.notEqual(createPushSubscriptionId(subscription.endpoint), subscription.endpoint);
  assert.equal(parseStoredPushSubscription({endpoint: 'http://insecure.example.com'}), null);
});

test('builds an Angular-service-worker notification with a public deep link', () => {
  const payload = JSON.parse(createPublishedPostPushPayload({
    id: 'post-1',
    slug: 'new-post',
    title: 'A New Post',
    excerpt: 'A useful update.',
    publishedAt: '2026-07-10T12:00:00.000Z',
  }));

  assert.equal(payload.notification.title, 'A New Post');
  assert.equal(payload.notification.data.url, '/blog/new-post?source=push');
  assert.deepEqual(payload.notification.data.onActionClick.default, {
    operation: 'navigateLastFocusedOrOpen',
    url: '/blog/new-post?source=push',
  });
  assert.equal(payload.notification.data.badgeCount, 1);
});

test('only treats the transition into published status as a new publication', () => {
  assert.equal(isNewlyPublishedPost(undefined, {status: 'published'}), true);
  assert.equal(isNewlyPublishedPost({status: 'draft'}, {status: 'published'}), true);
  assert.equal(isNewlyPublishedPost({status: 'published'}, {status: 'published'}), false);
  assert.equal(isNewlyPublishedPost({status: 'published'}, undefined), false);
});
