import {BlogPost} from '../models/blog-post.model';
import {
  BlogSocialChannel,
  BlogSocialContentAngle,
  BlogSocialLinkPlacement,
} from '../models/blog-social-promotion.model';

type SocialMessagePost = Pick<BlogPost, 'excerpt' | 'slug' | 'tags' | 'title'>;

const DEFAULT_ANGLE_BY_CHANNEL: Readonly<Record<BlogSocialChannel, BlogSocialContentAngle>> = {
  notify: 'practical-takeaway',
  youtube: 'behind-the-scenes',
  facebook: 'personal-story',
  instagram: 'personal-story',
  threads: 'conversation-starter',
  linkedin: 'practical-takeaway',
};

const DEFAULT_LINK_PLACEMENT_BY_CHANNEL: Readonly<Record<BlogSocialChannel, BlogSocialLinkPlacement>> = {
  notify: 'post',
  youtube: 'post',
  facebook: 'first-comment',
  instagram: 'profile',
  threads: 'post',
  linkedin: 'post',
};

export function defaultSocialContentAngle(channel: BlogSocialChannel): BlogSocialContentAngle {
  return DEFAULT_ANGLE_BY_CHANNEL[channel];
}

export function defaultSocialLinkPlacement(channel: BlogSocialChannel): BlogSocialLinkPlacement {
  return DEFAULT_LINK_PLACEMENT_BY_CHANNEL[channel];
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
  const articleUrl = `${siteUrl.replace(/\/$/, '')}/blog/${post.slug}`;
  const message = channel === 'threads'
    ? createCompactMessage(title, excerpt, angle)
    : createFullMessage(title, excerpt, angle);
  const linkCallToAction = createLinkCallToAction(linkPlacement, articleUrl);
  const hashtags = channel === 'instagram' ? createHashtags(post.tags) : '';

  return [message, linkCallToAction, hashtags].filter(Boolean).join('\n\n');
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
