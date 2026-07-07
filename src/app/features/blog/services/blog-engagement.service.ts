import {inject, Injectable} from '@angular/core';
import {Functions, httpsCallable} from 'firebase/functions';

import {FIREBASE_FUNCTIONS} from '../../../services/firebase/firebase.tokens';

export type BlogShareProvider = 'x' | 'linkedin' | 'facebook' | 'email' | 'copy';

interface PostEngagementRequest {
  postId: string;
  postSlug: string;
}

interface PostShareRequest extends PostEngagementRequest {
  provider: BlogShareProvider;
}

export interface PointAwardResult {
  awarded: boolean;
  points: number;
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class BlogEngagementService {
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  async recordPostRead(request: PostEngagementRequest): Promise<PointAwardResult> {
    const callable = httpsCallable<PostEngagementRequest, PointAwardResult>(
      this.getFunctions(),
      'recordPostRead'
    );
    const result = await callable(request);

    return result.data;
  }

  async recordPostShare(request: PostShareRequest): Promise<PointAwardResult> {
    const callable = httpsCallable<PostShareRequest, PointAwardResult>(
      this.getFunctions(),
      'recordPostShare'
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
