import {YOUTUBE_CHANNEL_ID} from './seo-site';

export const YOUTUBE_CHANNEL_CONFIGURATION_ERROR =
  `YOUTUBE_CHANNEL_ID must match the canonical Captain Colin channel (${YOUTUBE_CHANNEL_ID}).`;

export function parseCanonicalYoutubeChannelId(value: unknown): string {
  const channelId = typeof value === 'string' ? value.trim() : '';

  if (!channelId) {
    throw new Error('YOUTUBE_CHANNEL_ID is not configured for the YouTube feed.');
  }

  if (channelId !== YOUTUBE_CHANNEL_ID) {
    throw new Error(YOUTUBE_CHANNEL_CONFIGURATION_ERROR);
  }

  return channelId;
}

export function assertCanonicalYoutubeApiChannelId(value: unknown): void {
  if (typeof value !== 'string' || value.trim() !== YOUTUBE_CHANNEL_ID) {
    throw new Error('The YouTube API response does not match the canonical Captain Colin channel.');
  }
}
