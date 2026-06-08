import {randomUUID} from 'node:crypto';

import {initializeApp} from 'firebase-admin/app';
import {getStorage} from 'firebase-admin/storage';
import {logger} from 'firebase-functions';
import {defineSecret, defineString} from 'firebase-functions/params';
import {HttpsError, onCall} from 'firebase-functions/v2/https';

initializeApp();

const FUNCTION_REGION = 'us-east1';
const MAX_PROMPT_LENGTH = 3000;
const MAX_TEXT_LENGTH = 12000;
const OPENAI_API_URL = 'https://api.openai.com/v1';
const openAiApiKey = defineSecret('OPENAI_API_KEY');
const openAiTextModel = defineString('OPENAI_TEXT_MODEL', {default: 'gpt-5.5'});
const openAiImageModel = defineString('OPENAI_IMAGE_MODEL', {default: 'gpt-image-2'});

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

export const generateBlogMetadata = onCall(
  {
    region: FUNCTION_REGION,
    secrets: [openAiApiKey],
    timeoutSeconds: 60,
    memory: '512MiB',
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
  },
  async request => {
    requireAdmin(request.auth);
    const data = parseThumbnailRequest(request.data);
    const model = openAiImageModel.value();
    const image = await generateImage(data.prompt, model);
    const storedImage = await storeThumbnailImage(data, image, model);

    return storedImage;
  }
);

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
