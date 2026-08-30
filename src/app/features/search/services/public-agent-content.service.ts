import {inject, Injectable} from '@angular/core';
import {Functions, httpsCallable} from 'firebase/functions';

import {FIREBASE_FUNCTIONS} from '../../../services/firebase/firebase.tokens';

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
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  search(query: string): Promise<PublicAgentContentResponse> {
    return this.request({operation: 'search', query});
  }

  getArticle(canonicalUrl: string): Promise<PublicAgentContentResponse> {
    return this.request({operation: 'getArticle', canonicalUrl});
  }

  getTopic(topicSlug: string): Promise<PublicAgentContentResponse> {
    return this.request({operation: 'getTopic', topicSlug});
  }

  private async request(request: PublicAgentContentRequest): Promise<PublicAgentContentResponse> {
    const callable = httpsCallable<PublicAgentContentRequest, PublicAgentContentResponse>(
      this.getFunctions(),
      'getPublicAgentContent',
      {timeout: 15_000},
    );
    const result = await callable(request);
    return result.data;
  }

  private getFunctions(): Functions {
    if (!this.functions) {
      throw new Error('Firebase Functions is not initialized.');
    }

    return this.functions;
  }
}
