export const SITE_URL = 'https://colinmichaels.com';
export const SITE_NAME = 'ColinMichaels.com';
export const DEFAULT_LOCALE = 'en_US';
export const PERSON_NAME = 'Colin Michaels';
export const PERSON_JOB_TITLE = 'Applications Developer';
export const PERSON_PROFILE_DESCRIPTION = 'Florida creator, applications developer, FPV pilot, and writer exploring unusual gadgets, useful technology, creative projects, and patient-perspective recovery.';
export const HOMEPAGE_OG_IMAGE = '/assets/social/colin-michaels-og.jpg';
export const HOMEPAGE_TITLE = `Cool Gadgets, Useful Tech & Internet Finds | ${PERSON_NAME}`;
export const HOMEPAGE_DESCRIPTION = `Discover unusual gadgets, useful tech, practical AI, FPV drone videos, and internet finds with ${PERSON_NAME}—plus honest recovery stories and creator projects.`;
export const HOMEPAGE_ANSWER_SUMMARY = `${PERSON_NAME} is a Florida creator, applications developer, FPV pilot, and writer. ${SITE_NAME} is his home for unusual gadgets, useful technology, practical AI, FPV drone stories, creative projects, and patient-perspective recovery writing. Start with Gadgets & Toys for owned, tested, wanted, and found-online discoveries; use the blog and topic hubs for practical guides and first-person stories; and watch Captain Colin on YouTube for FPV flights, Florida locations, and creator experiments. Public publishing remains separate from the protected admin, reusable Core OS framework, and preserved experimental systems.`;
export const BLOG_FEED_DESCRIPTION = `Useful tech, unusual gadgets, internet discoveries, practical AI, FPV stories, and honest first-person notes from ${PERSON_NAME}.`;
export const LABS_DESCRIPTION = `Interactive demos, frontend experiments, reusable OS-style interface systems, and public project notes from ${PERSON_NAME}.`;
export const BACKGROUND_LAB_DESCRIPTION = 'A visual lab for image, video, overlay, and parallax background experiments.';
export const BLOG_SEARCH_DESCRIPTION = `Search ${PERSON_NAME} blog posts by title, excerpt, category, tag, and article body text.`;
export const SITE_SEARCH_DESCRIPTION = `Search ${PERSON_NAME} blog posts, categories, tags, article body text, and public site pages.`;
export type YoutubeChannelKey = 'colin-michaels' | 'captain-colin';

export interface YoutubeChannelIdentity {
  readonly key: YoutubeChannelKey;
  readonly name: string;
  readonly id: string;
  readonly url: string;
  readonly subscribeUrl: string;
}

function createYoutubeChannel(
  key: YoutubeChannelKey,
  name: string,
  id: string,
): YoutubeChannelIdentity {
  const url = `https://www.youtube.com/channel/${id}`;

  return {key, name, id, url, subscribeUrl: `${url}?sub_confirmation=1`};
}

export const COLIN_MICHAELS_YOUTUBE_CHANNEL = createYoutubeChannel(
  'colin-michaels',
  'Colin Michaels',
  'UCCJMwxuUIb6S4aoZiZeAVeQ',
);
export const CAPTAIN_COLIN_YOUTUBE_CHANNEL = createYoutubeChannel(
  'captain-colin',
  'Captain Colin',
  'UCKZ3E88t-BoUqPgZygJw6bA',
);
export const PRIMARY_YOUTUBE_CHANNEL_KEY = COLIN_MICHAELS_YOUTUBE_CHANNEL.key;
export const YOUTUBE_CHANNELS = {
  'colin-michaels': COLIN_MICHAELS_YOUTUBE_CHANNEL,
  'captain-colin': CAPTAIN_COLIN_YOUTUBE_CHANNEL,
} as const satisfies Readonly<Record<YoutubeChannelKey, YoutubeChannelIdentity>>;

export function getYoutubeChannelIdentity(
  key: YoutubeChannelKey = PRIMARY_YOUTUBE_CHANNEL_KEY,
): YoutubeChannelIdentity {
  return YOUTUBE_CHANNELS[key];
}

// General ColinMichaels.com creator surfaces use Colin Michaels. Drone and FPV modules opt into Captain Colin.
export const YOUTUBE_CHANNEL_ID = COLIN_MICHAELS_YOUTUBE_CHANNEL.id;
export const YOUTUBE_CHANNEL_URL = COLIN_MICHAELS_YOUTUBE_CHANNEL.url;
export const YOUTUBE_SUBSCRIBE_URL = COLIN_MICHAELS_YOUTUBE_CHANNEL.subscribeUrl;
export const COLIN_MICHAELS_YOUTUBE_CHANNEL_ID = COLIN_MICHAELS_YOUTUBE_CHANNEL.id;
export const COLIN_MICHAELS_YOUTUBE_CHANNEL_URL = COLIN_MICHAELS_YOUTUBE_CHANNEL.url;
export const COLIN_MICHAELS_YOUTUBE_SUBSCRIBE_URL = COLIN_MICHAELS_YOUTUBE_CHANNEL.subscribeUrl;
export const CAPTAIN_COLIN_YOUTUBE_CHANNEL_ID = CAPTAIN_COLIN_YOUTUBE_CHANNEL.id;
export const CAPTAIN_COLIN_YOUTUBE_CHANNEL_URL = CAPTAIN_COLIN_YOUTUBE_CHANNEL.url;
export const CAPTAIN_COLIN_YOUTUBE_SUBSCRIBE_URL = CAPTAIN_COLIN_YOUTUBE_CHANNEL.subscribeUrl;

export const SEO_ENTITY_IDS = {
  person: `${SITE_URL}/#person`,
  website: `${SITE_URL}/#website`,
  homepage: `${SITE_URL}/#homepage`,
} as const;

export const CREATOR_PROFILE_URLS = {
  youtube: YOUTUBE_CHANNEL_URL,
  instagram: 'https://www.instagram.com/colinmichaels/',
  github: 'https://github.com/ColinMichaels',
  linkedin: 'https://www.linkedin.com/in/colinmichaels',
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

export function createSiteTitle(title: string): string {
  return `${title} | ${SITE_NAME}`;
}

export function createPreviewImageAlt(subject: string): string {
  return `${PERSON_NAME} ${subject} preview card`;
}
