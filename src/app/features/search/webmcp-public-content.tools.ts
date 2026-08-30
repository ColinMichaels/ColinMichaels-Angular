import {type WebMcpToolDescriptor} from '@angular/core';

import {PublicAgentContentService} from './services/public-agent-content.service';

const PUBLIC_TOPIC_SLUGS = [
  'ai-setup',
  'recovery-planning',
  'angular-firebase-architecture',
  'labs-projects',
  'gadgets-toys',
  'drones-fpv',
] as const;

type PublicContentToolSchema = {
  type: 'object';
  properties: Readonly<Record<string, {
    type: 'string';
    description: string;
    enum?: readonly string[];
  }>>;
  required: readonly string[];
  additionalProperties: false;
};

type PublicContentToolDescriptor = WebMcpToolDescriptor<PublicContentToolSchema> & {
  annotations: {
    readonly readOnlyHint: true;
    readonly untrustedContentHint: true;
  };
};

/**
 * Browser-only WebMCP declarations. Each execution delegates to the
 * server-enforced, public-content projection rather than reading CMS records
 * directly from the agent's browser context.
 */
// Each tool has its own checked runtime schema, so the shared descriptor
// boundary is intentionally broad rather than collapsing the three contracts
// into one permissive schema.
export function createPublicContentWebMcpTools(
  publicContent: PublicAgentContentService,
): PublicContentToolDescriptor[] {
  return [
    {
      name: 'search_public_content',
      description: 'Read-only search of published ColinMichaels.com articles and public topic guides. Returns at most five canonical results with citation metadata. Do not use for drafts, private CMS data, or write actions.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'A focused public-content search query between 2 and 160 characters.',
          },
        },
        required: ['query'],
        additionalProperties: false,
      } as const,
      annotations: {
        readOnlyHint: true,
        untrustedContentHint: true,
      },
      execute: (args, client) => resolveForBrowser(() => publicContent.search(
        requireToolString(args, 'query'),
        client.signal,
      ).then(response => JSON.stringify(response))),
    },
    {
      name: 'get_public_article',
      description: 'Read-only lookup of one published article by its canonical https://colinmichaels.com/blog/... URL. Returns citation metadata and an excerpt, never drafts or full private CMS content.',
      inputSchema: {
        type: 'object',
        properties: {
          canonicalUrl: {
            type: 'string',
            description: 'The canonical ColinMichaels.com article URL with no query string or fragment.',
          },
        },
        required: ['canonicalUrl'],
        additionalProperties: false,
      } as const,
      annotations: {
        readOnlyHint: true,
        untrustedContentHint: true,
      },
      execute: (args, client) => resolveForBrowser(() => publicContent.getArticle(
        requireToolString(args, 'canonicalUrl'),
        client.signal,
      ).then(response => JSON.stringify(response))),
    },
    {
      name: 'get_public_topic_guide',
      description: 'Read-only lookup of one canonical ColinMichaels.com topic guide. Returns the guide description, canonical URL, and supported search terms.',
      inputSchema: {
        type: 'object',
        properties: {
          topicSlug: {
            type: 'string',
            enum: PUBLIC_TOPIC_SLUGS,
            description: 'The canonical public topic slug.',
          },
        },
        required: ['topicSlug'],
        additionalProperties: false,
      } as const,
      annotations: {
        readOnlyHint: true,
        untrustedContentHint: true,
      },
      execute: (args, client) => resolveForBrowser(() => publicContent.getTopic(
        requireToolString(args, 'topicSlug'),
        client.signal,
      ).then(response => JSON.stringify(response))),
    },
  ];
}

function requireToolString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== 'string') {
    throw new Error(`WebMCP tool requires a string ${key} argument.`);
  }

  return value;
}

/**
 * Chromium awaits the native Promise returned by a WebMCP callback. Angular's
 * Zone patches the global Promise constructor, so an `async` callback is
 * serialized as an unresolved value by the experimental browser bridge. Wrap
 * the Zone-managed work in the pre-patch constructor before returning it.
 */
function resolveForBrowser<T>(work: () => Promise<T>): Promise<T> {
  const nativePromise = getNativePromiseConstructor();

  return new nativePromise((resolve, reject) => {
    try {
      void work().then(resolve, reject);
    } catch (error) {
      reject(error);
    }
  });
}

function getNativePromiseConstructor(): PromiseConstructor {
  const zone = (globalThis as typeof globalThis & {
    Zone?: { __symbol__(name: string): string };
  }).Zone;
  const nativePromise = zone
    ? (globalThis as Record<string, unknown>)[zone.__symbol__('Promise')]
    : undefined;

  return typeof nativePromise === 'function'
    ? nativePromise as PromiseConstructor
    : Promise;
}
