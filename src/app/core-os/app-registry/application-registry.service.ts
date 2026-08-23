import {Injectable} from '@angular/core';
import {getDefaultApplicationCatalog} from './application-catalog';
import {ApplicationFileDescriptor, AppEntry, AppType} from './application-manager.models';

const GENERIC_MIME_TYPES = new Set(['application/octet-stream', 'binary/octet-stream']);

@Injectable({providedIn: 'root'})
export class ApplicationRegistryService {
  private appRegistry: AppEntry[] = [];

  constructor() {
    this.registerDefaultApps();
  }

  get registeredApps(): AppEntry[] {
    return this.appRegistry;
  }

  getApps(type: AppEntry['type'] = AppType.app): AppEntry[] {
    return this.appRegistry.filter((app) => app.type === type);
  }

  registerApp(app: AppEntry): void {
    if (!this.appRegistry.some((registeredApp) => registeredApp.id === app.id)) {
      this.appRegistry.push(app);
    }
  }

  unregisterApp(id: string): void {
    this.appRegistry = this.appRegistry.filter((app) => app.id !== id);
  }

  getInstalledAppById(id: string): AppEntry | undefined {
    return this.appRegistry.find((app) => app.id === id && app.installed);
  }

  getInstalledAppForFile(file: ApplicationFileDescriptor): AppEntry | undefined {
    let bestMatch: AppEntry | undefined;
    let bestScore = 0;

    for (const app of this.appRegistry) {
      if (!app.installed) {
        continue;
      }
      const score = this.fileAssociationScore(app, file);
      if (score > bestScore) {
        bestMatch = app;
        bestScore = score;
      }
    }

    return bestMatch;
  }

  private registerDefaultApps(): void {
    getDefaultApplicationCatalog().forEach((app) => this.registerApp(app));
  }

  private fileAssociationScore(app: AppEntry, file: ApplicationFileDescriptor): number {
    const associations = app.fileAssociations;
    if (!associations) {
      return 0;
    }

    const mimeType = file.mimeType?.split(';', 1)[0].trim().toLowerCase() ?? '';
    const mimePatterns = (associations.mimeTypes ?? [])
      .map((pattern) => pattern.trim().toLowerCase())
      .filter(Boolean);
    if (mimeType && !GENERIC_MIME_TYPES.has(mimeType)) {
      if (mimePatterns.includes(mimeType)) {
        return 400;
      }
      const mimeFamily = mimeType.includes('/') ? mimeType.slice(0, mimeType.indexOf('/')) : '';
      return mimeFamily && mimePatterns.includes(`${mimeFamily}/*`) ? 300 : 0;
    }

    const dotIndex = file.name.lastIndexOf('.');
    const extension = dotIndex > 0 && dotIndex < file.name.length - 1
      ? file.name.slice(dotIndex + 1).toLowerCase()
      : '';
    const extensions = (associations.extensions ?? [])
      .map((candidate) => candidate.trim().replace(/^\./, '').toLowerCase())
      .filter(Boolean);
    if (extension && extensions.includes(extension)) {
      return 200;
    }

    const fileType = file.type.trim().toLowerCase();
    const fileTypes = (associations.fileTypes ?? [])
      .map((candidate) => candidate.trim().toLowerCase())
      .filter(Boolean);
    return fileType && fileTypes.includes(fileType) ? 100 : 0;
  }
}
