export const BLOG_SOCIAL_CHANNELS = [
  'notify',
  'youtube',
  'facebook',
  'instagram',
  'linkedin',
] as const;

export type BlogSocialChannel = typeof BLOG_SOCIAL_CHANNELS[number];

export type BlogSocialAnnouncementStatus =
  | 'draft'
  | 'scheduled'
  | 'queued'
  | 'posted'
  | 'failed'
  | 'cancelled';

export interface BlogSocialAnnouncement {
  id: string;
  channel: BlogSocialChannel;
  message: string;
  scheduledAt: string;
  status: BlogSocialAnnouncementStatus;
  createdAt: string;
  updatedAt: string;
  postedAt?: string;
  linkUrl?: string;
  failureReason?: string;
}

export interface BlogSocialPromotion {
  announcements: readonly BlogSocialAnnouncement[];
}
