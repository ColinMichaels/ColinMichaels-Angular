import {Injectable} from '@angular/core';
import {LogService} from './log.service';

@Injectable({providedIn: 'root'})
export class ApplicationStatePersistenceService {
  constructor(private readonly logger: LogService) {
  }

  loadOpenApplicationIds(storageKey: string): string[] {
    const savedApps = localStorage.getItem(storageKey);
    if (!savedApps) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(savedApps);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((entry) => {
          if (typeof entry === 'string') {
            return entry;
          }
          if (entry && typeof entry === 'object' && 'id' in entry) {
            const maybeId = (entry as { id?: unknown }).id;
            return typeof maybeId === 'string' ? maybeId : null;
          }
          return null;
        })
        .filter((id): id is string => Boolean(id));
    } catch (error) {
      this.logger.warn('Failed to parse saved applications.', {error});
      return [];
    }
  }

  saveOpenApplicationIds(storageKey: string, appIds: string[]): void {
    try {
      localStorage.setItem(storageKey, JSON.stringify(appIds));
    } catch (error) {
      this.logger.error('Failed to persist open applications.', {error, storageKey});
    }
  }
}
