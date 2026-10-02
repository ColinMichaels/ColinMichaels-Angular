import {DOCUMENT} from '@angular/common';
import {computed, DestroyRef, inject, Injectable, signal} from '@angular/core';

import {
  isScaryChristmasRoute,
  SCARY_CHRISTMAS_CANDIES,
  SCARY_CHRISTMAS_CONFIG,
  SCARY_CHRISTMAS_STORAGE_KEY,
  scaryChristmasPath,
  ScaryChristmasCandy,
  ScaryChristmasPlacement,
} from './scary-christmas.config';

interface StoredScaryChristmasState {
  version: 1;
  enabled: boolean;
  collectedIds: readonly string[];
}

const MAX_STORED_CHARACTERS = 4096;
const KNOWN_CANDY_IDS = new Set(SCARY_CHRISTMAS_CANDIES.map(candy => candy.id));
const EMPTY_COLLECTION: readonly string[] = Object.freeze([]);

@Injectable({providedIn: 'root'})
export class ScaryChristmasService {
  private readonly browserWindow = inject(DOCUMENT).defaultView;
  private readonly destroyRef = inject(DestroyRef);
  private readonly enabledPreference = signal(true);
  private readonly collected = signal<readonly string[]>(EMPTY_COLLECTION);
  private readonly lanternOpen = signal(false);
  private readonly liveAnnouncement = signal('');
  private readonly canPersist = signal(false);
  private storage: Storage | null = null;

  readonly candies = SCARY_CHRISTMAS_CANDIES;
  readonly enabled = computed(() => SCARY_CHRISTMAS_CONFIG.enabled && this.enabledPreference());
  readonly collectedIds = this.collected.asReadonly();
  readonly count = computed(() => this.collected().length);
  readonly complete = computed(() => this.count() === this.candies.length);
  readonly panelOpen = this.lanternOpen.asReadonly();
  readonly announcement = this.liveAnnouncement.asReadonly();
  readonly persistenceAvailable = this.canPersist.asReadonly();

  constructor() {
    this.restore();

    if (this.browserWindow) {
      // Public routes can be explored in several tabs. Keep the same lantern in
      // sync without a server, then remove the listener when Angular destroys it.
      this.browserWindow.addEventListener('storage', this.onStorage);
      this.destroyRef.onDestroy(() => {
        this.browserWindow?.removeEventListener('storage', this.onStorage);
      });
    }
  }

  openLantern(): void {
    if (this.enabled()) {
      this.lanternOpen.set(true);
    }
  }

  closeLantern(): void {
    this.lanternOpen.set(false);
  }

  setEnabled(enabled: boolean): void {
    this.enabledPreference.set(enabled);

    if (!this.enabled()) {
      this.closeLantern();
      this.liveAnnouncement.set('');
    }

    this.persist();
  }

  collect(id: string): boolean {
    const candy = this.candies.find(item => item.id === id);

    if (!this.enabled() || !candy || this.isCollected(id)) {
      return false;
    }

    this.collected.set(Object.freeze([...this.collected(), id]));
    this.liveAnnouncement.set(this.complete()
      ? `Your lantern is full. All ${this.candies.length} sweets found.`
      : `${candy.name} found. ${this.count()} of ${this.candies.length} sweets in your lantern.`);
    this.persist();
    return true;
  }

  resetHunt(): void {
    this.collected.set(EMPTY_COLLECTION);
    this.liveAnnouncement.set('');
    this.persist();
  }

  isCollected(id: string): boolean {
    return this.collected().includes(id);
  }

  candiesFor(url: string, placement: ScaryChristmasPlacement): readonly ScaryChristmasCandy[] {
    if (!this.enabled() || !isScaryChristmasRoute(url)) {
      return [];
    }

    const path = scaryChristmasPath(url);
    return this.candies.filter(candy => (
      candy.route === path && candy.placement === placement && !this.isCollected(candy.id)
    ));
  }

  private restore(): void {
    try {
      this.storage = this.browserWindow?.localStorage ?? null;

      if (!this.storage) {
        return;
      }

      const raw = this.storage.getItem(SCARY_CHRISTMAS_STORAGE_KEY);
      this.canPersist.set(true);
      const state = parseStoredState(raw);

      if (state) {
        this.applyState(state);
      }
    } catch {
      // The hunt remains available in memory when browser storage is denied.
      this.canPersist.set(false);
    }
  }

  private persist(): void {
    if (!this.storage) {
      return;
    }

    const state: StoredScaryChristmasState = {
      version: 1,
      enabled: this.enabledPreference(),
      collectedIds: this.collected(),
    };

    try {
      this.storage.setItem(SCARY_CHRISTMAS_STORAGE_KEY, JSON.stringify(state));
      this.canPersist.set(true);
    } catch {
      // Keep current-session progress even when quota or privacy rules deny writes.
      this.canPersist.set(false);
    }
  }

  private applyState(state: StoredScaryChristmasState): void {
    this.enabledPreference.set(state.enabled);
    this.collected.set(state.collectedIds);
    this.liveAnnouncement.set('');

    if (!this.enabled()) {
      this.closeLantern();
    }
  }

  private readonly onStorage = (event: StorageEvent): void => {
    if (
      (event.key !== SCARY_CHRISTMAS_STORAGE_KEY && event.key !== null)
      || (event.storageArea && event.storageArea !== this.storage)
    ) {
      return;
    }

    if (event.newValue === null || event.key === null) {
      this.applyState({version: 1, enabled: true, collectedIds: EMPTY_COLLECTION});
      return;
    }

    const state = parseStoredState(event.newValue);

    if (state) {
      this.applyState(state);
    }
  };
}

function parseStoredState(raw: string | null): StoredScaryChristmasState | null {
  if (!raw || raw.length > MAX_STORED_CHARACTERS) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(raw);

    if (!isRecord(value) || value['version'] !== 1
      || typeof value['enabled'] !== 'boolean' || !Array.isArray(value['collectedIds'])) {
      return null;
    }

    const collectedIds = [...new Set(value['collectedIds'].filter((id): id is string => (
      typeof id === 'string' && KNOWN_CANDY_IDS.has(id)
    )))].slice(0, SCARY_CHRISTMAS_CANDIES.length);

    return {version: 1, enabled: value['enabled'], collectedIds: Object.freeze(collectedIds)};
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
