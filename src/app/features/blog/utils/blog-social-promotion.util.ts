import {BlogPost} from '../models/blog-post.model';
import {
  BlogSocialChannel,
  BlogSocialContentAngle,
  BlogSocialLinkPlacement,
  BlogSocialPostFormat,
} from '../models/blog-social-promotion.model';
import {createCampaignUrl} from '../../../shared/analytics/campaign-url.util';

type SocialMessagePost = Pick<BlogPost, 'excerpt' | 'slug' | 'tags' | 'title'>;

const DEFAULT_ANGLE_BY_CHANNEL: Readonly<Record<BlogSocialChannel, BlogSocialContentAngle>> = {
  notify: 'practical-takeaway',
  youtube: 'behind-the-scenes',
  facebook: 'personal-story',
  instagram: 'personal-story',
  threads: 'conversation-starter',
  x: 'conversation-starter',
  linkedin: 'practical-takeaway',
};

const DEFAULT_LINK_PLACEMENT_BY_CHANNEL: Readonly<Record<BlogSocialChannel, BlogSocialLinkPlacement>> = {
  notify: 'post',
  youtube: 'post',
  facebook: 'first-comment',
  instagram: 'profile',
  threads: 'post',
  x: 'post',
  linkedin: 'post',
};

const POST_FORMATS_BY_CHANNEL: Readonly<Record<BlogSocialChannel, readonly BlogSocialPostFormat[]>> = {
  notify: ['text', 'link'],
  youtube: ['video', 'reel', 'community'],
  facebook: ['text', 'link', 'image', 'video', 'reel', 'story'],
  instagram: ['image', 'video', 'reel', 'story', 'carousel'],
  threads: ['text', 'link', 'image', 'video', 'thread'],
  x: ['text', 'link', 'image', 'video', 'thread'],
  linkedin: ['text', 'link', 'image', 'video', 'carousel'],
};

const DEFAULT_POST_FORMAT_BY_CHANNEL: Readonly<Record<BlogSocialChannel, BlogSocialPostFormat>> = {
  notify: 'link',
  youtube: 'video',
  facebook: 'image',
  instagram: 'image',
  threads: 'text',
  x: 'text',
  linkedin: 'text',
};

export function defaultSocialContentAngle(channel: BlogSocialChannel): BlogSocialContentAngle {
  return DEFAULT_ANGLE_BY_CHANNEL[channel];
}

export function defaultSocialLinkPlacement(channel: BlogSocialChannel): BlogSocialLinkPlacement {
  return DEFAULT_LINK_PLACEMENT_BY_CHANNEL[channel];
}

export function socialPostFormatsForChannel(channel: BlogSocialChannel): readonly BlogSocialPostFormat[] {
  return POST_FORMATS_BY_CHANNEL[channel];
}

export function defaultSocialPostFormat(channel: BlogSocialChannel): BlogSocialPostFormat {
  return DEFAULT_POST_FORMAT_BY_CHANNEL[channel];
}

export function isSocialPostFormatAllowed(
  channel: BlogSocialChannel,
  postFormat: BlogSocialPostFormat
): boolean {
  return POST_FORMATS_BY_CHANNEL[channel].includes(postFormat);
}

export function createBlogSocialMessage(
  channel: BlogSocialChannel,
  post: SocialMessagePost,
  angle: BlogSocialContentAngle,
  linkPlacement: BlogSocialLinkPlacement,
  siteUrl: string
): string {
  const title = post.title.trim();
  const excerpt = post.excerpt.trim();
  const articleUrl = createBlogSocialCampaignUrl(channel, post, siteUrl);
  const message = channel === 'threads' || channel === 'x'
    ? createCompactMessage(title, excerpt, angle)
    : createFullMessage(title, excerpt, angle);
  const linkCallToAction = createLinkCallToAction(linkPlacement, articleUrl);
  const hashtags = channel === 'instagram' ? createHashtags(post.tags) : '';

  return [message, linkCallToAction, hashtags].filter(Boolean).join('\n\n');
}

/**
 * Produces the canonical article URL for a scheduled social share with a
 * channel-specific, non-identifying GA4 campaign attribution contract.
 */
export function createBlogSocialCampaignUrl(
  channel: BlogSocialChannel,
  post: Pick<BlogPost, 'slug'>,
  siteUrl: string
): string {
  return createCampaignUrl(`${siteUrl.replace(/\/$/, '')}/blog/${post.slug}`, {
    source: socialUtmSource(channel),
    medium: socialUtmMedium(channel),
    campaign: 'article_launch',
    content: post.slug,
  });
}

function socialUtmSource(channel: BlogSocialChannel): string {
  return channel === 'notify' ? 'site_notification' : channel;
}

function socialUtmMedium(channel: BlogSocialChannel): string {
  switch (channel) {
    case 'notify':
      return 'push';
    case 'youtube':
      return 'video_description';
    default:
      return 'organic_social';
  }
}

function createFullMessage(title: string, excerpt: string, angle: BlogSocialContentAngle): string {
  switch (angle) {
    case 'personal-story':
      return [
        'This one felt worth sharing personally.',
        excerpt,
        `I wrote “${title}” to share the context behind it and why it stayed with me.`,
        'Has anything like this changed the way you think about the topic?',
      ].join('\n\n');
    case 'conversation-starter':
      return [
        'I’m curious how other people would approach this.',
        excerpt,
        `I explored the question in “${title}.”`,
        'What would you add to the conversation?',
      ].join('\n\n');
    case 'practical-takeaway':
      return [
        `One useful takeaway from “${title}”:`,
        excerpt,
        'I broke the idea down into practical context you can use or share with someone who needs it.',
      ].join('\n\n');
    case 'behind-the-scenes':
      return [
        `Why I wrote “${title}”:`,
        excerpt,
        'The finished article includes the context, choices, and lessons behind it.',
      ].join('\n\n');
  }
}

function createCompactMessage(title: string, excerpt: string, angle: BlogSocialContentAngle): string {
  switch (angle) {
    case 'personal-story':
      return `This one stayed with me. ${excerpt}\n\nI shared the story in “${title}.” What stands out to you?`;
    case 'conversation-starter':
      return `${excerpt}\n\nI explored it in “${title}.” How would you approach it?`;
    case 'practical-takeaway':
      return `A useful takeaway from “${title}”: ${excerpt}`;
    case 'behind-the-scenes':
      return `Why I wrote “${title}”: ${excerpt}`;
  }
}

function createLinkCallToAction(linkPlacement: BlogSocialLinkPlacement, articleUrl: string): string {
  switch (linkPlacement) {
    case 'post':
      return `Read the full article: ${articleUrl}`;
    case 'first-comment':
      return 'I’ll put the full article in the first comment so the story can lead here.';
    case 'profile':
      return 'The full article is linked from my profile.';
    case 'none':
      return '';
  }
}

function createHashtags(tags: readonly string[]): string {
  return tags
    .slice(0, 3)
    .map(tag => `#${tag.replace(/[^a-zA-Z0-9]/g, '')}`)
    .filter(tag => tag.length > 1)
    .join(' ');
}
