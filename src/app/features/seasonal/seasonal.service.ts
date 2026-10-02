import {DOCUMENT} from '@angular/common';
import {computed, DestroyRef, inject, Injectable, InjectionToken, signal} from '@angular/core';

import {AuthService} from '../../services/auth.service';
import {CelebrationService} from '../../shared/celebration/celebration.service';
import {getSeasonalEdition, SEASONAL_EDITIONS} from './seasonal.catalog';
import {SEASONAL_HIDING_SEED, SeasonalHideout, seasonalHideoutFor, seasonalHideoutsFor} from './seasonal-hideouts';
import {
  chooseEdition, isSeasonalArchiveRoute, isSeasonalReadingRoute,
  SEASONAL_CONFIG, SEASONAL_PREFERENCE_STORAGE_KEY, seasonalPath, seasonalStorageKey,
} from './seasonal.config';
import {SeasonalCollectible, SeasonalConfig, SeasonalEdition, SeasonalPlacement, SeasonalVisitorPreference} from './seasonal.models';

export const SEASONAL_CONFIGURATION = new InjectionToken<Readonly<SeasonalConfig>>('SEASONAL_CONFIGURATION', {
  providedIn: 'root', factory: () => SEASONAL_CONFIG,
});

interface StoredSeasonalState {
  readonly version: 1;
  readonly enabled: boolean;
  readonly collectedIds: readonly string[];
}

const EMPTY_IDS: readonly string[] = Object.freeze([]);
const EMPTY_ITEMS: readonly SeasonalCollectible[] = Object.freeze([]);
const EMPTY_STATE: StoredSeasonalState = Object.freeze({version: 1, enabled: true, collectedIds: EMPTY_IDS});
const MAX_STORED_CHARACTERS = 4096;
const MAX_PREFERENCE_CHARACTERS = 512;
const DEFAULT_PREFERENCE: SeasonalVisitorPreference = Object.freeze({version: 1, editionId: null, disabled: false});

@Injectable({providedIn: 'root'})
export class SeasonalService {
  private readonly celebration = inject(CelebrationService);
  private readonly document = inject(DOCUMENT);
  private readonly browserWindow = this.document.defaultView;
  private readonly config = inject(SEASONAL_CONFIGURATION);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currentEdition = signal<SeasonalEdition | null>(null);
  private readonly isArchive = signal(false);
  private readonly currentState = signal<StoredSeasonalState>(EMPTY_STATE);
  private readonly lanternOpen = signal(false);
  private readonly liveAnnouncement = signal('');
  private readonly canPersist = signal(false);
  private readonly visitorPreference = signal<SeasonalVisitorPreference>(DEFAULT_PREFERENCE);
  private readonly registeredAccount = signal(false);
  private readonly states = new Map<string, StoredSeasonalState>();
  private storage: Storage | null = null;
  private currentUrl = '';
  private readonly currentPath = signal<string | null>(null);
  private readonly hidingSeed = inject(SEASONAL_HIDING_SEED);
  private readonly hideoutVisit = signal(0);
  private readonly routeVisits = new Map<string, number>();

  readonly edition = this.currentEdition.asReadonly();
  readonly items = computed(() => this.edition()?.items ?? EMPTY_ITEMS);
  readonly total = computed(() => this.items().length);
  readonly archiveMode = this.isArchive.asReadonly();
  readonly canCustomize = this.registeredAccount.asReadonly();
  readonly enabled = computed(() => !!this.edition() && (!this.canCustomize() || this.currentState().enabled) && !this.visitorDisabled()
    && (this.archiveMode() || (this.config.enabled && this.config.mode !== 'off')));
  readonly collectedIds = computed(() => this.currentState().collectedIds);
  readonly count = computed(() => this.collectedIds().length);
  readonly complete = computed(() => this.total() > 0 && this.count() === this.total());
  readonly panelOpen = this.lanternOpen.asReadonly();
  readonly announcement = this.liveAnnouncement.asReadonly();
  readonly persistenceAvailable = this.canPersist.asReadonly();
  readonly visitorDisabled = computed(() => this.canCustomize() && this.visitorPreference().disabled);

  constructor() {
    const authSubscription = inject(AuthService).authState$.subscribe(state => {
      const canCustomize = state.status === 'authenticated' && !!state.user.uid && state.user.isAnonymous === false;
      const lostPermission = this.canCustomize() && !canCustomize;
      this.registeredAccount.set(canCustomize);
      if (lostPermission) {
        this.closeLantern();
        this.liveAnnouncement.set('');
      }
    });
    this.destroyRef.onDestroy(() => authSubscription.unsubscribe());
    try {
      this.storage = this.browserWindow?.localStorage ?? null;
    } catch {
      // A denied getter leaves every collection usable in the current session.
    }
    if (this.storage) {
      try {
        this.visitorPreference.set(parseVisitorPreference(this.storage.getItem(SEASONAL_PREFERENCE_STORAGE_KEY))
          ?? DEFAULT_PREFERENCE);
        this.canPersist.set(true);
      } catch {
        this.canPersist.set(false);
      }
    }
    if (this.browserWindow) {
      this.browserWindow.addEventListener('storage', this.onStorage);
      const interval = this.browserWindow.setInterval?.(() => {
        if (this.document.visibilityState === 'visible') this.selectContext();
      }, 60_000);
      const onVisibility = () => {
        if (this.document.visibilityState === 'visible') this.selectContext();
      };
      this.document.addEventListener?.('visibilitychange', onVisibility);
      this.destroyRef.onDestroy(() => {
        this.browserWindow?.removeEventListener('storage', this.onStorage);
        if (interval !== undefined) this.browserWindow?.clearInterval(interval);
        this.document.removeEventListener?.('visibilitychange', onVisibility);
      });
    }
  }

  setContext(url: string): void {
    const path = seasonalPath(url);
    if (path && seasonalHideoutsFor(path).length && path !== this.currentPath()) {
      const visit = this.routeVisits.get(path) ?? 0;
      this.routeVisits.set(path, visit + 1);
      this.hideoutVisit.set(visit);
    }
    this.currentUrl = url;
    this.currentPath.set(path);
    this.selectContext();
  }

  private selectContext(): void {
    const selected = chooseEdition(this.currentUrl, new Date(), this.config);
    const archive = isSeasonalArchiveRoute(this.currentUrl);
    if (selected?.id === this.edition()?.id && archive === this.archiveMode()) {
      return;
    }
    this.closeLantern();
    this.liveAnnouncement.set('');
    this.currentEdition.set(selected);
    this.isArchive.set(archive);
    this.currentState.set(selected ? this.readState(selected) : EMPTY_STATE);
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
    if (!this.canCustomize()) return;
    if (!this.edition() && !isSeasonalReadingRoute(this.currentUrl) && seasonalPath(this.currentUrl) !== '/archive/seasons') {
      return;
    }
    this.updatePreference({...this.visitorPreference(), disabled: !enabled});
    if (enabled) {
      this.restoreLegacyEdition();
    }
  }

  collect(id: string): boolean {
    const edition = this.edition();
    const item = this.items().find(candidate => candidate.id === id);
    // Archive artwork is a guide, never a shortcut to earning the collection.
    if (!edition || !this.enabled() || this.archiveMode() || !item
      || item.route !== seasonalPath(this.currentUrl) || this.isCollected(id)) {
      return false;
    }
    this.updateState({...this.currentState(), collectedIds: Object.freeze([...this.collectedIds(), id])});
    this.liveAnnouncement.set(this.complete()
      ? `Your ${edition.collectorName} is full. All ${this.total()} ${edition.collectibleLabel} found.`
      : `${item.name} found. ${this.count()} of ${this.total()} ${edition.collectibleLabel} in your ${edition.collectorName}.`);
    if (this.complete()) {
      this.celebration.celebrateCompletion();
    }
    return true;
  }

  resetHunt(): void {
    if (this.edition()) {
      this.updateState({...this.currentState(), collectedIds: EMPTY_IDS});
    }
    this.liveAnnouncement.set('');
  }

  isCollected(id: string): boolean {
    return this.collectedIds().includes(id);
  }

  itemsFor(url: string, placement: SeasonalPlacement): readonly SeasonalCollectible[] {
    if (!this.enabled() || this.archiveMode()) {
      return EMPTY_ITEMS;
    }
    if (!isSeasonalReadingRoute(url)) {
      return EMPTY_ITEMS;
    }
    const path = seasonalPath(url);
    return this.items().filter(item => item.route === path && item.placement === placement && !this.isCollected(item.id));
  }

  itemsAtHideout(url: string, hideout: SeasonalHideout): readonly SeasonalCollectible[] {
    const edition = this.edition();
    const path = seasonalPath(url);
    if (!path || !edition || !this.enabled() || this.archiveMode()
      || path !== this.currentPath()) return EMPTY_ITEMS;
    // Assign before filtering found IDs so collecting one cannot relocate another.
    return this.items().filter(item => item.route === path).filter((item, ordinal) =>
      !this.isCollected(item.id)
      && seasonalHideoutFor(edition.id, path, ordinal, this.hidingSeed, this.hideoutVisit()) === hideout);
  }

  private readState(edition: SeasonalEdition): StoredSeasonalState {
    const cached = this.states.get(edition.id);
    if (cached) {
      return cached;
    }
    let state = EMPTY_STATE;
    if (this.storage) {
      try {
        state = parseStoredState(this.storage.getItem(seasonalStorageKey(edition.id)), edition) ?? EMPTY_STATE;
        this.canPersist.set(true);
      } catch {
        this.canPersist.set(false);
      }
    }
    this.states.set(edition.id, state);
    return state;
  }

  private restoreLegacyEdition(): void {
    if (this.edition() && !this.currentState().enabled) {
      this.updateState({...this.currentState(), enabled: true});
    }
  }

  private applyPreference(preference: SeasonalVisitorPreference): void {
    this.visitorPreference.set(Object.freeze(preference));
    this.selectContext();
    if (!this.enabled()) {
      this.closeLantern();
      this.liveAnnouncement.set('');
    }
  }

  private updatePreference(preference: SeasonalVisitorPreference): void {
    if (preference.disabled === this.visitorDisabled()) {
      return;
    }
    this.applyPreference(preference);
    if (this.storage) {
      try {
        this.storage.setItem(SEASONAL_PREFERENCE_STORAGE_KEY, JSON.stringify(this.visitorPreference()));
        this.canPersist.set(true);
      } catch {
        this.canPersist.set(false);
      }
    }
  }

  private updateState(state: StoredSeasonalState): void {
    const edition = this.edition();
    if (!edition) {
      return;
    }
    const frozenState = Object.freeze(state);
    this.states.set(edition.id, frozenState);
    this.currentState.set(frozenState);
    if (this.storage) {
      try {
        this.storage.setItem(seasonalStorageKey(edition.id), JSON.stringify(frozenState));
        this.canPersist.set(true);
      } catch {
        this.canPersist.set(false);
      }
    }
  }

  private readonly onStorage = (event: StorageEvent): void => {
    if (event.storageArea && event.storageArea !== this.storage) {
      return;
    }
    if (event.key === null) {
      this.states.clear();
      const defaultEdition = chooseEdition(this.currentUrl, new Date(), this.config);
      if (defaultEdition) {
        this.states.set(defaultEdition.id, EMPTY_STATE);
      }
      this.currentState.set(EMPTY_STATE);
      this.applyPreference(DEFAULT_PREFERENCE);
      this.closeLantern();
      this.liveAnnouncement.set('');
      return;
    }
    if (event.key === SEASONAL_PREFERENCE_STORAGE_KEY) {
      const preference = event.newValue === null ? DEFAULT_PREFERENCE : parseVisitorPreference(event.newValue);
      if (preference) {
        this.applyPreference(preference);
      }
      return;
    }
    const edition = SEASONAL_EDITIONS.find(candidate => seasonalStorageKey(candidate.id) === event.key);
    if (!edition) {
      return;
    }
    const state = event.newValue === null ? EMPTY_STATE : parseStoredState(event.newValue, edition);
    if (!state) {
      return;
    }
    this.states.set(edition.id, state);
    if (edition.id === this.edition()?.id) {
      this.currentState.set(state);
      this.liveAnnouncement.set('');
      if (!this.enabled()) {
        this.closeLantern();
      }
    }
  };
}

function parseVisitorPreference(raw: string | null): SeasonalVisitorPreference | null {
  if (!raw || raw.length > MAX_PREFERENCE_CHARACTERS) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value['version'] !== 1 || typeof value['disabled'] !== 'boolean'
      || (value['editionId'] !== null && (typeof value['editionId'] !== 'string' || !getSeasonalEdition(value['editionId'])))) {
      return null;
    }
    // Legacy visitor selections never override the site's calendar or explicit activation.
    return Object.freeze({version: 1, editionId: null, disabled: value['disabled']});
  } catch {
    return null;
  }
}

function parseStoredState(raw: string | null, edition: SeasonalEdition): StoredSeasonalState | null {
  if (!raw || raw.length > MAX_STORED_CHARACTERS) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value['version'] !== 1 || typeof value['enabled'] !== 'boolean'
      || !Array.isArray(value['collectedIds'])) {
      return null;
    }
    const knownIds = new Set(edition.items.map(item => item.id));
    const ids = [...new Set(value['collectedIds'].filter((id): id is string => (
      typeof id === 'string' && knownIds.has(id)
    )))].slice(0, edition.items.length);
    return Object.freeze({version: 1, enabled: value['enabled'], collectedIds: Object.freeze(ids)});
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
