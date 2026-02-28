import {Injectable} from '@angular/core';
import {NotificationService} from './notification.service';
import {IMediaItem} from './media.service';
import {faExclamationTriangle} from '@fortawesome/free-solid-svg-icons';
import {BehaviorSubject, Observable} from 'rxjs';
import {ApplicationFactory} from '../factories/application-factory';
import {LogService} from './log.service';
import {ApplicationStatePersistenceService} from './application-state-persistence.service';
import {getDefaultApplicationCatalog} from './application-catalog';
import {
  AppEntry,
  ApplicationInstance,
  AppType,
  DEFAULT_WINDOW_OFFSET_X,
  DEFAULT_WINDOW_OFFSET_Y
} from './application-manager.models';

const INSTANCE_LIMIT_ERROR_MESSAGE = "Cannot open application. Maximum number of instances reached.";
const INSTANCE_LIMIT_ERROR_TITLE = "System Error";
const OPEN_APPS_STORAGE_KEY = 'applications';

@Injectable({providedIn: 'root'})
export class ApplicationManagerService {
  private applications: BehaviorSubject<ApplicationInstance[]> = new BehaviorSubject<ApplicationInstance[]>([]);
  private appRegistry: AppEntry[] = [];
  private maxMemory = 16 * 1024; // MB
  private focusedAppId = new BehaviorSubject<string | null>(null);
  private readonly notifyTemplate: IMediaItem = {
    id: 'error',
    title: 'Error',
    content: {
      type: 'icon',
      data: {
        type: 'fontawesome',
        name: 'fa fa-exclamation-triangle',
        svgPath: faExclamationTriangle
      }
    }
  }

  constructor(
    private appFactory: ApplicationFactory,
    private notify: NotificationService,
    private logger: LogService,
    private readonly applicationStatePersistence: ApplicationStatePersistenceService
  ) {
    this.registerDefaultApps();
    this.loadSavedApplications();
  }

  private registerDefaultApps(): void {
    getDefaultApplicationCatalog().forEach((app) => {
      this.registerApp(app);
    });
  }

  private loadSavedApplications() {
    const appIds = this.applicationStatePersistence.loadOpenApplicationIds(OPEN_APPS_STORAGE_KEY);
    for (const appId of appIds) {
      this.openApplication(appId);
    }
  }

  get openApplications(): ApplicationInstance[] {
    return this.applications.getValue();
  }

  getRunningApps(type: AppEntry['type'] = AppType.app): ApplicationInstance[] {
    return this.openApplications.filter((app) => {
      return app.type === type;
    });
  }

  getApps(type: AppEntry['type'] = AppType.app): AppEntry[] {
    return this.registeredApps.filter((app) => {
      return app.type === type;
    });
  }

  get totalMemory(): number {
    return this.maxMemory;
  }

  get usedMemory(): number {
    return this.applications.getValue().reduce((sum, t) => sum + t.memory, 16);
  }

  get registeredApps(): AppEntry[] {
    return this.appRegistry;
  }

  registerApp(app: AppEntry) {
    if (!this.appRegistry.some(a => a.id === app.id)) {
      this.appRegistry.push(app);
    }
  }

  unregisterApp(id: string) {
    this.appRegistry = this.appRegistry.filter(a => a.id !== id);
  }

  openApplication(id: string, args?: unknown): boolean {
    const app = this.appRegistry.find(a => a.id === id && a.installed);

    this.logger.debug('args', args);

    const focusId = this.focusedAppId.getValue();

    if (focusId === id) return true;

    if (app?.running) {
      const existing = this.getMostRecentApplicationInstance(id);
      if (existing) {
        this.setApplicationFocus(existing.id, existing.offsetX, existing.offsetY);
        return true;
      }
    }

    if (!app) return false;

    if (this.usedMemory + app.memory > this.maxMemory) {
      this.showErrorNotification('Not enough memory to open application', 'System Error');
      return false;
    }

    const lastApplication = this.applications.value[this.applications.value.length - 1];

    const newOffsetX = lastApplication?.offsetX !== undefined
      ? lastApplication.offsetX + DEFAULT_WINDOW_OFFSET_X
      : DEFAULT_WINDOW_OFFSET_X;

    const newOffsetY = lastApplication?.offsetY !== undefined
      ? lastApplication.offsetY + DEFAULT_WINDOW_OFFSET_Y
      : DEFAULT_WINDOW_OFFSET_Y;

    if (this.isInstanceLimitReached(app)) {
      return false;
    }

    const openInstanceCount = this.getOpenInstanceCount(app.id);
    const newAppInstanceId = openInstanceCount > 0 ? `${id}-${openInstanceCount + 1}` : id;
    app.instanceIndex = openInstanceCount + 1;
    app.running = true;

    this.applications.next([...this.applications.value, this.appFactory
      .createInstance(newAppInstanceId, app, newOffsetX, newOffsetY)]);


    this.saveOpenApplications();

    const focusSuccessful = this.setApplicationFocus(newAppInstanceId, newOffsetX, newOffsetY);

    if (!focusSuccessful) {
      this.showErrorNotification(`Failed to set focus for app with id: ${newAppInstanceId}`, 'System Error');
      this.notify.show({
        message: `Failed to set focus for terminal with id: ${newAppInstanceId}`,
        title: "Terminal Error",
        type: "error",
        media: this.notifyTemplate,
      });
      return false;
    }
    return true;
  }

  private isInstanceLimitReached(app: AppEntry): boolean {
    const openInstanceCount = this.getOpenInstanceCount(app.id);
    if (openInstanceCount < app.maxInstances) {
      return false;
    }

    if (app.maxInstances === 1) {
      return true;
    }

    // General case when maxInstances limit is reached
    this.showErrorNotification(INSTANCE_LIMIT_ERROR_MESSAGE, INSTANCE_LIMIT_ERROR_TITLE);
    return true;
  }

  private showErrorNotification(message: string, title: string): void {
    this.notify.show({
      message,
      title,
      type: "error",
      media: this.notifyTemplate,
    });
  }


  saveOpenApplications() {
    const openAppIds = this.applications.value.map((app) => app.id);
    this.applicationStatePersistence.saveOpenApplicationIds(OPEN_APPS_STORAGE_KEY, openAppIds);
  }

  closeApplication(id: string): void {
    const application = this.getAppByID(id);
    if (!application) return;
    // Mark the application as no longer running
    application.running = false;
    // Decrement the instanceIndex for the parent AppEntry
    // Remove the application from the active applications list
    const remainingApplications = this.applications.getValue().filter(app => app.id !== id);
    this.applications.next(remainingApplications);

    if (application.parent) {
      const remainingInstances = remainingApplications.filter((openApp) => openApp.parent?.id === application.parent?.id);
      application.parent.instanceIndex = remainingInstances.length;
      application.parent.running = remainingInstances.length > 0;
    }

    // Save the state of opened applications
    this.saveOpenApplications();
  }

  private getOpenInstanceCount(appId: string): number {
    return this.applications.value.filter((openApp) => openApp.parent?.id === appId).length;
  }

  private getMostRecentApplicationInstance(appId: string): ApplicationInstance | undefined {
    const appInstances = this.applications.value.filter((openApp) => openApp.parent?.id === appId);
    return appInstances[appInstances.length - 1];
  }

  setApplicationFocus(id: string, offsetX?: number, offsetY?: number): boolean {
    const application = this.applications.value.find(t => t.id === id);
    if (id === 'desktop') {
      this.focusedAppId.next(id);
      return true;
    }
    if (!application) {
      return false;
    }
    this.focusedAppId.next(id);
    application.focused = true;
    application.offsetX = offsetX ?? DEFAULT_WINDOW_OFFSET_X;
    application.offsetY = offsetY ?? DEFAULT_WINDOW_OFFSET_Y;

    // Move application to top of stack without recreating it
    const index = this.applications.value.findIndex(t => t.id === id);
    if (index !== -1) {
      this.applications.next([
        ...this.applications.value.slice(0, index),
        ...this.applications.value.slice(index + 1),
        application
      ]);
    }
    return true;
  }

  getAppByID(id: string): ApplicationInstance | undefined {
    return this.applications.value.find(t => t.id === id);
  }

  getFocus$(): Observable<string | null> {
    return this.focusedAppId.asObservable();
  }

  getFocusedAppId() {
    return this.focusedAppId.getValue();
  }

  closeAllApps() {
    this.applications.getValue().forEach(app => this.closeApplication(app.id));
  }

  getCurrentApp() {
    // Get current focused app
    const focusedAppId = this.getFocusedAppId();
    return this.openApplications.find(app => app.id === focusedAppId);
  }
}
