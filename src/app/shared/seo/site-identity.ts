import {SeoStructuredDataObject} from './seo.model';
import {COLIN_MUSIC_CREDITS, COLIN_MUSIC_CREDIT_COUNT, MusicCredit} from '../author/music-credits.data';

export const SITE_URL = 'https://colinmichaels.com';
export const SITE_NAME = 'ColinMichaels.com';
export const DEFAULT_LOCALE = 'en_US';
export const PERSON_NAME = 'Colin Michaels';
export const PERSON_JOB_TITLE = 'Applications Developer';
export const PERSON_PROFILE_DESCRIPTION = 'Florida creator, applications developer, recording and mixing engineer, FPV pilot, and writer exploring unusual gadgets, useful technology, creative projects, and patient-perspective recovery.';
export const HOMEPAGE_OG_IMAGE = '/assets/social/colin-michaels-og.jpg';
export const HOMEPAGE_TITLE = `Cool Gadgets, Useful Tech & Internet Finds | ${PERSON_NAME}`;
export const HOMEPAGE_DESCRIPTION = `Discover unusual gadgets, useful tech, practical AI, FPV drone videos, and internet finds with ${PERSON_NAME}—plus honest recovery stories and creator projects.`;
export const HOMEPAGE_IMAGE_ALT = `${PERSON_NAME} personal site preview card`;
export type YouTubeChannelKey = 'colin-michaels' | 'captain-colin';

export interface YouTubeChannelIdentity {
  readonly key: YouTubeChannelKey;
  readonly name: string;
  readonly id: string;
  readonly url: string;
  readonly subscribeUrl: string;
}

function createYouTubeChannel(
  key: YouTubeChannelKey,
  name: string,
  id: string,
): YouTubeChannelIdentity {
  const url = `https://www.youtube.com/channel/${id}`;

  return {key, name, id, url, subscribeUrl: `${url}?sub_confirmation=1`};
}

export const COLIN_MICHAELS_YOUTUBE_CHANNEL = createYouTubeChannel(
  'colin-michaels',
  'Colin Michaels',
  'UCCJMwxuUIb6S4aoZiZeAVeQ',
);
export const CAPTAIN_COLIN_YOUTUBE_CHANNEL = createYouTubeChannel(
  'captain-colin',
  'Captain Colin',
  'UCKZ3E88t-BoUqPgZygJw6bA',
);
export const PRIMARY_YOUTUBE_CHANNEL_KEY = COLIN_MICHAELS_YOUTUBE_CHANNEL.key;
export const YOUTUBE_CHANNELS = {
  'colin-michaels': COLIN_MICHAELS_YOUTUBE_CHANNEL,
  'captain-colin': CAPTAIN_COLIN_YOUTUBE_CHANNEL,
} as const satisfies Readonly<Record<YouTubeChannelKey, YouTubeChannelIdentity>>;

export function getYouTubeChannelIdentity(
  key: YouTubeChannelKey = PRIMARY_YOUTUBE_CHANNEL_KEY,
): YouTubeChannelIdentity {
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
  musicCredits: `${SITE_URL}/#music-credits`,
  calle13Album: `${SITE_URL}/#calle-13-2005-album`,
} as const;

export const LATIN_GRAMMY_2006_BEST_URBAN_MUSIC_ALBUM_URL =
  'https://www.latingrammy.com/en/awards/categories/best-urban-music-album/2006/';

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
  'Recording engineering, mixing, album production, and music production workflows',
  'Consumer gadgets, unusual internet finds, and hands-on product reviews',
  'FPV drone flying, aerial video, and Florida locations',
  'Practical technology and creator workflows',
  'AI-assisted creative and technical workflows',
  'Angular and Firebase application architecture',
  'CMS publishing workflows and SEO implementation',
  'Interactive browser labs and reusable OS-style UI systems',
  'Open-heart surgery recovery from a patient perspective',
] as const;

// Complements the broader developer job title with the music role documented
// in the homepage biography and official Latin GRAMMY recognition.
export const PERSON_OCCUPATIONS = [
  {
    '@type': 'Occupation',
    name: 'Recording and mixing engineer',
    skills: 'Recording engineering, audio mixing, and album production',
  },
] as const;

// Kept as plain text because Schema.org's Person.award expects a text value.
// The visible homepage award section links to the Latin Recording Academy source.
export const PERSON_AWARDS = [
  '2006 Latin GRAMMY Award — Best Urban Music Album for Calle 13 (mixing engineer)',
] as const;

function createMusicAlbumStructuredData(credit: MusicCredit): SeoStructuredDataObject {
  return {
    '@type': 'MusicAlbum',
    name: credit.album,
    ...(credit.artist ? {
      byArtist: {
        '@type': 'MusicGroup',
        name: credit.artist,
      },
    } : {}),
    ...(credit.year ? {datePublished: credit.year} : {}),
    contributor: {
      '@id': SEO_ENTITY_IDS.person,
    },
    creditText: `${PERSON_NAME} — ${credit.credit}`,
  };
}

// This list mirrors the visible credit list. It exposes the precise work and
// role for general crawlers without treating music-service search pages as
// canonical release URLs.
export const MUSIC_CREDITS_ITEM_LIST: SeoStructuredDataObject = {
  '@type': 'ItemList',
  '@id': SEO_ENTITY_IDS.musicCredits,
  name: `${PERSON_NAME} studio credits`,
  description: `${COLIN_MUSIC_CREDIT_COUNT} album credits for ${PERSON_NAME}'s recording, mixing, engineering, production, and arrangement work.`,
  numberOfItems: COLIN_MUSIC_CREDIT_COUNT,
  itemListOrder: 'https://schema.org/ItemListOrderDescending',
  itemListElement: COLIN_MUSIC_CREDITS.map((credit, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: credit.album === 'Calle 13' && credit.artist === 'Calle 13' && credit.year === '2005'
      ? {'@id': SEO_ENTITY_IDS.calle13Album}
      : createMusicAlbumStructuredData(credit),
  })),
};

export const CALLE_13_AWARD_ALBUM: SeoStructuredDataObject = {
  '@type': 'MusicAlbum',
  '@id': SEO_ENTITY_IDS.calle13Album,
  name: 'Calle 13',
  byArtist: {
    '@type': 'MusicGroup',
    name: 'Calle 13',
  },
  datePublished: '2005',
  contributor: {
    '@id': SEO_ENTITY_IDS.person,
  },
  creditText: 'Colin Michaels — Mixing Engineer',
  award: '2006 Latin GRAMMY Award — Best Urban Music Album',
  subjectOf: {
    '@type': 'WebPage',
    name: '7th Annual Latin GRAMMY Awards — Best Urban Music Album',
    url: LATIN_GRAMMY_2006_BEST_URBAN_MUSIC_ALBUM_URL,
  },
};

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
      award: PERSON_AWARDS,
      hasOccupation: PERSON_OCCUPATIONS,
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
      mentions: [
        {'@id': SEO_ENTITY_IDS.musicCredits},
        {'@id': SEO_ENTITY_IDS.calle13Album},
      ],
    },
    CALLE_13_AWARD_ALBUM,
    MUSIC_CREDITS_ITEM_LIST,
  ],
};

export function createSiteTitle(title: string): string {
  return `${title} | ${SITE_NAME}`;
}

export function createPreviewImageAlt(subject: string): string {
  return `${PERSON_NAME} ${subject} preview card`;
}
