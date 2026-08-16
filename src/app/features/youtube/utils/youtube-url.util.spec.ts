import {
  createYouTubeEmbedUrl,
  createYouTubeThumbnailUrl,
  createYouTubeWatchUrl,
  getYouTubeVideoId,
} from './youtube-url.util';

describe('YouTube URL utilities', () => {
  it('normalizes supported watch, share, Shorts, live, and embed URLs', () => {
    const videoId = 'L229QDxDakU';

    expect(getYouTubeVideoId(`https://www.youtube.com/watch?v=${videoId}`)).toBe(videoId);
    expect(getYouTubeVideoId(`https://youtu.be/${videoId}?feature=shared`)).toBe(videoId);
    expect(getYouTubeVideoId(`https://www.youtube.com/shorts/${videoId}`)).toBe(videoId);
    expect(getYouTubeVideoId(`https://www.youtube.com/live/${videoId}`)).toBe(videoId);
    expect(createYouTubeWatchUrl(`https://www.youtube-nocookie.com/embed/${videoId}`))
      .toBe(`https://www.youtube.com/watch?v=${videoId}`);
    expect(createYouTubeEmbedUrl(`https://youtu.be/${videoId}`))
      .toBe(`https://www.youtube.com/embed/${videoId}`);
    expect(createYouTubeThumbnailUrl(videoId))
      .toBe(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
  });

  it('rejects lookalike hosts, unsafe schemes, and malformed IDs', () => {
    expect(getYouTubeVideoId('https://youtube.com.example.com/watch?v=L229QDxDakU')).toBeNull();
    expect(getYouTubeVideoId('javascript:alert(1)')).toBeNull();
    expect(createYouTubeThumbnailUrl('../bad-id')).toBeNull();
  });
});
