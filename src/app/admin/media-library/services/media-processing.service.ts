import {Injectable, inject} from '@angular/core';
import {Functions, httpsCallable} from 'firebase/functions';
import {Observable, from, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';

import {FIREBASE_FUNCTIONS} from '../../../services/firebase/firebase.tokens';
import {ResizeMediaRequest, ResizeMediaResult} from '../models/media-library.models';

interface FirebaseCallableResult<T> {
  data: T;
}

@Injectable({providedIn: 'root'})
export class MediaProcessingService {
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  resizeMedia(request: ResizeMediaRequest): Observable<ResizeMediaResult> {
    const functions = this.getFunctions();

    if (!functions) {
      return throwError(() => new Error('Firebase Functions is not initialized.'));
    }

    const callable = httpsCallable<ResizeMediaRequest, ResizeMediaResult>(
      functions,
      request.mediaIds.length > 1 ? 'batchResizeMedia' : 'resizeMedia',
      {timeout: 300000}
    );

    return from(callable(request) as Promise<FirebaseCallableResult<ResizeMediaResult>>).pipe(
      map(result => result.data),
      catchError(error => throwError(() => new Error(this.getResizeErrorMessage(error))))
    );
  }

  private getFunctions(): Functions | null {
    return this.functions ?? null;
  }

  private getResizeErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return `Resize request failed: ${error.message}`;
    }

    return 'Resize request failed. Confirm the existing Firebase resize function is deployed as resizeMedia or batchResizeMedia.';
  }
}
