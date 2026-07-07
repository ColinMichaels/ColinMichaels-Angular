import {SeoMetadata} from './seo.model';
import {
  BACKGROUND_LAB_DESCRIPTION,
  BLOG_FEED_DESCRIPTION,
  BLOG_SEARCH_DESCRIPTION,
  HOME_JSON_LD,
  HOMEPAGE_DESCRIPTION,
  HOMEPAGE_IMAGE_ALT,
  HOMEPAGE_OG_IMAGE,
  HOMEPAGE_TITLE,
  LABS_DESCRIPTION,
  PERSON_NAME,
  SITE_NAME,
  SITE_SEARCH_DESCRIPTION,
  createPreviewImageAlt,
  createSiteTitle,
} from './site-identity';

export {
  BACKGROUND_LAB_DESCRIPTION,
  BLOG_FEED_DESCRIPTION,
  BLOG_SEARCH_DESCRIPTION,
  DEFAULT_LOCALE,
  HOME_JSON_LD,
  HOMEPAGE_DESCRIPTION,
  HOMEPAGE_IMAGE_ALT,
  HOMEPAGE_OG_IMAGE,
  HOMEPAGE_TITLE,
  PERSON_JOB_TITLE,
  PERSON_KNOWS_ABOUT,
  PERSON_NAME,
  PERSON_PROFILE_DESCRIPTION,
  PERSON_SAME_AS,
  SEO_ENTITY_IDS,
  SITE_ALTERNATE_NAMES,
  SITE_NAME,
  SITE_SEARCH_DESCRIPTION,
  SITE_URL,
  createPreviewImageAlt,
  createSiteTitle,
} from './site-identity';

export const TAXONOMY_INDEX_MIN_POSTS = 2;
export const TAG_INDEX_MIN_POSTS = 3;

export const HOME_SEO_METADATA: SeoMetadata = {
  title: HOMEPAGE_TITLE,
  description: HOMEPAGE_DESCRIPTION,
  path: '/',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: HOMEPAGE_IMAGE_ALT,
  type: 'website',
  structuredData: HOME_JSON_LD,
};

export const BLOG_INDEX_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Blog'),
  description: BLOG_FEED_DESCRIPTION,
  path: '/blog',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('blog'),
  type: 'website',
};

export const BLOG_SEARCH_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Search Blog'),
  description: BLOG_SEARCH_DESCRIPTION,
  path: '/blog/search',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('blog search'),
  type: 'website',
  robots: 'noindex,follow',
};

export const SITE_SEARCH_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Search'),
  description: SITE_SEARCH_DESCRIPTION,
  path: '/search',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('site search'),
  type: 'website',
  robots: 'noindex,follow',
};

export const PROJECTS_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Projects & Labs'),
  description: LABS_DESCRIPTION,
  path: '/labs',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('projects and labs'),
  type: 'website',
};

export const BACKGROUND_LAB_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Full Screen Background Lab'),
  description: BACKGROUND_LAB_DESCRIPTION,
  path: '/background',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('visual background lab'),
  type: 'website',
};

export const MEDIA_LIBRARY_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('CMS Media Library'),
  description: 'Protected CMS media management for Firebase-backed blog assets.',
  path: '/admin/cms/media-library',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('CMS media library'),
  type: 'website',
  robots: 'noindex,nofollow',
};

export const USER_MANAGEMENT_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('User Management'),
  description: 'Protected admin user role and permission management.',
  path: '/admin/users',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('admin user management'),
  type: 'website',
  robots: 'noindex,nofollow',
};

export const COMMENT_MODERATION_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Comment Moderation'),
  description: 'Protected admin blog comment moderation.',
  path: '/admin/comments',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('admin comment moderation'),
  type: 'website',
  robots: 'noindex,nofollow',
};

export const LOGOUT_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Sign Out'),
  description: `End the current ${SITE_NAME} authenticated session.`,
  path: '/logout',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('sign out page'),
  type: 'website',
  robots: 'noindex,nofollow',
};

export const LOGIN_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Login'),
  description: `Sign in to ${SITE_NAME} to manage your profile, comments, and reader points.`,
  path: '/login',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('login page'),
  type: 'website',
  robots: 'noindex,nofollow',
};

export const PROFILE_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Profile'),
  description: 'Signed-in user account profile, roles, and permissions.',
  path: '/profile',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('profile page'),
  type: 'website',
  robots: 'noindex,nofollow',
};

export function createBlogCategorySeoMetadata(category: string, postCount = TAXONOMY_INDEX_MIN_POSTS): SeoMetadata {
  const categoryTitle = category.trim() || 'Blog Category';

  return {
    title: createSiteTitle(`${categoryTitle} Posts`),
    description: `Published ${PERSON_NAME} blog posts in the ${categoryTitle} category.`,
    path: `/blog/category/${createSeoSlug(categoryTitle)}`,
    image: HOMEPAGE_OG_IMAGE,
    imageAlt: `${categoryTitle} blog category preview card`,
    type: 'website',
    robots: postCount >= TAXONOMY_INDEX_MIN_POSTS ? undefined : 'noindex,follow',
  };
}

export function createBlogTagSeoMetadata(tag: string, postCount = TAG_INDEX_MIN_POSTS): SeoMetadata {
  const tagTitle = tag.trim() || 'Blog Tag';

  return {
    title: createSiteTitle(`${tagTitle} Articles`),
    description: `Published ${PERSON_NAME} blog posts tagged ${tagTitle}.`,
    path: `/blog/tag/${createSeoSlug(tagTitle)}`,
    image: HOMEPAGE_OG_IMAGE,
    imageAlt: `${tagTitle} blog tag preview card`,
    type: 'website',
    robots: postCount >= TAG_INDEX_MIN_POSTS ? undefined : 'noindex,follow',
  };
}

export function createMissingBlogPostSeoMetadata(slug: string): SeoMetadata {
  return {
    title: createSiteTitle('Post not found'),
    description: 'This post is unavailable or has not been published.',
    path: `/blog/${createSeoSlug(slug)}`,
    image: HOMEPAGE_OG_IMAGE,
    imageAlt: createPreviewImageAlt('blog'),
    type: 'website',
    robots: 'noindex,nofollow',
  };
}

function createSeoSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
}
