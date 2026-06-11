import {Injectable, inject} from '@angular/core';
import {
  Database,
  ref,
  push,
  set,
  get,
  update,
  remove,
  onValue,
  off,
  query,
  orderByChild,
  orderByKey,
  limitToFirst,
  limitToLast,
  startAt,
  endAt
} from 'firebase/database';
import {Observable} from 'rxjs';
import {FIREBASE_DATABASE} from './firebase.tokens';

export interface DatabaseItem {
  id?: string;

  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class RealtimeDbService {
  private readonly db: Database | null = inject(FIREBASE_DATABASE, {optional: true});

  constructor() {
    console.warn('RealtimeDbService is deprecated. Please use FirebaseService instead.');
  }

  private requireDb(): Database {
    if (!this.db) {
      throw new Error('Realtime Database is not initialized');
    }
    return this.db;
  }

  // Create a new item
  async create<T extends DatabaseItem>(path: string, data: Omit<T, 'id'>): Promise<string> {
    try {
      const listRef = ref(this.requireDb(), path);
      const newItemRef = push(listRef);
      await set(newItemRef, {
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      return newItemRef.key!;
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  // Set item with custom ID
  async setItem<T extends DatabaseItem>(path: string, id: string, data: Omit<T, 'id'>): Promise<void> {
    try {
      const itemRef = ref(this.requireDb(), `${path}/${id}`);
      await set(itemRef, {
        ...data,
        id,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Error setting item:', error);
      throw error;
    }
  }

  // Get a single item by ID
  async getItem<T extends DatabaseItem>(path: string, id: string): Promise<T | null> {
    try {
      const itemRef = ref(this.requireDb(), `${path}/${id}`);
      const snapshot = await get(itemRef);
      if (snapshot.exists()) {
        return {id, ...snapshot.val()} as T;
      }
      return null;
    } catch (error) {
      console.error('Error getting item:', error);
      throw error;
    }
  }

  // Get all items from a path
  async getItems<T extends DatabaseItem>(path: string): Promise<T[]> {
    try {
      const listRef = ref(this.requireDb(), path);
      const snapshot = await get(listRef);
      if (snapshot.exists()) {
        const items: T[] = [];
        snapshot.forEach((childSnapshot) => {
          items.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          } as T);
        });
        return items;
      }
      return [];
    } catch (error) {
      console.error('Error getting items:', error);
      throw error;
    }
  }

  // Update an existing item
  async updateItem<T extends DatabaseItem>(path: string, id: string, updates: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<void> {
    try {
      const itemRef = ref(this.requireDb(), `${path}/${id}`);
      await update(itemRef, {
        ...updates,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  // Delete an item
  async deleteItem(path: string, id: string): Promise<void> {
    try {
      const itemRef = ref(this.requireDb(), `${path}/${id}`);
      await remove(itemRef);
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  // Listen to real-time changes for a single item
  watchItem<T extends DatabaseItem>(path: string, id: string): Observable<T | null> {
    return new Observable(observer => {
      const itemRef = ref(this.requireDb(), `${path}/${id}`);

      const unsubscribe = onValue(itemRef, (snapshot) => {
        if (snapshot.exists()) {
          observer.next({id, ...snapshot.val()} as T);
        } else {
          observer.next(null);
        }
      }, (error) => {
        observer.error(error);
      });

      // Return cleanup function
      return () => off(itemRef, 'value', unsubscribe);
    });
  }

  // Listen to real-time changes for a list of items
  watchItems<T extends DatabaseItem>(path: string): Observable<T[]> {
    return new Observable(observer => {
      const listRef = ref(this.requireDb(), path);

      const unsubscribe = onValue(listRef, (snapshot) => {
        const items: T[] = [];
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            items.push({
              id: childSnapshot.key,
              ...childSnapshot.val()
            } as T);
          });
        }
        observer.next(items);
      }, (error) => {
        observer.error(error);
      });

      // Return cleanup function
      return () => off(listRef, 'value', unsubscribe);
    });
  }

  // Query items with filters
  async queryItems<T extends DatabaseItem>(
    path: string,
    options: {
      orderBy?: 'key' | string;
      limitToFirst?: number;
      limitToLast?: number;
      startAt?: string | number;
      endAt?: string | number;
      equalTo?: string | number;
    } = {}
  ): Promise<T[]> {
    try {
      const queryRef = ref(this.requireDb(), path);
      let queryBuilder = query(queryRef);

      if (options.orderBy) {
        if (options.orderBy === 'key') {
          queryBuilder = query(queryBuilder, orderByKey());
        } else {
          queryBuilder = query(queryBuilder, orderByChild(options.orderBy));
        }
      }

      if (options.limitToFirst) {
        queryBuilder = query(queryBuilder, limitToFirst(options.limitToFirst));
      }

      if (options.limitToLast) {
        queryBuilder = query(queryBuilder, limitToLast(options.limitToLast));
      }

      if (options.startAt !== undefined) {
        queryBuilder = query(queryBuilder, startAt(options.startAt));
      }

      if (options.endAt !== undefined) {
        queryBuilder = query(queryBuilder, endAt(options.endAt));
      }

      const snapshot = await get(queryBuilder);
      const items: T[] = [];

      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          items.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          } as T);
        });
      }

      return items;
    } catch (error) {
      console.error('Error querying items:', error);
      throw error;
    }
  }

  // Watch items with query filters
  watchQuery<T extends DatabaseItem>(
    path: string,
    options: {
      orderBy?: 'key' | string;
      limitToFirst?: number;
      limitToLast?: number;
      startAt?: string | number;
      endAt?: string | number;
    } = {}
  ): Observable<T[]> {
    return new Observable(observer => {
      const queryRef = ref(this.requireDb(), path);
      let queryBuilder = query(queryRef);

      if (options.orderBy) {
        if (options.orderBy === 'key') {
          queryBuilder = query(queryBuilder, orderByKey());
        } else {
          queryBuilder = query(queryBuilder, orderByChild(options.orderBy));
        }
      }

      if (options.limitToFirst) {
        queryBuilder = query(queryBuilder, limitToFirst(options.limitToFirst));
      }

      if (options.limitToLast) {
        queryBuilder = query(queryBuilder, limitToLast(options.limitToLast));
      }

      if (options.startAt !== undefined) {
        queryBuilder = query(queryBuilder, startAt(options.startAt));
      }

      if (options.endAt !== undefined) {
        queryBuilder = query(queryBuilder, endAt(options.endAt));
      }

      const unsubscribe = onValue(queryBuilder, (snapshot) => {
        const items: T[] = [];
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            items.push({
              id: childSnapshot.key,
              ...childSnapshot.val()
            } as T);
          });
        }
        observer.next(items);
      }, (error) => {
        observer.error(error);
      });

      return () => off(queryBuilder, 'value', unsubscribe);
    });
  }

  // Batch operations
  async batchUpdate(updates: { [path: string]: any }): Promise<void> {
    try {
      const dbRef = ref(this.requireDb());
      await update(dbRef, updates);
    } catch (error) {
      console.error('Error performing batch update:', error);
      throw error;
    }
  }

  // Check if item exists
  async exists(path: string, id: string): Promise<boolean> {
    try {
      const itemRef = ref(this.requireDb(), `${path}/${id}`);
      const snapshot = await get(itemRef);
      return snapshot.exists();
    } catch (error) {
      console.error('Error checking if item exists:', error);
      throw error;
    }
  }

  // Get count of items
  async getCount(path: string): Promise<number> {
    try {
      const listRef = ref(this.requireDb(), path);
      const snapshot = await get(listRef);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting count:', error);
      throw error;
    }
  }
}
