import {createHash} from 'node:crypto';

export interface StoredPushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    auth: string;
    p256dh: string;
  };
}

export interface PublishedPostPushInput {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string | null;
}

const PUSH_ENDPOINT_MAX_LENGTH = 2048;
const PUSH_KEY_MAX_LENGTH = 512;
const BASE64_URL_PATTERN = /^[A-Za-z0-9_-]+={0,2}$/;

export function parseStoredPushSubscription(value: unknown): StoredPushSubscription | null {
  if (!isRecord(value)) {
    return null;
  }

  const endpoint = getTrimmedString(value['endpoint']);
  const expirationTime = value['expirationTime'];
  const keys = isRecord(value['keys']) ? value['keys'] : {};
  const auth = getTrimmedString(keys['auth']);
  const p256dh = getTrimmedString(keys['p256dh']);

  if (
    !parsePushEndpoint(endpoint)
    || !isValidPushKey(auth)
    || !isValidPushKey(p256dh)
  ) {
    return null;
  }

  if (expirationTime !== null && (
    typeof expirationTime !== 'number'
    || !Number.isFinite(expirationTime)
    || expirationTime <= 0
  )) {
    return null;
  }

  return {
    endpoint,
    expirationTime,
    keys: {auth, p256dh},
  };
}

export function parsePushEndpoint(value: unknown): string | null {
  const endpoint = getTrimmedString(value);
  return isSecureEndpoint(endpoint) && endpoint.length <= PUSH_ENDPOINT_MAX_LENGTH
    ? endpoint
    : null;
}

export function createPushSubscriptionId(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex');
}

export function isNewlyPublishedPost(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined
): boolean {
  return after?.['status'] === 'published' && before?.['status'] !== 'published';
}

export function createPublishedPostPushPayload(post: PublishedPostPushInput): string {
  const targetUrl = `/blog/${encodeURIComponent(post.slug)}?source=push`;
  const title = truncateText(post.title.trim() || 'New writing from Colin Michaels', 80);
  const body = truncateText(post.excerpt.trim() || 'A new post is ready to read.', 180);
  const timestamp = parseTimestamp(post.publishedAt);

  return JSON.stringify({
    notification: {
      title,
      body,
      icon: '/assets/icons/android-chrome-192x192.png',
      tag: `blog-post-${post.id}`,
      timestamp,
      renotify: false,
      data: {
        url: targetUrl,
        badgeCount: 1,
        postId: post.id,
        postSlug: post.slug,
        onActionClick: {
          default: {operation: 'navigateLastFocusedOrOpen', url: targetUrl},
          read: {operation: 'navigateLastFocusedOrOpen', url: targetUrl},
        },
      },
      actions: [
        {action: 'read', title: 'Read now'},
      ],
    },
  });
}

export function toWebPushSubscription(subscription: StoredPushSubscription): {
  endpoint: string;
  keys: {auth: string; p256dh: string};
} {
  return {
    endpoint: subscription.endpoint,
    keys: {...subscription.keys},
  };
}

export function getPushDeliveryStatusCode(error: unknown): number | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  const statusCode = error['statusCode'];
  return typeof statusCode === 'number' && Number.isInteger(statusCode) ? statusCode : undefined;
}

function isSecureEndpoint(endpoint: string): boolean {
  try {
    return new URL(endpoint).protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidPushKey(value: string): boolean {
  return value.length > 0
    && value.length <= PUSH_KEY_MAX_LENGTH
    && BASE64_URL_PATTERN.test(value);
}

function parseTimestamp(value: string | null): number {
  if (!value) {
    return Date.now();
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function getTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
