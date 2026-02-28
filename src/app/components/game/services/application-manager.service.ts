import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {ApplicationLifecycleService} from './application-lifecycle.service';
import {ApplicationRegistryService} from './application-registry.service';
import {AppEntry, ApplicationInstance, AppType} from './application-manager.models';

@Injectable({providedIn: 'root'})
export class ApplicationManagerService {
  constructor(
    private readonly applicationRegistry: ApplicationRegistryService,
    private readonly applicationLifecycle: ApplicationLifecycleService
  ) {
    this.loadSavedApplications();
  }

  private loadSavedApplications(): void {
    const restoredOpenCounts = new Map<string, number>();

    this.applicationLifecycle.loadSavedApplicationIds().forEach((savedAppId) => {
      const appId = this.normalizeSavedAppId(savedAppId);
      const app = this.applicationRegistry.getInstalledAppById(appId);
      if (!app) {
        return;
      }

      const restoredCount = restoredOpenCounts.get(appId) ?? 0;
      const opened = this.applicationLifecycle.openApplication(appId, app, undefined, restoredCount > 0);
      if (opened) {
        restoredOpenCounts.set(appId, restoredCount + 1);
      }
    });
  }

  private normalizeSavedAppId(savedAppId: string): string {
    if (this.applicationRegistry.getInstalledAppById(savedAppId)) {
      return savedAppId;
    }

    const normalizedId = savedAppId.replace(/-\d+$/, '');
    if (this.applicationRegistry.getInstalledAppById(normalizedId)) {
      return normalizedId;
    }

    return savedAppId;
  }

  get openApplications(): ApplicationInstance[] {
    return this.applicationLifecycle.openApplications;
  }

  getRunningApps(type: AppEntry['type'] = AppType.app): ApplicationInstance[] {
    return this.applicationLifecycle.getRunningApps(type);
  }

  getApps(type: AppEntry['type'] = AppType.app): AppEntry[] {
    return this.applicationRegistry.getApps(type);
  }

  get totalMemory(): number {
    return this.applicationLifecycle.totalMemory;
  }

  get usedMemory(): number {
    return this.applicationLifecycle.usedMemory;
  }

  get registeredApps(): AppEntry[] {
    return this.applicationRegistry.registeredApps;
  }

  registerApp(app: AppEntry): void {
    this.applicationRegistry.registerApp(app);
  }

  unregisterApp(id: string): void {
    this.applicationRegistry.unregisterApp(id);
  }

  openApplication(id: string, args?: unknown): boolean {
    const app = this.applicationRegistry.getInstalledAppById(id);
    return this.applicationLifecycle.openApplication(id, app, args);
  }

  closeApplication(id: string): void {
    this.applicationLifecycle.closeApplication(id);
  }

  setApplicationFocus(id: string, offsetX?: number, offsetY?: number): boolean {
    return this.applicationLifecycle.setApplicationFocus(id, offsetX, offsetY);
  }

  getAppByID(id: string): ApplicationInstance | undefined {
    return this.applicationLifecycle.getAppByID(id);
  }

  getFocus$(): Observable<string | null> {
    return this.applicationLifecycle.getFocus$();
  }

  getFocusedAppId(): string | null {
    return this.applicationLifecycle.getFocusedAppId();
  }

  closeAllApps(): void {
    this.applicationLifecycle.closeAllApps();
  }

  getCurrentApp(): ApplicationInstance | undefined {
    return this.applicationLifecycle.getCurrentApp();
  }
}
