import {Inject, Injectable} from '@angular/core';
import {
  collection as collectionFn,
  deleteDoc as deleteDocFn,
  doc as docFn,
  Firestore,
  getDoc as getDocFn,
  getDocs as getDocsFn,
  limit as limitFn,
  onSnapshot as onSnapshotFn,
  orderBy as orderByFn,
  query as queryFn,
  serverTimestamp as serverTimestampFn,
  setDoc as setDocFn,
  Timestamp,
  updateDoc as updateDocFn,
  where as whereFn,
  writeBatch as writeBatchFn
} from 'firebase/firestore';
import {
  deleteObject as deleteObjectFn,
  getDownloadURL as getDownloadURLFn,
  ref as storageRefFn,
  FirebaseStorage,
  uploadBytes as uploadBytesFn,
  uploadBytesResumable as uploadBytesResumableFn,
  uploadString as uploadStringFn
} from 'firebase/storage';
import {from, Observable, throwError, of} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';
import {v4 as uuidv4} from 'uuid';
import {FIREBASE_FIRESTORE, FIREBASE_STORAGE} from './firebase.tokens';


export interface FirestoreDocument {
  id?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;

  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  constructor(
    @Inject(FIREBASE_FIRESTORE) private firestore: Firestore,
    @Inject(FIREBASE_STORAGE) private storage: FirebaseStorage
  ) {
  }

  // Wrappers keep Firebase calls mockable in tests without changing runtime behavior.
  private doc(...args: unknown[]): unknown {
    return (docFn as (...innerArgs: unknown[]) => unknown)(...args);
  }

  private collection(...args: unknown[]): unknown {
    return (collectionFn as (...innerArgs: unknown[]) => unknown)(...args);
  }

  private setDoc(...args: unknown[]): Promise<void> {
    return (setDocFn as (...innerArgs: unknown[]) => Promise<void>)(...args);
  }

  private getDoc(...args: unknown[]): Promise<unknown> {
    return (getDocFn as (...innerArgs: unknown[]) => Promise<unknown>)(...args);
  }

  private updateDoc(...args: unknown[]): Promise<void> {
    return (updateDocFn as (...innerArgs: unknown[]) => Promise<void>)(...args);
  }

  private deleteDoc(...args: unknown[]): Promise<void> {
    return (deleteDocFn as (...innerArgs: unknown[]) => Promise<void>)(...args);
  }

  private getDocs(...args: unknown[]): Promise<unknown> {
    return (getDocsFn as (...innerArgs: unknown[]) => Promise<unknown>)(...args);
  }

  private query(...args: unknown[]): unknown {
    return (queryFn as (...innerArgs: unknown[]) => unknown)(...args);
  }

  private where(...args: unknown[]): unknown {
    return (whereFn as (...innerArgs: unknown[]) => unknown)(...args);
  }

  private orderBy(...args: unknown[]): unknown {
    return (orderByFn as (...innerArgs: unknown[]) => unknown)(...args);
  }

  private limit(...args: unknown[]): unknown {
    return (limitFn as (...innerArgs: unknown[]) => unknown)(...args);
  }

  private onSnapshot(...args: unknown[]): () => void {
    return (onSnapshotFn as (...innerArgs: unknown[]) => () => void)(...args);
  }

  private serverTimestamp(...args: unknown[]): unknown {
    return (serverTimestampFn as (...innerArgs: unknown[]) => unknown)(...args);
  }

  private writeBatch(...args: unknown[]): {
    set: (...batchArgs: unknown[]) => void;
    update: (...batchArgs: unknown[]) => void;
    delete: (...batchArgs: unknown[]) => void;
    commit: () => Promise<void>;
  } {
    return (writeBatchFn as (...innerArgs: unknown[]) => {
      set: (...batchArgs: unknown[]) => void;
      update: (...batchArgs: unknown[]) => void;
      delete: (...batchArgs: unknown[]) => void;
      commit: () => Promise<void>;
    })(...args);
  }

  private ref(...args: unknown[]): unknown {
    return (storageRefFn as (...innerArgs: unknown[]) => unknown)(...args);
  }

  private uploadBytes(...args: unknown[]): Promise<unknown> {
    return (uploadBytesFn as (...innerArgs: unknown[]) => Promise<unknown>)(...args);
  }

  private uploadBytesResumable(...args: unknown[]): {
    on: (
      event: string,
      progress: (snapshot: { bytesTransferred: number; totalBytes: number }) => void,
      error: (error: unknown) => void,
      complete: () => void
    ) => void;
    snapshot: { ref: unknown };
  } {
    return (uploadBytesResumableFn as (...innerArgs: unknown[]) => {
      on: (
        event: string,
        progress: (snapshot: { bytesTransferred: number; totalBytes: number }) => void,
        error: (error: unknown) => void,
        complete: () => void
      ) => void;
      snapshot: { ref: unknown };
    })(...args);
  }

  private uploadString(...args: unknown[]): Promise<unknown> {
    return (uploadStringFn as (...innerArgs: unknown[]) => Promise<unknown>)(...args);
  }

  private getDownloadURL(...args: unknown[]): Promise<string> {
    return (getDownloadURLFn as (...innerArgs: unknown[]) => Promise<string>)(...args);
  }

  private deleteObject(...args: unknown[]): Promise<void> {
    return (deleteObjectFn as (...innerArgs: unknown[]) => Promise<void>)(...args);
  }

  /**
   * Creates or updates a document in Firestore
   * @param collectionPath - Path to the collection
   * @param data - Document data
   * @param id - Optional document ID (will be generated if not provided)
   * @returns Observable of the document reference
   */
  saveDocument<T extends FirestoreDocument>(
    collectionPath: string,
    data: T,
    id?: string
  ): Observable<string> {
    const docId = id || data.id || uuidv4();
    const docRef = this.doc(this.firestore, collectionPath, docId);

    // Add timestamps
    const documentData = {
      ...data,
      updatedAt: this.serverTimestamp(),
      createdAt: data.createdAt || this.serverTimestamp(),
      id: docId
    };

    return from(this.setDoc(docRef, documentData, {merge: true})).pipe(
      map(() => docId),
      catchError(error => {
        console.error(`Error saving document to ${collectionPath}:`, error);
        return throwError(() => new Error(`Failed to save document: ${error.message}`));
      })
    );
  }

  /**
   * Retrieves a document from Firestore
   * @param collectionPath - Path to the collection
   * @param id - Document ID
   * @returns Observable of the document data
   */
  getDocument<T>(collectionPath: string, id: string): Observable<T | null> {
    const docRef = this.doc(this.firestore, collectionPath, id);

    return from(this.getDoc(docRef)).pipe(
      map((snapshot: unknown) => {
        const typedSnapshot = snapshot as {
          exists: () => boolean;
          id: string;
          data: () => Record<string, unknown>;
        };

        if (typedSnapshot.exists()) {
          return {id: typedSnapshot.id, ...typedSnapshot.data()} as T;
        } else {
          return null;
        }
      }),
      catchError(error => {
        console.error(`Error getting document from ${collectionPath}:`, error);
        return throwError(() => new Error(`Failed to get document: ${error.message}`));
      })
    );
  }

  /**
   * Updates an existing document in Firestore
   * @param collectionPath - Path to the collection
   * @param id - Document ID
   * @param data - Partial data to update
   * @returns Observable of void
   */
  updateDocument<T extends Partial<FirestoreDocument>>(
    collectionPath: string,
    id: string,
    data: T
  ): Observable<void> {
    const docRef = this.doc(this.firestore, collectionPath, id);

    // Add updated timestamp
    const updateData = {
      ...data,
      updatedAt: this.serverTimestamp()
    };

    return from(this.updateDoc(docRef, updateData)).pipe(
      catchError(error => {
        console.error(`Error updating document in ${collectionPath}:`, error);
        return throwError(() => new Error(`Failed to update document: ${error.message}`));
      })
    );
  }

  /**
   * Deletes a document from Firestore
   * @param collectionPath - Path to the collection
   * @param id - Document ID
   * @returns Observable of void
   */
  deleteDocument(collectionPath: string, id: string): Observable<void> {
    const docRef = this.doc(this.firestore, collectionPath, id);

    return from(this.deleteDoc(docRef)).pipe(
      catchError(error => {
        console.error(`Error deleting document from ${collectionPath}:`, error);
        return throwError(() => new Error(`Failed to delete document: ${error.message}`));
      })
    );
  }

  /**
   * Queries documents from a collection
   * @param collectionPath - Path to the collection
   * @param filters - Array of where conditions [field, operator, value]
   * @param sortField - Optional field to sort by
   * @param sortDirection - Optional sort direction ('asc' or 'desc')
   * @param limitCount - Optional limit on number of results
   * @returns Observable of array of documents
   */
  queryDocuments<T>(
    collectionPath: string,
    filters?: [string, any, any][],
    sortField?: string,
    sortDirection: 'asc' | 'desc' = 'desc',
    limitCount?: number
  ): Observable<T[]> {
    const collectionRef = this.collection(this.firestore, collectionPath);

    let q = this.query(collectionRef);

    // Apply filters if provided
    if (filters && filters.length > 0) {
      filters.forEach(filter => {
        q = this.query(q, this.where(filter[0], filter[1], filter[2]));
      });
    }

    // Apply sorting if provided
    if (sortField) {
      q = this.query(q, this.orderBy(sortField, sortDirection));
    }

    // Apply limit if provided
    if (limitCount) {
      q = this.query(q, this.limit(limitCount));
    }

    return from(this.getDocs(q)).pipe(
      map((snapshot: unknown) => {
        const typedSnapshot = snapshot as {
          docs: Array<{ id: string; data: () => Record<string, unknown> }>;
        };

        return typedSnapshot.docs.map((doc) => ({id: doc.id, ...doc.data()} as T));
      }),
      catchError(error => {
        console.error(`Error querying documents from ${collectionPath}:`, error);
        return throwError(() => new Error(`Failed to query documents: ${error.message}`));
      })
    );
  }

  /**
   * Listen to real-time updates on a document
   * @param collectionPath - Path to the collection
   * @param id - Document ID
   * @returns Observable that emits the document data on changes
   */
  listenToDocument<T>(collectionPath: string, id: string): Observable<T | null> {
    const docRef = this.doc(this.firestore, collectionPath, id);

    return new Observable<T | null>(observer => {
      // Return the unsubscribe function to clean up when the observable is unsubscribed
      return this.onSnapshot(docRef,
        (snapshot: unknown) => {
          const typedSnapshot = snapshot as {
            exists: () => boolean;
            id: string;
            data: () => Record<string, unknown>;
          };

          if (typedSnapshot.exists()) {
            observer.next({id: typedSnapshot.id, ...typedSnapshot.data()} as T);
          } else {
            observer.next(null);
          }
        },
        (error: unknown) => {
          console.error(`Error listening to document in ${collectionPath}:`, error);
          observer.error(error);
        }
      );
    });
  }

  /**
   * Listen to real-time updates on a collection
   * @param collectionPath - Path to the collection
   * @param filters - Optional array of where conditions
   * @param sortField
   * @param sortDirection
   * @returns Observable that emits the collection data on changes
   */
  listenToCollection<T>(
    collectionPath: string,
    filters?: [string, any, any][],
    sortField?: string,
    sortDirection: 'asc' | 'desc' = 'desc'
  ): Observable<T[]> {
    const collectionRef = this.collection(this.firestore, collectionPath);

    let q = this.query(collectionRef);

    // Apply filters if provided
    if (filters && filters.length > 0) {
      filters.forEach(filter => {
        q = this.query(q, this.where(filter[0], filter[1], filter[2]));
      });
    }

    // Apply sorting if provided
    if (sortField) {
      q = this.query(q, this.orderBy(sortField, sortDirection));
    }

    return new Observable<T[]>(observer => {
      // Return the unsubscribe function to clean up when the observable is unsubscribed
      return this.onSnapshot(q,
        (snapshot: unknown) => {
          const typedSnapshot = snapshot as {
            docs: Array<{ id: string; data: () => Record<string, unknown> }>;
          };
          const documents = typedSnapshot.docs.map((doc) => ({id: doc.id, ...doc.data()} as T));
          observer.next(documents);
        },
        (error: unknown) => {
          console.error(`Error listening to collection ${collectionPath}:`, error);
          observer.error(error);
        }
      );
    });
  }

  /**
   * Uploads a file to Firebase Storage
   * @param path - Storage path
   * @param file - File to upload
   * @param metadata - Optional metadata
   * @returns Observable of the download URL
   */
  uploadFile(path: string, file: File | Blob, metadata?: any): Observable<string> {
    const storageRef = this.ref(this.storage, path);

    return from(this.uploadBytes(storageRef, file, metadata)).pipe(
      switchMap(() => from(this.getDownloadURL(storageRef))),
      catchError(error => {
        console.error(`Error uploading file to ${path}:`, error);
        return throwError(() => new Error(`Failed to upload file: ${error.message}`));
      })
    );
  }

  /**
   * Uploads a file with progress tracking
   * @param path - Storage path
   * @param file - File to upload
   * @param metadata - Optional metadata
   * @returns Observable that emits upload progress and final URL
   */
  uploadFileWithProgress(path: string, file: File | Blob, metadata?: any): Observable<{
    progress: number,
    downloadUrl?: string
  }> {
    const storageRef = this.ref(this.storage, path);
    const uploadTask = this.uploadBytesResumable(storageRef, file, metadata);

    return new Observable<{ progress: number, downloadUrl?: string }>(observer => {
      uploadTask.on(
        'state_changed',
        (snapshot: { bytesTransferred: number; totalBytes: number }) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          observer.next({progress});
        },
        (error: unknown) => {
          console.error(`Error uploading file to ${path}:`, error);
          observer.error(error);
        },
        async () => {
          try {
            const downloadUrl = await this.getDownloadURL(uploadTask.snapshot.ref);
            observer.next({progress: 100, downloadUrl});
            observer.complete();
          } catch (error) {
            observer.error(error);
          }
        }
      );
    });
  }

  /**
   * Uploads a base64 string as a file
   * @param path - Storage path
   * @param dataUrl - Data URL string
   * @param metadata - Optional metadata
   * @returns Observable of the download URL
   */
  uploadBase64(path: string, dataUrl: string, metadata?: any): Observable<string> {
    const storageRef = this.ref(this.storage, path);

    return from(this.uploadString(storageRef, dataUrl, 'data_url', metadata)).pipe(
      switchMap(() => from(this.getDownloadURL(storageRef))),
      catchError(error => {
        console.error(`Error uploading base64 to ${path}:`, error);
        return throwError(() => new Error(`Failed to upload base64: ${error.message}`));
      })
    );
  }

  /**
   * Deletes a file from Firebase Storage
   * @param path - Storage path
   * @returns Observable of void
   */
  deleteFile(path: string): Observable<void> {
    const storageRef = this.ref(this.storage, path);

    return from(this.deleteObject(storageRef)).pipe(
      catchError(error => {
        console.error(`Error deleting file from ${path}:`, error);
        return throwError(() => new Error(`Failed to delete file: ${error.message}`));
      })
    );
  }

  /**
   * Saves user settings
   * @param userId - User ID
   * @param settings - Settings object
   * @returns Observable of void
   */
  saveUserSettings(userId: string, settings: any): Observable<void> {
    return this.updateDocument('users', userId, {settings}).pipe(
      map(() => void 0)
    );
  }

  /**
   * Gets user settings
   * @param userId - User ID
   * @returns Observable of settings object
   */
  getUserSettings(userId: string): Observable<any> {
    return this.getDocument<any>('users', userId).pipe(
      map(user => user?.settings || null)
    );
  }

  /**
   * Saves a log entry
   * @param logEntry - Log entry object
   * @returns Observable of the log entry ID
   */
  saveLogEntry(logEntry: {
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    userId?: string;
    metadata?: any;
  }): Observable<string> {
    return this.saveDocument('logs', {
      ...logEntry,
      timestamp: this.serverTimestamp()
    });
  }

  /**
   * Gets log entries
   * @param userId - Optional user ID to filter by
   * @param level - Optional log level to filter by
   * @param limit - Optional limit on number of results
   * @returns Observable of log entries
   */
  getLogEntries(
    userId?: string,
    level?: 'info' | 'warn' | 'error' | 'debug',
    limit?: number
  ): Observable<any[]> {
    const filters: [string, any, any][] = [];

    if (userId) {
      filters.push(['userId', '==', userId]);
    }

    if (level) {
      filters.push(['level', '==', level]);
    }

    return this.queryDocuments<any>(
      'logs',
      filters,
      'timestamp',
      'desc',
      limit
    );
  }

  /**
   * Saves user profile data
   * @param userId - User ID
   * @param profileData - Profile data
   * @returns Observable of void
   */
  saveUserProfile(userId: string, profileData: any): Observable<void> {
    return this.updateDocument('users', userId, profileData);
  }

  /**
   * Gets user profile data
   * @param userId - User ID
   * @returns Observable of user profile
   */
  getUserProfile(userId: string): Observable<any> {
    return this.getDocument<any>('users', userId);
  }

  /**
   * Creates or updates a user document
   * @param userId - User ID
   * @param userData - User data
   * @returns Observable of void
   */
  createOrUpdateUser(userId: string, userData: any): Observable<void> {
    return this.saveDocument('users', {...userData, id: userId}, userId).pipe(
      map(() => void 0)
    );
  }


  /**
   * Gets a storage file download URL
   * @param path - Storage path
   * @returns Observable of the download URL
   */
  getFileUrl(path: string): Observable<string> {
    const storageRef = this.ref(this.storage, path);

    return from(this.getDownloadURL(storageRef)).pipe(
      catchError(error => {
        console.error(`Error getting download URL for ${path}:`, error);
        return throwError(() => new Error(`Failed to get download URL: ${error.message}`));
      })
    );
  }

  /**
   * Executes multiple write operations as a batch
   * @param operations - Array of batch operations
   * @returns Observable of void
   */
  executeBatch(operations: Array<{
    type: 'set' | 'update' | 'delete';
    collection: string;
    id: string;
    data?: any;
  }>): Observable<void> {
    const batch = this.writeBatch(this.firestore);

    operations.forEach(operation => {
      const docRef = this.doc(this.firestore, operation.collection, operation.id);

      switch (operation.type) {
        case 'set':
          batch.set(docRef, {
            ...operation.data,
            updatedAt: this.serverTimestamp(),
            createdAt: operation.data?.createdAt || this.serverTimestamp()
          });
          break;
        case 'update':
          batch.update(docRef, {
            ...operation.data,
            updatedAt: this.serverTimestamp()
          });
          break;
        case 'delete':
          batch.delete(docRef);
          break;
      }
    });

    return from(batch.commit()).pipe(
      catchError(error => {
        console.error('Error executing batch operations:', error);
        return throwError(() => new Error(`Failed to execute batch operations: ${error.message}`));
      })
    );
  }

  /**
   * Checks if a document exists
   * @param collectionPath - Path to the collection
   * @param id - Document ID
   * @returns Observable of boolean
   */
  documentExists(collectionPath: string, id: string): Observable<boolean> {
    const docRef = this.doc(this.firestore, collectionPath, id);

    return from(this.getDoc(docRef)).pipe(
      map((snapshot: unknown) => (snapshot as { exists: () => boolean }).exists()),
      catchError(error => {
        console.error(`Error checking document existence in ${collectionPath}:`, error);
        return of(false);
      })
    );
  }
}
