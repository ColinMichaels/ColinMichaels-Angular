import {inject, Injectable} from '@angular/core';
import {Functions, httpsCallable} from 'firebase/functions';

import {FIREBASE_FUNCTIONS} from '../../../services/firebase/firebase.tokens';
import {
  PublicSubmissionRequest,
  PublicSubmissionResult,
} from '../models/public-submission.model';

@Injectable({providedIn: 'root'})
export class PublicSubmissionService {
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  async submit(request: PublicSubmissionRequest): Promise<PublicSubmissionResult> {
    const callable = httpsCallable<PublicSubmissionRequest, PublicSubmissionResult>(
      this.getFunctions(),
      'submitPublicSubmission'
    );
    const result = await callable(request);

    if (!result.data.accepted || typeof result.data.referenceId !== 'string') {
      throw new Error('The submission service returned an invalid response.');
    }

    return result.data;
  }

  private getFunctions(): Functions {
    if (!this.functions) {
      throw new Error('Firebase Functions is not initialized.');
    }

    return this.functions;
  }
}
