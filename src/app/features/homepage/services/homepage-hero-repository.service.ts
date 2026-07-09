import {DestroyRef, Injectable, inject, signal} from '@angular/core';
import {FirebaseError} from 'firebase/app';
import {Auth, onAuthStateChanged} from 'firebase/auth';
import {doc, Firestore, getDoc, onSnapshot, serverTimestamp, setDoc} from 'firebase/firestore';

import {FIREBASE_AUTH, FIREBASE_FIRESTORE} from '../../../services/firebase/firebase.tokens';
import {removeUndefinedFirestoreFields} from '../../../services/firebase/firestore-data.util';
import {
  DEFAULT_HOMEPAGE_HERO_SETTINGS,
  HOMEPAGE_HERO_SETTINGS_COLLECTION,
  HOMEPAGE_HERO_SETTINGS_ID,
} from '../homepage-hero.defaults';
import {HomepageHeroAdminStats, HomepageHeroSettings} from '../models/homepage-hero.model';
import {
  getPublishedHomepageHeroSlides,
  normalizeHomepageHeroSettings,
  normalizeHomepageHeroSettingsForSave,
} from '../utils/homepage-hero-validation.util';

@Injectable({
  providedIn: 'root',
})
export class HomepageHeroRepositoryService {
  private readonly firestore: Firestore | null = inject(FIREBASE_FIRESTORE, {optional: true});
  private readonly auth: Auth | null = inject(FIREBASE_AUTH, {optional: true});
  private readonly destroyRef = inject(DestroyRef);
  private firestoreUnsubscribe: (() => void) | undefined;

  readonly settings = signal<HomepageHeroSettings>(DEFAULT_HOMEPAGE_HERO_SETTINGS);
  readonly isLoading = signal<boolean>(Boolean(this.firestore));
  readonly error = signal<string | null>(this.firestore ? null : 'Firebase Firestore is not initialized.');

  constructor() {
    const authUnsubscribe = this.startAuthAwareFirestoreSync();

    this.destroyRef.onDestroy(() => {
      authUnsubscribe?.();
      this.stopFirestoreSync();
    });
  }

  getHomepageHeroSettings(): HomepageHeroSettings {
    return this.settings();
  }

  getAdminStats(): HomepageHeroAdminStats {
    const settings = this.settings();

    return {
      totalSlides: settings.slides.length,
      publishedSlides: getPublishedHomepageHeroSlides(settings).length,
      draftSlides: settings.slides.filter(slide => slide.status === 'draft').length,
    };
  }

  async loadHomepageHeroSettingsFromFirestore(): Promise<HomepageHeroSettings> {
    const firestore = this.requireFirestore();
    const snapshot = await getDoc(doc(firestore, HOMEPAGE_HERO_SETTINGS_COLLECTION, HOMEPAGE_HERO_SETTINGS_ID));
    const settings = snapshot.exists()
      ? normalizeHomepageHeroSettings(snapshot.data())
      : DEFAULT_HOMEPAGE_HERO_SETTINGS;

    this.settings.set(settings);
    this.isLoading.set(false);
    this.error.set(null);

    return settings;
  }

  async saveHomepageHeroSettings(settings: HomepageHeroSettings): Promise<HomepageHeroSettings> {
    const firestore = this.requireFirestore();
    const savedSettings = normalizeHomepageHeroSettingsForSave(settings);

    await setDoc(
      doc(firestore, HOMEPAGE_HERO_SETTINGS_COLLECTION, HOMEPAGE_HERO_SETTINGS_ID),
      this.toFirestoreSettings(savedSettings),
      {merge: true}
    );

    this.settings.set(savedSettings);
    this.error.set(null);

    return savedSettings;
  }

  private startAuthAwareFirestoreSync(): (() => void) | undefined {
    if (!this.firestore) {
      return undefined;
    }

    if (!this.auth) {
      this.listenToHomepageHeroSettings();
      return undefined;
    }

    return onAuthStateChanged(this.auth, () => {
      this.listenToHomepageHeroSettings();
    });
  }

  private listenToHomepageHeroSettings(): void {
    const firestore = this.firestore;

    if (!firestore) {
      return;
    }

    this.stopFirestoreSync();
    this.isLoading.set(true);
    this.error.set(null);

    this.firestoreUnsubscribe = onSnapshot(
      doc(firestore, HOMEPAGE_HERO_SETTINGS_COLLECTION, HOMEPAGE_HERO_SETTINGS_ID),
      snapshot => {
        this.settings.set(snapshot.exists()
          ? normalizeHomepageHeroSettings(snapshot.data())
          : DEFAULT_HOMEPAGE_HERO_SETTINGS);
        this.isLoading.set(false);
        this.error.set(null);
      },
      error => {
        console.error('[HomepageHeroRepositoryService] Homepage hero settings snapshot error:', error);
        this.settings.set(DEFAULT_HOMEPAGE_HERO_SETTINGS);
        this.isLoading.set(false);
        this.error.set(this.describeSnapshotError(error));
      }
    );
  }

  private stopFirestoreSync(): void {
    this.firestoreUnsubscribe?.();
    this.firestoreUnsubscribe = undefined;
  }

  private toFirestoreSettings(settings: HomepageHeroSettings): Record<string, unknown> {
    return {
      ...(removeUndefinedFirestoreFields(settings) as Record<string, unknown>),
      syncedAt: serverTimestamp(),
      storageVersion: 1,
    };
  }

  private describeSnapshotError(error: unknown): string {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'permission-denied':
          return 'Unable to load homepage hero settings: access was denied.';
        case 'unavailable':
          return 'Unable to load homepage hero settings: the service is temporarily unavailable.';
        default:
          return `Unable to load homepage hero settings: ${error.message}`;
      }
    }

    return error instanceof Error ? error.message : 'Unable to load homepage hero settings.';
  }

  private requireFirestore(): Firestore {
    if (!this.firestore) {
      throw new Error('Firebase Firestore is not initialized.');
    }

    return this.firestore;
  }
}

