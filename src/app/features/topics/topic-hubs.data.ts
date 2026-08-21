import {PATH_NAMES} from '../../app-route-paths';
import {HOMEPAGE_OG_IMAGE, SITE_NAME} from '../../shared/seo/seo.metadata';
import {SeoMetadata} from '../../shared/seo/seo.model';

export interface TopicHubResource {
  label: string;
  description: string;
  href: string;
}

export type TopicHubStatus = 'draft' | 'published' | 'archived';

export const TOPIC_HUB_STATUSES: readonly TopicHubStatus[] = ['draft', 'published', 'archived'];

export interface TopicHubAssetItem {
  label: string;
  description: string;
}

export interface TopicHubAsset {
  title: string;
  intro: string;
  items: readonly TopicHubAssetItem[];
}

export type TopicHubIcon = 'spark' | 'heart' | 'cube' | 'flask' | 'gamepad' | 'flight';

export const TOPIC_HUB_ICONS: readonly TopicHubIcon[] = ['spark', 'heart', 'cube', 'flask', 'gamepad', 'flight'];

export interface TopicHubMapPlacement {
  xPercent: number;
  yPercent: number;
  depth: number;
  scale: number;
  floatDelayMs: number;
}

export interface TopicHubTheme {
  shortLabel: string;
  accent: string;
  accentStrong: string;
  accentRgb: string;
  mapPlacement: TopicHubMapPlacement;
  icon: TopicHubIcon;
  heroMotifs: readonly string[];
}

export interface TopicHubImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  objectPosition?: string;
}

export interface TopicHubPageCopy {
  featuredHeading: string;
  featuredDescription: string;
  archiveHeading: string;
  archiveDescription: string;
}

export interface TopicHubFeaturedProject {
  label: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
}

export interface TopicHubLearningStep {
  label: string;
  title: string;
  description: string;
}

export interface TopicHub {
  id: string;
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  summary: string;
  status: TopicHubStatus;
  displayOrder: number;
  terms: readonly string[];
  theme: TopicHubTheme;
  /** Optional until existing Firestore topic documents are migrated. */
  heroImage?: TopicHubImage;
  /** Optional until existing Firestore topic documents are migrated. */
  pageCopy?: TopicHubPageCopy;
  asset: TopicHubAsset;
  featuredProject: TopicHubFeaturedProject;
  learningPath: readonly TopicHubLearningStep[];
  checklist: readonly string[];
  resources: readonly TopicHubResource[];
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_TOPIC_TIMESTAMP = '2026-07-04T00:00:00.000Z';

export const TOPIC_THEME_COLORS = {
  ai: {
    accent: '#22d3ee',
    accentStrong: '#67e8f9',
    accentRgb: '34 211 238',
  },
  recovery: {
    accent: '#2dd4bf',
    accentStrong: '#5eead4',
    accentRgb: '45 212 191',
  },
  architecture: {
    accent: '#60a5fa',
    accentStrong: '#93c5fd',
    accentRgb: '96 165 250',
  },
  labs: {
    accent: '#a78bfa',
    accentStrong: '#c4b5fd',
    accentRgb: '167 139 250',
  },
  gadgets: {
    accent: '#f59e0b',
    accentStrong: '#fbbf24',
    accentRgb: '245 158 11',
  },
  drones: {
    accent: '#f43f5e',
    accentStrong: '#fb7185',
    accentRgb: '244 63 94',
  },
} as const;

export const TOPIC_HUBS: readonly TopicHub[] = [
  {
    id: 'topic-ai-setup',
    slug: 'ai-setup',
    eyebrow: 'AI & Tech',
    title: 'AI Setup Guides',
    description: 'Practical setup guides for ChatGPT, Claude, Copilot, Gemini, prompting, projects, and AI-assisted workflows.',
    summary: 'Start here for approachable AI setup notes, model-choice habits, project organization, and prompts that make chat tools more useful in real work.',
    status: 'published',
    displayOrder: 10,
    terms: ['ai', 'chatgpt', 'claude', 'copilot', 'gemini', 'prompting', 'ai tools', 'ai workflow', 'productivity'],
    theme: {
      shortLabel: 'AI',
      ...TOPIC_THEME_COLORS.ai,
      mapPlacement: {
        xPercent: 47,
        yPercent: 22,
        depth: 3,
        scale: 1,
        floatDelayMs: -1200,
      },
      icon: 'spark',
      heroMotifs: ['Workflow map', 'Terminals', 'Prompt nodes', 'Automation arrows'],
    },
    heroImage: {
      src: '/assets/images/topics/ai-setup.webp',
      alt: 'A modular AI workspace connected by a precise cyan workflow path.',
      width: 1664,
      height: 936,
      objectPosition: 'center',
    },
    pageCopy: {
      featuredHeading: 'AI workflows worth starting with',
      featuredDescription: 'A few practical reads for choosing tools, organizing context, and keeping human judgment in the loop.',
      archiveHeading: 'More AI setup notes',
      archiveDescription: 'Browse the rest of the guides, experiments, and working notes in this topic.',
    },
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
    featuredProject: {
      label: 'Featured project',
      title: 'AI Setup Checklist',
      description: 'A reusable setup path for choosing tools, writing project instructions, keeping source context close, and verifying AI-assisted work.',
      href: `/${PATH_NAMES.TOPICS}/ai-setup#topic-start-here`,
      ctaLabel: 'Open checklist',
    },
    learningPath: [
      {
        label: '01',
        title: 'Define the job',
        description: 'Start with the workflow and success criteria before choosing a model or prompt pattern.',
      },
      {
        label: '02',
        title: 'Choose the model',
        description: 'Match speed, reasoning, context, privacy, and cost to the work in front of you.',
      },
      {
        label: '03',
        title: 'Set up workspace',
        description: 'Group instructions, examples, source files, and reusable context by project.',
      },
      {
        label: '04',
        title: 'Prompt with structure',
        description: 'Use constraints, examples, review criteria, and verification steps to improve output.',
      },
      {
        label: '05',
        title: 'Automate repeats',
        description: 'Turn reliable repeated work into commands, scripts, templates, or agent instructions.',
      },
    ],
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
    createdAt: DEFAULT_TOPIC_TIMESTAMP,
    updatedAt: DEFAULT_TOPIC_TIMESTAMP,
  },
  {
    id: 'topic-recovery-planning',
    slug: 'recovery-planning',
    eyebrow: 'Health & Recovery',
    title: 'Recovery & Medical Planning Resources',
    description: 'Personal recovery notes, emergency planning resources, and practical lessons from open-heart surgery recovery.',
    summary: 'These posts are patient-perspective notes from recovery and planning work. They are meant to help readers ask better questions and get organized, not replace professional care.',
    status: 'published',
    displayOrder: 20,
    terms: ['recovery', 'health', 'medical', 'heart surgery', 'open heart surgery', 'cardiac', 'insurance', 'planning'],
    theme: {
      shortLabel: 'Recovery',
      ...TOPIC_THEME_COLORS.recovery,
      mapPlacement: {
        xPercent: 21,
        yPercent: 48,
        depth: 3,
        scale: 1.02,
        floatDelayMs: -2600,
      },
      icon: 'heart',
      heroMotifs: ['Recovery trail', 'Heartbeat line', 'Care notes', 'Contour map'],
    },
    heroImage: {
      src: '/assets/images/topics/recovery-planning.webp',
      alt: 'A calm recovery-planning journal beside a gentle teal route line.',
      width: 1600,
      height: 900,
      objectPosition: 'center',
    },
    pageCopy: {
      featuredHeading: 'Recovery stories and planning notes',
      featuredDescription: 'Patient-perspective writing about preparation, open-heart surgery recovery, and the practical details that are easy to lose track of.',
      archiveHeading: 'More from recovery',
      archiveDescription: 'Continue through the personal updates, lessons, and planning resources collected here.',
    },
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
    featuredProject: {
      label: 'Featured project',
      title: 'Recovery And Emergency Planning Checklist',
      description: 'A patient-perspective organizer for contacts, medications, appointment questions, recovery signals, and care-team follow-up.',
      href: `/${PATH_NAMES.TOPICS}/recovery-planning#topic-start-here`,
      ctaLabel: 'Open checklist',
    },
    learningPath: [
      {
        label: '01',
        title: 'Organize contacts',
        description: 'Put emergency, pharmacy, insurance, caregiver, and clinician contacts in one place.',
      },
      {
        label: '02',
        title: 'Prepare appointments',
        description: 'Write questions, bring notes, and make it easier to remember next steps.',
      },
      {
        label: '03',
        title: 'Track signals',
        description: 'Record symptoms, restrictions, sleep, activity, and milestones your care team asks about.',
      },
      {
        label: '04',
        title: 'Coordinate support',
        description: 'Keep caregiver tasks, paperwork, transportation, and household needs visible.',
      },
      {
        label: '05',
        title: 'Verify decisions',
        description: 'Use notes to ask better questions, then confirm choices with qualified professionals.',
      },
    ],
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
    createdAt: DEFAULT_TOPIC_TIMESTAMP,
    updatedAt: DEFAULT_TOPIC_TIMESTAMP,
  },
  {
    id: 'topic-angular-firebase-architecture',
    slug: 'angular-firebase-architecture',
    eyebrow: 'Architecture',
    title: 'Angular & Firebase Architecture Notes',
    description: 'Implementation notes on Angular, Firebase, CMS workflows, route SEO, and reusable frontend architecture.',
    summary: 'A technical trail through the site architecture: Angular routing, Firebase functions, CMS publishing, media workflows, and Core OS boundaries.',
    status: 'published',
    displayOrder: 30,
    terms: ['angular', 'firebase', 'architecture', 'cms', 'editor.js', 'typescript', 'web development'],
    theme: {
      shortLabel: 'Architecture',
      ...TOPIC_THEME_COLORS.architecture,
      mapPlacement: {
        xPercent: 72,
        yPercent: 55,
        depth: 2,
        scale: 0.96,
        floatDelayMs: -4200,
      },
      icon: 'cube',
      heroMotifs: ['Blueprint layers', 'Angular routes', 'Firebase nodes', 'SEO fallbacks'],
    },
    heroImage: {
      src: '/assets/images/topics/angular-firebase-architecture.webp',
      alt: 'Layered blue architecture plans connecting routes, interfaces, and data nodes.',
      width: 1664,
      height: 936,
      objectPosition: 'center',
    },
    pageCopy: {
      featuredHeading: 'Architecture notes from this build',
      featuredDescription: 'The clearest write-ups on Angular boundaries, Firebase publishing, CMS structure, and the systems behind this site.',
      archiveHeading: 'More architecture writing',
      archiveDescription: 'Read the implementation notes, refactors, and decisions that shaped the current stack.',
    },
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
    featuredProject: {
      label: 'Featured project',
      title: 'Angular And Firebase Architecture Note',
      description: 'A compact map of the route, CMS, Firebase Function, sitemap, and SEO fallback boundaries behind the public site.',
      href: `/${PATH_NAMES.TOPICS}/angular-firebase-architecture#topic-start-here`,
      ctaLabel: 'Open note',
    },
    learningPath: [
      {
        label: '01',
        title: 'Route boundaries',
        description: 'Separate public pages, admin tools, labs, and reusable OS infrastructure.',
      },
      {
        label: '02',
        title: 'Content contracts',
        description: 'Keep Editor.js blocks, metadata, statuses, media, and previews typed.',
      },
      {
        label: '03',
        title: 'Crawler fallbacks',
        description: 'Use server-rendered route shells and metadata for public discoverability.',
      },
      {
        label: '04',
        title: 'Publishing flow',
        description: 'Connect CMS state, scheduling, feeds, sitemap policy, and route validation.',
      },
      {
        label: '05',
        title: 'Validation loop',
        description: 'Run build, lint, route checks, metadata checks, and deploy verification.',
      },
    ],
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
    createdAt: DEFAULT_TOPIC_TIMESTAMP,
    updatedAt: DEFAULT_TOPIC_TIMESTAMP,
  },
  {
    id: 'topic-labs-projects',
    slug: 'labs-projects',
    eyebrow: 'Labs',
    title: 'Labs & Project Demos',
    description: 'Interactive demos, browser experiments, UI systems, and public notes from Colin Michaels project labs.',
    summary: 'A home for experiments that should stay visible without being mixed into production page logic: games, UI tools, media demos, and creative coding trials.',
    status: 'published',
    displayOrder: 40,
    terms: ['labs', 'projects', 'game development', 'browser game', 'creative coding', 'music tools', 'web app'],
    theme: {
      shortLabel: 'Labs',
      ...TOPIC_THEME_COLORS.labs,
      mapPlacement: {
        xPercent: 50,
        yPercent: 78,
        depth: 2,
        scale: 1,
        floatDelayMs: -3200,
      },
      icon: 'flask',
      heroMotifs: ['Workbench', 'Browser windows', 'Prototype markers', 'Demo routes'],
    },
    heroImage: {
      src: '/assets/images/topics/labs-projects.webp',
      alt: 'A violet-lit prototype workbench filled with modular browser experiments.',
      width: 1600,
      height: 900,
      objectPosition: 'center',
    },
    pageCopy: {
      featuredHeading: 'Experiments from the workbench',
      featuredDescription: 'Project write-ups and creative coding notes from the browser, UI, music, and game ideas I am actively testing.',
      archiveHeading: 'More lab notes and demos',
      archiveDescription: 'Browse the experiments, build logs, and project updates that document the work in progress.',
    },
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
    featuredProject: {
      label: 'Featured project',
      title: 'Open Labs',
      description: 'The public route for experiments, demos, games, UI systems, and creative coding trials that should stay isolated from production page logic.',
      href: `/${PATH_NAMES.LABS}`,
      ctaLabel: 'Open labs',
    },
    learningPath: [
      {
        label: '01',
        title: 'Frame the experiment',
        description: 'State what the demo tests, what is finished, and what someone should try first.',
      },
      {
        label: '02',
        title: 'Isolate the code',
        description: 'Keep labs, playground, archive, and reusable framework systems in clear boundaries.',
      },
      {
        label: '03',
        title: 'Add context',
        description: 'Connect demos to writeups, screenshots, changelog notes, or project posts.',
      },
      {
        label: '04',
        title: 'Protect UX',
        description: 'Lazy-load heavy demos and preserve keyboard, mobile, and accessibility basics.',
      },
      {
        label: '05',
        title: 'Promote durable work',
        description: 'Move stable experiments into stronger internal links while labeling rough ideas honestly.',
      },
    ],
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
    createdAt: DEFAULT_TOPIC_TIMESTAMP,
    updatedAt: DEFAULT_TOPIC_TIMESTAMP,
  },
  {
    id: 'topic-gadgets-toys',
    slug: 'gadgets-toys',
    eyebrow: 'Tech Finds',
    title: 'Gadgets & Toys',
    description: 'Evidence-labeled gadget research, hands-on notes when available, and honest verdicts on useful, strange, and clever technology found online.',
    summary: 'A running shelf of gadgets I own, try, borrow, want, or research online—judged by the problem they solve, the proof behind the pitch, true cost, everyday friction, and support.',
    status: 'published',
    displayOrder: 50,
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
    theme: {
      shortLabel: 'Gadgets',
      ...TOPIC_THEME_COLORS.gadgets,
      mapPlacement: {
        xPercent: 83,
        yPercent: 28,
        depth: 3,
        scale: 0.98,
        floatDelayMs: -1800,
      },
      icon: 'gamepad',
      heroMotifs: ['Handheld tech', 'Desk robot', 'Toy drone', 'Finds shelf'],
    },
    heroImage: {
      src: '/assets/images/topics/gadgets-toys.webp',
      alt: 'A curated amber-lit workbench with a handheld game device, desk robot, toy drone, puzzle, and pocket gadget.',
      width: 1600,
      height: 900,
      objectPosition: 'center',
    },
    pageCopy: {
      featuredHeading: 'Is it actually useful?',
      featuredDescription: 'Unusual gadgets and clever problem-solvers with the evidence label, practical tradeoffs, and verdict visible before the enthusiasm runs away.',
      archiveHeading: 'More useful, strange, and clever finds',
      archiveDescription: 'Browse the rest of the gadget research, hands-on notes, comparisons, internet discoveries, and objects still waiting for a verdict.',
    },
    asset: {
      title: 'Is It Actually Useful? Gadget Scorecard',
      intro: 'A repeatable way to separate what an object promises from the evidence, complete cost, everyday friction, support, and the person it may genuinely help.',
      items: [
        {
          label: 'Real problem fit',
          description: 'Name the user, recurring problem, frequency, and current workaround before deciding the object is useful.',
        },
        {
          label: 'Evidence quality',
          description: 'Label the item as owned, tried, borrowed, or research-only and separate direct evidence from marketing claims.',
        },
        {
          label: 'True cost',
          description: 'Count shipping, tax, accessories, subscriptions, consumables, replacement parts, maintenance, and failed experiments.',
        },
        {
          label: 'Everyday friction',
          description: 'Check whether charging, pairing, accounts, storage, cleanup, compatibility, learning, or noise erases the convenience.',
        },
        {
          label: 'Support and exit',
          description: 'Review returns, warranty, parts, privacy, cloud dependence, service history, resale, and what happens if the company disappears.',
        },
      ],
    },
    featuredProject: {
      label: 'Printable series framework',
      title: 'Gadget Usefulness Scorecard',
      description: 'Score problem fit, evidence, true cost, everyday friction, and support before writing the honest verdict.',
      href: `/${PATH_NAMES.RESOURCES}/${PATH_NAMES.RESOURCE_GADGET_USEFULNESS_SCORECARD}`,
      ctaLabel: 'Open the scorecard',
    },
    learningPath: [
      {
        label: '01',
        title: 'Show the promise',
        description: 'Start with the useful, strange, playful, or unusually thoughtful claim that made the item worth noticing.',
      },
      {
        label: '02',
        title: 'Label the evidence',
        description: 'Say whether it is owned, tried, borrowed, or research-only and disclose relationships or synthetic media.',
      },
      {
        label: '03',
        title: 'Score the five tradeoffs',
        description: 'Compare the promise with problem fit, proof, true cost, everyday friction, and support or exit options.',
      },
      {
        label: '04',
        title: 'Explain the evidence',
        description: 'Put one supporting fact or unanswered question beside every score instead of hiding uncertainty in a total.',
      },
      {
        label: '05',
        title: 'Give the useful answer',
        description: 'Explain who it helps, who should skip it, the next move, and one related object worth judging next.',
      },
    ],
    checklist: [
      'Label each item as owned, tried, borrowed, or research-only.',
      'Score problem fit, evidence, true cost, everyday friction, and support from zero to four.',
      'Put one supporting fact or unanswered question beside every score.',
      'Disclose gifts, review units, sponsorships, affiliate relationships, and synthetic media.',
      'Explain who it helps, who should skip it, and why the total does not decide the purchase.',
    ],
    resources: [
      {
        label: 'Printable Gadget Usefulness Scorecard',
        description: 'Open the evidence-led guide and download the one-page Is It Actually Useful? worksheet.',
        href: `/${PATH_NAMES.RESOURCES}/${PATH_NAMES.RESOURCE_GADGET_USEFULNESS_SCORECARD}`,
      },
      {
        label: 'Gadget Posts',
        description: 'Browse reviews and interesting technology finds.',
        href: `/${PATH_NAMES.BLOG}/category/gadgets`,
      },
      {
        label: 'Product Reviews',
        description: 'Read hands-on notes and product verdicts.',
        href: `/${PATH_NAMES.BLOG}/tag/product-reviews`,
      },
    ],
    createdAt: DEFAULT_TOPIC_TIMESTAMP,
    updatedAt: DEFAULT_TOPIC_TIMESTAMP,
  },
  {
    id: 'topic-drones-fpv',
    slug: 'drones-fpv',
    eyebrow: 'Captain Colin Flies',
    title: 'Drones & FPV',
    description: 'FPV flights, Florida flying locations, practical drone field notes, and honest looks at aerial cameras and new drone ideas.',
    summary: 'Flight stories, useful setup notes, and aerial-video experiments from Captain Colin—covering what worked, what did not, and what is worth trying on the next pack.',
    status: 'published',
    displayOrder: 60,
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
    theme: {
      shortLabel: 'Drones',
      ...TOPIC_THEME_COLORS.drones,
      mapPlacement: {
        xPercent: 18,
        yPercent: 77,
        depth: 2,
        scale: 0.96,
        floatDelayMs: -3800,
      },
      icon: 'flight',
      heroMotifs: ['FPV quad', 'Florida inlet', 'Flight path', 'Camera feed'],
    },
    heroImage: {
      src: '/assets/images/topics/drones-fpv.webp',
      alt: 'An FPV quadcopter banking over a turquoise Florida inlet beside mangroves and pale sand.',
      width: 1600,
      height: 900,
      objectPosition: 'center',
    },
    pageCopy: {
      featuredHeading: 'Start with the latest flights',
      featuredDescription: 'Field reports, practical drone notes, and aerial-camera ideas grounded in real places, real footage, and honest tradeoffs.',
      archiveHeading: 'More drone and FPV stories',
      archiveDescription: 'Continue through the flights, gear notes, location stories, and experiments collected here.',
    },
    asset: {
      title: 'Drone Flight Field Notes',
      intro: 'A repeatable preflight and debrief framework for turning each flight into safer practice, better footage, and a more useful story.',
      items: [
        {
          label: 'Define the purpose',
          description: 'Choose the flight goal before launch: practice one maneuver, test a setting, scout a location, or capture one clear sequence.',
        },
        {
          label: 'Check the place and conditions',
          description: 'Review airspace, local restrictions, people and property, weather, launch space, recovery options, and signal obstacles before committing.',
        },
        {
          label: 'Record the setup',
          description: 'Note the aircraft, camera, battery, rates, filters, safety settings, and any change being tested so the results remain comparable.',
        },
        {
          label: 'Protect the exit',
          description: 'Keep enough battery, visibility, room, and attention for a calm return instead of treating the last seconds as usable flight time.',
        },
        {
          label: 'Debrief the evidence',
          description: 'Review footage and flight behavior, name one success and one correction, then carry a single improvement into the next pack.',
        },
      ],
    },
    featuredProject: {
      label: 'Start here',
      title: 'Drone Flight Field Notes',
      description: 'The simple purpose, conditions, setup, exit, and debrief loop behind Captain Colin flight stories.',
      href: `/${PATH_NAMES.TOPICS}/drones-fpv#topic-start-here`,
      ctaLabel: 'Open field notes',
    },
    learningPath: [
      {
        label: '01',
        title: 'Choose the mission',
        description: 'Give the flight one clear goal so setup, footage, and the final story all point in the same direction.',
      },
      {
        label: '02',
        title: 'Read the location',
        description: 'Check airspace, conditions, people, obstacles, launch space, and recovery options before flying.',
      },
      {
        label: '03',
        title: 'Set the aircraft',
        description: 'Document the aircraft, camera, battery, rates, filters, and safety settings being used or tested.',
      },
      {
        label: '04',
        title: 'Fly the plan',
        description: 'Capture the intended sequence while preserving enough margin for a controlled return.',
      },
      {
        label: '05',
        title: 'Share the lesson',
        description: 'Pair the strongest footage with the setup, limitation, surprise, and next change that make it useful.',
      },
    ],
    checklist: [
      'Define one flight or filming goal before launch.',
      'Check current airspace, local rules, conditions, people, property, and recovery options.',
      'Record the aircraft, camera, battery, and settings used for the test.',
      'Debrief one success and one correction before the next pack.',
    ],
    resources: [
      {
        label: 'Printable Drone Flight Field Notes',
        description: 'Download the one-page purpose, setup, exit-plan, shot-plan, and debrief worksheet.',
        href: '/downloads/captain-colin-drone-flight-field-notes.pdf',
      },
      {
        label: 'Personal Aircraft Buyer Verification',
        description: 'Use the two-page offer, deposit, legal-category, support, and evidence worksheet before treating a viral aircraft as a purchase.',
        href: '/resources/personal-aircraft-buyer-verification',
      },
      {
        label: 'FAA Recreational Flyers',
        description: 'Check the current federal rules and responsibilities for recreational drone flying.',
        href: 'https://www.faa.gov/uas/recreational_flyers',
      },
      {
        label: 'FAA Where Can I Fly?',
        description: 'Use the FAA starting point for current airspace and B4UFLY service information.',
        href: 'https://www.faa.gov/uas/getting_started/where_can_i_fly',
      },
      {
        label: 'FAA Remote ID',
        description: 'Review the current Remote ID compliance paths for registered or registration-required drones.',
        href: 'https://www.faa.gov/uas/getting_started/remote_id',
      },
      {
        label: 'Drone Posts',
        description: 'Browse field notes, reviews, and aerial-camera stories.',
        href: `/${PATH_NAMES.BLOG}/category/drones`,
      },
      {
        label: 'FPV Posts',
        description: 'Read flight stories and first-person-view experiments.',
        href: `/${PATH_NAMES.BLOG}/tag/fpv`,
      },
    ],
    createdAt: '2026-08-14T00:00:00.000Z',
    updatedAt: '2026-08-15T00:00:00.000Z',
  },
];

export function getTopicHub(slug: string): TopicHub | undefined {
  return findTopicHubBySlug(slug, getPublishedTopicHubs());
}

export function findTopicHubBySlug(
  slug: string,
  topics: readonly TopicHub[]
): TopicHub | undefined {
  const exactTopic = topics.find(topicHub => topicHub.slug === slug);
  return exactTopic;
}

export function getPublishedTopicHubs(topics: readonly TopicHub[] = TOPIC_HUBS): readonly TopicHub[] {
  return sortTopicHubs(topics.filter(topicHub => topicHub.status === 'published'));
}

export function sortTopicHubs(topics: readonly TopicHub[]): readonly TopicHub[] {
  return [...topics].sort((left, right) => (
    left.displayOrder - right.displayOrder
      || left.title.localeCompare(right.title)
      || left.slug.localeCompare(right.slug)
  ));
}

/** Keep the crawlable identity and matching intent of code-defined public topics stable. */
export function lockDefaultTopicHubIdentity(
  topicHub: TopicHub,
  defaults: readonly TopicHub[] = TOPIC_HUBS
): TopicHub {
  const defaultTopicHub = defaults.find(defaultTopic => defaultTopic.id === topicHub.id);

  if (!defaultTopicHub) {
    return topicHub;
  }

  return {
    ...topicHub,
    id: defaultTopicHub.id,
    slug: defaultTopicHub.slug,
    eyebrow: defaultTopicHub.eyebrow,
    title: defaultTopicHub.title,
    description: defaultTopicHub.description,
    summary: defaultTopicHub.summary,
    status: defaultTopicHub.status,
    terms: defaultTopicHub.terms,
    theme: {
      ...topicHub.theme,
      shortLabel: defaultTopicHub.theme.shortLabel,
    },
    resources: mergeDefaultTopicHubResources(defaultTopicHub.resources, topicHub.resources),
  };
}

function mergeDefaultTopicHubResources(
  defaultResources: readonly TopicHubResource[],
  storedResources: readonly TopicHubResource[]
): readonly TopicHubResource[] {
  const defaultHrefs = new Set(defaultResources.map(resource => resource.href));

  return [
    ...defaultResources,
    ...storedResources.filter(resource => !defaultHrefs.has(resource.href)),
  ];
}

/**
 * Treat code-defined topics as immutable public identities while still letting
 * Firestore supply presentation, guide, artwork, ordering, and additive
 * resources without renaming, archiving, or removing code-defined public paths.
 */
export function getMissingDefaultTopicHubs(
  topics: readonly TopicHub[],
  defaults: readonly TopicHub[] = TOPIC_HUBS
): readonly TopicHub[] {
  const existingIds = new Set(topics.map(topicHub => topicHub.id));
  const existingSlugs = new Set(topics.map(topicHub => topicHub.slug));

  return defaults.filter(defaultTopicHub => (
    !existingIds.has(defaultTopicHub.id)
      && !existingSlugs.has(defaultTopicHub.slug)
  ));
}

export function mergeMissingDefaultTopicHubs(
  topics: readonly TopicHub[],
  defaults: readonly TopicHub[] = TOPIC_HUBS
): readonly TopicHub[] {
  const topicsWithLockedPublicIdentity = topics.map(topicHub => (
    lockDefaultTopicHubIdentity(topicHub, defaults)
  ));

  return sortTopicHubs([
    ...topicsWithLockedPublicIdentity,
    ...getMissingDefaultTopicHubs(topicsWithLockedPublicIdentity, defaults),
  ]);
}

const DEFAULT_TOPIC_PAGE_COPY: TopicHubPageCopy = {
  featuredHeading: 'Featured reading',
  featuredDescription: 'A few useful places to begin with this topic.',
  archiveHeading: 'More from this topic',
  archiveDescription: 'Browse the rest of the published writing collected here.',
};

// Companion scenes remain code-owned until the CMS gains a bounded multi-image topic contract.
export const DEFAULT_TOPIC_HERO_COMPANION_IMAGES: Readonly<Record<string, TopicHubImage>> = {
  'topic-ai-setup': {
    src: '/assets/images/topics/ai-setup-companion.webp',
    alt: 'A dark modular AI planning workspace with blank workflow tiles and precise cyan connections.',
    width: 1672,
    height: 941,
    objectPosition: 'center',
  },
  'topic-recovery-planning': {
    src: '/assets/images/topics/recovery-planning-companion.webp',
    alt: 'A blank recovery journal beside a quiet mountain path at sunrise.',
    width: 1672,
    height: 941,
    objectPosition: 'center',
  },
  'topic-angular-firebase-architecture': {
    src: '/assets/images/topics/angular-firebase-architecture-companion.webp',
    alt: 'A layered physical web architecture model built from dark platforms, glass planes, and blue connections.',
    width: 1672,
    height: 941,
    objectPosition: 'center',
  },
  'topic-labs-projects': {
    src: '/assets/images/topics/labs-projects-companion.webp',
    alt: 'A tactile project lab prototype assembled from blank interface plates and violet-lit modules.',
    width: 1672,
    height: 941,
    objectPosition: 'center',
  },
  'topic-gadgets-toys': {
    src: '/assets/images/topics/gadgets-toys-companion.webp',
    alt: 'A dark workbench arranged with an original pocket projector, inspection camera, multitool, robot, and kinetic gadget.',
    width: 1672,
    height: 941,
    objectPosition: 'center',
  },
  'topic-drones-fpv': {
    src: '/assets/images/topics/drones-fpv-companion.webp',
    alt: 'An FPV quadcopter banking over a Florida mangrove channel at golden hour.',
    width: 1672,
    height: 941,
    objectPosition: 'center',
  },
};

export function resolveTopicHubHeroImage(topicHub: TopicHub): TopicHubImage | undefined {
  return topicHub.heroImage
    ?? TOPIC_HUBS.find(defaultTopicHub => (
      defaultTopicHub.id === topicHub.id || defaultTopicHub.slug === topicHub.slug
    ))?.heroImage;
}

export function resolveTopicHubHeroImages(topicHub: TopicHub): readonly TopicHubImage[] {
  const primaryImage = resolveTopicHubHeroImage(topicHub);
  // Resolve by the locked bootstrap identity so a Firestore overlay cannot attach another topic's scene.
  const defaultTopicHub = TOPIC_HUBS.find(defaultHub => (
    defaultHub.id === topicHub.id || defaultHub.slug === topicHub.slug
  ));
  const companionImage = DEFAULT_TOPIC_HERO_COMPANION_IMAGES[
    defaultTopicHub?.id ?? topicHub.id
  ];

  return [primaryImage, companionImage]
    .filter((image): image is TopicHubImage => Boolean(image))
    .filter((image, index, images) => (
      images.findIndex(candidate => candidate.src === image.src) === index
    ));
}

export function resolveTopicHubPageCopy(topicHub: TopicHub): TopicHubPageCopy {
  return topicHub.pageCopy
    ?? TOPIC_HUBS.find(defaultTopicHub => (
      defaultTopicHub.id === topicHub.id || defaultTopicHub.slug === topicHub.slug
    ))?.pageCopy
    ?? DEFAULT_TOPIC_PAGE_COPY;
}

export function createTopicHubSeoMetadata(topicHub: TopicHub): SeoMetadata {
  const heroImage = resolveTopicHubHeroImage(topicHub);

  return {
    title: `${topicHub.title} | ${SITE_NAME}`,
    description: topicHub.description,
    path: `/${PATH_NAMES.TOPICS}/${topicHub.slug}`,
    image: heroImage?.src ?? HOMEPAGE_OG_IMAGE,
    imageAlt: heroImage?.alt ?? `${topicHub.title} preview card`,
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
