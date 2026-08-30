import {inject, Injectable} from '@angular/core';

import {
  FIREBASE_APP,
  FIREBASE_EMULATORS,
} from '../../../services/firebase/firebase.tokens';

export type PublicAgentContentOperation = 'search' | 'getArticle' | 'getTopic';

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

export interface PublicAgentContentResponse {
  operation: PublicAgentContentOperation;
  items: readonly (PublicAgentArticle | PublicAgentTopic)[];
  policy: {
    contentLicense: 'not-granted';
    readOnly: true;
    rateLimit: '20 requests per minute';
  };
}

interface SearchPublicAgentContentRequest {
  operation: 'search';
  query: string;
}

interface GetPublicAgentArticleRequest {
  operation: 'getArticle';
  canonicalUrl: string;
}

interface GetPublicAgentTopicRequest {
  operation: 'getTopic';
  topicSlug: string;
}

type PublicAgentContentRequest =
  | SearchPublicAgentContentRequest
  | GetPublicAgentArticleRequest
  | GetPublicAgentTopicRequest;

@Injectable({providedIn: 'root'})
export class PublicAgentContentService {
  private readonly app = inject(FIREBASE_APP);
  private readonly emulators = inject(FIREBASE_EMULATORS, {optional: true});

  search(query: string, signal?: AbortSignal): Promise<PublicAgentContentResponse> {
    return this.request({operation: 'search', query}, signal);
  }

  getArticle(canonicalUrl: string, signal?: AbortSignal): Promise<PublicAgentContentResponse> {
    return this.request({operation: 'getArticle', canonicalUrl}, signal);
  }

  getTopic(topicSlug: string, signal?: AbortSignal): Promise<PublicAgentContentResponse> {
    return this.request({operation: 'getTopic', topicSlug}, signal);
  }

  private async request(
    request: PublicAgentContentRequest,
    signal?: AbortSignal,
  ): Promise<PublicAgentContentResponse> {
    const response = await fetch(this.getCallableUrl(), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({data: request}),
      signal,
    });
    const body = await response.json().catch(() => null) as unknown;

    if (!response.ok) {
      throw new Error(getCallableErrorMessage(body, response.status));
    }

    const result = getCallableResult(body);
    if (!result) {
      throw new Error('The public content service returned an invalid response.');
    }

    return result as PublicAgentContentResponse;
  }

  private getCallableUrl(): string {
    const projectId = this.app.options.projectId?.trim();
    if (!projectId) {
      throw new Error('Firebase project configuration is missing.');
    }

    const emulator = this.emulators?.functions;
    if (emulator) {
      return `http://${emulator.host}:${emulator.port}/${projectId}/us-east1/getPublicAgentContent`;
    }

    return `https://us-east1-${projectId}.cloudfunctions.net/getPublicAgentContent`;
  }
}

function getCallableResult(value: unknown): PublicAgentContentResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const result = value['result'] ?? value['data'];
  return isRecord(result) ? result as unknown as PublicAgentContentResponse : null;
}

function getCallableErrorMessage(value: unknown, status: number): string {
  if (isRecord(value) && isRecord(value['error']) && typeof value['error']['message'] === 'string') {
    return value['error']['message'];
  }

  return `The public content service request failed (${status}).`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
