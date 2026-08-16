import {
  YOUTUBE_CHANNEL_ID,
  YOUTUBE_CHANNEL_URL,
} from '../../../shared/seo/site-identity';
import {YouTubeFeedResponse} from '../models/youtube-video.model';

export const YOUTUBE_FEED_IDENTITY_ERROR =
  'The YouTube feed does not match the canonical Captain Colin channel.';

export function assertCanonicalYouTubeFeed(feed: YouTubeFeedResponse): YouTubeFeedResponse {
  if (feed.channelId.trim() !== YOUTUBE_CHANNEL_ID) {
    throw new Error(YOUTUBE_FEED_IDENTITY_ERROR);
  }

  return {
    ...feed,
    channelId: YOUTUBE_CHANNEL_ID,
    channelUrl: YOUTUBE_CHANNEL_URL,
  };
}
