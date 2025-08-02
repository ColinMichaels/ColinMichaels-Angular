import {Injectable} from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where, writeBatch
} from '@angular/fire/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  Storage,
  uploadBytes,
  uploadBytesResumable,
  uploadString
} from '@angular/fire/storage';
import {from, Observable, throwError, of} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';
import {v4 as uuidv4} from 'uuid';


export interface FirestoreDocument {
  id?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;

  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  constructor(
    private firestore: Firestore,
    private storage: Storage
  ) {
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
    const docRef = doc(this.firestore, collectionPath, docId);

    // Add timestamps
    const documentData = {
      ...data,
      updatedAt: serverTimestamp(),
      createdAt: data.createdAt || serverTimestamp(),
      id: docId
    };

    return from(setDoc(docRef, documentData, {merge: true})).pipe(
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
    const docRef = doc(this.firestore, collectionPath, id);

    return from(getDoc(docRef)).pipe(
      map(snapshot => {
        if (snapshot.exists()) {
          return {id: snapshot.id, ...snapshot.data()} as T;
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
    const docRef = doc(this.firestore, collectionPath, id);

    // Add updated timestamp
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    };

    return from(updateDoc(docRef, updateData)).pipe(
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
    const docRef = doc(this.firestore, collectionPath, id);

    return from(deleteDoc(docRef)).pipe(
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
    const collectionRef = collection(this.firestore, collectionPath);

    let q = query(collectionRef);

    // Apply filters if provided
    if (filters && filters.length > 0) {
      filters.forEach(filter => {
        q = query(q, where(filter[0], filter[1], filter[2]));
      });
    }

    // Apply sorting if provided
    if (sortField) {
      q = query(q, orderBy(sortField, sortDirection));
    }

    // Apply limit if provided
    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    return from(getDocs(q)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as T));
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
    const docRef = doc(this.firestore, collectionPath, id);

    return new Observable<T | null>(observer => {
      // Return the unsubscribe function to clean up when the observable is unsubscribed
      return onSnapshot(docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            observer.next({id: snapshot.id, ...snapshot.data()} as T);
          } else {
            observer.next(null);
          }
        },
        (error) => {
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
    const collectionRef = collection(this.firestore, collectionPath);

    let q = query(collectionRef);

    // Apply filters if provided
    if (filters && filters.length > 0) {
      filters.forEach(filter => {
        q = query(q, where(filter[0], filter[1], filter[2]));
      });
    }

    // Apply sorting if provided
    if (sortField) {
      q = query(q, orderBy(sortField, sortDirection));
    }

    return new Observable<T[]>(observer => {
      // Return the unsubscribe function to clean up when the observable is unsubscribed
      return onSnapshot(q,
        (snapshot) => {
          const documents = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as T));
          observer.next(documents);
        },
        (error) => {
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
    const storageRef = ref(this.storage, path);

    return from(uploadBytes(storageRef, file, metadata)).pipe(
      switchMap(() => from(getDownloadURL(storageRef))),
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
    const storageRef = ref(this.storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    return new Observable<{ progress: number, downloadUrl?: string }>(observer => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          observer.next({progress});
        },
        (error) => {
          console.error(`Error uploading file to ${path}:`, error);
          observer.error(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
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
    const storageRef = ref(this.storage, path);

    return from(uploadString(storageRef, dataUrl, 'data_url', metadata)).pipe(
      switchMap(() => from(getDownloadURL(storageRef))),
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
    const storageRef = ref(this.storage, path);

    return from(deleteObject(storageRef)).pipe(
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
    return this.updateDocument(`users/${userId}`, 'settings', {settings});
  }

  /**
   * Gets user settings
   * @param userId - User ID
   * @returns Observable of settings object
   */
  getUserSettings(userId: string): Observable<any> {
    return this.getDocument<any>(`users/${userId}`, 'settings');
  }

  /**
   * Saves a log entry
   * @param level
   * @param logEntry - Log entry object
   * @param user
   * @param p0
   * @returns Observable of the log entry ID
   */
  saveLogEntry(level: string, logEntry: {
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    userId?: string;
    metadata?: any;
  }, user: unknown, p0: string): Observable<string> {
    return this.saveDocument('logs', {
      ...logEntry,
      timestamp: serverTimestamp()
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
    const storageRef = ref(this.storage, path);

    return from(getDownloadURL(storageRef)).pipe(
      catchError(error => {
        console.error(`Error getting download URL for ${path}:`, error);
        return throwError(() => new Error(`Failed to get download URL: ${error.message}`));
      })
    );
  }
}
