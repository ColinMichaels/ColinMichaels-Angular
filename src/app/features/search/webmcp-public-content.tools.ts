import {inject, type WebMcpToolDescriptor} from '@angular/core';

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

/**
 * Browser-only WebMCP declarations. Each execution delegates to the
 * server-enforced, public-content projection rather than reading CMS records
 * directly from the agent's browser context.
 */
// Angular's current experimental provider takes one schema generic for the
// entire array. Each tool has its own checked runtime schema, so the shared
// descriptor boundary is intentionally broad here rather than collapsing the
// three distinct tool contracts into one permissive schema.
export const PUBLIC_CONTENT_WEB_MCP_TOOLS: WebMcpToolDescriptor<PublicContentToolSchema>[] = [
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
    execute: async args => JSON.stringify(await inject(PublicAgentContentService).search(requireToolString(args, 'query'))),
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
    execute: async args => JSON.stringify(await inject(PublicAgentContentService).getArticle(requireToolString(args, 'canonicalUrl'))),
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
    execute: async args => JSON.stringify(await inject(PublicAgentContentService).getTopic(requireToolString(args, 'topicSlug'))),
  },
];

function requireToolString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== 'string') {
    throw new Error(`WebMCP tool requires a string ${key} argument.`);
  }

  return value;
}
