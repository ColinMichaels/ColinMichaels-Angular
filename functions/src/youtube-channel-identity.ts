import {
  getYoutubeChannelIdentity,
  type YoutubeChannelKey,
} from './seo-site';

export function parseYoutubeChannelKey(value: unknown): YoutubeChannelKey {
  if (value === undefined || value === null || value === '') {
    // Existing deployed clients did not send a key and were wired to Captain Colin.
    return 'captain-colin';
  }

  if (value === 'colin-michaels' || value === 'captain-colin') {
    return value;
  }

  throw new Error('Select either the Colin Michaels or Captain Colin YouTube channel.');
}

export function getYoutubeChannelConfigurationError(channelKey: YoutubeChannelKey): string {
  const channel = getYoutubeChannelIdentity(channelKey);
  const parameter = channelKey === 'colin-michaels'
    ? 'COLIN_MICHAELS_YOUTUBE_CHANNEL_ID'
    : 'YOUTUBE_CHANNEL_ID';

  return `${parameter} must match the canonical ${channel.name} channel (${channel.id}).`;
}

export function parseCanonicalYoutubeChannelId(channelKey: YoutubeChannelKey, value: unknown): string {
  const channel = getYoutubeChannelIdentity(channelKey);
  const channelId = typeof value === 'string' ? value.trim() : '';

  if (!channelId) {
    throw new Error(`${channel.name} is not configured for the YouTube feed.`);
  }

  if (channelId !== channel.id) {
    throw new Error(getYoutubeChannelConfigurationError(channelKey));
  }

  return channelId;
}

export function assertCanonicalYoutubeApiChannelId(channelKey: YoutubeChannelKey, value: unknown): void {
  const channel = getYoutubeChannelIdentity(channelKey);

  if (typeof value !== 'string' || value.trim() !== channel.id) {
    throw new Error(`The YouTube API response does not match the canonical ${channel.name} channel.`);
  }
}
