import {inject, Injectable} from '@angular/core';
import {Functions, httpsCallable} from 'firebase/functions';

import {FIREBASE_FUNCTIONS} from '../../../services/firebase/firebase.tokens';
import {
  DailyDiscoveryAdminMutationResult,
  DailyDiscoveryAdminQuestionSet,
  DailyDiscoveryAdminSaveRequest,
} from './daily-discovery-admin.models';

@Injectable({providedIn: 'root'})
export class DailyDiscoveryAdminService {
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  async getQuestionSet(dateKey: string): Promise<DailyDiscoveryAdminQuestionSet> {
    const callable = httpsCallable<{ dateKey: string }, DailyDiscoveryAdminQuestionSet>(
      this.getFunctions(),
      'getAdminDailyDiscoveryQuestionSet'
    );
    const result = await callable({dateKey});

    return result.data;
  }

  async saveQuestionSet(request: DailyDiscoveryAdminSaveRequest): Promise<DailyDiscoveryAdminMutationResult> {
    const callable = httpsCallable<DailyDiscoveryAdminSaveRequest, DailyDiscoveryAdminMutationResult>(
      this.getFunctions(),
      'saveAdminDailyDiscoveryQuestionSet'
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
