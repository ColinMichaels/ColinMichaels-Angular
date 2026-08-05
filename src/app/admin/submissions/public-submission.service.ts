import {inject, Injectable} from '@angular/core';
import {collection, Firestore, limit, onSnapshot, orderBy, query} from 'firebase/firestore';
import {Functions, httpsCallable} from 'firebase/functions';
import {Observable} from 'rxjs';

import {FIREBASE_FIRESTORE, FIREBASE_FUNCTIONS} from '../../services/firebase/firebase.tokens';
import {
  PublicSubmission,
  PublicSubmissionResponseResult,
  PublicSubmissionReviewAction,
  PublicSubmissionReviewResult,
  normalizePublicSubmission,
} from './public-submission.models';

interface ReviewPublicSubmissionRequest {
  submissionId: string;
  action: PublicSubmissionReviewAction;
}

interface RespondToPublicSubmissionRequest {
  submissionId: string;
  requestId: string;
  subject: string;
  message: string;
}

@Injectable({providedIn: 'root'})
export class PublicSubmissionService {
  private readonly firestore = inject(FIREBASE_FIRESTORE, {optional: true});
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  listenToSubmissions(maxSubmissions = 200): Observable<readonly PublicSubmission[]> {
    const submissionsQuery = query(
      collection(this.getFirestore(), 'publicSubmissions'),
      orderBy('submittedAt', 'desc'),
      limit(maxSubmissions)
    );

    return new Observable<readonly PublicSubmission[]>(observer => onSnapshot(
      submissionsQuery,
      snapshot => {
        const submissions = snapshot.docs
          .map(documentSnapshot => normalizePublicSubmission(documentSnapshot.id, documentSnapshot.data()))
          .filter((submission): submission is PublicSubmission => submission !== null);
        observer.next(submissions);
      },
      error => observer.error(error)
    ));
  }

  async reviewSubmission(
    submissionId: string,
    action: PublicSubmissionReviewAction
  ): Promise<PublicSubmissionReviewResult> {
    const callable = httpsCallable<ReviewPublicSubmissionRequest, PublicSubmissionReviewResult>(
      this.getFunctions(),
      'reviewPublicSubmission'
    );
    const result = await callable({submissionId, action});
    return result.data;
  }

  async respondToSubmission(
    submissionId: string,
    requestId: string,
    subject: string,
    message: string
  ): Promise<PublicSubmissionResponseResult> {
    const callable = httpsCallable<RespondToPublicSubmissionRequest, PublicSubmissionResponseResult>(
      this.getFunctions(),
      'respondToPublicSubmission'
    );
    const result = await callable({submissionId, requestId, subject, message});
    return result.data;
  }

  createResponseRequestId(): string {
    if (!globalThis.crypto?.randomUUID) {
      throw new Error('Secure response identifiers are unavailable in this browser.');
    }
    return globalThis.crypto.randomUUID();
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
