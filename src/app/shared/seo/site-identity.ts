import {SeoStructuredDataObject} from './seo.model';

export const SITE_URL = 'https://colinmichaels.com';
export const SITE_NAME = 'ColinMichaels.com';
export const DEFAULT_LOCALE = 'en_US';
export const PERSON_NAME = 'Colin Michaels';
export const PERSON_JOB_TITLE = 'Applications Developer';
export const PERSON_PROFILE_DESCRIPTION = 'Florida creator, applications developer, FPV pilot, and writer exploring unusual gadgets, useful technology, creative projects, and patient-perspective recovery.';
export const HOMEPAGE_OG_IMAGE = '/assets/social/colin-michaels-og.jpg';
export const HOMEPAGE_TITLE = `Cool Gadgets, Useful Tech & Internet Finds | ${PERSON_NAME}`;
export const HOMEPAGE_DESCRIPTION = `Discover unusual gadgets, useful tech, practical AI, FPV drone videos, and internet finds with ${PERSON_NAME}—plus honest recovery stories and creator projects.`;
export const HOMEPAGE_IMAGE_ALT = `${PERSON_NAME} personal site preview card`;
export const YOUTUBE_CHANNEL_ID = 'UCKZ3E88t-BoUqPgZygJw6bA';
export const YOUTUBE_CHANNEL_URL = `https://www.youtube.com/channel/${YOUTUBE_CHANNEL_ID}`;
export const YOUTUBE_SUBSCRIBE_URL = `${YOUTUBE_CHANNEL_URL}?sub_confirmation=1`;
export const CREATOR_PROFILE_URLS = {
  youtube: YOUTUBE_CHANNEL_URL,
  x: 'https://x.com/colinmichaels',
  github: 'https://github.com/ColinMichaels',
  instagram: 'https://www.instagram.com/colinmichaels/',
  linkedin: 'https://www.linkedin.com/in/colinmichaels',
} as const;
export type CreatorProfileId = keyof typeof CREATOR_PROFILE_URLS;
export const BLOG_FEED_DESCRIPTION = `Useful tech, unusual gadgets, internet discoveries, practical AI, FPV stories, and honest first-person notes from ${PERSON_NAME}.`;
export const LABS_DESCRIPTION = `Interactive demos, frontend experiments, reusable OS-style interface systems, and public project notes from ${PERSON_NAME}.`;
export const BACKGROUND_LAB_DESCRIPTION = 'A visual lab for image, video, overlay, and parallax background experiments.';
export const BLOG_SEARCH_DESCRIPTION = `Search ${PERSON_NAME} blog posts by title, excerpt, category, tag, and article body text.`;
export const SITE_SEARCH_DESCRIPTION = `Search ${PERSON_NAME} blog posts, categories, tags, article body text, and public site pages.`;

export const SEO_ENTITY_IDS = {
  person: `${SITE_URL}/#person`,
  website: `${SITE_URL}/#website`,
  homepage: `${SITE_URL}/#homepage`,
} as const;

export const PERSON_SAME_AS = [
  CREATOR_PROFILE_URLS.youtube,
  CREATOR_PROFILE_URLS.instagram,
  CREATOR_PROFILE_URLS.github,
  CREATOR_PROFILE_URLS.linkedin,
] as const;

export const SITE_ALTERNATE_NAMES = [
  PERSON_NAME,
  'colinmichaels.com',
] as const;

export const PERSON_KNOWS_ABOUT = [
  'Consumer gadgets, unusual internet finds, and hands-on product reviews',
  'FPV drone flying, aerial video, and Florida locations',
  'Practical technology and creator workflows',
  'AI-assisted creative and technical workflows',
  'Angular and Firebase application architecture',
  'CMS publishing workflows and SEO implementation',
  'Interactive browser labs and reusable OS-style UI systems',
  'Open-heart surgery recovery from a patient perspective',
] as const;

export const HOME_JSON_LD: SeoStructuredDataObject = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': SEO_ENTITY_IDS.person,
      name: PERSON_NAME,
      url: SITE_URL,
      jobTitle: PERSON_JOB_TITLE,
      image: `${SITE_URL}${HOMEPAGE_OG_IMAGE}`,
      description: PERSON_PROFILE_DESCRIPTION,
      knowsAbout: PERSON_KNOWS_ABOUT,
      sameAs: PERSON_SAME_AS,
    },
    {
      '@type': 'WebSite',
      '@id': SEO_ENTITY_IDS.website,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: SITE_ALTERNATE_NAMES,
      description: HOMEPAGE_DESCRIPTION,
      publisher: {
        '@id': SEO_ENTITY_IDS.person,
      },
    },
    {
      '@type': ['ProfilePage', 'WebPage'],
      '@id': SEO_ENTITY_IDS.homepage,
      url: SITE_URL,
      name: HOMEPAGE_TITLE,
      description: HOMEPAGE_DESCRIPTION,
      isPartOf: {
        '@id': SEO_ENTITY_IDS.website,
      },
      publisher: {
        '@id': SEO_ENTITY_IDS.person,
      },
      mainEntity: {
        '@id': SEO_ENTITY_IDS.person,
      },
      about: {
        '@id': SEO_ENTITY_IDS.person,
      },
    },
  ],
};

export function createSiteTitle(title: string): string {
  return `${title} | ${SITE_NAME}`;
}

export function createPreviewImageAlt(subject: string): string {
  return `${PERSON_NAME} ${subject} preview card`;
}
