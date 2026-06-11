import {SeoMetadata, SeoStructuredDataObject} from './seo.model';

export const SITE_URL = 'https://colinmichaels.com';
export const SITE_NAME = 'ColinMichaels.com';
export const DEFAULT_LOCALE = 'en_US';
export const HOMEPAGE_OG_IMAGE = '/assets/social/colin-michaels-og.jpg';
export const HOMEPAGE_TITLE = 'Colin Michaels | Projects, Writing, Media & Recovery Updates';
export const HOMEPAGE_DESCRIPTION = 'Personal site of Colin Michaels, featuring software projects, creative experiments, photography, videos, recovery updates, and long-form writing.';

const personId = `${SITE_URL}/#person`;
const websiteId = `${SITE_URL}/#website`;

export const HOME_JSON_LD: SeoStructuredDataObject = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': personId,
      name: 'Colin Michaels',
      url: SITE_URL,
      jobTitle: 'Frontend Engineer',
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

export function createBlogCategorySeoMetadata(category: string): SeoMetadata {
  const categoryTitle = category.trim() || 'Blog Category';

  return {
    title: `${categoryTitle} Posts | ColinMichaels.com`,
    description: `Published Colin Michaels blog posts in the ${categoryTitle} category.`,
    path: `/blog/category/${createSeoSlug(categoryTitle)}`,
    image: HOMEPAGE_OG_IMAGE,
    imageAlt: `${categoryTitle} blog category preview card`,
    type: 'website',
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
