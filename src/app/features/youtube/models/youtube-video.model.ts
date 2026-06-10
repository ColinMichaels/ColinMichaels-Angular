export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  thumbnailAlt: string;
  videoUrl: string;
}

export interface YouTubeFeedRequest {
  maxResults?: number;
}

export interface YouTubeFeedResponse {
  fetchedAt: string;
  source: 'youtube-api';
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  videos: readonly YouTubeVideo[];
}
