import {Injectable, inject} from '@angular/core';
import {FirebaseError} from 'firebase/app';
import {Functions, httpsCallable} from 'firebase/functions';

import {FIREBASE_FUNCTIONS} from '../../../services/firebase/firebase.tokens';
import {BlogPost} from '../models/blog-post.model';
import {BlogPostRevisionConflictError} from '../models/blog-post-revision.model';
import {hasTrustedBlogPostUrls, isBlogPost, isRecord} from '../utils/blog-validation.util';

type BlogMutationOperation = 'save' | 'issuePreview' | 'revokePreview' | 'delete';

interface BlogMutationRequest {
  operation: BlogMutationOperation;
  postId: string;
  expectedRevision: number;
  requestId: string;
  post?: BlogPost;
}

interface BlogMutationResponse {
  deleted: boolean;
  post: unknown;
  replayed: boolean;
}

@Injectable({providedIn: 'root'})
export class BlogPublishingService {
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  savePost(post: BlogPost, expectedRevision: number): Promise<BlogPost> {
    if (!hasTrustedBlogPostUrls(post)) {
      return Promise.reject(new Error('Post URLs must use HTTP(S) or safe site media paths before saving.'));
    }

    return this.mutate({
      operation: 'save',
      postId: post.id,
      expectedRevision,
      requestId: this.createRequestId(),
      post: this.toCallablePost(post),
    }).then(response => this.requirePost(response));
  }

  issuePreview(postId: string, expectedRevision: number): Promise<BlogPost> {
    return this.mutate({
      operation: 'issuePreview',
      postId,
      expectedRevision,
      requestId: this.createRequestId(),
    }).then(response => this.requirePost(response));
  }

  revokePreview(postId: string, expectedRevision: number): Promise<BlogPost> {
    return this.mutate({
      operation: 'revokePreview',
      postId,
      expectedRevision,
      requestId: this.createRequestId(),
    }).then(response => this.requirePost(response));
  }

  async deletePost(postId: string, expectedRevision: number): Promise<boolean> {
    const response = await this.mutate({
      operation: 'delete',
      postId,
      expectedRevision,
      requestId: this.createRequestId(),
    });
    return response.deleted;
  }

  private async mutate(request: BlogMutationRequest): Promise<BlogMutationResponse> {
    try {
      const callable = httpsCallable<BlogMutationRequest, BlogMutationResponse>(
        this.getFunctions(),
        'mutateBlogPost'
      );
      const result = await callable(request);
      return result.data;
    } catch (error) {
      throw this.toPublishingError(error, request);
    }
  }

  private requirePost(response: BlogMutationResponse): BlogPost {
    if (!isBlogPost(response.post)) {
      throw new Error('Trusted publishing returned an invalid post document.');
    }
    return response.post;
  }

  private toPublishingError(error: unknown, request: BlogMutationRequest): Error {
    if (error instanceof FirebaseError && error.code === 'functions/aborted') {
      const directDetails = (error as FirebaseError & {details?: unknown}).details;
      const details = isRecord(directDetails)
        ? directDetails
        : (isRecord(error.customData) ? error.customData['details'] : undefined);
      if (isRecord(details) && details['kind'] === 'revision-conflict') {
        const remotePost = isBlogPost(details['remotePost']) ? details['remotePost'] : undefined;
        const actualRevision = typeof details['actualRevision'] === 'number' ? details['actualRevision'] : null;
        return new BlogPostRevisionConflictError(
          request.postId,
          request.expectedRevision,
          actualRevision,
          remotePost
        );
      }
    }

    if (error instanceof Error) {
      return error;
    }
    return new Error('Trusted publishing request failed.');
  }

  private createRequestId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    const random = Math.random().toString(36).slice(2);
    return `mutation-${Date.now().toString(36)}-${random}`;
  }

  private toCallablePost(post: BlogPost): BlogPost {
    return JSON.parse(JSON.stringify(post)) as BlogPost;
  }

  private getFunctions(): Functions {
    if (!this.functions) {
      throw new Error('Firebase Functions is not initialized.');
    }
    return this.functions;
  }
}
