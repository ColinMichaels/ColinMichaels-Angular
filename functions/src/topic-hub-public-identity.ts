export interface PublicTopicHubIdentity {
  slug: string;
  heading: string;
  description: string;
  terms: readonly string[];
}

export const PUBLIC_TOPIC_HUB_IDENTITIES = [
  {
    slug: 'ai-setup',
    heading: 'AI Setup Guides',
    description: 'Practical setup guides for ChatGPT, Claude, Copilot, Gemini, prompting, projects, and AI-assisted workflows.',
    terms: ['ai', 'chatgpt', 'claude', 'copilot', 'gemini', 'prompting', 'ai tools', 'ai workflow', 'productivity'],
  },
  {
    slug: 'recovery-planning',
    heading: 'Recovery & Medical Planning Resources',
    description: 'Personal recovery notes, emergency planning resources, and practical lessons from open-heart surgery recovery.',
    terms: ['recovery', 'health', 'medical', 'heart surgery', 'open heart surgery', 'cardiac', 'insurance', 'planning'],
  },
  {
    slug: 'angular-firebase-architecture',
    heading: 'Angular & Firebase Architecture Notes',
    description: 'Implementation notes on Angular, Firebase, CMS workflows, route SEO, and reusable frontend architecture.',
    terms: ['angular', 'firebase', 'architecture', 'cms', 'editor.js', 'typescript', 'web development'],
  },
  {
    slug: 'labs-projects',
    heading: 'Labs & Project Demos',
    description: 'Interactive demos, browser experiments, UI systems, and public notes from Colin Michaels project labs.',
    terms: ['labs', 'projects', 'game development', 'browser game', 'creative coding', 'music tools', 'web app'],
  },
  {
    slug: 'gadgets-toys',
    heading: 'Gadgets & Toys',
    description: 'Evidence-labeled gadget research, hands-on notes when available, and honest verdicts on useful, strange, and clever technology found online.',
    terms: [
      'gadget',
      'gadgets',
      'toy',
      'toys',
      'tech gear',
      'cool tech',
      'consumer tech',
      'product review',
      'product reviews',
      'electronics',
      'smart home',
      'wearables',
      'gaming hardware',
    ],
  },
  {
    slug: 'drones-fpv',
    heading: 'Drones & FPV',
    description: 'FPV flights, Florida flying locations, practical drone field notes, and honest looks at aerial cameras and new drone ideas.',
    terms: [
      'drone',
      'drones',
      'fpv',
      'fpv drone',
      'aerial video',
      'aerial photography',
      'flying camera',
      'waterproof drone',
      'quadcopter',
      'drone pilot',
      'drone review',
      'drone flight',
    ],
  },
] as const satisfies readonly PublicTopicHubIdentity[];

export type PublicTopicHubSlug = typeof PUBLIC_TOPIC_HUB_IDENTITIES[number]['slug'];

export function getPublicTopicHubIdentity(slug: PublicTopicHubSlug): PublicTopicHubIdentity {
  const identity = PUBLIC_TOPIC_HUB_IDENTITIES.find(topicHub => topicHub.slug === slug);

  if (!identity) {
    throw new Error(`Missing public topic identity for ${slug}.`);
  }

  return identity;
}

export function createPublicTopicSitemapPaths(): readonly string[] {
  return PUBLIC_TOPIC_HUB_IDENTITIES.map(topicHub => `/topics/${topicHub.slug}`);
}
