import {
  YOUTUBE_CHANNEL_ID,
  YOUTUBE_CHANNEL_URL,
} from '../../../shared/seo/site-identity';
import {YouTubeFeedResponse} from '../models/youtube-video.model';
import {
  YOUTUBE_FEED_IDENTITY_ERROR,
  assertCanonicalYouTubeFeed,
} from './youtube-feed-identity.util';

function createFeed(channelId: string, channelUrl: string): YouTubeFeedResponse {
  return {
    fetchedAt: '2026-08-15T00:00:00.000Z',
    source: 'youtube-api',
    channelId,
    channelTitle: 'Captain Colin',
    channelUrl,
    videos: [],
  };
}

describe('assertCanonicalYouTubeFeed', () => {
  it('normalizes accepted feed links to the canonical Captain Colin channel', () => {
    const feed = assertCanonicalYouTubeFeed(createFeed(
      ` ${YOUTUBE_CHANNEL_ID} `,
      'https://www.youtube.com/@untrusted-handle'
    ));

    expect(feed.channelId).toBe(YOUTUBE_CHANNEL_ID);
    expect(feed.channelUrl).toBe(YOUTUBE_CHANNEL_URL);
  });

  it('rejects a feed from another configured channel', () => {
    expect(() => assertCanonicalYouTubeFeed(createFeed(
      'UCCJMwxuUIb6S4aoZiZeAVeQ',
      'https://www.youtube.com/channel/UCCJMwxuUIb6S4aoZiZeAVeQ'
    ))).toThrowError(YOUTUBE_FEED_IDENTITY_ERROR);
  });
});
