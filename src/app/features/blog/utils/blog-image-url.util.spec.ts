import {
  isLocalAssetImageUrl,
  normalizeBlogImageFields,
  resolveBlogPostImage,
} from './blog-image-url.util';

const FIREBASE_COVER_IMAGE =
  'https://firebasestorage.googleapis.com/v0/b/colinmichaels.firebasestorage.app/o/cms%2Fblog-media%2Fcover.webp?alt=media&token=abc';
const FIREBASE_THUMBNAIL_IMAGE =
  'https://firebasestorage.googleapis.com/v0/b/colinmichaels.firebasestorage.app/o/cms%2Fblog-media%2Fthumbnail.webp?alt=media&token=def';

describe('blog-image-url util', () => {
  it('uses a thumbnail when both image fields are local assets', () => {
    expect(resolveBlogPostImage({
      coverImage: '/assets/images/backgrounds/day.webp',
      thumbnailImage: '/assets/images/backgrounds/night.webp',
    })).toBe('/assets/images/backgrounds/night.webp');
  });

  it('uses the Firebase cover image when a legacy local thumbnail would override it', () => {
    expect(resolveBlogPostImage({
      coverImage: FIREBASE_COVER_IMAGE,
      thumbnailImage: '/assets/images/blog/legacy-thumbnail.webp',
    })).toBe(FIREBASE_COVER_IMAGE);
  });

  it('keeps a Firebase thumbnail ahead of a Firebase cover image', () => {
    expect(resolveBlogPostImage({
      coverImage: FIREBASE_COVER_IMAGE,
      thumbnailImage: FIREBASE_THUMBNAIL_IMAGE,
    })).toBe(FIREBASE_THUMBNAIL_IMAGE);
  });

  it('removes stale local thumbnail fields when normalizing remote cover images', () => {
    expect(normalizeBlogImageFields({
      coverImage: FIREBASE_COVER_IMAGE,
      thumbnailImage: '/assets/images/blog/legacy-thumbnail.webp',
    })).toEqual({
      coverImage: FIREBASE_COVER_IMAGE,
    });
  });

  it('detects relative and absolute asset URLs as local assets', () => {
    expect(isLocalAssetImageUrl('/assets/images/backgrounds/day.webp')).toBeTrue();
    expect(isLocalAssetImageUrl('assets/images/backgrounds/day.webp')).toBeTrue();
    expect(isLocalAssetImageUrl('https://colinmichaels.com/assets/images/backgrounds/day.webp')).toBeTrue();
  });
});
