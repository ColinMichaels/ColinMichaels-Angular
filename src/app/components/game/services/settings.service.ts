import {Injectable, OnDestroy} from '@angular/core';
import {BehaviorSubject, Subscription, take} from 'rxjs';
import {StorageService} from '@core-os/storage';
import {NotificationService} from './notification.service';
import {FormControl, FormGroup} from '@angular/forms';

export interface Setting<T = unknown> {
  id: string;
  value: T;
}

@Injectable({providedIn: 'root'})
export class SettingsService implements OnDestroy {
  private readonly settings = new Map<string, BehaviorSubject<unknown>>();
  private readonly settingSets = new Map<string, BehaviorSubject<unknown[]>>();
  private readonly settingValueSubjects = new Map<string, BehaviorSubject<unknown | null>>();
  private readonly settingValueSubscriptions = new Map<string, Subscription>();

  constructor(
    private readonly storageService: StorageService,
    private readonly notify: NotificationService
  ) {
    this.loadPersistedSettingSets();
  }

  registerSetting<T>(id: string, defaultValue: T): void {
    if (this.settings.has(id)) {
      return;
    }

    const subject = new BehaviorSubject<T>(defaultValue);
    this.settings.set(id, subject as BehaviorSubject<unknown>);

    this.storageService.getItem<T>(id).pipe(take(1)).subscribe({
      next: (storedValue) => {
        if (storedValue !== null) {
          subject.next(storedValue);
        }
      },
      error: (error) => {
        console.error(`Failed to load setting ${id}:`, error);
      }
    });
  }

  getSetting<T>(id: string): BehaviorSubject<T> | null {
    return (this.settings.get(id) as BehaviorSubject<T>) ?? null;
  }

  setSetting<T>(id: string, value: T): void {
    const setting = this.settings.get(id);
    if (!setting) {
      this.showNotify(`Setting with id "${id}" is not registered.`);
      return;
    }

    setting.next(value);
    this.persistSetting(id, value);
  }

  registerSettingSet<T>(id: string, defaultValues: T[]): void {
    if (this.settingSets.has(id)) {
      return;
    }

    const subject = new BehaviorSubject<unknown[]>([...defaultValues]);
    this.settingSets.set(id, subject);

    this.storageService.getItems<T>(id).pipe(take(1)).subscribe({
      next: (storedValues) => {
        if (storedValues !== null) {
          subject.next(storedValues);
          return;
        }

        this.persistSettingSet(id, defaultValues);
      },
      error: (error) => {
        console.error(`Failed to load setting set ${id}:`, error);
      }
    });
  }

  getSettingSet<T>(id: string): BehaviorSubject<T[]> | null {
    return (this.settingSets.get(id) as BehaviorSubject<T[]>) ?? null;
  }

  updateSettingSet<T>(id: string, values: T[]): void {
    const settingSet = this.settingSets.get(id);
    if (!settingSet) {
      this.showNotify(`Setting set with id "${id}" is not registered.`);
      return;
    }

    settingSet.next(values);
    this.persistSettingSet(id, values);
  }

  updateSettingSetWithSingleValue<T>(setId: string, settingId: string, value: T): void {
    const settingSet = this.settingSets.get(setId);
    if (!settingSet) {
      this.showNotify(`Setting set with id "${setId}" not registered.`);
      return;
    }

    const currentSet = settingSet.value;
    if (!this.isSettingArray(currentSet)) {
      this.showNotify(`Setting set with id "${setId}" does not support keyed updates.`);
      return;
    }

    const settingIndex = currentSet.findIndex((setting) => setting.id === settingId);
    const updatedSet = [...currentSet];

    if (settingIndex >= 0) {
      updatedSet[settingIndex] = {...updatedSet[settingIndex], value};
    } else {
      updatedSet.push({id: settingId, value});
    }

    settingSet.next(updatedSet);
    this.persistSettingSet(setId, updatedSet);
  }

  addSettingToSet<T>(id: string, value: T): void {
    const settingSet = this.settingSets.get(id);
    if (!settingSet) {
      this.showNotify(`Setting set with id "${id}" is not registered.`);
      return;
    }

    const updatedValues = [...settingSet.value, value];
    settingSet.next(updatedValues);
    this.persistSettingSet(id, updatedValues);
  }

  removeSettingFromSet<T>(id: string, value: T): void {
    const settingSet = this.settingSets.get(id);
    if (!settingSet) {
      this.showNotify(`Setting set with id "${id}" is not registered.`);
      return;
    }

    const updatedValues = settingSet.value.filter((item) => item !== value);
    settingSet.next(updatedValues);
    this.persistSettingSet(id, updatedValues);
  }

  findSettingValueInSet<T>(setId: string, settingId: string): T | null {
    const settingSet = this.getSettingSet<unknown>(setId);
    if (!settingSet || !this.isSettingArray(settingSet.value)) {
      console.warn(`Setting set with id "${setId}" not found or not a keyed setting set.`);
      return null;
    }

    const setting = settingSet.value.find((item) => item.id === settingId);
    return setting ? (setting.value as T) : null;
  }

  getSettingValue$<T>(setId: string, settingId?: string): BehaviorSubject<T | null> {
    const cacheKey = settingId ? `${setId}:${settingId}` : setId;
    const existingSubject = this.settingValueSubjects.get(cacheKey) as BehaviorSubject<T | null> | undefined;
    if (existingSubject) {
      return existingSubject;
    }

    if (!settingId) {
      const standalone = this.getSetting<T | null>(setId);
      const fallback = standalone ?? new BehaviorSubject<T | null>(null);
      this.settingValueSubjects.set(cacheKey, fallback as BehaviorSubject<unknown | null>);
      return fallback;
    }

    const subject = new BehaviorSubject<T | null>(null);
    this.settingValueSubjects.set(cacheKey, subject as BehaviorSubject<unknown | null>);

    const settingSet$ = this.getSettingSet<unknown>(setId);
    if (!settingSet$) {
      return subject;
    }

    const subscription = settingSet$.subscribe((settings) => {
      if (!this.isSettingArray(settings)) {
        subject.next(null);
        return;
      }

      const found = settings.find((setting) => setting.id === settingId);
      subject.next(found ? (found.value as T) : null);
    });

    this.settingValueSubscriptions.set(cacheKey, subscription);
    return subject;
  }

  createFormGroupForSettings(setId: string): FormGroup | null {
    const settingSet = this.getSettingSet<unknown>(setId);
    if (!settingSet) {
      this.showNotify(`No settings set found with ID: "${setId}".`);
      return null;
    }

    if (!this.isSettingArray(settingSet.value)) {
      this.showNotify(`Settings set "${setId}" is not a keyed setting list.`);
      return null;
    }

    const controls = settingSet.value.reduce<Record<string, FormControl<unknown>>>((group, setting) => {
      group[setting.id] = new FormControl(setting.value);
      return group;
    }, {});

    return new FormGroup(controls);
  }

  syncFormGroupWithSettingSet(formGroup: FormGroup, setId: string): Subscription {
    return formGroup.valueChanges.subscribe((newValues) => {
      const settingSet = this.getSettingSet<unknown>(setId);
      if (!settingSet) {
        console.warn(`No settings set found with ID: "${setId}".`);
        return;
      }

      if (!this.isSettingArray(settingSet.value)) {
        console.warn(`Settings set "${setId}" is not a keyed setting list.`);
        return;
      }

      const valueMap = newValues as Record<string, unknown>;
      const updatedSet = settingSet.value.map((setting) => ({
        ...setting,
        value: valueMap[setting.id],
      }));

      settingSet.next(updatedSet);
      this.persistSettingSet(setId, updatedSet);
    });
  }

  ngOnDestroy(): void {
    this.settingValueSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.settingValueSubscriptions.clear();

    this.settingValueSubjects.forEach((subject) => subject.complete());
    this.settingValueSubjects.clear();
  }

  private loadPersistedSettingSets(): void {
    this.storageService.getAllKeys().pipe(take(1)).subscribe({
      next: (keys) => {
        keys.forEach((key) => {
          if (this.settingSets.has(key)) {
            return;
          }

          this.storageService.getItems<unknown>(key).pipe(take(1)).subscribe({
            next: (values) => {
              if (Array.isArray(values)) {
                this.settingSets.set(key, new BehaviorSubject<unknown[]>(values));
              }
            },
            error: (error) => {
              console.error(`Failed to load setting set ${key}:`, error);
            }
          });
        });
      },
      error: (error) => {
        console.error('Failed to load persisted settings:', error);
      }
    });
  }

  private showNotify(message = '', title = 'Setting'): void {
    this.notify.show({title, message, type: 'error'});
  }

  private persistSetting<T>(id: string, value: T): void {
    this.storageService.setItem(id, value).pipe(take(1)).subscribe({
      error: () => this.showNotify(`Failed to save setting "${id}".`)
    });
  }

  private persistSettingSet<T>(id: string, values: T[]): void {
    this.storageService.setItems(id, values).pipe(take(1)).subscribe({
      error: () => this.showNotify(`Failed to save setting set "${id}".`)
    });
  }

  private isSettingArray(value: unknown[]): value is Setting<unknown>[] {
    return value.every((item) => this.isSetting(item));
  }

  private isSetting(value: unknown): value is Setting<unknown> {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const candidate = value as { id?: unknown; value?: unknown };
    return typeof candidate.id === 'string' && 'value' in candidate;
  }
}
