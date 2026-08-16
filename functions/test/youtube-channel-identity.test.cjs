const assert = require('node:assert/strict');
const test = require('node:test');

const {
  YOUTUBE_CHANNEL_CONFIGURATION_ERROR,
  assertCanonicalYoutubeApiChannelId,
  parseCanonicalYoutubeChannelId,
} = require('../lib/youtube-channel-identity.js');
const {YOUTUBE_CHANNEL_ID} = require('../lib/seo-site.js');

test('accepts only the canonical Captain Colin channel configuration', () => {
  assert.equal(parseCanonicalYoutubeChannelId(` ${YOUTUBE_CHANNEL_ID} `), YOUTUBE_CHANNEL_ID);
  assert.throws(
    () => parseCanonicalYoutubeChannelId('UCCJMwxuUIb6S4aoZiZeAVeQ'),
    {message: YOUTUBE_CHANNEL_CONFIGURATION_ERROR},
  );
  assert.throws(
    () => parseCanonicalYoutubeChannelId(''),
    {message: 'YOUTUBE_CHANNEL_ID is not configured for the YouTube feed.'},
  );
});

test('rejects a YouTube API response for another channel', () => {
  assert.doesNotThrow(() => assertCanonicalYoutubeApiChannelId(YOUTUBE_CHANNEL_ID));
  assert.throws(
    () => assertCanonicalYoutubeApiChannelId('UCCJMwxuUIb6S4aoZiZeAVeQ'),
    {message: 'The YouTube API response does not match the canonical Captain Colin channel.'},
  );
});
