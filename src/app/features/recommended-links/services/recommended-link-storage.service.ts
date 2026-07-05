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
import {RecommendedLink} from '../models/recommended-link.model';
import {isRecommendedLink, isRecord} from '../utils/recommended-link-validation.util';

export const RECOMMENDED_LINKS_COLLECTION = 'recommendedLinks';
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
export class RecommendedLinkStorageService {
  private readonly firestore: Firestore | null = inject(FIREBASE_FIRESTORE, {optional: true});
  private readonly auth: Auth | null = inject(FIREBASE_AUTH, {optional: true});
  private readonly destroyRef = inject(DestroyRef);
  private readonly linksSubject = new BehaviorSubject<readonly RecommendedLink[]>([]);
  private readonly loadingSubject = new BehaviorSubject<boolean>(Boolean(this.firestore));
  private readonly errorSubject = new BehaviorSubject<string | null>(this.firestore ? null : 'Firebase Firestore is not initialized.');
  private firestoreUnsubscribe: (() => void) | undefined;

  readonly links$ = this.linksSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  constructor() {
    const authUnsubscribe = this.startAuthAwareFirestoreSync();
    this.destroyRef.onDestroy(() => {
      authUnsubscribe?.();
      this.firestoreUnsubscribe?.();
    });
  }

  getLinks(): readonly RecommendedLink[] {
    return this.linksSubject.value;
  }

  async saveRecommendedLink(link: RecommendedLink): Promise<void> {
    await this.saveRecommendedLinkToFirestore(link);
  }

  async saveRecommendedLinks(links: readonly RecommendedLink[]): Promise<void> {
    await this.saveRecommendedLinksToFirestore(links);
  }

  async deleteRecommendedLink(linkId: string): Promise<void> {
    await this.deleteRecommendedLinkFromFirestore(linkId);
  }

  async backupRecommendedLinksToFirestore(links: readonly RecommendedLink[]): Promise<number> {
    await this.saveRecommendedLinksToFirestore(links);
    return links.length;
  }

  async loadRecommendedLinksFromFirestore(): Promise<readonly RecommendedLink[]> {
    const firestore = this.requireFirestore();
    const snapshot = await getDocs(collection(firestore, RECOMMENDED_LINKS_COLLECTION));
    const links = this.toRecommendedLinks(snapshot.docs.map(linkSnapshot => linkSnapshot.data()));

    this.linksSubject.next(links);
    return links;
  }

  async loadPublishedRecommendedLinksFromFirestore(): Promise<readonly RecommendedLink[]> {
    const firestore = this.requireFirestore();
    const snapshot = await getDocs(
      query(collection(firestore, RECOMMENDED_LINKS_COLLECTION), where('status', '==', 'published'))
    );

    return this.toRecommendedLinks(snapshot.docs.map(linkSnapshot => linkSnapshot.data()));
  }

  private startAuthAwareFirestoreSync(): (() => void) | undefined {
    if (!this.firestore) {
      return undefined;
    }

    if (!this.auth) {
      this.listenToPublishedFirestoreRecommendedLinks();
      return undefined;
    }

    return onAuthStateChanged(this.auth, user => {
      void this.updateFirestoreListener(user);
    });
  }

  private async updateFirestoreListener(user: User | null): Promise<void> {
    if (!user) {
      this.listenToPublishedFirestoreRecommendedLinks();
      return;
    }

    try {
      const tokenResult = await getIdTokenResult(user);
      const claims = tokenResult.claims as Record<string, unknown>;

      if (canManageCmsContent(claims)) {
        this.listenToAllFirestoreRecommendedLinks();
        return;
      }
    } catch {
      // Fall back to the public published query if claims cannot be resolved.
    }

    this.listenToPublishedFirestoreRecommendedLinks();
  }

  private listenToAllFirestoreRecommendedLinks(): void {
    const firestore = this.firestore;

    if (!firestore) {
      return;
    }

    this.firestoreUnsubscribe?.();
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.firestoreUnsubscribe = onSnapshot(
      collection(firestore, RECOMMENDED_LINKS_COLLECTION),
      snapshot => {
        const remoteLinks = snapshot.docs
          .map(linkSnapshot => this.fromFirestoreRecommendedLink(linkSnapshot.data()))
          .filter((link): link is RecommendedLink => link !== null);

        this.linksSubject.next(remoteLinks);
        this.loadingSubject.next(false);
      },
      error => {
        console.error('[RecommendedLinkStorageService] Admin recommended links snapshot error:', error);
        this.linksSubject.next([]);
        this.loadingSubject.next(false);
        this.errorSubject.next(this.describeSnapshotError(error));
      }
    );
  }

  private listenToPublishedFirestoreRecommendedLinks(): void {
    const firestore = this.firestore;

    if (!firestore) {
      return;
    }

    this.firestoreUnsubscribe?.();
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.firestoreUnsubscribe = onSnapshot(
      query(collection(firestore, RECOMMENDED_LINKS_COLLECTION), where('status', '==', 'published')),
      snapshot => {
        const remotePublishedLinks = snapshot.docs
          .map(linkSnapshot => this.fromFirestoreRecommendedLink(linkSnapshot.data()))
          .filter((link): link is RecommendedLink => link !== null);

        this.linksSubject.next(remotePublishedLinks);
        this.loadingSubject.next(false);
      },
      error => {
        console.error('[RecommendedLinkStorageService] Published recommended links snapshot error:', error);
        this.linksSubject.next([]);
        this.loadingSubject.next(false);
        this.errorSubject.next(this.describeSnapshotError(error));
      }
    );
  }

  private describeSnapshotError(error: unknown): string {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'permission-denied':
          return 'Unable to load recommended links: access was denied.';
        case 'unavailable':
          return 'Unable to load recommended links: the service is temporarily unavailable.';
        case 'not-found':
          return 'Unable to load recommended links: the recommended links collection was not found.';
        default:
          return `Unable to load recommended links: ${error.message}`;
      }
    }

    return error instanceof Error ? error.message : 'Unable to load recommended links.';
  }

  private async saveRecommendedLinkToFirestore(link: RecommendedLink): Promise<void> {
    const firestore = this.requireFirestore();
    await setDoc(doc(firestore, RECOMMENDED_LINKS_COLLECTION, link.id), this.toFirestoreRecommendedLink(link), {merge: true});
  }

  private async saveRecommendedLinksToFirestore(links: readonly RecommendedLink[]): Promise<void> {
    const firestore = this.requireFirestore();
    await this.commitInBatches(firestore, links, (batch, link) => {
      batch.set(doc(firestore, RECOMMENDED_LINKS_COLLECTION, link.id), this.toFirestoreRecommendedLink(link), {merge: true});
    });
  }

  private async deleteRecommendedLinkFromFirestore(linkId: string): Promise<void> {
    const firestore = this.requireFirestore();
    await deleteDoc(doc(firestore, RECOMMENDED_LINKS_COLLECTION, linkId));
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

  private toFirestoreRecommendedLink(link: RecommendedLink): Record<string, unknown> {
    return {
      ...(removeUndefinedFields(link) as Record<string, unknown>),
      syncedAt: serverTimestamp(),
      storageVersion: 1,
    };
  }

  private fromFirestoreRecommendedLink(value: unknown): RecommendedLink | null {
    return isRecommendedLink(value) ? value : null;
  }

  private toRecommendedLinks(values: readonly unknown[]): readonly RecommendedLink[] {
    return values
      .map(value => this.fromFirestoreRecommendedLink(value))
      .filter((link): link is RecommendedLink => link !== null);
  }

  private requireFirestore(): Firestore {
    if (!this.firestore) {
      throw new Error('Firebase Firestore is not initialized.');
    }

    return this.firestore;
  }
}
