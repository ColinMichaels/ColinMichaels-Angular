import {Injectable, inject} from '@angular/core';
import {FirebaseError} from 'firebase/app';
import {Functions, httpsCallable} from 'firebase/functions';

import {FIREBASE_FUNCTIONS} from '../../../services/firebase/firebase.tokens';
import {BlogEditorialMetadata, BlogPost} from '../models/blog-post.model';
import {BlogPostRevisionConflictError} from '../models/blog-post-revision.model';
import {normalizeBlogEditorialMetadata} from '../utils/blog-editorial-metadata.util';
import {hasTrustedBlogPostUrls, isBlogPost, isRecord} from '../utils/blog-validation.util';

type BlogMutationOperation = 'save' | 'updateEditorial' | 'issuePreview' | 'revokePreview' | 'delete';

interface BlogMutationRequest {
  operation: BlogMutationOperation;
  postId: string;
  expectedRevision: number;
  requestId: string;
  editorial?: BlogEditorialMetadata | null;
  post?: BlogPost;
}

interface BlogMutationResponse {
  deleted: boolean;
  editorial?: unknown;
  post: unknown;
  postId?: unknown;
  replayed: boolean;
  revision?: unknown;
  updatedAt?: unknown;
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

  updateEditorial(
    post: BlogPost,
    editorial: BlogEditorialMetadata | undefined,
    expectedRevision: number
  ): Promise<BlogPost> {
    return this.mutate({
      operation: 'updateEditorial',
      postId: post.id,
      expectedRevision,
      requestId: this.createRequestId(),
      editorial: editorial ?? null,
    }).then(response => this.mergeEditorialUpdate(post, response, expectedRevision));
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

  private mergeEditorialUpdate(
    post: BlogPost,
    response: BlogMutationResponse,
    expectedRevision: number
  ): BlogPost {
    const revision = response.revision;
    const updatedAt = response.updatedAt;

    if (response.postId !== post.id
      || !Number.isInteger(revision)
      || revision !== expectedRevision + 1
      || typeof updatedAt !== 'string'
      || !Number.isFinite(new Date(updatedAt).getTime())
      || (response.editorial !== null && !isRecord(response.editorial))) {
      throw new Error('Trusted publishing returned an invalid editorial update.');
    }

    const editorial = response.editorial === null
      ? undefined
      : normalizeBlogEditorialMetadata(response.editorial);

    if (response.editorial !== null && !editorial) {
      throw new Error('Trusted publishing returned invalid editorial metadata.');
    }

    return {
      ...post,
      revision: revision as number,
      updatedAt,
      editorial,
    };
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

    if (error instanceof FirebaseError && error.code === 'functions/internal') {
      const directDetails = (error as FirebaseError & { details?: unknown }).details;
      const details = isRecord(directDetails)
        ? directDetails
        : (isRecord(error.customData) ? error.customData['details'] : undefined);
      const reference = isRecord(details) && typeof details['reference'] === 'string'
        ? details['reference'].trim()
        : '';

      return new Error(
        'The publishing service encountered an unexpected server error. Your draft remains in the editor; retry once.'
        + (reference ? ` If it continues, report reference ${reference}.` : '')
      );
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
