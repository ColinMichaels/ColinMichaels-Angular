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

export type BlogSocialDeliveryTiming = 'at-publish' | 'scheduled';

export interface BlogSocialAnnouncement {
  id: string;
  channel: BlogSocialChannel;
  message: string;
  scheduledAt: string;
  /**
   * Older announcements omit this field and retain their fixed scheduledAt value.
   * At-publish announcements follow the source post when its publish time changes.
   */
  deliveryTiming?: BlogSocialDeliveryTiming;
  status: BlogSocialAnnouncementStatus;
  createdAt: string;
  updatedAt: string;
  postedAt?: string;
  linkUrl?: string;
  mediaUrl?: string;
  failureReason?: string;
}

export interface BlogSocialPromotion {
  announcements: readonly BlogSocialAnnouncement[];
}
