import {createHash} from 'node:crypto';

import {FieldValue, Firestore, Timestamp} from 'firebase-admin/firestore';
import {HttpsError} from 'firebase-functions/v2/https';

import {SITE_URL} from './seo-site';
import {PUBLIC_TOPIC_HUB_IDENTITIES, PublicTopicHubIdentity} from './topic-hub-public-identity';

const POST_SUMMARIES_COLLECTION = 'postSummaries';
const PUBLIC_AGENT_CONTENT_RATE_LIMITS_COLLECTION = 'publicAgentContentRateLimits';
const MAX_PUBLIC_AGENT_REQUESTS_PER_MINUTE = 20;
const MAX_SEARCH_RESULTS = 5;
const MAX_QUERY_LENGTH = 160;
const MAX_POST_SUMMARIES_PER_SEARCH = 250;
const CONTROL_CHARACTERS_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g;

export type PublicAgentContentOperation = 'search' | 'getArticle' | 'getTopic';

export interface PublicAgentContentRequest {
  operation: PublicAgentContentOperation;
  query?: string;
  canonicalUrl?: string;
  topicSlug?: string;
}

export interface PublicAgentContentContext {
  actorUid: string | null;
  ipAddress: string;
}

interface StoredPostSummary {
  slug?: unknown;
  title?: unknown;
  excerpt?: unknown;
  author?: unknown;
  categories?: unknown;
  tags?: unknown;
  publishedAt?: unknown;
  updatedAt?: unknown;
  status?: unknown;
}

export interface PublicAgentArticle {
  kind: 'article';
  title: string;
  excerpt: string;
  canonicalUrl: string;
  author: string;
  categories: readonly string[];
  tags: readonly string[];
  publishedAt: string | null;
  updatedAt: string | null;
}

export interface PublicAgentTopic {
  kind: 'topic';
  title: string;
  description: string;
  canonicalUrl: string;
  terms: readonly string[];
}

export type PublicAgentContentItem = PublicAgentArticle | PublicAgentTopic;

export interface PublicAgentContentResponse {
  items: readonly PublicAgentContentItem[];
  operation: PublicAgentContentOperation;
  policy: {
    contentLicense: 'not-granted';
    readOnly: true;
    rateLimit: `${typeof MAX_PUBLIC_AGENT_REQUESTS_PER_MINUTE} requests per minute`;
  };
}

export function parsePublicAgentContentRequest(value: unknown): PublicAgentContentRequest {
  if (!isRecord(value)) {
    invalid('A public-agent content request is required.');
  }

  const operation = value['operation'];
  if (operation !== 'search' && operation !== 'getArticle' && operation !== 'getTopic') {
    invalid('The public-agent content operation is invalid.');
  }

  if (operation === 'search') {
    requireAllowedKeys(value, ['operation', 'query']);
    return {operation, query: requiredText(value, 'query', 2, MAX_QUERY_LENGTH)};
  }

  if (operation === 'getArticle') {
    requireAllowedKeys(value, ['operation', 'canonicalUrl']);
    return {operation, canonicalUrl: parseCanonicalArticleUrl(requiredText(value, 'canonicalUrl', 1, 500))};
  }

  requireAllowedKeys(value, ['operation', 'topicSlug']);
  return {operation, topicSlug: parseTopicSlug(requiredText(value, 'topicSlug', 1, 80))};
}

export async function getPublicAgentContent(
  firestore: Firestore,
  value: unknown,
  context: PublicAgentContentContext,
  now = new Date(),
): Promise<PublicAgentContentResponse> {
  const request = parsePublicAgentContentRequest(value);
  await enforcePublicAgentContentRateLimit(firestore, context, now);

  if (request.operation === 'search') {
    const snapshot = await firestore.collection(POST_SUMMARIES_COLLECTION)
      .where('status', '==', 'published')
      .limit(MAX_POST_SUMMARIES_PER_SEARCH)
      .get();
    const articles = snapshot.docs
      .map(document => toPublicAgentArticle(document.data() as StoredPostSummary))
      .filter((article): article is PublicAgentArticle => article !== null);

    return createResponse('search', searchPublicAgentContent(articles, request.query ?? ''));
  }

  if (request.operation === 'getArticle') {
    const slug = getArticleSlugFromCanonicalUrl(request.canonicalUrl ?? '');
    const snapshot = await firestore.collection(POST_SUMMARIES_COLLECTION)
      .where('slug', '==', slug)
      .limit(2)
      .get();
    const article = snapshot.docs
      .map(document => toPublicAgentArticle(document.data() as StoredPostSummary))
      .find((candidate): candidate is PublicAgentArticle => candidate !== null);

    return createResponse('getArticle', article ? [article] : []);
  }

  const topic = PUBLIC_TOPIC_HUB_IDENTITIES.find(candidate => candidate.slug === request.topicSlug);
  return createResponse('getTopic', topic ? [toPublicAgentTopic(topic)] : []);
}

export function searchPublicAgentContent(
  articles: readonly PublicAgentArticle[],
  query: string,
): readonly PublicAgentContentItem[] {
  const normalizedQuery = normalizeText(query);
  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const articleResults = articles
    .map(article => ({item: article, score: scoreArticle(article, normalizedQuery, tokens)}))
    .filter((result): result is { item: PublicAgentArticle; score: number } => result.score > 0);
  const topicResults = PUBLIC_TOPIC_HUB_IDENTITIES
    .map(topic => ({item: toPublicAgentTopic(topic), score: scoreTopic(topic, normalizedQuery, tokens)}))
    .filter((result): result is { item: PublicAgentTopic; score: number } => result.score > 0);

  return [...articleResults, ...topicResults]
    .sort((left, right) => right.score - left.score || left.item.title.localeCompare(right.item.title))
    .slice(0, MAX_SEARCH_RESULTS)
    .map(result => result.item);
}

export function toPublicAgentArticle(value: StoredPostSummary): PublicAgentArticle | null {
  if (value.status !== 'published') {
    return null;
  }

  const slug = asText(value.slug);
  const title = asText(value.title);
  if (!slug || !title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return null;
  }

  const author = isRecord(value.author) ? asText(value.author['name']) : '';
  return {
    kind: 'article',
    title,
    excerpt: asText(value.excerpt),
    canonicalUrl: `${SITE_URL}/blog/${slug}`,
    author: author || 'Colin Michaels',
    categories: asTextList(value.categories),
    tags: asTextList(value.tags),
    publishedAt: asNullableText(value.publishedAt),
    updatedAt: asNullableText(value.updatedAt),
  };
}

export function createPublicAgentContentRateLimitIdentity(
  actorUid: string | null,
  ipAddress: string,
): string {
  const actor = normalizeText(actorUid ?? '') || 'anonymous';
  const ip = normalizeText(ipAddress) || 'unknown';

  return createHash('sha256')
    .update(`public-agent-content-v1:${actor}:${ip}`)
    .digest('hex');
}

async function enforcePublicAgentContentRateLimit(
  firestore: Firestore,
  context: PublicAgentContentContext,
  now: Date,
): Promise<void> {
  const identity = createPublicAgentContentRateLimitIdentity(context.actorUid, context.ipAddress);
  const windowId = now.toISOString().slice(0, 16).replace(/[-T:]/g, '');
  const rateLimitRef = firestore.collection(PUBLIC_AGENT_CONTENT_RATE_LIMITS_COLLECTION).doc(identity);
  const expiresAt = new Date(now.getTime() + (2 * 60 * 1000));

  await firestore.runTransaction(async transaction => {
    const snapshot = await transaction.get(rateLimitRef);
    const currentCount = snapshot.exists && snapshot.get('windowId') === windowId
      ? Number(snapshot.get('count') ?? 0)
      : 0;

    if (!Number.isFinite(currentCount) || currentCount < 0 || currentCount >= MAX_PUBLIC_AGENT_REQUESTS_PER_MINUTE) {
      throw new HttpsError('resource-exhausted', 'The public agent content limit has been reached. Please try again in a minute.');
    }

    transaction.set(rateLimitRef, {
      count: currentCount + 1,
      windowId,
      updatedAt: now.toISOString(),
      updatedAtTimestamp: FieldValue.serverTimestamp(),
      expiresAtTimestamp: Timestamp.fromDate(expiresAt),
    }, {merge: false});
  });
}

function createResponse(
  operation: PublicAgentContentOperation,
  items: readonly PublicAgentContentItem[],
): PublicAgentContentResponse {
  return {
    operation,
    items,
    policy: {
      contentLicense: 'not-granted',
      readOnly: true,
      rateLimit: '20 requests per minute',
    },
  };
}

function parseCanonicalArticleUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value, SITE_URL);
  } catch {
    invalid('The article URL is invalid.');
  }

  if (url.origin !== SITE_URL || !/^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(url.pathname) || url.search || url.hash) {
    invalid('Use a canonical ColinMichaels.com article URL without query parameters or fragments.');
  }

  return url.toString();
}

function parseTopicSlug(value: string): string {
  if (!PUBLIC_TOPIC_HUB_IDENTITIES.some(topic => topic.slug === value)) {
    invalid('The public topic slug is invalid.');
  }
  return value;
}

function getArticleSlugFromCanonicalUrl(value: string): string {
  return new URL(value).pathname.slice('/blog/'.length);
}

function toPublicAgentTopic(topic: PublicTopicHubIdentity): PublicAgentTopic {
  return {
    kind: 'topic',
    title: topic.heading,
    description: topic.description,
    canonicalUrl: `${SITE_URL}/topics/${topic.slug}`,
    terms: topic.terms,
  };
}

function scoreArticle(article: PublicAgentArticle, normalizedQuery: string, tokens: readonly string[]): number {
  const title = normalizeText(article.title);
  const excerpt = normalizeText(article.excerpt);
  const taxonomy = normalizeText([...article.categories, ...article.tags, article.author].join(' '));
  return scoreFields([title, excerpt, taxonomy], normalizedQuery, tokens, [12, 5, 4]);
}

function scoreTopic(topic: PublicTopicHubIdentity, normalizedQuery: string, tokens: readonly string[]): number {
  return scoreFields(
    [normalizeText(topic.heading), normalizeText(topic.description), normalizeText(topic.terms.join(' '))],
    normalizedQuery,
    tokens,
    [11, 5, 4],
  );
}

function scoreFields(
  fields: readonly string[],
  normalizedQuery: string,
  tokens: readonly string[],
  weights: readonly number[],
): number {
  let score = 0;
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index] ?? '';
    const weight = weights[index] ?? 1;
    if (normalizedQuery && field.includes(normalizedQuery)) {
      score += weight * 3;
    }
    score += tokens.filter(token => field.includes(token)).length * weight;
  }
  return score;
}

function requiredText(record: Record<string, unknown>, key: string, minLength: number, maxLength: number): string {
  const value = asText(record[key]);
  if (value.length < minLength || value.length > maxLength) {
    invalid(`The ${key} value must be between ${minLength} and ${maxLength} characters.`);
  }
  return value;
}

function requireAllowedKeys(record: Record<string, unknown>, allowedKeys: readonly string[]): void {
  if (Object.keys(record).some(key => !allowedKeys.includes(key))) {
    invalid('The public-agent content request contains unsupported fields.');
  }
}

function asText(value: unknown): string {
  return typeof value === 'string'
    ? value.replace(CONTROL_CHARACTERS_PATTERN, ' ').replace(/\s+/g, ' ').trim()
    : '';
}

function asNullableText(value: unknown): string | null {
  const text = asText(value);
  return text || null;
}

function asTextList(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.map(asText).filter(Boolean).slice(0, 20)
    : [];
}

function normalizeText(value: string): string {
  return asText(value).toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(message: string): never {
  throw new HttpsError('invalid-argument', message);
}
