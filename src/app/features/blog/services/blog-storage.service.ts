import {Injectable, OnDestroy, inject} from '@angular/core';
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
import {BlogPost, BlogPostStatus} from '../models/blog-post.model';

export const BLOG_POSTS_COLLECTION = 'posts';
const blogPostStatuses = new Set<BlogPostStatus>(['draft', 'scheduled', 'published', 'archived']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isBlogPostStatus(value: unknown): value is BlogPostStatus {
  return typeof value === 'string' && blogPostStatuses.has(value as BlogPostStatus);
}

function isOptionalPositiveInteger(value: unknown): boolean {
  return value === undefined || (typeof value === 'number' && Number.isInteger(value) && value > 0);
}

function isBlogOpenGraphMetadata(value: unknown): boolean {
  return value === undefined || (
    isRecord(value)
    && (value['title'] === undefined || typeof value['title'] === 'string')
    && (value['description'] === undefined || typeof value['description'] === 'string')
    && (value['image'] === undefined || typeof value['image'] === 'string')
    && (value['imageAlt'] === undefined || typeof value['imageAlt'] === 'string')
    && isOptionalPositiveInteger(value['imageWidth'])
    && isOptionalPositiveInteger(value['imageHeight'])
  );
}

function isBlogPost(value: unknown): value is BlogPost {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value['id'] === 'string'
    && typeof value['slug'] === 'string'
    && typeof value['title'] === 'string'
    && typeof value['excerpt'] === 'string'
    && typeof value['coverImage'] === 'string'
    && (value['thumbnailImage'] === undefined || typeof value['thumbnailImage'] === 'string')
    && isRecord(value['author'])
    && isStringArray(value['categories'])
    && (value['subcategories'] === undefined || isStringArray(value['subcategories']))
    && isStringArray(value['tags'])
    && isBlogPostStatus(value['status'])
    && isRecord(value['seo'])
    && isOptionalPositiveInteger(value['seo']['openGraphImageWidth'])
    && isOptionalPositiveInteger(value['seo']['openGraphImageHeight'])
    && isBlogOpenGraphMetadata(value['og'])
    && value['contentFormat'] === 'editorjs'
    && Array.isArray(value['blocks'])
    && typeof value['createdAt'] === 'string'
    && typeof value['updatedAt'] === 'string'
    && (typeof value['publishedAt'] === 'string' || value['publishedAt'] === null);
}

@Injectable({
  providedIn: 'root',
})
export class BlogStorageService implements OnDestroy {
  private readonly firestore: Firestore | null = inject(FIREBASE_FIRESTORE, {optional: true});
  private readonly auth: Auth | null = inject(FIREBASE_AUTH, {optional: true});
  private readonly postsSubject = new BehaviorSubject<readonly BlogPost[]>([]);
  private readonly loadingSubject = new BehaviorSubject<boolean>(Boolean(this.firestore));
  private readonly errorSubject = new BehaviorSubject<string | null>(this.firestore ? null : 'Firebase Firestore is not initialized.');
  private readonly authUnsubscribe = this.startAuthAwareFirestoreSync();
  private firestoreUnsubscribe: (() => void) | undefined;

  readonly posts$ = this.postsSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  ngOnDestroy(): void {
    this.authUnsubscribe?.();
    this.firestoreUnsubscribe?.();
  }

  getPosts(): readonly BlogPost[] {
    return this.postsSubject.value;
  }

  async savePost(post: BlogPost): Promise<void> {
    await this.savePostToFirestore(post);
  }

  async deletePost(postId: string): Promise<void> {
    await this.deletePostFromFirestore(postId);
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

      if (this.hasAdminClaim(claims)) {
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
        this.postsSubject.next([]);
        this.loadingSubject.next(false);
        this.errorSubject.next(error.message);
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
        this.postsSubject.next([]);
        this.loadingSubject.next(false);
        this.errorSubject.next(error.message);
      }
    );
  }

  private async savePostToFirestore(post: BlogPost): Promise<void> {
    const firestore = this.requireFirestore();
    await setDoc(doc(firestore, BLOG_POSTS_COLLECTION, post.id), this.toFirestorePost(post), {merge: true});
  }

  private async deletePostFromFirestore(postId: string): Promise<void> {
    const firestore = this.requireFirestore();
    await deleteDoc(doc(firestore, BLOG_POSTS_COLLECTION, postId));
  }

  private toFirestorePost(post: BlogPost): Record<string, unknown> {
    return {
      ...post,
      syncedAt: serverTimestamp(),
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

  private hasAdminClaim(claims: Record<string, unknown>): boolean {
    const roles = claims['roles'];

    return claims['admin'] === true
      || claims['cmsAdmin'] === true
      || (isRecord(roles) && roles['admin'] === true);
  }
}
