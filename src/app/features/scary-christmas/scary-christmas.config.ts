export type ScaryChristmasPlacement = 'banner' | 'trail' | 'footer';
export type ScaryChristmasVariant = 'amber' | 'violet' | 'mint';

export interface ScaryChristmasCandy {
  readonly id: string;
  readonly name: string;
  readonly clue: string;
  readonly route: string;
  readonly placement: ScaryChristmasPlacement;
  readonly variant: ScaryChristmasVariant;
}

/** Seasonal preview switch. Set enabled to false to retire the experience. */
export const SCARY_CHRISTMAS_CONFIG = Object.freeze({
  enabled: true,
  seasonId: 'scary-christmas-2026',
  musicSrc: '/assets/seasonal/scary-christmas/spooky-remix-new-lyrics.mp3' as string | null,
  musicTitle: 'Spooky · The Dreadnauts',
  musicHref: 'https://dreadnauts.uk/music',
});

export const SCARY_CHRISTMAS_STORAGE_KEY = `cm.${SCARY_CHRISTMAS_CONFIG.seasonId}.v1`;

/** One finite collection, with no account, analytics, or reward-system connection. */
export const SCARY_CHRISTMAS_CANDIES: readonly ScaryChristmasCandy[] = Object.freeze([
  {
    id: 'ember-toffee',
    name: 'Ember toffee',
    clue: 'A warm welcome hides a sweet in the seasonal invitation.',
    route: '/',
    placement: 'banner',
    variant: 'amber',
  },
  {
    id: 'moonlit-mint',
    name: 'Moonlit mint',
    clue: 'Follow the homepage all the way down.',
    route: '/',
    placement: 'footer',
    variant: 'mint',
  },
  {
    id: 'paper-phantom',
    name: 'Paper-wrapped phantom',
    clue: 'A curious reader knows where the stories begin.',
    route: '/blog',
    placement: 'trail',
    variant: 'violet',
  },
  {
    id: 'midnight-caramel',
    name: 'Midnight caramel',
    clue: 'Even the last line leaves a little treat.',
    route: '/blog',
    placement: 'footer',
    variant: 'amber',
  },
  {
    id: 'witchy-wonder',
    name: 'Witchy wonder',
    clue: 'Odd little gadgets sometimes come bearing sweets.',
    route: '/topics/gadgets-toys',
    placement: 'trail',
    variant: 'violet',
  },
  {
    id: 'sky-sour',
    name: 'Sky sour',
    clue: 'Look where the night flyers gather.',
    route: '/topics/drones-fpv',
    placement: 'trail',
    variant: 'mint',
  },
  {
    id: 'neon-nougat',
    name: 'Neon nougat',
    clue: 'Experiments glow brightest after dark.',
    route: '/topics/labs-projects',
    placement: 'trail',
    variant: 'amber',
  },
  {
    id: 'ghostwriter-gum',
    name: 'Ghostwriter gum',
    clue: 'Every good ghost story has a storyteller.',
    route: '/authors',
    placement: 'trail',
    variant: 'violet',
  },
].map(candy => Object.freeze(candy)) as ScaryChristmasCandy[]);

/**
 * Accept only the public route shapes used by this experience. The router and
 * page repositories still decide whether a particular post or topic exists.
 */
export function isScaryChristmasRoute(url: string): boolean {
  const path = scaryChristmasPath(url);

  if (path === '/' || path === '/blog' || path === '/authors') {
    return true;
  }

  if (!path) {
    return false;
  }

  const slug = '[a-z0-9]+(?:-[a-z0-9]+)*';

  if (new RegExp(`^/(?:topics|authors)/${slug}$`).test(path)) {
    return true;
  }

  if (new RegExp(`^/blog/(?:category|tag)/${slug}$`).test(path)) {
    return true;
  }

  return new RegExp(`^/blog/${slug}$`).test(path) && path !== '/blog/preview';
}

export function scaryChristmasPath(url: string): string | null {
  if (!url.startsWith('/') || url.startsWith('//')) {
    return null;
  }

  try {
    const path = decodeURIComponent(url.split(/[?#]/, 1)[0]);

    // Matrix parameters and encoded separators do not expand this public scope.
    if (path.includes(';') || /%2f|%5c/i.test(url.split(/[?#]/, 1)[0]) || path.includes('\\')) {
      return null;
    }

    return path.length > 1 ? path.replace(/\/$/, '') : path;
  } catch {
    return null;
  }
}
