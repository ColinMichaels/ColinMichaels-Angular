import {randomUUID} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {getAuth, UserRecord} from 'firebase-admin/auth';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import {logger} from 'firebase-functions';
import {defineSecret, defineString} from 'firebase-functions/params';
import {HttpsError, onCall, onRequest} from 'firebase-functions/v2/https';

initializeApp();

const FUNCTION_REGION = 'us-east1';
const MAX_PROMPT_LENGTH = 3000;
const MAX_TEXT_LENGTH = 12000;
const OPENAI_API_URL = 'https://api.openai.com/v1';
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_DEFAULT_MAX_RESULTS = 3;
const YOUTUBE_MAX_RESULTS = 6;
const YOUTUBE_FEED_CACHE_MS = 10 * 60 * 1000;
const USER_MANAGEMENT_DEFAULT_PAGE_SIZE = 50;
const USER_MANAGEMENT_MAX_PAGE_SIZE = 100;
const MAX_USER_MANAGEMENT_ROLES = 32;
const ROLE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const CMS_ACCESS_ROLES = ['admin', 'cmsAdmin', 'contentEditor'] as const;
const USER_MANAGEMENT_ACCESS_ROLES = ['admin'] as const;
const SITE_URL = 'https://colinmichaels.com';
const SITE_NAME = 'ColinMichaels.com';
const DEFAULT_LOCALE = 'en_US';
const HOMEPAGE_OG_IMAGE = '/assets/social/colin-michaels-og.jpg';
const DEFAULT_OG_IMAGE_WIDTH = 1200;
const DEFAULT_OG_IMAGE_HEIGHT = 630;
const HOMEPAGE_TITLE = 'Colin Michaels | Projects, Writing, Media & Recovery Updates';
const HOMEPAGE_DESCRIPTION = 'Personal site of Colin Michaels, an applications developer, FPV drone pilot, creative technologist, and Florida-based writer sharing projects, creative experiments, media, and recovery updates.';
const BLOG_FEED_DESCRIPTION = 'Notes on frontend engineering, Angular architecture, Firebase, CMS workflows, and web systems.';
const SEO_INDEX_TEMPLATE_PATH = resolve(__dirname, '../seo-index.html');
const SITEMAP_CACHE_CONTROL = 'public, max-age=300, s-maxage=3600';
const FEED_CACHE_CONTROL = 'public, max-age=300, s-maxage=1800';
const STATIC_ASSET_PATH_PATTERN = /\.(?:avif|css|eot|gif|ico|jpe?g|js|json|map|mjs|mp3|ogg|otf|png|svg|ttf|txt|wav|webmanifest|webp|woff2?)$/i;
const TAXONOMY_SITEMAP_MIN_POSTS = 2;
const TAG_SITEMAP_MIN_POSTS = 3;
const SITEMAP_REVIEW_URL_LIMIT = 180;
const OS_ROUTE_PREFIXES = ['/os', '/external'] as const;
const OS_ROUTES = ['/login', '/boot', '/sleep'] as const;
const ADMIN_ROUTE_PREFIXES = ['/admin'] as const;
const TOPIC_HUBS = [
  {
    slug: 'ai-setup',
    title: 'AI Setup Guides | ColinMichaels.com',
    heading: 'AI Setup Guides',
    description: 'Practical setup guides for ChatGPT, Claude, Copilot, Gemini, prompting, projects, and AI-assisted workflows.',
    imageAlt: 'AI setup guides preview card',
    terms: ['ai', 'chatgpt', 'claude', 'copilot', 'gemini', 'prompting', 'ai tools', 'ai workflow', 'productivity'],
  },
  {
    slug: 'recovery-planning',
    title: 'Recovery & Medical Planning Resources | ColinMichaels.com',
    heading: 'Recovery & Medical Planning Resources',
    description: 'Personal recovery notes, emergency planning resources, and practical lessons from open-heart surgery recovery.',
    imageAlt: 'Recovery and medical planning resources preview card',
    terms: ['recovery', 'health', 'medical', 'heart surgery', 'open heart surgery', 'cardiac', 'insurance', 'planning'],
  },
  {
    slug: 'angular-firebase-architecture',
    title: 'Angular & Firebase Architecture Notes | ColinMichaels.com',
    heading: 'Angular & Firebase Architecture Notes',
    description: 'Implementation notes on Angular, Firebase, CMS workflows, route SEO, and reusable frontend architecture.',
    imageAlt: 'Angular and Firebase architecture notes preview card',
    terms: ['angular', 'firebase', 'architecture', 'cms', 'editor.js', 'typescript', 'web development'],
  },
  {
    slug: 'labs-projects',
    title: 'Labs & Project Demos | ColinMichaels.com',
    heading: 'Labs & Project Demos',
    description: 'Interactive demos, browser experiments, UI systems, and public notes from Colin Michaels project labs.',
    imageAlt: 'Labs and project demos preview card',
    terms: ['labs', 'projects', 'game development', 'browser game', 'creative coding', 'music tools', 'web app'],
  },
] as const;
const openAiApiKey = defineSecret('OPENAI_API_KEY');
const youtubeApiKey = defineSecret('YOUTUBE_API_KEY');
const openAiTextModel = defineString('OPENAI_TEXT_MODEL', {default: 'gpt-5.5'});
const openAiImageModel = defineString('OPENAI_IMAGE_MODEL', {default: 'gpt-image-2'});
const youtubeChannelId = defineString('YOUTUBE_CHANNEL_ID', {default: ''});
const SITE_CALLABLE_CORS_ORIGINS = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'https://colinmichaels.com',
  'https://www.colinmichaels.com',
  'https://colinmichaels.firebaseapp.com',
  'https://colinmichaels.web.app',
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

let youtubeFeedCache: YoutubeFeedCacheEntry | null = null;

interface SeoArticleMetadata {
  publishedAt?: string;
  modifiedAt?: string;
  author?: string;
  section?: string;
  tags?: readonly string[];
}

interface SeoMetadata {
  title: string;
  description: string;
  path: string;
  image: string;
  imageAlt: string;
  imageWidth?: number;
  imageHeight?: number;
  type: 'website' | 'article';
  robots?: string;
  article?: SeoArticleMetadata;
  structuredData?: unknown;
  statusCode?: number;
  cacheControl?: string;
  fallbackHtml?: string;
}

interface SeoBlogPostDocument {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  thumbnailImage: string;
  authorName: string;
  categories: readonly string[];
  tags: readonly string[];
  seoTitle: string;
  seoDescription: string;
  seoCanonical: string;
  seoOpenGraphImage: string;
  seoOpenGraphImageWidth: number | null;
  seoOpenGraphImageHeight: number | null;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImageAlt: string;
  ogImageWidth: number | null;
  ogImageHeight: number | null;
  updatedAt: string;
  publishedAt: string | null;
  imageAlt: string;
  blocks: readonly BlogContentBlock[];
}

type SitemapChangeFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface SitemapUrl {
  path: string;
  lastmod?: string;
  changefreq?: SitemapChangeFrequency;
  priority?: number;
}

interface SitemapBlogPostDocument {
  slug: string;
  categories: readonly string[];
  subcategories: readonly string[];
  tags: readonly string[];
  updatedAt: string;
  publishedAt: string | null;
}

interface BlogBlockData {
  text?: string;
  level?: 2 | 3;
  url?: string;
  alt?: string;
  caption?: string;
  provider?: string;
  embedUrl?: string;
  items?: readonly string[];
  ordered?: boolean;
  language?: string;
  code?: string;
  variant?: string;
  attribution?: string;
}

interface BlogContentBlock {
  id: string;
  type: string;
  data: BlogBlockData;
}

interface BlogAssistantContext {
  title: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  categories: readonly string[];
  tags: readonly string[];
  blocks: readonly BlogContentBlock[];
}

interface BlogMetadataSuggestion {
  id: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  categories: readonly string[];
  tags: readonly string[];
  rationale: string;
}

interface BlogThumbnailSuggestion {
  id: string;
  prompt: string;
  altText: string;
  style: string;
}

interface BlogAssistantResult {
  generatedAt: string;
  source: 'backend';
  suggestions: readonly BlogMetadataSuggestion[];
  thumbnailSuggestions: readonly BlogThumbnailSuggestion[];
}

interface BlogThumbnailGenerationRequest {
  prompt: string;
  altText: string;
  style: string;
  postId: string;
  slug: string;
}

interface BlogStoredThumbnail {
  generatedAt: string;
  source: 'backend';
  prompt: string;
  altText: string;
  style: string;
  contentType: string;
  storagePath: string;
  downloadUrl: string;
  model: string;
}

interface YoutubeVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  thumbnailAlt: string;
  videoUrl: string;
}

interface YoutubeFeedResponse {
  fetchedAt: string;
  source: 'youtube-api';
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  videos: readonly YoutubeVideo[];
}

interface YoutubeFeedCacheEntry {
  key: string;
  expiresAt: number;
  response: YoutubeFeedResponse;
}

interface YoutubeChannelDetails {
  channelId: string;
  channelTitle: string;
  uploadsPlaylistId: string;
}

interface YoutubeChannelsResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
    };
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
      };
    };
  }>;
}

interface YoutubePlaylistItemsResponse {
  items?: YoutubePlaylistItem[];
}

interface YoutubePlaylistItem {
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: YoutubeThumbnails;
    resourceId?: {
      videoId?: string;
    };
  };
  contentDetails?: {
    videoId?: string;
    videoPublishedAt?: string;
  };
}

interface YoutubeThumbnails {
  default?: YoutubeThumbnail;
  medium?: YoutubeThumbnail;
  high?: YoutubeThumbnail;
  standard?: YoutubeThumbnail;
  maxres?: YoutubeThumbnail;
}

interface YoutubeThumbnail {
  url?: string;
}

interface YoutubeErrorResponse {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

interface OpenAiErrorResponse {
  error?: {
    message?: string;
    type?: string;
  };
}

interface OpenAiResponsePayload {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
}

interface OpenAiImagePayload {
  data?: Array<{
    b64_json?: string;
  }>;
}

interface AdminCallableAuth {
  uid: string;
  token: Record<string, unknown>;
}

interface AdminManagedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  disabled: boolean;
  emailVerified: boolean;
  createdAt: string | null;
  lastSignInAt: string | null;
  roles: readonly string[];
  customClaims: Record<string, unknown>;
}

interface AdminUsersResponse {
  users: readonly AdminManagedUser[];
  nextPageToken: string | null;
  fetchedAt: string;
}

interface UpdateAdminUserRolesResponse {
  user: AdminManagedUser;
  updatedAt: string;
}

const metadataSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['suggestions', 'thumbnailSuggestions'],
  properties: {
    suggestions: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'description', 'seoTitle', 'seoDescription', 'categories', 'tags', 'rationale'],
        properties: {
          id: {type: 'string'},
          title: {type: 'string'},
          description: {type: 'string'},
          seoTitle: {type: 'string'},
          seoDescription: {type: 'string'},
          categories: {
            type: 'array',
            items: {type: 'string'},
          },
          tags: {
            type: 'array',
            items: {type: 'string'},
          },
          rationale: {type: 'string'},
        },
      },
    },
    thumbnailSuggestions: {
      type: 'array',
      minItems: 1,
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'prompt', 'altText', 'style'],
        properties: {
          id: {type: 'string'},
          prompt: {type: 'string'},
          altText: {type: 'string'},
          style: {type: 'string'},
        },
      },
    },
  },
};

export const renderSeoHtml = onRequest(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 15,
    memory: '256MiB',
    invoker: 'public',
  },
  async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    const requestPath = getRequestPath(request);

    if (isStaticAssetRequest(requestPath)) {
      response
        .status(404)
        .set('Cache-Control', 'public, max-age=60')
        .set('Content-Type', 'text/plain; charset=utf-8')
        .send(request.method === 'HEAD' ? '' : 'Not Found');
      return;
    }

    try {
      const metadata = await createSeoMetadataForPath(requestPath);
      const html = injectSeoMetadata(readSeoIndexTemplate(), metadata);

      response
        .status(metadata.statusCode ?? 200)
        .set('Cache-Control', metadata.cacheControl ?? 'public, max-age=300, s-maxage=600')
        .set('Content-Type', 'text/html; charset=utf-8')
        .send(request.method === 'HEAD' ? '' : html);
    } catch (error) {
      logger.error('Unable to render SEO HTML shell.', {error});
      const fallbackMetadata = createHomeSeoMetadata();
      const html = injectSeoMetadata(readSeoIndexTemplate(), fallbackMetadata);

      response
        .status(200)
        .set('Cache-Control', 'public, max-age=60, s-maxage=60')
        .set('Content-Type', 'text/html; charset=utf-8')
        .send(request.method === 'HEAD' ? '' : html);
    }
  }
);

export const sitemapXml = onRequest(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 15,
    memory: '256MiB',
    invoker: 'public',
  },
  async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const xml = await createSitemapXml();

      response
        .status(200)
        .set('Cache-Control', SITEMAP_CACHE_CONTROL)
        .set('Content-Type', 'application/xml; charset=utf-8')
        .send(request.method === 'HEAD' ? '' : xml);
    } catch (error) {
      logger.error('Unable to render sitemap.xml.', {error});
      const fallbackXml = renderSitemapXml(createStaticSitemapUrls());

      response
        .status(200)
        .set('Cache-Control', 'public, max-age=60, s-maxage=60')
        .set('Content-Type', 'application/xml; charset=utf-8')
        .send(request.method === 'HEAD' ? '' : fallbackXml);
    }
  }
);

export const rssFeed = onRequest(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 15,
    memory: '256MiB',
    invoker: 'public',
  },
  async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const posts = await fetchPublishedFeedBlogPosts();
      const xml = renderRssFeed(posts);

      response
        .status(200)
        .set('Cache-Control', FEED_CACHE_CONTROL)
        .set('Content-Type', 'application/rss+xml; charset=utf-8')
        .send(request.method === 'HEAD' ? '' : xml);
    } catch (error) {
      logger.error('Unable to render RSS feed.', {error});

      response
        .status(503)
        .set('Cache-Control', 'public, max-age=60, s-maxage=60')
        .set('Content-Type', 'text/plain; charset=utf-8')
        .send(request.method === 'HEAD' ? '' : 'Unable to render RSS feed.');
    }
  }
);

export const jsonFeed = onRequest(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 15,
    memory: '256MiB',
    invoker: 'public',
  },
  async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const posts = await fetchPublishedFeedBlogPosts();
      const feed = renderJsonFeed(posts);

      response
        .status(200)
        .set('Cache-Control', FEED_CACHE_CONTROL)
        .set('Content-Type', 'application/feed+json; charset=utf-8')
        .send(request.method === 'HEAD' ? '' : feed);
    } catch (error) {
      logger.error('Unable to render JSON feed.', {error});

      response
        .status(503)
        .set('Cache-Control', 'public, max-age=60, s-maxage=60')
        .set('Content-Type', 'text/plain; charset=utf-8')
        .send(request.method === 'HEAD' ? '' : 'Unable to render JSON feed.');
    }
  }
);

export const getLatestYouTubeVideos = onCall(
  {
    region: FUNCTION_REGION,
    secrets: [youtubeApiKey],
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    const maxResults = parseYoutubeMaxResults(request.data);

    return await loadLatestYoutubeVideos(maxResults);
  }
);

export const getLatestYouTubeVideosHttp = onRequest(
  {
    region: FUNCTION_REGION,
    secrets: [youtubeApiKey],
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async (request, response) => {
    if (request.method !== 'GET') {
      response.status(405).json({error: 'Use GET for this browser-test endpoint.'});
      return;
    }

    try {
      const feed = await loadLatestYoutubeVideos(parseYoutubeMaxResults(request.query['maxResults']));
      response.status(200).json(feed);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load latest YouTube videos.';
      logger.error('Unable to load latest YouTube videos over HTTP.', {error});
      response.status(getHttpStatusCode(error)).json({error: message});
    }
  }
);

export const generateBlogMetadata = onCall(
  {
    region: FUNCTION_REGION,
    secrets: [openAiApiKey],
    timeoutSeconds: 60,
    memory: '512MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    requireCmsAccess(request.auth);
    const context = parseAssistantContext(request.data);
    const response = await callOpenAiResponses(context);
    const parsed = parseAssistantResult(response);

    return {
      generatedAt: new Date().toISOString(),
      source: 'backend',
      suggestions: parsed.suggestions,
      thumbnailSuggestions: parsed.thumbnailSuggestions,
    } satisfies BlogAssistantResult;
  }
);

export const generateAndStoreBlogThumbnail = onCall(
  {
    region: FUNCTION_REGION,
    secrets: [openAiApiKey],
    timeoutSeconds: 300,
    memory: '1GiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    requireCmsAccess(request.auth);
    const data = parseThumbnailRequest(request.data);
    const model = openAiImageModel.value();
    const image = await generateImage(data.prompt, model);
    return await storeThumbnailImage(data, image, model);
  }
);

export const listAdminUsers = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    requireUserManagementAdmin(request.auth);

    const {pageSize, pageToken} = parseListUsersRequest(request.data);
    const auth = getAuth();
    const result = await auth.listUsers(pageSize, pageToken ?? undefined);

    return {
      users: result.users.map(toAdminManagedUser),
      nextPageToken: result.pageToken ?? null,
      fetchedAt: new Date().toISOString(),
    } satisfies AdminUsersResponse;
  }
);

export const updateAdminUserRoles = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    const actorUid = requireUserManagementAdmin(request.auth);
    const {uid, roles} = parseUpdateUserRolesRequest(request.data);

    if (actorUid === uid && !roles.includes('admin')) {
      throw new HttpsError('failed-precondition', 'You cannot remove your own admin role from User Management.');
    }

    const auth = getAuth();
    const user = await auth.getUser(uid);
    const nextClaims = createClaimsWithRoles(user.customClaims ?? {}, roles);

    await auth.setCustomUserClaims(uid, nextClaims);

    const updatedUser = await auth.getUser(uid);
    logger.info('Updated managed user roles.', {
      actorUid,
      targetUid: uid,
      roles,
    });

    return {
      user: toAdminManagedUser(updatedUser),
      updatedAt: new Date().toISOString(),
    } satisfies UpdateAdminUserRolesResponse;
  }
);

function parseYoutubeMaxResults(value: unknown): number {
  const maxResults = isRecord(value) ? value['maxResults'] : value;
  const parsedMaxResults = typeof maxResults === 'string' ? Number(maxResults) : maxResults;

  if (typeof parsedMaxResults !== 'number' || !Number.isFinite(parsedMaxResults)) {
    return YOUTUBE_DEFAULT_MAX_RESULTS;
  }

  return Math.min(YOUTUBE_MAX_RESULTS, Math.max(1, Math.trunc(parsedMaxResults)));
}

async function loadLatestYoutubeVideos(maxResults: number): Promise<YoutubeFeedResponse> {
  const channelId = youtubeChannelId.value().trim();

  if (!channelId) {
    throw new HttpsError('failed-precondition', 'YOUTUBE_CHANNEL_ID is not configured for the YouTube feed.');
  }

  const cacheKey = `${channelId}:${maxResults}`;
  const now = Date.now();

  if (youtubeFeedCache?.key === cacheKey && youtubeFeedCache.expiresAt > now) {
    return youtubeFeedCache.response;
  }

  const channel = await fetchYoutubeChannelDetails(channelId);
  const videos = await fetchYoutubeUploads(channel.uploadsPlaylistId, maxResults);
  const response = {
    fetchedAt: new Date().toISOString(),
    source: 'youtube-api',
    channelId: channel.channelId,
    channelTitle: channel.channelTitle,
    channelUrl: `https://www.youtube.com/channel/${channel.channelId}`,
    videos,
  } satisfies YoutubeFeedResponse;

  youtubeFeedCache = {
    key: cacheKey,
    expiresAt: now + YOUTUBE_FEED_CACHE_MS,
    response,
  };

  return response;
}

function getHttpStatusCode(error: unknown): number {
  if (error instanceof HttpsError) {
    if (error.code === 'failed-precondition') {
      return 412;
    }

    if (error.code === 'invalid-argument') {
      return 400;
    }
  }

  return 500;
}

async function createSeoMetadataForPath(path: string): Promise<SeoMetadata> {
  const normalizedPath = normalizeSeoPath(path);

  if (normalizedPath === '/') {
    return createHomeSeoMetadata();
  }

  if (normalizedPath === '/blog') {
    const posts = await fetchPublishedFeedBlogPosts();

    return createBlogIndexSeoMetadata(posts);
  }

  if (normalizedPath === '/blog/search') {
    return createBlogSearchSeoMetadata();
  }

  if (normalizedPath === '/search') {
    return createSiteSearchSeoMetadata();
  }

  if (normalizedPath.startsWith('/blog/category/')) {
    const category = decodeSlugSegment(normalizedPath.slice('/blog/category/'.length));
    const posts = await fetchPublishedSitemapBlogPosts();

    return createBlogCategorySeoMetadata(category, getTaxonomyPostCount(posts, category));
  }

  if (normalizedPath.startsWith('/blog/tag/')) {
    const tag = decodeSlugSegment(normalizedPath.slice('/blog/tag/'.length));
    const posts = await fetchPublishedSitemapBlogPosts();

    return createBlogTagSeoMetadata(tag, getTagPostCount(posts, tag));
  }

  if (normalizedPath.startsWith('/topics/')) {
    const slug = decodeSlugSegment(normalizedPath.slice('/topics/'.length));
    const topicHub = getTopicHubBySlug(slug);

    if (topicHub) {
      return createTopicHubSeoMetadata(topicHub);
    }
  }

  if (normalizedPath.startsWith('/blog/preview/')) {
    const previewToken = decodeSlugSegment(normalizedPath.slice('/blog/preview/'.length));
    const post = await fetchPreviewSeoBlogPost(previewToken);

    if (post) {
      return createBlogPreviewSeoMetadata(post, previewToken);
    }

    return createMissingBlogPostSeoMetadata('preview');
  }

  if (normalizedPath.startsWith('/blog/')) {
    const slug = decodeSlugSegment(normalizedPath.slice('/blog/'.length));
    const post = await fetchPublishedSeoBlogPost(slug);

    if (post) {
      return createBlogPostSeoMetadata(post);
    }

    return createMissingBlogPostSeoMetadata(slug);
  }

  if (normalizedPath === '/labs') {
    return createStaticSeoMetadata({
      title: 'Projects & Labs | ColinMichaels.com',
      description: 'Interactive demos, frontend experiments, reusable OS-style interface systems, and public project notes from Colin Michaels.',
      path: '/labs',
      imageAlt: 'Colin Michaels projects and labs preview card',
    });
  }

  if (normalizedPath === '/background') {
    return createStaticSeoMetadata({
      title: 'Full Screen Background Lab | ColinMichaels.com',
      description: 'A visual lab for image, video, overlay, and parallax background experiments.',
      path: '/background',
      imageAlt: 'Colin Michaels visual background lab preview card',
    });
  }

  if (normalizedPath === '/admin/cms/media-library') {
    return createStaticSeoMetadata({
      title: 'CMS Media Library | ColinMichaels.com',
      description: 'Protected CMS media management for Firebase-backed blog assets.',
      path: '/admin/cms/media-library',
      imageAlt: 'Colin Michaels CMS media library preview card',
      robots: 'noindex,nofollow',
    });
  }

  if (normalizedPath === '/admin/users') {
    return createStaticSeoMetadata({
      title: 'User Management | ColinMichaels.com',
      description: 'Protected admin user role and permission management.',
      path: '/admin/users',
      imageAlt: 'Colin Michaels admin user management preview card',
      robots: 'noindex,nofollow',
    });
  }

  if (normalizedPath === '/logout') {
    return createStaticSeoMetadata({
      title: 'Sign Out | ColinMichaels.com',
      description: 'End the current ColinMichaels.com authenticated session.',
      path: '/logout',
      imageAlt: 'Colin Michaels sign out page preview card',
      robots: 'noindex,nofollow',
    });
  }

  if (normalizedPath === '/profile') {
    return createStaticSeoMetadata({
      title: 'Profile | ColinMichaels.com',
      description: 'Signed-in user account profile, roles, and permissions.',
      path: '/profile',
      imageAlt: 'Colin Michaels profile page preview card',
      robots: 'noindex,nofollow',
    });
  }

  if (isOsRoute(normalizedPath)) {
    return createNoindexRouteSeoMetadata({
      title: 'Core OS Route | ColinMichaels.com',
      description: 'Protected OS-style route for ColinMichaels.com desktop experiments.',
      path: normalizedPath,
      imageAlt: 'Colin Michaels Core OS route preview card',
    });
  }

  if (isAdminRoute(normalizedPath)) {
    return createNoindexRouteSeoMetadata({
      title: 'Admin Route | ColinMichaels.com',
      description: 'Protected ColinMichaels.com administration route.',
      path: normalizedPath,
      imageAlt: 'Colin Michaels admin route preview card',
    });
  }

  return createNotFoundSeoMetadata(normalizedPath);
}

async function createSitemapXml(): Promise<string> {
  const posts = await fetchPublishedSitemapBlogPosts();
  const latestPostUpdate = getLatestIsoDate(posts.map(post => post.updatedAt || post.publishedAt).filter(isNonEmptyString));
  const urls = [
    ...createStaticSitemapUrls(latestPostUpdate),
    ...createSitemapTaxonomyUrls(posts),
    ...createSitemapTagUrls(posts),
    ...TOPIC_HUBS.map(topicHub => ({
      path: `/topics/${topicHub.slug}`,
      lastmod: latestPostUpdate,
      changefreq: 'weekly',
      priority: 0.7,
    } satisfies SitemapUrl)),
    ...posts.map(post => ({
      path: `/blog/${createSeoSlug(post.slug)}`,
      lastmod: getLatestIsoDate([post.updatedAt, post.publishedAt].filter(isNonEmptyString)),
      changefreq: 'monthly',
      priority: 0.7,
    } satisfies SitemapUrl)),
  ];

  const uniqueUrls = uniqueSitemapUrls(urls);

  if (uniqueUrls.length > SITEMAP_REVIEW_URL_LIMIT) {
    logger.warn('Sitemap URL count exceeds review threshold.', {
      urlCount: uniqueUrls.length,
      reviewLimit: SITEMAP_REVIEW_URL_LIMIT,
    });
  }

  return renderSitemapXml(uniqueUrls);
}

function createStaticSitemapUrls(blogLastmod?: string): readonly SitemapUrl[] {
  return [
    {
      path: '/',
      changefreq: 'weekly',
      priority: 1.0,
    },
    {
      path: '/blog',
      lastmod: blogLastmod,
      changefreq: 'weekly',
      priority: 0.8,
    },
    {
      path: '/labs',
      changefreq: 'monthly',
      priority: 0.6,
    },
    {
      path: '/background',
      changefreq: 'monthly',
      priority: 0.5,
    },
  ];
}

function createSitemapTaxonomyUrls(posts: readonly SitemapBlogPostDocument[]): readonly SitemapUrl[] {
  const categoryLastmod = new Map<string, string>();
  const categoryCounts = new Map<string, number>();

  for (const post of posts) {
    const lastmod = getLatestIsoDate([post.updatedAt, post.publishedAt].filter(isNonEmptyString));

    for (const category of getSitemapTaxonomyTerms(post)) {
      const slug = createBlogCategorySlug(category);
      const existingLastmod = categoryLastmod.get(slug);
      const latestLastmod = getLatestIsoDate([existingLastmod, lastmod].filter(isNonEmptyString));

      categoryLastmod.set(slug, latestLastmod ?? existingLastmod ?? lastmod ?? '');
      categoryCounts.set(slug, (categoryCounts.get(slug) ?? 0) + 1);
    }
  }

  return Array.from(categoryLastmod.entries())
    .filter(([slug]) => slug.length > 0 && (categoryCounts.get(slug) ?? 0) >= TAXONOMY_SITEMAP_MIN_POSTS)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([slug, lastmod]) => ({
      path: `/blog/category/${slug}`,
      lastmod: lastmod || undefined,
      changefreq: 'weekly',
      priority: 0.6,
    }));
}

function createSitemapTagUrls(posts: readonly SitemapBlogPostDocument[]): readonly SitemapUrl[] {
  const tagLastmod = new Map<string, string>();
  const tagCounts = new Map<string, number>();

  for (const post of posts) {
    const lastmod = getLatestIsoDate([post.updatedAt, post.publishedAt].filter(isNonEmptyString));

    for (const tag of post.tags) {
      const slug = createBlogTagSlug(tag);
      const existingLastmod = tagLastmod.get(slug);
      const latestLastmod = getLatestIsoDate([existingLastmod, lastmod].filter(isNonEmptyString));

      tagLastmod.set(slug, latestLastmod ?? existingLastmod ?? lastmod ?? '');
      tagCounts.set(slug, (tagCounts.get(slug) ?? 0) + 1);
    }
  }

  return Array.from(tagLastmod.entries())
    .filter(([slug]) => slug.length > 0 && (tagCounts.get(slug) ?? 0) >= TAG_SITEMAP_MIN_POSTS)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([slug, lastmod]) => ({
      path: `/blog/tag/${slug}`,
      lastmod: lastmod || undefined,
      changefreq: 'weekly',
      priority: 0.5,
    }));
}

async function fetchPublishedSitemapBlogPosts(): Promise<readonly SitemapBlogPostDocument[]> {
  const snapshot = await getFirestore()
    .collection('posts')
    .where('status', '==', 'published')
    .get();

  return snapshot.docs
    .map(document => toSitemapBlogPostDocument(document.data()))
    .filter((post): post is SitemapBlogPostDocument => post !== null)
    .sort((left, right) => {
      const rightDate = getLatestIsoDate([right.updatedAt, right.publishedAt].filter(isNonEmptyString)) ?? '';
      const leftDate = getLatestIsoDate([left.updatedAt, left.publishedAt].filter(isNonEmptyString)) ?? '';

      return rightDate.localeCompare(leftDate) || left.slug.localeCompare(right.slug);
    });
}

function toSitemapBlogPostDocument(value: unknown): SitemapBlogPostDocument | null {
  if (!isRecord(value)) {
    return null;
  }

  const slug = getTrimmedString(value['slug']);

  if (!slug) {
    return null;
  }

  return {
    slug,
    categories: getStringArrayValue(value['categories']),
    subcategories: getStringArrayValue(value['subcategories']),
    tags: getStringArrayValue(value['tags']),
    updatedAt: getIsoString(value['updatedAt']),
    publishedAt: getIsoString(value['publishedAt']) || null,
  };
}

function getSitemapTaxonomyTerms(post: SitemapBlogPostDocument): readonly string[] {
  return uniqueStrings([...post.categories, ...post.subcategories]);
}

async function fetchPublishedFeedBlogPosts(): Promise<readonly SeoBlogPostDocument[]> {
  const snapshot = await getFirestore()
    .collection('posts')
    .where('status', '==', 'published')
    .get();

  return snapshot.docs
    .map(document => toSeoBlogPostDocument(document.data()))
    .filter((post): post is SeoBlogPostDocument => post !== null)
    .sort((left, right) => {
      const rightDate = getLatestIsoDate([right.updatedAt, right.publishedAt].filter(isNonEmptyString)) ?? '';
      const leftDate = getLatestIsoDate([left.updatedAt, left.publishedAt].filter(isNonEmptyString)) ?? '';

      return rightDate.localeCompare(leftDate) || left.slug.localeCompare(right.slug);
    });
}

function renderRssFeed(posts: readonly SeoBlogPostDocument[]): string {
  const latestPostUpdate = getLatestIsoDate(posts.map(post => post.updatedAt || post.publishedAt).filter(isNonEmptyString));
  const items = posts
    .map(post => renderRssFeedItem(post))
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">',
    '  <channel>',
    `    <title>${escapeXml(`${SITE_NAME} Blog`)}</title>`,
    `    <link>${escapeXml(createAbsoluteUrl('/blog'))}</link>`,
    `    <description>${escapeXml(BLOG_FEED_DESCRIPTION)}</description>`,
    `    <language>${escapeXml(DEFAULT_LOCALE.replace('_', '-'))}</language>`,
    latestPostUpdate ? `    <lastBuildDate>${escapeXml(toRfc822Date(latestPostUpdate))}</lastBuildDate>` : '',
    `    <atom:link href="${escapeXml(createAbsoluteUrl('/feed.xml'))}" rel="self" type="application/rss+xml"/>`,
    `    <image><url>${escapeXml(createAbsoluteUrl(HOMEPAGE_OG_IMAGE))}</url><title>${escapeXml(`${SITE_NAME} Blog`)}</title><link>${escapeXml(createAbsoluteUrl('/blog'))}</link></image>`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].filter(line => line.length > 0).join('\n');
}

function renderRssFeedItem(post: SeoBlogPostDocument): string {
  const metadata = createBlogPostFeedMetadata(post);
  const categories = metadata.tags
    .map(tag => `      <category>${escapeXml(tag)}</category>`)
    .join('\n');
  const image = metadata.image
    ? `      <media:content url="${escapeXml(metadata.image)}" medium="image" type="${escapeXml(getImageMimeType(metadata.image))}" width="${metadata.imageWidth}" height="${metadata.imageHeight}"/>`
    : '';

  return [
    '    <item>',
    `      <title>${escapeXml(metadata.title)}</title>`,
    `      <link>${escapeXml(metadata.url)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(metadata.url)}</guid>`,
    `      <description>${escapeXml(metadata.description)}</description>`,
    `      <author>${escapeXml(`noreply@colinmichaels.com (${metadata.author})`)}</author>`,
    `      <pubDate>${escapeXml(toRfc822Date(metadata.publishedAt))}</pubDate>`,
    `      <atom:updated>${escapeXml(metadata.modifiedAt)}</atom:updated>`,
    categories,
    image,
    '    </item>',
  ].filter(line => line.length > 0).join('\n');
}

function renderJsonFeed(posts: readonly SeoBlogPostDocument[]): string {
  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: `${SITE_NAME} Blog`,
    home_page_url: createAbsoluteUrl('/blog'),
    feed_url: createAbsoluteUrl('/feed.json'),
    description: BLOG_FEED_DESCRIPTION,
    language: DEFAULT_LOCALE.replace('_', '-'),
    icon: createAbsoluteUrl(HOMEPAGE_OG_IMAGE),
    favicon: createAbsoluteUrl('/favicon.ico'),
    authors: [
      {
        name: 'Colin Michaels',
        url: SITE_URL,
      },
    ],
    items: posts.map(post => {
      const metadata = createBlogPostFeedMetadata(post);

      return {
        id: metadata.url,
        url: metadata.url,
        title: metadata.title,
        summary: metadata.description,
        content_text: metadata.description,
        image: metadata.image,
        date_published: metadata.publishedAt,
        date_modified: metadata.modifiedAt,
        authors: [
          {
            name: metadata.author,
            url: SITE_URL,
          },
        ],
        tags: metadata.tags,
      };
    }),
  };

  return `${JSON.stringify(feed, null, 2)}\n`;
}

function createBlogPostFeedMetadata(post: SeoBlogPostDocument): {
  title: string;
  description: string;
  url: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  author: string;
  tags: readonly string[];
  publishedAt: string;
  modifiedAt: string;
} {
  const title = stripHtml(post.ogTitle || post.seoTitle || post.title);
  const description = truncateDescription(stripHtml(post.ogDescription || post.seoDescription || post.excerpt));
  const image = createAbsoluteUrl(toOpenGraphCompatibleImage(post.seoOpenGraphImage || post.ogImage || post.thumbnailImage || post.coverImage || HOMEPAGE_OG_IMAGE));
  const imageWidth = post.seoOpenGraphImageWidth ?? post.ogImageWidth ?? DEFAULT_OG_IMAGE_WIDTH;
  const imageHeight = post.seoOpenGraphImageHeight ?? post.ogImageHeight ?? DEFAULT_OG_IMAGE_HEIGHT;
  const url = post.seoCanonical || createAbsoluteUrl(`/blog/${post.slug}`);
  const publishedAt = post.publishedAt ?? post.updatedAt;

  return {
    title,
    description,
    url,
    image,
    imageWidth,
    imageHeight,
    author: post.authorName,
    tags: uniqueStrings([...post.categories, ...post.tags]),
    publishedAt,
    modifiedAt: post.updatedAt,
  };
}

function renderSitemapXml(urls: readonly SitemapUrl[]): string {
  const entries = uniqueSitemapUrls(urls)
    .map(url => [
      '  <url>',
      `    <loc>${escapeXml(createAbsoluteUrl(url.path))}</loc>`,
      url.lastmod ? `    <lastmod>${escapeXml(url.lastmod)}</lastmod>` : '',
      url.changefreq ? `    <changefreq>${escapeXml(url.changefreq)}</changefreq>` : '',
      typeof url.priority === 'number' ? `    <priority>${url.priority.toFixed(1)}</priority>` : '',
      '  </url>',
    ].filter(Boolean).join('\n'))
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
    '',
  ].join('\n');
}

function uniqueSitemapUrls(urls: readonly SitemapUrl[]): readonly SitemapUrl[] {
  const seen = new Set<string>();
  const uniqueUrls: SitemapUrl[] = [];

  for (const url of urls) {
    const path = normalizeSeoPath(url.path);

    if (seen.has(path)) {
      continue;
    }

    seen.add(path);
    uniqueUrls.push({...url, path});
  }

  return uniqueUrls;
}

function createHomeSeoMetadata(): SeoMetadata {
  return {
    title: HOMEPAGE_TITLE,
    description: HOMEPAGE_DESCRIPTION,
    path: '/',
    image: HOMEPAGE_OG_IMAGE,
    imageAlt: 'Colin Michaels personal site preview card',
    type: 'website',
    structuredData: createHomeJsonLd(),
    cacheControl: 'public, max-age=600, s-maxage=3600',
  };
}

function createBlogIndexSeoMetadata(posts: readonly SeoBlogPostDocument[]): SeoMetadata {
  return {
    ...createStaticSeoMetadata({
    title: 'Blog | ColinMichaels.com',
    description: 'Notes on frontend engineering, Angular architecture, Firebase, CMS workflows, and web systems.',
    path: '/blog',
    imageAlt: 'Colin Michaels blog preview card',
    }),
    fallbackHtml: renderBlogIndexFallbackHtml(posts),
  };
}

function createBlogSearchSeoMetadata(): SeoMetadata {
  return createStaticSeoMetadata({
    title: 'Search Blog | ColinMichaels.com',
    description: 'Search Colin Michaels blog posts by title, excerpt, category, tag, and article body text.',
    path: '/blog/search',
    imageAlt: 'Colin Michaels blog search preview card',
    robots: 'noindex,follow',
  });
}

function createSiteSearchSeoMetadata(): SeoMetadata {
  return createStaticSeoMetadata({
    title: 'Search | ColinMichaels.com',
    description: 'Search Colin Michaels blog posts, categories, tags, article body text, and public site pages.',
    path: '/search',
    imageAlt: 'Colin Michaels site search preview card',
    robots: 'noindex,follow',
  });
}

function createBlogCategorySeoMetadata(category: string, postCount: number): SeoMetadata {
  const categoryTitle = createTitleFromSlug(category || 'blog-category');

  return createStaticSeoMetadata({
    title: `${categoryTitle} Posts | ColinMichaels.com`,
    description: `Published Colin Michaels blog posts in the ${categoryTitle} category.`,
    path: `/blog/category/${createSeoSlug(categoryTitle)}`,
    imageAlt: `${categoryTitle} blog category preview card`,
    robots: postCount >= TAXONOMY_SITEMAP_MIN_POSTS ? undefined : 'noindex,follow',
  });
}

function createBlogTagSeoMetadata(tag: string, postCount: number): SeoMetadata {
  const tagTitle = createTitleFromSlug(tag || 'blog-tag');

  return createStaticSeoMetadata({
    title: `${tagTitle} Articles | ColinMichaels.com`,
    description: `Published Colin Michaels blog posts tagged ${tagTitle}.`,
    path: `/blog/tag/${createBlogTagSlug(tagTitle)}`,
    imageAlt: `${tagTitle} blog tag preview card`,
    robots: postCount >= TAG_SITEMAP_MIN_POSTS ? undefined : 'noindex,follow',
  });
}

function createMissingBlogPostSeoMetadata(slug: string): SeoMetadata {
  return {
    title: 'Post not found | ColinMichaels.com',
    description: 'This post is unavailable or has not been published.',
    path: `/blog/${createSeoSlug(slug)}`,
    image: HOMEPAGE_OG_IMAGE,
    imageAlt: 'Colin Michaels blog preview card',
    type: 'website',
    robots: 'noindex,nofollow',
    statusCode: 404,
    cacheControl: 'public, max-age=60, s-maxage=60',
  };
}

function createNotFoundSeoMetadata(path: string): SeoMetadata {
  return {
    title: 'Page not found | ColinMichaels.com',
    description: 'This page could not be found on ColinMichaels.com.',
    path,
    image: HOMEPAGE_OG_IMAGE,
    imageAlt: 'Colin Michaels page not found preview card',
    type: 'website',
    robots: 'noindex,follow',
    statusCode: 404,
    cacheControl: 'public, max-age=60, s-maxage=60',
  };
}

function createNoindexRouteSeoMetadata(options: {
  title: string;
  description: string;
  path: string;
  imageAlt: string;
}): SeoMetadata {
  return createStaticSeoMetadata({
    ...options,
    robots: 'noindex,nofollow',
  });
}

function createStaticSeoMetadata(options: {
  title: string;
  description: string;
  path: string;
  imageAlt: string;
  robots?: string;
}): SeoMetadata {
  return {
    title: options.title,
    description: options.description,
    path: options.path,
    image: HOMEPAGE_OG_IMAGE,
    imageAlt: options.imageAlt,
    type: 'website',
    robots: options.robots,
  };
}

function createTopicHubSeoMetadata(topicHub: typeof TOPIC_HUBS[number]): SeoMetadata {
  return {
    title: topicHub.title,
    description: topicHub.description,
    path: `/topics/${topicHub.slug}`,
    image: HOMEPAGE_OG_IMAGE,
    imageAlt: topicHub.imageAlt,
    type: 'website',
    structuredData: createTopicHubJsonLd(topicHub),
    fallbackHtml: renderTopicHubFallbackHtml(topicHub),
  };
}

function getTopicHubBySlug(slug: string): typeof TOPIC_HUBS[number] | undefined {
  const normalizedSlug = createSeoSlug(slug);

  return TOPIC_HUBS.find(topicHub => topicHub.slug === normalizedSlug);
}

function isOsRoute(path: string): boolean {
  return OS_ROUTES.includes(path as typeof OS_ROUTES[number])
    || OS_ROUTE_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

function isAdminRoute(path: string): boolean {
  return ADMIN_ROUTE_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

function getTaxonomyPostCount(posts: readonly SitemapBlogPostDocument[], category: string): number {
  const slug = createBlogCategorySlug(category);

  return posts.filter(post => getSitemapTaxonomyTerms(post).some(term => createBlogCategorySlug(term) === slug)).length;
}

function getTagPostCount(posts: readonly SitemapBlogPostDocument[], tag: string): number {
  const slug = createBlogTagSlug(tag);

  return posts.filter(post => post.tags.some(postTag => createBlogTagSlug(postTag) === slug)).length;
}

function createBlogPostSeoMetadata(post: SeoBlogPostDocument): SeoMetadata {
  const title = stripHtml(post.ogTitle || post.seoTitle || post.title);
  const description = truncateDescription(stripHtml(post.ogDescription || post.seoDescription || post.excerpt));
  const image = toOpenGraphCompatibleImage(post.seoOpenGraphImage || post.ogImage || post.thumbnailImage || post.coverImage || HOMEPAGE_OG_IMAGE);
  const imageWidth = post.seoOpenGraphImageWidth ?? post.ogImageWidth ?? DEFAULT_OG_IMAGE_WIDTH;
  const imageHeight = post.seoOpenGraphImageHeight ?? post.ogImageHeight ?? DEFAULT_OG_IMAGE_HEIGHT;
  const url = post.seoCanonical || createAbsoluteUrl(`/blog/${post.slug}`);

  return {
    title,
    description,
    path: `/blog/${post.slug}`,
    image,
    imageAlt: post.ogImageAlt || post.imageAlt || `${title} preview image`,
    imageWidth,
    imageHeight,
    type: 'article',
    article: {
      publishedAt: post.publishedAt ?? post.updatedAt,
      modifiedAt: post.updatedAt,
      author: post.authorName,
      section: post.categories[0],
      tags: post.tags,
    },
    structuredData: createBlogPostingJsonLd({
      title,
      description,
      url,
      image: createAbsoluteUrl(image),
      author: post.authorName,
      publishedAt: post.publishedAt,
      modifiedAt: post.updatedAt,
    }),
    fallbackHtml: renderBlogPostFallbackHtml(post, {title, description, image}),
  };
}

function createBlogPreviewSeoMetadata(post: SeoBlogPostDocument, previewToken: string): SeoMetadata {
  const title = stripHtml(post.ogTitle || post.seoTitle || post.title);
  const description = truncateDescription(stripHtml(post.ogDescription || post.seoDescription || post.excerpt));
  const image = toOpenGraphCompatibleImage(post.seoOpenGraphImage || post.ogImage || post.thumbnailImage || post.coverImage || HOMEPAGE_OG_IMAGE);
  const imageWidth = post.seoOpenGraphImageWidth ?? post.ogImageWidth ?? DEFAULT_OG_IMAGE_WIDTH;
  const imageHeight = post.seoOpenGraphImageHeight ?? post.ogImageHeight ?? DEFAULT_OG_IMAGE_HEIGHT;

  return {
    title,
    description,
    path: `/blog/preview/${previewToken}`,
    image,
    imageAlt: post.ogImageAlt || post.imageAlt || `${title} preview image`,
    imageWidth,
    imageHeight,
    type: 'article',
    robots: 'noindex,nofollow',
    article: {
      modifiedAt: post.updatedAt,
      author: post.authorName,
      section: post.categories[0],
      tags: post.tags,
    },
  };
}

async function fetchPublishedSeoBlogPost(slug: string): Promise<SeoBlogPostDocument | null> {
  if (!slug) {
    return null;
  }

  const snapshot = await getFirestore()
    .collection('posts')
    .where('slug', '==', slug)
    .where('status', '==', 'published')
    .limit(1)
    .get();
  const document = snapshot.docs[0];

  if (!document) {
    return null;
  }

  return toSeoBlogPostDocument(document.data());
}

async function fetchPreviewSeoBlogPost(previewToken: string): Promise<SeoBlogPostDocument | null> {
  if (!previewToken) {
    return null;
  }

  const document = await getFirestore()
    .collection('postPreviews')
    .doc(previewToken)
    .get();
  const value = document.data();

  if (!isRecord(value) || typeof value['expiresAtMillis'] !== 'number' || value['expiresAtMillis'] <= Date.now()) {
    return null;
  }

  const post = isRecord(value['post']) ? value['post'] : null;

  if (!post || getTrimmedString(post['status']) !== 'draft') {
    return null;
  }

  return toSeoBlogPostDocument(post);
}

function toSeoBlogPostDocument(value: unknown): SeoBlogPostDocument | null {
  if (!isRecord(value)) {
    return null;
  }

  const seo = isRecord(value['seo']) ? value['seo'] : {};
  const og = isRecord(value['og']) ? value['og'] : {};
  const rawAuthor = value['author'];
  const author = isRecord(rawAuthor) ? rawAuthor : {};
  const blocks = Array.isArray(value['blocks']) ? value['blocks'] : [];
  const title = getTrimmedString(value['title']);
  const slug = getTrimmedString(value['slug']);

  if (!title || !slug) {
    return null;
  }

  return {
    slug,
    title,
    excerpt: getTrimmedString(value['excerpt']),
    coverImage: getTrimmedString(value['coverImage']),
    thumbnailImage: getTrimmedString(value['thumbnailImage']),
    authorName: getTrimmedString(author['name']) || getTrimmedString(rawAuthor) || 'Colin Michaels',
    categories: getStringArrayValue(value['categories']),
    tags: getStringArrayValue(value['tags']),
    seoTitle: getTrimmedString(seo['title']) || getTrimmedString(seo['metaTitle']),
    seoDescription: getTrimmedString(seo['description']) || getTrimmedString(seo['metaDescription']),
    seoCanonical: getTrimmedString(seo['canonical']),
    seoOpenGraphImage: getTrimmedString(seo['openGraphImage']),
    seoOpenGraphImageWidth: getPositiveInteger(seo['openGraphImageWidth']),
    seoOpenGraphImageHeight: getPositiveInteger(seo['openGraphImageHeight']),
    ogTitle: getTrimmedString(og['title']),
    ogDescription: getTrimmedString(og['description']),
    ogImage: getTrimmedString(og['image']),
    ogImageAlt: getTrimmedString(og['imageAlt']),
    ogImageWidth: getPositiveInteger(og['imageWidth']) ?? getPositiveInteger(og['width']),
    ogImageHeight: getPositiveInteger(og['imageHeight']) ?? getPositiveInteger(og['height']),
    updatedAt: getIsoString(value['updatedAt']) || new Date(0).toISOString(),
    publishedAt: getIsoString(value['publishedAt']) || null,
    imageAlt: getFirstImageAlt(blocks),
    blocks: blocks
      .filter(isBlogContentBlock)
      .map(block => ({
        id: block.id,
        type: block.type,
        data: block.data,
      })),
  };
}

function injectSeoMetadata(template: string, metadata: SeoMetadata): string {
  const tags = renderSeoTags(metadata);
  const cleanedTemplate = template
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+(?:name|property)=["'](?:description|robots|twitter:[^"']+|og:[^"']+|article:[^"']+)["'][^>]*>\s*/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<script[^>]*id=["']seo-json-ld["'][\s\S]*?<\/script>\s*/gi, '');

  return injectFallbackHtml(cleanedTemplate.replace(/<\/head>/i, `${tags}\n</head>`), metadata.fallbackHtml);
}

function injectFallbackHtml(template: string, fallbackHtml: string | undefined): string {
  if (!fallbackHtml) {
    return template;
  }

  return template.replace(/<app-root>\s*<\/app-root>/i, `<app-root>\n${fallbackHtml}\n</app-root>`);
}

function renderSeoTags(metadata: SeoMetadata): string {
  const url = createAbsoluteUrl(metadata.path);
  const image = createAbsoluteUrl(metadata.image);
  const robots = metadata.robots ?? 'index,follow';
  const imageWidth = String(metadata.imageWidth ?? DEFAULT_OG_IMAGE_WIDTH);
  const imageHeight = String(metadata.imageHeight ?? DEFAULT_OG_IMAGE_HEIGHT);
  const tags = [
    `<title>${escapeHtml(metadata.title)}</title>`,
    `<meta name="description" content="${escapeHtml(metadata.description)}">`,
    `<meta name="robots" content="${escapeHtml(robots)}">`,
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    `<link rel="alternate" type="application/rss+xml" title="${escapeHtml(`${SITE_NAME} Blog RSS Feed`)}" href="${escapeHtml(createAbsoluteUrl('/feed.xml'))}">`,
    `<link rel="alternate" type="application/feed+json" title="${escapeHtml(`${SITE_NAME} Blog JSON Feed`)}" href="${escapeHtml(createAbsoluteUrl('/feed.json'))}">`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">`,
    `<meta property="og:locale" content="${escapeHtml(DEFAULT_LOCALE)}">`,
    `<meta property="og:type" content="${escapeHtml(metadata.type)}">`,
    `<meta property="og:title" content="${escapeHtml(metadata.title)}">`,
    `<meta property="og:description" content="${escapeHtml(metadata.description)}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:image:width" content="${escapeHtml(imageWidth)}">`,
    `<meta property="og:image:height" content="${escapeHtml(imageHeight)}">`,
    `<meta property="og:image:url" content="${escapeHtml(image)}">`,
    `<meta property="og:image:secure_url" content="${escapeHtml(image)}">`,
    `<meta property="og:image:type" content="${escapeHtml(getImageMimeType(image))}">`,
    `<meta property="og:image:alt" content="${escapeHtml(metadata.imageAlt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(metadata.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(metadata.description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
    `<meta name="twitter:image:alt" content="${escapeHtml(metadata.imageAlt)}">`,
    ...renderArticleTags(metadata.article),
    renderStructuredDataTag(metadata.structuredData),
  ].filter(tag => tag.length > 0);

  return tags.join('\n  ');
}

function renderArticleTags(article: SeoArticleMetadata | undefined): string[] {
  if (!article) {
    return [];
  }

  const tags = [
    renderOptionalPropertyTag('article:published_time', article.publishedAt),
    renderOptionalPropertyTag('article:modified_time', article.modifiedAt),
    renderOptionalPropertyTag('article:author', article.author),
    renderOptionalPropertyTag('article:section', article.section),
    ...(article.tags ?? []).map(tag => renderOptionalPropertyTag('article:tag', tag)),
  ];

  return tags.filter(tag => tag.length > 0);
}

function renderOptionalPropertyTag(property: string, content: string | undefined): string {
  return content ? `<meta property="${escapeHtml(property)}" content="${escapeHtml(content)}">` : '';
}

function renderStructuredDataTag(data: unknown): string {
  if (!data) {
    return '';
  }

  return `<script id="seo-json-ld" type="application/ld+json">${escapeScriptJson(JSON.stringify(data))}</script>`;
}

function readSeoIndexTemplate(): string {
  if (existsSync(SEO_INDEX_TEMPLATE_PATH)) {
    return readFileSync(SEO_INDEX_TEMPLATE_PATH, 'utf8');
  }

  return `<!doctype html><html lang="en"><head></head><body><app-root></app-root></body></html>`;
}

function getRequestPath(request: { originalUrl?: unknown; path?: unknown }): string {
  const originalUrl = getTrimmedString(request.originalUrl);
  const path = getTrimmedString(request.path);

  if (path && path !== '/') {
    return path;
  }

  if (originalUrl) {
    return originalUrl.split('?')[0] || '/';
  }

  return '/';
}

function normalizeSeoPath(path: string): string {
  const pathname = path.split('?')[0].split('#')[0].trim() || '/';
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const withoutIndex = normalizedPath.endsWith('/index.html')
    ? normalizedPath.slice(0, -'/index.html'.length) || '/'
    : normalizedPath;
  const withoutTrailingSlash = withoutIndex.length > 1 ? withoutIndex.replace(/\/+$/, '') : withoutIndex;

  return withoutTrailingSlash || '/';
}

function isStaticAssetRequest(path: string): boolean {
  return STATIC_ASSET_PATH_PATTERN.test(normalizeSeoPath(path));
}

function decodeSlugSegment(value: string): string {
  try {
    return decodeURIComponent(value.split('/')[0] ?? '');
  } catch {
    return value.split('/')[0] ?? '';
  }
}

function createAbsoluteUrl(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return SITE_URL;
  }

  try {
    return new URL(trimmedValue, SITE_URL).toString();
  } catch {
    return trimmedValue;
  }
}

function toOpenGraphCompatibleImage(value: string): string {
  const image = createAbsoluteUrl(value || HOMEPAGE_OG_IMAGE);

  if (!isWebpImageUrl(image)) {
    return image;
  }

  const jpegAsset = createJpegAssetUrl(image);

  return jpegAsset || HOMEPAGE_OG_IMAGE;
}

function isWebpImageUrl(value: string): boolean {
  return parseUrlPathname(value).endsWith('.webp');
}

function createJpegAssetUrl(value: string): string {
  try {
    const url = new URL(value, SITE_URL);

    return url.origin === SITE_URL && url.pathname.startsWith('/assets/')
      ? `${url.pathname.replace(/\.webp$/i, '.jpg')}${url.search}${url.hash}`
      : '';
  } catch {
    return '';
  }
}

function createHomeJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${SITE_URL}/#person`,
        name: 'Colin Michaels',
        url: SITE_URL,
        jobTitle: 'Applications Developer',
        image: `${SITE_URL}${HOMEPAGE_OG_IMAGE}`,
        description: 'Applications developer, FPV drone pilot, creative technologist, and recovering overthinker based in Florida.',
        sameAs: [
          'https://github.com/ColinMichaels',
          'https://www.linkedin.com/in/colinmichaels',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: HOMEPAGE_DESCRIPTION,
        publisher: {
          '@id': `${SITE_URL}/#person`,
        },
      },
    ],
  };
}

function createBlogPostingJsonLd(options: {
  title: string;
  description: string;
  url: string;
  image: string;
  author: string;
  publishedAt: string | null;
  modifiedAt: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: options.title,
    description: options.description,
    url: options.url,
    image: [options.image],
    datePublished: options.publishedAt ?? options.modifiedAt,
    dateModified: options.modifiedAt,
    author: {
      '@type': 'Person',
      name: options.author,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Person',
      name: 'Colin Michaels',
      url: SITE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': options.url,
    },
  };
}

function createTopicHubJsonLd(topicHub: typeof TOPIC_HUBS[number]): Record<string, unknown> {
  const url = createAbsoluteUrl(`/topics/${topicHub.slug}`);

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: topicHub.heading,
    description: topicHub.description,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Person',
      name: 'Colin Michaels',
      url: SITE_URL,
    },
  };
}

function renderBlogIndexFallbackHtml(posts: readonly SeoBlogPostDocument[]): string {
  const items = posts.slice(0, 12).map(post => {
    const title = stripHtml(post.ogTitle || post.seoTitle || post.title);
    const description = truncateDescription(stripHtml(post.ogDescription || post.seoDescription || post.excerpt));
    const publishedAt = post.publishedAt ?? post.updatedAt;

    return [
      '<article class="seo-fallback-card">',
      `  <h2><a href="${escapeHtml(createAbsoluteUrl(`/blog/${post.slug}`))}">${escapeHtml(title)}</a></h2>`,
      `  <p class="seo-fallback-meta">${escapeHtml(formatFallbackDate(publishedAt))}</p>`,
      `  <p>${escapeHtml(description)}</p>`,
      '</article>',
    ].join('\n');
  }).join('\n');

  return renderFallbackShell({
    eyebrow: 'Blog',
    title: 'Latest writing',
    description: BLOG_FEED_DESCRIPTION,
    body: items || '<p>No published posts are available yet.</p>',
  });
}

function renderBlogPostFallbackHtml(
  post: SeoBlogPostDocument,
  metadata: {
    title: string;
    description: string;
    image: string;
  }
): string {
  const categoryLinks = post.categories.map(category => (
    `<a href="${escapeHtml(createAbsoluteUrl(`/blog/category/${createBlogCategorySlug(category)}`))}">${escapeHtml(category)}</a>`
  )).join(' ');
  const tagLinks = post.tags.map(tag => (
    `<a href="${escapeHtml(createAbsoluteUrl(`/blog/tag/${createBlogTagSlug(tag)}`))}">${escapeHtml(tag)}</a>`
  )).join(' ');
  const body = post.blocks
    .map(renderBlogContentBlockFallbackHtml)
    .filter(Boolean)
    .join('\n');

  return renderFallbackShell({
    eyebrow: 'Article',
    title: metadata.title,
    description: metadata.description,
    body: [
      '<article class="seo-fallback-article">',
      `  <p class="seo-fallback-meta">By ${escapeHtml(post.authorName)} - ${escapeHtml(formatFallbackDate(post.publishedAt ?? post.updatedAt))}</p>`,
      categoryLinks ? `  <nav aria-label="Article categories" class="seo-fallback-taxonomy">${categoryLinks}</nav>` : '',
      `  <img src="${escapeHtml(createAbsoluteUrl(metadata.image))}" alt="${escapeHtml(post.imageAlt || `${metadata.title} preview image`)}" loading="eager">`,
      body || `  <p>${escapeHtml(metadata.description)}</p>`,
      tagLinks ? `  <nav aria-label="Article tags" class="seo-fallback-taxonomy">${tagLinks}</nav>` : '',
      '</article>',
    ].filter(Boolean).join('\n'),
  });
}

function renderTopicHubFallbackHtml(topicHub: typeof TOPIC_HUBS[number]): string {
  const quickLinks = [
    '<ul class="seo-fallback-list">',
    ...topicHub.terms.slice(0, 8).map(term => (
      `  <li><a href="${escapeHtml(createAbsoluteUrl(`/blog/search?q=${encodeURIComponent(term)}`))}">${escapeHtml(createTitleFromSlug(createSeoSlug(term)))}</a></li>`
    )),
    '</ul>',
  ].join('\n');

  return renderFallbackShell({
    eyebrow: 'Topic Hub',
    title: topicHub.heading,
    description: topicHub.description,
    body: [
      '<section class="seo-fallback-article">',
      '  <h2>Start here</h2>',
      `  <p>${escapeHtml(topicHub.description)}</p>`,
      '  <h2>Related searches</h2>',
      quickLinks,
      '</section>',
    ].join('\n'),
  });
}

function renderBlogContentBlockFallbackHtml(block: BlogContentBlock): string {
  const data = block.data;

  switch (block.type) {
    case 'header': {
      const text = stripHtml(data.text ?? '');

      if (!text) {
        return '';
      }

      return data.level === 3
        ? `<h3>${escapeHtml(text)}</h3>`
        : `<h2>${escapeHtml(text)}</h2>`;
    }

    case 'paragraph':
    case 'typography': {
      const text = stripHtml(data.text ?? '');

      return text ? `<p>${escapeHtml(text)}</p>` : '';
    }

    case 'list': {
      const items = (data.items ?? [])
        .map(item => stripHtml(item))
        .filter(Boolean)
        .map(item => `  <li>${escapeHtml(item)}</li>`)
        .join('\n');

      if (!items) {
        return '';
      }

      return data.ordered ? `<ol>\n${items}\n</ol>` : `<ul>\n${items}\n</ul>`;
    }

    case 'quote': {
      const text = stripHtml(data.text ?? '');
      const caption = stripHtml(data.caption ?? data.attribution ?? '');

      if (!text) {
        return '';
      }

      return caption
        ? `<blockquote><p>${escapeHtml(text)}</p><cite>${escapeHtml(caption)}</cite></blockquote>`
        : `<blockquote><p>${escapeHtml(text)}</p></blockquote>`;
    }

    case 'code': {
      const code = data.code?.trim() ?? '';

      return code ? `<pre><code>${escapeHtml(code)}</code></pre>` : '';
    }

    case 'image': {
      const url = data.url?.trim() ?? '';
      const alt = stripHtml(data.alt ?? data.caption ?? '');

      return url ? `<img src="${escapeHtml(createAbsoluteUrl(url))}" alt="${escapeHtml(alt)}" loading="lazy">` : '';
    }

    case 'embed': {
      const caption = stripHtml(data.caption ?? data.provider ?? '');
      const url = data.embedUrl?.trim() || data.url?.trim() || '';

      return url
        ? `<p><a href="${escapeHtml(createAbsoluteUrl(url))}">${escapeHtml(caption || url)}</a></p>`
        : '';
    }

    case 'delimiter':
      return '<hr>';

    default: {
      const text = stripHtml(data.text ?? data.caption ?? '');

      return text ? `<p>${escapeHtml(text)}</p>` : '';
    }
  }
}

function renderFallbackShell(options: {
  eyebrow: string;
  title: string;
  description: string;
  body: string;
}): string {
  return [
    '<main class="seo-fallback">',
    `  <p class="seo-fallback-eyebrow">${escapeHtml(options.eyebrow)}</p>`,
    `  <h1>${escapeHtml(options.title)}</h1>`,
    `  <p class="seo-fallback-description">${escapeHtml(options.description)}</p>`,
    options.body,
    '</main>',
  ].join('\n');
}

function isBlogContentBlock(value: unknown): value is BlogContentBlock {
  if (!isRecord(value) || !isRecord(value['data'])) {
    return false;
  }

  return typeof value['id'] === 'string' && typeof value['type'] === 'string';
}

function formatFallbackDate(value: string): string {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(timestamp));
}

function getFirstImageAlt(blocks: readonly unknown[]): string {
  const imageBlock = blocks.find(block => {
    if (!isRecord(block) || block['type'] !== 'image' || !isRecord(block['data'])) {
      return false;
    }

    return typeof block['data']['alt'] === 'string';
  });

  if (!imageBlock || !isRecord(imageBlock) || !isRecord(imageBlock['data'])) {
    return '';
  }

  return getTrimmedString(imageBlock['data']['alt']);
}

function getStringArrayValue(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean)
    : [];
}

function getIsoString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (isRecord(value) && typeof value['seconds'] === 'number') {
    return new Date(value['seconds'] * 1000).toISOString();
  }

  return '';
}

function createTitleFromSlug(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ') || 'Blog Category';
}

function createSeoSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
}

function createBlogCategorySlug(value: string): string {
  return createSeoSlug(value) || 'uncategorized';
}

function createBlogTagSlug(value: string): string {
  return createSeoSlug(value) || 'untagged';
}

function getImageMimeType(imageUrl: string): string {
  const pathname = parseUrlPathname(imageUrl);

  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) {
    return 'image/jpeg';
  }

  if (pathname.endsWith('.png')) {
    return 'image/png';
  }

  if (pathname.endsWith('.gif')) {
    return 'image/gif';
  }

  if (pathname.endsWith('.svg')) {
    return 'image/svg+xml';
  }

  if (pathname.endsWith('.avif')) {
    return 'image/avif';
  }

  return 'image/jpeg';
}

function parseUrlPathname(value: string): string {
  try {
    return decodeURIComponent(new URL(value).pathname).toLowerCase();
  } catch {
    return value.split('?')[0].split('#')[0].toLowerCase();
  }
}

function truncateDescription(value: string): string {
  const trimmedValue = value.trim();

  if (trimmedValue.length <= 300) {
    return trimmedValue;
  }

  return `${trimmedValue.slice(0, 297).trimEnd()}...`;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function getLatestIsoDate(values: readonly string[]): string | undefined {
  const dates = values
    .map(value => Date.parse(value))
    .filter(value => Number.isFinite(value));

  if (dates.length === 0) {
    return undefined;
  }

  return new Date(Math.max(...dates)).toISOString();
}

function toRfc822Date(value: string): string {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp)
    ? new Date(timestamp).toUTCString()
    : new Date(0).toUTCString();
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXml(value: string): string {
  return escapeHtml(value).replace(/'/g, '&apos;');
}

function escapeScriptJson(value: string): string {
  return value.replace(/</g, '\\u003c');
}

async function fetchYoutubeChannelDetails(channelId: string): Promise<YoutubeChannelDetails> {
  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    id: channelId,
    key: youtubeApiKey.value(),
    maxResults: '1',
  });
  const payload = await fetchYoutubeApi<YoutubeChannelsResponse>(
    `channels?${params.toString()}`,
    'Unable to load YouTube channel details.'
  );
  const channel = payload.items?.[0];
  const uploadsPlaylistId = getTrimmedString(channel?.contentDetails?.relatedPlaylists?.uploads);

  if (!channel || !uploadsPlaylistId) {
    throw new HttpsError('failed-precondition', 'Configured YouTube channel does not expose an uploads playlist.');
  }

  return {
    channelId: getTrimmedString(channel.id) || channelId,
    channelTitle: getTrimmedString(channel.snippet?.title) || 'YouTube',
    uploadsPlaylistId,
  };
}

async function fetchYoutubeUploads(playlistId: string, maxResults: number): Promise<readonly YoutubeVideo[]> {
  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    playlistId,
    maxResults: maxResults.toString(),
    key: youtubeApiKey.value(),
  });
  const payload = await fetchYoutubeApi<YoutubePlaylistItemsResponse>(
    `playlistItems?${params.toString()}`,
    'Unable to load YouTube uploads.'
  );

  return (payload.items ?? [])
    .flatMap(item => normalizeYoutubePlaylistItem(item))
    .slice(0, maxResults);
}

async function fetchYoutubeApi<T>(pathWithQuery: string, fallbackMessage: string): Promise<T> {
  const response = await fetch(`${YOUTUBE_API_URL}/${pathWithQuery}`);
  const payload = await response.json().catch(() => ({})) as T & YoutubeErrorResponse;

  if (!response.ok) {
    const youtubeMessage = payload.error?.message ?? '';
    const isEmptyRefererRestriction = response.status === 403
      && youtubeMessage.toLowerCase().includes('referer <empty>');

    throw new HttpsError(
      'internal',
      isEmptyRefererRestriction
        ? 'YouTube API key is restricted to HTTP referrers, but Firebase Functions calls YouTube server-to-server with an empty referer. Use a server-side key with application restrictions set to None, or IP address restrictions only if deployed Functions use static egress, and restrict the key to YouTube Data API v3.'
        : youtubeMessage || fallbackMessage,
      {status: response.status, youtubeStatus: payload.error?.status, youtubeCode: payload.error?.code}
    );
  }

  return payload;
}

function normalizeYoutubePlaylistItem(item: YoutubePlaylistItem): YoutubeVideo[] {
  const videoId = getTrimmedString(item.contentDetails?.videoId) || getTrimmedString(item.snippet?.resourceId?.videoId);

  if (!videoId) {
    return [];
  }

  const title = getTrimmedString(item.snippet?.title) || 'Untitled YouTube video';
  const description = getTrimmedString(item.snippet?.description);
  const publishedAt = getTrimmedString(item.contentDetails?.videoPublishedAt)
    || getTrimmedString(item.snippet?.publishedAt)
    || new Date(0).toISOString();
  const thumbnailUrl = selectYoutubeThumbnail(item.snippet?.thumbnails)
    || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return [{
    id: videoId,
    title,
    description,
    publishedAt,
    thumbnailUrl,
    thumbnailAlt: `${title} thumbnail`,
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
  }];
}

function selectYoutubeThumbnail(thumbnails: YoutubeThumbnails | undefined): string {
  return getTrimmedString(thumbnails?.maxres?.url)
    || getTrimmedString(thumbnails?.standard?.url)
    || getTrimmedString(thumbnails?.high?.url)
    || getTrimmedString(thumbnails?.medium?.url)
    || getTrimmedString(thumbnails?.default?.url);
}

function getTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getPositiveInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value.trim());
    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
  }

  return null;
}

function requireCmsAccess(auth: AdminCallableAuth | undefined): string {
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to use CMS AI functions.');
  }

  if (!hasAnyRoleClaim(auth.token, CMS_ACCESS_ROLES)) {
    throw new HttpsError('permission-denied', 'You must have CMS access to use CMS AI functions.');
  }

  return auth.uid;
}

function requireUserManagementAdmin(auth: AdminCallableAuth | undefined): string {
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to manage users.');
  }

  if (!hasAnyRoleClaim(auth.token, USER_MANAGEMENT_ACCESS_ROLES)) {
    throw new HttpsError('permission-denied', 'Only admins can manage user roles.');
  }

  return auth.uid;
}

function hasRoleClaim(claims: Record<string, unknown>, role: string): boolean {
  const roles = claims['roles'];

  return claims[role] === true || (isRecord(roles) && roles[role] === true);
}

function hasAnyRoleClaim(claims: Record<string, unknown>, roles: readonly string[]): boolean {
  return roles.some(role => hasRoleClaim(claims, role));
}

function parseListUsersRequest(value: unknown): { pageSize: number; pageToken: string | null } {
  const record = isRecord(value) ? value : {};
  const requestedPageSize = getPositiveInteger(record['pageSize']) ?? USER_MANAGEMENT_DEFAULT_PAGE_SIZE;
  const pageToken = getTrimmedString(record['pageToken']);

  return {
    pageSize: Math.min(USER_MANAGEMENT_MAX_PAGE_SIZE, requestedPageSize),
    pageToken: pageToken || null,
  };
}

function parseUpdateUserRolesRequest(value: unknown): { uid: string; roles: string[] } {
  const record = requireRecord(value, 'User role update must be an object.');
  const uid = getTrimmedString(record['uid']);
  const rawRoles = record['roles'];

  if (!uid) {
    throw new HttpsError('invalid-argument', 'User uid is required.');
  }

  if (!Array.isArray(rawRoles)) {
    throw new HttpsError('invalid-argument', 'Roles must be an array.');
  }

  const roles = [...new Set(rawRoles.map(role => getTrimmedString(role)).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  if (roles.length > MAX_USER_MANAGEMENT_ROLES) {
    throw new HttpsError('invalid-argument', `A user can have at most ${MAX_USER_MANAGEMENT_ROLES} roles.`);
  }

  const invalidRole = roles.find(role => !ROLE_NAME_PATTERN.test(role));

  if (invalidRole) {
    throw new HttpsError('invalid-argument', `Invalid role "${invalidRole}". Use letters, numbers, underscores, or hyphens, starting with a letter.`);
  }

  return {uid, roles};
}

function createClaimsWithRoles(
  existingClaims: Record<string, unknown>,
  roles: readonly string[]
): Record<string, unknown> {
  const nextClaims: Record<string, unknown> = {...existingClaims};
  const nextRoles = Object.fromEntries(roles.map(role => [role, true]));

  if (Object.keys(nextRoles).length > 0) {
    nextClaims['roles'] = nextRoles;
  } else {
    delete nextClaims['roles'];
  }

  for (const mirroredRole of ['admin', 'cmsAdmin']) {
    if (roles.includes(mirroredRole)) {
      nextClaims[mirroredRole] = true;
    } else {
      delete nextClaims[mirroredRole];
    }
  }

  return nextClaims;
}

function toAdminManagedUser(user: UserRecord): AdminManagedUser {
  const customClaims = user.customClaims ?? {};

  return {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    disabled: user.disabled,
    emailVerified: user.emailVerified,
    createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).toISOString() : null,
    lastSignInAt: user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toISOString() : null,
    roles: getClaimRoles(customClaims),
    customClaims,
  };
}

function getClaimRoles(claims: Record<string, unknown>): string[] {
  const roles = claims['roles'];
  const roleNames = new Set<string>();

  if (isRecord(roles)) {
    for (const [role, enabled] of Object.entries(roles)) {
      if (enabled === true && ROLE_NAME_PATTERN.test(role)) {
        roleNames.add(role);
      }
    }
  }

  for (const mirroredRole of ['admin', 'cmsAdmin']) {
    if (claims[mirroredRole] === true) {
      roleNames.add(mirroredRole);
    }
  }

  return [...roleNames].sort((a, b) => a.localeCompare(b));
}

function parseAssistantContext(value: unknown): BlogAssistantContext {
  const record = requireRecord(value, 'Assistant context must be an object.');

  return {
    title: getString(record, 'title').slice(0, 180),
    excerpt: getString(record, 'excerpt').slice(0, 500),
    seoTitle: getString(record, 'seoTitle').slice(0, 180),
    seoDescription: getString(record, 'seoDescription').slice(0, 500),
    categories: getStringArray(record, 'categories').slice(0, 8),
    tags: getStringArray(record, 'tags').slice(0, 20),
    blocks: getBlocks(record['blocks']).slice(0, 80),
  };
}

function parseThumbnailRequest(value: unknown): BlogThumbnailGenerationRequest {
  const record = requireRecord(value, 'Thumbnail request must be an object.');
  const prompt = getString(record, 'prompt').slice(0, MAX_PROMPT_LENGTH).trim();
  const altText = getString(record, 'altText').slice(0, 280).trim();
  const style = getString(record, 'style').slice(0, 120).trim();
  const postId = getString(record, 'postId').slice(0, 120).trim();
  const slug = getString(record, 'slug').slice(0, 160).trim();

  if (!prompt || !postId || !slug) {
    throw new HttpsError('invalid-argument', 'Thumbnail prompt, postId, and slug are required.');
  }

  return {
    prompt,
    altText: altText || `Generated thumbnail for ${slug}.`,
    style: style || 'Editorial technical illustration',
    postId,
    slug,
  };
}

async function callOpenAiResponses(context: BlogAssistantContext): Promise<OpenAiResponsePayload> {
  const apiKey = openAiApiKey.value();
  const sourceText = truncateText(JSON.stringify(context), MAX_TEXT_LENGTH);
  const response = await fetch(`${OPENAI_API_URL}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: openAiTextModel.value(),
      input: [
        {
          role: 'system',
          content: [
            'You are a CMS writing assistant for a professional engineering portfolio blog.',
            'Suggest practical, non-clickbait metadata.',
            'Keep categories broad and tags specific.',
            'Return only data that matches the schema.',
          ].join(' '),
        },
        {
          role: 'user',
          content: `Create blog metadata suggestions from this draft context: ${sourceText}`,
        },
      ],
      max_output_tokens: 1800,
      text: {
        format: {
          type: 'json_schema',
          name: 'blog_metadata_suggestions',
          strict: true,
          schema: metadataSchema,
        },
      },
    }),
  });

  return parseOpenAiResponse<OpenAiResponsePayload>(response, 'Unable to generate blog metadata.');
}

async function generateImage(prompt: string, model: string): Promise<{ base64Data: string; contentType: string }> {
  const response = await fetch(`${OPENAI_API_URL}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey.value()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: '1536x1024',
      quality: 'medium',
      output_format: 'webp',
    }),
  });
  const payload = await parseOpenAiResponse<OpenAiImagePayload>(response, 'Unable to generate thumbnail image.');
  const base64Data = payload.data?.[0]?.b64_json;

  if (!base64Data) {
    throw new HttpsError('internal', 'OpenAI image response did not include image data.');
  }

  return {
    base64Data,
    contentType: 'image/webp',
  };
}

async function storeThumbnailImage(
  request: BlogThumbnailGenerationRequest,
  image: { base64Data: string; contentType: string },
  model: string
): Promise<BlogStoredThumbnail> {
  const generatedAt = new Date().toISOString();
  const token = randomUUID();
  const safeSlug = toSafePathSegment(request.slug);
  const fileName = `${Date.now()}-${randomUUID()}.webp`;
  const storagePath = `cms/blog-thumbnails/${safeSlug}/${fileName}`;
  const bucket = getStorage().bucket();
  const file = bucket.file(storagePath);

  await file.save(Buffer.from(image.base64Data, 'base64'), {
    resumable: false,
    metadata: {
      cacheControl: 'public, max-age=31536000, immutable',
      contentType: image.contentType,
      metadata: {
        firebaseStorageDownloadTokens: token,
        altText: request.altText,
        prompt: truncateText(request.prompt, 900),
        source: 'openai',
        model,
        postId: request.postId,
      },
    },
  });

  logger.info('Stored generated blog thumbnail.', {
    storagePath,
    postId: request.postId,
    model,
  });

  return {
    generatedAt,
    source: 'backend',
    prompt: request.prompt,
    altText: request.altText,
    style: request.style,
    contentType: image.contentType,
    storagePath,
    downloadUrl: createFirebaseStorageDownloadUrl(bucket.name, storagePath, token),
    model,
  };
}

async function parseOpenAiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & OpenAiErrorResponse;

  if (!response.ok) {
    throw new HttpsError(
      'internal',
      payload.error?.message ?? fallbackMessage,
      {type: payload.error?.type, status: response.status}
    );
  }

  return payload;
}

function parseAssistantResult(payload: OpenAiResponsePayload): Pick<BlogAssistantResult, 'suggestions' | 'thumbnailSuggestions'> {
  const text = extractOutputText(payload);

  if (!text) {
    throw new HttpsError('internal', 'OpenAI metadata response did not include text output.');
  }

  const parsed = JSON.parse(text) as Partial<BlogAssistantResult>;
  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.map((suggestion, index) => normalizeMetadataSuggestion(suggestion, index))
    : [];
  const thumbnailSuggestions = Array.isArray(parsed.thumbnailSuggestions)
    ? parsed.thumbnailSuggestions.map((suggestion, index) => normalizeThumbnailSuggestion(suggestion, index))
    : [];

  if (suggestions.length === 0 || thumbnailSuggestions.length === 0) {
    throw new HttpsError('internal', 'OpenAI metadata response did not include complete suggestions.');
  }

  return {
    suggestions,
    thumbnailSuggestions,
  };
}

function normalizeMetadataSuggestion(value: unknown, index: number): BlogMetadataSuggestion {
  const record = requireRecord(value, 'Invalid metadata suggestion.');

  return {
    id: getString(record, 'id') || `metadata-${index + 1}`,
    title: getString(record, 'title').slice(0, 90),
    description: getString(record, 'description').slice(0, 180),
    seoTitle: getString(record, 'seoTitle').slice(0, 70),
    seoDescription: getString(record, 'seoDescription').slice(0, 170),
    categories: getStringArray(record, 'categories').slice(0, 4),
    tags: getStringArray(record, 'tags').slice(0, 10),
    rationale: getString(record, 'rationale').slice(0, 220),
  };
}

function normalizeThumbnailSuggestion(value: unknown, index: number): BlogThumbnailSuggestion {
  const record = requireRecord(value, 'Invalid thumbnail suggestion.');

  return {
    id: getString(record, 'id') || `thumbnail-${index + 1}`,
    prompt: getString(record, 'prompt').slice(0, MAX_PROMPT_LENGTH),
    altText: getString(record, 'altText').slice(0, 280),
    style: getString(record, 'style').slice(0, 120),
  };
}

function extractOutputText(payload: OpenAiResponsePayload): string {
  if (typeof payload.output_text === 'string') {
    return payload.output_text;
  }

  return payload.output
    ?.flatMap(item => item.content ?? [])
    .map(content => content.text ?? '')
    .join('')
    .trim() ?? '';
}

function getBlocks(value: unknown): readonly BlogContentBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(item => {
    if (!isRecord(item)) {
      return [];
    }

    return {
      id: getString(item, 'id'),
      type: getString(item, 'type'),
      data: isRecord(item['data']) ? item['data'] as BlogBlockData : {},
    };
  });
}

function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new HttpsError('invalid-argument', message);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : '';
}

function getStringArray(record: Record<string, unknown>, key: string): readonly string[] {
  const value = record[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(
    value
      .filter(item => typeof item === 'string')
      .map(item => item.trim())
      .filter(item => item.length > 0)
  )];
}

function toSafePathSegment(value: string): string {
  return value
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
    || 'untitled-post';
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function createFirebaseStorageDownloadUrl(bucketName: string, storagePath: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}
