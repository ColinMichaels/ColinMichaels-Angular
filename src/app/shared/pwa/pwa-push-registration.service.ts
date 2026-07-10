import {Injectable, inject} from '@angular/core';
import {Functions, httpsCallable} from 'firebase/functions';

import {FIREBASE_FUNCTIONS} from '../../services/firebase/firebase.tokens';

export interface PwaPushSubscriptionPayload {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    auth: string;
    p256dh: string;
  };
}

interface RegisterPushSubscriptionRequest {
  subscription: PwaPushSubscriptionPayload;
  locale: string;
}

interface RegisterPushSubscriptionResponse {
  registered: boolean;
  updatedAt: string;
}

interface UnregisterPushSubscriptionRequest {
  endpoint: string;
}

interface UnregisterPushSubscriptionResponse {
  removed: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PwaPushRegistrationService {
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  async register(
    subscription: PwaPushSubscriptionPayload,
    locale: string
  ): Promise<RegisterPushSubscriptionResponse> {
    const callable = httpsCallable<RegisterPushSubscriptionRequest, RegisterPushSubscriptionResponse>(
      this.getFunctions(),
      'registerPushSubscription'
    );
    const result = await callable({subscription, locale});
    return result.data;
  }

  async unregister(endpoint: string): Promise<UnregisterPushSubscriptionResponse> {
    const callable = httpsCallable<UnregisterPushSubscriptionRequest, UnregisterPushSubscriptionResponse>(
      this.getFunctions(),
      'unregisterPushSubscription'
    );
    const result = await callable({endpoint});
    return result.data;
  }

  private getFunctions(): Functions {
    if (!this.functions) {
      throw new Error('Firebase Functions is not initialized.');
    }

    return this.functions;
  }
}
