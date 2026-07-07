import {inject, Injectable} from '@angular/core';
import {
  collection,
  Firestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import {Functions, httpsCallable} from 'firebase/functions';
import {Observable} from 'rxjs';

import {BlogComment, BlogCommentStatus} from '../../../features/blog/models/blog-comment.model';
import {FIREBASE_FIRESTORE, FIREBASE_FUNCTIONS} from '../../../services/firebase/firebase.tokens';

export type CommentModerationAction = 'approve' | 'hide' | 'restore' | 'delete';

interface ModeratePostCommentRequest {
  commentId: string;
  action: CommentModerationAction;
}

interface ModeratePostCommentResponse {
  comment: BlogComment;
  trustedAuthor: boolean;
  awardedPoints: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CommentModerationService {
  private readonly firestore = inject(FIREBASE_FIRESTORE, {optional: true});
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  listenToComments(status: BlogCommentStatus, maxComments = 100): Observable<readonly BlogComment[]> {
    const commentsQuery = query(
      collection(this.getFirestore(), 'postComments'),
      where('status', '==', status),
      orderBy('createdAt', 'desc'),
      limit(maxComments)
    );

    return new Observable<readonly BlogComment[]>(observer => {
      return onSnapshot(
        commentsQuery,
        snapshot => {
          observer.next(snapshot.docs.map(commentSnapshot => ({
            id: commentSnapshot.id,
            ...commentSnapshot.data(),
          }) as BlogComment));
        },
        error => observer.error(error)
      );
    });
  }

  async moderateComment(commentId: string, action: CommentModerationAction): Promise<ModeratePostCommentResponse> {
    const callable = httpsCallable<ModeratePostCommentRequest, ModeratePostCommentResponse>(
      this.getFunctions(),
      'moderatePostComment'
    );
    const result = await callable({commentId, action});

    return result.data;
  }

  private getFirestore(): Firestore {
    if (!this.firestore) {
      throw new Error('Firebase Firestore is not initialized.');
    }

    return this.firestore;
  }

  private getFunctions(): Functions {
    if (!this.functions) {
      throw new Error('Firebase Functions is not initialized.');
    }

    return this.functions;
  }
}
