import {BlogPost, getBlogListItemTexts} from '../models/blog-post.model';
import {hasTrustedBlogPostUrls, isBlogContentBlock, isBlogPost} from './blog-validation.util';

function createPost(): BlogPost {
  return {
    id: 'post-background-test',
    slug: 'post-background-test',
    title: 'Post Background Test',
    excerpt: 'A valid post used to exercise the optional background contract.',
    coverImage: '/assets/images/backgrounds/night.webp',
    author: {name: 'Colin Michaels'},
    categories: ['CMS'],
    tags: ['Background'],
    status: 'published',
    seo: {
      title: 'Post Background Test',
      description: 'A valid post used to exercise the optional background contract.',
    },
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: '2026-07-11T12:00:00.000Z',
    updatedAt: '2026-07-11T12:00:00.000Z',
    publishedAt: '2026-07-11T12:00:00.000Z',
  };
}

describe('blog post validation', () => {
  it('validates legacy and recursive list block contracts', () => {
    expect(isBlogContentBlock({
      id: 'legacy-list',
      type: 'list',
      data: {ordered: false, items: ['One', 'Two']},
    })).toBeTrue();
    expect(isBlogContentBlock({
      id: 'recursive-list',
      type: 'list',
      data: {
        ordered: false,
        listStyle: 'checklist',
        listPresentation: 'standard',
        listMeta: {},
        listItems: [{
          content: 'Parent',
          meta: {checked: true},
          items: [{content: 'Child', meta: {checked: false}, items: []}],
        }],
      },
    })).toBeTrue();
    expect(isBlogContentBlock({
      id: 'step-list',
      type: 'list',
      data: {
        ordered: true,
        listStyle: 'ordered',
        listPresentation: 'steps',
        listMeta: {},
        listItems: [{content: 'Prepare', meta: {}, items: []}],
      },
    })).toBeTrue();
    expect(isBlogContentBlock({
      id: 'invalid-presentation',
      type: 'list',
      data: {ordered: true, items: ['One'], listPresentation: 'timeline'},
    })).toBeFalse();
    expect(isBlogContentBlock({
      id: 'invalid-steps-style',
      type: 'list',
      data: {ordered: false, listStyle: 'unordered', items: ['One'], listPresentation: 'steps'},
    })).toBeFalse();
    expect(isBlogContentBlock({
      id: 'invalid-recursive-list',
      type: 'list',
      data: {
        listStyle: 'checklist',
        listItems: [{content: 'Missing child collection', meta: {checked: false}}],
      },
    })).toBeFalse();
  });

  it('flattens legacy and recursive list text in visual reading order', () => {
    expect(getBlogListItemTexts({items: ['One', 'Two']})).toEqual(['One', 'Two']);
    expect(getBlogListItemTexts({
      listItems: [{
        content: 'Parent',
        meta: {},
        items: [
          {content: 'First child', meta: {}, items: []},
          {content: 'Second child', meta: {}, items: [{content: 'Grandchild', meta: {}, items: []}]},
        ],
      }],
    })).toEqual(['Parent', 'First child', 'Second child', 'Grandchild']);
  });

  it('validates optional bounded image sizes and positive intrinsic dimensions', () => {
    expect(isBlogContentBlock({
      id: 'legacy-image',
      type: 'image',
      data: {url: '/assets/images/backgrounds/day.webp'},
    })).toBeTrue();
    expect(isBlogContentBlock({
      id: 'wide-image',
      type: 'image',
      data: {
        url: '/assets/images/backgrounds/day.webp',
        imageLayout: 'fullWidth',
        imageSize: 'wide',
        width: 2400,
        height: 1200,
      },
    })).toBeTrue();
    expect(isBlogContentBlock({
      id: 'pixel-image',
      type: 'image',
      data: {url: '/assets/images/backgrounds/day.webp', imageSize: '960px'},
    })).toBeFalse();
    expect(isBlogContentBlock({
      id: 'invalid-dimensions',
      type: 'image',
      data: {url: '/assets/images/backgrounds/day.webp', width: -1, height: 0},
    })).toBeFalse();
  });

  it('validates unsupported compatibility envelopes and JSON tune metadata', () => {
    expect(isBlogContentBlock({
      id: 'table-1',
      type: 'unsupported',
      data: {
        unsupportedBlock: {
          originalType: 'table',
          originalData: {content: [['A', 'B']]},
          originalTunes: {alignmentTune: {alignment: 'center'}},
        },
      },
    })).toBeTrue();
    expect(isBlogContentBlock({
      id: 'encoded-table-1',
      type: 'unsupported',
      data: {
        unsupportedBlock: {
          originalType: 'table',
          encoding: 'json-v1',
          originalDataJson: '{"content":[["A","B"]]}',
          originalTunesJson: '{"alignmentTune":{"alignment":"center"}}',
        },
      },
    })).toBeTrue();
    expect(isBlogContentBlock({
      id: 'bad-encoded-table-1',
      type: 'unsupported',
      data: {
        unsupportedBlock: {
          originalType: 'table',
          encoding: 'json-v1',
          originalDataJson: '{not-json}',
        },
      },
    })).toBeFalse();
    expect(isBlogContentBlock({
      id: 'mixed-encoded-table-1',
      type: 'unsupported',
      data: {
        unsupportedBlock: {
          originalType: 'table',
          encoding: 'json-v1',
          originalDataJson: '{"content":[["A","B"]]}',
          originalData: {content: [['A', 'B']]},
        },
      },
    })).toBeFalse();
    expect(isBlogContentBlock({
      id: 'table-1',
      type: 'unsupported',
      data: {unsupportedBlock: {originalType: 'table'}},
    })).toBeFalse();
    expect(isBlogContentBlock({
      id: 'paragraph-1',
      type: 'paragraph',
      data: {text: 'Copy'},
      editorTunes: {alignmentTune: {alignment: Number.NaN}},
    })).toBeFalse();
  });

  it('rejects posts containing malformed block contracts', () => {
    expect(isBlogPost({
      ...createPost(),
      blocks: [{id: 'bad-chart', type: 'chart', data: {chartPoints: [{label: 'A', value: 'many'}]}}],
    })).toBeFalse();
  });

  it('keeps legacy posts valid when no background image is present', () => {
    expect(isBlogPost(createPost())).toBeTrue();
  });

  it('accepts bounded editorial evidence metadata without requiring it on legacy posts', () => {
    expect(isBlogPost({
      ...createPost(),
      editorial: {
        evidenceBasis: 'mixed',
        evidenceSummary: 'Hands-on field notes are separated from the linked manufacturer specifications.',
        sourceReviewedAt: '2026-08-15',
        relationshipDisclosure: 'No product access or compensation was supplied for this article.',
        aiAssistanceDisclosure: 'AI assisted with transcript organization; Colin reviewed the final claims.',
        syntheticMediaDisclosure: 'The cover is an AI-generated editorial illustration.',
        updateNote: 'Clarified which specifications came from the manufacturer.',
      },
    })).toBeTrue();
    expect(isBlogPost({...createPost(), editorial: {evidenceBasis: 'verified-by-magic'}})).toBeFalse();
    expect(isBlogPost({...createPost(), editorial: {sourceReviewedAt: '2026-02-30'}})).toBeFalse();
  });

  it('keeps URL validation write-only so legacy posts remain readable', () => {
    const legacyPost = {
      ...createPost(),
      coverImage: '//legacy.example.com/cover.jpg',
    };

    expect(isBlogPost(legacyPost)).toBeTrue();
    expect(hasTrustedBlogPostUrls(legacyPost)).toBeFalse();
  });

  it('accepts safe internal author links and rejects active author URLs on writes', () => {
    expect(hasTrustedBlogPostUrls({
      ...createPost(),
      author: {name: 'Colin Michaels', profileUrl: '/authors/colin-michaels'},
    })).toBeTrue();
    expect(hasTrustedBlogPostUrls({
      ...createPost(),
      author: {name: 'Colin Michaels', profileUrl: 'javascript:alert(1)'},
    })).toBeFalse();
  });

  it('accepts migration-safe revisions and rejects invalid revision values', () => {
    expect(isBlogPost({...createPost(), revision: 0})).toBeTrue();
    expect(isBlogPost({...createPost(), revision: 4})).toBeTrue();
    expect(isBlogPost({...createPost(), revision: -1})).toBeFalse();
    expect(isBlogPost({...createPost(), revision: 1.5})).toBeFalse();
  });

  it('accepts an optional post background image URL', () => {
    expect(isBlogPost({
      ...createPost(),
      backgroundImage: '/assets/images/backgrounds/day.webp',
    })).toBeTrue();
  });

  it('rejects malformed post background image values', () => {
    expect(isBlogPost({
      ...createPost(),
      backgroundImage: 42,
    })).toBeFalse();
  });

  it('keeps legacy posts valid when Cat Corner metadata is absent', () => {
    expect(isBlogPost(createPost())).toBeTrue();
  });

  it('accepts normalized Cat Corner metadata', () => {
    expect(isBlogPost({
      ...createPost(),
      catCorner: {enabled: true, discoveryPost: true},
    })).toBeTrue();
    expect(isBlogPost({
      ...createPost(),
      catCorner: {enabled: true, discoveryPost: false},
    })).toBeTrue();
    expect(isBlogPost({
      ...createPost(),
      catCorner: {enabled: false, discoveryPost: false},
    })).toBeTrue();
  });

  it('rejects malformed or contradictory Cat Corner metadata', () => {
    expect(isBlogPost({
      ...createPost(),
      catCorner: {enabled: false, discoveryPost: true},
    })).toBeFalse();
    expect(isBlogPost({
      ...createPost(),
      catCorner: {enabled: true},
    })).toBeFalse();
    expect(isBlogPost({
      ...createPost(),
      catCorner: 'cats',
    })).toBeFalse();
  });

  it('accepts optional social strategy, delivery timing, and media fields', () => {
    expect(isBlogPost({
      ...createPost(),
      socialPromotion: {
        announcements: [{
          id: 'instagram-launch',
          channel: 'instagram',
          message: 'A launch announcement.',
          scheduledAt: '2026-07-24T12:00:00.000Z',
          deliveryTiming: 'at-publish',
          status: 'scheduled',
          createdAt: '2026-07-11T12:00:00.000Z',
          updatedAt: '2026-07-11T12:00:00.000Z',
          mediaUrl: 'https://colinmichaels.com/social/launch.jpg',
          mediaType: 'image',
          linkPlacement: 'profile',
          contentAngle: 'personal-story',
          postFormat: 'story',
        }],
      },
    })).toBeTrue();
    expect(isBlogPost({
      ...createPost(),
      socialPromotion: {
        announcements: [{
          id: 'threads-launch',
          channel: 'threads',
          message: 'A Threads launch announcement.',
          scheduledAt: '2026-07-24T12:00:00.000Z',
          deliveryTiming: 'scheduled',
          status: 'scheduled',
          createdAt: '2026-07-11T12:00:00.000Z',
          updatedAt: '2026-07-11T12:00:00.000Z',
        }],
      },
    })).toBeTrue();
  });

  it('accepts a boolean companion-video marker and rejects an untyped marker', () => {
    const companionBlock = {
      id: 'youtube-companion',
      type: 'embed' as const,
      data: {
        provider: 'youtube',
        url: 'https://www.youtube.com/watch?v=L229QDxDakU',
        embedUrl: 'https://www.youtube.com/embed/L229QDxDakU',
        isCompanionVideo: true,
        videoTitle: 'Field flight',
        videoDescription: 'The exact public companion video.',
        videoUploadDate: '2026-08-13T13:43:21Z',
        videoDurationSeconds: 158.4,
      },
    };

    expect(isBlogPost({...createPost(), blocks: [companionBlock]})).toBeTrue();
    expect(isBlogPost({
      ...createPost(),
      blocks: [{
        ...companionBlock,
        data: {...companionBlock.data, isCompanionVideo: 'yes'},
      }],
    })).toBeFalse();
    expect(isBlogPost({
      ...createPost(),
      blocks: [{
        ...companionBlock,
        data: {...companionBlock.data, videoUploadDate: '2026-08-13T13:43:21'},
      }],
    })).toBeFalse();
    expect(isBlogPost({
      ...createPost(),
      blocks: [{
        ...companionBlock,
        data: {...companionBlock.data, videoDurationSeconds: 0},
      }],
    })).toBeFalse();
    expect(isBlogPost({
      ...createPost(),
      blocks: [{
        ...companionBlock,
        data: {...companionBlock.data, isCompanionVideo: false},
      }],
    })).toBeFalse();
  });

  it('accepts unscheduled drafts, unscheduled cancellations, and the canonical X channel', () => {
    expect(isBlogPost({
      ...createPost(),
      socialPromotion: {
        announcements: [{
          id: 'x-draft',
          channel: 'x',
          message: 'A draft X thread.',
          status: 'draft',
          createdAt: '2026-07-11T12:00:00.000Z',
          updatedAt: '2026-07-11T12:00:00.000Z',
          postFormat: 'thread',
        }],
      },
    })).toBeTrue();
    expect(isBlogPost({
      ...createPost(),
      socialPromotion: {
        announcements: [{
          id: 'cancelled-draft',
          channel: 'facebook',
          message: 'A cancelled plan with no delivery time.',
          status: 'cancelled',
          createdAt: '2026-07-11T12:00:00.000Z',
          updatedAt: '2026-07-11T12:00:00.000Z',
        }],
      },
    })).toBeTrue();
  });

  it('requires a valid delivery time for scheduled delivery states', () => {
    const announcement = {
      id: 'facebook-launch',
      channel: 'facebook',
      message: 'A launch announcement.',
      status: 'scheduled',
      createdAt: '2026-07-11T12:00:00.000Z',
      updatedAt: '2026-07-11T12:00:00.000Z',
    };

    expect(isBlogPost({
      ...createPost(),
      socialPromotion: {announcements: [announcement]},
    })).toBeFalse();
    expect(isBlogPost({
      ...createPost(),
      socialPromotion: {announcements: [{...announcement, scheduledAt: 'not-a-date'}]},
    })).toBeFalse();
    expect(isBlogPost({
      ...createPost(),
      socialPromotion: {announcements: [{...announcement, status: 'draft', scheduledAt: 'not-a-date'}]},
    })).toBeFalse();
  });

  it('rejects malformed social strategy, delivery timing, and media fields', () => {
    const announcement = {
      id: 'instagram-launch',
      channel: 'instagram',
      message: 'A launch announcement.',
      scheduledAt: '2026-07-24T12:00:00.000Z',
      status: 'scheduled',
      createdAt: '2026-07-11T12:00:00.000Z',
      updatedAt: '2026-07-11T12:00:00.000Z',
    };

    expect(isBlogPost({
      ...createPost(),
      socialPromotion: {announcements: [{...announcement, deliveryTiming: 'whenever'}]},
    })).toBeFalse();
    expect(isBlogPost({
      ...createPost(),
      socialPromotion: {announcements: [{...announcement, mediaUrl: 42}]},
    })).toBeFalse();
    expect(isBlogPost({
      ...createPost(),
      socialPromotion: {announcements: [{...announcement, mediaType: 'audio'}]},
    })).toBeFalse();
    expect(isBlogPost({
      ...createPost(),
      socialPromotion: {announcements: [{...announcement, mediaType: 'image'}]},
    })).toBeFalse();
    expect(isBlogPost({
      ...createPost(),
      socialPromotion: {announcements: [{...announcement, linkPlacement: 'algorithm'}]},
    })).toBeFalse();
    expect(isBlogPost({
      ...createPost(),
      socialPromotion: {announcements: [{...announcement, contentAngle: 'viral'}]},
    })).toBeFalse();
    expect(isBlogPost({
      ...createPost(),
      socialPromotion: {announcements: [{...announcement, postFormat: 'livestream'}]},
    })).toBeFalse();
    expect(isBlogPost({
      ...createPost(),
      socialPromotion: {announcements: [{...announcement, postFormat: 'thread'}]},
    })).toBeFalse();
  });

  it('hydrates bounded gallery blocks and enforces every nested image URL', () => {
    const gallery = {
      id: 'gallery-1',
      type: 'gallery' as const,
      data: {
        title: 'Session gallery',
        galleryLayout: 'grid' as const,
        galleryImages: [
          {url: '/assets/images/backgrounds/day.webp', alt: 'Day session', width: 1600, height: 900},
          {url: 'https://images.example.com/night.webp', alt: 'Night session', caption: 'After dark'},
        ],
      },
    };
    const post = {...createPost(), blocks: [gallery]};

    expect(isBlogPost(post)).toBeTrue();
    expect(hasTrustedBlogPostUrls(post)).toBeTrue();
    expect(hasTrustedBlogPostUrls({
      ...post,
      blocks: [{
        ...gallery,
        data: {
          ...gallery.data,
          galleryImages: [gallery.data.galleryImages[0], {url: 'javascript:alert(1)', alt: 'Unsafe'}],
        },
      }],
    })).toBeFalse();
  });
});
