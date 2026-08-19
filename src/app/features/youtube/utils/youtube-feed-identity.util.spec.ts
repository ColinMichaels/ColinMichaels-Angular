import {
  CAPTAIN_COLIN_YOUTUBE_CHANNEL_ID,
  CAPTAIN_COLIN_YOUTUBE_CHANNEL_URL,
  YOUTUBE_CHANNEL_ID,
  YOUTUBE_CHANNEL_URL,
} from '../../../shared/seo/site-identity';
import {YouTubeFeedResponse} from '../models/youtube-video.model';
import {assertCanonicalYouTubeFeed} from './youtube-feed-identity.util';

function createFeed(channelId: string, channelUrl: string): YouTubeFeedResponse {
  return {
    fetchedAt: '2026-08-15T00:00:00.000Z',
    source: 'youtube-api',
    channelId,
    channelTitle: 'Colin Michaels',
    channelUrl,
    videos: [],
  };
}

describe('assertCanonicalYouTubeFeed', () => {
  it('normalizes accepted feed links to the canonical Colin Michaels channel', () => {
    const feed = assertCanonicalYouTubeFeed(createFeed(
      ` ${YOUTUBE_CHANNEL_ID} `,
      'https://www.youtube.com/@untrusted-handle'
    ), 'colin-michaels');

    expect(feed.channelId).toBe(YOUTUBE_CHANNEL_ID);
    expect(feed.channelUrl).toBe(YOUTUBE_CHANNEL_URL);
  });

  it('supports the explicitly selected Captain Colin feed for drone surfaces', () => {
    const feed = assertCanonicalYouTubeFeed(createFeed(
      ` ${CAPTAIN_COLIN_YOUTUBE_CHANNEL_ID} `,
      'https://www.youtube.com/@untrusted-handle'
    ), 'captain-colin');

    expect(feed.channelId).toBe(CAPTAIN_COLIN_YOUTUBE_CHANNEL_ID);
    expect(feed.channelUrl).toBe(CAPTAIN_COLIN_YOUTUBE_CHANNEL_URL);
  });

  it('rejects a feed from the other configured channel', () => {
    expect(() => assertCanonicalYouTubeFeed(createFeed(
      CAPTAIN_COLIN_YOUTUBE_CHANNEL_ID,
      CAPTAIN_COLIN_YOUTUBE_CHANNEL_URL
    ), 'colin-michaels')).toThrowError(
      'The YouTube feed does not match the canonical Colin Michaels channel.'
    );
  });
});
