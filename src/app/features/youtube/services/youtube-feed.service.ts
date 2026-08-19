import {Injectable, inject} from '@angular/core';
import {Functions, httpsCallable} from 'firebase/functions';
import {Observable, from, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';

import {FIREBASE_FUNCTIONS} from '../../../services/firebase/firebase.tokens';
import {PRIMARY_YOUTUBE_CHANNEL_KEY, type YouTubeChannelKey} from '../../../shared/seo/site-identity';
import {YouTubeFeedRequest, YouTubeFeedResponse} from '../models/youtube-video.model';
import {assertCanonicalYouTubeFeed} from '../utils/youtube-feed-identity.util';

interface FirebaseCallableResult<T> {
  data: T;
}

@Injectable({providedIn: 'root'})
export class YouTubeFeedService {
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  getLatestVideos$(
    maxResults = 3,
    channel: YouTubeChannelKey = PRIMARY_YOUTUBE_CHANNEL_KEY,
  ): Observable<YouTubeFeedResponse> {
    const functions = this.getFunctions();

    if (!functions) {
      return throwError(() => new Error('Firebase Functions is not initialized.'));
    }

    const callable = httpsCallable<YouTubeFeedRequest, YouTubeFeedResponse>(
      functions,
      'getLatestYouTubeVideos',
      {timeout: 30000}
    );

    return from(callable({maxResults, channel}) as Promise<FirebaseCallableResult<YouTubeFeedResponse>>).pipe(
      map(result => assertCanonicalYouTubeFeed(result.data, channel)),
      catchError(error => throwError(() => new Error(this.getFeedErrorMessage(error))))
    );
  }

  private getFunctions(): Functions | null {
    return this.functions ?? null;
  }

  private getFeedErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return `YouTube feed failed: ${error.message}`;
    }

    return 'YouTube feed failed. Confirm the Firebase callable function is deployed and configured.';
  }
}
