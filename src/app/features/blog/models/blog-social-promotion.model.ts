export const BLOG_SOCIAL_CHANNELS = [
  'notify',
  'youtube',
  'facebook',
  'instagram',
  'threads',
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

export const BLOG_SOCIAL_CONTENT_ANGLES = [
  'personal-story',
  'conversation-starter',
  'practical-takeaway',
  'behind-the-scenes',
] as const;

export type BlogSocialContentAngle = typeof BLOG_SOCIAL_CONTENT_ANGLES[number];

export const BLOG_SOCIAL_MEDIA_TYPES = ['image', 'video'] as const;

export type BlogSocialMediaType = typeof BLOG_SOCIAL_MEDIA_TYPES[number];

export const BLOG_SOCIAL_LINK_PLACEMENTS = [
  'post',
  'first-comment',
  'profile',
  'none',
] as const;

export type BlogSocialLinkPlacement = typeof BLOG_SOCIAL_LINK_PLACEMENTS[number];

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
  /** Undefined preserves the legacy link-preview/text-only behavior. */
  mediaType?: BlogSocialMediaType;
  /** Undefined announcements use the historical in-post link behavior. */
  linkPlacement?: BlogSocialLinkPlacement;
  /** Optional editorial intent used to regenerate or report on promotional copy. */
  contentAngle?: BlogSocialContentAngle;
  failureReason?: string;
}

export interface BlogSocialPromotion {
  announcements: readonly BlogSocialAnnouncement[];
}
