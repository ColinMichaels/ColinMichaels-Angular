import {Inject, Injectable, InjectionToken, Optional} from '@angular/core';
import {from, Observable} from 'rxjs';

export interface StorageStrategy {
  setItem(key: string, value: unknown): Promise<void>;

  getItem<T>(key: string): Promise<T | null>;

  getAllKeys(): Promise<string[]>;

  removeItem(key: string): Promise<void>;

  clear(): Promise<void>;
}

export const CORE_OS_STORAGE_STRATEGY = new InjectionToken<StorageStrategy>('CORE_OS_STORAGE_STRATEGY');

@Injectable({providedIn: 'root'})
export class StorageService {
  private readonly dbName = 'AppStorage';
  private readonly storeName = 'keyvalue';
  private readonly dbVersion = 1;
  private readonly strategy: StorageStrategy;

  constructor(
    @Optional() @Inject(CORE_OS_STORAGE_STRATEGY) strategy: StorageStrategy | null = null
  ) {
    this.strategy = strategy ?? (this.isIndexedDbAvailable()
      ? new IndexedDbStrategy(this.dbName, this.storeName, this.dbVersion)
      : new LocalStorageStrategy());
  }

  setItem(key: string, value: unknown): Observable<void> {
    return from(this.strategy.setItem(key, value));
  }

  getItem<T>(key: string): Observable<T | null> {
    return from(this.strategy.getItem<T>(key));
  }

  setItems(key: string, values: unknown[]): Observable<void> {
    return this.setItem(key, values);
  }

  getItems<T>(key: string): Observable<T[] | null> {
    return this.getItem<T[]>(key);
  }

  removeItem(key: string): Observable<void> {
    return from(this.strategy.removeItem(key));
  }

  clear(): Observable<void> {
    return from(this.strategy.clear());
  }

  getAllKeys(): Observable<string[]> {
    return from(this.strategy.getAllKeys());
  }

  private isIndexedDbAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
    } catch {
      return false;
    }
  }
}

export class IndexedDbStrategy implements StorageStrategy {
  private readonly db: Promise<IDBDatabase>;

  constructor(
    private readonly dbName: string,
    private readonly storeName: string,
    private readonly version: number,
    private readonly indexedDb: Pick<IDBFactory, 'open'> = indexedDB
  ) {
    this.db = this.initDb();
  }

  async setItem(key: string, value: unknown): Promise<void> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      transaction.objectStore(this.storeName).put(value, key);
      this.settleTransaction(transaction, resolve, reject);
    });
  }

  async getItem<T>(key: string): Promise<T | null> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const request = transaction.objectStore(this.storeName).get(key);
      let value: T | null = null;

      request.onsuccess = () => {
        value = request.result ?? null;
      };
      this.settleTransaction(transaction, () => resolve(value), reject);
    });
  }

  async removeItem(key: string): Promise<void> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      transaction.objectStore(this.storeName).delete(key);
      this.settleTransaction(transaction, resolve, reject);
    });
  }

  async getAllKeys(): Promise<string[]> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const request = transaction.objectStore(this.storeName).getAllKeys();
      let keys: string[] = [];

      request.onsuccess = () => {
        keys = request.result.map((key) => String(key));
      };
      this.settleTransaction(transaction, () => resolve(keys), reject);
    });
  }

  async clear(): Promise<void> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      transaction.objectStore(this.storeName).clear();
      this.settleTransaction(transaction, resolve, reject);
    });
  }

  private settleTransaction(
    transaction: IDBTransaction,
    resolve: () => void,
    reject: (reason?: unknown) => void
  ): void {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
  }

  private initDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = this.indexedDb.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onblocked = () => reject(new Error(`IndexedDB upgrade blocked for ${this.dbName}.`));
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }
}

export class LocalStorageStrategy implements StorageStrategy {
  async setItem(key: string, value: unknown): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async getItem<T>(key: string): Promise<T | null> {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async getAllKeys(): Promise<string[]> {
    return Object.keys(localStorage);
  }

  async clear(): Promise<void> {
    throw new Error('Clearing the localStorage fallback is disabled to protect unrelated origin data.');
  }
}
