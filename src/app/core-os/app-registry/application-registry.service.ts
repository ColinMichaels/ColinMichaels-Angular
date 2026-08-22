import {Injectable} from '@angular/core';
import {getDefaultApplicationCatalog} from './application-catalog';
import {AppEntry, AppType} from './application-manager.models';

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

  private registerDefaultApps(): void {
    getDefaultApplicationCatalog().forEach((app) => this.registerApp(app));
  }
}
