import {
  getYouTubeChannelIdentity,
  type YouTubeChannelKey,
} from '../../../shared/seo/site-identity';
import {YouTubeFeedResponse} from '../models/youtube-video.model';

export function assertCanonicalYouTubeFeed(
  feed: YouTubeFeedResponse,
  channelKey: YouTubeChannelKey,
): YouTubeFeedResponse {
  const channel = getYouTubeChannelIdentity(channelKey);

  if (feed.channelId.trim() !== channel.id) {
    throw new Error(`The YouTube feed does not match the canonical ${channel.name} channel.`);
  }

  return {
    ...feed,
    channelId: channel.id,
    channelUrl: channel.url,
  };
}
