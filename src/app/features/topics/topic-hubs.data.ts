import {PATH_NAMES} from '../../app-route-paths';
import {HOMEPAGE_OG_IMAGE, SITE_NAME} from '../../shared/seo/seo.metadata';
import {SeoMetadata} from '../../shared/seo/seo.model';

export interface TopicHubResource {
  label: string;
  description: string;
  href: string;
}

export interface TopicHubAssetItem {
  label: string;
  description: string;
}

export interface TopicHubAsset {
  title: string;
  intro: string;
  items: readonly TopicHubAssetItem[];
}

export interface TopicHub {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  summary: string;
  terms: readonly string[];
  asset: TopicHubAsset;
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
    asset: {
      title: 'AI Setup Checklist',
      intro: 'A practical starting checklist for setting up AI tools so they support real work instead of becoming another tab to babysit.',
      items: [
        {
          label: 'Pick the job before the tool',
          description: 'Name the workflow first: drafting, research, code review, planning, editing, image ideation, or task triage.',
        },
        {
          label: 'Create reusable project instructions',
          description: 'Write the goal, audience, tone, constraints, examples, and review standards once so every chat starts with useful context.',
        },
        {
          label: 'Keep source material close',
          description: 'Attach notes, documents, transcripts, or code snippets that should govern the answer instead of relying on memory.',
        },
        {
          label: 'Ask for verification steps',
          description: 'Have the model list assumptions, cite source material, propose tests, or identify what still needs human review.',
        },
        {
          label: 'Set privacy boundaries',
          description: 'Keep credentials, private client data, health details, and financial identifiers out of general-purpose prompts.',
        },
      ],
    },
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
    asset: {
      title: 'Recovery And Emergency Planning Checklist',
      intro: 'A patient-perspective organizer for the practical details that become hard to find when appointments, recovery limits, and paperwork all collide.',
      items: [
        {
          label: 'Centralize emergency contacts',
          description: 'Keep names, phone numbers, roles, pharmacy details, insurance contacts, and backup contacts in one easy-to-find place.',
        },
        {
          label: 'Maintain medication and care notes',
          description: 'Track current medications, doses, allergies, discharge instructions, restrictions, and follow-up questions for clinicians.',
        },
        {
          label: 'Prepare appointment questions',
          description: 'Write questions before each visit and bring someone who can help listen, take notes, and remember next steps.',
        },
        {
          label: 'Track recovery signals',
          description: 'Record symptoms, activity limits, sleep, milestones, and changes that your care team asked you to watch.',
        },
        {
          label: 'Confirm decisions with professionals',
          description: 'Use personal notes as an organization aid, then verify medical, legal, insurance, and medication choices with qualified professionals.',
        },
      ],
    },
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
    asset: {
      title: 'Angular And Firebase Architecture Note',
      intro: 'A compact architecture reference for keeping a public Angular/Firebase site crawlable, maintainable, and safe to evolve.',
      items: [
        {
          label: 'Separate public, admin, labs, and OS routes',
          description: 'Keep production site pages, CMS/admin tools, experiments, and reusable OS-style systems in clear route and folder boundaries.',
        },
        {
          label: 'Render crawler metadata at the edge',
          description: 'Use Firebase Functions to classify routes, inject canonical metadata, return real 404s, and provide visible fallback content.',
        },
        {
          label: 'Keep sitemap policy explicit',
          description: 'Include published posts and high-value hubs, then threshold taxonomy pages so low-count tags do not flood the sitemap.',
        },
        {
          label: 'Preserve CMS content contracts',
          description: 'Keep Editor.js block types, SEO fields, statuses, media attachments, and preview tokens typed and documented.',
        },
        {
          label: 'Validate before deploy',
          description: 'Run build, Functions build, route checks, metadata checks, and post-deploy curl checks before treating SEO changes as complete.',
        },
      ],
    },
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
    asset: {
      title: 'Labs And Demo Showcase Checklist',
      intro: 'A simple publishing checklist for turning experiments into useful public demos without blurring them into production page logic.',
      items: [
        {
          label: 'State the experiment clearly',
          description: 'Explain what the demo tests, what is finished, what is rough, and what someone should try first.',
        },
        {
          label: 'Keep experimental code isolated',
          description: 'Route demos through labs, playground, or archive boundaries so reusable systems do not get tangled with public page logic.',
        },
        {
          label: 'Link demos to context',
          description: 'Connect each demo to a writeup, changelog note, screenshot, or project post when that context helps the visitor.',
        },
        {
          label: 'Protect performance and accessibility',
          description: 'Lazy-load heavier demos, avoid starting every experiment on page load, and keep keyboard and mobile basics intact.',
        },
        {
          label: 'Promote only durable work',
          description: 'Move stable experiments into stronger internal links while keeping unfinished or risky ideas clearly labeled.',
        },
      ],
    },
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
