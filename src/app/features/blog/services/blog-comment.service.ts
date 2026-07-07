import {inject, Injectable} from '@angular/core';
import {
  collection,
  Firestore,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import {Functions, httpsCallable} from 'firebase/functions';
import {Observable} from 'rxjs';

import {FIREBASE_FIRESTORE, FIREBASE_FUNCTIONS} from '../../../services/firebase/firebase.tokens';
import {BlogComment, BlogCommentListResult, SubmitBlogCommentResult} from '../models/blog-comment.model';

export const BLOG_COMMENT_PAGE_SIZE = 10;

interface SubmitBlogCommentRequest {
  postId: string;
  postSlug: string;
  body: string;
  parentCommentId?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class BlogCommentService {
  private readonly firestore = inject(FIREBASE_FIRESTORE, {optional: true});
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  listenToApprovedComments(postSlug: string, maxComments = BLOG_COMMENT_PAGE_SIZE): Observable<BlogCommentListResult> {
    const normalizedMaxComments = Math.max(1, Math.floor(maxComments));
    const commentsQuery = query(
      collection(this.getFirestore(), 'postComments'),
      where('postSlug', '==', postSlug),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'asc'),
      limitToLast(normalizedMaxComments + 1)
    );

    return new Observable<BlogCommentListResult>(observer => {
      return onSnapshot(
        commentsQuery,
        snapshot => {
          const comments = snapshot.docs.map(commentSnapshot => ({
            id: commentSnapshot.id,
            ...commentSnapshot.data(),
          }) as BlogComment);
          const hasMore = comments.length > normalizedMaxComments;

          observer.next({
            comments: hasMore ? comments.slice(1) : comments,
            hasMore,
          });
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
