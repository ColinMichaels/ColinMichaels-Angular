import {PATH_NAMES} from '../../app-route-paths';
import {HOMEPAGE_OG_IMAGE, SITE_NAME} from '../../shared/seo/seo.metadata';
import {SeoMetadata} from '../../shared/seo/seo.model';

export interface TopicHubResource {
  label: string;
  description: string;
  href: string;
}

export interface TopicHub {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  summary: string;
  terms: readonly string[];
  checklist: readonly string[];
  resources: readonly TopicHubResource[];
}

export const TOPIC_HUBS: readonly TopicHub[] = [
  {
    slug: 'ai-setup',
    eyebrow: 'AI & Tech',
    title: 'AI Setup Guides',
    description: 'Practical setup guides for ChatGPT, Claude, Copilot, Gemini, prompting, projects, and AI-assisted workflows.',
    summary: 'Start here for approachable AI setup notes, model-choice habits, project organization, and prompts that make chat tools more useful in real work.',
    terms: ['ai', 'chatgpt', 'claude', 'copilot', 'gemini', 'prompting', 'ai tools', 'ai workflow', 'productivity'],
    checklist: [
      'Choose the tool and model for the job instead of using the default every time.',
      'Write reusable instructions for your goals, tone, context, and constraints.',
      'Keep projects, files, and examples grouped by workflow.',
      'Ask for verification steps before trusting generated work.',
    ],
    resources: [
      {
        label: 'All Tech Tips',
        description: 'Browse the broader practical technology series.',
        href: `/${PATH_NAMES.BLOG}/category/tech-tips`,
      },
      {
        label: 'AI Workflow Posts',
        description: 'Read posts tagged with AI workflow notes.',
        href: `/${PATH_NAMES.BLOG}/tag/ai-workflow`,
      },
    ],
  },
  {
    slug: 'recovery-planning',
    eyebrow: 'Health & Recovery',
    title: 'Recovery & Medical Planning Resources',
    description: 'Personal recovery notes, emergency planning resources, and practical lessons from open-heart surgery recovery.',
    summary: 'These posts are patient-perspective notes from recovery and planning work. They are meant to help readers ask better questions and get organized, not replace professional care.',
    terms: ['recovery', 'health', 'medical', 'heart surgery', 'open heart surgery', 'cardiac', 'insurance', 'planning'],
    checklist: [
      'Keep emergency contacts, medication lists, and insurance details easy to find.',
      'Write down questions before appointments and bring someone who can take notes.',
      'Track symptoms, activity limits, and recovery milestones in one place.',
      'Confirm medical, legal, and insurance choices with qualified professionals.',
    ],
    resources: [
      {
        label: 'Recovery Posts',
        description: 'Browse posts tagged with recovery notes.',
        href: `/${PATH_NAMES.BLOG}/tag/recovery`,
      },
      {
        label: 'Open Heart Surgery Posts',
        description: 'Read posts connected to open-heart surgery recovery.',
        href: `/${PATH_NAMES.BLOG}/tag/open-heart-surgery`,
      },
    ],
  },
  {
    slug: 'angular-firebase-architecture',
    eyebrow: 'Architecture',
    title: 'Angular & Firebase Architecture Notes',
    description: 'Implementation notes on Angular, Firebase, CMS workflows, route SEO, and reusable frontend architecture.',
    summary: 'A technical trail through the site architecture: Angular routing, Firebase functions, CMS publishing, media workflows, and Core OS boundaries.',
    terms: ['angular', 'firebase', 'architecture', 'cms', 'editor.js', 'typescript', 'web development'],
    checklist: [
      'Keep public pages, admin CMS, labs, and Core OS systems in clear boundaries.',
      'Preserve route-level SEO metadata for every indexable public route.',
      'Use Firebase Functions for crawler shells, feeds, and private API keys.',
      'Document migrations when a change affects publishing or deploy behavior.',
    ],
    resources: [
      {
        label: 'Architecture Posts',
        description: 'Browse posts categorized as architecture notes.',
        href: `/${PATH_NAMES.BLOG}/category/architecture`,
      },
      {
        label: 'CMS Posts',
        description: 'Read posts and notes about CMS workflows.',
        href: `/${PATH_NAMES.BLOG}/category/cms`,
      },
    ],
  },
  {
    slug: 'labs-projects',
    eyebrow: 'Labs',
    title: 'Labs & Project Demos',
    description: 'Interactive demos, browser experiments, UI systems, and public notes from Colin Michaels project labs.',
    summary: 'A home for experiments that should stay visible without being mixed into production page logic: games, UI tools, media demos, and creative coding trials.',
    terms: ['labs', 'projects', 'game development', 'browser game', 'creative coding', 'music tools', 'web app'],
    checklist: [
      'Keep experiments isolated from public website page logic.',
      'Link demos to context posts when there is a useful build note.',
      'Preserve reusable Core OS systems for future projects.',
      'Use labs for unfinished ideas that are still worth sharing.',
    ],
    resources: [
      {
        label: 'Open Labs',
        description: 'Browse the interactive labs route.',
        href: `/${PATH_NAMES.LABS}`,
      },
      {
        label: 'Project Posts',
        description: 'Read project and lab writeups.',
        href: `/${PATH_NAMES.BLOG}/category/projects`,
      },
    ],
  },
];

export function getTopicHub(slug: string): TopicHub | undefined {
  return TOPIC_HUBS.find(topicHub => topicHub.slug === slug);
}

export function createTopicHubSeoMetadata(topicHub: TopicHub): SeoMetadata {
  return {
    title: `${topicHub.title} | ${SITE_NAME}`,
    description: topicHub.description,
    path: `/${PATH_NAMES.TOPICS}/${topicHub.slug}`,
    image: HOMEPAGE_OG_IMAGE,
    imageAlt: `${topicHub.title} preview card`,
    type: 'website',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: topicHub.title,
      description: topicHub.description,
      url: `https://colinmichaels.com/${PATH_NAMES.TOPICS}/${topicHub.slug}`,
    },
  };
}
