import {Injectable, inject} from '@angular/core';
import {Functions, httpsCallable} from '@angular/fire/functions';

import {
  BlogAssistantContext,
  BlogAssistantResult,
  BlogStoredThumbnail,
  BlogThumbnailGenerationRequest,
} from '../models/blog-ai-assistant.model';

@Injectable({
  providedIn: 'root',
})
export class BlogAiFunctionsService {
  private readonly functions = inject(Functions, {optional: true});

  async generateMetadata(context: BlogAssistantContext): Promise<BlogAssistantResult> {
    const functions = this.getFunctions();
    const callable = httpsCallable<BlogAssistantContext, BlogAssistantResult>(functions, 'generateBlogMetadata');
    const result = await callable(context);

    return result.data;
  }

  async generateAndStoreThumbnail(request: BlogThumbnailGenerationRequest): Promise<BlogStoredThumbnail> {
    const functions = this.getFunctions();
    const callable = httpsCallable<BlogThumbnailGenerationRequest, BlogStoredThumbnail>(
      functions,
      'generateAndStoreBlogThumbnail',
      {timeout: 300000}
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
