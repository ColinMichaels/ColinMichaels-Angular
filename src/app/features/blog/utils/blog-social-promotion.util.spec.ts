import {
  createBlogSocialMessage,
  defaultSocialContentAngle,
  defaultSocialLinkPlacement,
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

  it('can create an in-post educational share with a canonical article link', () => {
    const message = createBlogSocialMessage(
      'linkedin',
      post,
      'practical-takeaway',
      'post',
      'https://colinmichaels.com/'
    );

    expect(message).toContain('One useful takeaway');
    expect(message).toContain('https://colinmichaels.com/blog/voice-cloning-safe-word');
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
