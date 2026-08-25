import {Injectable, inject} from '@angular/core';
import {Auth} from 'firebase/auth';
import {deleteDoc, doc, Firestore, getDoc, setDoc, Timestamp} from 'firebase/firestore';

import {FIREBASE_AUTH, FIREBASE_FIRESTORE} from '../../../services/firebase/firebase.tokens';
import {removeUndefinedFirestoreFields} from '../../../services/firebase/firestore-data.util';
import {
  CMS_POST_RECOVERY_RETENTION_MS,
  CMS_POST_RECOVERY_SCHEMA_VERSION,
  CmsPostRecoverySnapshot,
  CmsPostRecoveryWrite,
  createCmsPostRecoveryContentHash,
  isCmsPostRecoveryExpired,
  isCmsPostRecoverySnapshot,
} from '../models/post-recovery.model';

export const CMS_POST_RECOVERY_COLLECTION = 'postDrafts';
export const CMS_POST_RECOVERY_SUBCOLLECTION = 'recoveries';
const NEW_POST_RECOVERY_ID_KEY = 'cm.cms.post-recovery.new-post-id.v1';

export function createCmsPostRecoveryDocumentId(postId: string): string {
  return encodeURIComponent(postId);
}

export function isCmsPostRecoveryWriteUnchanged(
  cachedRecovery: CmsPostRecoverySnapshot | undefined,
  write: CmsPostRecoveryWrite,
  ownerUid: string
): boolean {
  return cachedRecovery?.ownerUid === ownerUid
    && cachedRecovery.postId === write.postId
    && cachedRecovery.postSlug === write.postSlug
    && cachedRecovery.isNewPost === write.isNewPost
    && cachedRecovery.baseRevision === write.baseRevision
    && cachedRecovery.baseUpdatedAt === write.baseUpdatedAt
    && areRecoveryValuesEqual(cachedRecovery.form, write.form)
    && areRecoveryValuesEqual(cachedRecovery.editor, write.editor)
    && areRecoveryValuesEqual(cachedRecovery.socialPromotion, write.socialPromotion);
}

function areRecoveryValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((item, index) => areRecoveryValuesEqual(item, right[index]));
  }

  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') {
    return false;
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).filter(key => leftRecord[key] !== undefined).sort();
  const rightKeys = Object.keys(rightRecord).filter(key => rightRecord[key] !== undefined).sort();

  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index]
      && areRecoveryValuesEqual(leftRecord[key], rightRecord[key]));
}

@Injectable({providedIn: 'root'})
export class CmsPostRecoveryService {
  private readonly firestore: Firestore | null = inject(FIREBASE_FIRESTORE, {optional: true});
  private readonly auth: Auth | null = inject(FIREBASE_AUTH, {optional: true});
  private cachedRecovery: CmsPostRecoverySnapshot | undefined;

  getOrCreateNewPostId(suggestedPostId: string): string {
    try {
      const storedId = globalThis.localStorage?.getItem(NEW_POST_RECOVERY_ID_KEY)?.trim();

      if (storedId) {
        return storedId;
      }

      globalThis.localStorage?.setItem(NEW_POST_RECOVERY_ID_KEY, suggestedPostId);
    } catch {
      // Private browsing/storage restrictions must not make the editor unusable.
    }

    return suggestedPostId;
  }

  clearNewPostId(): void {
    try {
      globalThis.localStorage?.removeItem(NEW_POST_RECOVERY_ID_KEY);
    } catch {
      // Recovery cleanup is best effort after the canonical save succeeds.
    }
  }

  async load(postId: string): Promise<CmsPostRecoverySnapshot | undefined> {
    const {firestore, ownerUid} = await this.requireContext();
    const recoveryRef = this.createRecoveryRef(firestore, ownerUid, postId);
    const snapshot = await getDoc(recoveryRef);

    if (!snapshot.exists()) {
      this.cachedRecovery = undefined;
      return undefined;
    }

    const value = snapshot.data();

    if (!isCmsPostRecoverySnapshot(value) || value.ownerUid !== ownerUid || value.postId !== postId) {
      throw new Error('The stored recovery draft is invalid and was not applied.');
    }

    if (isCmsPostRecoveryExpired(value)) {
      await deleteDoc(recoveryRef);
      this.cachedRecovery = undefined;
      return undefined;
    }

    this.cachedRecovery = value;
    return value;
  }

  async save(write: CmsPostRecoveryWrite): Promise<CmsPostRecoverySnapshot> {
    const {firestore, ownerUid} = await this.requireContext();
    const cachedRecovery = this.cachedRecovery;

    if (cachedRecovery && isCmsPostRecoveryWriteUnchanged(cachedRecovery, write, ownerUid)) {
      return cachedRecovery;
    }

    const contentHash = createCmsPostRecoveryContentHash(write);
    const now = new Date();
    const savedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + CMS_POST_RECOVERY_RETENTION_MS).toISOString();
    const recovery: CmsPostRecoverySnapshot = {
      ...write,
      schemaVersion: CMS_POST_RECOVERY_SCHEMA_VERSION,
      ownerUid,
      savedAt,
      expiresAt,
      contentHash,
    };

    await setDoc(
      this.createRecoveryRef(firestore, ownerUid, write.postId),
      removeUndefinedFirestoreFields({
        ...recovery,
        expiresAtTimestamp: Timestamp.fromDate(new Date(expiresAt)),
      }) as Record<string, unknown>,
      {merge: false}
    );

    this.cachedRecovery = recovery;
    return recovery;
  }

  async delete(postId: string): Promise<void> {
    const {firestore, ownerUid} = await this.requireContext();
    await deleteDoc(this.createRecoveryRef(firestore, ownerUid, postId));
    if (this.cachedRecovery?.ownerUid === ownerUid && this.cachedRecovery.postId === postId) {
      this.cachedRecovery = undefined;
    }
  }

  private createRecoveryRef(firestore: Firestore, ownerUid: string, postId: string) {
    return doc(
      firestore,
      CMS_POST_RECOVERY_COLLECTION,
      ownerUid,
      CMS_POST_RECOVERY_SUBCOLLECTION,
      createCmsPostRecoveryDocumentId(postId)
    );
  }

  private async requireContext(): Promise<{firestore: Firestore; ownerUid: string}> {
    await this.auth?.authStateReady();
    const ownerUid = this.auth?.currentUser?.uid;

    if (!this.firestore) {
      throw new Error('Firebase Firestore is not initialized.');
    }

    if (!ownerUid) {
      throw new Error('Sign in again before saving a recovery draft.');
    }

    return {firestore: this.firestore, ownerUid};
  }
}
