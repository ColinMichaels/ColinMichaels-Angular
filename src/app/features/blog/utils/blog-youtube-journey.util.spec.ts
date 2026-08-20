import type {BlogPostSummary} from '../models/blog-post.model';
import {
  createIsoVideoDuration,
  selectBlogCompanionVideo,
  selectBlogCompanionVideoChannel,
  selectBlogCompanionVideoSchema,
  shouldShowDroneYouTubeJourney,
} from './blog-youtube-journey.util';

function createPost(overrides: Partial<BlogPostSummary> = {}): BlogPostSummary {
  return {
    id: 'post-1',
    slug: 'weekly-notes',
    title: 'Weekly notes',
    excerpt: 'A concise update.',
    coverImage: '/assets/example.webp',
    author: {name: 'Colin Michaels'},
    categories: ['Weekly Updates'],
    tags: [],
    publishedAt: '2026-08-15T00:00:00.000Z',
    updatedAt: '2026-08-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('shouldShowDroneYouTubeJourney', () => {
  it('accepts the canonical drone topic identity', () => {
    expect(shouldShowDroneYouTubeJourney(createPost(), 'drones-fpv')).toBeTrue();
  });

  it('accepts explicit drone taxonomy and tags', () => {
    expect(shouldShowDroneYouTubeJourney(createPost({
      categories: ['Drones & FPV'],
    }))).toBeTrue();
    expect(shouldShowDroneYouTubeJourney(createPost({
      tags: ['Aerial Photography'],
    }))).toBeTrue();
  });

  it('does not promote the channel from an incidental title or excerpt mention', () => {
    expect(shouldShowDroneYouTubeJourney(createPost({
      title: 'A drone appeared in my recovery walk',
      excerpt: 'A passing reference to an FPV flight.',
      categories: ['Health & Recovery'],
      tags: ['Recovery'],
    }))).toBeFalse();
  });
});

describe('selectBlogCompanionVideoChannel', () => {
  it('uses Colin Michaels for general article companions and reserves Captain Colin for drone work', () => {
    expect(selectBlogCompanionVideoChannel(createPost())).toBe('colin-michaels');
    expect(selectBlogCompanionVideoChannel(createPost({categories: ['Drones & FPV']}))).toBe('captain-colin');
  });
});

describe('selectBlogCompanionVideo', () => {
  it('returns the exact trusted YouTube block selected by the editor', () => {
    expect(selectBlogCompanionVideo([{
      id: 'youtube-companion',
      type: 'embed',
      data: {
        provider: 'youtube',
        url: 'https://youtu.be/L229QDxDakU',
        embedUrl: 'https://www.youtube.com/embed/L229QDxDakU',
        isCompanionVideo: true,
      },
    }])).toEqual({
      videoId: 'L229QDxDakU',
      videoUrl: 'https://www.youtube.com/watch?v=L229QDxDakU',
      thumbnailUrl: 'https://i.ytimg.com/vi/L229QDxDakU/hqdefault.jpg',
    });
  });

  it('ignores ordinary YouTube embeds and invalid flagged URLs', () => {
    expect(selectBlogCompanionVideo([{
      id: 'youtube-reference',
      type: 'embed',
      data: {
        provider: 'youtube',
        url: 'https://youtu.be/L229QDxDakU',
      },
    }])).toBeNull();
    expect(selectBlogCompanionVideo([{
      id: 'unsafe-companion',
      type: 'embed',
      data: {
        provider: 'youtube',
        url: 'https://youtube.com.example.com/watch?v=L229QDxDakU',
        isCompanionVideo: true,
      },
    }])).toBeNull();
  });
});

describe('selectBlogCompanionVideoSchema', () => {
  it('returns complete, normalized VideoObject input for the exact companion', () => {
    expect(selectBlogCompanionVideoSchema([{
      id: 'youtube-companion',
      type: 'embed',
      data: {
        provider: 'youtube',
        url: 'https://youtu.be/L229QDxDakU',
        isCompanionVideo: true,
        videoTitle: '  Field flight  ',
        videoDescription: '  A complete public field-flight description.  ',
        videoUploadDate: '2026-08-13T13:43:21Z',
        videoDurationSeconds: 158.4,
      },
    }])).toEqual({
      name: 'Field flight',
      description: 'A complete public field-flight description.',
      thumbnailUrl: ['https://i.ytimg.com/vi/L229QDxDakU/hqdefault.jpg'],
      uploadDate: '2026-08-13T13:43:21Z',
      embedUrl: 'https://www.youtube.com/embed/L229QDxDakU',
      url: 'https://www.youtube.com/watch?v=L229QDxDakU',
      duration: 'PT2M38S',
    });
  });

  it('omits schema for incomplete or ambiguous upload metadata without hiding the companion', () => {
    const incomplete = [{
      id: 'youtube-companion',
      type: 'embed' as const,
      data: {
        provider: 'youtube',
        url: 'https://youtu.be/L229QDxDakU',
        isCompanionVideo: true,
        videoTitle: 'Field flight',
        videoDescription: 'Description',
        videoUploadDate: '2026-08-13T13:43:21',
      },
    }];

    expect(selectBlogCompanionVideo(incomplete)).not.toBeNull();
    expect(selectBlogCompanionVideoSchema(incomplete)).toBeNull();
  });

  it('converts positive runtimes and rejects invalid values', () => {
    expect(createIsoVideoDuration(3723)).toBe('PT1H2M3S');
    expect(createIsoVideoDuration(3600)).toBe('PT1H');
    expect(createIsoVideoDuration(0)).toBeNull();
    expect(createIsoVideoDuration(Number.NaN)).toBeNull();
  });
});
