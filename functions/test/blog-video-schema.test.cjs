const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createBlogCompanionVideoJsonLd,
  createIsoVideoDuration,
} = require('../lib/blog-video-schema.js');

test('builds a complete VideoObject from the exact selected YouTube companion', () => {
  const video = createBlogCompanionVideoJsonLd([{
    type: 'embed',
    data: {
      provider: 'youtube',
      url: 'https://youtu.be/L229QDxDakU',
      isCompanionVideo: true,
      videoTitle: '  Field flight  ',
      videoDescription: '  The exact public companion video.  ',
      videoUploadDate: '2026-08-13T13:43:21Z',
      videoDurationSeconds: 158.4,
    },
  }]);

  assert.deepEqual(video, {
    '@type': 'VideoObject',
    name: 'Field flight',
    description: 'The exact public companion video.',
    thumbnailUrl: ['https://i.ytimg.com/vi/L229QDxDakU/hqdefault.jpg'],
    uploadDate: '2026-08-13T13:43:21Z',
    embedUrl: 'https://www.youtube.com/embed/L229QDxDakU',
    url: 'https://www.youtube.com/watch?v=L229QDxDakU',
    duration: 'PT2M38S',
  });
  assert.equal(Object.hasOwn(video, 'contentUrl'), false);
});

test('keeps incomplete legacy companions schema-free instead of inventing metadata', () => {
  assert.equal(createBlogCompanionVideoJsonLd([{
    type: 'embed',
    data: {
      provider: 'youtube',
      url: 'https://youtu.be/L229QDxDakU',
      isCompanionVideo: true,
      videoTitle: 'Field flight',
    },
  }]), null);
});

test('rejects lookalike hosts and timezone-free timestamps', () => {
  assert.equal(createBlogCompanionVideoJsonLd([{
    type: 'embed',
    data: {
      provider: 'youtube',
      url: 'https://youtube.com.example.com/watch?v=L229QDxDakU',
      isCompanionVideo: true,
      videoTitle: 'Field flight',
      videoDescription: 'Description',
      videoUploadDate: '2026-08-13T13:43:21',
    },
  }]), null);
});

test('converts positive runtimes to ISO 8601 duration', () => {
  assert.equal(createIsoVideoDuration(3723), 'PT1H2M3S');
  assert.equal(createIsoVideoDuration(3600), 'PT1H');
  assert.equal(createIsoVideoDuration(0), null);
});
