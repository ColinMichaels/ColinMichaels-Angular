import {SeoMetadata, SeoStructuredDataObject} from './seo.model';

export const SITE_URL = 'https://colinmichaels.com';
export const SITE_NAME = 'ColinMichaels.com';
export const DEFAULT_LOCALE = 'en_US';
export const HOMEPAGE_OG_IMAGE = '/assets/social/colin-michaels-og.jpg';
export const HOMEPAGE_TITLE = 'Colin Michaels | Projects, Writing, Media & Recovery Updates';
export const HOMEPAGE_DESCRIPTION = 'Personal site of Colin Michaels, an applications developer, FPV drone pilot, creative technologist, and Florida writer sharing projects, media, and recovery notes.';
export const TAXONOMY_INDEX_MIN_POSTS = 2;
export const TAG_INDEX_MIN_POSTS = 3;

const personId = `${SITE_URL}/#person`;
const websiteId = `${SITE_URL}/#website`;
const homepageId = `${SITE_URL}/#homepage`;

export const HOME_JSON_LD: SeoStructuredDataObject = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': personId,
      name: 'Colin Michaels',
      url: SITE_URL,
      jobTitle: 'Applications Developer',
      image: `${SITE_URL}${HOMEPAGE_OG_IMAGE}`,
      description: 'Applications developer, FPV drone pilot, creative technologist, and recovering overthinker based in Florida.',
      sameAs: [
        'https://github.com/ColinMichaels',
        'https://www.linkedin.com/in/colinmichaels',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: SITE_URL,
      name: SITE_NAME,
      description: HOMEPAGE_DESCRIPTION,
      publisher: {
        '@id': personId,
      },
    },
    {
      '@type': ['ProfilePage', 'WebPage'],
      '@id': homepageId,
      url: SITE_URL,
      name: HOMEPAGE_TITLE,
      description: HOMEPAGE_DESCRIPTION,
      isPartOf: {
        '@id': websiteId,
      },
      mainEntity: {
        '@id': personId,
      },
      about: {
        '@id': personId,
      },
    },
  ],
};

export const HOME_SEO_METADATA: SeoMetadata = {
  title: HOMEPAGE_TITLE,
  description: HOMEPAGE_DESCRIPTION,
  path: '/',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: 'Colin Michaels personal site preview card',
  type: 'website',
  structuredData: HOME_JSON_LD,
};

export const BLOG_INDEX_SEO_METADATA: SeoMetadata = {
  title: 'Blog | ColinMichaels.com',
  description: 'Notes on frontend engineering, Angular architecture, Firebase, CMS workflows, and web systems.',
  path: '/blog',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: 'Colin Michaels blog preview card',
  type: 'website',
};

export const BLOG_SEARCH_SEO_METADATA: SeoMetadata = {
  title: 'Search Blog | ColinMichaels.com',
  description: 'Search Colin Michaels blog posts by title, excerpt, category, tag, and article body text.',
  path: '/blog/search',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: 'Colin Michaels blog search preview card',
  type: 'website',
  robots: 'noindex,follow',
};

export const SITE_SEARCH_SEO_METADATA: SeoMetadata = {
  title: 'Search | ColinMichaels.com',
  description: 'Search Colin Michaels blog posts, categories, tags, article body text, and public site pages.',
  path: '/search',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: 'Colin Michaels site search preview card',
  type: 'website',
  robots: 'noindex,follow',
};

export const PROJECTS_SEO_METADATA: SeoMetadata = {
  title: 'Projects & Labs | ColinMichaels.com',
  description: 'Interactive demos, frontend experiments, reusable OS-style interface systems, and public project notes from Colin Michaels.',
  path: '/labs',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: 'Colin Michaels projects and labs preview card',
  type: 'website',
};

export const BACKGROUND_LAB_SEO_METADATA: SeoMetadata = {
  title: 'Full Screen Background Lab | ColinMichaels.com',
  description: 'A visual lab for image, video, overlay, and parallax background experiments.',
  path: '/background',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: 'Colin Michaels visual background lab preview card',
  type: 'website',
};

export const MEDIA_LIBRARY_SEO_METADATA: SeoMetadata = {
  title: 'CMS Media Library | ColinMichaels.com',
  description: 'Protected CMS media management for Firebase-backed blog assets.',
  path: '/admin/cms/media-library',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: 'Colin Michaels CMS media library preview card',
  type: 'website',
  robots: 'noindex,nofollow',
};

export const USER_MANAGEMENT_SEO_METADATA: SeoMetadata = {
  title: 'User Management | ColinMichaels.com',
  description: 'Protected admin user role and permission management.',
  path: '/admin/users',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: 'Colin Michaels admin user management preview card',
  type: 'website',
  robots: 'noindex,nofollow',
};

export const LOGOUT_SEO_METADATA: SeoMetadata = {
  title: 'Sign Out | ColinMichaels.com',
  description: 'End the current ColinMichaels.com authenticated session.',
  path: '/logout',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: 'Colin Michaels sign out page preview card',
  type: 'website',
  robots: 'noindex,nofollow',
};

export const PROFILE_SEO_METADATA: SeoMetadata = {
  title: 'Profile | ColinMichaels.com',
  description: 'Signed-in user account profile, roles, and permissions.',
  path: '/profile',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: 'Colin Michaels profile page preview card',
  type: 'website',
  robots: 'noindex,nofollow',
};

export function createBlogCategorySeoMetadata(category: string, postCount = TAXONOMY_INDEX_MIN_POSTS): SeoMetadata {
  const categoryTitle = category.trim() || 'Blog Category';

  return {
    title: `${categoryTitle} Posts | ColinMichaels.com`,
    description: `Published Colin Michaels blog posts in the ${categoryTitle} category.`,
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
    title: `${tagTitle} Articles | ColinMichaels.com`,
    description: `Published Colin Michaels blog posts tagged ${tagTitle}.`,
    path: `/blog/tag/${createSeoSlug(tagTitle)}`,
    image: HOMEPAGE_OG_IMAGE,
    imageAlt: `${tagTitle} blog tag preview card`,
    type: 'website',
    robots: postCount >= TAG_INDEX_MIN_POSTS ? undefined : 'noindex,follow',
  };
}

export function createMissingBlogPostSeoMetadata(slug: string): SeoMetadata {
  return {
    title: 'Post not found | ColinMichaels.com',
    description: 'This post is unavailable or has not been published.',
    path: `/blog/${createSeoSlug(slug)}`,
    image: HOMEPAGE_OG_IMAGE,
    imageAlt: 'Colin Michaels blog preview card',
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
