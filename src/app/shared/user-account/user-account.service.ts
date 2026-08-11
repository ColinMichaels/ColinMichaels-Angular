import {inject, Injectable} from '@angular/core';
import {User} from 'firebase/auth';
import {
  collection,
  doc,
  Firestore,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import {Functions, httpsCallable} from 'firebase/functions';
import {Observable} from 'rxjs';

import {FIREBASE_FIRESTORE, FIREBASE_FUNCTIONS} from '../../services/firebase/firebase.tokens';
import {
  CommunicationPreferenceSource,
  UserAccountDocument,
  UserCommunicationPreferences,
  UserPointEvent,
} from './user-account.model';

interface BootstrapUserProfileRequest {
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerIds: readonly string[];
  emailVerified: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UserAccountService {
  private readonly firestore = inject(FIREBASE_FIRESTORE, {optional: true});
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  async bootstrapUserProfile(user: User): Promise<UserAccountDocument> {
    const callable = httpsCallable<BootstrapUserProfileRequest, UserAccountDocument>(
      this.getFunctions(),
      'bootstrapUserProfile'
    );
    const result = await callable({
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      providerIds: user.providerData.map(provider => provider.providerId),
      emailVerified: user.emailVerified,
    });

    return result.data;
  }

  listenToUserAccount(uid: string): Observable<UserAccountDocument | null> {
    const firestore = this.getFirestore();
    const accountRef = doc(firestore, 'users', uid);

    return new Observable<UserAccountDocument | null>(observer => {
      return onSnapshot(
        accountRef,
        snapshot => {
          observer.next(snapshot.exists() ? snapshot.data() as UserAccountDocument : null);
        },
        error => observer.error(error)
      );
    });
  }

  async getUserAccount(uid: string): Promise<UserAccountDocument | null> {
    const accountSnapshot = await getDoc(doc(this.getFirestore(), 'users', uid));

    return accountSnapshot.exists() ? accountSnapshot.data() as UserAccountDocument : null;
  }

  listenToPointEvents(uid: string, maxEvents = 12): Observable<readonly UserPointEvent[]> {
    const firestore = this.getFirestore();
    const eventsQuery = query(
      collection(firestore, 'userPointEvents'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(maxEvents)
    );

    return new Observable<readonly UserPointEvent[]>(observer => {
      return onSnapshot(
        eventsQuery,
        snapshot => {
          observer.next(snapshot.docs.map(eventSnapshot => ({
            id: eventSnapshot.id,
            ...eventSnapshot.data(),
          }) as UserPointEvent));
        },
        error => observer.error(error)
      );
    });
  }

  async updateCommunicationPreferences(
    uid: string,
    preferences: Pick<UserCommunicationPreferences, 'newPostEmails' | 'newsletter'>,
    source: CommunicationPreferenceSource
  ): Promise<UserCommunicationPreferences> {
    const communicationPreferences: UserCommunicationPreferences = {
      newPostEmails: preferences.newPostEmails,
      newsletter: preferences.newsletter,
      source,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(doc(this.getFirestore(), 'users', uid), {
      communicationPreferences,
      updatedAt: communicationPreferences.updatedAt,
    });

    return communicationPreferences;
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
