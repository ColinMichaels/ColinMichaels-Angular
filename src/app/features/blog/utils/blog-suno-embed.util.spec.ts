import {getBlogSunoEmbedUrls, SUNO_EMBED_HEIGHT} from './blog-suno-embed.util';

describe('blog Suno embed utilities', () => {
  const songId = '44cd6eab-d6d7-4cb9-bea7-af398776556e';

  it('normalizes Suno song and embed URLs into canonical targets', () => {
    const fromSong = getBlogSunoEmbedUrls(`https://suno.com/song/${songId}`);
    const fromEmbed = getBlogSunoEmbedUrls(`https://www.suno.com/embed/${songId}`);

    expect(fromSong?.songUrl.toString()).toBe(`https://suno.com/song/${songId}`);
    expect(fromSong?.embedUrl.toString()).toBe(`https://suno.com/embed/${songId}`);
    expect(fromEmbed).toEqual(fromSong);
    expect(SUNO_EMBED_HEIGHT).toBe(240);
    expect(getBlogSunoEmbedUrls('https://suno.com/song/01944cd6-eab0-7cc9-bea7-af398776556e')).not.toBeNull();
  });

  it('rejects untrusted Suno-like and malformed URLs', () => {
    expect(getBlogSunoEmbedUrls(`http://suno.com/song/${songId}`)).toBeNull();
    expect(getBlogSunoEmbedUrls(`https://user@suno.com/song/${songId}`)).toBeNull();
    expect(getBlogSunoEmbedUrls(`https://suno.com:8443/song/${songId}`)).toBeNull();
    expect(getBlogSunoEmbedUrls(`https://suno.com/song/${songId}?share=1`)).toBeNull();
    expect(getBlogSunoEmbedUrls('https://suno.com/playlist/not-a-song')).toBeNull();
    expect(getBlogSunoEmbedUrls(`https://evil.example/embed/${songId}`)).toBeNull();
  });
});
