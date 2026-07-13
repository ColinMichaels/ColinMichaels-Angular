import {
  DEFAULT_BLOG_APP_EMBED_HEIGHT,
  getTrustedBlogAppEmbedUrl,
  HEAR_THE_HOOK_EMBED_URL,
  MAX_BLOG_APP_EMBED_HEIGHT,
  MIN_BLOG_APP_EMBED_HEIGHT,
  normalizeBlogAppEmbedHeight,
} from './blog-embed.util';

describe('blog embed utilities', () => {
  it('accepts only the canonical Hear the Hook page and its approved aliases', () => {
    expect(getTrustedBlogAppEmbedUrl(HEAR_THE_HOOK_EMBED_URL)?.toString()).toBe(HEAR_THE_HOOK_EMBED_URL);
    expect(getTrustedBlogAppEmbedUrl('https://hear-the-hook.captaincolin.chatgpt.site/')?.toString())
      .toBe(HEAR_THE_HOOK_EMBED_URL);
    expect(getTrustedBlogAppEmbedUrl('https://hear-the-hook.captaincolin.chatgpt.site/soundboard.html')?.toString())
      .toBe(HEAR_THE_HOOK_EMBED_URL);
  });

  it('rejects unapproved app origins, paths, credentials, queries, and protocols', () => {
    expect(getTrustedBlogAppEmbedUrl('https://example.com/soundboard')).toBeNull();
    expect(getTrustedBlogAppEmbedUrl('https://hear-the-hook.captaincolin.chatgpt.site/other')).toBeNull();
    expect(getTrustedBlogAppEmbedUrl('https://user@hear-the-hook.captaincolin.chatgpt.site/soundboard')).toBeNull();
    expect(getTrustedBlogAppEmbedUrl('https://hear-the-hook.captaincolin.chatgpt.site/soundboard?next=other')).toBeNull();
    expect(getTrustedBlogAppEmbedUrl('http://hear-the-hook.captaincolin.chatgpt.site/soundboard')).toBeNull();
  });

  it('defaults and clamps app frame heights', () => {
    expect(normalizeBlogAppEmbedHeight(undefined)).toBe(DEFAULT_BLOG_APP_EMBED_HEIGHT);
    expect(normalizeBlogAppEmbedHeight(120)).toBe(MIN_BLOG_APP_EMBED_HEIGHT);
    expect(normalizeBlogAppEmbedHeight(900.4)).toBe(900);
    expect(normalizeBlogAppEmbedHeight(9000)).toBe(MAX_BLOG_APP_EMBED_HEIGHT);
  });
});
