import {DestroyRef, Injectable, inject} from '@angular/core';
import {FirebaseError} from 'firebase/app';
import {Auth, getIdTokenResult, onAuthStateChanged, User} from 'firebase/auth';
import {
  collection,
  deleteField,
  doc,
  Firestore,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import {BehaviorSubject} from 'rxjs';

import {FIREBASE_AUTH, FIREBASE_FIRESTORE} from '../../../services/firebase/firebase.tokens';
import {FirestoreCollectionSync} from '../../../services/firebase/firestore-collection-sync';
import {canManageCmsContent} from '../../../shared/user-account/user-account.model';
import {
  BlogEditorialMetadata,
  BlogAuthor,
  BlogGalleryImage,
  BlogOpenGraphMetadata,
  BlogPost,
  BlogPostIndexEntry,
  BlogPostStatus,
  BlogSeoMetadata,
  normalizeBlogAuthor,
} from '../models/blog-post.model';
import {normalizeBlogPostRevision} from '../models/blog-post-revision.model';
import {normalizeBlogImageFields, resolveBlogPostPreviewImages} from '../utils/blog-image-url.util';
import {createBlogReadingStats} from '../utils/blog-reading.util';
import {createBlogPostSearchBodyText} from '../utils/blog-search-text.util';
import {isBlogPost, isRecord} from '../utils/blog-validation.util';
import {BlogPublishingService} from './blog-publishing.service';

export const BLOG_POSTS_COLLECTION = 'posts';
export const BLOG_POST_INDEX_COLLECTION = 'postSummaries';
export const BLOG_POST_PREVIEWS_COLLECTION = 'postPreviews';
const PUBLIC_POST_CACHE_LIMIT = 3;
function isPreviewDocument(value: unknown): value is { post: BlogPost; expiresAtMillis: number } {
  return isRecord(value)
    && isBlogPost(value['post'])
    && typeof value['expiresAtMillis'] === 'number';
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isBlogPostStatus(value: unknown): value is BlogPostStatus {
  return value === 'draft' || value === 'scheduled' || value === 'published' || value === 'archived';
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function readBlogAuthor(value: unknown): BlogAuthor | undefined {
  if (!isRecord(value) || typeof value['name'] !== 'string') {
    return undefined;
  }

  return {
    name: value['name'],
    ...(typeof value['title'] === 'string' ? {title: value['title']} : {}),
    ...(typeof value['bio'] === 'string' ? {bio: value['bio']} : {}),
    ...(typeof value['avatarUrl'] === 'string' ? {avatarUrl: value['avatarUrl']} : {}),
    ...(typeof value['profileUrl'] === 'string' ? {profileUrl: value['profileUrl']} : {}),
    ...(typeof value['slug'] === 'string' ? {slug: value['slug']} : {}),
  };
}

function readBlogSeo(value: unknown): BlogSeoMetadata | undefined {
  if (!isRecord(value)
    || typeof value['title'] !== 'string'
    || typeof value['description'] !== 'string') {
    return undefined;
  }

  return {
    title: value['title'],
    description: value['description'],
    ...(typeof value['metaTitle'] === 'string' ? {metaTitle: value['metaTitle']} : {}),
    ...(typeof value['metaDescription'] === 'string' ? {metaDescription: value['metaDescription']} : {}),
    ...(typeof value['canonical'] === 'string' ? {canonical: value['canonical']} : {}),
    ...(typeof value['openGraphImage'] === 'string' ? {openGraphImage: value['openGraphImage']} : {}),
    ...(isPositiveInteger(value['openGraphImageWidth']) ? {openGraphImageWidth: value['openGraphImageWidth']} : {}),
    ...(isPositiveInteger(value['openGraphImageHeight']) ? {openGraphImageHeight: value['openGraphImageHeight']} : {}),
  };
}

function readBlogOpenGraph(value: unknown): BlogOpenGraphMetadata | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    ...(typeof value['title'] === 'string' ? {title: value['title']} : {}),
    ...(typeof value['description'] === 'string' ? {description: value['description']} : {}),
    ...(typeof value['image'] === 'string' ? {image: value['image']} : {}),
    ...(typeof value['imageAlt'] === 'string' ? {imageAlt: value['imageAlt']} : {}),
    ...(isPositiveInteger(value['imageWidth']) ? {imageWidth: value['imageWidth']} : {}),
    ...(isPositiveInteger(value['imageHeight']) ? {imageHeight: value['imageHeight']} : {}),
  };
}

function readBlogGalleryImages(value: unknown): readonly BlogGalleryImage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(item => isRecord(item) && typeof item['url'] === 'string' && typeof item['alt'] === 'string')
    .slice(0, 5)
    .map(item => ({
      url: item['url'] as string,
      alt: item['alt'] as string,
      ...(typeof item['caption'] === 'string' ? {caption: item['caption']} : {}),
      ...(isPositiveInteger(item['width']) ? {width: item['width']} : {}),
      ...(isPositiveInteger(item['height']) ? {height: item['height']} : {}),
    }));
}

@Injectable({
  providedIn: 'root',
})
export class BlogStorageService {
  private readonly firestore: Firestore | null = inject(FIREBASE_FIRESTORE, {optional: true});
  private readonly auth: Auth | null = inject(FIREBASE_AUTH, {optional: true});
  private readonly publishing = inject(BlogPublishingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly postsSubject = new BehaviorSubject<readonly BlogPost[]>([]);
  private readonly postIndexSubject = new BehaviorSubject<readonly BlogPostIndexEntry[]>([]);
  private readonly loadingSubject = new BehaviorSubject<boolean>(Boolean(this.firestore));
  private readonly errorSubject = new BehaviorSubject<string | null>(this.firestore ? null : 'Firebase Firestore is not initialized.');
  private readonly remoteSync = new FirestoreCollectionSync<BlogPost>(
    this.postsSubject,
    this.loadingSubject,
    this.errorSubject,
    value => this.fromFirestorePost(value),
    error => this.describeSnapshotError(error)
  );
  private hasAdminPostCollection = false;
  private postIndexLoadId = 0;
  private authSyncId = 0;
  private readonly publishedPostLoads = new Map<string, Promise<BlogPost | undefined>>();

  readonly posts$ = this.postsSubject.asObservable();
  readonly postIndex$ = this.postIndexSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  constructor() {
    const postsSubscription = this.postsSubject.subscribe(posts => {
      if (this.hasAdminPostCollection) {
        this.postIndexSubject.next(posts.map(post => this.toPostIndexEntry(post)));
      }
    });
    const authUnsubscribe = this.startAuthAwareFirestoreSync();
    this.destroyRef.onDestroy(() => {
      authUnsubscribe?.();
      postsSubscription.unsubscribe();
      this.authSyncId += 1;
      this.postIndexLoadId += 1;
      this.publishedPostLoads.clear();
      this.remoteSync.stop();
    });
  }

  getPosts(): readonly BlogPost[] {
    return this.postsSubject.value;
  }

  getPostIndex(): readonly BlogPostIndexEntry[] {
    return this.postIndexSubject.value;
  }

  async savePost(post: BlogPost, expectedRevision = normalizeBlogPostRevision(post.revision) - 1): Promise<BlogPost> {
    return this.publishing.savePost(post, Math.max(0, expectedRevision));
  }

  async updatePostEditorial(
    post: BlogPost,
    editorial: BlogEditorialMetadata | undefined,
    expectedRevision = normalizeBlogPostRevision(post.revision)
  ): Promise<BlogPost> {
    return this.publishing.updateEditorial(post, editorial, Math.max(0, expectedRevision));
  }

  async savePosts(posts: readonly BlogPost[]): Promise<readonly BlogPost[]> {
    const savedPosts: BlogPost[] = [];
    for (const post of posts) {
      savedPosts.push(await this.savePost(post));
    }
    return savedPosts;
  }

  async savePostPreview(post: BlogPost, expectedRevision = normalizeBlogPostRevision(post.revision) - 1): Promise<BlogPost> {
    return this.publishing.issuePreview(post.id, Math.max(0, expectedRevision));
  }

  async revokePostPreview(postId: string, expectedRevision: number): Promise<BlogPost> {
    return this.publishing.revokePreview(postId, Math.max(0, expectedRevision));
  }

  async loadPostPreview(token: string): Promise<BlogPost | undefined> {
    return this.loadPostPreviewFromFirestore(token);
  }

  async deletePost(postId: string, expectedRevision: number): Promise<boolean> {
    return this.publishing.deletePost(postId, Math.max(0, expectedRevision));
  }

  async deletePosts(posts: readonly BlogPost[]): Promise<number> {
    let deletedCount = 0;
    for (const post of posts) {
      if (await this.deletePost(post.id, normalizeBlogPostRevision(post.revision))) {
        deletedCount += 1;
      }
    }
    return deletedCount;
  }

  async backupPostsToFirestore(posts: readonly BlogPost[]): Promise<number> {
    for (const post of posts) {
      await this.publishing.savePost(post, normalizeBlogPostRevision(post.revision));
    }

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
    const snapshot = await getDocs(this.createPublishedPostsQuery(firestore));

    return this.toBlogPosts(snapshot.docs.map(postSnapshot => postSnapshot.data()));
  }

  loadPublishedPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const normalizedSlug = slug.trim();

    if (!normalizedSlug) {
      return Promise.resolve(undefined);
    }

    const activeLoad = this.publishedPostLoads.get(normalizedSlug);
    if (activeLoad) {
      return activeLoad;
    }

    const load = this.fetchPublishedPostBySlug(normalizedSlug).finally(() => {
      if (this.publishedPostLoads.get(normalizedSlug) === load) {
        this.publishedPostLoads.delete(normalizedSlug);
      }
    });
    this.publishedPostLoads.set(normalizedSlug, load);
    return load;
  }

  private cachePublishedPost(post: BlogPost): void {
    const currentPosts = this.postsSubject.value;
    const existingPost = currentPosts.find(candidate => candidate.id === post.id);

    if (existingPost === post) {
      return;
    }

    const nextPosts = [
      ...currentPosts.filter(candidate => candidate.id !== post.id && candidate.slug !== post.slug),
      post,
    ];

    this.postsSubject.next(this.hasAdminPostCollection
      ? nextPosts
      : nextPosts.slice(-PUBLIC_POST_CACHE_LIMIT));
  }

  private startAuthAwareFirestoreSync(): (() => void) | undefined {
    if (!this.firestore) {
      return undefined;
    }

    if (!this.auth) {
      void this.usePublicPostIndex();
      return undefined;
    }

    return onAuthStateChanged(this.auth, user => {
      const authSyncId = ++this.authSyncId;
      void this.updateFirestoreListener(user, authSyncId);
    });
  }

  private async updateFirestoreListener(user: User | null, authSyncId: number): Promise<void> {
    if (!user) {
      if (authSyncId === this.authSyncId) {
        await this.usePublicPostIndex();
      }
      return;
    }

    try {
      const tokenResult = await getIdTokenResult(user);
      const claims = tokenResult.claims as Record<string, unknown>;

      if (authSyncId !== this.authSyncId || this.auth?.currentUser?.uid !== user.uid) {
        return;
      }

      if (canManageCmsContent(claims)) {
        this.hasAdminPostCollection = true;
        this.postIndexLoadId += 1;
        this.listenToAllFirestorePosts();
        return;
      }
    } catch {
      // Fall back to the public published query if claims cannot be resolved.
    }

    if (authSyncId === this.authSyncId) {
      await this.usePublicPostIndex();
    }
  }

  private async usePublicPostIndex(): Promise<void> {
    this.hasAdminPostCollection = false;
    this.remoteSync.stop();
    this.postsSubject.next([]);
    await this.loadPublishedFirestoreIndex(true);
  }

  private listenToAllFirestorePosts(): void {
    const firestore = this.firestore;

    if (!firestore) {
      return;
    }

    this.remoteSync.listen(
      collection(firestore, BLOG_POSTS_COLLECTION),
      '[BlogStorageService] Admin posts snapshot error:'
    );
  }

  private async loadPublishedFirestorePosts(): Promise<void> {
    const firestore = this.firestore;

    if (!firestore) {
      return;
    }

    await this.remoteSync.load(
      this.createPublishedPostsQuery(firestore),
      '[BlogStorageService] Published posts load error:'
    );
  }

  private async loadPublishedFirestoreIndex(updateLoading: boolean): Promise<void> {
    const firestore = this.firestore;

    if (!firestore) {
      return;
    }

    const loadId = ++this.postIndexLoadId;
    if (updateLoading) {
      this.loadingSubject.next(true);
      this.errorSubject.next(null);
    }

    try {
      let indexEntries: readonly BlogPostIndexEntry[];

      try {
        const summarySnapshot = await getDocs(this.createPublishedPostIndexQuery(firestore));
        indexEntries = this.readCompletePostIndex(summarySnapshot.docs)
          ?? await this.loadLegacyPublishedPostIndex(firestore);
      } catch {
        // During a staged rollout, the deployed rules may not expose the new
        // summary collection yet. Keep the current site readable until Rules,
        // Functions, and the trusted backfill have all landed.
        indexEntries = await this.loadLegacyPublishedPostIndex(firestore);
      }

      if (loadId !== this.postIndexLoadId) {
        return;
      }

      this.postIndexSubject.next(indexEntries);
      if (updateLoading) {
        this.loadingSubject.next(false);
      }
    } catch (error) {
      if (loadId !== this.postIndexLoadId) {
        return;
      }

      console.error('[BlogStorageService] Published post index load error:', error);
      this.postIndexSubject.next([]);
      if (updateLoading) {
        this.loadingSubject.next(false);
        this.errorSubject.next(this.describeSnapshotError(error));
      }
    }
  }

  private async loadLegacyPublishedPostIndex(firestore: Firestore): Promise<readonly BlogPostIndexEntry[]> {
    const legacySnapshot = await getDocs(this.createPublishedPostsQuery(firestore));
    return legacySnapshot.docs
      .map(post => this.fromFirestorePost(post.data()))
      .filter((post): post is BlogPost => post !== null)
      .map(post => this.toPostIndexEntry(post));
  }

  private createPublishedPostsQuery(firestore: Firestore) {
    return query(
      collection(firestore, BLOG_POSTS_COLLECTION),
      where('status', '==', 'published')
    );
  }

  private createPublishedPostIndexQuery(firestore: Firestore) {
    return query(
      collection(firestore, BLOG_POST_INDEX_COLLECTION),
      where('status', '==', 'published')
    );
  }

  private readCompletePostIndex(
    documents: readonly { id: string; data(): unknown }[]
  ): readonly BlogPostIndexEntry[] | null {
    const manifest = documents.find(document => document.id === '__manifest')?.data();
    if (!isRecord(manifest)
      || manifest['kind'] !== 'post-summary-index'
      || manifest['schemaVersion'] !== 1
      || manifest['complete'] !== true) {
      return null;
    }

    const summaryDocuments = documents.filter(document => document.id !== '__manifest');
    const entries = summaryDocuments
      .map(document => this.fromFirestorePostIndex(document.data()))
      .filter((entry): entry is BlogPostIndexEntry => entry !== null);

    return entries.length === summaryDocuments.length ? entries : null;
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

  private async loadPostPreviewFromFirestore(token: string): Promise<BlogPost | undefined> {
    const firestore = this.requireFirestore();
    const snapshot = await getDoc(doc(firestore, BLOG_POST_PREVIEWS_COLLECTION, token));

    if (!snapshot.exists()) {
      return undefined;
    }

    const preview = this.fromFirestorePreviewDocument(snapshot.data());
    return preview?.token === token ? preview.post : undefined;
  }

  private toFirestorePost(post: BlogPost): Record<string, unknown> {
    const imageFields = normalizeBlogImageFields(post);
    const authorFields = normalizeBlogAuthor(post.author, post.authorId);

    return {
      ...post,
      ...authorFields,
      coverImage: imageFields.coverImage,
      backgroundImage: post.backgroundImage?.trim() || deleteField(),
      thumbnailImage: imageFields.thumbnailImage ?? deleteField(),
      catCorner: post.catCorner ?? deleteField(),
      preview: post.preview ?? deleteField(),
      socialPromotion: post.socialPromotion ?? deleteField(),
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
      ...normalizeBlogAuthor(
        isRecord(value['author']) && typeof value['author']['name'] === 'string'
          ? value['author'] as unknown as BlogPost['author']
          : undefined,
        typeof value['authorId'] === 'string' ? value['authorId'] : undefined
      ),
      publishedAt: typeof value['publishedAt'] === 'string' ? value['publishedAt'] : null,
    };

    return isBlogPost(candidate) ? candidate : null;
  }

  private fromFirestorePostIndex(value: unknown): BlogPostIndexEntry | null {
    if (!isRecord(value)
      || typeof value['id'] !== 'string'
      || typeof value['slug'] !== 'string'
      || typeof value['title'] !== 'string'
      || typeof value['excerpt'] !== 'string'
      || typeof value['coverImage'] !== 'string'
      || value['storageVersion'] !== 1
      || !isBlogPostStatus(value['status'])
      || !isStringArray(value['categories'])
      || !isStringArray(value['tags'])
      || (value['subcategories'] !== undefined && !isStringArray(value['subcategories']))
      || typeof value['createdAt'] !== 'string'
      || typeof value['updatedAt'] !== 'string'
      || (value['publishedAt'] !== null && typeof value['publishedAt'] !== 'string')) {
      return null;
    }

    const authorFields = normalizeBlogAuthor(
      readBlogAuthor(value['author']),
      typeof value['authorId'] === 'string' ? value['authorId'] : undefined
    );
    const seo = readBlogSeo(value['seo']);
    const og = readBlogOpenGraph(value['og']);
    const previewImages = readBlogGalleryImages(value['previewImages']);
    const catCorner = isRecord(value['catCorner'])
    && typeof value['catCorner']['enabled'] === 'boolean'
    && typeof value['catCorner']['discoveryPost'] === 'boolean'
      ? {
        enabled: value['catCorner']['enabled'],
        discoveryPost: value['catCorner']['discoveryPost'],
      }
      : undefined;

    return {
      id: value['id'],
      revision: normalizeBlogPostRevision(value['revision']),
      slug: value['slug'],
      title: value['title'],
      excerpt: value['excerpt'],
      coverImage: value['coverImage'],
      ...(typeof value['backgroundImage'] === 'string' ? {backgroundImage: value['backgroundImage']} : {}),
      ...(typeof value['thumbnailImage'] === 'string' ? {thumbnailImage: value['thumbnailImage']} : {}),
      ...(typeof value['featured'] === 'boolean' ? {featured: value['featured']} : {}),
      ...authorFields,
      categories: value['categories'],
      subcategories: isStringArray(value['subcategories']) ? value['subcategories'] : [],
      tags: value['tags'],
      ...(previewImages.length ? {previewImages} : {}),
      ...(catCorner ? {catCorner} : {}),
      ...(seo ? {seo} : {}),
      ...(og ? {og} : {}),
      ...(typeof value['searchBodyText'] === 'string' ? {searchBodyText: value['searchBodyText']} : {}),
      ...(isNonNegativeInteger(value['wordCount']) ? {wordCount: value['wordCount']} : {}),
      ...(isPositiveInteger(value['readingMinutes']) ? {readingMinutes: value['readingMinutes']} : {}),
      status: value['status'],
      createdAt: value['createdAt'],
      updatedAt: value['updatedAt'],
      publishedAt: value['publishedAt'],
    };
  }

  private toPostIndexEntry(post: BlogPost): BlogPostIndexEntry {
    const imageFields = normalizeBlogImageFields(post);
    const authorFields = normalizeBlogAuthor(post.author, post.authorId);
    const previewImages = resolveBlogPostPreviewImages(post);
    const readingStats = createBlogReadingStats(post);

    return {
      id: post.id,
      revision: normalizeBlogPostRevision(post.revision),
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      coverImage: imageFields.coverImage,
      ...(post.backgroundImage ? {backgroundImage: post.backgroundImage} : {}),
      ...(imageFields.thumbnailImage ? {thumbnailImage: imageFields.thumbnailImage} : {}),
      ...(post.featured !== undefined ? {featured: post.featured} : {}),
      ...authorFields,
      categories: post.categories,
      subcategories: post.subcategories ?? [],
      tags: post.tags,
      ...(previewImages.length ? {previewImages} : {}),
      ...(post.catCorner ? {catCorner: post.catCorner} : {}),
      seo: post.seo,
      ...(post.og ? {og: post.og} : {}),
      searchBodyText: createBlogPostSearchBodyText(post),
      ...readingStats,
      status: post.status,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      publishedAt: post.publishedAt,
    };
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

  private async fetchPublishedPostBySlug(normalizedSlug: string): Promise<BlogPost | undefined> {
    // Cold article entries and stale cached revisions must not wait for the
    // auth-aware collection sync or retain a second full collection query.
    const firestore = this.requireFirestore();
    const snapshot = await getDocs(query(
      collection(firestore, BLOG_POSTS_COLLECTION),
      where('status', '==', 'published'),
      where('slug', '==', normalizedSlug),
      limit(1)
    ));
    const post = snapshot.docs
      .map(postSnapshot => this.fromFirestorePost(postSnapshot.data()))
      .find((candidate): candidate is BlogPost => Boolean(candidate));

    if (post) {
      this.cachePublishedPost(post);
    } else if (!this.hasAdminPostCollection) {
      this.postsSubject.next(this.postsSubject.value.filter(candidate => candidate.slug !== normalizedSlug));
    }

    return post;
  }

  private requireFirestore(): Firestore {
    if (!this.firestore) {
      throw new Error('Firebase Firestore is not initialized.');
    }

    return this.firestore;
  }
}
