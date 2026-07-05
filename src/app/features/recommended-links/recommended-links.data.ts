import {RecommendedLink} from './models/recommended-link.model';

const DEFAULT_TIMESTAMP = '2026-07-05T00:00:00.000Z';

export const DEFAULT_RECOMMENDED_LINKS: readonly RecommendedLink[] = [
  {
    id: 'recommended-link-futuretools',
    title: 'FutureTools.io',
    description: 'A fast way to scan useful AI tools, news, and new software without opening twenty tabs first.',
    meta: 'AI tools',
    href: 'https://futuretools.io/',
    host: 'futuretools.io',
    status: 'published',
    featuredSlot: 1,
    displayOrder: 10,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
  {
    id: 'recommended-link-ilovedrones',
    title: 'iLoveDrones.Shop',
    description: 'Drone parts, frames, props, motors, batteries, and FPV gear from a shop built for people who actually fly.',
    meta: 'FPV gear',
    href: 'https://ilovedrones.shop/',
    host: 'ilovedrones.shop',
    status: 'published',
    featuredSlot: 2,
    displayOrder: 20,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
  {
    id: 'recommended-link-chrome-developers',
    title: 'Chrome for Developers',
    description: 'Official Chrome and web platform guidance for DevTools, performance, browser APIs, and production debugging.',
    meta: 'Web platform',
    href: 'https://developer.chrome.com/',
    host: 'developer.chrome.com',
    status: 'published',
    featuredSlot: 3,
    displayOrder: 30,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
];
