import {randomUUID} from 'node:crypto';

import {initializeApp} from 'firebase-admin/app';
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
    requireAdmin(request.auth);
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
    requireAdmin(request.auth);
    const data = parseThumbnailRequest(request.data);
    const model = openAiImageModel.value();
    const image = await generateImage(data.prompt, model);
    return await storeThumbnailImage(data, image, model);
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

function requireAdmin(auth: AdminCallableAuth | undefined): string {
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to use CMS AI functions.');
  }

  if (!hasAdminClaim(auth.token)) {
    throw new HttpsError('permission-denied', 'You must be an authorized admin to use CMS AI functions.');
  }

  return auth.uid;
}

function hasAdminClaim(claims: Record<string, unknown>): boolean {
  const roles = claims['roles'];

  return claims['admin'] === true
    || claims['cmsAdmin'] === true
    || (isRecord(roles) && roles['admin'] === true);
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
