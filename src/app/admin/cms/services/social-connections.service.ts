import {Injectable, inject} from '@angular/core';
import {Functions, httpsCallable} from 'firebase/functions';

import {FIREBASE_FUNCTIONS} from '../../../services/firebase/firebase.tokens';
import {
  BeginSocialConnectionResponse,
  SocialConnectionProvider,
  SocialConnectionsResponse,
} from '../models/social-connection.model';

@Injectable({providedIn: 'root'})
export class SocialConnectionsService {
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  async listConnections(): Promise<SocialConnectionsResponse> {
    const callable = httpsCallable<Record<string, never>, SocialConnectionsResponse>(
      this.getFunctions(),
      'listSocialConnections'
    );
    const result = await callable({});
    return result.data;
  }

  async beginConnection(provider: SocialConnectionProvider): Promise<BeginSocialConnectionResponse> {
    const callable = httpsCallable<{provider: SocialConnectionProvider}, BeginSocialConnectionResponse>(
      this.getFunctions(),
      'beginSocialConnection'
    );
    const result = await callable({provider});
    return result.data;
  }

  async selectAccount(provider: 'facebook' | 'instagram', accountId: string): Promise<void> {
    const callable = httpsCallable<{ provider: 'facebook' | 'instagram'; accountId: string }, unknown>(
      this.getFunctions(),
      'selectSocialConnectionAccount'
    );
    await callable({provider, accountId});
  }

  async disconnect(provider: SocialConnectionProvider): Promise<void> {
    const callable = httpsCallable<{provider: SocialConnectionProvider}, unknown>(
      this.getFunctions(),
      'disconnectSocialConnection'
    );
    await callable({provider});
  }

  private getFunctions(): Functions {
    if (!this.functions) {
      throw new Error('Firebase Functions is not initialized.');
    }

    return this.functions;
  }
}
