import {DestroyRef, Injectable, inject} from '@angular/core';
import {FirebaseError} from 'firebase/app';
import {Auth, getIdTokenResult, onAuthStateChanged, User} from 'firebase/auth';
import {
  collection,
  deleteField,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import {BehaviorSubject} from 'rxjs';

import {FIREBASE_AUTH, FIREBASE_FIRESTORE} from '../../../services/firebase/firebase.tokens';
import {canManageCmsContent} from '../../../shared/user-account/user-account.model';
import {BlogPost} from '../models/blog-post.model';
import {isBlogPost, isRecord} from '../utils/blog-validation.util';

export const BLOG_POSTS_COLLECTION = 'posts';
export const BLOG_POST_PREVIEWS_COLLECTION = 'postPreviews';
const FIRESTORE_BATCH_LIMIT = 450;

type FirestoreWriteBatch = ReturnType<typeof writeBatch>;

function isPreviewDocument(value: unknown): value is { post: BlogPost; expiresAtMillis: number } {
  return isRecord(value)
    && isBlogPost(value['post'])
    && typeof value['expiresAtMillis'] === 'number';
}

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

function getUniqueValues(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter(Boolean))];
}

@Injectable({
  providedIn: 'root',
})
export class BlogStorageService {
  private readonly firestore: Firestore | null = inject(FIREBASE_FIRESTORE, {optional: true});
  private readonly auth: Auth | null = inject(FIREBASE_AUTH, {optional: true});
  private readonly destroyRef = inject(DestroyRef);
  private readonly postsSubject = new BehaviorSubject<readonly BlogPost[]>([]);
  private readonly loadingSubject = new BehaviorSubject<boolean>(Boolean(this.firestore));
  private readonly errorSubject = new BehaviorSubject<string | null>(this.firestore ? null : 'Firebase Firestore is not initialized.');
  private firestoreUnsubscribe: (() => void) | undefined;

  readonly posts$ = this.postsSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  constructor() {
    const authUnsubscribe = this.startAuthAwareFirestoreSync();
    this.destroyRef.onDestroy(() => {
      authUnsubscribe?.();
      this.firestoreUnsubscribe?.();
    });
  }

  getPosts(): readonly BlogPost[] {
    return this.postsSubject.value;
  }

  async savePost(post: BlogPost): Promise<void> {
    await this.savePostToFirestore(post);
  }

  async savePosts(posts: readonly BlogPost[]): Promise<void> {
    await this.savePostsToFirestore(posts);
  }

  async savePostPreview(post: BlogPost): Promise<void> {
    await this.savePostPreviewToFirestore(post);
  }

  async loadPostPreview(token: string): Promise<BlogPost | undefined> {
    return this.loadPostPreviewFromFirestore(token);
  }

  async deletePostPreview(token: string): Promise<void> {
    await this.deletePostPreviewFromFirestore(token);
  }

  async deletePostPreviews(tokens: readonly string[]): Promise<void> {
    await this.deletePostPreviewsFromFirestore(tokens);
  }

  async deletePost(postId: string): Promise<void> {
    await this.deletePostFromFirestore(postId);
  }

  async deletePosts(postIds: readonly string[]): Promise<void> {
    await this.deletePostsFromFirestore(postIds);
  }

  async backupPostsToFirestore(posts: readonly BlogPost[]): Promise<number> {
    const firestore = this.requireFirestore();
    const batch = writeBatch(firestore);

    for (const post of posts) {
      batch.set(doc(firestore, BLOG_POSTS_COLLECTION, post.id), this.toFirestorePost(post), {merge: true});
    }

    await batch.commit();

    return posts.length;
  }

  async loadPostsFromFirestore(): Promise<readonly BlogPost[]> {
    const firestore = this.requireFirestore();
    const snapshot = await getDocs(collection(firestore, BLOG_POSTS_COLLECTION));
    const posts = this.toBlogPosts(snapshot.docs.map(postSnapshot => postSnapshot.data()));

    this.postsSubject.next(posts);
    return posts;
  }

  async loadPublishedPostsFromFirestore(): Promise<readonly BlogPost[]> {
    const firestore = this.requireFirestore();
    const snapshot = await getDocs(
      query(collection(firestore, BLOG_POSTS_COLLECTION), where('status', '==', 'published'))
    );

    return this.toBlogPosts(snapshot.docs.map(postSnapshot => postSnapshot.data()));
  }

  private startAuthAwareFirestoreSync(): (() => void) | undefined {
    if (!this.firestore) {
      return undefined;
    }

    if (!this.auth) {
      this.listenToPublishedFirestorePosts();
      return undefined;
    }

    return onAuthStateChanged(this.auth, user => {
      void this.updateFirestoreListener(user);
    });
  }

  private async updateFirestoreListener(user: User | null): Promise<void> {
    if (!user) {
      this.listenToPublishedFirestorePosts();
      return;
    }

    try {
      const tokenResult = await getIdTokenResult(user);
      const claims = tokenResult.claims as Record<string, unknown>;

      if (canManageCmsContent(claims)) {
        this.listenToAllFirestorePosts();
        return;
      }
    } catch {
      // Fall back to the public published query if claims cannot be resolved.
    }

    this.listenToPublishedFirestorePosts();
  }

  private listenToAllFirestorePosts(): void {
    const firestore = this.firestore;

    if (!firestore) {
      return;
    }

    this.firestoreUnsubscribe?.();
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.firestoreUnsubscribe = onSnapshot(
      collection(firestore, BLOG_POSTS_COLLECTION),
      snapshot => {
        const remotePosts = snapshot.docs
          .map(postSnapshot => this.fromFirestorePost(postSnapshot.data()))
          .filter((post): post is BlogPost => post !== null);

        this.postsSubject.next(remotePosts);
        this.loadingSubject.next(false);
      },
      error => {
        console.error('[BlogStorageService] Admin posts snapshot error:', error);
        this.postsSubject.next([]);
        this.loadingSubject.next(false);
        this.errorSubject.next(this.describeSnapshotError(error));
      }
    );
  }

  private listenToPublishedFirestorePosts(): void {
    const firestore = this.firestore;

    if (!firestore) {
      return;
    }

    this.firestoreUnsubscribe?.();
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.firestoreUnsubscribe = onSnapshot(
      query(collection(firestore, BLOG_POSTS_COLLECTION), where('status', '==', 'published')),
      snapshot => {
        const remotePublishedPosts = snapshot.docs
          .map(postSnapshot => this.fromFirestorePost(postSnapshot.data()))
          .filter((post): post is BlogPost => post !== null);

        this.postsSubject.next(remotePublishedPosts);
        this.loadingSubject.next(false);
      },
      error => {
        console.error('[BlogStorageService] Published posts snapshot error:', error);
        this.postsSubject.next([]);
        this.loadingSubject.next(false);
        this.errorSubject.next(this.describeSnapshotError(error));
      }
    );
  }

  private describeSnapshotError(error: unknown): string {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'permission-denied':
          return 'Unable to load posts: access was denied.';
        case 'unavailable':
          return 'Unable to load posts: the service is temporarily unavailable.';
        case 'not-found':
          return 'Unable to load posts: the posts collection was not found.';
        default:
          return `Unable to load posts: ${error.message}`;
      }
    }

    return error instanceof Error ? error.message : 'Unable to load posts.';
  }

  private async savePostToFirestore(post: BlogPost): Promise<void> {
    const firestore = this.requireFirestore();
    await setDoc(doc(firestore, BLOG_POSTS_COLLECTION, post.id), this.toFirestorePost(post), {merge: true});
  }

  private async savePostsToFirestore(posts: readonly BlogPost[]): Promise<void> {
    const firestore = this.requireFirestore();
    await this.commitInBatches(firestore, posts, (batch, post) => {
      batch.set(doc(firestore, BLOG_POSTS_COLLECTION, post.id), this.toFirestorePost(post), {merge: true});
    });
  }

  private async savePostPreviewToFirestore(post: BlogPost): Promise<void> {
    const firestore = this.requireFirestore();

    if (!post.preview) {
      throw new Error('Preview metadata is required before saving a preview document.');
    }

    const batch = writeBatch(firestore);

    batch.set(doc(firestore, BLOG_POSTS_COLLECTION, post.id), this.toFirestorePost(post), {merge: true});
    batch.set(
      doc(firestore, BLOG_POST_PREVIEWS_COLLECTION, post.preview.token),
      this.toFirestorePreviewDocument(post)
    );

    await batch.commit();
  }

  private async loadPostPreviewFromFirestore(token: string): Promise<BlogPost | undefined> {
    const firestore = this.requireFirestore();
    const snapshot = await getDoc(doc(firestore, BLOG_POST_PREVIEWS_COLLECTION, token));

    if (!snapshot.exists()) {
      return undefined;
    }

    const preview = this.fromFirestorePreviewDocument(snapshot.data());
    return preview?.token === token ? preview.post : undefined;
  }

  private async deletePostPreviewFromFirestore(token: string): Promise<void> {
    const firestore = this.requireFirestore();
    await deleteDoc(doc(firestore, BLOG_POST_PREVIEWS_COLLECTION, token));
  }

  private async deletePostPreviewsFromFirestore(tokens: readonly string[]): Promise<void> {
    const firestore = this.requireFirestore();
    await this.commitInBatches(firestore, getUniqueValues(tokens), (batch, token) => {
      batch.delete(doc(firestore, BLOG_POST_PREVIEWS_COLLECTION, token));
    });
  }

  private async deletePostFromFirestore(postId: string): Promise<void> {
    const firestore = this.requireFirestore();
    await deleteDoc(doc(firestore, BLOG_POSTS_COLLECTION, postId));
  }

  private async deletePostsFromFirestore(postIds: readonly string[]): Promise<void> {
    const firestore = this.requireFirestore();
    await this.commitInBatches(firestore, getUniqueValues(postIds), (batch, postId) => {
      batch.delete(doc(firestore, BLOG_POSTS_COLLECTION, postId));
    });
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

  private toFirestorePost(post: BlogPost): Record<string, unknown> {
    return {
      ...post,
      preview: post.preview ?? deleteField(),
      syncedAt: serverTimestamp(),
      storageVersion: 1,
    };
  }

  private toFirestorePreviewDocument(post: BlogPost): Record<string, unknown> {
    if (!post.preview) {
      throw new Error('Preview metadata is required before saving a preview document.');
    }

    return {
      token: post.preview.token,
      postId: post.id,
      createdAt: post.preview.createdAt,
      expiresAt: post.preview.expiresAt,
      expiresAtTimestamp: Timestamp.fromDate(new Date(post.preview.expiresAt)),
      expiresAtMillis: new Date(post.preview.expiresAt).getTime(),
      post: removeUndefinedFields(post),
      storageVersion: 1,
    };
  }

  private fromFirestorePost(value: unknown): BlogPost | null {
    if (!isRecord(value)) {
      return null;
    }

    const candidate = {
      ...value,
      publishedAt: typeof value['publishedAt'] === 'string' ? value['publishedAt'] : null,
    };

    return isBlogPost(candidate) ? candidate : null;
  }

  private fromFirestorePreviewDocument(value: unknown): { token: string; post: BlogPost } | null {
    if (!isPreviewDocument(value)) {
      return null;
    }

    const post = value.post;

    if (post.status !== 'draft' || value.expiresAtMillis <= Date.now() || !post.preview) {
      return null;
    }

    return {
      token: post.preview.token,
      post,
    };
  }

  private toBlogPosts(values: readonly unknown[]): readonly BlogPost[] {
    return values
      .map(value => this.fromFirestorePost(value))
      .filter((post): post is BlogPost => post !== null);
  }

  private requireFirestore(): Firestore {
    if (!this.firestore) {
      throw new Error('Firebase Firestore is not initialized.');
    }

    return this.firestore;
  }
}
