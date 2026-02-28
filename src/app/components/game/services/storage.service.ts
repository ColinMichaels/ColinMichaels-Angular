import { Injectable } from '@angular/core';
import {from, Observable, of} from 'rxjs';
import {catchError} from 'rxjs/operators';

interface StorageStrategy {
  setItem(key: string, value: any): Promise<void>;

  getItem<T>(key: string): Promise<T | null>;

  getAllKeys(): Promise<string[]>;

  removeItem(key: string): Promise<void>;

  clear(): Promise<void>;
}


@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly DB_NAME = 'AppStorage';
  private readonly STORE_NAME = 'keyvalue';
  private readonly DB_VERSION = 1;
  private strategy: StorageStrategy;

  constructor() {
    this.strategy = this.isIndexedDBAvailable()
      ? new IndexedDBStrategy(this.DB_NAME, this.STORE_NAME, this.DB_VERSION)
      : new LocalStorageStrategy();

  }

  private isIndexedDBAvailable(): boolean {
    try {
      return 'indexedDB' in window;
    } catch {
      return false;
    }
  }

  // Public API methods - returns Observables for better integration with Angular
  setItem(key: string, value: any): Observable<void> {
    return from(this.strategy.setItem(key, value)).pipe(
      catchError(error => {
        console.error('Storage operation failed:', error);
        return of(undefined);
      })
    );
  }


  // Retrieve a single item or an array of values
  getItem<T>(key: string): Observable<T | null> {
    return from(this.strategy.getItem<T>(key)).pipe(
      catchError(error => {
        console.error('Storage operation failed:', error);
        return of(null);
      })
    );
  }



  // Store multiple values as a collection (e.g., a "set")
  // Convenience methods for arrays
  setItems(key: string, values: any[]): Observable<void> {
    return this.setItem(key, values);
  }


  // Retrieve a collection (array) of values
  getItems<T>(key: string): Observable<T[] | null> {
    return this.getItem<T[]>(key);
  }


  // Remove a specific item or set from storage
  removeItem(key: string): Observable<void> {
    return from(this.strategy.removeItem(key)).pipe(
      catchError(error => {
        console.error('Storage operation failed:', error);
        return of(undefined);
      })
    );
  }


  // Clear all stored data
  clear(): Observable<void> {
    return from(this.strategy.clear()).pipe(
      catchError(error => {
        console.error('Storage operation failed:', error);
        return of(undefined);
      })
    );
  }

  getAllKeys(): Observable<string[]> {
    return from(this.strategy.getAllKeys()).pipe(
      catchError(error => {
        console.error('Storage operation failed:', error);
        return of([]);
      })
    );
  }
}

class IndexedDBStrategy implements StorageStrategy {
  private readonly db: Promise<IDBDatabase>;

  constructor(
    private dbName: string,
    private storeName: string,
    private version: number
  ) {
    this.db = this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async setItem(key: string, value: any): Promise<void> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(value, key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getItem<T>(key: string): Promise<T | null> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async removeItem(key: string): Promise<void> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAllKeys(): Promise<string[]> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result.map((key) => String(key)));
    });
  }

  async clear(): Promise<void> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

class LocalStorageStrategy implements StorageStrategy {
  async setItem(key: string, value: any): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('LocalStorage operation failed:', error);
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('LocalStorage operation failed:', error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('LocalStorage operation failed:', error);
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error('LocalStorage operation failed:', error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('LocalStorage operation failed:', error);
    }
  }
}
