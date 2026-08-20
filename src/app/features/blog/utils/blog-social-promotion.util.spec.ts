import {
  createBlogSocialCampaignUrl,
  createBlogSocialMessage,
  defaultSocialContentAngle,
  defaultSocialLinkPlacement,
  defaultSocialPostFormat,
  isSocialPostFormatAllowed,
  socialPostFormatsForChannel,
} from './blog-social-promotion.util';

const post = {
  slug: 'voice-cloning-safe-word',
  title: 'I Cloned My Own Voice. Now My Family Needs a Safe Word',
  excerpt: 'A few minutes of audio can be enough to imitate someone you trust.',
  tags: ['AI Safety', 'Family', 'Voice Cloning'],
};

describe('blog social promotion utilities', () => {
  it('defaults Facebook to a personal native-first experiment', () => {
    expect(defaultSocialContentAngle('facebook')).toBe('personal-story');
    expect(defaultSocialLinkPlacement('facebook')).toBe('first-comment');
  });

  it('creates Facebook starter copy that leads with the story instead of a URL', () => {
    const message = createBlogSocialMessage(
      'facebook',
      post,
      'personal-story',
      'first-comment',
      'https://colinmichaels.com'
    );

    expect(message).toContain('This one felt worth sharing personally.');
    expect(message).toContain(post.excerpt);
    expect(message).toContain('first comment');
    expect(message).not.toContain('https://');
  });

  it('offers native channel formats with an image-first Facebook default', () => {
    expect(defaultSocialPostFormat('facebook')).toBe('image');
    expect(socialPostFormatsForChannel('facebook')).toContain('reel');
    expect(socialPostFormatsForChannel('instagram')).toContain('carousel');
    expect(socialPostFormatsForChannel('youtube')).toContain('community');
    expect(isSocialPostFormatAllowed('x', 'thread')).toBeTrue();
    expect(isSocialPostFormatAllowed('instagram', 'thread')).toBeFalse();
  });

  it('treats X as a compact conversation-first channel', () => {
    expect(defaultSocialContentAngle('x')).toBe('conversation-starter');
    expect(defaultSocialLinkPlacement('x')).toBe('post');

    const message = createBlogSocialMessage(
      'x',
      post,
      'conversation-starter',
      'post',
      'https://colinmichaels.com'
    );

    expect(message).toContain('How would you approach it?');
    expect(message).toContain('https://colinmichaels.com/blog/voice-cloning-safe-word?utm_source=x&utm_medium=organic_social&utm_campaign=article_launch&utm_content=voice-cloning-safe-word');
    expect(message).not.toContain('I\u2019m curious how other people would approach this.');
  });

  it('can create an in-post educational share with a channel-tagged article link', () => {
    const message = createBlogSocialMessage(
      'linkedin',
      post,
      'practical-takeaway',
      'post',
      'https://colinmichaels.com/'
    );

    expect(message).toContain('One useful takeaway');
    expect(message).toContain('https://colinmichaels.com/blog/voice-cloning-safe-word?utm_source=linkedin&utm_medium=organic_social&utm_campaign=article_launch&utm_content=voice-cloning-safe-word');
  });

  it('stores the same tagged destination for first-comment and profile-link drafts', () => {
    const facebookUrl = createBlogSocialCampaignUrl('facebook', post, 'https://colinmichaels.com');
    const instagramUrl = createBlogSocialCampaignUrl('instagram', post, 'https://colinmichaels.com');

    expect(facebookUrl).toBe(
      'https://colinmichaels.com/blog/voice-cloning-safe-word?utm_source=facebook&utm_medium=organic_social&utm_campaign=article_launch&utm_content=voice-cloning-safe-word'
    );
    expect(instagramUrl).toContain('utm_source=instagram');
    expect(instagramUrl).toContain('utm_medium=organic_social');
  });

  it('adds compact Instagram hashtags without adding an unavailable body link', () => {
    const message = createBlogSocialMessage(
      'instagram',
      post,
      'behind-the-scenes',
      'profile',
      'https://colinmichaels.com'
    );

    expect(message).toContain('linked from my profile');
    expect(message).toContain('#AISafety #Family #VoiceCloning');
    expect(message).not.toContain('https://');
  });
});
