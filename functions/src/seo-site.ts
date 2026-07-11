export const SITE_URL = 'https://colinmichaels.com';
export const SITE_NAME = 'ColinMichaels.com';
export const DEFAULT_LOCALE = 'en_US';
export const PERSON_NAME = 'Colin Michaels';
export const PERSON_JOB_TITLE = 'Applications Developer';
export const PERSON_PROFILE_DESCRIPTION = 'Florida applications developer, FPV drone pilot, creative technologist, and writer sharing Angular/Firebase work, media projects, and patient-perspective recovery notes.';
export const HOMEPAGE_OG_IMAGE = '/assets/social/colin-michaels-og.jpg';
export const HOMEPAGE_TITLE = `${PERSON_NAME} | Projects, Writing, Media & Recovery Updates`;
export const HOMEPAGE_DESCRIPTION = `${PERSON_NAME} shares a personal portfolio, blog, media work, recovery notes, and Angular/Firebase project labs from a Florida developer's perspective.`;
export const HOMEPAGE_ANSWER_SUMMARY = `${PERSON_NAME} is a Florida-based applications developer, FPV drone pilot, creative technologist, and writer. ${SITE_NAME} is his personal portfolio, blog, media archive, recovery notebook, and project lab. The site collects Angular and Firebase architecture notes, AI workflow guides, gadget and toy discoveries, public demos, media experiments, and patient-perspective recovery writing in one crawlable home base. Start with the blog for essays and implementation notes, visit topic hubs for AI setup, recovery planning, Angular/Firebase architecture, labs projects, and Gadgets & Toys, or open Labs to explore interactive browser experiments and reusable OS-style UI systems. Public content stays separate from admin, Core OS, and experimental code paths.`;
export const BLOG_FEED_DESCRIPTION = 'Notes on frontend engineering, Angular architecture, Firebase, CMS workflows, and web systems.';
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
  'https://github.com/ColinMichaels',
  'https://www.linkedin.com/in/colinmichaels',
] as const;

export const SITE_ALTERNATE_NAMES = [
  PERSON_NAME,
  'colinmichaels.com',
] as const;

export const PERSON_KNOWS_ABOUT = [
  'Angular and Firebase application architecture',
  'CMS publishing workflows and SEO implementation',
  'AI-assisted creative and technical workflows',
  'Consumer gadgets, playful technology, and hands-on product reviews',
  'FPV media production and project demos',
  'Interactive browser labs and reusable OS-style UI systems',
  'Open-heart surgery recovery from a patient perspective',
] as const;

export function createSiteTitle(title: string): string {
  return `${title} | ${SITE_NAME}`;
}

export function createPreviewImageAlt(subject: string): string {
  return `${PERSON_NAME} ${subject} preview card`;
}
