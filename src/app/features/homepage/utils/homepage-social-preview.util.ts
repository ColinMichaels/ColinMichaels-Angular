import {BlogPost} from '../../blog/models/blog-post.model';
import {HOMEPAGE_OG_IMAGE} from '../../../shared/seo/seo.metadata';
import {HomepageHeroSettings} from '../models/homepage-hero.model';

export const HOMEPAGE_SOCIAL_IMAGE_TEMPLATE_VERSION = 'home-social-v1';

export interface HomepageSocialPreviewSelection {
  image: string;
  imageAlt: string;
  imageHeight?: number;
  imageWidth?: number;
  post: BlogPost | null;
  versionSeed: string;
}

export function selectHomepageSocialPost(
  posts: readonly BlogPost[],
  settings: HomepageHeroSettings
): BlogPost | null {
  const newestPosts = [...posts].sort((left, right) => (
    (right.publishedAt ?? right.updatedAt).localeCompare(left.publishedAt ?? left.updatedAt)
    || right.updatedAt.localeCompare(left.updatedAt)
  ));

  if (settings.status !== 'published' || newestPosts.length === 0) {
    return newestPosts[0] ?? null;
  }

  if (settings.featuredPostMode === 'selected' && settings.featuredPostId) {
    const selectedPost = newestPosts.find(post => post.id === settings.featuredPostId);
    if (selectedPost) {
      return selectedPost;
    }
  }

  if (settings.featuredPostMode === 'selected' || settings.featuredPostMode === 'featured') {
    const featuredPost = newestPosts.find(post => post.featured);
    if (featuredPost) {
      return featuredPost;
    }
  }

  return newestPosts[0] ?? null;
}

export function createHomepageSocialPreviewSelection(
  posts: readonly BlogPost[],
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

  const image = post.seo.openGraphImage?.trim()
    || post.og?.image?.trim()
    || post.coverImage.trim()
    || HOMEPAGE_OG_IMAGE;

  return {
    image,
    imageAlt: post.og?.imageAlt?.trim() || `${post.title} featured on ColinMichaels.com`,
    imageWidth: post.seo.openGraphImageWidth ?? post.og?.imageWidth,
    imageHeight: post.seo.openGraphImageHeight ?? post.og?.imageHeight,
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
