import {inject, Injectable} from '@angular/core';
import {Functions, httpsCallable} from 'firebase/functions';

import {FIREBASE_FUNCTIONS} from '../../../services/firebase/firebase.tokens';
import {
  DailyDiscoveryAnswerRequest,
  DailyDiscoveryAnswerResult,
  DailyDiscoveryChallenge,
} from '../models/daily-discovery.model';

@Injectable({
  providedIn: 'root',
})
export class DailyDiscoveryService {
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  async getChallenge(completedChallengeIds: readonly string[] = []): Promise<DailyDiscoveryChallenge> {
    const callable = httpsCallable<{completedChallengeIds: readonly string[]}, DailyDiscoveryChallenge>(
      this.getFunctions(),
      'getDailyDiscoveryChallenge'
    );
    const result = await callable({completedChallengeIds});

    return result.data;
  }

  async submitAnswer(request: DailyDiscoveryAnswerRequest): Promise<DailyDiscoveryAnswerResult> {
    const callable = httpsCallable<DailyDiscoveryAnswerRequest, DailyDiscoveryAnswerResult>(
      this.getFunctions(),
      'submitDailyDiscoveryAnswer'
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
