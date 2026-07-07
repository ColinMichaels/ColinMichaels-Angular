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

import {FIREBASE_FIRESTORE, FIREBASE_FUNCTIONS} from '../../../services/firebase/firebase.tokens';
import {BlogComment, SubmitBlogCommentResult} from '../models/blog-comment.model';

interface SubmitBlogCommentRequest {
  postId: string;
  postSlug: string;
  body: string;
}

@Injectable({
  providedIn: 'root',
})
export class BlogCommentService {
  private readonly firestore = inject(FIREBASE_FIRESTORE, {optional: true});
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  listenToApprovedComments(postSlug: string, maxComments = 50): Observable<readonly BlogComment[]> {
    const commentsQuery = query(
      collection(this.getFirestore(), 'postComments'),
      where('postSlug', '==', postSlug),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'asc'),
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

  async submitComment(request: SubmitBlogCommentRequest): Promise<SubmitBlogCommentResult> {
    const callable = httpsCallable<SubmitBlogCommentRequest, SubmitBlogCommentResult>(
      this.getFunctions(),
      'submitPostComment'
    );
    const result = await callable(request);

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
