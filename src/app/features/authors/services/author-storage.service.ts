import {DestroyRef, Injectable, inject} from '@angular/core';
import {getIdTokenResult, onAuthStateChanged, User} from 'firebase/auth';
import {collection, doc, Firestore, query, setDoc, where} from 'firebase/firestore';
import {BehaviorSubject} from 'rxjs';

import {FIREBASE_AUTH, FIREBASE_FIRESTORE} from '../../../services/firebase/firebase.tokens';
import {FirestoreCollectionSync} from '../../../services/firebase/firestore-collection-sync';
import {removeUndefinedFirestoreFields} from '../../../services/firebase/firestore-data.util';
import {canManageCmsContent} from '../../../shared/user-account/user-account.model';
import {AuthorProfile} from '../models/author.model';
import {isAuthorProfile} from '../utils/author-validation.util';

export const AUTHORS_COLLECTION = 'authors';

@Injectable({providedIn: 'root'})
export class AuthorStorageService {
  private readonly firestore = inject(FIREBASE_FIRESTORE, {optional: true});
  private readonly auth = inject(FIREBASE_AUTH, {optional: true});
  private readonly destroyRef = inject(DestroyRef);
  private readonly authorsSubject = new BehaviorSubject<readonly AuthorProfile[]>([]);
  private readonly loadingSubject = new BehaviorSubject(Boolean(this.firestore));
  private readonly errorSubject = new BehaviorSubject<string | null>(this.firestore ? null : 'Firebase Firestore is not initialized.');
  private readonly remoteSync = new FirestoreCollectionSync<AuthorProfile>(
    this.authorsSubject,
    this.loadingSubject,
    this.errorSubject,
    value => isAuthorProfile(value) ? value : null,
    error => error instanceof Error ? error.message : 'Unable to load authors.'
  );

  readonly authors$ = this.authorsSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  constructor() {
    const unsubscribe = this.startSync();
    this.destroyRef.onDestroy(() => {
      unsubscribe?.();
      this.remoteSync.stop();
    });
  }

  getAuthors(): readonly AuthorProfile[] {
    return this.authorsSubject.value;
  }

  async saveAuthor(author: AuthorProfile): Promise<void> {
    if (!this.firestore) {
      throw new Error('Firebase Firestore is not initialized.');
    }

    await setDoc(
      doc(this.firestore, AUTHORS_COLLECTION, author.id),
      removeUndefinedFirestoreFields(author) as Record<string, unknown>,
      {merge: true}
    );

    this.authorsSubject.next([
      ...this.authorsSubject.value.filter(savedAuthor => savedAuthor.id !== author.id),
      author,
    ]);
  }

  private startSync(): (() => void) | undefined {
    if (!this.firestore) {
      return undefined;
    }

    if (!this.auth) {
      this.listenToPublishedAuthors();
      return undefined;
    }

    return onAuthStateChanged(this.auth, user => void this.updateListener(user));
  }

  private async updateListener(user: User | null): Promise<void> {
    if (user) {
      try {
        const claims = (await getIdTokenResult(user)).claims as Record<string, unknown>;
        if (canManageCmsContent(claims)) {
          this.remoteSync.listen(collection(this.firestore as Firestore, AUTHORS_COLLECTION), '[AuthorStorageService] Admin authors snapshot error:');
          return;
        }
      } catch {
        // Public author data remains available when claims cannot be resolved.
      }
    }

    this.listenToPublishedAuthors();
  }

  private listenToPublishedAuthors(): void {
    if (!this.firestore) {
      return;
    }

    this.remoteSync.listen(
      query(collection(this.firestore, AUTHORS_COLLECTION), where('status', '==', 'published')),
      '[AuthorStorageService] Published authors snapshot error:'
    );
  }
}
