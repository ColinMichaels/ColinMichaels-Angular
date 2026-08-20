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
  SEO_ENTITY_IDS,
  SITE_NAME,
  SITE_SEARCH_DESCRIPTION,
  SITE_URL,
  createPreviewImageAlt,
  createSiteTitle,
} from './site-identity';

export {
  BACKGROUND_LAB_DESCRIPTION,
  BLOG_FEED_DESCRIPTION,
  BLOG_SEARCH_DESCRIPTION,
  CREATOR_PROFILE_URLS,
  DEFAULT_LOCALE,
  HOME_JSON_LD,
  HOMEPAGE_DESCRIPTION,
  HOMEPAGE_IMAGE_ALT,
  HOMEPAGE_OG_IMAGE,
  HOMEPAGE_TITLE,
  PERSON_AWARDS,
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

export const TAXONOMY_INDEX_MIN_POSTS = 3;
export const TAG_INDEX_MIN_POSTS = 5;

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

export const AUTHORS_INDEX_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Authors'),
  description: `Meet the writers sharing articles, projects, and personal perspectives on ${SITE_NAME}.`,
  path: '/authors',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('authors directory'),
  type: 'website',
};

export const PRIVACY_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Privacy Policy'),
  description: `How ${SITE_NAME} handles personal information, protects it from sale, and responds to deletion requests.`,
  path: '/privacy',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('privacy policy'),
  type: 'website',
};

export const EDITORIAL_STANDARDS_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Editorial Standards & Corrections'),
  description: `How ${SITE_NAME} labels hands-on experience, research, sources, synthetic media, relationships, and meaningful corrections.`,
  path: '/editorial-standards',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('editorial standards and corrections'),
  type: 'website',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Editorial Standards & Corrections - ${SITE_NAME}`,
    description: `How ${SITE_NAME} labels hands-on experience, research, sources, synthetic media, relationships, and meaningful corrections.`,
    url: `${SITE_URL}/editorial-standards`,
    isPartOf: {'@id': SEO_ENTITY_IDS.website},
    publisher: {'@id': SEO_ENTITY_IDS.person},
  },
};

export const PERSONAL_AIRCRAFT_BUYER_VERIFICATION_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Personal Aircraft Buyer Verification'),
  description: 'Download a two-page worksheet for checking a personal aircraft offer, deposit terms, legal-category claims, support, and evidence before paying.',
  path: '/resources/personal-aircraft-buyer-verification',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('personal aircraft buyer verification worksheet'),
  type: 'website',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Personal Aircraft Buyer Verification - ${SITE_NAME}`,
    description: 'A printable research worksheet for checking a personal aircraft offer, deposit terms, legal-category claims, operating reality, support, and evidence.',
    url: `${SITE_URL}/resources/personal-aircraft-buyer-verification`,
    isPartOf: {'@id': SEO_ENTITY_IDS.website},
    publisher: {'@id': SEO_ENTITY_IDS.person},
  },
};

export const GADGET_USEFULNESS_SCORECARD_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Gadget Usefulness Scorecard'),
  description: 'Score a gadget on problem fit, evidence, true cost, everyday friction, and support with the printable Is It Actually Useful? worksheet.',
  path: '/resources/gadget-usefulness-scorecard',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('gadget usefulness scorecard'),
  type: 'website',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Gadget Usefulness Scorecard - ${SITE_NAME}`,
    description: 'A printable evidence-led scorecard for evaluating a gadget\'s problem fit, proof, true cost, everyday friction, support, and honest verdict.',
    url: `${SITE_URL}/resources/gadget-usefulness-scorecard`,
    isPartOf: {'@id': SEO_ENTITY_IDS.website},
    publisher: {'@id': SEO_ENTITY_IDS.person},
  },
};

export const CONTACT_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Contact'),
  description: `Contact ${PERSON_NAME} with a question, project note, correction, media request, or privacy request.`,
  path: '/contact',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('contact form'),
  type: 'website',
};

export const WRITE_FOR_US_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Write for Us'),
  description: `Propose an article and submit prospective author-profile details for editorial review on ${SITE_NAME}.`,
  path: '/write-for-us',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('author and post proposal form'),
  type: 'website',
};

export const CAT_CORNER_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Cat Corner'),
  description: 'Dispatches, photographs, and household intelligence from Gretchen, Cat Corner Editor-in-Chief.',
  path: '/cat-corner',
  image: '/assets/images/cat-corner/gretchen-easter-egg.png',
  imageAlt: 'Gretchen, Cat Corner Editor-in-Chief',
  imageWidth: 1086,
  imageHeight: 1448,
  type: 'website',
  robots: 'noindex,nofollow',
};

export const CAT_CORNER_UNLOCK_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('You found Gretchen'),
  description: 'Unlock the Cat Corner Addict badge and enter Gretchen\'s secret section.',
  path: '/cat-corner/unlock',
  image: '/assets/images/cat-corner/gretchen-easter-egg.png',
  imageAlt: 'Gretchen welcomes a new Cat Corner Addict',
  imageWidth: 1086,
  imageHeight: 1448,
  type: 'website',
  robots: 'noindex,nofollow',
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

export const HOMEPAGE_CMS_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('CMS Homepage Feature'),
  description: 'Protected CMS controls for homepage article selection, editorial imagery, and preserved legacy slides.',
  path: '/admin/cms/homepage',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('CMS homepage feature'),
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

export const PUBLIC_SUBMISSIONS_ADMIN_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Submission Inbox'),
  description: 'Protected admin review and response workflow for contact messages and prospective-author proposals.',
  path: '/admin/submissions',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('admin submission inbox'),
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

export const OS_DEVICE_REQUIRED_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Desktop Required'),
  description: `The interactive ${SITE_NAME} OS is available on desktop-capable screens with mouse or trackpad controls.`,
  path: '/os-device-required',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('desktop workspace requirements'),
  type: 'website',
  robots: 'noindex,follow',
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

export const NOT_FOUND_SEO_METADATA: SeoMetadata = {
  title: createSiteTitle('Page not found'),
  description: `This page could not be found on ${SITE_NAME}.`,
  path: '/404',
  image: HOMEPAGE_OG_IMAGE,
  imageAlt: createPreviewImageAlt('page not found'),
  type: 'website',
  robots: 'noindex,follow',
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
