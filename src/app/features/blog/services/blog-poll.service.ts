import {inject, Injectable} from '@angular/core';
import {Functions, httpsCallable} from 'firebase/functions';

import {FIREBASE_FUNCTIONS} from '../../../services/firebase/firebase.tokens';
import {
  BlogPollResults,
  BlogPollTarget,
  SubmitBlogPollVoteRequest,
} from '../models/blog-poll.model';

@Injectable({providedIn: 'root'})
export class BlogPollService {
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  async getResults(target: BlogPollTarget): Promise<BlogPollResults> {
    const callable = httpsCallable<BlogPollTarget, BlogPollResults>(
      this.getFunctions(),
      'getPostPollResults'
    );
    const result = await callable(target);
    return result.data;
  }

  async submitVote(request: SubmitBlogPollVoteRequest): Promise<BlogPollResults> {
    const callable = httpsCallable<SubmitBlogPollVoteRequest, BlogPollResults>(
      this.getFunctions(),
      'submitPostPollVote'
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
