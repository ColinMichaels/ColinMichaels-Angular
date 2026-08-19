const assert = require('node:assert/strict');
const test = require('node:test');

const {
  assertCanonicalYoutubeApiChannelId,
  getYoutubeChannelConfigurationError,
  parseCanonicalYoutubeChannelId,
  parseYoutubeChannelKey,
} = require('../lib/youtube-channel-identity.js');
const {
  CAPTAIN_COLIN_YOUTUBE_CHANNEL_ID,
  YOUTUBE_CHANNEL_ID,
} = require('../lib/seo-site.js');

test('accepts only the canonical configuration for the requested YouTube channel', () => {
  assert.equal(parseYoutubeChannelKey(undefined), 'captain-colin');
  assert.equal(parseYoutubeChannelKey('captain-colin'), 'captain-colin');
  assert.throws(
    () => parseYoutubeChannelKey('another-channel'),
    {message: 'Select either the Colin Michaels or Captain Colin YouTube channel.'},
  );
  assert.equal(
    parseCanonicalYoutubeChannelId('colin-michaels', ` ${YOUTUBE_CHANNEL_ID} `),
    YOUTUBE_CHANNEL_ID,
  );
  assert.equal(
    parseCanonicalYoutubeChannelId('captain-colin', ` ${CAPTAIN_COLIN_YOUTUBE_CHANNEL_ID} `),
    CAPTAIN_COLIN_YOUTUBE_CHANNEL_ID,
  );
  assert.throws(
    () => parseCanonicalYoutubeChannelId('captain-colin', YOUTUBE_CHANNEL_ID),
    {message: getYoutubeChannelConfigurationError('captain-colin')},
  );
  assert.throws(
    () => parseCanonicalYoutubeChannelId('colin-michaels', ''),
    {message: 'Colin Michaels is not configured for the YouTube feed.'},
  );
});

test('rejects a YouTube API response for the other channel', () => {
  assert.doesNotThrow(() => assertCanonicalYoutubeApiChannelId('colin-michaels', YOUTUBE_CHANNEL_ID));
  assert.doesNotThrow(() => assertCanonicalYoutubeApiChannelId('captain-colin', CAPTAIN_COLIN_YOUTUBE_CHANNEL_ID));
  assert.throws(
    () => assertCanonicalYoutubeApiChannelId('captain-colin', YOUTUBE_CHANNEL_ID),
    {message: 'The YouTube API response does not match the canonical Captain Colin channel.'},
  );
});
