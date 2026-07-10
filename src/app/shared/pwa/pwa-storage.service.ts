import {DOCUMENT} from '@angular/common';
import {Injectable, computed, inject, signal} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PwaStorageService {
  private readonly document = inject(DOCUMENT);
  private readonly storageManager = this.document.defaultView?.navigator.storage;
  private readonly usageState = signal<number | null>(null);
  private readonly quotaState = signal<number | null>(null);
  private readonly persistedState = signal<boolean | null>(null);
  private readonly busyState = signal(false);
  private readonly statusMessageState = signal<string | null>(null);

  readonly estimateSupported = signal(
    typeof this.storageManager?.estimate === 'function'
  ).asReadonly();
  readonly persistenceSupported = signal(
    typeof this.storageManager?.persist === 'function'
    && typeof this.storageManager?.persisted === 'function'
  ).asReadonly();
  readonly usage = this.usageState.asReadonly();
  readonly quota = this.quotaState.asReadonly();
  readonly persisted = this.persistedState.asReadonly();
  readonly busy = this.busyState.asReadonly();
  readonly statusMessage = this.statusMessageState.asReadonly();
  readonly available = computed(() => this.estimateSupported() || this.persistenceSupported());

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const storageManager = this.storageManager;

    if (!storageManager) {
      return;
    }

    try {
      const [estimate, persisted] = await Promise.all([
        this.estimateSupported() ? storageManager.estimate() : Promise.resolve(null),
        this.persistenceSupported() ? storageManager.persisted() : Promise.resolve(null),
      ]);

      this.usageState.set(estimate?.usage ?? null);
      this.quotaState.set(estimate?.quota ?? null);
      this.persistedState.set(persisted);
    } catch {
      this.statusMessageState.set('Storage details are unavailable in this browser.');
    }
  }

  async requestPersistence(): Promise<boolean> {
    const storageManager = this.storageManager;

    if (!storageManager || !this.persistenceSupported()) {
      return false;
    }

    this.busyState.set(true);
    this.statusMessageState.set(null);

    try {
      const granted = await storageManager.persist();
      this.persistedState.set(granted);
      this.statusMessageState.set(granted
        ? 'Offline app storage is protected from automatic cleanup.'
        : 'This browser will continue to manage offline storage automatically.');
      await this.refresh();
      return granted;
    } catch {
      this.statusMessageState.set('Persistent offline storage could not be requested.');
      return false;
    } finally {
      this.busyState.set(false);
    }
  }
}
