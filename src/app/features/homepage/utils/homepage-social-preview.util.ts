import {BlogPostSummary} from '../../blog/models/blog-post.model';
import {HOMEPAGE_OG_IMAGE} from '../../../shared/seo/seo.metadata';
import {DEFAULT_HOMEPAGE_HERO_SETTINGS} from '../homepage-hero.defaults';
import {HomepageHeroSettings} from '../models/homepage-hero.model';
import {selectHomepageHeroPost} from './homepage-post-selection.util';

export const HOMEPAGE_SOCIAL_IMAGE_TEMPLATE_VERSION = 'home-social-v1';

export interface HomepageSocialPreviewSelection {
  image: string;
  imageAlt: string;
  imageHeight?: number;
  imageWidth?: number;
  post: BlogPostSummary | null;
  versionSeed: string;
}

export function selectHomepageSocialPost(
  posts: readonly BlogPostSummary[],
  settings: HomepageHeroSettings
): BlogPostSummary | null {
  // Draft CMS selections remain private; public metadata follows the default policy until settings publish.
  const publicSettings = settings.status === 'published' ? settings : DEFAULT_HOMEPAGE_HERO_SETTINGS;

  return selectHomepageHeroPost(posts, publicSettings);
}

export function createHomepageSocialPreviewSelection(
  posts: readonly BlogPostSummary[],
  settings: HomepageHeroSettings
): HomepageSocialPreviewSelection {
  const post = selectHomepageSocialPost(posts, settings);

  if (!post) {
    return {
      image: HOMEPAGE_OG_IMAGE,
      imageAlt: 'Colin Michaels personal site preview card',
      post: null,
      versionSeed: `${HOMEPAGE_SOCIAL_IMAGE_TEMPLATE_VERSION}:brand`,
    };
  }

  const image = post.seo?.openGraphImage?.trim()
    || post.og?.image?.trim()
    || post.coverImage.trim()
    || HOMEPAGE_OG_IMAGE;

  return {
    image,
    imageAlt: post.og?.imageAlt?.trim() || `${post.title} featured on ColinMichaels.com`,
    imageWidth: post.seo?.openGraphImageWidth ?? post.og?.imageWidth,
    imageHeight: post.seo?.openGraphImageHeight ?? post.og?.imageHeight,
    post,
    versionSeed: [
      HOMEPAGE_SOCIAL_IMAGE_TEMPLATE_VERSION,
      post.id,
      post.updatedAt,
      image,
    ].join(':'),
  };
}

export function appendSocialImageVersion(imageUrl: string, versionSeed: string): string {
  const trimmedImageUrl = imageUrl.trim();
  if (!trimmedImageUrl) {
    return trimmedImageUrl;
  }

  const fragmentIndex = trimmedImageUrl.indexOf('#');
  const base = fragmentIndex >= 0 ? trimmedImageUrl.slice(0, fragmentIndex) : trimmedImageUrl;
  const fragment = fragmentIndex >= 0 ? trimmedImageUrl.slice(fragmentIndex) : '';
  const separator = base.includes('?') ? '&' : '?';

  return `${base}${separator}ogv=${createStableSocialVersion(versionSeed)}${fragment}`;
}

export function createStableSocialVersion(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36).padStart(7, '0');
}
