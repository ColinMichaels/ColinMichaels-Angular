import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {StorageService} from './storage.service';
import {NotificationService} from './notification.service';
import {FormControl, FormGroup} from '@angular/forms';


export interface Setting {
  id: string; // Unique identifier for the setting
  value: any; // Value of the setting
}

// Interface for the settings set, consisting of an array of settings
export interface SettingsSet {
  [key: string]: Setting[]; // Each settings set is indexed by a unique `setId`
}

/**
 * Service for managing standalone settings and groups of settings (setting sets).
 * Provides functionality to register, retrieve, update, add, and remove settings.
 *
 * USAGE EXAMPLES
 *
 * // Register a new setting set
 * this.settingsService.registerSettingSet('userPreferences', ['optionA', 'optionB']);
 *
 * // Add a value to the set
 * this.settingsService.addSettingToSet('userPreferences', 'optionC');
 *
 * // Remove a value from the set
 * this.settingsService.removeSettingFromSet('userPreferences', 'optionA');
 *
 * // Get the setting set values as an observable
 * this.settingsService.getSettingSet<string>('userPreferences')?.subscribe((preferences) => {
 *   console.log(`User preferences updated: ${preferences}`);
 * });
 *
 * // Replace the entire set of values
 * this.settingsService.updateSettingSet('userPreferences', ['optionX', 'optionY']);
 *
 * this.settingsService.registerSetting('theme', 'light');
 * this.settingsService.setSetting('theme', 'dark');
 * this.settingsService.getSetting<string>('theme')?.subscribe((theme) => {
 *   console.log(`Current theme: ${theme}`);
 * });
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private settings = new Map<string, BehaviorSubject<any>>();
  private settingSets = new Map<string, BehaviorSubject<any[]>>();

  constructor(private storageService: StorageService, private notify: NotificationService) {
    this.loadPersistedSettings();
  }

  // Register a new standalone setting
  registerSetting<T>(id: string, defaultValue: T): void {
    if (!this.settings.has(id)) {
      const subject = new BehaviorSubject<T>(defaultValue);

      this.storageService.getItem<T>(id).subscribe({
        next: (storedValue) => {
          if (storedValue !== null) {
            subject.next(storedValue);
          }
        },
        error: (error) => {
          console.error(`Failed to load setting ${id}:`, error);
          // Keep using defaultValue in case of error
        }
      });

      this.settings.set(id, subject);
    }
  }

  private loadPersistedSettings(): void {
    // Load standalone settings
    /* this.storageService.getAllKeys().subscribe(keys => {
       keys.forEach(key => {
         if (!key.includes('set_')) { // Assuming sets have a prefix
           this.storageService.getItem(key).subscribe(value => {
             if (value !== null) {
               const subject = new BehaviorSubject(value);
               this.settings.set(key, subject);
             }
           });
         }
       });
     });*/

    // Load setting sets
    this.storageService.getAllKeys().subscribe(keys => {
      keys.forEach(key => {
        this.storageService.getItems(key).subscribe(values => {
          if (values !== null) {
            const subject = new BehaviorSubject(values);
            this.settingSets.set(key, subject);
          }
        });
      });
    });
  }



  private showNotify(message = '', title = 'Setting') {
    this.notify.show({ title: title, message: message, type: 'error'});
  }

  // Get observable for a standalone setting
  getSetting<T>(id: string): BehaviorSubject<T> | null {
    return this.settings.get(id) as BehaviorSubject<T> | null;
  }

  // Set a value for a specific standalone setting
  setSetting<T>(id: string, value: T): void {
    const setting = this.settings.get(id);
    if (setting) {
      setting.next(value); // Emit the new value
      this.storageService.setItem(id, value); // Persist the updated value
    } else {
      this.showNotify(`Setting with id "${id}" is not registered.`);
    }
  }

  // Register a new setting set (array of objects/values)
  registerSettingSet<T>(id: string, defaultValues: T[]): void {
    if (!this.settingSets.has(id)) {
      const subject = new BehaviorSubject<T[]>(defaultValues);
      this.settingSets.set(id, subject);

      // Get stored values asynchronously
      this.storageService.getItems<T>(id).subscribe({
        next: (storedValues) => {
          if (storedValues !== null) {
            subject.next(storedValues);
          } else {
            // If no stored values, store the defaults
            this.storageService.setItems(id, defaultValues);
          }
        },
        error: (error) => {
          console.error(`Failed to load setting set ${id}:`, error);
          // Keep using defaultValues in case of error
        }
      });
    }
  }


  // Get observable for a setting set
  getSettingSet<T>(id: string): BehaviorSubject<T[]> | null {
    return this.settingSets.get(id) as BehaviorSubject<T[]> | null;
  }

  // Update the entire setting set (replace all values)
  updateSettingSet<T>(id: string, values: T[]): void {
    const settingSet = this.settingSets.get(id);
    if (settingSet) {
      settingSet.next(values); // Emit the updated list of values
      this.storageService.setItems(id, values); // Persist the updated list
    } else {
      this.showNotify(`Setting set with id "${id}" is not registered.`);
    }
  }

// Add or update a single value in a setting set
  updateSettingSetWithSingleValue(setId: string, settingId: string, value: any): void {
    // Retrieve setting set from the BehaviorSubject
    const settingSet = this.settingSets.get(setId);

    if (settingSet) {
      // Get current settings set
      const currentSet = settingSet.value;

      // Look for the specific setting within the set by `settingId`
      const settingIndex = currentSet.findIndex((setting) => setting.id === settingId);

      if (settingIndex >= 0) {
        // If found, update the value
        currentSet[settingIndex].value = value;
      } else {
        // Otherwise, add a new setting to the set
        currentSet.push({ id: settingId, value });
      }

      // Emit the updated settings set
      settingSet.next([...currentSet]);

      // Persist the updated settings set in local storage
      this.storageService.setItem(setId, currentSet);
    } else {
      this.showNotify(`Setting set with id "${setId}" not registered.`);
    }
  }


  // Add an item to a setting set
  addSettingToSet<T>(id: string, value: T): void {
    const settingSet = this.settingSets.get(id);
    if (settingSet) {
      const currentValues = settingSet.value;
      const updatedValues = [...currentValues, value];
      settingSet.next(updatedValues);
      this.storageService.setItems(id, updatedValues);
    } else {
      this.showNotify(`Setting set with id "${id}" is not registered.`);
    }
  }

  // Remove an item from a setting set
  removeSettingFromSet<T>(id: string, value: T): void {
    const settingSet = this.settingSets.get(id);
    if (settingSet) {
      const currentValues = settingSet.value;
      const updatedValues = currentValues.filter((item) => item !== value);
      settingSet.next(updatedValues);
      this.storageService.setItems(id, updatedValues);
    } else {
      this.showNotify(`Setting set with id "${id}" is not registered.`);
    }
  }

  findSettingValueInSet<T>(setId: string, settingId: string): T | null {
    // Retrieve the settings set BehaviorSubject
    const settingSet = this.getSettingSet<Setting>(setId);

    if (settingSet) {
      // Locate the setting object by its `id`
      const setting = settingSet.value.find((item) => item.id === settingId);

      // If the setting is found, return its value; otherwise, return null
      return setting ? (setting.value as T) : null;
    }

    console.warn(`Setting set with id "${setId}" not found.`);
    return null;
  }

  getSettingValue$<T>(setId: string, settingId?: string): BehaviorSubject<T | null> {
    if (!settingId) {
      // Return observable for a single standalone setting
      const subject = this.getSetting<T | null>(setId);
      return subject ? (subject as BehaviorSubject<T | null>) : new BehaviorSubject<T | null>(null);
    }

    // Create an on-the-fly observable to watch settingSet changes
    const settingSet$ = this.getSettingSet<Setting>(setId);

    if (settingSet$) {
      const subject = new BehaviorSubject<T | null>(null);
      settingSet$.subscribe((set) => {
        const found = set.find((setting) => setting.id === settingId);
        subject.next(found ? (found.value as T) : null);
      });
      return subject;
    }

    return new BehaviorSubject<T | null>(null);
  }

  createFormGroupForSettings(setId: string): FormGroup | null {
    const settingSet = this.getSettingSet<Setting>(setId);
    if (!settingSet) {
      this.showNotify(`No settings set found with ID: "${setId}".`);
      return null;
    }

    return new FormGroup(
      settingSet.value.reduce((group, setting) => {
        group[setting.id] = new FormControl(setting.value); // Map each setting to a FormControl
        return group;
      }, {} as { [key: string]: FormControl })
    );
  }

  syncFormGroupWithSettingSet(formGroup: FormGroup, setId: string): void {
    formGroup.valueChanges.subscribe((newValues) => {
      const settingSet = this.getSettingSet<Setting>(setId);
      if (!settingSet) {
        console.warn(`No settings set found with ID: "${setId}".`);
        return;
      }

      // Update each setting in the set with the corresponding value from the form
      const updatedSet = settingSet.value.map((setting) => ({
        ...setting,
        value: newValues[setting.id], // Sync updated value from the form
      }));

      // Emit the update and persist to storage
      settingSet.next(updatedSet);
      this.storageService.setItem(setId, updatedSet);
    });
  }



}
