import {DestroyRef, Injectable, inject} from '@angular/core';
import {FirebaseError} from 'firebase/app';
import {Auth, getIdTokenResult, onAuthStateChanged, User} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {BehaviorSubject} from 'rxjs';

import {FIREBASE_AUTH, FIREBASE_FIRESTORE} from '../../../services/firebase/firebase.tokens';
import {canManageCmsContent} from '../../../shared/user-account/user-account.model';
import {TopicHub} from '../topic-hubs.data';
import {isRecord, isTopicHub} from '../utils/topic-hub-validation.util';

export const TOPIC_HUBS_COLLECTION = 'topics';
const FIRESTORE_BATCH_LIMIT = 450;

type FirestoreWriteBatch = ReturnType<typeof writeBatch>;

function removeUndefinedFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => removeUndefinedFields(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  const cleanedValue: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      cleanedValue[key] = removeUndefinedFields(entry);
    }
  }

  return cleanedValue;
}

@Injectable({
  providedIn: 'root',
})
export class TopicHubStorageService {
  private readonly firestore: Firestore | null = inject(FIREBASE_FIRESTORE, {optional: true});
  private readonly auth: Auth | null = inject(FIREBASE_AUTH, {optional: true});
  private readonly destroyRef = inject(DestroyRef);
  private readonly topicsSubject = new BehaviorSubject<readonly TopicHub[]>([]);
  private readonly loadingSubject = new BehaviorSubject<boolean>(Boolean(this.firestore));
  private readonly errorSubject = new BehaviorSubject<string | null>(this.firestore ? null : 'Firebase Firestore is not initialized.');
  private firestoreUnsubscribe: (() => void) | undefined;

  readonly topics$ = this.topicsSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  constructor() {
    const authUnsubscribe = this.startAuthAwareFirestoreSync();
    this.destroyRef.onDestroy(() => {
      authUnsubscribe?.();
      this.firestoreUnsubscribe?.();
    });
  }

  getTopics(): readonly TopicHub[] {
    return this.topicsSubject.value;
  }

  async saveTopicHub(topicHub: TopicHub): Promise<void> {
    await this.saveTopicHubToFirestore(topicHub);
  }

  async saveTopicHubs(topicHubs: readonly TopicHub[]): Promise<void> {
    await this.saveTopicHubsToFirestore(topicHubs);
  }

  async deleteTopicHub(topicHubId: string): Promise<void> {
    await this.deleteTopicHubFromFirestore(topicHubId);
  }

  async backupTopicHubsToFirestore(topicHubs: readonly TopicHub[]): Promise<number> {
    await this.saveTopicHubsToFirestore(topicHubs);
    return topicHubs.length;
  }

  async loadTopicHubsFromFirestore(): Promise<readonly TopicHub[]> {
    const firestore = this.requireFirestore();
    const snapshot = await getDocs(collection(firestore, TOPIC_HUBS_COLLECTION));
    const topicHubs = this.toTopicHubs(snapshot.docs.map(topicSnapshot => topicSnapshot.data()));

    this.topicsSubject.next(topicHubs);
    return topicHubs;
  }

  async loadPublishedTopicHubsFromFirestore(): Promise<readonly TopicHub[]> {
    const firestore = this.requireFirestore();
    const snapshot = await getDocs(
      query(collection(firestore, TOPIC_HUBS_COLLECTION), where('status', '==', 'published'))
    );

    return this.toTopicHubs(snapshot.docs.map(topicSnapshot => topicSnapshot.data()));
  }

  private startAuthAwareFirestoreSync(): (() => void) | undefined {
    if (!this.firestore) {
      return undefined;
    }

    if (!this.auth) {
      this.listenToPublishedFirestoreTopicHubs();
      return undefined;
    }

    return onAuthStateChanged(this.auth, user => {
      void this.updateFirestoreListener(user);
    });
  }

  private async updateFirestoreListener(user: User | null): Promise<void> {
    if (!user) {
      this.listenToPublishedFirestoreTopicHubs();
      return;
    }

    try {
      const tokenResult = await getIdTokenResult(user);
      const claims = tokenResult.claims as Record<string, unknown>;

      if (canManageCmsContent(claims)) {
        this.listenToAllFirestoreTopicHubs();
        return;
      }
    } catch {
      // Fall back to the public published query if claims cannot be resolved.
    }

    this.listenToPublishedFirestoreTopicHubs();
  }

  private listenToAllFirestoreTopicHubs(): void {
    const firestore = this.firestore;

    if (!firestore) {
      return;
    }

    this.firestoreUnsubscribe?.();
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.firestoreUnsubscribe = onSnapshot(
      collection(firestore, TOPIC_HUBS_COLLECTION),
      snapshot => {
        const remoteTopicHubs = snapshot.docs
          .map(topicSnapshot => this.fromFirestoreTopicHub(topicSnapshot.data()))
          .filter((topicHub): topicHub is TopicHub => topicHub !== null);

        this.topicsSubject.next(remoteTopicHubs);
        this.loadingSubject.next(false);
      },
      error => {
        console.error('[TopicHubStorageService] Admin topics snapshot error:', error);
        this.topicsSubject.next([]);
        this.loadingSubject.next(false);
        this.errorSubject.next(this.describeSnapshotError(error));
      }
    );
  }

  private listenToPublishedFirestoreTopicHubs(): void {
    const firestore = this.firestore;

    if (!firestore) {
      return;
    }

    this.firestoreUnsubscribe?.();
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.firestoreUnsubscribe = onSnapshot(
      query(collection(firestore, TOPIC_HUBS_COLLECTION), where('status', '==', 'published')),
      snapshot => {
        const remotePublishedTopicHubs = snapshot.docs
          .map(topicSnapshot => this.fromFirestoreTopicHub(topicSnapshot.data()))
          .filter((topicHub): topicHub is TopicHub => topicHub !== null);

        this.topicsSubject.next(remotePublishedTopicHubs);
        this.loadingSubject.next(false);
      },
      error => {
        console.error('[TopicHubStorageService] Published topics snapshot error:', error);
        this.topicsSubject.next([]);
        this.loadingSubject.next(false);
        this.errorSubject.next(this.describeSnapshotError(error));
      }
    );
  }

  private describeSnapshotError(error: unknown): string {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'permission-denied':
          return 'Unable to load topics: access was denied.';
        case 'unavailable':
          return 'Unable to load topics: the service is temporarily unavailable.';
        case 'not-found':
          return 'Unable to load topics: the topics collection was not found.';
        default:
          return `Unable to load topics: ${error.message}`;
      }
    }

    return error instanceof Error ? error.message : 'Unable to load topics.';
  }

  private async saveTopicHubToFirestore(topicHub: TopicHub): Promise<void> {
    const firestore = this.requireFirestore();
    await setDoc(doc(firestore, TOPIC_HUBS_COLLECTION, topicHub.id), this.toFirestoreTopicHub(topicHub), {merge: true});
  }

  private async saveTopicHubsToFirestore(topicHubs: readonly TopicHub[]): Promise<void> {
    const firestore = this.requireFirestore();
    await this.commitInBatches(firestore, topicHubs, (batch, topicHub) => {
      batch.set(doc(firestore, TOPIC_HUBS_COLLECTION, topicHub.id), this.toFirestoreTopicHub(topicHub), {merge: true});
    });
  }

  private async deleteTopicHubFromFirestore(topicHubId: string): Promise<void> {
    const firestore = this.requireFirestore();
    await deleteDoc(doc(firestore, TOPIC_HUBS_COLLECTION, topicHubId));
  }

  private async commitInBatches<T>(
    firestore: Firestore,
    items: readonly T[],
    enqueue: (batch: FirestoreWriteBatch, item: T) => void
  ): Promise<void> {
    for (let index = 0; index < items.length; index += FIRESTORE_BATCH_LIMIT) {
      const batch = writeBatch(firestore);
      const chunk = items.slice(index, index + FIRESTORE_BATCH_LIMIT);

      for (const item of chunk) {
        enqueue(batch, item);
      }

      await batch.commit();
    }
  }

  private toFirestoreTopicHub(topicHub: TopicHub): Record<string, unknown> {
    return {
      ...(removeUndefinedFields(topicHub) as Record<string, unknown>),
      syncedAt: serverTimestamp(),
      storageVersion: 1,
    };
  }

  private fromFirestoreTopicHub(value: unknown): TopicHub | null {
    return isTopicHub(value) ? value : null;
  }

  private toTopicHubs(values: readonly unknown[]): readonly TopicHub[] {
    return values
      .map(value => this.fromFirestoreTopicHub(value))
      .filter((topicHub): topicHub is TopicHub => topicHub !== null);
  }

  private requireFirestore(): Firestore {
    if (!this.firestore) {
      throw new Error('Firebase Firestore is not initialized.');
    }

    return this.firestore;
  }
}
